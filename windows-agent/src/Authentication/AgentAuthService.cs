using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using VeloxAgent.Configuration;

namespace VeloxAgent.Authentication;

/// <summary>
/// Manages device authentication, token storage, and reauthentication.
/// </summary>
public sealed class AgentAuthService
{
    private readonly AgentConfig _config;
    private readonly Serilog.ILogger _logger;
    private readonly HttpClient _httpClient;
    private string? _cachedToken;
    private readonly string _tokenFilePath;

    public string? CurrentToken => _cachedToken;
    public bool IsAuthenticated => !string.IsNullOrEmpty(_cachedToken);

    public AgentAuthService(AgentConfig config, Serilog.ILogger logger, HttpClient? httpClient = null)
    {
        _config = config;
        _logger = logger;
        _httpClient = httpClient ?? new HttpClient();
        
        var dataDir = Path.IsPathRooted(_config.DataPath)
            ? _config.DataPath
            : Path.Combine(AppContext.BaseDirectory, _config.DataPath);
        Directory.CreateDirectory(dataDir);
        _tokenFilePath = Path.Combine(dataDir, "token.json");
    }

    /// <summary>
    /// Authenticates with the Velox backend using device credentials.
    /// Supports automatic retry with exponential backoff if backend is offline.
    /// </summary>
    public async Task<string> AuthenticateAsync(CancellationToken ct = default)
    {
        var loginUrl = $"{_config.ApiUrl.TrimEnd('/')}/api/v1/agent/login";
        var payload = new
        {
            shopId = _config.ShopId,
            deviceId = _config.DeviceId,
            deviceKey = _config.DeviceKey,
            deviceName = _config.DeviceName,
        };

        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        int attempt = 0;
        while (!ct.IsCancellationRequested)
        {
            attempt++;
            try
            {
                _logger.Information("Authenticating device {DeviceId} with shop {ShopId} at {Url} (attempt {Attempt})...",
                    _config.DeviceId, _config.ShopId, loginUrl, attempt);

                using var response = await _httpClient.PostAsync(loginUrl, content, ct);

                if (response.IsSuccessStatusCode)
                {
                    var responseJson = await response.Content.ReadAsStringAsync(ct);
                    using var doc = JsonDocument.Parse(responseJson);
                    
                    if (doc.RootElement.TryGetProperty("data", out var dataElement) &&
                        dataElement.TryGetProperty("token", out var tokenElement))
                    {
                        var token = tokenElement.GetString();
                        if (!string.IsNullOrEmpty(token))
                        {
                            _cachedToken = token;
                            await SaveTokenAsync(token);
                            _logger.Information("Device {DeviceId} authenticated successfully!", _config.DeviceId);
                            return token;
                        }
                    }
                }

                var errorBody = await response.Content.ReadAsStringAsync(ct);
                _logger.Error("Authentication failed ({StatusCode}): {Body}", response.StatusCode, errorBody);

                // If unauthorized or forbidden, don't loop forever without logging credentials issue
                if ((int)response.StatusCode == 401 || (int)response.StatusCode == 403)
                {
                    throw new InvalidOperationException($"Authentication rejected by server: {errorBody}");
                }
            }
            catch (Exception ex) when (ex is not InvalidOperationException)
            {
                _logger.Warning(ex, "Authentication network attempt {Attempt} failed. Retrying...", attempt);
            }

            // Retry delay
            var delay = Math.Min((int)Math.Pow(2, attempt) * 1000, 30000);
            await Task.Delay(delay, ct);
        }

        throw new OperationCanceledException("Authentication cancelled");
    }

    /// <summary>
    /// Configures the provided HttpClient with Authorization Bearer header.
    /// </summary>
    public void ApplyAuthenticationHeader(HttpClient client)
    {
        if (!string.IsNullOrEmpty(_cachedToken))
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _cachedToken);
        }
    }

    private async Task SaveTokenAsync(string token)
    {
        try
        {
            var data = new { token, savedAt = DateTime.UtcNow };
            var json = JsonSerializer.Serialize(data);
            await File.WriteAllTextAsync(_tokenFilePath, json);
        }
        catch (Exception ex)
        {
            _logger.Warning(ex, "Could not persist token to file");
        }
    }
}
