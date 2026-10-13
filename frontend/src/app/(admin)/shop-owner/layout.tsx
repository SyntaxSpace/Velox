'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import ShopOwnerSidebar from '@/components/layout/ShopOwnerSidebar';
import { useAuthStore } from '@/store/auth';

export default function ShopOwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const isLoginPage = pathname === '/shop-owner/login';

  useEffect(() => {
    if (isLoginPage) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('velox_token') : null;
    if (!token && !isAuthenticated) {
      router.push('/shop-owner/login');
    }
  }, [isAuthenticated, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-foreground">
      <ShopOwnerSidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
