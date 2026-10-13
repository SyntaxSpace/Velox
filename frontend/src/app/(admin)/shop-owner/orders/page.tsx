'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getMyShops, getShopOrders, ShopData } from '@/services/shop.service';
import StatusBadge from '@/components/ui/StatusBadge';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { Loader2, ShoppingBag, Search, ArrowRight } from 'lucide-react';

export default function ShopOwnerOrdersPage() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
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

  const filterOptions = [
    { value: 'All', label: 'All' },
    { value: 'WAITING', label: 'Waiting' },
    { value: 'PRINTING', label: 'Printing' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  if (isShopsLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted">Loading order directory...</p>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Order Directory</h1>
            <p className="text-xs text-muted mt-0.5">
              History, receipts, and order statuses for {assignedShop?.name || 'Store'}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by order code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs"
          />
        </div>

        <div className="overflow-x-auto pb-1 md:pb-0">
          <SegmentedControl
            options={filterOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            size="sm"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden shadow-2xs">
        {isOrdersLoading ? (
          <div className="flex justify-center p-14">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : ordersData?.orders && ordersData.orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface border-b border-border text-[11px] uppercase tracking-wider text-muted font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Order Code</th>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Specs</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {ordersData.orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-surface/60 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/shop-owner/orders/${order.id}`}
                        className="font-mono font-bold text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
                      >
                        {order.orderCode}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {new Date(order.createdAt).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.orderStatus} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-muted">
                      <span className="font-medium text-foreground">{order.totalPages} pages</span>{' '}
                      · {order.copies} {order.copies === 1 ? 'copy' : 'copies'}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-foreground">
                      ₹{parseFloat(order.totalPrice || order.payment?.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/shop-owner/orders/${order.id}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                      >
                        Details <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-14 text-center">
            <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-muted mb-3">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No matching orders found</h3>
            <p className="text-xs text-muted mt-1 max-w-sm">
              {searchQuery
                ? `No orders match "${searchQuery}". Try clearing your search.`
                : 'No orders recorded in this filter view.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
