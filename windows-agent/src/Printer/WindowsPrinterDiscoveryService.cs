using System.Drawing.Printing;

namespace VeloxAgent.Printer;

public sealed class WindowsPrinterDiscoveryService : IPrinterDiscoveryService
{
    private readonly Serilog.ILogger _logger;
    private readonly Dictionary<string, PrinterInfo> _discovered = new(StringComparer.OrdinalIgnoreCase);

    public WindowsPrinterDiscoveryService(Serilog.ILogger logger)
    {
        _logger = logger;
    }

    public Task<IReadOnlyList<PrinterInfo>> DiscoverPrintersAsync(CancellationToken ct = default)
    {
        var list = new List<PrinterInfo>();
        _discovered.Clear();

        try
        {
            foreach (string printerName in PrinterSettings.InstalledPrinters)
            {
                ct.ThrowIfCancellationRequested();

                try
                {
                    var settings = new PrinterSettings { PrinterName = printerName };
                    if (!settings.IsValid) continue;

                    var isColor = settings.SupportsColor;
                    var canDuplex = settings.CanDuplex;
                    var isDefault = settings.IsDefaultPrinter;

                    var paperSizes = new List<string>();
                    foreach (PaperSize paperSize in settings.PaperSizes)
                    {
                        paperSizes.Add(paperSize.PaperName);
                    }

                    var info = new PrinterInfo
                    {
                        Name = printerName,
                        PrinterType = isColor ? "COLOR" : "BLACK_WHITE",
                        Status = "ONLINE",
                        IsDefault = isDefault,
                        SupportsColor = isColor,
                        CanDuplex = canDuplex,
                        PagesPerMinute = isColor ? 15 : 25,
                        SupportedPaperSizes = paperSizes,
                    };

                    list.Add(info);
                    _discovered[printerName] = info;
                    _logger.Information("Discovered printer: {Name} (Type: {Type}, Default: {Default}, Duplex: {Duplex})",
                        printerName, info.PrinterType, isDefault, canDuplex);
                }
                catch (Exception ex)
                {
                    _logger.Warning(ex, "Failed to read capabilities for printer {Name}", printerName);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to discover Windows printers");
        }

        return Task.FromResult<IReadOnlyList<PrinterInfo>>(list);
    }

    public PrinterInfo? GetPrinter(string printerName)
    {
        if (_discovered.TryGetValue(printerName, out var info))
        {
            return info;
        }

        // Check if printer exists directly in Windows spooler
        try
        {
            var settings = new PrinterSettings { PrinterName = printerName };
            if (settings.IsValid)
            {
                var infoCreated = new PrinterInfo
                {
                    Name = printerName,
                    PrinterType = settings.SupportsColor ? "COLOR" : "BLACK_WHITE",
                    Status = "ONLINE",
                    IsDefault = settings.IsDefaultPrinter,
                    SupportsColor = settings.SupportsColor,
                    CanDuplex = settings.CanDuplex,
                    PagesPerMinute = settings.SupportsColor ? 15 : 25,
                };
                _discovered[printerName] = infoCreated;
                return infoCreated;
            }
        }
        catch
        {
            // Ignore
        }

        return null;
    }
}
