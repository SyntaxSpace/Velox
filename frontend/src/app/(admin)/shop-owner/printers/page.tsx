'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getMyShops,
  getShopPrinters,
  ShopData,
  ShopPrintersResponse,
  generatePairingCode,
  PairingCodeResponse,
} from '@/services/shop.service';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Printer,
  Laptop,
  Loader2,
  RefreshCw,
  Clock,
  Copy,
  Check,
  Key,
  ShieldCheck,
  Radio,
} from 'lucide-react';

export default function ShopOwnerPrintersPage() {
  const [pairingCodeData, setPairingCodeData] = useState<PairingCodeResponse | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

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

  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const formatHeartbeat = (dateString?: string | null) => {
    if (!dateString) return 'Never';
    if (!now) return 'Recently';
    const date = new Date(dateString);
    const diffSeconds = Math.round((now - date.getTime()) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleGenerateCode = async () => {
    if (!shopId) return;
    setIsGeneratingCode(true);
    setCodeError(null);
    try {
      const result = await generatePairingCode(shopId);
      setPairingCodeData(result);
    } catch (err: any) {
      setCodeError(err?.response?.data?.message || 'Failed to generate pairing code');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  if (isShopsLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted">Loading printers & edge hardware...</p>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-neutral-500/10 text-foreground flex items-center justify-center shrink-0">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Hardware & Printers
            </h1>
            <p className="text-xs text-muted mt-0.5">
              Windows spooler print devices connected to {assignedShop?.name || 'Store'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateCode}
            disabled={isGeneratingCode || !shopId}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-2xs disabled:opacity-50"
          >
            {isGeneratingCode ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Key className="w-3.5 h-3.5" />
            )}
            Pair New PC
          </button>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-border bg-surface hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shadow-2xs disabled:opacity-50 text-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-surface/60 border border-border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-[11px] font-semibold uppercase tracking-wider">
            <span>Discovered Printers</span>
            <Printer className="h-4 w-4" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {printers.length}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              ({onlinePrinters} active)
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface/60 border border-border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-[11px] font-semibold uppercase tracking-wider">
            <span>Windows Agents</span>
            <Laptop className="h-4 w-4" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {devices.length}
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
              ({onlineDevices} online)
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface/60 border border-border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-[11px] font-semibold uppercase tracking-wider">
            <span>Spooler Health</span>
            <Radio className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <StatusBadge
              status={onlineDevices > 0 ? 'ONLINE' : 'OFFLINE'}
              label={onlineDevices > 0 ? 'Live Spooling Active' : 'Agent Offline'}
              size="md"
            />
          </div>
        </div>
      </div>

      {/* Pairing Code Modal / Card */}
      {pairingCodeData && (
        <div className="p-6 rounded-2xl border border-primary/30 bg-surface/80 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold text-foreground">One-Time Agent Pairing Code</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-medium">
                Valid for 15 minutes
              </span>
            </div>
            <button
              onClick={() => setPairingCodeData(null)}
              className="text-xs text-muted hover:text-foreground font-semibold"
            >
              Dismiss
            </button>
          </div>

          <p className="text-xs text-muted">
            Enter this 6-digit code in the <strong>Velox Agent</strong> window on your Windows PC to
            securely bind it to <strong className="text-foreground">{assignedShop?.name}</strong>:
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {pairingCodeData.pairingCode.split('').map((digit, i) => (
                <div
                  key={i}
                  className="w-11 h-14 rounded-xl border border-border bg-background flex items-center justify-center text-2xl font-bold font-mono tracking-wider text-foreground shadow-2xs"
                >
                  {digit}
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(pairingCodeData.pairingCode);
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              {codeCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {codeCopied ? 'Copied' : 'Copy Code'}
            </button>
          </div>

          <div className="pt-3 border-t border-border/60 text-xs text-muted flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Expires at{' '}
              {new Date(pairingCodeData.expiresAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      )}

      {codeError && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-700 dark:text-red-400 flex items-center justify-between">
          <span>{codeError}</span>
          <button onClick={() => setCodeError(null)} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Registered Windows Agent Nodes Table */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
          <Laptop className="w-3.5 h-3.5" />
          Registered Windows Agent Nodes
        </h2>

        <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden shadow-2xs">
          {isPrintersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted" />
            </div>
          ) : devices.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <Laptop className="h-8 w-8 mx-auto text-muted mb-2 opacity-50" />
              <p className="text-xs font-bold text-foreground">No Windows Agents Paired</p>
              <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                Generate a pairing code above to link your counter PC.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-surface border-b border-border text-[11px] uppercase tracking-wider text-muted font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Device Name</th>
                  <th className="px-6 py-3.5">Device ID</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Last Heartbeat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {devices.map((device) => (
                  <tr key={device.deviceId} className="hover:bg-surface/60 transition-colors">
                    <td className="px-6 py-4 font-semibold text-foreground flex items-center gap-2">
                      <Laptop className="h-3.5 w-3.5 text-muted" />
                      {device.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-muted">{device.deviceId}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={device.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-muted flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {formatHeartbeat(device.lastHeartbeat)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Discovered Printers Table */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
          <Printer className="w-3.5 h-3.5" />
          Discovered Local Printers
        </h2>

        <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden shadow-2xs">
          {isPrintersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted" />
            </div>
          ) : printers.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <Printer className="h-8 w-8 mx-auto text-muted mb-2 opacity-50" />
              <p className="text-xs font-bold text-foreground">No Printers Discovered</p>
              <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                Printers installed on your Windows PC will automatically sync here once the agent
                connects.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-surface border-b border-border text-[11px] uppercase tracking-wider text-muted font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Printer Name</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Speed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {printers.map((printer) => (
                  <tr key={printer.id} className="hover:bg-surface/60 transition-colors">
                    <td className="px-6 py-4 font-semibold text-foreground flex items-center gap-2">
                      <Printer className="h-3.5 w-3.5 text-muted" />
                      {printer.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-md bg-neutral-200/60 dark:bg-neutral-800 text-[11px] font-mono font-medium">
                        {printer.printerType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={printer.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {printer.pagesPerMinute > 0 ? `${printer.pagesPerMinute} PPM` : 'Standard'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pairing Setup Guide */}
      <div className="p-6 rounded-2xl border border-border bg-surface/50 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Zero-Configuration Pairing Guide
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-border bg-background">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              Step 1
            </span>
            <p className="text-xs font-bold text-foreground">Launch Velox Agent</p>
            <p className="text-[11px] text-muted mt-1">
              Open the Velox Agent app on your Windows PC. It displays a 6-digit code prompt.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-background">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              Step 2
            </span>
            <p className="text-xs font-bold text-foreground">Click Generate Code</p>
            <p className="text-[11px] text-muted mt-1">
              Generate a secure 15-minute pairing code for this store using the button above.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-background">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              Step 3
            </span>
            <p className="text-xs font-bold text-foreground">Enter Code & Connect</p>
            <p className="text-[11px] text-muted mt-1">
              Type the code into the desktop app. It will securely bind to this shop and sync
              printers automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
