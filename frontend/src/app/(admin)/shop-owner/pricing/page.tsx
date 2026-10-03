'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyShops,
  getShopPricing,
  updateShopPricing,
  ShopPricing,
  ShopData,
} from '@/services/shop.service';
import { useAuthStore } from '@/store/auth';
import {
  ArrowLeft,
  DollarSign,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calculator,
  Sparkles,
} from 'lucide-react';

export default function ShopOwnerPricingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('velox_token') : null;
    if (!token && !isAuthenticated) {
      router.push('/shop-owner/login');
    }
  }, [isAuthenticated, router]);

  const { data: shops, isLoading: isShopsLoading } = useQuery<ShopData[]>({
    queryKey: ['ownerShops'],
    queryFn: getMyShops,
  });

  const shop = shops && shops.length > 0 ? shops[0] : null;
  const shopId = shop?.id;

  const { data: pricingData, isLoading: isPricingLoading } = useQuery<ShopPricing>({
    queryKey: ['shopPricing', shopId],
    queryFn: () => getShopPricing(shopId!),
    enabled: !!shopId,
  });

  const [rates, setRates] = useState<ShopPricing>({
    pricePerPageBW: 2.0,
    pricePerPageColor: 10.0,
    duplexDiscount: 0.5,
  });

  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (pricingData) {
      setRates({
        pricePerPageBW: pricingData.pricePerPageBW ?? 2.0,
        pricePerPageColor: pricingData.pricePerPageColor ?? 10.0,
        duplexDiscount: pricingData.duplexDiscount ?? 0.0,
      });
    } else if (shop) {
      setRates({
        pricePerPageBW: shop.pricePerPageBW ?? 2.0,
        pricePerPageColor: shop.pricePerPageColor ?? 10.0,
        duplexDiscount: shop.duplexDiscount ?? 0.0,
      });
    }
  }, [pricingData, shop]);

  const pricingMutation = useMutation({
    mutationFn: (newPricing: Partial<ShopPricing>) => updateShopPricing(shopId!, newPricing),
    onSuccess: () => {
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 4000);
      queryClient.invalidateQueries({ queryKey: ['shopPricing', shopId] });
      queryClient.invalidateQueries({ queryKey: ['ownerShops'] });
    },
    onError: (err: any) => {
      setErrorMsg(
        err.response?.data?.message ||
          err.message ||
          'Failed to update shop rates. Please try again.',
      );
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRates((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!shopId) return;
    pricingMutation.mutate(rates);
  };

  const bwRate = rates.pricePerPageBW;
  const colorRate = rates.pricePerPageColor;
  const duplexDiscount = rates.duplexDiscount;
  const bwDuplexRate = Math.max(0.1, bwRate - duplexDiscount);

  if (isShopsLoading || isPricingLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted">Loading pricing settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/shop-owner"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shop Counter
          </Link>
          <span className="text-xs font-mono text-muted bg-surface border border-border px-2 py-0.5 rounded">
            {shop?.name || 'Assigned Store'}
          </span>
        </div>

        {/* Pricing Card */}
        <div className="border border-border bg-surface/50 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Shop Print Rates</h1>
              <p className="text-xs text-muted mt-0.5">
                Configure rates per page in INR (₹) charged to walk-in customers.
              </p>
            </div>
          </div>

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Shop pricing updated successfully! New customer orders will reflect these rates
                immediately.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  B&W Rate / Page (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.25"
                    min="0.1"
                    name="pricePerPageBW"
                    required
                    value={rates.pricePerPageBW}
                    onChange={handleChange}
                    className="w-full text-sm font-semibold pl-8 pr-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  Color Rate / Page (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    name="pricePerPageColor"
                    required
                    value={rates.pricePerPageColor}
                    onChange={handleChange}
                    className="w-full text-sm font-semibold pl-8 pr-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  Duplex Discount / Page (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">
                    -₹
                  </span>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    name="duplexDiscount"
                    value={rates.duplexDiscount}
                    onChange={handleChange}
                    className="w-full text-sm font-semibold pl-8 pr-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Live Pricing Preview Simulation */}
            <div className="p-4 rounded-xl bg-background border border-border space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
                <Calculator className="h-4 w-4 text-primary" />
                <span>Customer Price Preview Examples</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <span className="text-muted block text-[11px]">5 Pages B&W (Single-Sided)</span>
                  <span className="font-mono font-bold text-sm text-foreground">
                    ₹{(5 * bwRate).toFixed(2)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <span className="text-muted block text-[11px]">5 Pages B&W (Double-Sided)</span>
                  <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    ₹{(5 * bwDuplexRate).toFixed(2)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <span className="text-muted block text-[11px]">2 Pages Color Print</span>
                  <span className="font-mono font-bold text-sm text-foreground">
                    ₹{(2 * colorRate).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={pricingMutation.isPending}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {pricingMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving Rates...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Save Pricing Rates
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
