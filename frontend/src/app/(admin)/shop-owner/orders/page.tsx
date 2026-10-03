'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getMyShops, getShopOrders, ShopData } from '@/services/shop.service';
import { useAuthStore } from '@/store/auth';
import { ArrowLeft, Loader2, Store, Search, Filter } from 'lucide-react';

export default function ShopOwnerOrdersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const localToken = typeof window !== 'undefined' ? localStorage.getItem('velox_token') : null;
    if (!localToken && !isAuthenticated) {
      router.push('/shop-owner/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: shops, isLoading: isShopsLoading } = useQuery<ShopData[]>({
    queryKey: ['ownerShops'],
    queryFn: getMyShops,
  });

  const assignedShop = shops && shops.length > 0 ? shops[0] : null;

  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['shopOrders', assignedShop?.id, statusFilter, debouncedSearch],
    queryFn: () =>
      getShopOrders(assignedShop!.id, { status: statusFilter, search: debouncedSearch }),
    enabled: !!assignedShop?.id,
  });

  if (isShopsLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/shop-owner"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shop Counter
          </Link>
          <span className="text-xs font-mono text-muted bg-surface border border-border px-2 py-0.5 rounded">
            {assignedShop?.name || 'Assigned Store'}
          </span>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Order History</h1>
            <p className="text-xs text-muted mt-0.5">
              View and filter all past and present customer orders.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search by order code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 text-sm bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="All">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="WAITING">Waiting</option>
              <option value="PRINTING">Printing</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        <div className="bg-surface/30 border border-border rounded-2xl overflow-hidden shadow-sm">
          {isOrdersLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted" />
            </div>
          ) : ordersData?.orders && ordersData.orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface/50 border-b border-border text-xs uppercase text-muted font-semibold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Order Code</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Specs</th>
                    <th className="px-6 py-4">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {ordersData.orders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/shop-owner/orders/${order.id}`}
                          className="font-mono font-medium hover:text-primary transition-colors"
                        >
                          {order.orderCode}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-muted text-xs">
                        {new Date(order.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            order.orderStatus === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                              : order.orderStatus === 'CANCELLED' || order.orderStatus === 'FAILED'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                          }`}
                        >
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted">
                        {order.totalPages} pages, {order.copies} copies
                      </td>
                      <td className="px-6 py-4 font-mono font-medium">
                        ₹{parseFloat(order.totalPrice || order.payment?.amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Store className="h-12 w-12 text-muted mb-4 opacity-50" />
              <h3 className="text-lg font-bold">No completed orders today.</h3>
              <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
                No orders match your filter criteria.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
