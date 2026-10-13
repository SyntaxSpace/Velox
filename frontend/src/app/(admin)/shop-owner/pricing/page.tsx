'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyShops,
  getShopPricing,
  updateShopPricing,
  ShopPricing,
  ShopData,
} from '@/services/shop.service';
import {
  DollarSign,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calculator,
  SlidersHorizontal,
} from 'lucide-react';

export default function ShopOwnerPricingPage() {
  const queryClient = useQueryClient();

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
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted">Loading pricing settings...</p>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Rates & Pricing</h1>
            <p className="text-xs text-muted mt-0.5">
              Per-page pricing charged to customers at {shop?.name || 'Store'}
            </p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Rates updated successfully! Customer upload screens now reflect these rates.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Pricing Form Card */}
      <form
        onSubmit={handleSubmit}
        className="p-6 sm:p-8 rounded-2xl border border-border bg-surface/50 shadow-2xs space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">
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
                className="w-full text-base font-bold font-mono pl-8 pr-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <p className="text-[11px] text-muted">Standard monochrome rate</p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">
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
                className="w-full text-base font-bold font-mono pl-8 pr-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <p className="text-[11px] text-muted">Full color document rate</p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">
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
                className="w-full text-base font-bold font-mono pl-8 pr-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <p className="text-[11px] text-muted">Discount on double-sided sheets</p>
          </div>
        </div>

        {/* Live Customer Price Preview Calculator */}
        <div className="p-5 rounded-xl bg-background border border-border space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
            <Calculator className="h-4 w-4 text-primary" />
            <span>Interactive Price Calculator Simulation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-surface border border-border">
              <span className="text-muted block text-[11px]">10 Pages B&W (Simplex)</span>
              <span className="font-mono font-bold text-base text-foreground mt-0.5 block">
                ₹{(10 * bwRate).toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-border">
              <span className="text-muted block text-[11px]">10 Pages B&W (Duplex)</span>
              <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                ₹{(10 * bwDuplexRate).toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-border">
              <span className="text-muted block text-[11px]">5 Pages Color Print</span>
              <span className="font-mono font-bold text-base text-foreground mt-0.5 block">
                ₹{(5 * colorRate).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2 border-t border-border/60">
          <button
            type="submit"
            disabled={pricingMutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-2xs hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {pricingMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Rates
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
