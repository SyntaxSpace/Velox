'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getMyShops, ShopData } from '@/services/shop.service';
import { useAuthStore } from '@/store/auth';
import { Loader2 } from 'lucide-react';
import QrStandPoster from '@/components/shared/QrStandPoster';

export default function ShopOwnerQrStandPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const localToken = typeof window !== 'undefined' ? localStorage.getItem('velox_token') : null;
    if (!localToken && !isAuthenticated) {
      router.push('/shop-owner/login');
    }
  }, [isAuthenticated, router]);

  const {
    data: shops,
    isLoading,
    error,
  } = useQuery<ShopData[]>({
    queryKey: ['ownerShops'],
    queryFn: getMyShops,
  });

  const shop = shops && shops.length > 0 ? shops[0] : null;

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
          <Link href="/shop-owner" className="underline font-semibold">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <QrStandPoster shop={shop} backHref="/shop-owner" backLabel="Back to Shop Counter" />;
}
