'use client';

import { use, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  Printer,
  ShoppingBag,
  Settings2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { getOrderStatus, cancelOrder, simulatePayment } from '@/services/order.service';
import StatusBadge from '@/components/ui/StatusBadge';
import VeloxLogo from '@/components/shared/VeloxLogo';

const steps = [
  { id: 'PENDING', label: 'Payment Pending', icon: CreditCard },
  { id: 'WAITING', label: 'Waiting in Queue', icon: Clock },
  { id: 'ASSIGNED', label: 'Assigned to Spooler', icon: Settings2 },
  { id: 'PRINTING', label: 'Printing on Machine', icon: Printer },
  { id: 'COMPLETED', label: 'Ready for Counter Pickup', icon: ShoppingBag },
  { id: 'COLLECTED', label: 'Collected', icon: CheckCircle2 },
];

function getStepIndex(status: string) {
  if (status === 'DOWNLOADING') return 3;
  return steps.findIndex((s) => s.id === status) !== -1
    ? steps.findIndex((s) => s.id === status)
    : 0;
}

export default function OrderStatusPage({ params }: { params: Promise<{ orderId: string }> }) {
  const router = useRouter();
  const { orderId } = use(params);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order-status', orderId],
    queryFn: () => getOrderStatus(orderId),
    refetchInterval: 10000,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(orderId),
    onSuccess: () => {
      refetch();
    },
  });

  const simulatePaymentMutation = useMutation({
    mutationFn: () => simulatePayment(orderId),
    onSuccess: () => {
      refetch();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-xs text-muted">Tracking order live...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-foreground">Order Not Found</h2>
          <p className="text-xs text-muted">We could not load this order tracking status.</p>
          <button
            onClick={() => router.push('/')}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-primary text-primary-foreground"
          >
            Go to Velox Home
          </button>
        </div>
      </div>
    );
  }

  const isCancelled = order.orderStatus === 'CANCELLED';
  const currentStep = getStepIndex(order.orderStatus);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 font-sans">
      {/* Top Header */}
      <header className="border-b border-border/80 bg-background/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <VeloxLogo className="h-6 w-auto" />
          <StatusBadge status={order.orderStatus} size="sm" />
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 sm:p-6 space-y-6">
        {/* Order Identifier Header */}
        <div className="p-5 rounded-2xl bg-surface/50 border border-border shadow-2xs space-y-1">
          <span className="text-[10px] font-mono tracking-widest text-muted uppercase block">
            Live Print Tracker
          </span>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {order.orderCode}
            </h1>
            <span className="text-xs font-semibold text-muted font-mono">
              ₹{parseFloat(order.totalPrice || '0').toFixed(2)}
            </span>
          </div>
        </div>

        {/* Apple-style Step Timeline */}
        {!isCancelled && (
          <div className="p-5 sm:p-6 rounded-2xl bg-surface/50 border border-border shadow-2xs space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
              Print Progress
            </h2>

            <div className="relative pl-2">
              <div className="absolute top-3 bottom-3 left-5 w-0.5 bg-border/80" />

              <div className="space-y-6 relative">
                {steps.map((step, index) => {
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;
                  const isUpcoming = index > currentStep;
                  const Icon = step.icon;

                  return (
                    <div key={step.id} className="flex items-start gap-4">
                      <div className="relative z-10 shrink-0 mt-0.5">
                        <div
                          className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                            isCompleted || isActive
                              ? 'bg-primary border-primary text-primary-foreground shadow-2xs'
                              : 'bg-background border-border text-muted'
                          } ${isActive ? 'ring-4 ring-primary/10' : ''}`}
                        >
                          <Icon className="w-3 h-3" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3
                          className={`text-xs font-bold ${
                            isActive
                              ? 'text-foreground'
                              : isCompleted
                                ? 'text-muted'
                                : 'text-muted/60'
                          }`}
                        >
                          {step.label}
                        </h3>
                        {isActive && order.orderStatus === 'WAITING' && order.queuePosition > 0 && (
                          <p className="text-[11px] text-muted mt-0.5">
                            Position #{order.queuePosition} in shop queue
                          </p>
                        )}
                        {isActive && order.orderStatus === 'COMPLETED' && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                            Ready! Provide code {order.orderCode} at the counter.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 space-y-1">
            <h3 className="text-xs font-bold">Order Cancelled</h3>
            <p className="text-xs">This print order has been cancelled.</p>
          </div>
        )}

        {/* Queue Live Metrics Card */}
        {['WAITING', 'ASSIGNED'].includes(order.orderStatus) && (
          <div className="p-5 rounded-2xl bg-surface/50 border border-border shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-3">
              Queue Estimate
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
                  {order.peopleAhead ?? 0}
                </p>
                <p className="text-xs text-muted mt-0.5">People ahead</p>
              </div>
              <div>
                <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
                  {order.estimatedWaitSeconds ? Math.ceil(order.estimatedWaitSeconds / 60) : 1}
                  <span className="text-xs text-muted font-normal ml-1">mins</span>
                </p>
                <p className="text-xs text-muted mt-0.5">Estimated wait</p>
              </div>
            </div>
          </div>
        )}

        {/* Print Specifications */}
        <div className="p-5 rounded-2xl bg-surface/50 border border-border shadow-2xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Print Specifications
          </h3>

          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
            <div>
              <span className="text-[10px] text-muted block">Total Pages</span>
              <p className="font-bold text-foreground mt-0.5">{order.totalPages}</p>
            </div>
            <div>
              <span className="text-[10px] text-muted block">Copies</span>
              <p className="font-bold text-foreground mt-0.5">{order.copies}</p>
            </div>
            <div>
              <span className="text-[10px] text-muted block">Color Mode</span>
              <p className="font-bold text-foreground uppercase mt-0.5">{order.color}</p>
            </div>
            <div>
              <span className="text-[10px] text-muted block">Sides</span>
              <p className="font-bold text-foreground mt-0.5">
                {order.doubleSided ? 'Duplex' : 'Simplex'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {process.env.NODE_ENV === 'development' && order.orderStatus === 'PENDING' && (
            <button
              onClick={() => simulatePaymentMutation.mutate()}
              disabled={simulatePaymentMutation.isPending}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {simulatePaymentMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Simulate Payment (Dev)'
              )}
            </button>
          )}

          {['PENDING', 'WAITING'].includes(order.orderStatus) && !isCancelled && (
            <div className="relative">
              <AnimatePresence>
                {showCancelConfirm ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="absolute inset-0 bg-surface border border-border rounded-xl p-2 flex items-center gap-2 z-20 shadow-lg"
                  >
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="flex-1 py-2 text-xs font-semibold text-muted hover:text-foreground bg-background rounded-lg border border-border"
                    >
                      Keep Order
                    </button>
                    <button
                      onClick={() => {
                        cancelMutation.mutate();
                        setShowCancelConfirm(false);
                      }}
                      className="flex-1 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      Confirm Cancel
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full bg-surface border border-border text-muted hover:text-foreground rounded-xl py-3 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel Order
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
