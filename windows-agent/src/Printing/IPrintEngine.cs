using VeloxAgent.Queue;

namespace VeloxAgent.Printing;

public interface IPrintEngine
{
    Task<PrintResult> PrintAsync(LocalJob job, CancellationToken ct = default);
}
