'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getMyShops, ShopData } from '@/services/shop.service';
import { useAuthStore } from '@/store/auth';
import VeloxLogo from '@/components/shared/VeloxLogo';
import {
  Plus,
  Store,
  Printer,
  QrCode,
  ExternalLink,
  Loader2,
  LogOut,
  MapPin,
  Phone,
} from 'lucide-react';

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, clearAuth } = useAuthStore();

  useEffect(() => {
    // Only redirect to login if auth is ready and definitely not authenticated
    const token = typeof window !== 'undefined' ? localStorage.getItem('velox_token') : null;
    if (!token && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const {
    data: shops,
    isLoading,
    error,
  } = useQuery<ShopData[]>({
    queryKey: ['ownerShops'],
    queryFn: getMyShops,
  });

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <VeloxLogo className="h-8 w-auto" href="/owner" />
            <div className="h-6 w-[1px] bg-border hidden sm:block" />
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted uppercase">
                Velox Edge
              </p>
              <h1 className="text-base font-bold">Owner Dashboard</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted hidden sm:inline">
              Signed in as <strong className="text-foreground">{user?.name || 'Shop Owner'}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface border border-border text-xs flex items-center gap-1.5 transition-colors"
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Title + Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Your Print Shops</h2>
            <p className="text-sm text-muted mt-1">
              Manage shop profiles, printer fleets, and customer counter QR codes.
            </p>
          </div>

          <Link
            href="/owner/shop/create"
            className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create New Shop
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted" />
            <p className="text-sm text-muted">Loading your shops...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            Failed to load your shops. Please refresh or verify your connection.
          </div>
        )}

        {/* Empty State */}
        {!isLoading && shops && shops.length === 0 && (
          <div className="border border-dashed border-border rounded-2xl p-12 text-center bg-surface/30 max-w-lg mx-auto">
            <div className="h-12 w-12 rounded-2xl bg-surface border border-border mx-auto flex items-center justify-center text-muted mb-4">
              <Store className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold">No shops created yet</h3>
            <p className="text-sm text-muted mt-1.5 mb-6">
              Create your first print shop to register printers and generate customer QR codes.
            </p>
            <Link
              href="/owner/shop/create"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium py-2.5 px-5 rounded-xl hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Create First Shop
            </Link>
          </div>
        )}

        {/* Shop Cards Grid */}
        {!isLoading && shops && shops.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {shops.map((shop) => (
              <div
                key={shop.id}
                className="rounded-2xl border border-border bg-surface/40 p-6 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight">{shop.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-mono bg-background border border-border px-2 py-0.5 rounded-md text-muted">
                          {shop.publicShopId || shop.id}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            shop.status === 'ACTIVE'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                          }`}
                        >
                          {shop.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {shop.address && (
                    <div className="flex items-center gap-2 text-xs text-muted mt-3">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {shop.address}
                        {shop.city ? `, ${shop.city}` : ''}
                        {shop.pincode ? ` - ${shop.pincode}` : ''}
                      </span>
                    </div>
                  )}

                  {shop.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted mt-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{shop.phone}</span>
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-6 border-t border-border/60 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/shop/${shop.publicShopId || shop.id}`}
                    target="_blank"
                    className="flex-1 min-w-[120px] text-xs font-medium py-2 px-3 rounded-lg border border-border bg-background hover:bg-surface text-center flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Customer Page
                  </Link>

                  <Link
                    href={`/owner/shop/${shop.id}/printers`}
                    className="flex-1 min-w-[100px] text-xs font-medium py-2 px-3 rounded-lg border border-border bg-background hover:bg-surface text-center flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Printers
                  </Link>

                  <Link
                    href={`/owner/shop/${shop.id}/qr`}
                    className="flex-1 min-w-[100px] text-xs font-medium py-2 px-3 rounded-lg bg-primary text-primary-foreground text-center flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    QR Stand
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
