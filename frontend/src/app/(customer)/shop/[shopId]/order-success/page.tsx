'use client';

import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight, Copy, Loader2, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { simulatePayment } from '@/services/order.service';

export default function OrderSuccessPage() {
  const params = useParams<{ shopId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderCode = searchParams.get('code') || 'VLX-XXXXXX';
  const cost = searchParams.get('cost') || '0';
  const pages = searchParams.get('pages') || '0';
  const orderId = searchParams.get('id');

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(orderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const simulatePaymentMutation = useMutation({
    mutationFn: () => simulatePayment(orderId!),
    onSuccess: () => {
      router.push(`/order/${orderId}`);
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-sm w-full text-center">
        <div className="mb-6">
          <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Order Submitted</h1>
          <p className="text-muted text-sm">Your print order has been received.</p>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-surface mb-6">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Order Code</p>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-3xl font-mono font-bold tracking-wider">{orderCode}</span>
            <button
              onClick={handleCopy}
              className="text-muted hover:text-foreground transition-colors"
              title="Copy code"
            >
              <Copy className="h-5 w-5" />
            </button>
          </div>
          {copied && <p className="text-xs text-success mb-3">Copied!</p>}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-muted">Pages</p>
              <p className="text-lg font-semibold">{pages}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Estimated Cost</p>
              <p className="text-lg font-semibold">₹{cost}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {orderId && (
            <>
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={() => simulatePaymentMutation.mutate()}
                  disabled={simulatePaymentMutation.isPending}
                  className="w-full bg-black text-white rounded-xl py-3.5 font-medium flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors disabled:opacity-50"
                >
                  {simulatePaymentMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      Simulate Payment (Dev)
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => router.push(`/order/${orderId}`)}
                className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl py-3.5 font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
              >
                Track Your Order
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        <a
          href={`/shop/${params.shopId}/queue`}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground underline underline-offset-4 transition-colors"
        >
          View Shop Queue
        </a>
      </div>
    </div>
  );
}
