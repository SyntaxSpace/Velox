namespace VeloxAgent.Printer;

public interface IPrinterDiscoveryService
{
    Task<IReadOnlyList<PrinterInfo>> DiscoverPrintersAsync(CancellationToken ct = default);
    PrinterInfo? GetPrinter(string printerName);
}
