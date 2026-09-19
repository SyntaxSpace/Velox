namespace VeloxAgent.Configuration;

/// <summary>
/// Velox Windows Agent configuration model.
/// Loaded from appsettings.json and environment variables.
/// </summary>
public sealed class AgentConfig
{
    public const string SectionName = "Agent";

    public string ShopId { get; set; } = string.Empty;
    public string DeviceId { get; set; } = string.Empty;
    public string DeviceKey { get; set; } = "agent_secret_key_dev";
    public string DeviceName { get; set; } = "Shop-Windows-PC";
    public string ApiUrl { get; set; } = "http://localhost:5000";
    public string WsUrl { get; set; } = "http://localhost:5000/agent";
    public string DownloadPath { get; set; } = "./downloads";
    public string TempPath { get; set; } = "./temp";
    public string DataPath { get; set; } = "./data";
    public string LogLevel { get; set; } = "Information";
    public int HeartbeatIntervalSeconds { get; set; } = 30;
    public int MaxReconnectDelaySeconds { get; set; } = 30;

    /// <summary>
    /// Gets the resolved absolute directory for temporary document downloads.
    /// </summary>
    public string GetResolvedTempDirectory()
    {
        var path = Path.IsPathRooted(TempPath)
            ? TempPath
            : Path.Combine(AppContext.BaseDirectory, TempPath);
        Directory.CreateDirectory(path);
        return path;
    }

    /// <summary>
    /// Gets the resolved absolute path for the local SQLite queue database.
    /// </summary>
    public string GetResolvedDatabasePath()
    {
        var dir = Path.IsPathRooted(DataPath)
            ? DataPath
            : Path.Combine(AppContext.BaseDirectory, DataPath);
        Directory.CreateDirectory(dir);
        return Path.Combine(dir, "agent_queue.db");
    }

    /// <summary>
    /// Validates that required configuration values are present.
    /// </summary>
    public IReadOnlyList<string> Validate()
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(ApiUrl)) errors.Add("ApiUrl is required");
        if (string.IsNullOrWhiteSpace(WsUrl)) errors.Add("WsUrl is required");
        if (HeartbeatIntervalSeconds <= 0) errors.Add("HeartbeatIntervalSeconds must be positive");
        if (MaxReconnectDelaySeconds <= 0) errors.Add("MaxReconnectDelaySeconds must be positive");
        return errors;
    }
}
