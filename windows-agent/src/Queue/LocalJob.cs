namespace VeloxAgent.Queue;

public static class LocalJobState
{
    public const string RECEIVED = "RECEIVED";
    public const string DOWNLOADING = "DOWNLOADING";
    public const string READY = "READY";
    public const string PRINTING = "PRINTING";
    public const string COMPLETED = "COMPLETED";
    public const string FAILED = "FAILED";
    public const string CLEANUP = "CLEANUP";
}

public sealed class LocalJob
{
    public string OrderId { get; set; } = string.Empty;
    public string OrderCode { get; set; } = string.Empty;
    public string ShopId { get; set; } = string.Empty;
    public string PrinterName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string? LocalFilePath { get; set; }
    public string? ExpectedChecksum { get; set; }
    public string? ActualChecksum { get; set; }
    public long FileSize { get; set; }
    public string State { get; set; } = LocalJobState.RECEIVED;
    public int Copies { get; set; } = 1;
    public string Color { get; set; } = "bw";
    public bool DoubleSided { get; set; } = false;
    public string Orientation { get; set; } = "portrait";
    public string PaperSize { get; set; } = "A4";
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
