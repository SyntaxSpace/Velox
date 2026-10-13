'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Loader2, ArrowRight } from 'lucide-react';

export default function PartnerLoginPage() {
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

      if (user.role !== 'PARTNER' && user.role !== 'ADMIN') {
        setError('Access restricted to authorized Velox Partner accounts.');
        return;
      }

      setAuth(user, accessToken, refreshToken);
      router.push('/partner');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        'Invalid email or password. Please verify your credentials.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary text-primary-foreground font-bold text-sm tracking-tight mb-4 shadow-sm">
            V
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Partner Platform</h1>
          <p className="text-xs text-muted mt-1.5">
            Centralized governance for the Velox print network
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground block" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="w-full h-11 px-3.5 border border-border rounded-xl bg-background text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@velox.dev"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground block" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full h-11 px-3.5 border border-border rounded-xl bg-background text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 mt-2 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center text-xs text-muted">
            Shop Operator?{' '}
            <Link
              href="/shop-owner/login"
              className="text-foreground font-medium hover:underline inline-flex items-center gap-0.5"
            >
              Counter Station Login
            </Link>
          </div>
        </div>

        {/* Compliance Footer */}
        <p className="text-center text-[11px] text-muted mt-6">
          Authorized personnel only. All access is logged and audited.
        </p>
      </div>
    </div>
  );
}
