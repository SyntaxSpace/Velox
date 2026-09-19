'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getShopPrinters, updatePrinterStatus, ShopPrintersData } from '@/services/admin.service';
import {
  Printer,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Signal,
  Clock,
  RefreshCw,
  Power,
  Pause,
  Play,
} from 'lucide-react';

export default function AdminPrintersPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery<ShopPrintersData>({
    queryKey: ['admin', 'printers'],
    queryFn: getShopPrinters,
    refetchInterval: 10000,
  });

  const togglePrinterMutation = useMutation({
    mutationFn: ({ printerId, status }: { printerId: string; status: string }) =>
      updatePrinterStatus(printerId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'printers'] });
    },
  });

  const printers = data?.printers ?? [];
  const devices = data?.devices ?? [];

  const onlinePrinters = printers.filter((p) => p.status === 'ONLINE').length;
  const onlineDevices = devices.filter((d) => d.status === 'ONLINE').length;

  const printerStatusBadge = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'BUSY':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ERROR':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'OFFLINE':
      default:
        return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    }
  };

  const deviceStatusBadge = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ERROR':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'OFFLINE':
      default:
        return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    }
  };

  const formatHeartbeat = (dateString?: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const diffSeconds = Math.round((Date.now() - date.getTime()) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Printers & Edge Devices
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage local Windows Agent nodes and synchronized spooler printers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-xl border border-zinc-200 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Connected Printers
            </span>
            <Printer className="w-5 h-5 text-zinc-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-zinc-900">{printers.length}</span>
            <span className="text-xs text-emerald-600 font-medium">({onlinePrinters} online)</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-zinc-200 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Edge Agents
            </span>
            <Laptop className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-zinc-900">{devices.length}</span>
            <span className="text-xs text-blue-600 font-medium">({onlineDevices} active)</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-zinc-200 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Heartbeat Health
            </span>
            <Signal className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-zinc-800">
              {onlineDevices > 0 ? 'Optimal (30s cadence)' : 'No active agent'}
            </span>
          </div>
        </div>
      </div>

      {/* Edge Devices Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
            <Laptop className="w-4 h-4 text-zinc-600" />
            Registered Windows Edge Devices
          </h2>
          <span className="text-xs text-zinc-500">Auto-synced via JWT & WebSocket</span>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400 px-4 text-center">
              <Laptop className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium text-zinc-700">No Edge Devices Paired</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Start the Velox Windows Agent on your counter PC with your shop credentials to
                automatically bind your hardware.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50/50 text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
                  <tr>
                    <th className="px-5 py-3">Device Name</th>
                    <th className="px-5 py-3">Device ID</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Last Heartbeat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {devices.map((device) => (
                    <tr key={device.deviceId} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-zinc-900 flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            device.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-zinc-300'
                          }`}
                        />
                        {device.name}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-zinc-600">
                        {device.deviceId}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${deviceStatusBadge(
                            device.status,
                          )}`}
                        >
                          {device.status === 'ONLINE' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {device.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-zinc-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        {formatHeartbeat(device.lastHeartbeat)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Discovered Printers Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
            <Printer className="w-4 h-4 text-zinc-600" />
            Discovered Local Printers
          </h2>
          <span className="text-xs text-zinc-500">Auto-discovered from Windows Spooler</span>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : printers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400 px-4 text-center">
              <Printer className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium text-zinc-700">No Printers Discovered</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Ensure local printers are installed and online in Windows Control Panel, then launch
                the agent.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50/50 text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
                  <tr>
                    <th className="px-5 py-3">Printer Name</th>
                    <th className="px-5 py-3">Capability Type</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Print Speed</th>
                    <th className="px-5 py-3">Address / Driver</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {printers.map((printer) => {
                    const isOnline = printer.status === 'ONLINE';
                    const isToggling =
                      togglePrinterMutation.isPending &&
                      togglePrinterMutation.variables?.printerId === printer.id;

                    return (
                      <tr key={printer.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-zinc-900">{printer.name}</td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded bg-zinc-100 text-zinc-700">
                            {printer.printerType}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${printerStatusBadge(
                              printer.status,
                            )}`}
                          >
                            {printer.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-zinc-600">
                          {printer.pagesPerMinute > 0
                            ? `${printer.pagesPerMinute} PPM`
                            : 'Standard'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-zinc-500 font-mono">
                          {printer.ipAddress || 'WinSpool / Local'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() =>
                              togglePrinterMutation.mutate({
                                printerId: printer.id,
                                status: isOnline ? 'OFFLINE' : 'ONLINE',
                              })
                            }
                            disabled={isToggling}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 ${
                              isOnline
                                ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                                : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isOnline ? (
                              <>
                                <Pause className="w-3 h-3" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3" />
                                Resume
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
