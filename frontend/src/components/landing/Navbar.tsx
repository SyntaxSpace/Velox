'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#F0F0F0] transition-all">
      <div className="max-w-[1240px] mx-auto px-6 h-20 flex items-center justify-between">
        {/* Left: Brand Logo from Assets */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative h-7 flex items-center">
            <Image
              src="/velox-logo.png"
              alt="Velox"
              width={140}
              height={49}
              className="h-7 w-auto object-contain object-left"
              priority
            />
          </div>
        </Link>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-9">
          <div className="relative py-2">
            <Link href="/" className="text-[14px] font-semibold text-[#050505] transition-colors">
              Home
            </Link>
            {/* Active indicator bar matching reference image */}
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#050505] rounded-full" />
          </div>

          <Link
            href="#features"
            className="text-[14px] font-medium text-[#667085] hover:text-[#050505] transition-colors"
          >
            Features
          </Link>

          <Link
            href="#how-it-works"
            className="text-[14px] font-medium text-[#667085] hover:text-[#050505] transition-colors"
          >
            How it works
          </Link>

          <Link
            href="#for-shops"
            className="text-[14px] font-medium text-[#667085] hover:text-[#050505] transition-colors"
          >
            For Shops
          </Link>

          <Link
            href="#pricing"
            className="text-[14px] font-medium text-[#667085] hover:text-[#050505] transition-colors"
          >
            Pricing
          </Link>

          <Link
            href="#contact"
            className="text-[14px] font-medium text-[#667085] hover:text-[#050505] transition-colors"
          >
            Contact
          </Link>
        </nav>

        {/* Right: Black Pill Button */}
        <div className="flex items-center gap-4">
          <Link
            href="#get-started"
            className="hidden sm:inline-flex items-center justify-center rounded-full bg-[#050505] text-white px-6 py-2.5 text-[14px] font-medium hover:bg-[#1f1f1f] active:scale-[0.98] transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.06)] group"
          >
            <span>Get Started</span>
            <span className="ml-1.5 transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>

          {/* Mobile menu hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#050505] hover:bg-neutral-100 rounded-lg transition-colors"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#F0F0F0] px-6 py-6 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-semibold text-[#050505]"
          >
            Home
          </Link>
          <Link
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-medium text-[#667085] hover:text-[#050505]"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-medium text-[#667085] hover:text-[#050505]"
          >
            How it works
          </Link>
          <Link
            href="#for-shops"
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-medium text-[#667085] hover:text-[#050505]"
          >
            For Shops
          </Link>
          <Link
            href="#pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-medium text-[#667085] hover:text-[#050505]"
          >
            Pricing
          </Link>
          <Link
            href="#contact"
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-medium text-[#667085] hover:text-[#050505]"
          >
            Contact
          </Link>
          <div className="pt-2">
            <Link
              href="#get-started"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex w-full items-center justify-center rounded-full bg-[#050505] text-white px-6 py-3 text-sm font-medium hover:bg-[#1f1f1f]"
            >
              Get Started →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
