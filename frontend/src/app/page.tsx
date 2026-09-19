import Link from 'next/link';
import { QrCode, Upload, Clock } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-8 py-6 border-b border-border">
        <div className="text-xl font-bold tracking-tight">Velox</div>
        <nav className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium hover:text-muted transition-colors">
            Login
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
          >
            Register
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter mb-6">
          Scan. Upload. Done.
        </h1>
        <p className="text-lg md:text-xl text-muted max-w-2xl mb-12">
          The modern QR-based smart printing platform for print shops. Upload your documents,
          configure settings, pay online, and track your order in real time.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
          <div className="flex flex-col items-center p-6 bg-surface border border-border rounded-xl">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <QrCode className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
            <p className="text-sm text-muted text-center">
              Scan the QR code at your local print shop to instantly connect to their service.
            </p>
          </div>

          <div className="flex flex-col items-center p-6 bg-surface border border-border rounded-xl">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Upload & Configure</h3>
            <p className="text-sm text-muted text-center">
              Upload your documents securely and choose your preferred print settings.
            </p>
          </div>

          <div className="flex flex-col items-center p-6 bg-surface border border-border rounded-xl">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Track & Collect</h3>
            <p className="text-sm text-muted text-center">
              Watch your order progress in real-time and collect it as soon as it's ready.
            </p>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-muted border-t border-border">
        &copy; {new Date().getFullYear()} Velox. All rights reserved.
      </footer>
    </div>
  );
}
