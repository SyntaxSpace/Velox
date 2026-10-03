using VeloxAgent.Authentication;
using VeloxAgent.Download;
using VeloxAgent.Printing;
using VeloxAgent.Services;
using VeloxAgent.Utilities;

namespace VeloxAgent.Queue;

public sealed class JobAssignedPayload
{
    public string OrderId { get; set; } = string.Empty;
    public string OrderCode { get; set; } = string.Empty;
    public string ShopId { get; set; } = string.Empty;
    public string PrinterName { get; set; } = string.Empty;
    public string DownloadUrl { get; set; } = string.Empty;
    public string? ExpectedChecksum { get; set; }
    public long FileSize { get; set; }
    public int Copies { get; set; } = 1;
    public string Color { get; set; } = "bw";
    public bool DoubleSided { get; set; } = false;
    public string Orientation { get; set; } = "portrait";
    public string PaperSize { get; set; } = "A4";
}

public sealed class QueueManager
{
    private readonly LocalJobRepository _repository;
    private readonly DownloadManager _downloadManager;
    private readonly IPrintEngine _printEngine;
    private readonly CleanupService _cleanupService;
    private readonly AgentAuthService _authService;
    private readonly Serilog.ILogger _logger;
    private Func<string, object, Task>? _eventEmitter;
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, byte> _activeOrders = new();

    public QueueManager(
        LocalJobRepository repository,
        DownloadManager downloadManager,
        IPrintEngine printEngine,
        CleanupService cleanupService,
        AgentAuthService authService,
        Serilog.ILogger logger)
    {
        _repository = repository;
        _downloadManager = downloadManager;
        _printEngine = printEngine;
        _cleanupService = cleanupService;
        _authService = authService;
        _logger = logger;
    }

    public void SetEventEmitter(Func<string, object, Task> eventEmitter)
    {
        _eventEmitter = eventEmitter;
    }

    /// <summary>
    /// Handles incoming job assignment from cloud backend with idempotency protection.
    /// </summary>
    public async Task ProcessJobAssignedAsync(JobAssignedPayload payload, CancellationToken ct = default)
    {
        _logger.Information("Processing job assignment for order {OrderId} ({OrderCode})...", payload.OrderId, payload.OrderCode);

        // Deduplication Guard: prevent parallel concurrent processing of identical orderId
        if (!_activeOrders.TryAdd(payload.OrderId, 0))
        {
            _logger.Warning("Job {OrderId} is already actively being processed. Ignoring concurrent duplicate assignment.", payload.OrderId);
            return;
        }

        try
        {
        var existingJob = await _repository.GetJobAsync(payload.OrderId);
        if (existingJob != null)
        {
            if (existingJob.State == LocalJobState.COMPLETED || existingJob.State == LocalJobState.CLEANUP)
            {
                _logger.Warning("Duplicate assignment ignored for already completed Order {OrderId}", payload.OrderId);
                if (_eventEmitter != null)
                {
                    await _eventEmitter("job.completed", new { orderId = payload.OrderId });
                }
                return;
            }

            if (existingJob.State == LocalJobState.PRINTING || existingJob.State == LocalJobState.DOWNLOADING)
            {
                _logger.Warning("Job {OrderId} is already actively being processed. Ignoring duplicate assignment.", payload.OrderId);
                return;
            }
        }

        // 2. Save Initial State: RECEIVED
        var job = new LocalJob
        {
            OrderId = payload.OrderId,
            OrderCode = payload.OrderCode,
            ShopId = payload.ShopId,
            PrinterName = payload.PrinterName,
            FileUrl = payload.DownloadUrl,
            ExpectedChecksum = payload.ExpectedChecksum,
            FileSize = payload.FileSize,
            State = LocalJobState.RECEIVED,
            Copies = payload.Copies,
            Color = payload.Color,
            DoubleSided = payload.DoubleSided,
            Orientation = payload.Orientation,
            PaperSize = payload.PaperSize,
        };

        await _repository.SaveJobAsync(job);
        await EmitEventAsync("job.received", new { orderId = job.OrderId });

        // 3. Transition to DOWNLOADING
        await _repository.UpdateStateAsync(job.OrderId, LocalJobState.DOWNLOADING);
        await EmitEventAsync("job.downloading", new { orderId = job.OrderId });

        // 4. Download and verify document
        var downloadResult = await _downloadManager.DownloadAndVerifyAsync(
            job.OrderId,
            job.FileUrl,
            job.ExpectedChecksum,
            _authService.CurrentToken,
            ct);

        if (!downloadResult.Success)
        {
            _logger.Error("Download/verification failed for order {OrderId}: {Error}", job.OrderId, downloadResult.ErrorMessage);
            await _repository.UpdateStateAsync(job.OrderId, LocalJobState.FAILED, error: downloadResult.ErrorMessage);
            await EmitEventAsync("job.failed", new { orderId = job.OrderId, error = downloadResult.ErrorMessage });
            _cleanupService.CleanupJobFile(downloadResult.LocalFilePath, job.OrderId);
            return;
        }

        job.LocalFilePath = downloadResult.LocalFilePath;
        job.ActualChecksum = downloadResult.CalculatedChecksum;

        // 5. Transition to READY
        await _repository.UpdateStateAsync(job.OrderId, LocalJobState.READY, job.LocalFilePath, job.ActualChecksum);
        await EmitEventAsync("job.ready", new { orderId = job.OrderId });

        // 6. Transition to PRINTING
        await _repository.UpdateStateAsync(job.OrderId, LocalJobState.PRINTING);
        await EmitEventAsync("job.printing", new { orderId = job.OrderId });

        // 7. Silent Print Spooling
        var printResult = await _printEngine.PrintAsync(job, ct);

        if (!printResult.Success)
        {
            _logger.Error("Printing failed for order {OrderId}: {Error}", job.OrderId, printResult.ErrorMessage);
            await _repository.UpdateStateAsync(job.OrderId, LocalJobState.FAILED, error: printResult.ErrorMessage);
            await EmitEventAsync("job.failed", new { orderId = job.OrderId, error = printResult.ErrorMessage });
            _cleanupService.CleanupJobFile(job.LocalFilePath, job.OrderId);
            return;
        }

        // 8. Transition to COMPLETED
        _logger.Information("Order {OrderId} printed successfully!", job.OrderId);
        await _repository.UpdateStateAsync(job.OrderId, LocalJobState.COMPLETED);
        await EmitEventAsync("job.completed", new { orderId = job.OrderId });

        // 9. Immediate Cleanup
        _cleanupService.CleanupJobFile(job.LocalFilePath, job.OrderId);
        }
        finally
        {
            _activeOrders.TryRemove(payload.OrderId, out _);
        }
    }

    /// <summary>
    /// Crash Recovery: Inspects unfinished jobs from SQLite on startup and safely resumes processing.
    /// </summary>
    public async Task RecoverInterruptedJobsAsync(CancellationToken ct = default)
    {
        var unfinishedJobs = await _repository.GetUnfinishedJobsAsync();
        if (unfinishedJobs.Count == 0)
        {
            _logger.Information("Crash recovery check: No interrupted jobs found in local queue.");
            return;
        }

        _logger.Warning("Crash recovery: Found {Count} unfinished jobs from previous agent session.", unfinishedJobs.Count);

        foreach (var job in unfinishedJobs)
        {
            ct.ThrowIfCancellationRequested();
            _logger.Information("Recovering job {OrderId} ({OrderCode}) in state {State}...", job.OrderId, job.OrderCode, job.State);

            try
            {
                var payload = new JobAssignedPayload
                {
                    OrderId = job.OrderId,
                    OrderCode = job.OrderCode,
                    ShopId = job.ShopId,
                    PrinterName = job.PrinterName,
                    DownloadUrl = job.FileUrl,
                    ExpectedChecksum = job.ExpectedChecksum,
                    FileSize = job.FileSize,
                    Copies = job.Copies,
                    Color = job.Color,
                    DoubleSided = job.DoubleSided,
                    Orientation = job.Orientation,
                    PaperSize = job.PaperSize,
                };

                await ProcessJobAssignedAsync(payload, ct);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to recover job {OrderId}", job.OrderId);
            }
        }
    }

    private async Task EmitEventAsync(string eventName, object data)
    {
        if (_eventEmitter != null)
        {
            try
            {
                await _eventEmitter(eventName, data);
            }
            catch (Exception ex)
            {
                _logger.Warning(ex, "Failed to emit event {Event}", eventName);
            }
        }
    }
}
