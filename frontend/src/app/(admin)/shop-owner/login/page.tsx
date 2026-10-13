'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Loader2, Store, Lock } from 'lucide-react';

export default function ShopOwnerLoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = res.data.data;

      if (user.role !== 'SHOP_OWNER' && user.role !== 'OWNER' && user.role !== 'ADMIN') {
        setError('Access denied. This login is strictly for provisioned Shop Owners.');
        return;
      }

      setAuth(user, accessToken, refreshToken);
      router.push('/shop-owner');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        'Invalid credentials. Please verify your email and password.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-surface text-foreground">
      <div className="w-full max-w-md bg-background border border-border rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary text-primary-foreground mb-3 shadow-md">
            <Store className="h-6 w-6" />
          </div>
          <span className="text-[11px] font-mono tracking-widest text-primary uppercase font-semibold block mb-1">
            VELOX COUNTER SYSTEM
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Shop Owner Login</h1>
          <p className="text-xs text-muted mt-1">
            Sign in with credentials provisioned by your Velox Partner
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              className="text-xs font-medium text-muted uppercase tracking-wider"
              htmlFor="email"
            >
              Owner Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="w-full px-3 py-2.5 border border-border rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@yourshop.com"
            />
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-medium text-muted uppercase tracking-wider"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              className="w-full px-3 py-2.5 border border-border rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 mt-4 shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In to Counter'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted">
          Don't have an account?{' '}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Partner Provisioning Notice
          </Link>
        </div>
      </div>
    </div>
  );
}
