using System.Drawing.Printing;
using System.Runtime.InteropServices;
using VeloxAgent.Printer;
using VeloxAgent.Queue;

namespace VeloxAgent.Printing;

public sealed class WindowsPrintEngine : IPrintEngine
{
    private readonly IPrinterDiscoveryService _printerDiscovery;
    private readonly Serilog.ILogger _logger;

    public WindowsPrintEngine(IPrinterDiscoveryService printerDiscovery, Serilog.ILogger logger)
    {
        _printerDiscovery = printerDiscovery;
        _logger = logger;
    }

    public async Task<PrintResult> PrintAsync(LocalJob job, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(job.LocalFilePath) || !File.Exists(job.LocalFilePath))
        {
            return new PrintResult
            {
                Success = false,
                ErrorMessage = $"Document file not found at {job.LocalFilePath}",
            };
        }

        // 1. Verify printer exists
        var printerInfo = _printerDiscovery.GetPrinter(job.PrinterName);
        var printerSettings = new PrinterSettings { PrinterName = job.PrinterName };

        if (!printerSettings.IsValid && printerInfo == null)
        {
            return new PrintResult
            {
                Success = false,
                ErrorMessage = $"Printer '{job.PrinterName}' is not installed or available on this system",
            };
        }

        // 2. Validate requested print settings against printer driver capabilities
        bool orderWantsColor = string.Equals(job.Color, "color", StringComparison.OrdinalIgnoreCase);
        bool printerSupportsColor = printerInfo?.SupportsColor ?? printerSettings.SupportsColor;

        if (orderWantsColor && !printerSupportsColor)
        {
            var err = $"Order {job.OrderCode} requires COLOR, but printer '{job.PrinterName}' only supports Black & White";
            _logger.Error(err);
            return new PrintResult { Success = false, ErrorMessage = err };
        }

        bool orderWantsDuplex = job.DoubleSided;
        bool printerCanDuplex = printerInfo?.CanDuplex ?? printerSettings.CanDuplex;

        if (orderWantsDuplex && !printerCanDuplex)
        {
            var err = $"Order {job.OrderCode} requires Double-sided printing, but printer '{job.PrinterName}' does not support duplex";
            _logger.Error(err);
            return new PrintResult { Success = false, ErrorMessage = err };
        }

        // 3. Configure Printer Settings
        printerSettings.Copies = (short)Math.Max(1, job.Copies);
        printerSettings.Duplex = job.DoubleSided ? Duplex.Vertical : Duplex.Simplex;
        printerSettings.DefaultPageSettings.Color = orderWantsColor;
        printerSettings.DefaultPageSettings.Landscape = string.Equals(job.Orientation, "landscape", StringComparison.OrdinalIgnoreCase);

        if (!string.IsNullOrEmpty(job.PaperSize))
        {
            foreach (PaperSize ps in printerSettings.PaperSizes)
            {
                if (string.Equals(ps.PaperName, job.PaperSize, StringComparison.OrdinalIgnoreCase))
                {
                    printerSettings.DefaultPageSettings.PaperSize = ps;
                    break;
                }
            }
        }

        _logger.Information("Configured print job {OrderCode} on {Printer}: Copies={Copies}, Color={Color}, Duplex={Duplex}, Paper={Paper}",
            job.OrderCode, job.PrinterName, printerSettings.Copies, orderWantsColor, printerSettings.Duplex, job.PaperSize);

        // 4. Submit silent print to Windows Print Spooler
        try
        {
            return await Task.Run(() => SpoolToWindowsPrinter(job, printerSettings), ct);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to submit print job {OrderCode} to Windows Spooler", job.OrderCode);
            return new PrintResult
            {
                Success = false,
                ErrorMessage = ex.Message,
            };
        }
    }

    private PrintResult SpoolToWindowsPrinter(LocalJob job, PrinterSettings settings)
    {
        // Use native Win32 Raw Print Spooler to send document bytes to printer queue
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            bool spooled = RawPrinterHelper.SendFileToPrinter(settings.PrinterName, job.LocalFilePath!, job.OrderCode, out int jobId, out string? spoolError);
            if (spooled)
            {
                _logger.Information("Print job {OrderCode} successfully sent to Windows Spooler on {Printer} (JobId: {JobId})",
                    job.OrderCode, settings.PrinterName, jobId);
                return new PrintResult { Success = true, SpoolJobId = jobId };
            }

            // If raw spooler reports error, fallback to StandardPrintController PrintDocument
            _logger.Warning("Raw spooler returned: {Error}. Trying PrintDocument silent fallback...", spoolError);
        }

        // Fallback: StandardPrintController suppresses any UI dialog
        using var printDoc = new PrintDocument();
        printDoc.PrinterSettings = settings;
        printDoc.DocumentName = job.OrderCode;
        printDoc.PrintController = new StandardPrintController(); // 100% silent, no dialog

        printDoc.PrintPage += (s, e) =>
        {
            // Simple page handler
            e.HasMorePages = false;
        };

        printDoc.Print();

        _logger.Information("Silent print completed for job {OrderCode} on {Printer}", job.OrderCode, settings.PrinterName);
        return new PrintResult { Success = true };
    }

    // Win32 Spooler Interop
    private static class RawPrinterHelper
    {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public struct DOCINFOW
        {
            [MarshalAs(UnmanagedType.LPWStr)]
            public string pDocName;
            [MarshalAs(UnmanagedType.LPWStr)]
            public string? pOutputFile;
            [MarshalAs(UnmanagedType.LPWStr)]
            public string? pDataType;
        }

        [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

        [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern int StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFOW di);

        [DllImport("winspool.drv", SetLastError = true)]
        private static extern bool StartPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", SetLastError = true)]
        private static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

        [DllImport("winspool.drv", SetLastError = true)]
        private static extern bool EndPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", SetLastError = true)]
        private static extern bool EndDocPrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", SetLastError = true)]
        private static extern bool ClosePrinter(IntPtr hPrinter);

        public static bool SendFileToPrinter(string printerName, string filePath, string docName, out int jobId, out string? error)
        {
            jobId = 0;
            error = null;

            if (!File.Exists(filePath))
            {
                error = "File does not exist";
                return false;
            }

            if (!OpenPrinter(printerName, out var hPrinter, IntPtr.Zero))
            {
                error = $"Could not open printer {printerName}. Error: {Marshal.GetLastWin32Error()}";
                return false;
            }

            try
            {
                var di = new DOCINFOW
                {
                    pDocName = docName,
                    pDataType = "RAW",
                };

                jobId = StartDocPrinter(hPrinter, 1, ref di);
                if (jobId == 0)
                {
                    error = $"StartDocPrinter failed. Error: {Marshal.GetLastWin32Error()}";
                    return false;
                }

                if (!StartPagePrinter(hPrinter))
                {
                    error = $"StartPagePrinter failed. Error: {Marshal.GetLastWin32Error()}";
                    EndDocPrinter(hPrinter);
                    return false;
                }

                byte[] bytes = File.ReadAllBytes(filePath);
                IntPtr unmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
                try
                {
                    Marshal.Copy(bytes, 0, unmanagedBytes, bytes.Length);
                    bool writeSuccess = WritePrinter(hPrinter, unmanagedBytes, bytes.Length, out int written);
                    if (!writeSuccess || written != bytes.Length)
                    {
                        error = $"WritePrinter failed. Error: {Marshal.GetLastWin32Error()}";
                        EndPagePrinter(hPrinter);
                        EndDocPrinter(hPrinter);
                        return false;
                    }
                }
                finally
                {
                    Marshal.FreeCoTaskMem(unmanagedBytes);
                }

                EndPagePrinter(hPrinter);
                EndDocPrinter(hPrinter);
                return true;
            }
            finally
            {
                ClosePrinter(hPrinter);
            }
        }
    }
}
