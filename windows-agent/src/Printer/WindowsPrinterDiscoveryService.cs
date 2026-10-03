using System.Drawing.Printing;
using VeloxAgent.Printing;

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

                    // HP LaserJet P1100 series (such as P1108) is a simplex desktop printer;
                    // the driver exposes manual duplex which requires human intervention.
                    if (printerName.Contains("P110", StringComparison.OrdinalIgnoreCase) ||
                        printerName.Contains("1108", StringComparison.OrdinalIgnoreCase))
                    {
                        canDuplex = false;
                    }

                    // RICOH M 2700 is an automated duplex monochrome MFP
                    if (printerName.Contains("RICOH", StringComparison.OrdinalIgnoreCase) ||
                        printerName.Contains("M 2700", StringComparison.OrdinalIgnoreCase))
                    {
                        canDuplex = true;
                        isColor = false;
                    }

                    bool isOffline = WindowsPrintEngine.RawPrinterHelper.IsPrinterOffline(printerName);

                    var paperSizes = new List<string>();
                    foreach (PaperSize paperSize in settings.PaperSizes)
                    {
                        paperSizes.Add(paperSize.PaperName);
                    }

                    var info = new PrinterInfo
                    {
                        Name = printerName,
                        PrinterType = isColor ? "COLOR" : "BLACK_WHITE",
                        Status = isOffline ? "OFFLINE" : "ONLINE",
                        IsDefault = isDefault,
                        SupportsColor = isColor,
                        CanDuplex = canDuplex,
                        PagesPerMinute = isColor ? 15 : (printerName.Contains("1108") ? 18 : 25),
                        SupportedPaperSizes = paperSizes,
                    };

                    list.Add(info);
                    _discovered[printerName] = info;
                    _logger.Information("Discovered printer: {Name} (Type: {Type}, Default: {Default}, Duplex: {Duplex}, Status: {Status})",
                        printerName, info.PrinterType, isDefault, canDuplex, info.Status);
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
                var canDuplex = settings.CanDuplex;
                if (printerName.Contains("P110", StringComparison.OrdinalIgnoreCase) ||
                    printerName.Contains("1108", StringComparison.OrdinalIgnoreCase))
                {
                    canDuplex = false;
                }

                if (printerName.Contains("RICOH", StringComparison.OrdinalIgnoreCase) ||
                    printerName.Contains("M 2700", StringComparison.OrdinalIgnoreCase))
                {
                    canDuplex = true;
                }

                bool isOffline = WindowsPrintEngine.RawPrinterHelper.IsPrinterOffline(printerName);
                bool isColor = settings.SupportsColor && !printerName.Contains("RICOH", StringComparison.OrdinalIgnoreCase);

                var infoCreated = new PrinterInfo
                {
                    Name = printerName,
                    PrinterType = isColor ? "COLOR" : "BLACK_WHITE",
                    Status = isOffline ? "OFFLINE" : "ONLINE",
                    IsDefault = settings.IsDefaultPrinter,
                    SupportsColor = isColor,
                    CanDuplex = canDuplex,
                    PagesPerMinute = isColor ? 15 : (printerName.Contains("1108") ? 18 : 27),
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
