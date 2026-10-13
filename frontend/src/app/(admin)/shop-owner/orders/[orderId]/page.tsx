'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useMutation, useQuery } from '@tanstack/react-query';
import { confirmCounterPayment, dispatchShopOrder } from '@/services/shop.service';
import { api } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  ArrowLeft,
  Loader2,
  FileText,
  Printer,
  CreditCard,
  Clock,
  Activity,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

function getRequestErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
  }
  return 'The request could not be completed. Please try again.';
}

export default function ShopOwnerOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['orderDetails', orderId],
    queryFn: async () => {
      const res = await api.get(`/orders/${orderId}`);
      return res.data.data;
    },
    enabled: !!orderId,
    refetchInterval: (query) =>
      ['WAITING', 'ASSIGNED', 'DOWNLOADING', 'PRINTING'].includes(query.state.data?.orderStatus)
        ? 5000
        : false,
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: () => confirmCounterPayment(order.shopId, orderId),
    onSuccess: async () => {
      setActionError(null);
      await refetch();
    },
    onError: (err: unknown) => setActionError(getRequestErrorMessage(err)),
  });

  const dispatchMutation = useMutation({
    mutationFn: () => dispatchShopOrder(order.shopId, orderId),
    onSuccess: async () => {
      setActionError(null);
      await refetch();
    },
    onError: (err: unknown) => setActionError(getRequestErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-16 text-center max-w-md mx-auto space-y-4">
        <p className="text-sm text-muted">
          {error ? getRequestErrorMessage(error) : 'Order not found.'}
        </p>
        <Link
          href="/shop-owner/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Return to orders directory
        </Link>
      </div>
    );
  }

  const file = order.files && order.files.length > 0 ? order.files[0] : null;
  const payment = order.payment;

  return (
    <div className="py-8 px-4 sm:px-8 max-w-5xl mx-auto space-y-6">
      {/* Top Breadcrumb & Status */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-border/60">
        <Link
          href="/shop-owner/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Orders
        </Link>
        <StatusBadge status={order.orderStatus} size="md" />
      </div>

      {/* Main Order Receipt Card */}
      <div className="rounded-2xl border border-border bg-surface/50 p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground font-mono">
                  {order.orderCode}
                </h1>
                {order.orderStatus === 'COMPLETED' && (
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Ready for Pickup
                  </span>
                )}
              </div>
              <p className="text-xs text-muted flex items-center gap-1.5 mt-1">
                <Calendar className="h-3 w-3" />
                Placed{' '}
                {new Date(order.createdAt).toLocaleString([], {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] uppercase tracking-wider text-muted font-semibold block">
              Total Amount
            </span>
            <span className="text-2xl font-bold font-mono text-foreground mt-0.5 block">
              ₹{parseFloat(order.totalPrice || payment?.amount || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Specifications Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Print Specifications */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
              <Printer className="h-3.5 w-3.5" />
              Print Specifications
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-background border border-border">
                <span className="text-[10px] text-muted font-semibold uppercase block">Pages</span>
                <p className="font-bold text-sm text-foreground mt-0.5">{order.totalPages}</p>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border">
                <span className="text-[10px] text-muted font-semibold uppercase block">Copies</span>
                <p className="font-bold text-sm text-foreground mt-0.5">{order.copies}</p>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border">
                <span className="text-[10px] text-muted font-semibold uppercase block">
                  Color Mode
                </span>
                <p className="font-bold text-sm text-foreground uppercase mt-0.5">{order.color}</p>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border">
                <span className="text-[10px] text-muted font-semibold uppercase block">Sides</span>
                <p className="font-bold text-sm text-foreground mt-0.5">
                  {order.doubleSided ? 'Duplex (2-sided)' : 'Simplex (1-sided)'}
                </p>
              </div>
            </div>

            {file && (
              <div className="p-3 rounded-xl bg-background border border-border flex items-center justify-between text-xs">
                <span className="text-muted">Document:</span>
                <span
                  className="font-semibold text-foreground truncate max-w-[200px]"
                  title={file.filename}
                >
                  {file.filename}
                </span>
              </div>
            )}
          </div>

          {/* Payment & Queue Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5" />
              Payment & Status Details
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-background border border-border">
                <span className="text-[10px] text-muted font-semibold uppercase block">
                  Payment Status
                </span>
                <p className="font-bold text-sm text-foreground mt-0.5">{order.paymentStatus}</p>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border">
                <span className="text-[10px] text-muted font-semibold uppercase block">Method</span>
                <p className="font-bold text-sm text-foreground mt-0.5">
                  {payment?.method || 'Online'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border">
                <span className="text-[10px] text-muted font-semibold uppercase block">
                  Queue Position
                </span>
                <p className="font-bold text-sm text-foreground mt-0.5">
                  #{order.queuePosition || '-'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border">
                <span className="text-[10px] text-muted font-semibold uppercase block">
                  Est. Wait
                </span>
                <p className="font-bold text-sm text-foreground mt-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted" />
                  {order.estimatedTime ? `${Math.ceil(order.estimatedTime / 60)}m` : 'Ready'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Block for Counter Payment & Dispatch */}
      {((order.orderStatus === 'PENDING' && payment?.method === 'COUNTER') ||
        (order.orderStatus === 'WAITING' && order.paymentStatus === 'SUCCESS')) && (
        <div className="p-6 rounded-2xl border border-border bg-surface/60 shadow-2xs space-y-3">
          <h2 className="text-sm font-bold text-foreground">Counter Actions</h2>

          {order.orderStatus === 'PENDING' && payment?.method === 'COUNTER' && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                Confirm only after receiving cash payment of{' '}
                <strong className="text-foreground">
                  ₹{Number(order.totalPrice || payment?.amount || 0).toFixed(2)}
                </strong>
                . This moves the order into the active print queue.
              </p>
              <button
                type="button"
                onClick={() => {
                  const amount = Number(order.totalPrice || payment?.amount || 0).toFixed(2);
                  if (window.confirm(`Confirm receipt of ₹${amount} for ${order.orderCode}?`)) {
                    confirmPaymentMutation.mutate();
                  }
                }}
                disabled={confirmPaymentMutation.isPending || dispatchMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {confirmPaymentMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CreditCard className="h-3.5 w-3.5" />
                )}
                {confirmPaymentMutation.isPending ? 'Confirming...' : 'Confirm Cash Received'}
              </button>
            </div>
          )}

          {order.orderStatus === 'WAITING' && order.paymentStatus === 'SUCCESS' && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                Send job immediately to the connected Windows printer.
              </p>
              <button
                type="button"
                onClick={() => dispatchMutation.mutate()}
                disabled={dispatchMutation.isPending || confirmPaymentMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {dispatchMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Printer className="h-3.5 w-3.5" />
                )}
                {dispatchMutation.isPending ? 'Dispatching...' : 'Send to Printer'}
              </button>
            </div>
          )}

          {actionError && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400 mt-2">
              {actionError}
            </p>
          )}
        </div>
      )}

      {/* Event Timeline */}
      {order.events && order.events.length > 0 && (
        <div className="p-6 rounded-2xl border border-border bg-surface/40 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">
            Event Timeline
          </h3>
          <div className="space-y-3">
            {order.events.map((event: any) => (
              <div key={event.id} className="flex items-center gap-3 text-xs">
                <span className="w-20 font-mono text-muted text-[11px] shrink-0">
                  {new Date(event.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                <span className="font-medium text-foreground">
                  {event.event.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
