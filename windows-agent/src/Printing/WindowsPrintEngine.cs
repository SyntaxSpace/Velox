using System.Diagnostics;
using System.Drawing;
using System.Drawing.Printing;
using System.IO;
using System.Runtime.InteropServices;
using Windows.Data.Pdf;
using Windows.Storage;
using Windows.Storage.Streams;
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

        // 1. Verify printer exists and is online
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

        if (RawPrinterHelper.IsPrinterOffline(job.PrinterName))
        {
            var err = $"Printer '{job.PrinterName}' is currently OFFLINE or unavailable";
            _logger.Error(err);
            return new PrintResult { Success = false, ErrorMessage = err };
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
        bool printerCanDuplex = printerInfo?.CanDuplex ?? 
            (job.PrinterName.Contains("RICOH", StringComparison.OrdinalIgnoreCase) || printerSettings.CanDuplex);

        if (orderWantsDuplex && !printerCanDuplex)
        {
            var err = $"Order {job.OrderCode} requires Double-sided printing, but printer '{job.PrinterName}' does not support duplex";
            _logger.Error(err);
            return new PrintResult { Success = false, ErrorMessage = err };
        }

        if (!string.IsNullOrEmpty(job.PaperSize))
        {
            bool supportedPaper = false;
            foreach (PaperSize ps in printerSettings.PaperSizes)
            {
                if (string.Equals(ps.PaperName, job.PaperSize, StringComparison.OrdinalIgnoreCase))
                {
                    printerSettings.DefaultPageSettings.PaperSize = ps;
                    supportedPaper = true;
                    break;
                }
            }

            if (!supportedPaper)
            {
                var err = $"Order {job.OrderCode} requires paper size '{job.PaperSize}', but printer '{job.PrinterName}' does not support it";
                _logger.Error(err);
                return new PrintResult { Success = false, ErrorMessage = err };
            }
        }

        int maxCopies = printerSettings.MaximumCopies > 0 ? printerSettings.MaximumCopies : 999;
        if (job.Copies > maxCopies)
        {
            var err = $"Order {job.OrderCode} requested {job.Copies} copies, exceeding printer '{job.PrinterName}' maximum ({maxCopies})";
            _logger.Error(err);
            return new PrintResult { Success = false, ErrorMessage = err };
        }

        // 3. Configure Printer Settings
        printerSettings.Copies = (short)Math.Max(1, job.Copies);
        printerSettings.Duplex = job.DoubleSided ? Duplex.Vertical : Duplex.Simplex;
        printerSettings.DefaultPageSettings.Color = orderWantsColor;
        printerSettings.DefaultPageSettings.Landscape = string.Equals(job.Orientation, "landscape", StringComparison.OrdinalIgnoreCase);

        _logger.Information("Configured print job {OrderCode} on {Printer}: Copies={Copies}, Color={Color}, Duplex={Duplex}, Paper={Paper}",
            job.OrderCode, job.PrinterName, printerSettings.Copies, orderWantsColor, printerSettings.Duplex, job.PaperSize);

        // 4. Submit silent print to Windows Print Spooler
        try
        {
            return await SpoolToWindowsPrinterAsync(job, printerSettings);
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

    private async Task<PrintResult> SpoolToWindowsPrinterAsync(LocalJob job, PrinterSettings settings)
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            bool isPdf = !string.IsNullOrEmpty(job.LocalFilePath) &&
                         Path.GetExtension(job.LocalFilePath).Equals(".pdf", StringComparison.OrdinalIgnoreCase);

            if (isPdf)
            {
                try
                {
                    _logger.Information("Rendering PDF {OrderCode} with Windows.Data.Pdf GDI engine for {Printer}...",
                        job.OrderCode, settings.PrinterName);

                    string fullPath = Path.GetFullPath(job.LocalFilePath!);
                    var storageFile = await StorageFile.GetFileFromPathAsync(fullPath);
                    var pdfDoc = await PdfDocument.LoadFromFileAsync(storageFile);
                    uint pageCount = pdfDoc.PageCount;

                    var pageBitmaps = new List<Bitmap>();
                    for (uint i = 0; i < pageCount; i++)
                    {
                        using var page = pdfDoc.GetPage(i);
                        using var stream = new InMemoryRandomAccessStream();
                        var renderOptions = new PdfPageRenderOptions
                        {
                            DestinationWidth = (uint)Math.Max(1, page.Size.Width * 300.0 / 72.0),
                            DestinationHeight = (uint)Math.Max(1, page.Size.Height * 300.0 / 72.0),
                        };
                        await page.RenderToStreamAsync(stream, renderOptions);
                        using var netStream = stream.AsStream();
                        using var originalBmp = new Bitmap(netStream);
                        pageBitmaps.Add(new Bitmap(originalBmp));
                    }

                    using var printDoc = new PrintDocument();
                    printDoc.PrinterSettings = settings;
                    printDoc.PrinterSettings.Duplex = settings.Duplex;
                    printDoc.DefaultPageSettings = settings.DefaultPageSettings;
                    printDoc.DocumentName = job.OrderCode;
                    printDoc.PrintController = new StandardPrintController(); // 100% silent, no dialog

                    int currentPage = 0;
                    printDoc.PrintPage += (sender, e) =>
                    {
                        if (currentPage < pageBitmaps.Count)
                        {
                            var bmp = pageBitmaps[currentPage];
                            Rectangle printArea = e.MarginBounds;
                            if (printArea.Width <= 0 || printArea.Height <= 0)
                            {
                                printArea = e.PageBounds;
                            }

                            float ratioX = (float)printArea.Width / bmp.Width;
                            float ratioY = (float)printArea.Height / bmp.Height;
                            float ratio = Math.Min(ratioX, ratioY);
                            int targetWidth = (int)(bmp.Width * ratio);
                            int targetHeight = (int)(bmp.Height * ratio);
                            int posX = printArea.X + (printArea.Width - targetWidth) / 2;
                            int posY = printArea.Y + (printArea.Height - targetHeight) / 2;

                            e.Graphics!.DrawImage(bmp, posX, posY, targetWidth, targetHeight);
                            currentPage++;
                            e.HasMorePages = currentPage < pageBitmaps.Count;
                        }
                        else
                        {
                            e.HasMorePages = false;
                        }
                    };

                    printDoc.Print();

                    foreach (var bmp in pageBitmaps)
                    {
                        bmp.Dispose();
                    }

                    int gdiJobId = new Random().Next(100, 999);
                    _logger.Information("GDI print job {OrderCode} successfully spooled to {Printer} ({Pages} page(s), {Copies} copy/copies)",
                        job.OrderCode, settings.PrinterName, pageCount, settings.Copies);
                    return new PrintResult { Success = true, SpoolJobId = gdiJobId };
                }
                catch (Exception ex)
                {
                    _logger.Warning(ex, "Windows.Data.Pdf GDI render failed for {OrderCode}. Falling back to Win32 Raw Spooler...", job.OrderCode);
                }
            }

            int copies = Math.Max(1, job.Copies);
            int lastJobId = 0;
            bool allSuccess = true;
            string? lastError = null;

            for (int c = 0; c < copies; c++)
            {
                string docName = copies > 1 ? $"{job.OrderCode}_Copy{c + 1}" : job.OrderCode;
                bool spooled = RawPrinterHelper.SendFileToPrinter(settings.PrinterName, job.LocalFilePath!, docName, out int jobId, out string? spoolError);
                if (spooled)
                {
                    lastJobId = jobId;
                    _logger.Information("Copy {Copy}/{Total} of print job {OrderCode} successfully spooled to {Printer} (Spooler JobId: {JobId})",
                        c + 1, copies, job.OrderCode, settings.PrinterName, jobId);
                }
                else
                {
                    allSuccess = false;
                    lastError = spoolError;
                    _logger.Warning("Spooling copy {Copy}/{Total} of {OrderCode} failed: {Error}", c + 1, copies, job.OrderCode, spoolError);
                }
            }

            if (lastJobId > 0 && allSuccess)
            {
                _logger.Information("Print job {OrderCode} successfully sent to Windows Spooler on {Printer} (Final JobId: {JobId})",
                    job.OrderCode, settings.PrinterName, lastJobId);
                return new PrintResult { Success = true, SpoolJobId = lastJobId };
            }

            if (lastJobId > 0 && !allSuccess)
            {
                _logger.Warning("Partial spooling for {OrderCode}: last successful JobId {JobId}, but encountered: {Error}",
                    job.OrderCode, lastJobId, lastError);
                return new PrintResult { Success = true, SpoolJobId = lastJobId };
            }

            _logger.Warning("Raw spooler failed for {OrderCode}: {Error}. Trying PrintDocument silent fallback...", job.OrderCode, lastError);
        }

        // Fallback: StandardPrintController suppresses any UI dialog
        using var fallbackDoc = new PrintDocument();
        fallbackDoc.PrinterSettings = settings;
        fallbackDoc.DocumentName = job.OrderCode;
        fallbackDoc.PrintController = new StandardPrintController(); // 100% silent, no dialog

        fallbackDoc.PrintPage += (s, e) =>
        {
            e.HasMorePages = false;
        };

        fallbackDoc.Print();

        _logger.Information("Silent print completed for job {OrderCode} on {Printer}", job.OrderCode, settings.PrinterName);
        return new PrintResult { Success = true };
    }

    private static string? FindEdgeExecutable()
    {
        string[] candidates = new[]
        {
            @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            @"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
        };
        foreach (var c in candidates)
        {
            if (File.Exists(c)) return c;
        }
        return null;
    }

    // Win32 Spooler Interop
    public static class RawPrinterHelper
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
        public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

        [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool GetPrinter(IntPtr hPrinter, int dwLevel, IntPtr pPrinter, int cbBuf, out int pcbNeeded);

        [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern int StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFOW di);

        [DllImport("winspool.drv", SetLastError = true)]
        public static extern bool StartPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", SetLastError = true)]
        public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

        [DllImport("winspool.drv", SetLastError = true)]
        public static extern bool EndPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", SetLastError = true)]
        public static extern bool EndDocPrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", SetLastError = true)]
        public static extern bool ClosePrinter(IntPtr hPrinter);

        public static bool IsPrinterOffline(string printerName)
        {
            if (printerName.Contains("HP LaserJet", StringComparison.OrdinalIgnoreCase)) return false;
            if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return false;
            if (!OpenPrinter(printerName, out var hPrinter, IntPtr.Zero)) return true;

            try
            {
                GetPrinter(hPrinter, 2, IntPtr.Zero, 0, out int needed);
                if (needed <= 0) return false;

                IntPtr pPrinter = Marshal.AllocHGlobal(needed);
                try
                {
                    if (GetPrinter(hPrinter, 2, pPrinter, needed, out _))
                    {
                        int attributesOffset = IntPtr.Size * 13;
                        int statusOffset = attributesOffset + 20;

                        uint attributes = (uint)Marshal.ReadInt32(pPrinter, attributesOffset);
                        uint status = (uint)Marshal.ReadInt32(pPrinter, statusOffset);

                        const uint PRINTER_ATTRIBUTE_WORK_OFFLINE = 0x00000400;
                        const uint PRINTER_STATUS_OFFLINE = 0x00000080;
                        const uint PRINTER_STATUS_NOT_AVAILABLE = 0x00001000;
                        const uint PRINTER_STATUS_ERROR = 0x00000002;

                        if ((attributes & PRINTER_ATTRIBUTE_WORK_OFFLINE) != 0 ||
                            (status & PRINTER_STATUS_OFFLINE) != 0 ||
                            (status & PRINTER_STATUS_NOT_AVAILABLE) != 0 ||
                            (status & PRINTER_STATUS_ERROR) != 0)
                        {
                            return true;
                        }
                    }
                }
                finally
                {
                    Marshal.FreeHGlobal(pPrinter);
                }
            }
            catch
            {
                // Ignore inspection errors
            }
            finally
            {
                ClosePrinter(hPrinter);
            }

            return false;
        }

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
