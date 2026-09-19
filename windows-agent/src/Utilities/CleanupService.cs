using VeloxAgent.Configuration;
using VeloxAgent.Queue;

namespace VeloxAgent.Utilities;

public sealed class CleanupService
{
    private readonly AgentConfig _config;
    private readonly LocalJobRepository _repository;
    private readonly Serilog.ILogger _logger;

    public CleanupService(AgentConfig config, LocalJobRepository repository, Serilog.ILogger logger)
    {
        _config = config;
        _repository = repository;
        _logger = logger;
    }

    /// <summary>
    /// Removes the temporary document file for a finished or failed job.
    /// </summary>
    public bool CleanupJobFile(string? filePath, string orderId)
    {
        if (string.IsNullOrEmpty(filePath)) return true;

        try
        {
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                _logger.Information("Cleaned up temporary document for order {OrderId} at {Path}", orderId, filePath);
                return true;
            }
        }
        catch (Exception ex)
        {
            _logger.Warning(ex, "Could not delete temporary document file {Path}", filePath);
        }

        return false;
    }

    /// <summary>
    /// Periodically cleans up orphaned or corrupted temporary files in the temp directory older than 1 hour.
    /// </summary>
    public int PurgeOrphanedFiles(TimeSpan maxAge)
    {
        int deletedCount = 0;
        try
        {
            var tempDir = _config.GetResolvedTempDirectory();
            if (!Directory.Exists(tempDir)) return 0;

            var threshold = DateTime.UtcNow - maxAge;
            foreach (var file in Directory.EnumerateFiles(tempDir, "*.pdf"))
            {
                try
                {
                    var fileInfo = new FileInfo(file);
                    if (fileInfo.LastWriteTimeUtc < threshold)
                    {
                        fileInfo.Delete();
                        deletedCount++;
                        _logger.Information("Purged orphaned temp file: {FileName}", fileInfo.Name);
                    }
                }
                catch (Exception ex)
                {
                    _logger.Warning(ex, "Failed to purge orphaned file {File}", file);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error scanning temp directory for orphaned files");
        }

        return deletedCount;
    }
}
