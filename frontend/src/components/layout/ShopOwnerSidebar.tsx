'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Activity,
  ShoppingBag,
  Printer,
  DollarSign,
  CreditCard,
  QrCode,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Store,
  MapPin,
  Radio,
} from 'lucide-react';
import VeloxLogo from '@/components/shared/VeloxLogo';
import { useAuthStore } from '@/store/auth';
import {
  getMyShops,
  getShopPrinters,
  ShopData,
  ShopPrintersResponse,
} from '@/services/shop.service';
import StatusBadge from '@/components/ui/StatusBadge';

export default function ShopOwnerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: shops } = useQuery<ShopData[]>({
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

  const navItems = [
    { name: 'Overview', href: '/shop-owner', icon: LayoutDashboard },
    { name: 'Live Print Queue', href: '/shop-owner/queue', icon: Activity },
    { name: 'Order History', href: '/shop-owner/orders', icon: ShoppingBag },
    { name: 'Printers & Agent', href: '/shop-owner/printers', icon: Printer },
    { name: 'Rates & Pricing', href: '/shop-owner/pricing', icon: DollarSign },
    { name: 'Transactions', href: '/shop-owner/transactions', icon: CreditCard },
    { name: 'Counter QR Stand', href: '/shop-owner/qr', icon: QrCode },
  ];

  const handleLogout = () => {
    clearAuth();
    router.push('/shop-owner/login');
  };

  const isOnline = activeDevice?.status === 'ONLINE';

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2.5">
          <VeloxLogo className="h-7 w-auto" href="/shop-owner" />
          <span className="text-xs font-semibold text-muted">Shop Portal</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Drawer Backdrop & Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-background border-r border-border p-5 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-5 border-b border-border">
                  <VeloxLogo className="h-8 w-auto" href="/shop-owner" />
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-1.5 rounded-lg text-muted hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Shop Badge */}
                {assignedShop && (
                  <div className="mt-4 p-3 rounded-xl bg-surface border border-border">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-primary shrink-0" />
                      <p className="text-xs font-bold truncate text-foreground">
                        {assignedShop.name}
                      </p>
                    </div>
                    {assignedShop.city && (
                      <p className="text-[11px] text-muted flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {assignedShop.city}
                      </p>
                    )}
                  </div>
                )}

                {/* Navigation Items */}
                <nav className="mt-5 space-y-1">
                  {navItems.map((item) => {
                    const isActive =
                      item.href === '/shop-owner'
                        ? pathname === '/shop-owner'
                        : pathname.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                            : 'text-muted hover:text-foreground hover:bg-surface'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Footer Section */}
              <div className="pt-4 border-t border-border space-y-3">
                {assignedShop && (
                  <Link
                    href={`/shop/${assignedShop.publicShopId || assignedShop.id}`}
                    target="_blank"
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-muted hover:text-foreground hover:bg-surface border border-border transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Customer View
                    </span>
                    <span className="text-[10px] font-mono text-muted">Open ↗</span>
                  </Link>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="truncate pr-2">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {user?.name || 'Shop Owner'}
                    </p>
                    <p className="text-[10px] text-muted truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-muted hover:text-red-600 rounded-lg transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col justify-between w-64 lg:w-72 shrink-0 bg-surface/50 border-r border-border min-h-screen sticky top-0 h-screen overflow-y-auto p-5">
        <div>
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 pb-5 border-b border-border/80">
            <VeloxLogo className="h-8 w-auto" href="/shop-owner" />
            <div className="h-5 w-[1px] bg-border" />
            <div className="leading-none">
              <span className="text-[9px] font-mono font-bold tracking-widest text-primary uppercase block mb-0.5">
                PORTAL
              </span>
              <span className="text-xs font-semibold text-muted">Shop Counter</span>
            </div>
          </div>

          {/* Current Shop Identity Card */}
          {assignedShop && (
            <div className="mt-4 p-3 rounded-xl bg-background border border-border shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-primary shrink-0" />
                    <p
                      className="text-xs font-bold text-foreground truncate"
                      title={assignedShop.name}
                    >
                      {assignedShop.name}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted font-mono mt-1">
                    ID: {assignedShop.publicShopId || assignedShop.id.slice(0, 8)}
                  </p>
                </div>
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                    assignedShop.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800'
                  }`}
                >
                  {assignedShop.status}
                </span>
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="mt-5 space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === '/shop-owner'
                  ? pathname === '/shop-owner'
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                      : 'text-muted hover:text-foreground hover:bg-background/80'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-border/80 space-y-3">
          {/* Windows Agent Status Card */}
          <div className="p-3 rounded-xl bg-background border border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                <Radio className="h-3.5 w-3.5 text-muted" />
                Windows Agent
              </span>
              <StatusBadge
                status={isOnline ? 'ONLINE' : 'OFFLINE'}
                size="sm"
                label={isOnline ? 'Online' : 'Offline'}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted">
              <span>{activeDevice?.name || 'Local Spooler'}</span>
              <span>{formatHeartbeat(activeDevice?.lastHeartbeat)}</span>
            </div>
          </div>

          {/* Customer Link */}
          {assignedShop && (
            <Link
              href={`/shop/${assignedShop.publicShopId || assignedShop.id}`}
              target="_blank"
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-muted hover:text-foreground hover:bg-background border border-border transition-colors"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5" />
                Customer QR Store
              </span>
              <span className="text-[10px] text-muted font-mono">Open ↗</span>
            </Link>
          )}

          {/* User Account / Logout */}
          <div className="flex items-center justify-between pt-1">
            <div className="truncate pr-2">
              <p className="text-xs font-semibold text-foreground truncate">
                {user?.name || 'Shop Owner'}
              </p>
              <p className="text-[10px] text-muted truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-muted hover:text-red-600 hover:bg-background border border-border/60 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
