'use client';

import { use, useState, useEffect } from 'react';
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
  X,
  Settings2,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import {
  getOrderStatus,
  cancelOrder,
  simulatePayment,
  OrderStatusData,
} from '@/services/order.service';

const steps = [
  { id: 'PENDING', label: 'Payment Pending', icon: CreditCard },
  { id: 'WAITING', label: 'Waiting in Queue', icon: Clock },
  { id: 'ASSIGNED', label: 'Assigned', icon: Settings2 },
  { id: 'PRINTING', label: 'Printing', icon: Printer },
  { id: 'COMPLETED', label: 'Ready for Pickup', icon: ShoppingBag },
  { id: 'COLLECTED', label: 'Collected', icon: CheckCircle2 },
];

function getStepIndex(status: string) {
  if (status === 'DOWNLOADING') return 3; // treat downloading same as printing in UI
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
      // Could redirect to shop or somewhere else, but for now we just refetch
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900">Order not found</h2>
          <p className="text-gray-500 mt-2">We couldn't load your order status.</p>
        </div>
      </div>
    );
  }

  const isCancelled = order.orderStatus === 'CANCELLED';
  const currentStep = getStepIndex(order.orderStatus);

  const formatWaitTime = (seconds: number) => {
    if (!seconds) return 'calculating...';
    const mins = Math.ceil(seconds / 60);
    return `${mins} min${mins !== 1 ? 's' : ''}`;
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-md mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Order Tracking</p>
            <h1 className="text-2xl font-semibold text-gray-900">{order.orderCode}</h1>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              isCancelled
                ? 'bg-red-100 text-red-700'
                : order.orderStatus === 'COMPLETED'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
            }`}
          >
            {order.orderStatus}
          </div>
        </div>

        {/* Stepper */}
        {!isCancelled && (
          <div className="relative pl-6">
            <div className="absolute top-0 bottom-0 left-9 w-0.5 bg-gray-100" />

            <div className="space-y-8 relative">
              {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                const isUpcoming = index > currentStep;

                const Icon = step.icon;

                return (
                  <div key={step.id} className="flex items-center gap-6">
                    <div className="relative z-10 flex-shrink-0">
                      <motion.div
                        initial={false}
                        animate={{
                          backgroundColor: isCompleted || isActive ? '#000' : '#fff',
                          borderColor: isUpcoming ? '#e5e7eb' : '#000',
                          color: isCompleted || isActive ? '#fff' : '#9ca3af',
                        }}
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center
                          ${isActive ? 'ring-4 ring-gray-100' : ''}
                        `}
                      >
                        <Icon className="w-3.5 h-3.5" />

                        {isActive && (
                          <motion.div
                            className="absolute -inset-2 rounded-full border-2 border-black opacity-20"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0, 0.2] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                      </motion.div>
                    </div>

                    <div className="flex-1">
                      <h3
                        className={`font-medium ${isActive || isCompleted ? 'text-gray-900' : 'text-gray-400'}`}
                      >
                        {step.label}
                      </h3>
                      {isActive && order.orderStatus === 'WAITING' && order.queuePosition > 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          You are #{order.queuePosition} in line
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100">
            <h3 className="font-medium mb-1">Order Cancelled</h3>
            <p className="text-sm opacity-90">
              This order has been cancelled and cannot be processed.
            </p>
          </div>
        )}

        {/* Queue Info Card */}
        {['WAITING', 'ASSIGNED'].includes(order.orderStatus) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-gray-200 rounded-2xl p-6 bg-gray-50/50"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-4">Queue Status</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-3xl font-semibold text-gray-900 mb-1">{order.peopleAhead}</p>
                <p className="text-sm text-gray-500">People ahead</p>
              </div>
              <div>
                <p className="text-3xl font-semibold text-gray-900 mb-1">
                  {order.estimatedWaitSeconds ? Math.ceil(order.estimatedWaitSeconds / 60) : '-'}
                  <span className="text-lg text-gray-500 font-normal ml-1">min</span>
                </p>
                <p className="text-sm text-gray-500">Estimated wait</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Print Settings */}
        <div className="border border-gray-200 rounded-2xl p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            Print Details
          </h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Pages</p>
              <p className="font-medium text-gray-900">{order.totalPages}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Copies</p>
              <p className="font-medium text-gray-900">{order.copies}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Color Mode</p>
              <p className="font-medium text-gray-900 capitalize">{order.color.toLowerCase()}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Sided</p>
              <p className="font-medium text-gray-900">
                {order.doubleSided ? 'Double Sided' : 'Single Sided'}
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
              className="w-full bg-black text-white rounded-xl py-3.5 font-medium flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              {simulatePaymentMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
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
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 bg-white border border-gray-200 rounded-xl p-2 flex items-center gap-2 z-20"
                  >
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="flex-1 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 rounded-lg"
                    >
                      Keep Order
                    </button>
                    <button
                      onClick={() => {
                        cancelMutation.mutate();
                        setShowCancelConfirm(false);
                      }}
                      className="flex-1 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      Confirm Cancel
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full bg-white border border-gray-200 text-gray-700 rounded-xl py-3.5 font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
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
