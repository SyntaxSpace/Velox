'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  Printer,
  Download,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Loader2,
  Sparkles,
} from 'lucide-react';

export interface QrStandShop {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  publicShopId?: string | null;
}

interface QrStandPosterProps {
  shop: QrStandShop;
  backHref: string;
  backLabel: string;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated ? truncated + '...' : text;
}

export default function QrStandPoster({ shop, backHref, backLabel }: QrStandPosterProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const publicSlug = shop.publicShopId || shop.id;
  const customerUrl = origin ? `${origin}/shop/${publicSlug}` : `/shop/${publicSlug}`;
  const locationText = [shop.address, shop.city].filter(Boolean).join(', ');

  useEffect(() => {
    if (publicSlug && customerUrl) {
      QRCode.toDataURL(
        customerUrl,
        {
          width: 800,
          margin: 1,
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
  }, [publicSlug, customerUrl]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQrOnly = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `velox-qr-${publicSlug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadFullPoster = async () => {
    if (!qrDataUrl) return;
    try {
      setIsGeneratingPoster(true);

      const canvas = document.createElement('canvas');
      canvas.width = 1055;
      canvas.height = 1491;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // 1. Draw template background
      const templateImg = new Image();
      templateImg.crossOrigin = 'anonymous';
      templateImg.src = '/qr-stand-template.png';
      await new Promise<void>((resolve, reject) => {
        templateImg.onload = () => resolve();
        templateImg.onerror = () => reject(new Error('Failed to load template image'));
      });
      ctx.drawImage(templateImg, 0, 0, 1055, 1491);

      // 2. Draw shop title & location in the blank space
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Shop Name (y = 445)
      ctx.font =
        'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      ctx.fillStyle = '#09090b';
      const cleanShopName = truncateText(ctx, shop.name || 'Velox Print Point', 720);
      ctx.fillText(cleanShopName, 527.5, 442);

      // Shop Subtitle / Location (y = 485)
      if (locationText) {
        ctx.font =
          '500 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        ctx.fillStyle = '#64748b';
        const cleanLocation = truncateText(ctx, locationText, 720);
        ctx.fillText(cleanLocation, 527.5, 485);
      }

      // 3. Draw QR Code Card
      const cardW = 472;
      const cardH = 472;
      const cardX = (1055 - cardW) / 2; // 291.5
      const cardY = locationText ? 525 : 505;
      const cardRadius = 28;

      ctx.save();
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#e4e4e7';
      ctx.stroke();
      ctx.clip();

      // Draw QR image
      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => reject(new Error('Failed to load QR code image'));
      });

      const qrSize = 440;
      const qrX = cardX + (cardW - qrSize) / 2;
      const qrY = cardY + (cardH - qrSize) / 2;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      ctx.restore();

      // Export canvas
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `velox-stand-${publicSlug}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsGeneratingPoster(false);
      }, 'image/png');
    } catch (err) {
      console.error('Error generating stand poster:', err);
      setIsGeneratingPoster(false);
      // Fallback to QR only if canvas composite fails
      handleDownloadQrOnly();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(customerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 print:p-0 print:bg-white print:text-black">
      {/* High-Fidelity Print Style */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html,
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .print-stand-wrapper {
            width: 100vw !important;
            height: 100vh !important;
            max-width: 100vw !important;
            max-height: 100vh !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-stand-poster {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            max-width: 210mm !important;
            max-height: 297mm !important;
            aspect-ratio: 1055 / 1491 !important;
            page-break-inside: avoid !important;
            margin: 0 auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto">
        {/* Navigation & Controls Bar (Hidden during Print) */}
        <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            {backLabel}
          </Link>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-border bg-surface hover:bg-surface/80 transition-colors"
              title="Copy customer link"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? 'Copied' : 'Copy Link'}
            </button>

            <Link
              href={`/shop/${publicSlug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-border bg-surface hover:bg-surface/80 transition-colors"
              title="Open customer portal in a new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Test Flow
            </Link>

            <button
              onClick={handleDownloadQrOnly}
              disabled={!qrDataUrl}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-border bg-surface hover:bg-surface/80 transition-colors disabled:opacity-50"
              title="Download standalone QR code image"
            >
              <QrCode className="w-3.5 h-3.5" />
              QR Only
            </button>

            <button
              onClick={handleDownloadFullPoster}
              disabled={!qrDataUrl || isGeneratingPoster}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-border bg-surface hover:bg-surface/80 shadow-sm transition-all disabled:opacity-50"
              title="Download high-resolution print-ready stand poster"
            >
              {isGeneratingPoster ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {isGeneratingPoster ? 'Generating...' : 'Download Poster (PNG)'}
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 shadow-sm transition-opacity ml-auto sm:ml-0"
              title="Print directly to connected printer or save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Poster
            </button>
          </div>
        </div>

        {/* Poster Wrapper for Screen & Print */}
        <div className="print-stand-wrapper flex flex-col items-center justify-center">
          {/* Branded Stand Poster Card */}
          <div
            ref={posterRef}
            className="print-stand-poster relative aspect-[1055/1491] w-full max-w-[460px] mx-auto rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-2xl shadow-zinc-950/10 border border-zinc-200/80 bg-white select-none transition-transform"
          >
            {/* Background Template Image */}
            <img
              src="/qr-stand-template.png"
              alt="Velox Counter Stand Poster"
              className="w-full h-full object-cover pointer-events-none select-none block"
            />

            {/* Dynamic Content in Blank Zone (Between Velox Logo and Scan to Print) */}
            <div className="absolute inset-x-0 top-[26.2%] h-[43.5%] flex flex-col items-center justify-center px-6 text-center pointer-events-auto">
              {/* Shop Header Details */}
              <div className="flex flex-col items-center justify-center mb-2 sm:mb-3 px-2 max-w-[90%]">
                <h3 className="font-extrabold text-zinc-950 text-base sm:text-lg md:text-xl tracking-tight leading-tight line-clamp-1">
                  {shop.name}
                </h3>
                {locationText && (
                  <p className="text-[10px] sm:text-xs text-zinc-500 font-medium tracking-normal line-clamp-1 mt-0.5">
                    {locationText}
                  </p>
                )}
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-2.5 sm:p-3 md:p-3.5 rounded-2xl sm:rounded-3xl border border-zinc-200/90 shadow-md flex items-center justify-center transition-transform hover:scale-[1.02]">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`${shop.name} QR Code`}
                    className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 object-contain"
                  />
                ) : (
                  <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info & Counter Recommendation (Hidden during Print) */}
        <div className="no-print mt-8 space-y-4 max-w-lg mx-auto">
          {/* Quick Direct Link Card */}
          <div className="p-3.5 rounded-2xl border border-border bg-surface/60 flex items-center justify-between gap-3 text-xs">
            <span className="text-muted truncate font-mono text-[11px] select-all">
              {customerUrl}
            </span>
            <button
              onClick={handleCopyLink}
              className="text-xs font-semibold text-primary hover:underline shrink-0"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Pro-Tips for Shop Owners */}
          <div className="p-4 rounded-2xl border border-border bg-surface/30 text-xs text-muted space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Counter Display Tips</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-muted">
              <li>
                <strong>Paper:</strong> Print on standard <strong>A4 250–300 GSM</strong> glossy or
                matte cardstock for best colors and durability.
              </li>
              <li>
                <strong>Stand:</strong> Fits perfectly into standard{' '}
                <strong>A4 acrylic T-stands</strong> or counter frames next to your billing counter.
              </li>
              <li>
                <strong>Customer Experience:</strong> Customers simply point their phone camera to
                upload PDFs, choose page ranges, and pay directly.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
