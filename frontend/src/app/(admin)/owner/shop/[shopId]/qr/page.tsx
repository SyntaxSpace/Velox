'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getShop, ShopData } from '@/services/shop.service';
import { Loader2 } from 'lucide-react';
import QrStandPoster from '@/components/shared/QrStandPoster';

export default function ShopQrStandPage() {
  const params = useParams();
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted">Loading QR Stand...</p>
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

  return <QrStandPoster shop={shop} backHref="/owner" backLabel="Back to Shops" />;
}
