interface QueuePageProps {
  params: Promise<{ shopId: string }>;
}

export default async function QueuePage({ params }: QueuePageProps) {
  const { shopId } = await params;

  return (
    <div className="min-h-screen bg-surface p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-background border border-border rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Live Queue — QuickPrint Hub</h1>
          <p className="text-sm text-muted">Real-time status of current print orders</p>
        </div>

        <div className="bg-background border border-primary/20 rounded-xl shadow-sm p-6 mb-6 flex justify-between items-center bg-primary/5">
          <div>
            <p className="text-sm font-medium text-muted mb-1">Your Position</p>
            <p className="text-3xl font-bold">2</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-muted mb-1">Est. Time</p>
            <p className="text-xl font-semibold">~4 mins</p>
          </div>
        </div>

        <div className="bg-background border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            <div className="p-4 flex items-center justify-between hover:bg-surface transition-colors">
              <div className="flex items-center gap-4">
                <div className="font-mono text-sm font-medium">#QP-001</div>
                <div className="text-sm text-muted">5 pages</div>
              </div>
              <div className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info">
                Printing
              </div>
            </div>
            <div className="p-4 flex items-center justify-between hover:bg-surface transition-colors">
              <div className="flex items-center gap-4">
                <div className="font-mono text-sm font-medium">#QP-002 (You)</div>
                <div className="text-sm text-muted">12 pages</div>
              </div>
              <div className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                Waiting
              </div>
            </div>
            <div className="p-4 flex items-center justify-between hover:bg-surface transition-colors">
              <div className="flex items-center gap-4">
                <div className="font-mono text-sm font-medium">#QP-003</div>
                <div className="text-sm text-muted">3 pages</div>
              </div>
              <div className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                Waiting
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
