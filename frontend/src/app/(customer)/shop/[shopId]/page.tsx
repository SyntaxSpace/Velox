'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getPublicShop, ShopData } from '@/services/shop.service';
import VeloxLogo from '@/components/shared/VeloxLogo';
import { Printer, MapPin, Phone, Mail, ArrowRight, Loader2 } from 'lucide-react';

export default function ShopPage() {
  const params = useParams<{ shopId: string }>();
  const router = useRouter();
  const shopId = params.shopId;

  const {
    data: shop,
    isLoading,
    error,
  } = useQuery<ShopData>({
    queryKey: ['shop', shopId],
    queryFn: () => getPublicShop(shopId),
    enabled: !!shopId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted" />
          <p className="text-muted text-sm">Loading shop details...</p>
        </div>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Shop Not Found</h1>
          <p className="text-muted mb-6">This shop does not exist or is no longer available.</p>
          <a
            href="/"
            className="text-sm underline underline-offset-4 text-muted hover:text-foreground"
          >
            Go to homepage
          </a>
        </div>
      </div>
    );
  }

  const onlinePrinters = shop.printers.filter(
    (p) => p.status === 'ONLINE' || p.status === 'PRINTING',
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <VeloxLogo className="h-6 w-auto" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Shop Info */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">{shop.name}</h1>
          {shop.address && (
            <div className="flex items-center gap-2 text-muted text-sm mt-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{shop.address}</span>
            </div>
          )}
          {shop.phone && (
            <div className="flex items-center gap-2 text-muted text-sm mt-1">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{shop.phone}</span>
            </div>
          )}
          {shop.email && (
            <div className="flex items-center gap-2 text-muted text-sm mt-1">
              <Mail className="h-4 w-4 shrink-0" />
              <span>{shop.email}</span>
            </div>
          )}
        </div>

        {/* Printer Status */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">Printers</h2>
          {shop.printers.length === 0 ? (
            <p className="text-sm text-muted">No printers configured.</p>
          ) : (
            <div className="space-y-2">
              {shop.printers.map((printer) => (
                <div
                  key={printer.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface"
                >
                  <div className="flex items-center gap-3">
                    <Printer className="h-5 w-5 text-muted" />
                    <div>
                      <p className="text-sm font-medium">{printer.name}</p>
                      <p className="text-xs text-muted">
                        {printer.printerType === 'BLACK_WHITE'
                          ? 'B&W'
                          : printer.printerType === 'COLOR'
                            ? 'Color'
                            : 'Bulk'}
                        {' · '}
                        {printer.pagesPerMinute} ppm
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      printer.status === 'ONLINE'
                        ? 'bg-green-50 text-success'
                        : printer.status === 'PRINTING'
                          ? 'bg-blue-50 text-info'
                          : 'bg-gray-100 text-muted'
                    }`}
                  >
                    {printer.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload CTA */}
        <button
          onClick={() => router.push(`/shop/${shopId}/upload`)}
          disabled={onlinePrinters.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 px-6 rounded-xl font-medium text-sm transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Upload Document
          <ArrowRight className="h-4 w-4" />
        </button>
        {onlinePrinters.length === 0 && (
          <p className="text-xs text-muted text-center mt-2">No printers available right now.</p>
        )}
      </main>
    </div>
  );
}
