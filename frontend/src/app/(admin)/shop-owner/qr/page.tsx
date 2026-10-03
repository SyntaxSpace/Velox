'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { getMyShops, ShopData } from '@/services/shop.service';
import { useAuthStore } from '@/store/auth';
import { Printer, Download, Copy, Check, ExternalLink, ArrowLeft, Loader2 } from 'lucide-react';

export default function ShopOwnerQrStandPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    const localToken = typeof window !== 'undefined' ? localStorage.getItem('velox_token') : null;
    if (!localToken && !isAuthenticated) {
      router.push('/shop-owner/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const {
    data: shops,
    isLoading,
    error,
  } = useQuery<ShopData[]>({
    queryKey: ['ownerShops'],
    queryFn: getMyShops,
  });

  const shop = shops && shops.length > 0 ? shops[0] : null;
  const publicSlug = shop?.publicShopId || shop?.id;
  const customerUrl = origin && publicSlug ? `${origin}/shop/${publicSlug}` : '';

  useEffect(() => {
    if (publicSlug && origin && customerUrl) {
      QRCode.toDataURL(
        customerUrl,
        {
          width: 600,
          margin: 2,
          color: {
            dark: '#09090b',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        },
        (err, url) => {
          if (!err && url) {
            setQrDataUrl(url);
          }
        },
      );
    }
  }, [publicSlug, origin, customerUrl]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `velox-qr-${publicSlug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(customerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted">Loading QR code...</p>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          Failed to load shop details.{' '}
          <Link href="/shop-owner" className="underline font-semibold">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 print:p-0 print:bg-white print:text-black">
      <style jsx global>{`
        @media print {
          @page {
            size: auto;
            margin: 15mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            box-shadow: none !important;
            border: 2px solid #000 !important;
            page-break-inside: avoid;
            margin: 0 auto;
          }
        }
      `}</style>

      <div className="max-w-3xl mx-auto">
        <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <Link
            href="/shop-owner"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shop Counter
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-border bg-surface hover:bg-surface/80 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? 'Copied' : 'Copy Link'}
            </button>

            <button
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-border bg-surface hover:bg-surface/80 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Download PNG
            </button>

            <Link
              href={`/shop/${publicSlug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-border bg-surface hover:bg-surface/80 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Test Customer Flow
            </Link>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 shadow-sm transition-opacity"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Stand Card
            </button>
          </div>
        </div>

        <div className="print-card bg-white text-zinc-950 border border-zinc-200 rounded-3xl p-8 sm:p-12 shadow-xl max-w-lg mx-auto flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-black text-sm tracking-tighter">
              V
            </div>
            <span className="text-sm font-black tracking-widest uppercase text-zinc-950">
              VELOX PRINT
            </span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-1">
            Scan to Print
          </h2>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-6">
            No App Required • No Account Needed
          </p>

          <div className="p-4 bg-white border-2 border-zinc-900 rounded-2xl shadow-sm mb-6 inline-block">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Velox Counter QR Code"
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain mx-auto"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
              </div>
            )}
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-bold text-zinc-900">{shop.name}</h3>
            {shop.address && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {shop.address}
                {shop.city ? `, ${shop.city}` : ''}
              </p>
            )}
          </div>

          <div className="w-full grid grid-cols-3 gap-3 border-t border-zinc-200 pt-6">
            <div className="flex flex-col items-center">
              <div className="h-7 w-7 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-800 mb-1.5">
                1
              </div>
              <span className="text-[11px] font-semibold text-zinc-800 leading-tight">Scan QR</span>
              <span className="text-[10px] text-zinc-500 leading-tight">Phone camera</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="h-7 w-7 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-800 mb-1.5">
                2
              </div>
              <span className="text-[11px] font-semibold text-zinc-800 leading-tight">Upload</span>
              <span className="text-[10px] text-zinc-500 leading-tight">Pick PDF & pages</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="h-7 w-7 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-800 mb-1.5">
                3
              </div>
              <span className="text-[11px] font-semibold text-zinc-800 leading-tight">Collect</span>
              <span className="text-[10px] text-zinc-500 leading-tight">Instant counter print</span>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-dashed border-zinc-200 w-full text-center">
            <p className="text-[11px] font-mono text-zinc-400 select-all">{customerUrl}</p>
          </div>
        </div>

        <div className="no-print mt-8 p-4 rounded-2xl border border-border bg-surface/40 text-xs text-muted max-w-lg mx-auto text-center">
          <p>
            Place this printed card on your counter or near the shop entrance. Customers can point
            their camera to upload documents and pay directly without creating an account.
          </p>
        </div>
      </div>
    </div>
  );
}
