namespace VeloxAgent.Printing;

public sealed class PrintResult
{
    public bool Success { get; set; }
    public int? SpoolJobId { get; set; }
    public string? ErrorMessage { get; set; }
}
