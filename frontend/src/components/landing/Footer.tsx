import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-[#050505] text-white py-20 px-6 border-t border-[#1C1C1E]">
      <div className="max-w-[1240px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-8 mb-16">
          {/* Brand Column */}
          <div className="col-span-2 flex flex-col items-start pr-6">
            <Link href="/" className="inline-block mb-4">
              <div className="relative h-7 w-28">
                <Image
                  src="/velox-wordmark-white.png"
                  alt="Velox"
                  width={140}
                  height={34}
                  className="h-7 w-auto object-contain object-left"
                />
              </div>
            </Link>
            <p className="text-[#8E8E93] text-[14px] leading-relaxed max-w-sm">
              Fast, simple, and secure QR-based smart printing for shops, campuses, and creators.
            </p>
          </div>

          {/* Product Links */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[13px] font-semibold text-white tracking-wider uppercase mb-1">
              Product
            </h4>
            <Link
              href="#features"
              className="text-[14px] text-[#A1A1A6] hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-[14px] text-[#A1A1A6] hover:text-white transition-colors"
            >
              How it works
            </Link>
            <Link
              href="#pricing"
              className="text-[14px] text-[#A1A1A6] hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="#for-shops"
              className="text-[14px] text-[#A1A1A6] hover:text-white transition-colors"
            >
              For Shops
            </Link>
          </div>

          {/* Company Links */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[13px] font-semibold text-white tracking-wider uppercase mb-1">
              Company
            </h4>
            <Link
              href="#"
              className="text-[14px] text-[#A1A1A6] hover:text-white transition-colors"
            >
              About
            </Link>
            <Link
              href="#"
              className="text-[14px] text-[#A1A1A6] hover:text-white transition-colors"
            >
              Contact
            </Link>
            <Link
              href="#"
              className="text-[14px] text-[#A1A1A6] hover:text-white transition-colors"
            >
              Careers
            </Link>
          </div>

          {/* Legal Links */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[13px] font-semibold text-white tracking-wider uppercase mb-1">
              Legal
            </h4>
            <Link
              href="#"
              className="text-[14px] text-[#A1A1A6] hover:text-white transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="text-[14px] text-[#A1A1A6] hover:text-white transition-colors"
            >
              Terms
            </Link>
            <Link
              href="#"
              className="text-[14px] text-[#A1A1A6] hover:text-white transition-colors"
            >
              Security
            </Link>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 border-t border-[#1C1C1E] flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-[#71717A]">
          <p>© 2026 Velox. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Prints Ahead™</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
