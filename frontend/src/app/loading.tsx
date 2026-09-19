export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-8 h-8 border-4 border-muted/30 border-t-primary rounded-full animate-spin mb-4"></div>
      <p className="text-sm font-medium text-muted">Loading...</p>
    </div>
  );
}
