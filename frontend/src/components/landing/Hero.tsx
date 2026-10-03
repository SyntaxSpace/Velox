import Image from 'next/image';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative pt-12 md:pt-16 pb-24 md:pb-32 overflow-hidden bg-white">
      <div className="max-w-[1240px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* Left Column: Copy & Value Propositions (7 cols on lg) */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col items-start z-10">
          {/* Eyebrow */}
          <div className="mb-6">
            <span className="text-[12px] md:text-[13px] font-bold tracking-[0.26em] text-[#71717A] uppercase select-none">
              P R I N T S &nbsp; A H E A D
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-[44px] sm:text-[58px] lg:text-[68px] xl:text-[76px] font-extrabold tracking-[-0.035em] leading-[1.06] text-[#050505] mb-6">
            <span className="block">Everything</span>
            <span className="block">you need to print.</span>
            <span className="block bg-gradient-to-r from-[#2563EB] via-[#8B5CF6] via-[#EC4899] to-[#F97316] bg-clip-text text-transparent pb-1">
              Nothing you don&apos;t.
            </span>
          </h1>

          {/* Subtext */}
          <div className="text-[17px] sm:text-[19px] text-[#667085] mb-9 leading-relaxed font-normal">
            <p>Velox makes printing fast, simple and secure.</p>
            <p>Scan. Upload. Pay. Track. Pick up.</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-14 w-full sm:w-auto">
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-full bg-[#050505] text-white px-8 py-3.5 text-[15px] font-medium hover:bg-[#1a1a1a] active:scale-[0.98] transition-all duration-200 shadow-[0_2px_10px_rgba(0,0,0,0.12)] group"
            >
              <span>See How It Works</span>
              <span className="ml-2 transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </Link>

            <Link
              href="#for-shops"
              className="inline-flex items-center justify-center rounded-full bg-white text-[#050505] border border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#FAFAFA] active:scale-[0.98] px-8 py-3.5 text-[15px] font-medium transition-all duration-200"
            >
              For Shop Owners
            </Link>
          </div>

          {/* 3 Value Propositions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 w-full pt-4 border-t border-[#F2F2F2]">
            {/* FAST */}
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2 text-[#2563EB] font-bold text-[13px] tracking-wide">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>FAST</span>
              </div>
              <p className="text-[13px] text-[#667085] leading-snug">
                Less waiting,
                <br className="hidden sm:block" /> more doing.
              </p>
            </div>

            {/* SIMPLE */}
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2 text-[#2563EB] font-bold text-[13px] tracking-wide">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                </svg>
                <span>SIMPLE</span>
              </div>
              <p className="text-[13px] text-[#667085] leading-snug">
                No sign up.
                <br className="hidden sm:block" /> Just print.
              </p>
            </div>

            {/* SECURE */}
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2 text-[#2563EB] font-bold text-[13px] tracking-wide">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>SECURE</span>
              </div>
              <p className="text-[13px] text-[#667085] leading-snug">
                Your documents
                <br className="hidden sm:block" /> vanish after printing.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: High-DPI Product Composition (Phone + QR Stand) */}
        <div className="lg:col-span-6 xl:col-span-6 relative flex justify-center lg:justify-end items-center">
          <div className="relative w-full max-w-[540px] lg:max-w-none aspect-[1.12/1] transition-transform duration-700 hover:scale-[1.01]">
            <Image
              src="/phone_qrcocode_stand.png"
              alt="Velox Smartphone customer app and Tabletop QR Stand"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
              className="object-contain object-center lg:object-right select-none drop-shadow-[0_20px_40px_rgba(0,0,0,0.06)]"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
