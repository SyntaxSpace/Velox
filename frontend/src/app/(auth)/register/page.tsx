'use client';

import Link from 'next/link';
import { Store, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function RegisterNoticePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-surface text-foreground">
      <div className="w-full max-w-md bg-background border border-border rounded-2xl p-8 shadow-sm text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
          <Store className="h-7 w-7" />
        </div>

        <span className="text-[10px] font-mono font-bold tracking-widest text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-full inline-block mb-2">
          CENTRAL PLATFORM MODEL
        </span>

        <h1 className="text-2xl font-bold tracking-tight mb-2">Velox Partner Network</h1>
        <p className="text-xs text-muted leading-relaxed mb-6">
          Velox does not offer public self-service registration. Print stores and operator accounts
          are provisioned exclusively by authorized <strong>Velox Partners</strong>.
        </p>

        <div className="text-left bg-surface/60 rounded-xl p-4 border border-border/80 space-y-3 mb-6 text-xs">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>
              <strong>Shop Owners:</strong> Your store and counter credentials are created directly
              by your regional Velox Partner.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>
              <strong>Customers:</strong> No account or login required! Point your phone camera at
              any Velox Counter QR stand to print immediately.
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          <Link
            href="/shop-owner/login"
            className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold text-xs py-2.5 px-4 rounded-xl shadow-sm hover:opacity-90 transition-opacity"
          >
            <span>Go to Shop Owner Login</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <Link
            href="/partner/login"
            className="w-full inline-flex items-center justify-center gap-2 bg-surface hover:bg-surface/80 border border-border text-foreground font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
            <span>Velox Partner Portal</span>
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-border text-center text-xs text-muted">
          Already have general user credentials?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Standard Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
