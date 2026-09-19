using System.Text.Json;
using SocketIOClient;
using VeloxAgent.Authentication;
using VeloxAgent.Configuration;
using VeloxAgent.Queue;

namespace VeloxAgent.Services;

/// <summary>
/// Manages persistent WebSocket connection to Velox backend with authentication,
/// job receiving, event dispatching, and exponential backoff.
/// </summary>
public sealed class WebSocketClient : IAsyncDisposable
{
    private readonly AgentConfig _config;
    private readonly AgentAuthService _authService;
    private readonly Serilog.ILogger _logger;
    private SocketIOClient.SocketIO? _socket;
    private QueueManager? _queueManager;
    private int _reconnectAttempt;
    private bool _disposed;

    public bool IsConnected => _socket?.Connected ?? false;

    public WebSocketClient(AgentConfig config, AgentAuthService authService, Serilog.ILogger logger)
    {
        _config = config;
        _authService = authService;
        _logger = logger;
    }

    public void SetQueueManager(QueueManager queueManager)
    {
        _queueManager = queueManager;
    }

    public async Task ConnectAsync(CancellationToken ct = default)
    {
        var options = new SocketIOOptions
        {
            Reconnection = false,
            ConnectionTimeout = TimeSpan.FromSeconds(10),
        };

        if (!string.IsNullOrEmpty(_authService.CurrentToken))
        {
            options.Auth = new
            {
                token = _authService.CurrentToken,
                shopId = _config.ShopId,
                deviceId = _config.DeviceId,
            };
        }

        _socket = new SocketIOClient.SocketIO(_config.WsUrl, options);

        _socket.OnConnected += (_, _) =>
        {
            _reconnectAttempt = 0;
            _logger.Information("Connected to Velox backend at {Url}", _config.WsUrl);

            // Register this agent with the backend
            if (_socket != null)
            {
                _ = _socket.EmitAsync("agent.register", new
                {
                    shopId = _config.ShopId,
                    deviceId = _config.DeviceId,
                    token = _authService.CurrentToken,
                });
                _logger.Information("Agent registered with ShopId={ShopId}, DeviceId={DeviceId}", _config.ShopId, _config.DeviceId);
            }
        };

        _socket.OnDisconnected += async (_, reason) =>
        {
            _logger.Warning("Disconnected from backend: {Reason}", reason);
            if (!_disposed)
            {
                await ReconnectWithBackoff(ct);
            }
        };

        _socket.OnError += (_, error) =>
        {
            _logger.Error("WebSocket error: {Error}", error);
        };

        // Listen for assigned jobs from backend queue engine
        _socket.On("job.assigned", response =>
        {
            try
            {
                _logger.Information("Received job.assigned payload from server: {Data}", response);
                var rawJson = response.GetValue<JsonElement>().GetRawText();
                var payload = JsonSerializer.Deserialize<JobAssignedPayload>(rawJson, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                });

                if (payload != null && _queueManager != null)
                {
                    // Fire-and-forget or background task to not block socket event loop
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            await _queueManager.ProcessJobAssignedAsync(payload, ct);
                        }
                        catch (Exception ex)
                        {
                            _logger.Error(ex, "Error executing assigned job {OrderId}", payload.OrderId);
                        }
                    }, ct);
                }
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to parse job.assigned event");
            }
        });

        _socket.On("new.order", response =>
        {
            _logger.Information("[NEW ORDER] Received new order event: {Data}", response);
        });

        try
        {
            await _socket.ConnectAsync();
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to connect to backend WebSocket gateway");
            await ReconnectWithBackoff(ct);
        }
    }

    private async Task ReconnectWithBackoff(CancellationToken ct)
    {
        if (_disposed) return;

        _reconnectAttempt++;
        var delay = Math.Min(
            (int)Math.Pow(2, _reconnectAttempt - 1) * 1000,
            _config.MaxReconnectDelaySeconds * 1000
        );

        _logger.Information("Reconnecting in {Delay}ms (attempt {Attempt})...", delay, _reconnectAttempt);

        try
        {
            await Task.Delay(delay, ct);
            if (!_disposed && _socket != null)
            {
                await _socket.ConnectAsync();
            }
        }
        catch (TaskCanceledException)
        {
            _logger.Information("Reconnection cancelled");
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Reconnection attempt {Attempt} failed", _reconnectAttempt);
            if (!_disposed)
            {
                await ReconnectWithBackoff(ct);
            }
        }
    }

    public async Task EmitAsync(string eventName, object data, CancellationToken ct = default)
    {
        if (_socket?.Connected == true)
        {
            await _socket.EmitAsync(eventName, data);
        }
        else
        {
            _logger.Warning("Cannot emit {Event}: socket is not connected", eventName);
        }
    }

    public async ValueTask DisposeAsync()
    {
        _disposed = true;
        if (_socket != null)
        {
            await _socket.DisconnectAsync();
            _socket.Dispose();
        }
    }
}
