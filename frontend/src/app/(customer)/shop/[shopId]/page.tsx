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
import { createRazorpayOrder, verifyRazorpayPayment } from '@/services/payment.service';
import { isTokenExpired } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import VeloxLogo from '@/components/shared/VeloxLogo';
import SegmentedControl from '@/components/ui/SegmentedControl';
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
  CreditCard,
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

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
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

  // Proactively ensure valid guest session for this specific shop
  useEffect(() => {
    if (!shopId || isAuthenticated) return;
    if (typeof window === 'undefined') return;

    // Purge expired velox_token if present so customer upload is never blocked by expired login sessions
    const authToken = localStorage.getItem('velox_token');
    if (authToken && isTokenExpired(authToken)) {
      localStorage.removeItem('velox_token');
    }

    const guestToken = localStorage.getItem('velox_guest_session');
    const guestShop = localStorage.getItem('velox_guest_shop_id');

    if (!guestToken || isTokenExpired(guestToken) || guestShop !== shopId) {
      createGuestSession(shopId)
        .then((session) => {
          localStorage.setItem('velox_guest_session', session.sessionToken);
          localStorage.setItem('velox_guest_session_id', session.guestSessionId);
          localStorage.setItem('velox_guest_shop_id', shopId);
        })
        .catch((err) => console.warn('Proactive guest session initialization deferred:', err));
    }
  }, [shopId, isAuthenticated]);

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
  const [paymentChoice, setPaymentChoice] = useState<'online' | 'counter'>('online');

  // Order Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [submittedOrder, setSubmittedOrder] = useState<{
    orderId: string;
    orderCode: string;
    estimatedCost: number;
    totalPages: number;
    paymentMethod: 'UPI' | 'COUNTER';
    paymentPending?: boolean;
    isDispatched?: boolean;
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

  const handleOpenUploadSheet = () => {
    if (!file) {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }
    setCustomerError(null);
    setIsBottomSheetOpen(true);
  };

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

    if (typeof window !== 'undefined') {
      localStorage.setItem('velox_customer_name', trimmedName);
      localStorage.setItem('velox_customer_phone', cleanPhone);
    }

    setIsSubmitting(true);
    setCustomerError(null);
    setUploadProgress(0);

    try {
      if (!isAuthenticated) {
        // Clear expired auth token if present so customer upload is never blocked by expired login sessions
        const authToken = localStorage.getItem('velox_token');
        if (authToken && isTokenExpired(authToken)) {
          localStorage.removeItem('velox_token');
        }

        let guestToken = localStorage.getItem('velox_guest_session');
        const guestShop = localStorage.getItem('velox_guest_shop_id');
        if (!guestToken || isTokenExpired(guestToken) || guestShop !== shopId) {
          try {
            const session = await createGuestSession(shopId);
            guestToken = session.sessionToken;
            localStorage.setItem('velox_guest_session', guestToken);
            localStorage.setItem('velox_guest_session_id', session.guestSessionId);
            localStorage.setItem('velox_guest_shop_id', shopId);
          } catch (sessionErr) {
            console.warn('Failed to acquire fresh guest session:', sessionErr);
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
      formData.append('paymentMethod', paymentChoice === 'online' ? 'UPI' : 'COUNTER');
      formData.append('pageCount', String(effectivePages));
      formData.append('customerName', trimmedName);
      formData.append('customerPhone', cleanPhone);

      let result;
      try {
        result = await createOrder(formData, (progress) => {
          setUploadProgress(progress);
        });
      } catch (uploadErr: any) {
        // Self-healing: If rejected with 401 (invalid/expired token), purge stale tokens, obtain fresh guest session, and retry once
        if (uploadErr?.response?.status === 401 && !isAuthenticated) {
          console.warn(
            'Session rejected (401). Purging stale tokens and retrying with fresh guest session...',
          );
          localStorage.removeItem('velox_token');
          localStorage.removeItem('velox_guest_session');
          localStorage.removeItem('velox_guest_session_id');
          localStorage.removeItem('velox_guest_shop_id');

          const freshSession = await createGuestSession(shopId);
          localStorage.setItem('velox_guest_session', freshSession.sessionToken);
          localStorage.setItem('velox_guest_session_id', freshSession.guestSessionId);
          localStorage.setItem('velox_guest_shop_id', shopId);

          result = await createOrder(formData, (progress) => {
            setUploadProgress(progress);
          });
        } else {
          throw uploadErr;
        }
      }

      if (paymentChoice === 'counter') {
        setIsBottomSheetOpen(false);
        setSubmittedOrder({
          orderId: result.orderId,
          orderCode: result.orderCode,
          estimatedCost: result.estimatedCost,
          totalPages: result.totalPages,
          paymentMethod: 'COUNTER',
        });
        return;
      }

      // Online payment via Razorpay Standard Checkout
      try {
        const rzpOrder = await createRazorpayOrder(result.orderId);
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error(
            'Payment gateway could not be loaded. Please check your internet connection.',
          );
        }

        const options = {
          key: rzpOrder.keyId,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          name: shop?.name || 'Velox Smart Printing',
          description: `Print Order ${result.orderCode}`,
          order_id: rzpOrder.razorpayOrderId,
          prefill: {
            name: trimmedName,
            contact: cleanPhone,
          },
          theme: {
            color: '#000000',
          },
          handler: async (response: any) => {
            try {
              setIsSubmitting(true);
              const verifyResult = await verifyRazorpayPayment({
                orderId: result.orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });

              setIsBottomSheetOpen(false);
              setSubmittedOrder({
                orderId: result.orderId,
                orderCode: result.orderCode,
                estimatedCost: result.estimatedCost,
                totalPages: result.totalPages,
                paymentMethod: 'UPI',
                isDispatched: verifyResult.dispatched,
              });
            } catch (verifyErr: any) {
              setCustomerError(
                verifyErr?.response?.data?.message ||
                  'Payment verification failed. Please contact support.',
              );
              setIsBottomSheetOpen(true);
            } finally {
              setIsSubmitting(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsSubmitting(false);
              setIsBottomSheetOpen(false);
              setSubmittedOrder({
                orderId: result.orderId,
                orderCode: result.orderCode,
                estimatedCost: result.estimatedCost,
                totalPages: result.totalPages,
                paymentMethod: 'UPI',
                paymentPending: true,
              });
            },
          },
        };

        const razorpayInstance = new (window as any).Razorpay(options);
        razorpayInstance.open();
      } catch (payErr: any) {
        setCustomerError(
          payErr?.response?.data?.message ||
            payErr?.message ||
            'Could not initiate online payment.',
        );
      }
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
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-muted text-xs">Connecting to print counter...</p>
        </div>
      </div>
    );
  }

  if (shopError || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-lg font-bold mb-2">Shop Not Found</h1>
          <p className="text-muted text-xs mb-6">
            This print counter link does not exist or has expired.
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
      <header className="border-b border-border/80 bg-background/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <VeloxLogo className="h-6 w-auto" />
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Counter Ready</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-6">
        {/* SUBMITTED CELEBRATION SCREEN */}
        {submittedOrder ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="text-center py-4 space-y-5"
          >
            {/* Success Icon */}
            <div className="relative inline-flex items-center justify-center mb-1">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Order Submitted!
              </h1>
              <p className="text-xs text-muted max-w-xs mx-auto mt-1">
                Your print job is queued at <strong>{shop.name}</strong>.
              </p>
            </div>

            {/* Order Pickup Code Card */}
            <div className="p-5 rounded-2xl border border-border bg-surface/60 shadow-2xs text-center space-y-2">
              <span className="text-[10px] font-mono tracking-widest text-muted uppercase block">
                Counter Pickup Code
              </span>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-mono font-bold tracking-wider text-foreground">
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
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Copied to clipboard!
                </p>
              )}
              <p className="text-[11px] text-muted">
                Show this code at the counter to collect your printed document.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-surface/40 border border-border rounded-2xl p-4 text-xs space-y-2.5 text-left">
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
                  {color === 'color' ? 'Color' : 'B&W'} · {doubleSided ? 'Duplex' : 'Simplex'}
                </strong>
              </div>
              <div className="pt-2 border-t border-border flex justify-between items-center">
                <span className="font-semibold text-foreground">
                  {submittedOrder.paymentMethod === 'UPI'
                    ? submittedOrder.paymentPending
                      ? 'Payment Pending (Online)'
                      : 'Paid Online (Razorpay)'
                    : 'Total to Pay (Counter)'}
                </span>
                <span className="text-base font-bold text-foreground font-mono">
                  ₹{submittedOrder.estimatedCost}
                </span>
              </div>
            </div>

            {/* Payment Pending Banner if customer dismissed Razorpay */}
            {submittedOrder.paymentMethod === 'UPI' && submittedOrder.paymentPending && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-2 text-left">
                <p className="font-semibold">Online payment was not completed yet.</p>
                <p className="text-[11px] text-muted">
                  Your order is reserved. Complete payment now to automatically release the document
                  to the printer, or pay cash at the counter.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    if (!submittedOrder) return;
                    try {
                      setIsSubmitting(true);
                      const rzpOrder = await createRazorpayOrder(submittedOrder.orderId);
                      await loadRazorpayScript();
                      const options = {
                        key: rzpOrder.keyId,
                        amount: rzpOrder.amount,
                        currency: rzpOrder.currency,
                        name: shop?.name || 'Velox Smart Printing',
                        description: `Print Order ${submittedOrder.orderCode}`,
                        order_id: rzpOrder.razorpayOrderId,
                        prefill: { name: customerName, contact: customerPhone },
                        theme: { color: '#000000' },
                        handler: async (response: any) => {
                          const verifyResult = await verifyRazorpayPayment({
                            orderId: submittedOrder.orderId,
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                          });
                          setSubmittedOrder({
                            ...submittedOrder,
                            paymentPending: false,
                            isDispatched: verifyResult.dispatched,
                          });
                        },
                      };
                      const rzp = new (window as any).Razorpay(options);
                      rzp.open();
                    } catch (err: any) {
                      alert(err?.message || 'Could not launch payment gateway');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-amber-600 text-white font-semibold text-xs hover:bg-amber-700 transition-colors"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Complete Online Payment Now</span>
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => router.push(`/order/${submittedOrder.orderId}`)}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm shadow-2xs hover:opacity-90 active:scale-[0.98] transition-all"
              >
                <span>Track Order Live</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={handleResetForNewOrder}
                className="w-full py-2 px-4 text-xs font-semibold text-muted hover:text-foreground transition-colors"
              >
                Print Another Document
              </button>
            </div>
          </motion.div>
        ) : (
          /* MAIN UPLOAD VIEW */
          <div className="space-y-4">
            {/* Shop Details Header Card */}
            <div className="p-4 rounded-2xl border border-border bg-surface/50 flex items-start justify-between gap-3 shadow-2xs">
              <div>
                <span className="text-[10px] font-mono font-bold tracking-wider text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-md inline-block mb-1">
                  PRINT COUNTER
                </span>
                <h1 className="text-base font-bold tracking-tight text-foreground">{shop.name}</h1>
                {shop.address && (
                  <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span>{shop.address}</span>
                  </p>
                )}
              </div>
              {shop.phone && (
                <a
                  href={`tel:${shop.phone}`}
                  className="p-2 rounded-xl bg-background border border-border text-muted hover:text-foreground shrink-0 shadow-2xs"
                  title="Call Store"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div>

            {/* UPLOAD DIALOG CARD */}
            <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Upload className="h-4 w-4 text-primary" />
                  Select Document
                </h2>
                <span className="text-[11px] text-muted">Max 50MB · PDF, PNG, JPG</span>
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

              {/* Dropzone */}
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
                      : 'border-border/80 hover:border-primary/50 bg-background/50 hover:bg-surface'
                }`}
              >
                {file ? (
                  <div className="flex items-center justify-between text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate text-foreground">
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
                          <span>·</span>
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
                      className="p-1.5 rounded-lg text-muted hover:text-foreground transition-colors shrink-0"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="py-2">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2.5">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground mb-0.5">
                      Tap to choose your document or drag file here
                    </p>
                    <p className="text-[11px] text-muted">
                      Supports PDF documents, assignments, forms, photos
                    </p>
                  </div>
                )}
              </div>

              {fileError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-400">
                  {fileError}
                </div>
              )}

              {/* Print Configuration (Revealed when file is picked) */}
              {file && (
                <div className="space-y-4 pt-3 border-t border-border/60">
                  {/* Copies Stepper */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-foreground block">Copies</label>
                      <span className="text-[11px] text-muted">Number of printed sets</span>
                    </div>
                    <div className="flex items-center gap-2 border border-border bg-background rounded-xl p-1 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setCopies(Math.max(1, copies - 1))}
                        className="h-7 w-7 rounded-lg bg-surface text-foreground font-bold flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-xs w-6 text-center">{copies}</span>
                      <button
                        type="button"
                        onClick={() => setCopies(Math.min(50, copies + 1))}
                        className="h-7 w-7 rounded-lg bg-surface text-foreground font-bold flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Color Mode Options */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-foreground">Color Mode</label>
                      <span className="text-[11px] text-muted">
                        ₹{rateBW}/pg B&W · ₹{rateColor}/pg Color
                      </span>
                    </div>
                    <SegmentedControl
                      options={[
                        { value: 'bw', label: 'Black & White' },
                        { value: 'color', label: 'Color Print' },
                      ]}
                      value={color}
                      onChange={(val) => setColor(val as 'bw' | 'color')}
                      className="w-full justify-between grid grid-cols-2 text-center"
                    />
                  </div>

                  {/* Sides Option */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground block">Sides</label>
                    <SegmentedControl
                      options={[
                        { value: 'false', label: 'Single-sided' },
                        { value: 'true', label: 'Double-sided (Duplex)' },
                      ]}
                      value={String(doubleSided)}
                      onChange={(val) => setDoubleSided(val === 'true')}
                      className="w-full justify-between grid grid-cols-2 text-center"
                    />
                  </div>

                  {/* Live Cost Summary Pill */}
                  <div className="p-3.5 rounded-xl bg-background border border-border flex items-center justify-between text-xs shadow-2xs">
                    <span className="text-muted">
                      {totalBillablePages} billable {totalBillablePages === 1 ? 'page' : 'pages'}
                    </span>
                    <span className="font-bold font-mono text-sm text-foreground">
                      Estimated: ₹{estimatedCost}
                    </span>
                  </div>
                </div>
              )}

              {/* Main Action Button */}
              <button
                type="button"
                onClick={handleOpenUploadSheet}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm shadow-2xs hover:opacity-90 active:scale-[0.98] transition-all mt-2"
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
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSubmitting) setIsBottomSheetOpen(false);
              }}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />

            {/* Sheet Drawer */}
            <motion.div
              initial={{ y: '100%', opacity: 0.9 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0.9 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-lg bg-surface border-t sm:border border-border rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            >
              {/* Grab Handle */}
              <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto mb-4 sm:hidden" />

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Who is this print for?</h3>
                  <p className="text-xs text-muted mt-0.5">
                    Enter your name and mobile number for counter pickup
                  </p>
                </div>
                {!isSubmitting && (
                  <button
                    onClick={() => setIsBottomSheetOpen(false)}
                    className="p-1 rounded-lg text-muted hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Order Quick Summary Pill */}
              <div className="p-3 rounded-xl bg-background border border-border flex items-center justify-between text-xs mb-4">
                <span className="text-muted truncate max-w-[200px]">{file?.name}</span>
                <span className="font-mono font-bold text-foreground">
                  {totalBillablePages} pgs · ₹{estimatedCost}
                </span>
              </div>

              {customerError && (
                <div className="mb-4 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-400">
                  {customerError}
                </div>
              )}

              {/* Form: Name & Phone */}
              <form onSubmit={handleConfirmAndUpload} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={customerName}
                      disabled={isSubmitting}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-all shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Mobile Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={customerPhone}
                      disabled={isSubmitting}
                      maxLength={10}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-all shadow-2xs"
                    />
                  </div>
                  <p className="text-[11px] text-muted mt-1">
                    Used to identify your printed documents at the counter
                  </p>
                </div>

                {/* Exactly Two Payment Choices */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-semibold text-foreground">
                    Payment Choice
                  </label>
                  <SegmentedControl
                    options={[
                      { value: 'online', label: '⚡ Pay Online (Instant)' },
                      { value: 'counter', label: '💵 Pay at Counter' },
                    ]}
                    value={paymentChoice}
                    onChange={(val) => setPaymentChoice(val as 'online' | 'counter')}
                    className="w-full justify-between grid grid-cols-2 text-center"
                  />
                  <p className="text-[11px] text-muted">
                    {paymentChoice === 'online'
                      ? 'UPI, Card, NetBanking. Document prints automatically upon payment.'
                      : 'Pay cash to the shopkeeper at the counter to start printing.'}
                  </p>
                </div>

                {/* Upload Progress Bar if submitting */}
                {isSubmitting && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] text-muted">
                      <span>Uploading document...</span>
                      <span className="font-mono">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-150"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Next / Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm shadow-2xs hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>
                        {uploadProgress < 100
                          ? `Uploading (${uploadProgress}%)...`
                          : paymentChoice === 'online'
                            ? 'Opening Razorpay Checkout...'
                            : 'Submitting Order...'}
                      </span>
                    </>
                  ) : paymentChoice === 'online' ? (
                    <>
                      <CreditCard className="h-4 w-4" />
                      <span>Pay Online (₹{estimatedCost}) & Print</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Pay at Counter (₹{estimatedCost})</span>
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
