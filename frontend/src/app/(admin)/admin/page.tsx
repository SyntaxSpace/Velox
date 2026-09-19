'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDashboardStats,
  getTodayOrders,
  getQueueOrders,
  updateOrderStatus,
  DashboardStats,
  AdminOrder,
  ShopQueueData,
} from '@/services/admin.service';
import {
  Package,
  Clock,
  IndianRupee,
  CheckCircle,
  Loader2,
  FileText,
  ArrowRight,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['admin', 'stats'],
    queryFn: getDashboardStats,
    refetchInterval: 15000,
  });

  const { data: queueData, isLoading: queueLoading } = useQuery<ShopQueueData>({
    queryKey: ['admin', 'queue'],
    queryFn: getQueueOrders,
    refetchInterval: 10000,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<AdminOrder[]>({
    queryKey: ['admin', 'orders', 'today'],
    queryFn: getTodayOrders,
    refetchInterval: 15000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders', 'today'] });
    },
  });

  const statCards = [
    {
      label: "Today's Orders",
      value: stats?.todayOrders ?? '—',
      icon: Package,
      color: 'text-foreground',
    },
    { label: 'Active Orders', value: stats?.activeOrders ?? '—', icon: Clock, color: 'text-info' },
    {
      label: "Today's Revenue",
      value: stats ? `₹${stats.totalRevenue}` : '—',
      icon: IndianRupee,
      color: 'text-success',
    },
    {
      label: 'Completed',
      value: stats?.completedToday ?? '—',
      icon: CheckCircle,
      color: 'text-success',
    },
  ];

  const statusColor = (status: string): string => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-50 text-yellow-700';
      case 'WAITING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800';
      case 'DOWNLOADING':
        return 'bg-purple-50 text-purple-700';
      case 'PRINTING':
        return 'bg-purple-100 text-purple-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'COLLECTED':
        return 'bg-gray-100 text-gray-700';
      case 'CANCELLED':
        return 'bg-red-50 text-red-700';
      case 'FAILED':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRelativeTime = (dateString: string) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diffInSeconds = (new Date(dateString).getTime() - new Date().getTime()) / 1000;

    if (Math.abs(diffInSeconds) < 60) {
      return rtf.format(Math.round(diffInSeconds), 'second');
    }
    const diffInMinutes = diffInSeconds / 60;
    if (Math.abs(diffInMinutes) < 60) {
      return rtf.format(Math.round(diffInMinutes), 'minute');
    }
    const diffInHours = diffInMinutes / 60;
    if (Math.abs(diffInHours) < 24) {
      return rtf.format(Math.round(diffInHours), 'hour');
    }
    return rtf.format(Math.round(diffInHours / 24), 'day');
  };

  const renderTransitionButton = (orderId: string, currentStatus: string) => {
    const transitions: Record<string, { label: string; nextStatus: string }> = {
      WAITING: { label: 'Assign', nextStatus: 'ASSIGNED' },
      ASSIGNED: { label: 'Download', nextStatus: 'DOWNLOADING' },
      DOWNLOADING: { label: 'Print', nextStatus: 'PRINTING' },
      PRINTING: { label: 'Complete', nextStatus: 'COMPLETED' },
      COMPLETED: { label: 'Collect', nextStatus: 'COLLECTED' },
    };

    const transition = transitions[currentStatus];
    if (!transition) return <span className="text-muted text-xs">—</span>;

    const isPending = statusMutation.isPending && statusMutation.variables?.orderId === orderId;

    return (
      <button
        onClick={() => statusMutation.mutate({ orderId, status: transition.nextStatus })}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : transition.label}
        <ArrowRight className="w-3 h-3" />
      </button>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted text-sm mt-1">Overview of today&apos;s activity.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="p-5 rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted uppercase tracking-wider">{card.label}</span>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <p className="text-2xl font-semibold">
              {statsLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted" /> : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Active Queue Panel */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-medium">Active Queue</h2>
          {queueData && (
            <span className="text-xs text-muted">Total in queue: {queueData.totalInQueue}</span>
          )}
        </div>

        {queueLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : !queueData || queueData.orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted">
            <Clock className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm">No active orders in queue.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                  <th className="px-5 py-3">Code / Pos</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Details</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {queueData.orders.map((order) => (
                  <tr key={order.id} className="hover:bg-background/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-mono font-medium">{order.orderCode}</div>
                      <div className="text-xs text-muted mt-0.5">
                        #{order.queuePosition} in line
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div>{order.user.name}</div>
                      <div className="text-xs text-muted mt-0.5 truncate max-w-[150px]">
                        {order.user.email}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        {order.totalPages} pages, {order.copies} copies
                      </div>
                      <div className="text-xs text-muted mt-0.5 capitalize">
                        {order.color.toLowerCase()} • {order.doubleSided ? 'Double' : 'Single'} •{' '}
                        {order.paperSize}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(order.orderStatus)}`}
                      >
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-muted">{getRelativeTime(order.createdAt)}</div>
                      <div className="text-xs text-muted mt-0.5">
                        ETA: {Math.ceil(order.estimatedWaitSeconds / 60)}m
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {renderTransitionButton(order.id, order.orderStatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Today's Orders Table */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-medium">Recent Orders</h2>
        </div>

        {ordersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted">
            <FileText className="h-10 w-10 mb-3" />
            <p className="text-sm">No orders today.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">File</th>
                  <th className="px-5 py-3">Pages</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-background/50 transition-colors">
                    <td className="px-5 py-3 font-mono font-medium">{order.orderCode}</td>
                    <td className="px-5 py-3">{order.user.name}</td>
                    <td className="px-5 py-3 text-muted truncate max-w-[150px]">
                      {order.files[0]?.filename || '—'}
                    </td>
                    <td className="px-5 py-3">{order.totalPages}</td>
                    <td className="px-5 py-3">₹{order.totalPrice}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(order.orderStatus)}`}
                      >
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
