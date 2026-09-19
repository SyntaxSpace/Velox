using Microsoft.Data.Sqlite;
using VeloxAgent.Configuration;

namespace VeloxAgent.Queue;

public sealed class LocalJobRepository : IAsyncDisposable
{
    private readonly string _connectionString;
    private readonly Serilog.ILogger _logger;

    public LocalJobRepository(AgentConfig config, Serilog.ILogger logger)
    {
        _logger = logger;
        var dbPath = config.GetResolvedDatabasePath();
        _connectionString = $"Data Source={dbPath}";
        InitializeDatabase();
    }

    public LocalJobRepository(string connectionString, Serilog.ILogger logger)
    {
        _logger = logger;
        _connectionString = connectionString;
        InitializeDatabase();
    }

    private void InitializeDatabase()
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            CREATE TABLE IF NOT EXISTS local_jobs (
                order_id TEXT PRIMARY KEY,
                order_code TEXT NOT NULL,
                shop_id TEXT NOT NULL,
                printer_name TEXT NOT NULL,
                file_url TEXT NOT NULL,
                local_file_path TEXT,
                expected_checksum TEXT,
                actual_checksum TEXT,
                file_size INTEGER NOT NULL,
                state TEXT NOT NULL,
                copies INTEGER NOT NULL,
                color TEXT NOT NULL,
                double_sided INTEGER NOT NULL,
                orientation TEXT NOT NULL,
                paper_size TEXT NOT NULL,
                error_message TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_local_jobs_state ON local_jobs(state);
        ";
        command.ExecuteNonQuery();
        _logger.Information("Local SQLite queue database initialized");
    }

    public async Task SaveJobAsync(LocalJob job)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = @"
            INSERT INTO local_jobs (
                order_id, order_code, shop_id, printer_name, file_url, local_file_path,
                expected_checksum, actual_checksum, file_size, state, copies, color,
                double_sided, orientation, paper_size, error_message, created_at, updated_at
            ) VALUES (
                $order_id, $order_code, $shop_id, $printer_name, $file_url, $local_file_path,
                $expected_checksum, $actual_checksum, $file_size, $state, $copies, $color,
                $double_sided, $orientation, $paper_size, $error_message, $created_at, $updated_at
            )
            ON CONFLICT(order_id) DO UPDATE SET
                state = excluded.state,
                local_file_path = excluded.local_file_path,
                actual_checksum = excluded.actual_checksum,
                error_message = excluded.error_message,
                updated_at = excluded.updated_at;
        ";

        command.Parameters.AddWithValue("$order_id", job.OrderId);
        command.Parameters.AddWithValue("$order_code", job.OrderCode);
        command.Parameters.AddWithValue("$shop_id", job.ShopId);
        command.Parameters.AddWithValue("$printer_name", job.PrinterName);
        command.Parameters.AddWithValue("$file_url", job.FileUrl);
        command.Parameters.AddWithValue("$local_file_path", (object?)job.LocalFilePath ?? DBNull.Value);
        command.Parameters.AddWithValue("$expected_checksum", (object?)job.ExpectedChecksum ?? DBNull.Value);
        command.Parameters.AddWithValue("$actual_checksum", (object?)job.ActualChecksum ?? DBNull.Value);
        command.Parameters.AddWithValue("$file_size", job.FileSize);
        command.Parameters.AddWithValue("$state", job.State);
        command.Parameters.AddWithValue("$copies", job.Copies);
        command.Parameters.AddWithValue("$color", job.Color);
        command.Parameters.AddWithValue("$double_sided", job.DoubleSided ? 1 : 0);
        command.Parameters.AddWithValue("$orientation", job.Orientation);
        command.Parameters.AddWithValue("$paper_size", job.PaperSize);
        command.Parameters.AddWithValue("$error_message", (object?)job.ErrorMessage ?? DBNull.Value);
        command.Parameters.AddWithValue("$created_at", job.CreatedAt.ToString("o"));
        command.Parameters.AddWithValue("$updated_at", DateTime.UtcNow.ToString("o"));

        await command.ExecuteNonQueryAsync();
    }

    public async Task<LocalJob?> GetJobAsync(string orderId)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT * FROM local_jobs WHERE order_id = $order_id LIMIT 1";
        command.Parameters.AddWithValue("$order_id", orderId);

        await using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapJob(reader);
        }
        return null;
    }

    public async Task UpdateStateAsync(
        string orderId,
        string state,
        string? localFilePath = null,
        string? actualChecksum = null,
        string? error = null)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = @"
            UPDATE local_jobs SET
                state = $state,
                local_file_path = COALESCE($local_file_path, local_file_path),
                actual_checksum = COALESCE($actual_checksum, actual_checksum),
                error_message = $error,
                updated_at = $updated_at
            WHERE order_id = $order_id;
        ";

        command.Parameters.AddWithValue("$order_id", orderId);
        command.Parameters.AddWithValue("$state", state);
        command.Parameters.AddWithValue("$local_file_path", (object?)localFilePath ?? DBNull.Value);
        command.Parameters.AddWithValue("$actual_checksum", (object?)actualChecksum ?? DBNull.Value);
        command.Parameters.AddWithValue("$error", (object?)error ?? DBNull.Value);
        command.Parameters.AddWithValue("$updated_at", DateTime.UtcNow.ToString("o"));

        await command.ExecuteNonQueryAsync();
    }

    public async Task<List<LocalJob>> GetUnfinishedJobsAsync()
    {
        var list = new List<LocalJob>();
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT * FROM local_jobs 
            WHERE state IN ('RECEIVED', 'DOWNLOADING', 'READY', 'PRINTING')
            ORDER BY created_at ASC;
        ";

        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(MapJob(reader));
        }
        return list;
    }

    public async Task<bool> IsProcessedAsync(string orderId)
    {
        var job = await GetJobAsync(orderId);
        return job != null && (job.State == LocalJobState.COMPLETED || job.State == LocalJobState.CLEANUP);
    }

    public async Task<int> GetActiveQueueCountAsync()
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(1) FROM local_jobs WHERE state NOT IN ('COMPLETED', 'FAILED', 'CLEANUP');";
        var result = await command.ExecuteScalarAsync();
        return Convert.ToInt32(result);
    }

    private static LocalJob MapJob(SqliteDataReader reader)
    {
        return new LocalJob
        {
            OrderId = reader.GetString(reader.GetOrdinal("order_id")),
            OrderCode = reader.GetString(reader.GetOrdinal("order_code")),
            ShopId = reader.GetString(reader.GetOrdinal("shop_id")),
            PrinterName = reader.GetString(reader.GetOrdinal("printer_name")),
            FileUrl = reader.GetString(reader.GetOrdinal("file_url")),
            LocalFilePath = reader.IsDBNull(reader.GetOrdinal("local_file_path")) ? null : reader.GetString(reader.GetOrdinal("local_file_path")),
            ExpectedChecksum = reader.IsDBNull(reader.GetOrdinal("expected_checksum")) ? null : reader.GetString(reader.GetOrdinal("expected_checksum")),
            ActualChecksum = reader.IsDBNull(reader.GetOrdinal("actual_checksum")) ? null : reader.GetString(reader.GetOrdinal("actual_checksum")),
            FileSize = reader.GetInt64(reader.GetOrdinal("file_size")),
            State = reader.GetString(reader.GetOrdinal("state")),
            Copies = reader.GetInt32(reader.GetOrdinal("copies")),
            Color = reader.GetString(reader.GetOrdinal("color")),
            DoubleSided = reader.GetInt32(reader.GetOrdinal("double_sided")) == 1,
            Orientation = reader.GetString(reader.GetOrdinal("orientation")),
            PaperSize = reader.GetString(reader.GetOrdinal("paper_size")),
            ErrorMessage = reader.IsDBNull(reader.GetOrdinal("error_message")) ? null : reader.GetString(reader.GetOrdinal("error_message")),
            CreatedAt = DateTime.Parse(reader.GetString(reader.GetOrdinal("created_at"))),
            UpdatedAt = DateTime.Parse(reader.GetString(reader.GetOrdinal("updated_at"))),
        };
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}
