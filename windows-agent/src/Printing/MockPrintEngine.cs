using VeloxAgent.Printer;
using VeloxAgent.Queue;

namespace VeloxAgent.Printing;

public sealed class MockPrintEngine : IPrintEngine
{
    private readonly IPrinterDiscoveryService _printerDiscovery;
    public List<LocalJob> PrintedJobs { get; } = new();

    public MockPrintEngine(IPrinterDiscoveryService printerDiscovery)
    {
        _printerDiscovery = printerDiscovery;
    }

    public Task<PrintResult> PrintAsync(LocalJob job, CancellationToken ct = default)
    {
        // 1. Verify file exists
        if (string.IsNullOrEmpty(job.LocalFilePath) || !File.Exists(job.LocalFilePath))
        {
            return Task.FromResult(new PrintResult
            {
                Success = false,
                ErrorMessage = $"Document file not found at {job.LocalFilePath}",
            });
        }

        // 2. Verify printer exists
        var printer = _printerDiscovery.GetPrinter(job.PrinterName);
        if (printer == null)
        {
            return Task.FromResult(new PrintResult
            {
                Success = false,
                ErrorMessage = $"Printer '{job.PrinterName}' is not installed",
            });
        }

        // 3. Verify color capability
        bool orderWantsColor = string.Equals(job.Color, "color", StringComparison.OrdinalIgnoreCase);
        if (orderWantsColor && !printer.SupportsColor)
        {
            return Task.FromResult(new PrintResult
            {
                Success = false,
                ErrorMessage = $"Order {job.OrderCode} requires COLOR, but printer '{job.PrinterName}' only supports Black & White",
            });
        }

        // 4. Verify duplex capability
        if (job.DoubleSided && !printer.CanDuplex)
        {
            return Task.FromResult(new PrintResult
            {
                Success = false,
                ErrorMessage = $"Order {job.OrderCode} requires Double-sided printing, but printer '{job.PrinterName}' does not support duplex",
            });
        }

        PrintedJobs.Add(job);
        return Task.FromResult(new PrintResult
        {
            Success = true,
            SpoolJobId = PrintedJobs.Count,
        });
    }
}
