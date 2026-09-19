using Serilog;
using VeloxAgent.Configuration;
using VeloxAgent.Queue;
using VeloxAgent.Utilities;
using Xunit;

namespace VeloxAgent.Tests;

public class CleanupServiceTests : IDisposable
{
    private readonly string _testTempDir;
    private readonly string _testDbPath;
    private readonly AgentConfig _config;
    private readonly ILogger _logger;
    private readonly LocalJobRepository _repository;
    private readonly CleanupService _cleanupService;

    public CleanupServiceTests()
    {
        _testTempDir = Path.Combine(Path.GetTempPath(), $"velox_cleanup_test_{Guid.NewGuid():N}");
        _testDbPath = Path.Combine(Path.GetTempPath(), $"velox_cleanup_db_{Guid.NewGuid():N}.db");
        Directory.CreateDirectory(_testTempDir);

        _config = new AgentConfig
        {
            TempPath = _testTempDir,
            DataPath = Path.GetDirectoryName(_testDbPath)!,
        };

        _logger = new LoggerConfiguration().CreateLogger();
        _repository = new LocalJobRepository($"Data Source={_testDbPath}", _logger);
        _cleanupService = new CleanupService(_config, _repository, _logger);
    }

    [Fact]
    public void CleanupJobFile_DeletesExistingDocument()
    {
        var testFile = Path.Combine(_testTempDir, "order_123.pdf");
        File.WriteAllText(testFile, "test doc content");
        Assert.True(File.Exists(testFile));

        var deleted = _cleanupService.CleanupJobFile(testFile, "order_123");

        Assert.True(deleted);
        Assert.False(File.Exists(testFile));
    }

    [Fact]
    public void PurgeOrphanedFiles_RemovesOldFilesAndPreservesNewOnes()
    {
        var oldFile = Path.Combine(_testTempDir, "old_order.pdf");
        File.WriteAllText(oldFile, "old content");
        File.SetLastWriteTimeUtc(oldFile, DateTime.UtcNow.AddHours(-2)); // 2 hours old

        var newFile = Path.Combine(_testTempDir, "new_order.pdf");
        File.WriteAllText(newFile, "new content");
        File.SetLastWriteTimeUtc(newFile, DateTime.UtcNow); // fresh

        int purged = _cleanupService.PurgeOrphanedFiles(TimeSpan.FromHours(1));

        Assert.Equal(1, purged);
        Assert.False(File.Exists(oldFile));
        Assert.True(File.Exists(newFile));
    }

    public void Dispose()
    {
        _repository.DisposeAsync().AsTask().GetAwaiter().GetResult();
        try
        {
            if (File.Exists(_testDbPath)) File.Delete(_testDbPath);
            if (Directory.Exists(_testTempDir)) Directory.Delete(_testTempDir, true);
        }
        catch { }
    }
}
