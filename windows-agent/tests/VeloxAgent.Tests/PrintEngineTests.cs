using VeloxAgent.Printer;
using VeloxAgent.Printing;
using VeloxAgent.Queue;
using Xunit;

namespace VeloxAgent.Tests;

public class PrintEngineTests : IDisposable
{
    private readonly string _testTempDir;
    private readonly string _dummyFilePath;
    private readonly MockPrinterDiscoveryService _printerDiscovery;
    private readonly MockPrintEngine _printEngine;

    public PrintEngineTests()
    {
        _testTempDir = Path.Combine(Path.GetTempPath(), $"velox_print_test_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_testTempDir);
        _dummyFilePath = Path.Combine(_testTempDir, "test_document.pdf");
        File.WriteAllText(_dummyFilePath, "%PDF-1.4 mock pdf content");

        _printerDiscovery = new MockPrinterDiscoveryService(new[]
        {
            new PrinterInfo
            {
                Name = "LaserJet-BW-Only",
                PrinterType = "BLACK_WHITE",
                Status = "ONLINE",
                SupportsColor = false,
                CanDuplex = false,
                PagesPerMinute = 30
            },
            new PrinterInfo
            {
                Name = "Office-Color-Duplex",
                PrinterType = "COLOR",
                Status = "ONLINE",
                SupportsColor = true,
                CanDuplex = true,
                PagesPerMinute = 20
            }
        });

        _printEngine = new MockPrintEngine(_printerDiscovery);
    }

    [Fact]
    public async Task PrintAsync_WhenColorRequestedOnBwPrinter_FailsWithUnsupportedCapability()
    {
        var job = new LocalJob
        {
            OrderId = Guid.NewGuid().ToString(),
            OrderCode = "VLX-COLOR-TEST",
            PrinterName = "LaserJet-BW-Only",
            LocalFilePath = _dummyFilePath,
            Color = "color",
            DoubleSided = false,
            Copies = 1,
        };

        var result = await _printEngine.PrintAsync(job);

        Assert.False(result.Success);
        Assert.Contains("requires COLOR, but printer 'LaserJet-BW-Only' only supports Black & White", result.ErrorMessage);
    }

    [Fact]
    public async Task PrintAsync_WhenDuplexRequestedOnSimplexPrinter_FailsWithUnsupportedCapability()
    {
        var job = new LocalJob
        {
            OrderId = Guid.NewGuid().ToString(),
            OrderCode = "VLX-DUPLEX-TEST",
            PrinterName = "LaserJet-BW-Only",
            LocalFilePath = _dummyFilePath,
            Color = "bw",
            DoubleSided = true, // requested duplex
            Copies = 1,
        };

        var result = await _printEngine.PrintAsync(job);

        Assert.False(result.Success);
        Assert.Contains("requires Double-sided printing, but printer 'LaserJet-BW-Only' does not support duplex", result.ErrorMessage);
    }

    [Fact]
    public async Task PrintAsync_WhenCapabilitiesMatch_Succeeds()
    {
        var job = new LocalJob
        {
            OrderId = Guid.NewGuid().ToString(),
            OrderCode = "VLX-MATCH-TEST",
            PrinterName = "Office-Color-Duplex",
            LocalFilePath = _dummyFilePath,
            Color = "color",
            DoubleSided = true,
            Copies = 2,
        };

        var result = await _printEngine.PrintAsync(job);

        Assert.True(result.Success);
        Assert.Single(_printEngine.PrintedJobs);
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
