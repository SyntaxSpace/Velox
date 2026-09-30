'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getMyShops, getShopQueue, ShopData, ShopQueueInfo } from '@/services/shop.service';
import { useAuthStore } from '@/store/auth';
import { ArrowLeft, Loader2, Activity, Printer, Clock } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

export default function ShopOwnerQueuePage() {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const localToken = typeof window !== 'undefined' ? localStorage.getItem('velox_token') : null;
    if (!localToken && !isAuthenticated) {
      router.push('/shop-owner/login');
    }
  }, [isAuthenticated, router]);

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
  });

  useEffect(() => {
    if (assignedShop?.id) {
      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002', {
        path: '/socket.io',
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        newSocket.emit('join.shop', { shopId: assignedShop.id });
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

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [assignedShop?.id, refetch]);

  if (isShopsLoading || isQueueLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted">Loading live queue...</p>
      </div>
    );
  }

  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.ceil(seconds / 60)}m`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/shop-owner"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shop Counter
          </Link>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync Active
            </span>
            <span className="text-xs font-mono text-muted bg-surface border border-border px-2 py-0.5 rounded">
              {assignedShop?.name || 'Assigned Store'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Live Print Queue</h1>
            <p className="text-xs text-muted mt-0.5">
              Watch incoming customer orders and spool status in real-time.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="border border-border bg-surface/50 rounded-xl p-4 shadow-sm">
            <span className="text-muted text-[10px] font-semibold uppercase tracking-wider">
              Total in Queue
            </span>
            <span className="block text-xl font-bold mt-1 text-primary">
              {queueData?.totalInQueue || 0}
            </span>
          </div>
          <div className="border border-border bg-surface/50 rounded-xl p-4 shadow-sm">
            <span className="text-muted text-[10px] font-semibold uppercase tracking-wider">
              Avg Wait Time
            </span>
            <span className="block text-xl font-bold mt-1">
              {formatWaitTime(queueData?.averageWaitSeconds || 0)}
            </span>
          </div>
        </div>

        <div className="bg-surface/30 border border-border rounded-2xl overflow-hidden shadow-sm">
          {queueData?.orders && queueData.orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface/50 border-b border-border text-xs uppercase text-muted font-semibold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Position</th>
                    <th className="px-6 py-4">Order Code</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Specs</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Est. Wait</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {queueData.orders.map((order) => (
                    <tr key={order.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-base font-bold text-foreground">
                          #{order.queuePosition}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/shop-owner/orders/${order.id}`}
                          className="font-mono font-medium hover:text-primary transition-colors"
                        >
                          {order.orderCode}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-xs">{order.user?.name || 'Guest'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-muted flex flex-col gap-0.5">
                          <span>
                            {order.totalPages * order.copies} pages total ({order.totalPages} x{' '}
                            {order.copies})
                          </span>
                          <span>
                            {order.color.toUpperCase()} • {order.paperSize} •{' '}
                            {order.doubleSided ? 'Duplex' : 'Simplex'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            order.orderStatus === 'PRINTING'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                              : order.orderStatus === 'WAITING' || order.orderStatus === 'ASSIGNED'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 text-xs font-mono text-muted">
                          <Clock className="h-3 w-3" />
                          {formatWaitTime(order.estimatedWaitSeconds)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Printer className="h-12 w-12 text-muted mb-4 opacity-50" />
              <h3 className="text-lg font-bold">No customers are waiting.</h3>
              <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
                The print queue is currently empty. New orders will appear here automatically when
                they are placed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
