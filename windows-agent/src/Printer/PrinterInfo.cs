namespace VeloxAgent.Printer;

public sealed class PrinterInfo
{
    public string Name { get; set; } = string.Empty;
    public string PrinterType { get; set; } = "BLACK_WHITE";
    public string Status { get; set; } = "ONLINE";
    public bool IsDefault { get; set; }
    public bool SupportsColor { get; set; }
    public bool CanDuplex { get; set; }
    public int PagesPerMinute { get; set; } = 25;
    public List<string> SupportedPaperSizes { get; set; } = new();
}
