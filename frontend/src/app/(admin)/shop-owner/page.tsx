'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getMyShops,
  firstLoginChangePassword,
  getShopPrinters,
  ShopData,
  ShopPrintersResponse,
  getShopDashboard,
  getShopOrders,
} from '@/services/shop.service';
import { useAuthStore } from '@/store/auth';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Store,
  Printer,
  QrCode,
  DollarSign,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  Clock,
  ShieldAlert,
  Lock,
  CheckCircle2,
  ArrowRight,
  Activity,
  Radio,
  ShoppingBag,
  CreditCard,
  ChevronRight,
} from 'lucide-react';

export default function ShopOwnerDashboardPage() {
  const { user, setAuth } = useAuthStore();

  const {
    data: shops,
    isLoading: isShopsLoading,
    error,
  } = useQuery<ShopData[]>({
    queryKey: ['ownerShops'],
    queryFn: getMyShops,
  });

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

  const { data: recentOrdersData } = useQuery({
    queryKey: ['shopOrders', assignedShop?.id, 'recent'],
    queryFn: () => getShopOrders(assignedShop!.id, { limit: 5 }),
    enabled: !!assignedShop?.id,
    refetchInterval: 5000,
  });

  const activeDevice =
    printerData?.devices && printerData.devices.length > 0
      ? [...printerData.devices].sort((a, b) => {
          if (a.status === 'ONLINE' && b.status !== 'ONLINE') return -1;
          if (b.status === 'ONLINE' && a.status !== 'ONLINE') return 1;
          const timeA = a.lastHeartbeat ? new Date(a.lastHeartbeat).getTime() : 0;
          const timeB = b.lastHeartbeat ? new Date(b.lastHeartbeat).getTime() : 0;
          return timeB - timeA;
        })[0]
      : null;

  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const formatHeartbeat = (dateString?: string | null) => {
    if (!dateString) return 'Never';
    if (!now) return 'Recently';
    const diff = Math.floor((now - new Date(dateString).getTime()) / 1000);
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

  if (isShopsLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted">Loading your store dashboard...</p>
      </div>
    );
  }

  const isAgentOnline = activeDevice?.status === 'ONLINE';

  return (
    <div className="py-8 px-4 sm:px-8 max-w-6xl mx-auto space-y-8">
      {/* Enforced First Login Password Change Alert */}
      {isFirstLogin && (
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-sm">
          <div className="flex items-center gap-3 text-amber-800 dark:text-amber-300 mb-3">
            <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h2 className="text-sm font-bold">Action Required: Change Temporary Password</h2>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Your account was provisioned by a Velox Partner. Please set a new password before
                proceeding.
              </p>
            </div>
          </div>

          {pwdError && (
            <div className="my-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-400">
              {pwdError}
            </div>
          )}

          {pwdSuccess ? (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Password updated successfully! Welcome to Velox.</span>
            </div>
          ) : (
            <form
              onSubmit={handlePasswordSubmit}
              className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">
                  Temporary Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="sm:col-span-3 flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={pwdMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {pwdMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      Save Password
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-400">
          Failed to load store profile. Please contact your Velox Partner.
        </div>
      )}

      {assignedShop ? (
        <>
          {/* Page Header Block */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {assignedShop.name}
                </h1>
                <StatusBadge
                  status={assignedShop.status}
                  label={assignedShop.status === 'ACTIVE' ? 'Live Store' : assignedShop.status}
                  size="sm"
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted mt-1.5">
                <span className="font-mono">
                  ID:{' '}
                  <strong className="text-foreground">
                    {assignedShop.publicShopId || assignedShop.id}
                  </strong>
                </span>
                {assignedShop.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {assignedShop.city}
                  </span>
                )}
                {assignedShop.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {assignedShop.phone}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/shop/${assignedShop.publicShopId || assignedShop.id}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-foreground transition-colors shadow-2xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Customer QR Page
              </Link>
            </div>
          </div>

          {/* Operational Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-surface/60 border border-border/80 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Today's Orders
              </span>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  {dashboardStats?.todayOrders ?? 0}
                </span>
                <span className="text-[11px] text-muted block mt-0.5">Submitted today</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-surface/60 border border-border/80 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Active Queue
              </span>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight text-primary">
                  {dashboardStats?.activeOrders ?? 0}
                </span>
                <span className="text-[11px] text-muted block mt-0.5">Jobs awaiting spooling</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-surface/60 border border-border/80 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Completed Today
              </span>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {dashboardStats?.completedToday ?? 0}
                </span>
                <span className="text-[11px] text-muted block mt-0.5">Prints fulfilled</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-surface/60 border border-border/80 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Today's Revenue
              </span>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  ₹{(dashboardStats?.todayRevenue ?? 0).toFixed(2)}
                </span>
                <span className="text-[11px] text-muted block mt-0.5">Counter & online total</span>
              </div>
            </div>
          </div>

          {/* Windows Agent Connection Strip */}
          <div className="p-5 sm:p-6 rounded-2xl bg-surface/50 border border-border shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isAgentOnline
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-neutral-500/10 text-neutral-500'
                  }`}
                >
                  <Radio className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-bold text-foreground">
                      {activeDevice
                        ? activeDevice.name || activeDevice.deviceId
                        : 'Windows Print Agent'}
                    </h3>
                    <StatusBadge
                      status={isAgentOnline ? 'ONLINE' : 'OFFLINE'}
                      size="sm"
                      label={isAgentOnline ? 'Connected' : 'Offline'}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted mt-1">
                    <span>
                      Device ID:{' '}
                      <strong className="font-mono text-foreground">
                        {activeDevice?.deviceId || 'N/A'}
                      </strong>
                    </span>
                    <span>
                      Last Heartbeat:{' '}
                      <strong className="text-foreground">
                        {formatHeartbeat(activeDevice?.lastHeartbeat)}
                      </strong>
                    </span>
                    <span>
                      Printers:{' '}
                      <strong className="text-foreground">
                        {printerData?.printers?.length || 0} discovered
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <Link
                href="/shop-owner/printers"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline shrink-0"
              >
                Printer Settings & Pairing <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Quick Operational Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/shop-owner/queue"
              className="p-5 rounded-2xl bg-surface/40 hover:bg-surface/80 border border-border hover:border-border/80 transition-all flex flex-col justify-between group shadow-2xs"
            >
              <div>
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                  <Activity className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Live Print Queue</h3>
                <p className="text-xs text-muted mt-1">
                  Monitor incoming jobs and watch them spool automatically in real time.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                <span>Open Queue</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            <Link
              href="/shop-owner/orders"
              className="p-5 rounded-2xl bg-surface/40 hover:bg-surface/80 border border-border hover:border-border/80 transition-all flex flex-col justify-between group shadow-2xs"
            >
              <div>
                <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Order Directory</h3>
                <p className="text-xs text-muted mt-1">
                  Search, review details, and confirm counter payments for customer orders.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                <span>View Orders</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            <Link
              href="/shop-owner/qr"
              className="p-5 rounded-2xl bg-surface/40 hover:bg-surface/80 border border-border hover:border-border/80 transition-all flex flex-col justify-between group shadow-2xs"
            >
              <div>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <QrCode className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Counter QR Poster</h3>
                <p className="text-xs text-muted mt-1">
                  Display or print your high-resolution branded counter stand for customers.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                <span>Open Poster Studio</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </div>

          {/* Recent Orders Section */}
          <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden shadow-2xs">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Recent Customer Orders</h3>
                <p className="text-xs text-muted">Latest print requests received at your counter</p>
              </div>
              <Link
                href="/shop-owner/orders"
                className="text-xs font-semibold text-primary hover:underline"
              >
                View all orders →
              </Link>
            </div>

            {recentOrdersData?.orders && recentOrdersData.orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface border-b border-border text-[11px] uppercase tracking-wider text-muted font-semibold">
                    <tr>
                      <th className="px-6 py-3">Order Code</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Specs</th>
                      <th className="px-6 py-3">Cost</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {recentOrdersData.orders.slice(0, 5).map((order: any) => (
                      <tr key={order.id} className="hover:bg-surface/60 transition-colors">
                        <td className="px-6 py-3.5 font-mono font-bold text-foreground">
                          {order.orderCode}
                        </td>
                        <td className="px-6 py-3.5 text-muted">
                          {order.customerName || order.customerPhone || 'Guest Customer'}
                        </td>
                        <td className="px-6 py-3.5 text-muted">
                          {order.totalPages} pages · {order.copies} copy
                        </td>
                        <td className="px-6 py-3.5 font-mono font-semibold text-foreground">
                          ₹{order.totalCost ?? order.estimatedCost ?? 0}
                        </td>
                        <td className="px-6 py-3.5">
                          <StatusBadge status={order.orderStatus} size="sm" />
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Link
                            href={`/shop-owner/orders/${order.id}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-muted">
                No orders yet today. When customers scan your QR stand, jobs will appear here
                instantly.
              </div>
            )}
          </div>
        </>
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
    </div>
  );
}
