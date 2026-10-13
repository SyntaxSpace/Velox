'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getMyShops, getShopTransactions, ShopData } from '@/services/shop.service';
import StatusBadge from '@/components/ui/StatusBadge';
import { Loader2, CreditCard, Activity } from 'lucide-react';

export default function ShopOwnerTransactionsPage() {
  const [page, setPage] = useState(1);

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
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted">Loading transactions & revenue...</p>
      </div>
    );
  }

  const transactions = transactionsData?.transactions || [];
  const totalAmount = transactions
    .filter((tx: any) => tx.status === 'SUCCESS')
    .reduce((sum: number, tx: any) => sum + parseFloat(tx.amount || 0), 0);

  return (
    <div className="py-8 px-4 sm:px-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Transactions & Ledger
            </h1>
            <p className="text-xs text-muted mt-0.5">
              Payment records and revenue history for {assignedShop?.name || 'Store'}
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-surface/60 border border-border shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Total Settled Revenue (Page)
          </span>
          <div className="mt-3">
            <span className="text-3xl font-bold font-mono tracking-tight text-foreground">
              ₹{totalAmount.toFixed(2)}
            </span>
            <span className="text-[11px] text-muted block mt-0.5">
              From successful transactions
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface/60 border border-border shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Transaction Count
          </span>
          <div className="mt-3">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {transactions.length}
            </span>
            <span className="text-[11px] text-muted block mt-0.5">Recorded payments</span>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden shadow-2xs">
        {isTransactionsLoading ? (
          <div className="flex justify-center p-14">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface border-b border-border text-[11px] uppercase tracking-wider text-muted font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Transaction ID</th>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5">Order Code</th>
                  <th className="px-6 py-3.5">Method</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-surface/60 transition-colors">
                    <td className="px-6 py-4">
                      <span
                        className="font-mono text-muted text-[11px] truncate max-w-[120px] block"
                        title={tx.id}
                      >
                        {tx.id.substring(0, 12)}...
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {new Date(tx.createdAt).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-foreground">
                      {tx.order ? (
                        <Link
                          href={`/shop-owner/orders/${tx.orderId}`}
                          className="hover:text-primary transition-colors underline-offset-2 hover:underline"
                        >
                          {tx.order.orderCode}
                        </Link>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold uppercase text-muted">
                      {tx.method || 'COUNTER'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tx.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-foreground text-sm">
                      ₹{parseFloat(tx.amount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-14 text-center">
            <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-muted mb-3">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No transactions found</h3>
            <p className="text-xs text-muted mt-1 max-w-sm">
              Payments completed at your counter will be logged in this ledger automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
