'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getMyShops, ShopData } from '@/services/shop.service';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { ArrowLeft, Loader2, FileText, Printer, CreditCard, Clock, Activity } from 'lucide-react';

export default function ShopOwnerOrderDetailPage({ params }: { params: { orderId: string } }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const localToken = typeof window !== 'undefined' ? localStorage.getItem('velox_token') : null;
    if (!localToken && !isAuthenticated) {
      router.push('/shop-owner/login');
    }
  }, [isAuthenticated, router]);

  const { data: shops } = useQuery<ShopData[]>({
    queryKey: ['ownerShops'],
    queryFn: getMyShops,
  });

  const assignedShop = shops && shops.length > 0 ? shops[0] : null;

  const { data: order, isLoading } = useQuery({
    queryKey: ['orderDetails', params.orderId],
    queryFn: async () => {
      const res = await api.get(`/orders/${params.orderId}`);
      return res.data.data;
    },
    enabled: !!assignedShop?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-3">
        <p className="text-xs text-muted">Order not found.</p>
        <Link href="/shop-owner/orders" className="text-primary hover:underline">
          Return to orders
        </Link>
      </div>
    );
  }

  const file = order.files && order.files.length > 0 ? order.files[0] : null;
  const payment = order.payment;

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/shop-owner/orders"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
          <span className="text-xs font-mono text-muted bg-surface border border-border px-2 py-0.5 rounded">
            {order.orderCode}
          </span>
        </div>

        <div className="border border-border bg-surface/50 rounded-2xl p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Order {order.orderCode}</h1>
                <p className="text-xs text-muted mt-0.5">
                  Placed on {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                  order.orderStatus === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                    : order.orderStatus === 'CANCELLED' || order.orderStatus === 'FAILED'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                }`}
              >
                {order.orderStatus}
              </span>

              {order.orderStatus === 'COMPLETED' && (
                <div className="mt-2 text-[10px] text-muted">
                  Ready for pickup. Provide code{' '}
                  <strong className="text-foreground">{order.orderCode}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border">
            {/* Print Specs */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Printer className="h-4 w-4 text-muted" />
                Print Specifications
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                    Pages
                  </span>
                  <p className="font-medium mt-0.5">{order.totalPages}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                    Copies
                  </span>
                  <p className="font-medium mt-0.5">{order.copies}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                    Color
                  </span>
                  <p className="font-medium mt-0.5 uppercase">{order.color}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                    Sides
                  </span>
                  <p className="font-medium mt-0.5">
                    {order.doubleSided ? 'Double-sided' : 'Single-sided'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                    Paper
                  </span>
                  <p className="font-medium mt-0.5 uppercase">{order.paperSize}</p>
                </div>
                {file && (
                  <div>
                    <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                      Document Name
                    </span>
                    <p className="font-medium mt-0.5 truncate max-w-[150px]" title={file.filename}>
                      {file.filename}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment & Queue Info */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted" />
                  Payment Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                      Amount
                    </span>
                    <p className="font-mono font-bold text-lg mt-0.5 text-emerald-600 dark:text-emerald-400">
                      ₹{parseFloat(order.totalPrice || payment?.amount || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                      Status
                    </span>
                    <p className="font-medium mt-0.5">{order.paymentStatus}</p>
                  </div>
                </div>
              </div>

              {(order.orderStatus === 'WAITING' || order.orderStatus === 'PRINTING') && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted" />
                    Queue Status
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                        Queue Position
                      </span>
                      <p className="font-medium mt-0.5">#{order.queuePosition || '-'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                        Est. Wait Time
                      </span>
                      <p className="font-medium mt-0.5 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted" />
                        {order.estimatedTime
                          ? `${Math.ceil(order.estimatedTime / 60)}m`
                          : 'Calculating...'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Event Timeline */}
        {order.events && order.events.length > 0 && (
          <div className="border border-border bg-surface/50 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold mb-4">Event Timeline</h3>
            <div className="space-y-4">
              {order.events.map((event: any) => (
                <div key={event.id} className="flex gap-4">
                  <div className="w-24 shrink-0 text-xs text-muted pt-0.5">
                    {new Date(event.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="relative pb-4">
                    <div className="absolute top-2 bottom-0 left-[7px] w-0.5 bg-border -z-10 last:hidden" />
                    <div className="h-4 w-4 rounded-full bg-surface border-2 border-primary" />
                  </div>
                  <div className="flex-1 pb-4 pt-0.5">
                    <p className="text-sm font-medium">{event.event.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
