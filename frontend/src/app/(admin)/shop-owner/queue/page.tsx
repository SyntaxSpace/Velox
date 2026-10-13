'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getMyShops, getShopQueue, ShopData, ShopQueueInfo } from '@/services/shop.service';
import StatusBadge from '@/components/ui/StatusBadge';
import { Loader2, Activity, Printer, Clock, ArrowRight } from 'lucide-react';
import { io } from 'socket.io-client';

export default function ShopOwnerQueuePage() {
  const { data: shops, isLoading: isShopsLoading } = useQuery<ShopData[]>({
    queryKey: ['ownerShops'],
    queryFn: getMyShops,
  });

  const assignedShop = shops && shops.length > 0 ? shops[0] : null;

  const {
    data: queueData,
    isLoading: isQueueLoading,
    refetch,
  } = useQuery<ShopQueueInfo>({
    queryKey: ['shopQueue', assignedShop?.id],
    queryFn: () => getShopQueue(assignedShop!.id),
    enabled: !!assignedShop?.id,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (assignedShop?.id) {
      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
        path: '/socket.io',
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        newSocket.emit('join.shop', assignedShop.id);
      });

      newSocket.on('queue.updated', () => {
        refetch();
      });

      newSocket.on('order.assigned', () => {
        refetch();
      });

      newSocket.on('order.status.changed', () => {
        refetch();
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [assignedShop?.id, refetch]);

  if (isShopsLoading || isQueueLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted">Loading live print queue...</p>
      </div>
    );
  }

  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.ceil(seconds / 60)}m`;
  };

  return (
    <div className="py-8 px-4 sm:px-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Live Print Queue</h1>
            <p className="text-xs text-muted mt-0.5">
              Real-time spool monitor for incoming jobs at {assignedShop?.name || 'Store'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync Active
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface/60 border border-border shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Total in Queue
          </span>
          <span className="block text-2xl font-bold mt-1 text-primary tracking-tight">
            {queueData?.totalInQueue || 0}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-surface/60 border border-border shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Avg Wait Time
          </span>
          <span className="block text-2xl font-bold mt-1 text-foreground tracking-tight">
            {formatWaitTime(queueData?.averageWaitSeconds || 0)}
          </span>
        </div>
      </div>

      {/* Queue Table */}
      <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden shadow-2xs">
        {queueData?.orders && queueData.orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface border-b border-border text-[11px] uppercase tracking-wider text-muted font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Position</th>
                  <th className="px-6 py-3.5">Order Code</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Specs</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Est. Wait</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {queueData.orders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface/60 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-bold text-foreground bg-neutral-200/60 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                        #{order.queuePosition}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-foreground">
                      <Link
                        href={`/shop-owner/orders/${order.id}`}
                        className="hover:text-primary transition-colors underline-offset-2 hover:underline"
                      >
                        {order.orderCode}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-muted">{order.user?.name || 'Guest Customer'}</td>
                    <td className="px-6 py-4 text-muted">
                      <div className="space-y-0.5">
                        <span className="font-medium text-foreground">
                          {order.totalPages * order.copies} pages
                        </span>
                        <span className="block text-[11px] text-muted">
                          {order.color.toUpperCase()} · {order.paperSize} ·{' '}
                          {order.doubleSided ? 'Duplex' : 'Simplex'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.orderStatus} size="sm" />
                    </td>
                    <td className="px-6 py-4 font-mono text-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatWaitTime(order.estimatedWaitSeconds)}
                      </span>
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
              <Printer className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Queue is currently clear</h3>
            <p className="text-xs text-muted mt-1 max-w-sm">
              No orders waiting in queue. As customers upload files via your QR stand, jobs will
              appear here automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
