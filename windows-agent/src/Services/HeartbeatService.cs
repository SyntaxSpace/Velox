using VeloxAgent.Configuration;
using VeloxAgent.Queue;

namespace VeloxAgent.Services;

/// <summary>
/// Sends periodic heartbeat to the Velox backend every N seconds.
/// Reports agent status, version, printer status, queue length, and last activity.
/// </summary>
public sealed class HeartbeatService
{
    private readonly WebSocketClient _wsClient;
    private readonly AgentConfig _config;
    private readonly LocalJobRepository? _repository;
    private readonly Serilog.ILogger _logger;
    private CancellationTokenSource? _cts;
    private Task? _heartbeatTask;

    public HeartbeatService(WebSocketClient wsClient, AgentConfig config, LocalJobRepository? repository, Serilog.ILogger logger)
    {
        _wsClient = wsClient;
        _config = config;
        _repository = repository;
        _logger = logger;
    }

    public void Start()
    {
        _cts = new CancellationTokenSource();
        _heartbeatTask = RunHeartbeatLoop(_cts.Token);
        _logger.Information("Heartbeat service started (interval: {Interval}s)", _config.HeartbeatIntervalSeconds);
    }

    private async Task RunHeartbeatLoop(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(_config.HeartbeatIntervalSeconds), ct);

                if (_wsClient.IsConnected)
                {
                    int activeQueueCount = _repository != null ? await _repository.GetActiveQueueCountAsync() : 0;

                    var payload = new
                    {
                        agentStatus = "CONNECTED",
                        version = "1.0.0",
                        printerStatus = new Dictionary<string, string>(),
                        queueLength = activeQueueCount,
                        lastActivity = DateTime.UtcNow.ToString("o"),
                        shopId = _config.ShopId,
                        deviceId = _config.DeviceId,
                    };

                    await _wsClient.EmitAsync("agent.heartbeat", payload, ct);
                    _logger.Debug("Heartbeat sent (activeQueue: {QueueLength})", activeQueueCount);
                }
                else
                {
                    _logger.Debug("Skipping heartbeat — not connected");
                }
            }
            catch (TaskCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Heartbeat error");
            }
        }
    }

    public async Task StopAsync()
    {
        if (_cts != null)
        {
            await _cts.CancelAsync();
            if (_heartbeatTask != null)
            {
                await _heartbeatTask;
            }
            _cts.Dispose();
        }
        _logger.Information("Heartbeat service stopped");
    }
}
