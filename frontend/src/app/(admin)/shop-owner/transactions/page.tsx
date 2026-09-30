'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getMyShops, getShopTransactions, ShopData } from '@/services/shop.service';
import { useAuthStore } from '@/store/auth';
import { ArrowLeft, Loader2, DollarSign, Activity } from 'lucide-react';

export default function ShopOwnerTransactionsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [page, setPage] = useState(1);

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

  const { data: transactionsData, isLoading: isTransactionsLoading } = useQuery({
    queryKey: ['shopTransactions', assignedShop?.id, page],
    queryFn: () => getShopTransactions(assignedShop!.id, { page, limit: 50 }),
    enabled: !!assignedShop?.id,
  });

  if (isShopsLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted">Loading transactions...</p>
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
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Transactions & Revenue</h1>
            <p className="text-xs text-muted mt-0.5">
              View payment records for completed print orders.
            </p>
          </div>
        </div>

        <div className="bg-surface/30 border border-border rounded-2xl overflow-hidden shadow-sm">
          {isTransactionsLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted" />
            </div>
          ) : transactionsData?.transactions && transactionsData.transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface/50 border-b border-border text-xs uppercase text-muted font-semibold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Transaction ID</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Order Code</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {transactionsData.transactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-6 py-4">
                        <span
                          className="font-mono text-xs text-muted truncate max-w-[120px] block"
                          title={tx.id}
                        >
                          {tx.id.substring(0, 12)}...
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted text-xs">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {tx.order ? (
                          <Link
                            href={`/shop-owner/orders/${tx.orderId}`}
                            className="font-mono font-medium hover:text-primary transition-colors"
                          >
                            {tx.order.orderCode}
                          </Link>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium uppercase">
                        {tx.method || 'UNKNOWN'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            tx.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                              : tx.status === 'FAILED'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-foreground">
                        ₹{parseFloat(tx.amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Activity className="h-12 w-12 text-muted mb-4 opacity-50" />
              <h3 className="text-lg font-bold">No transactions found.</h3>
              <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
                Once customer payments are processed, they will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
