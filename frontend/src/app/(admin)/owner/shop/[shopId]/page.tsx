'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getShop, updateShop, ShopData, CreateShopInput } from '@/services/shop.service';
import {
  Store,
  ArrowLeft,
  Loader2,
  Printer,
  QrCode,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';

export default function ShopDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const shopId = params.shopId as string;

  const {
    data: shop,
    isLoading,
    error,
  } = useQuery<ShopData>({
    queryKey: ['shop', shopId],
    queryFn: () => getShop(shopId),
    enabled: !!shopId,
  });

  const [formData, setFormData] = useState<Partial<CreateShopInput>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    pincode: '',
    operatingHours: '',
  });
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (shop) {
      setFormData({
        name: shop.name || '',
        phone: shop.phone || '',
        email: shop.email || '',
        address: shop.address || '',
        city: shop.city || '',
        pincode: shop.pincode || '',
        operatingHours: shop.operatingHours || '',
      });
    }
  }, [shop]);

  const updateMutation = useMutation({
    mutationFn: (updated: Partial<CreateShopInput>) => updateShop(shopId, updated),
    onSuccess: (data) => {
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
      queryClient.setQueryData(['shop', shopId], data);
      queryClient.invalidateQueries({ queryKey: ['ownerShops'] });
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update shop details');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted" />
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          Failed to load shop details.{' '}
          <Link href="/owner" className="underline font-semibold">
            Back to Shops
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/owner"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shops
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={`/owner/shop/${shopId}/printers`}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface/80 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              Printers
            </Link>
            <Link
              href={`/owner/shop/${shopId}/qr`}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground flex items-center gap-1.5 hover:opacity-90 transition-opacity"
            >
              <QrCode className="h-3.5 w-3.5" />
              Counter QR
            </Link>
          </div>
        </div>

        {/* Shop Header Card */}
        <div className="border border-border bg-surface/40 rounded-2xl p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold">{shop.name}</h1>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  shop.status === 'ACTIVE'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}
              >
                {shop.status}
              </span>
            </div>
            <p className="text-xs font-mono text-muted mt-1">
              Public ID: <strong className="text-foreground">{shop.publicShopId || shop.id}</strong>
            </p>
          </div>

          <Link
            href={`/shop/${shop.publicShopId || shop.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-border bg-background hover:bg-surface transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Public Shop Page
          </Link>
        </div>

        {/* Edit Details Form */}
        <div className="border border-border bg-surface/50 rounded-2xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-base font-semibold mb-4">Shop Settings & Configuration</h2>

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Shop settings saved successfully!</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Shop Name</label>
              <input
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                required
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  required
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  Shop Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">
                Street Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address || ''}
                onChange={handleChange}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleChange}
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode || ''}
                  onChange={handleChange}
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">
                Operating Hours
              </label>
              <input
                type="text"
                name="operatingHours"
                value={formData.operatingHours || ''}
                onChange={handleChange}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
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
