using System.Security.Cryptography;
using System.Text;
using Serilog;
using VeloxAgent.Configuration;
using VeloxAgent.Download;
using Xunit;

namespace VeloxAgent.Tests;

public class DownloadManagerTests : IDisposable
{
    private readonly string _testTempDir;
    private readonly AgentConfig _config;
    private readonly ILogger _logger;

    public DownloadManagerTests()
    {
        _testTempDir = Path.Combine(Path.GetTempPath(), $"velox_dl_test_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_testTempDir);

        _config = new AgentConfig
        {
            TempPath = _testTempDir,
        };
        _logger = new LoggerConfiguration().CreateLogger();
    }

    [Fact]
    public async Task DownloadAndVerify_WithValidChecksum_Succeeds()
    {
        var content = "Sample PDF test document content for Velox Agent verification.";
        var bytes = Encoding.UTF8.GetBytes(content);
        var expectedHash = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

        // Use custom HttpMessageHandler returning the test content
        var handler = new TestHttpMessageHandler(new HttpResponseMessage(System.Net.HttpStatusCode.OK)
        {
            Content = new ByteArrayContent(bytes),
        });

        using var client = new HttpClient(handler);
        var manager = new DownloadManager(_config, _logger, client);

        var orderId = Guid.NewGuid().ToString();
        var result = await manager.DownloadAndVerifyAsync(orderId, "http://localhost/test.pdf", expectedHash);

        Assert.True(result.Success);
        Assert.NotNull(result.LocalFilePath);
        Assert.True(File.Exists(result.LocalFilePath));
        Assert.Equal(expectedHash, result.CalculatedChecksum);
    }

    [Fact]
    public async Task DownloadAndVerify_WithMismatchedChecksum_FailsAndDeletesCorruptedFile()
    {
        var content = "Corrupted document content.";
        var bytes = Encoding.UTF8.GetBytes(content);
        var wrongHash = "0000000000000000000000000000000000000000000000000000000000000000";

        var handler = new TestHttpMessageHandler(new HttpResponseMessage(System.Net.HttpStatusCode.OK)
        {
            Content = new ByteArrayContent(bytes),
        });

        using var client = new HttpClient(handler);
        var manager = new DownloadManager(_config, _logger, client);

        var orderId = Guid.NewGuid().ToString();
        var result = await manager.DownloadAndVerifyAsync(orderId, "http://localhost/test.pdf", wrongHash);

        Assert.False(result.Success);
        Assert.Contains("SHA-256 verification failed", result.ErrorMessage);

        // Verify corrupted file was cleaned up and deleted
        var expectedPath = Path.Combine(_testTempDir, $"{orderId}.pdf");
        Assert.False(File.Exists(expectedPath));
    }

    private class TestHttpMessageHandler : HttpMessageHandler
    {
        private readonly HttpResponseMessage _response;
        public TestHttpMessageHandler(HttpResponseMessage response) => _response = response;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => Task.FromResult(_response);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_testTempDir)) Directory.Delete(_testTempDir, true);
        }
        catch { }
    }
}
