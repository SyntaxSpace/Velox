'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFDocument } from 'pdf-lib';
import {
  getPublicShop,
  getShopPricing,
  createGuestSession,
  ShopData,
  ShopPricing,
} from '@/services/shop.service';
import { createOrder } from '@/services/order.service';
import { useAuthStore } from '@/store/auth';
import VeloxLogo from '@/components/shared/VeloxLogo';
import {
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  MapPin,
  Phone,
  Copy,
  Check,
  ArrowRight,
  User,
  Smartphone,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

async function getPdfPageCount(selectedFile: File): Promise<number> {
  try {
    const arrayBuffer = await selectedFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const count = pdfDoc.getPageCount();
    if (count > 0) return count;
  } catch (err) {
    console.warn('pdf-lib failed to parse page count, trying fallback:', err);
  }

  try {
    const buffer = await selectedFile.arrayBuffer();
    const text = new TextDecoder('latin1').decode(buffer);
    const matches = text.match(/\/Type\s*\/Page\b/g);
    if (matches && matches.length > 0) {
      return matches.length;
    }
  } catch {
    // fallback
  }

  return 1;
}

export default function ShopPage() {
  const params = useParams<{ shopId: string }>();
  const router = useRouter();
  const shopId = params.shopId;
  const { isAuthenticated } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shop Details
  const {
    data: shop,
    isLoading: isShopLoading,
    error: shopError,
  } = useQuery<ShopData>({
    queryKey: ['shop', shopId],
    queryFn: () => getPublicShop(shopId),
    enabled: !!shopId,
  });

  // Shop Pricing
  const [pricing, setPricing] = useState<ShopPricing | null>(null);

  useEffect(() => {
    if (!shopId) return;
    getShopPricing(shopId)
      .then((data) => setPricing(data))
      .catch((err) => console.warn('Failed to load shop pricing, using defaults:', err));
  }, [shopId]);

  // Upload Form State
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(1);
  const [isCountingPages, setIsCountingPages] = useState<boolean>(false);
  const [copies, setCopies] = useState<number>(1);
  const [color, setColor] = useState<'bw' | 'color'>('bw');
  const [doubleSided, setDoubleSided] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Bottom Sheet Modal State
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerError, setCustomerError] = useState<string | null>(null);

  // Order Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [submittedOrder, setSubmittedOrder] = useState<{
    orderId: string;
    orderCode: string;
    estimatedCost: number;
    totalPages: number;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Retrieve saved contact info from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('velox_customer_name');
      const savedPhone = localStorage.getItem('velox_customer_phone');
      if (savedName) setCustomerName(savedName);
      if (savedPhone) setCustomerPhone(savedPhone);
    }
  }, []);

  // Pricing calculations
  const rateBW = pricing?.pricePerPageBW ?? shop?.pricePerPageBW ?? 2.0;
  const rateColor = pricing?.pricePerPageColor ?? shop?.pricePerPageColor ?? 10.0;
  const duplexDiscount = pricing?.duplexDiscount ?? shop?.duplexDiscount ?? 0.0;

  let unitPrice = color === 'color' ? rateColor : rateBW;
  if (doubleSided && duplexDiscount > 0) {
    unitPrice = Math.max(0.1, unitPrice - duplexDiscount);
  }
  const effectivePages = file ? pageCount : 1;
  const totalBillablePages = effectivePages * copies;
  const estimatedCost = Number((totalBillablePages * unitPrice).toFixed(2));

  // File selection handler
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFileError(null);
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setFileError('Only PDF, PNG, and JPG files are supported.');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setFileError('File size must be under 50MB.');
      return;
    }
    setFile(selectedFile);

    if (selectedFile.type === 'application/pdf') {
      setIsCountingPages(true);
      try {
        const pages = await getPdfPageCount(selectedFile);
        setPageCount(pages);
      } catch {
        setPageCount(1);
      } finally {
        setIsCountingPages(false);
      }
    } else {
      setPageCount(1);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect],
  );

  // Trigger bottom sheet popup when user clicks the main Upload button
  const handleOpenUploadSheet = () => {
    if (!file) {
      // Trigger file selector if no file is chosen yet
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }
    setCustomerError(null);
    setIsBottomSheetOpen(true);
  };

  // Submit order with Customer Name and Phone
  const handleConfirmAndUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setFileError('Please select a file to print.');
      setIsBottomSheetOpen(false);
      return;
    }

    const trimmedName = customerName.trim();
    const cleanPhone = customerPhone.replace(/\D/g, '');

    if (!trimmedName || trimmedName.length < 2) {
      setCustomerError('Please enter your full name (at least 2 letters).');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      setCustomerError('Please enter a valid 10-digit mobile number.');
      return;
    }

    // Save to localStorage for repeat customer convenience
    if (typeof window !== 'undefined') {
      localStorage.setItem('velox_customer_name', trimmedName);
      localStorage.setItem('velox_customer_phone', cleanPhone);
    }

    setIsSubmitting(true);
    setCustomerError(null);
    setUploadProgress(0);

    try {
      // Ensure guest session if not logged in
      if (!isAuthenticated) {
        let guestToken = localStorage.getItem('velox_guest_session');
        if (!guestToken) {
          try {
            const session = await createGuestSession(shopId);
            guestToken = session.sessionToken;
            localStorage.setItem('velox_guest_session', guestToken);
            localStorage.setItem('velox_guest_session_id', session.guestSessionId);
          } catch {
            // Proceed; backend handles fallback
          }
        }
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('shopId', shopId);
      formData.append('copies', String(copies));
      formData.append('color', color);
      formData.append('doubleSided', String(doubleSided));
      formData.append('orientation', 'portrait');
      formData.append('paperSize', 'A4');
      formData.append('paymentMethod', 'COUNTER');
      formData.append('pageCount', String(effectivePages));
      formData.append('customerName', trimmedName);
      formData.append('customerPhone', cleanPhone);

      const result = await createOrder(formData, (progress) => {
        setUploadProgress(progress);
      });

      // Close bottom sheet and transition to Submitted screen
      setIsBottomSheetOpen(false);
      setSubmittedOrder({
        orderId: result.orderId,
        orderCode: result.orderCode,
        estimatedCost: result.estimatedCost,
        totalPages: result.totalPages,
      });
    } catch (err: any) {
      const message =
        err?.response?.data?.message || 'Failed to submit print order. Please try again.';
      setCustomerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    if (!submittedOrder) return;
    await navigator.clipboard.writeText(submittedOrder.orderCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleResetForNewOrder = () => {
    setFile(null);
    setPageCount(1);
    setCopies(1);
    setColor('bw');
    setDoubleSided(false);
    setSubmittedOrder(null);
    setUploadProgress(0);
    setFileError(null);
  };

  if (isShopLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted text-xs">Loading shop counter...</p>
        </div>
      </div>
    );
  }

  if (shopError || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold mb-2">Shop Not Found</h1>
          <p className="text-muted text-xs mb-6">
            This print shop does not exist or the QR link has expired.
          </p>
          <button
            onClick={() => router.push('/')}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-primary text-primary-foreground"
          >
            Go to Velox Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <VeloxLogo className="h-6 w-auto" />
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted bg-surface border border-border px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Counter Ready</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-6">
        {/* SUBMITTED SUCCESS SCREEN */}
        {submittedOrder ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center py-4"
          >
            {/* Success Icon */}
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
              <div className="h-20 w-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center relative">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-foreground mb-1">
              Order Submitted!
            </h1>
            <p className="text-xs text-muted max-w-xs mx-auto mb-6">
              Your print job is queued at <strong>{shop.name}</strong>. Collect your prints at the
              counter.
            </p>

            {/* Order Code Card */}
            <div className="p-5 rounded-2xl border border-border bg-surface shadow-sm mb-5 text-center">
              <p className="text-[11px] font-mono tracking-wider text-muted uppercase mb-1">
                Pickup Order Code
              </p>
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="text-3xl font-mono font-black tracking-widest text-foreground">
                  {submittedOrder.orderCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-xl hover:bg-background border border-border transition-colors text-muted hover:text-foreground"
                  title="Copy Code"
                >
                  {copiedCode ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              {copiedCode && (
                <p className="text-[10px] text-emerald-600 font-semibold mb-1">
                  Copied to clipboard!
                </p>
              )}
              <p className="text-[11px] text-muted">
                Show this code to the operator to collect your physical print.
              </p>
            </div>

            {/* Order Summary Details */}
            <div className="bg-surface/50 border border-border rounded-2xl p-4 text-xs space-y-2.5 mb-6 text-left">
              <div className="flex justify-between items-center text-muted">
                <span>Customer</span>
                <strong className="text-foreground font-semibold">
                  {customerName} ({customerPhone})
                </strong>
              </div>
              <div className="flex justify-between items-center text-muted">
                <span>Document</span>
                <strong className="text-foreground font-semibold truncate max-w-[200px]">
                  {file?.name || 'Document.pdf'}
                </strong>
              </div>
              <div className="flex justify-between items-center text-muted">
                <span>Total Pages</span>
                <strong className="text-foreground font-semibold">
                  {submittedOrder.totalPages} {submittedOrder.totalPages === 1 ? 'page' : 'pages'}
                </strong>
              </div>
              <div className="flex justify-between items-center text-muted">
                <span>Print Mode</span>
                <strong className="text-foreground font-semibold uppercase">
                  {color === 'color' ? 'Color' : 'B&W'} •{' '}
                  {doubleSided ? 'Double-sided' : 'Single-sided'}
                </strong>
              </div>
              <div className="pt-2 border-t border-border flex justify-between items-center">
                <span className="font-semibold text-foreground">Total to Pay (Counter)</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  ₹{submittedOrder.estimatedCost}
                </span>
              </div>
            </div>

            {/* Actions: Track Button & Print Another */}
            <div className="space-y-2.5">
              <button
                onClick={() => router.push(`/order/${submittedOrder.orderId}`)}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:opacity-95 active:scale-[0.99] transition-all"
              >
                Track Your Order
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={handleResetForNewOrder}
                className="w-full py-2.5 px-4 text-xs font-semibold text-muted hover:text-foreground transition-colors"
              >
                Print Another Document
              </button>
            </div>
          </motion.div>
        ) : (
          /* MAIN UPLOAD DIALOG SCREEN */
          <div>
            {/* Shop Details Header Card (No printers shown) */}
            <div className="mb-6 p-4 rounded-2xl border border-border bg-surface/50 flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold tracking-wider text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-md inline-block mb-1">
                  OFFICIAL PRINT COUNTER
                </span>
                <h1 className="text-lg font-bold tracking-tight text-foreground">{shop.name}</h1>
                {shop.address && (
                  <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0 text-muted" />
                    <span>{shop.address}</span>
                  </p>
                )}
              </div>
              {shop.phone && (
                <a
                  href={`tel:${shop.phone}`}
                  className="p-2 rounded-xl bg-surface border border-border text-muted hover:text-foreground shrink-0"
                  title="Call Shop"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div>

            {/* UPLOAD DIALOG BOX */}
            <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                  <Upload className="h-4 w-4 text-primary" />
                  Upload Document
                </h2>
                <span className="text-[11px] text-muted font-medium">Max 50MB • PDF, JPG, PNG</span>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />

              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => {
                  if (!file && fileInputRef.current) fileInputRef.current.click();
                }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : file
                      ? 'border-border bg-background'
                      : 'border-border hover:border-primary/50 hover:bg-surface/80 bg-background/50'
                }`}
              >
                {file ? (
                  <div className="flex items-center justify-between text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold truncate text-foreground">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                          {isCountingPages ? (
                            <span className="inline-flex items-center gap-1 text-primary">
                              <Loader2 className="h-3 w-3 animate-spin inline" /> Counting pages...
                            </span>
                          ) : (
                            <span className="font-semibold text-foreground">
                              {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                            </span>
                          )}
                          <span>•</span>
                          <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setPageCount(1);
                      }}
                      className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors shrink-0"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-foreground mb-1">
                      Tap to choose your document or drag file here
                    </p>
                    <p className="text-[11px] text-muted">
                      Supports college notes, assignments, forms, IDs
                    </p>
                  </div>
                )}
              </div>

              {fileError && (
                <div className="mt-3 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                  {fileError}
                </div>
              )}

              {/* Print Configuration (Revealed when file is picked) */}
              {file && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-5 space-y-4 pt-4 border-t border-border"
                >
                  {/* Copies Stepper */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-foreground block">Copies</label>
                      <span className="text-[10px] text-muted">Number of print sets</span>
                    </div>
                    <div className="flex items-center gap-2 border border-border bg-background rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setCopies(Math.max(1, copies - 1))}
                        className="h-7 w-7 rounded-lg bg-surface text-foreground font-bold flex items-center justify-center hover:bg-surface/80"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-xs w-6 text-center">{copies}</span>
                      <button
                        type="button"
                        onClick={() => setCopies(Math.min(50, copies + 1))}
                        className="h-7 w-7 rounded-lg bg-surface text-foreground font-bold flex items-center justify-center hover:bg-surface/80"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Color Mode Options */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold text-foreground">Color Mode</label>
                      <span className="text-[10px] text-muted">
                        ₹{rateBW}/pg B&W • ₹{rateColor}/pg Color
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setColor('bw')}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          color === 'bw'
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border bg-background text-muted hover:text-foreground'
                        }`}
                      >
                        Black & White
                      </button>
                      <button
                        type="button"
                        onClick={() => setColor('color')}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          color === 'color'
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border bg-background text-muted hover:text-foreground'
                        }`}
                      >
                        Color Print
                      </button>
                    </div>
                  </div>

                  {/* Sides Option */}
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">
                      Sides
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDoubleSided(false)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          !doubleSided
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border bg-background text-muted hover:text-foreground'
                        }`}
                      >
                        Single-sided
                      </button>
                      <button
                        type="button"
                        onClick={() => setDoubleSided(true)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          doubleSided
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border bg-background text-muted hover:text-foreground'
                        }`}
                      >
                        Double-sided (Duplex)
                      </button>
                    </div>
                  </div>

                  {/* Live Cost Summary Pill */}
                  <div className="p-3 rounded-xl bg-background border border-border flex items-center justify-between text-xs">
                    <span className="text-muted">
                      {totalBillablePages} billable {totalBillablePages === 1 ? 'page' : 'pages'}
                    </span>
                    <span className="font-bold font-mono text-sm text-foreground">
                      Estimated: ₹{estimatedCost}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Main Upload / Proceed Button */}
              <button
                type="button"
                onClick={handleOpenUploadSheet}
                className="w-full mt-5 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm shadow-md hover:opacity-95 active:scale-[0.99] transition-all"
              >
                {file ? (
                  <>
                    <span>Upload & Print Document</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Choose File to Print</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM SHEET POPUP MODAL (Name & Phone Number) */}
      <AnimatePresence>
        {isBottomSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSubmitting) setIsBottomSheetOpen(false);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: '100%', opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0.8 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-lg bg-surface border-t sm:border border-border rounded-t-[28px] sm:rounded-3xl p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            >
              {/* Drag / Handle bar */}
              <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-5 sm:hidden" />

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    Who is this print for?
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Enter your name and phone for counter pickup
                  </p>
                </div>
                {!isSubmitting && (
                  <button
                    onClick={() => setIsBottomSheetOpen(false)}
                    className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-background transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Order Quick Summary Pill */}
              <div className="p-3 rounded-xl bg-background border border-border flex items-center justify-between text-xs mb-4">
                <span className="text-muted truncate max-w-[200px]">{file?.name}</span>
                <span className="font-mono font-bold text-foreground">
                  {totalBillablePages} pgs • ₹{estimatedCost}
                </span>
              </div>

              {customerError && (
                <div className="mb-4 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                  {customerError}
                </div>
              )}

              {/* Form: Name & Phone */}
              <form onSubmit={handleConfirmAndUpload} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Your Full Name <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={customerName}
                      disabled={isSubmitting}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Mobile Phone Number <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={customerPhone}
                      disabled={isSubmitting}
                      maxLength={10}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                    />
                  </div>
                  <p className="text-[10px] text-muted mt-1">
                    Used to identify your printed documents at the counter
                  </p>
                </div>

                {/* Upload Progress Bar if submitting */}
                {isSubmitting && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] text-muted">
                      <span>Uploading document...</span>
                      <span className="font-mono">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-150"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Next / Proceed Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm shadow-md hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting Order...</span>
                    </>
                  ) : (
                    <>
                      <span>Next • Submit Print Order</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
