namespace VeloxAgent.Printer;

public sealed class MockPrinterDiscoveryService : IPrinterDiscoveryService
{
    private readonly List<PrinterInfo> _printers = new();

    public MockPrinterDiscoveryService(IEnumerable<PrinterInfo>? initialPrinters = null)
    {
        if (initialPrinters != null)
        {
            _printers.AddRange(initialPrinters);
        }
        else
        {
            // Default mock printers for test environments
            _printers.Add(new PrinterInfo
            {
                Name = "Mock HP LaserJet Pro",
                PrinterType = "BLACK_WHITE",
                Status = "ONLINE",
                IsDefault = true,
                SupportsColor = false,
                CanDuplex = true,
                PagesPerMinute = 30,
                SupportedPaperSizes = new List<string> { "A4", "Letter", "Legal" }
            });

            _printers.Add(new PrinterInfo
            {
                Name = "Mock Canon Color PIXMA",
                PrinterType = "COLOR",
                Status = "ONLINE",
                IsDefault = false,
                SupportsColor = true,
                CanDuplex = true,
                PagesPerMinute = 15,
                SupportedPaperSizes = new List<string> { "A4", "Letter", "A3" }
            });
        }
    }

    public Task<IReadOnlyList<PrinterInfo>> DiscoverPrintersAsync(CancellationToken ct = default)
    {
        return Task.FromResult<IReadOnlyList<PrinterInfo>>(_printers.AsReadOnly());
    }

    public PrinterInfo? GetPrinter(string printerName)
    {
        return _printers.FirstOrDefault(p => string.Equals(p.Name, printerName, StringComparison.OrdinalIgnoreCase));
    }

    public void AddPrinter(PrinterInfo printer)
    {
        _printers.Add(printer);
    }
}
