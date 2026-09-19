using Serilog;
using VeloxAgent.Authentication;
using VeloxAgent.Configuration;
using VeloxAgent.Download;
using VeloxAgent.Printer;
using VeloxAgent.Printing;
using VeloxAgent.Queue;
using VeloxAgent.Utilities;
using Xunit;

namespace VeloxAgent.Tests;

public class QueueManagerTests : IDisposable
{
    private readonly string _testDbPath;
    private readonly string _testTempDir;
    private readonly AgentConfig _config;
    private readonly ILogger _logger;
    private readonly LocalJobRepository _repository;
    private readonly MockPrinterDiscoveryService _printerDiscovery;
    private readonly MockPrintEngine _printEngine;
    private readonly CleanupService _cleanupService;
    private readonly DownloadManager _downloadManager;
    private readonly AgentAuthService _authService;
    private readonly QueueManager _queueManager;

    public QueueManagerTests()
    {
        var testId = Guid.NewGuid().ToString("N");
        _testDbPath = Path.Combine(Path.GetTempPath(), $"velox_test_{testId}.db");
        _testTempDir = Path.Combine(Path.GetTempPath(), $"velox_temp_{testId}");
        Directory.CreateDirectory(_testTempDir);

        _config = new AgentConfig
        {
            ShopId = "test-shop",
            DeviceId = "test-device",
            TempPath = _testTempDir,
            DataPath = Path.GetDirectoryName(_testDbPath)!,
        };

        _logger = new LoggerConfiguration().CreateLogger();
        _repository = new LocalJobRepository($"Data Source={_testDbPath}", _logger);
        _printerDiscovery = new MockPrinterDiscoveryService();
        _printEngine = new MockPrintEngine(_printerDiscovery);
        _cleanupService = new CleanupService(_config, _repository, _logger);
        _downloadManager = new DownloadManager(_config, _logger);
        _authService = new AgentAuthService(_config, _logger);

        _queueManager = new QueueManager(
            _repository,
            _downloadManager,
            _printEngine,
            _cleanupService,
            _authService,
            _logger);
    }

    [Fact]
    public async Task ProcessJobAssignedAsync_SavesJobStateToSqlite()
    {
        var orderId = Guid.NewGuid().ToString();
        var payload = new JobAssignedPayload
        {
            OrderId = orderId,
            OrderCode = "VLX-TEST01",
            ShopId = "test-shop",
            PrinterName = "Mock HP LaserJet Pro",
            DownloadUrl = "http://localhost:5000/test.pdf",
            Copies = 1,
            Color = "bw",
            DoubleSided = false,
        };

        // Emit RECEIVED event and verify DB record
        var job = new LocalJob
        {
            OrderId = orderId,
            OrderCode = payload.OrderCode,
            ShopId = payload.ShopId,
            PrinterName = payload.PrinterName,
            FileUrl = payload.DownloadUrl,
            State = LocalJobState.RECEIVED,
        };

        await _repository.SaveJobAsync(job);

        var saved = await _repository.GetJobAsync(orderId);
        Assert.NotNull(saved);
        Assert.Equal(orderId, saved.OrderId);
        Assert.Equal(LocalJobState.RECEIVED, saved.State);
    }

    [Fact]
    public async Task DuplicateAssignment_IsIgnoredIfAlreadyCompleted()
    {
        var orderId = Guid.NewGuid().ToString();

        // 1. Pre-populate completed job
        var completedJob = new LocalJob
        {
            OrderId = orderId,
            OrderCode = "VLX-DONE01",
            ShopId = "test-shop",
            PrinterName = "Mock HP LaserJet Pro",
            FileUrl = "http://localhost:5000/test.pdf",
            State = LocalJobState.COMPLETED,
        };
        await _repository.SaveJobAsync(completedJob);

        var eventsEmitted = new List<string>();
        _queueManager.SetEventEmitter((evt, _) =>
        {
            eventsEmitted.Add(evt);
            return Task.CompletedTask;
        });

        // 2. Receive same assignment again
        var payload = new JobAssignedPayload
        {
            OrderId = orderId,
            OrderCode = "VLX-DONE01",
            ShopId = "test-shop",
            PrinterName = "Mock HP LaserJet Pro",
            DownloadUrl = "http://localhost:5000/test.pdf",
        };

        await _queueManager.ProcessJobAssignedAsync(payload);

        // Print engine should NOT have printed
        Assert.Empty(_printEngine.PrintedJobs);

        // State should remain COMPLETED
        var current = await _repository.GetJobAsync(orderId);
        Assert.NotNull(current);
        Assert.Equal(LocalJobState.COMPLETED, current.State);
    }

    [Fact]
    public async Task CrashRecovery_DetectsUnfinishedJobsAndDoesNotReprintCompletedOnes()
    {
        var order1 = Guid.NewGuid().ToString();
        var order2 = Guid.NewGuid().ToString();

        // Order 1 is COMPLETED
        await _repository.SaveJobAsync(new LocalJob
        {
            OrderId = order1,
            OrderCode = "VLX-COMPLETED",
            ShopId = "test-shop",
            PrinterName = "Mock HP LaserJet Pro",
            FileUrl = "http://localhost:5000/test1.pdf",
            State = LocalJobState.COMPLETED,
        });

        // Order 2 was DOWNLOADING when crash happened
        await _repository.SaveJobAsync(new LocalJob
        {
            OrderId = order2,
            OrderCode = "VLX-INTERRUPTED",
            ShopId = "test-shop",
            PrinterName = "Mock HP LaserJet Pro",
            FileUrl = "http://localhost:5000/test2.pdf",
            State = LocalJobState.DOWNLOADING,
        });

        var unfinished = await _repository.GetUnfinishedJobsAsync();

        Assert.Single(unfinished);
        Assert.Equal(order2, unfinished[0].OrderId);
        Assert.Equal(LocalJobState.DOWNLOADING, unfinished[0].State);
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
