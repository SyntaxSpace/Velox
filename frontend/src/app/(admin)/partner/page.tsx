'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getPartnerStats, getAllShops, PartnerStats } from '@/services/partner.service';
import { ShopData } from '@/services/shop.service';
import { useAuthStore } from '@/store/auth';
import VeloxLogo from '@/components/shared/VeloxLogo';
import {
  Plus,
  Store,
  Printer,
  QrCode,
  ExternalLink,
  LogOut,
  Search,
  TrendingUp,
  Activity,
  IndianRupee,
} from 'lucide-react';

export default function PartnerDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('velox_token') : null;
    if (!token && !isAuthenticated) {
      router.push('/partner/login');
    }
  }, [isAuthenticated, router]);

  const { data: stats, isLoading: isStatsLoading } = useQuery<PartnerStats>({
    queryKey: ['partnerStats'],
    queryFn: getPartnerStats,
    refetchInterval: 15000,
  });

  const { data: shops, isLoading: isShopsLoading } = useQuery<ShopData[]>({
    queryKey: ['partnerShops'],
    queryFn: getAllShops,
    refetchInterval: 15000,
  });

  const handleLogout = () => {
    clearAuth();
    router.push('/partner/login');
  };

  const filteredShops = (shops || []).filter((shop) => {
    const query = searchQuery.toLowerCase();
    return (
      shop.name.toLowerCase().includes(query) ||
      (shop.publicShopId && shop.publicShopId.toLowerCase().includes(query)) ||
      (shop.city && shop.city.toLowerCase().includes(query)) ||
      (shop.email && shop.email.toLowerCase().includes(query))
    );
  });

  const totalPrintersCount = (shops || []).reduce((acc, s) => acc + (s.printers?.length || 0), 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Platform Navigation Bar */}
      <header className="border-b border-border bg-background/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <VeloxLogo className="h-7 sm:h-8 w-auto" href="/partner" />
            <div className="h-5 w-[1px] bg-border" />
            <span className="text-xs font-semibold text-muted tracking-tight">
              Partner Platform
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-foreground">
                {user?.name || 'Partner Account'}
              </p>
              <p className="text-[11px] text-muted font-mono">
                {user?.email || 'partner@velox.dev'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="h-9 px-3 rounded-xl text-xs font-medium text-muted hover:text-foreground hover:bg-surface border border-border flex items-center gap-1.5 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Section Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Network Overview
          </h1>
          <p className="text-xs text-muted mt-1">
            Real-time telemetry and management across provisioned printing stores
          </p>
        </div>

        {/* High-Precision Monochrome Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
          <div className="bg-surface border border-border rounded-xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted mb-3">
              <span className="text-xs font-medium">Total Stores</span>
              <Store className="h-4 w-4" />
            </div>
            <p className="text-2xl font-semibold tracking-tight text-foreground font-mono">
              {isStatsLoading ? '—' : (stats?.totalShops ?? shops?.length ?? 0)}
            </p>
            <p className="text-[11px] text-muted mt-1">Provisioned locations</p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted mb-3">
              <span className="text-xs font-medium">Active Stores</span>
              <Activity className="h-4 w-4" />
            </div>
            <p className="text-2xl font-semibold tracking-tight text-foreground font-mono flex items-center gap-2">
              {isStatsLoading ? '—' : (stats?.activeShops ?? 0)}
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            </p>
            <p className="text-[11px] text-muted mt-1">Online & accepting jobs</p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted mb-3">
              <span className="text-xs font-medium">Discovered Printers</span>
              <Printer className="h-4 w-4" />
            </div>
            <p className="text-2xl font-semibold tracking-tight text-foreground font-mono">
              {isShopsLoading ? '—' : totalPrintersCount}
            </p>
            <p className="text-[11px] text-muted mt-1">Connected edge spoolers</p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted mb-3">
              <span className="text-xs font-medium">Orders Today</span>
              <TrendingUp className="h-4 w-4" />
            </div>
            <p className="text-2xl font-semibold tracking-tight text-foreground font-mono">
              {isStatsLoading ? '—' : (stats?.totalOrdersToday ?? 0)}
            </p>
            <p className="text-[11px] text-muted mt-1">Processed print requests</p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4 sm:p-5 shadow-sm col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-muted mb-3">
              <span className="text-xs font-medium">Network Volume</span>
              <IndianRupee className="h-4 w-4" />
            </div>
            <p className="text-2xl font-semibold tracking-tight text-foreground font-mono">
              ₹{isStatsLoading ? '—' : (stats?.totalRevenueToday ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-muted mt-1">Gross daily turnover</p>
          </div>
        </div>

        {/* Control Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by store name, public ID, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all"
            />
          </div>

          <Link
            href="/partner/shops/create"
            className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-medium hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Provision New Store</span>
          </Link>
        </div>

        {/* Loading Skeletons */}
        {isShopsLoading && (
          <div className="border border-border rounded-2xl bg-surface p-6 space-y-4">
            <div className="h-4 bg-border/40 rounded w-1/4 animate-pulse" />
            <div className="h-10 bg-border/20 rounded-xl animate-pulse" />
            <div className="h-10 bg-border/20 rounded-xl animate-pulse" />
            <div className="h-10 bg-border/20 rounded-xl animate-pulse" />
          </div>
        )}

        {/* Empty State */}
        {!isShopsLoading && filteredShops.length === 0 && (
          <div className="border border-dashed border-border bg-surface/40 rounded-2xl p-12 text-center max-w-md mx-auto my-12">
            <div className="h-10 w-10 rounded-xl bg-surface border border-border mx-auto flex items-center justify-center text-muted mb-3">
              <Store className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No print stores found</h3>
            <p className="text-xs text-muted mt-1 mb-5">
              {searchQuery
                ? 'No stores match your search criteria. Try a different query.'
                : 'No commercial print stores have been provisioned in this network.'}
            </p>
            <Link
              href="/partner/shops/create"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-xs font-medium h-9 px-4 rounded-xl hover:opacity-90 transition-opacity"
            >
              <Plus className="h-3.5 w-3.5" />
              Provision First Store
            </Link>
          </div>
        )}

        {/* Enterprise Data Table */}
        {!isShopsLoading && filteredShops.length > 0 && (
          <div className="border border-border rounded-2xl bg-surface overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface text-[11px] font-medium text-muted uppercase tracking-wider">
                    <th className="py-3 px-5">Store</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Page Rates (B&W / Color)</th>
                    <th className="py-3 px-4 text-center">Printers</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {filteredShops.map((shop) => (
                    <tr key={shop.id} className="hover:bg-background/60 transition-colors group">
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-foreground text-sm">{shop.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[10px] text-muted bg-background border border-border px-1.5 py-0.5 rounded">
                            {shop.publicShopId || shop.id}
                          </span>
                          {shop.phone && (
                            <span className="text-[11px] text-muted">{shop.phone}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-foreground font-medium">{shop.city || '—'}</div>
                        <div className="text-[11px] text-muted truncate max-w-[200px]">
                          {shop.address || '—'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-foreground font-medium">
                          ₹{Number(shop.pricePerPageBW ?? 2).toFixed(2)}{' '}
                          <span className="text-muted font-sans text-[11px]">/</span> ₹
                          {Number(shop.pricePerPageColor ?? 10).toFixed(2)}
                        </div>
                        {shop.duplexDiscount ? (
                          <div className="text-[10px] text-muted">
                            -₹{Number(shop.duplexDiscount).toFixed(2)} duplex
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted/60">Standard</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-mono font-medium text-foreground">
                          <Printer className="h-3.5 w-3.5 text-muted" />
                          {shop.printers?.length || 0}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-medium text-foreground bg-background border border-border px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 shadow-none">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              shop.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-neutral-400'
                            }`}
                          />
                          {shop.status === 'ACTIVE' ? 'Active' : shop.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/owner/shop/${shop.id}/qr`}
                            target="_blank"
                            className="h-8 px-2.5 rounded-lg border border-border bg-background hover:bg-surface text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors shadow-none"
                            title="Open Counter Stand QR Slip"
                          >
                            <QrCode className="h-3.5 w-3.5 text-muted" />
                            <span className="hidden md:inline">Stand QR</span>
                          </Link>

                          <Link
                            href={`/shop/${shop.publicShopId || shop.id}`}
                            target="_blank"
                            className="h-8 w-8 rounded-lg border border-border bg-background hover:bg-surface text-muted hover:text-foreground flex items-center justify-center transition-colors shadow-none"
                            title="Open Customer Counter Page"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
