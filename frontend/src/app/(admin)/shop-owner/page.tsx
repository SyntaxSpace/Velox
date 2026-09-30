'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyShops,
  firstLoginChangePassword,
  getShopPrinters,
  ShopData,
  ShopPrintersResponse,
  getShopDashboard,
} from '@/services/shop.service';
import { useAuthStore } from '@/store/auth';
import {
  Store,
  Printer,
  QrCode,
  DollarSign,
  ExternalLink,
  Loader2,
  LogOut,
  MapPin,
  Phone,
  Clock,
  ShieldAlert,
  Lock,
  CheckCircle2,
  ArrowRight,
  Activity,
  Radio,
  Laptop,
} from 'lucide-react';

export default function ShopOwnerDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('velox_token') : null;
    if (!token && !isAuthenticated) {
      router.push('/shop-owner/login');
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

  // Single assigned shop
  const assignedShop = shops && shops.length > 0 ? shops[0] : null;

  const { data: printerData } = useQuery<ShopPrintersResponse>({
    queryKey: ['shopPrinters', assignedShop?.id],
    queryFn: () => getShopPrinters(assignedShop!.id),
    enabled: !!assignedShop?.id,
    refetchInterval: 5000,
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ['shopDashboard', assignedShop?.id],
    queryFn: () => getShopDashboard(assignedShop!.id),
    enabled: !!assignedShop?.id,
    refetchInterval: 5000,
  });

  const activeDevice =
    printerData?.devices && printerData.devices.length > 0 ? printerData.devices[0] : null;

  const formatHeartbeat = (dateString?: string | null) => {
    if (!dateString) return 'Never';
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 5) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff / 60)}m ago`;
  };

  // First login password change state
  const isFirstLogin = user?.firstLogin === true;
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);

  const pwdMutation = useMutation({
    mutationFn: () => firstLoginChangePassword(tempPassword, newPassword),
    onSuccess: (data) => {
      setPwdSuccess(true);
      if (user) {
        setAuth({ ...user, firstLogin: false }, data.accessToken);
      }
    },
    onError: (err: any) => {
      setPwdError(
        err.response?.data?.message ||
          err.message ||
          'Failed to change password. Verify your temporary password.',
      );
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    if (newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Passwords do not match.');
      return;
    }
    pwdMutation.mutate();
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/shop-owner/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted">Loading your print shop counter...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-surface/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
              V
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-wider text-primary uppercase bg-primary/10 px-1.5 py-0.2 rounded">
                  SHOP COUNTER
                </span>
                <span className="text-xs text-muted font-medium">
                  {assignedShop?.name || 'Velox Store'}
                </span>
              </div>
              <h1 className="text-base font-bold">Shop Owner Portal</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-foreground">{user?.name || 'Shop Owner'}</p>
              <p className="text-[11px] text-muted">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface border border-border text-xs flex items-center gap-1.5 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Enforced First Login Password Change Modal */}
        {isFirstLogin && (
          <div className="mb-8 p-6 sm:p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 shadow-lg">
            <div className="flex items-center gap-3 text-amber-800 dark:text-amber-300 mb-3">
              <ShieldAlert className="h-6 w-6 shrink-0 text-amber-600" />
              <div>
                <h2 className="text-base font-bold">Action Required: Change Temporary Password</h2>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Your account was provisioned by a Velox Partner. Please set a new secure password
                  before proceeding.
                </p>
              </div>
            </div>

            {pwdError && (
              <div className="my-3 p-3 rounded-xl bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                {pwdError}
              </div>
            )}

            {pwdSuccess ? (
              <div className="p-4 rounded-xl bg-green-100 dark:bg-green-950/50 border border-green-300 dark:border-green-800 text-xs text-green-800 dark:text-green-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Password updated successfully! Welcome to Velox.</span>
              </div>
            ) : (
              <form
                onSubmit={handlePasswordSubmit}
                className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                    Temporary Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background"
                  />
                </div>

                <div className="sm:col-span-3 flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={pwdMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:opacity-90 disabled:opacity-50"
                  >
                    {pwdMutation.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        Set New Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            Failed to load assigned shop profile. Please contact your Velox Partner.
          </div>
        )}

        {assignedShop ? (
          <div className="space-y-6">
            {/* Shop Overview Header Card */}
            <div className="border border-border bg-surface/50 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-2xl font-bold tracking-tight">{assignedShop.name}</h2>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        assignedShop.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-zinc-100 text-zinc-600 border border-zinc-300'
                      }`}
                    >
                      {assignedShop.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted mt-2">
                    <span className="font-mono bg-background border border-border px-2 py-0.5 rounded-md">
                      Public ID:{' '}
                      <strong className="text-foreground">
                        {assignedShop.publicShopId || assignedShop.id}
                      </strong>
                    </span>

                    {assignedShop.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {assignedShop.city}
                      </span>
                    )}

                    {assignedShop.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {assignedShop.phone}
                      </span>
                    )}

                    {assignedShop.operatingHours && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {assignedShop.operatingHours}
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  href={`/shop/${assignedShop.publicShopId || assignedShop.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-surface text-xs font-semibold shadow-sm transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Public Customer Store
                </Link>
              </div>

              {/* Pricing strip */}
              <div className="mt-6 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-muted block text-[11px]">B&W Page Rate</span>
                    <strong className="text-foreground text-sm font-mono">
                      ₹{assignedShop.pricePerPageBW ?? 2}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Color Page Rate</span>
                    <strong className="text-foreground text-sm font-mono">
                      ₹{assignedShop.pricePerPageColor ?? 10}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Duplex Discount</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                      -₹{assignedShop.duplexDiscount ?? 0}
                    </strong>
                  </div>
                </div>

                <Link
                  href="/shop-owner/pricing"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  Configure Shop Pricing Rates <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Key Performance Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="border border-border bg-surface/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <span className="text-muted text-[11px] font-semibold uppercase tracking-wider">
                  Today's Orders
                </span>
                <span className="text-2xl font-bold mt-2">{dashboardStats?.todayOrders ?? 0}</span>
              </div>
              <div className="border border-border bg-surface/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <span className="text-muted text-[11px] font-semibold uppercase tracking-wider">
                  Active Queue
                </span>
                <span className="text-2xl font-bold mt-2 text-primary">
                  {dashboardStats?.activeOrders ?? 0}
                </span>
              </div>
              <div className="border border-border bg-surface/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <span className="text-muted text-[11px] font-semibold uppercase tracking-wider">
                  Completed Today
                </span>
                <span className="text-2xl font-bold mt-2 text-emerald-600 dark:text-emerald-400">
                  {dashboardStats?.completedToday ?? 0}
                </span>
              </div>
              <div className="border border-border bg-surface/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <span className="text-muted text-[11px] font-semibold uppercase tracking-wider">
                  Today's Revenue
                </span>
                <span className="text-2xl font-bold mt-2">
                  ₹{(dashboardStats?.todayRevenue ?? 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Live Edge Node & Windows Agent Status Banner */}
            <div className="border border-border bg-surface/50 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                      activeDevice?.status === 'ONLINE'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-zinc-500/10 text-zinc-500'
                    }`}
                  >
                    <Radio className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-sm font-bold tracking-tight">
                        {activeDevice
                          ? activeDevice.name || activeDevice.deviceId
                          : 'No Windows Agent Registered'}
                      </h4>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          activeDevice?.status === 'ONLINE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            activeDevice?.status === 'ONLINE'
                              ? 'bg-emerald-500 animate-pulse'
                              : 'bg-zinc-400'
                          }`}
                        />
                        {activeDevice?.status === 'ONLINE' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted mt-1">
                      <span>
                        Device ID:{' '}
                        <strong className="font-mono text-foreground">
                          {activeDevice?.deviceId || 'N/A'}
                        </strong>
                      </span>
                      <span>
                        Shop: <strong className="text-foreground">{assignedShop.name}</strong>
                      </span>
                      <span>
                        Last Heartbeat:{' '}
                        <strong className="text-foreground">
                          {formatHeartbeat(activeDevice?.lastHeartbeat)}
                        </strong>
                      </span>
                      <span>
                        Connection:{' '}
                        <strong className="text-foreground">
                          {activeDevice?.status === 'ONLINE'
                            ? 'Active WebSocket (/agent)'
                            : 'Disconnected'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[11px] text-muted block">Polling interval: 5s</span>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    {activeDevice?.status === 'ONLINE'
                      ? '● Ready for Instant Spooling'
                      : '○ Standby'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Live Queue */}
              <div className="rounded-2xl border border-border bg-surface/40 p-6 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-sm">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                    <Activity className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold">Live Print Queue</h3>
                  <p className="text-xs text-muted mt-1">
                    Monitor incoming orders and watch them spool to the printer in real-time.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/60">
                  <Link
                    href="/shop-owner/queue"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    View Queue
                  </Link>
                </div>
              </div>

              {/* Order History */}
              <div className="rounded-2xl border border-border bg-surface/40 p-6 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-sm">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
                    <Store className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold">Order History</h3>
                  <p className="text-xs text-muted mt-1">
                    Search and filter completed, failed, and cancelled customer orders.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/60">
                  <Link
                    href="/shop-owner/orders"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl border border-border bg-background hover:bg-surface text-xs font-semibold transition-colors"
                  >
                    View Orders
                  </Link>
                </div>
              </div>

              {/* Transactions */}
              <div className="rounded-2xl border border-border bg-surface/40 p-6 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-sm">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold">Transactions</h3>
                  <p className="text-xs text-muted mt-1">
                    View payment records and revenue for completed print orders.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/60">
                  <Link
                    href="/shop-owner/transactions"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl border border-border bg-background hover:bg-surface text-xs font-semibold transition-colors"
                  >
                    View Revenue
                  </Link>
                </div>
              </div>

              {/* Printers Card */}
              <div className="rounded-2xl border border-border bg-surface/40 p-6 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-sm">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 flex items-center justify-center mb-4">
                    <Printer className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold">Printer Fleet</h3>
                  <p className="text-xs text-muted mt-1">
                    Manage connected Windows printers and monitor agent status.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/60">
                  <Link
                    href="/shop-owner/printers"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl border border-border bg-background hover:bg-surface text-xs font-semibold transition-colors"
                  >
                    Manage Printers ({assignedShop.printers?.length || 0})
                  </Link>
                </div>
              </div>

              {/* Counter QR Stand */}
              <div className="rounded-2xl border border-border bg-surface/40 p-6 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-sm">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold">Counter QR Stand</h3>
                  <p className="text-xs text-muted mt-1">
                    Display or print the counter stand QR code for zero-login printing.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/60">
                  <Link
                    href="/shop-owner/qr"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl border border-border bg-background hover:bg-surface text-xs font-semibold transition-colors"
                  >
                    Open Stand Card
                  </Link>
                </div>
              </div>

              {/* Shop Pricing Rates */}
              <div className="rounded-2xl border border-border bg-surface/40 p-6 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-sm">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold">Pricing Rates</h3>
                  <p className="text-xs text-muted mt-1">
                    Set your custom rates per page for B&W, Color, and duplex.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/60">
                  <Link
                    href="/shop-owner/pricing"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl border border-border bg-background hover:bg-surface text-xs font-semibold transition-colors"
                  >
                    Edit Pricing
                  </Link>
                </div>
              </div>
            </div>

            {/* Scope Notice Footer */}
            <div className="p-4 rounded-xl border border-border bg-surface/30 text-center text-xs text-muted">
              <p>
                This terminal is bound to <strong>{assignedShop.name}</strong>. Shop provisioning
                and network administration are managed centrally by authorized Velox Partners.
              </p>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-2xl p-12 text-center max-w-md mx-auto">
            <Store className="h-10 w-10 text-muted mx-auto mb-3" />
            <h3 className="text-base font-semibold">No Assigned Store Found</h3>
            <p className="text-xs text-muted mt-1">
              Your account is not linked to any active store. Please contact your Velox Partner to
              complete store provisioning.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
