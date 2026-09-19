using System.Security.Cryptography;
using VeloxAgent.Configuration;

namespace VeloxAgent.Download;

public sealed class DownloadResult
{
    public bool Success { get; set; }
    public string? LocalFilePath { get; set; }
    public string? CalculatedChecksum { get; set; }
    public long BytesDownloaded { get; set; }
    public string? ErrorMessage { get; set; }
}

public sealed class DownloadManager
{
    private readonly AgentConfig _config;
    private readonly Serilog.ILogger _logger;
    private readonly HttpClient _httpClient;
    private const long MaxFileSizeBytes = 50 * 1024 * 1024; // 50MB

    public DownloadManager(AgentConfig config, Serilog.ILogger logger, HttpClient? httpClient = null)
    {
        _config = config;
        _logger = logger;
        _httpClient = httpClient ?? new HttpClient();
    }

    /// <summary>
    /// Downloads a document streamingly, calculates SHA-256 hash incrementally, and verifies checksum.
    /// </summary>
    public async Task<DownloadResult> DownloadAndVerifyAsync(
        string orderId,
        string downloadUrl,
        string? expectedChecksum,
        string? authToken = null,
        CancellationToken ct = default)
    {
        var tempDir = _config.GetResolvedTempDirectory();
        // Secure deterministic local path with no directory traversal
        var safeFileName = $"{orderId}.pdf";
        var localFilePath = Path.Combine(tempDir, safeFileName);

        // Security check: ensure path does not escape tempDir
        if (!Path.GetFullPath(localFilePath).StartsWith(Path.GetFullPath(tempDir)))
        {
            return new DownloadResult
            {
                Success = false,
                ErrorMessage = "Invalid file path traversal attempt detected",
            };
        }

        _logger.Information("Starting streaming download for order {OrderId} from {Url}...", orderId, downloadUrl);

        using var request = new HttpRequestMessage(HttpMethod.Get, downloadUrl);
        if (!string.IsNullOrEmpty(authToken))
        {
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", authToken);
        }

        try
        {
            using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);

            if (!response.IsSuccessStatusCode)
            {
                var err = $"Download failed with status {response.StatusCode}";
                _logger.Error(err);
                return new DownloadResult { Success = false, ErrorMessage = err };
            }

            // Check Content-Length header if provided
            if (response.Content.Headers.ContentLength > MaxFileSizeBytes)
            {
                return new DownloadResult
                {
                    Success = false,
                    ErrorMessage = $"File size ({response.Content.Headers.ContentLength} bytes) exceeds maximum limit of 50MB",
                };
            }

            // Stream to disk while calculating SHA-256 incrementally
            long totalBytes = 0;
            string calculatedChecksum;

            await using (var httpStream = await response.Content.ReadAsStreamAsync(ct))
            await using (var fileStream = new FileStream(localFilePath, FileMode.Create, FileAccess.Write, FileShare.None, 81920, true))
            using (var sha256 = IncrementalHash.CreateHash(HashAlgorithmName.SHA256))
            {
                var buffer = new byte[81920];
                int bytesRead;

                while ((bytesRead = await httpStream.ReadAsync(buffer, ct)) > 0)
                {
                    totalBytes += bytesRead;
                    if (totalBytes > MaxFileSizeBytes)
                    {
                        fileStream.Close();
                        TryDeleteFile(localFilePath);
                        return new DownloadResult
                        {
                            Success = false,
                            ErrorMessage = "File exceeded maximum allowed size of 50MB during download",
                        };
                    }

                    await fileStream.WriteAsync(buffer.AsMemory(0, bytesRead), ct);
                    sha256.AppendData(buffer, 0, bytesRead);
                }

                calculatedChecksum = Convert.ToHexString(sha256.GetHashAndReset()).ToLowerInvariant();
            }

            _logger.Information("Downloaded {Bytes} bytes for order {OrderId}. Calculated SHA-256: {Hash}",
                totalBytes, orderId, calculatedChecksum);

            // Verify checksum against expected checksum when provided
            if (!string.IsNullOrEmpty(expectedChecksum))
            {
                var normalizedExpected = expectedChecksum.Trim().ToLowerInvariant();
                if (!string.Equals(calculatedChecksum, normalizedExpected, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.Error("Checksum mismatch for order {OrderId}! Expected: {Expected}, Calculated: {Calculated}",
                        orderId, normalizedExpected, calculatedChecksum);

                    TryDeleteFile(localFilePath);

                    return new DownloadResult
                    {
                        Success = false,
                        CalculatedChecksum = calculatedChecksum,
                        ErrorMessage = $"SHA-256 verification failed (expected {normalizedExpected}, got {calculatedChecksum})",
                    };
                }

                _logger.Information("SHA-256 checksum verified for order {OrderId}!", orderId);
            }

            return new DownloadResult
            {
                Success = true,
                LocalFilePath = localFilePath,
                CalculatedChecksum = calculatedChecksum,
                BytesDownloaded = totalBytes,
            };
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Exception occurred downloading order {OrderId}", orderId);
            TryDeleteFile(localFilePath);
            return new DownloadResult
            {
                Success = false,
                ErrorMessage = ex.Message,
            };
        }
    }

    private void TryDeleteFile(string path)
    {
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch (Exception ex)
        {
            _logger.Warning(ex, "Could not delete corrupted download file {Path}", path);
        }
    }
}
