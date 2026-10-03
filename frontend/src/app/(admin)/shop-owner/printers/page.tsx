'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  getMyShops,
  getShopPrinters,
  ShopData,
  ShopPrintersResponse,
} from '@/services/shop.service';
import { useAuthStore } from '@/store/auth';
import {
  Printer,
  Laptop,
  ArrowLeft,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock,
  Terminal,
  Copy,
  Check,
} from 'lucide-react';

export default function ShopOwnerPrintersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [copied, setCopied] = useState(false);

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
  const shopId = assignedShop?.id;

  const {
    data,
    isLoading: isPrintersLoading,
    isFetching,
    refetch,
  } = useQuery<ShopPrintersResponse>({
    queryKey: ['shopPrinters', shopId],
    queryFn: () => getShopPrinters(shopId!),
    refetchInterval: 8000,
    enabled: !!shopId,
  });

  const printers = data?.printers || [];
  const devices = data?.devices || [];

  const onlinePrinters = printers.filter((p) => p.status === 'ONLINE').length;
  const onlineDevices = devices.filter((d) => d.status === 'ONLINE').length;

  const configSnippet = `{
  "Velox": {
    "BackendBaseUrl": "https://api.velox.dev",
    "ShopId": "${shopId || 'shop_xxx'}",
    "PollingIntervalSeconds": 3,
    "PollBatchSize": 5
  }
}`;

  const copyConfig = () => {
    navigator.clipboard.writeText(configSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatHeartbeat = (dateString?: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const diffSeconds = Math.round((Date.now() - date.getTime()) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isShopsLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted">Loading printers...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/shop-owner"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shop Counter
          </Link>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-surface/80 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Printers & Edge Devices</h1>
          <p className="text-sm text-muted mt-1">
            Shop:{' '}
            <strong className="text-foreground">{assignedShop?.name || 'Assigned Store'}</strong> —
            Windows spooler printers auto-discovered by the Velox Agent.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-5 rounded-2xl border border-border bg-surface/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Printers
              </span>
              <Printer className="w-5 h-5 text-muted" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{printers.length}</span>
              <span className="text-xs text-green-600 font-medium">({onlinePrinters} active)</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-surface/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Edge Agents
              </span>
              <Laptop className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{devices.length}</span>
              <span className="text-xs text-blue-500 font-medium">({onlineDevices} online)</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-surface/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Connection Status
              </span>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-foreground">
                {onlineDevices > 0 ? 'Optimal (Live Polling)' : 'Agent Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Laptop className="w-4 h-4 text-muted" />
            Registered Windows Edge Agent Nodes
          </h2>

          <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
            {isPrintersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted" />
              </div>
            ) : devices.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <Laptop className="h-10 w-10 mx-auto text-muted/40 mb-3" />
                <p className="text-sm font-semibold">No Edge Agents Paired Yet</p>
                <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                  Follow the instructions below to connect the Velox Windows Agent from your counter
                  PC.
                </p>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-surface border-b border-border text-muted uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Device Name</th>
                    <th className="px-5 py-3">Device ID</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Last Heartbeat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {devices.map((device) => (
                    <tr key={device.deviceId} className="hover:bg-surface/50">
                      <td className="px-5 py-3.5 font-medium flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            device.status === 'ONLINE' ? 'bg-green-500' : 'bg-muted'
                          }`}
                        />
                        {device.name}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-muted">{device.deviceId}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
                            device.status === 'ONLINE'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                          }`}
                        >
                          {device.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {formatHeartbeat(device.lastHeartbeat)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Printer className="w-4 h-4 text-muted" />
            Discovered Local Printers
          </h2>

          <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
            {isPrintersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted" />
              </div>
            ) : printers.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <Printer className="h-10 w-10 mx-auto text-muted/40 mb-3" />
                <p className="text-sm font-semibold">No Printers Discovered</p>
                <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                  Printers will automatically appear here once the Velox Agent connects to this
                  shop.
                </p>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-surface border-b border-border text-muted uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Printer Name</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Speed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {printers.map((printer) => (
                    <tr key={printer.id} className="hover:bg-surface/50">
                      <td className="px-5 py-3.5 font-medium">{printer.name}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-surface border border-border font-mono">
                          {printer.printerType}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
                            printer.status === 'ONLINE'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                          }`}
                        >
                          {printer.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted">
                        {printer.pagesPerMinute > 0 ? `${printer.pagesPerMinute} PPM` : 'Standard'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="border border-border bg-surface/50 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              Windows Edge Agent Configuration
            </h3>
            <button
              onClick={copyConfig}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-surface transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? 'Copied!' : 'Copy Config'}
            </button>
          </div>

          <p className="text-xs text-muted mb-4 leading-relaxed">
            To connect physical or virtual printers at your counter, configure your agent's{' '}
            <code className="px-1.5 py-0.5 bg-background border border-border rounded font-mono text-[11px]">
              appsettings.json
            </code>{' '}
            file with your Shop ID:
          </p>

          <pre className="p-4 rounded-xl bg-background border border-border text-[11px] font-mono text-foreground overflow-x-auto">
            {configSnippet}
          </pre>

          <div className="mt-4 pt-4 border-t border-border/60 text-xs text-muted flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
            <span>
              Once launched, the agent will automatically discover local Windows Spooler printers,
              register them with this shop, and poll for print jobs.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
