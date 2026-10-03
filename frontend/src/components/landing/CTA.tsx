import Link from 'next/link';

export function CTA() {
  return (
    <section
      id="get-started"
      className="relative py-28 md:py-36 bg-white overflow-hidden border-t border-[#F5F5F5]"
    >
      {/* Subtle Technical Dot Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.45]"
        style={{
          backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Iridescent Corner Accent Waves matching reference image */}
      {/* Bottom Left Soft Blue/Purple Accent */}
      <div className="absolute -bottom-24 -left-24 w-[420px] h-[320px] bg-gradient-to-tr from-[#3B82F6]/15 via-[#8B5CF6]/10 to-transparent blur-3xl pointer-events-none rounded-full" />
      {/* Bottom Right Soft Orange/Pink Accent */}
      <div className="absolute -bottom-24 -right-24 w-[420px] h-[320px] bg-gradient-to-tl from-[#F97316]/15 via-[#EC4899]/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      {/* Content */}
      <div className="relative z-10 max-w-[1000px] mx-auto px-6 text-center">
        <div className="mb-5">
          <span className="text-[12px] md:text-[13px] font-bold tracking-[0.26em] text-[#71717A] uppercase select-none">
            R E A D Y &nbsp; T O &nbsp; G E T &nbsp; S T A R T E D ?
          </span>
        </div>

        <h2 className="text-[36px] sm:text-[46px] md:text-[54px] font-extrabold tracking-[-0.035em] text-[#050505] leading-[1.12] mb-10 max-w-3xl mx-auto">
          Bring smarter printing to your shop with{' '}
          <span className="bg-gradient-to-r from-[#2563EB] via-[#8B5CF6] via-[#EC4899] to-[#F97316] bg-clip-text text-transparent">
            Velox.
          </span>
        </h2>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-[#050505] text-white px-8 py-3.5 text-[15px] font-medium hover:bg-[#1a1a1a] active:scale-[0.98] transition-all duration-200 shadow-[0_2px_10px_rgba(0,0,0,0.12)] group"
          >
            <span>Get Started</span>
            <span className="ml-2 transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>

          <Link
            href="#contact"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-white text-[#050505] border border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#FAFAFA] active:scale-[0.98] px-8 py-3.5 text-[15px] font-medium transition-all duration-200"
          >
            Contact Us
          </Link>
        </div>

        {/* Bottom Tagline */}
        <div className="flex items-center justify-center gap-4 text-[12px] font-bold tracking-[0.22em] text-[#98A2B3] select-none">
          <span>FAST</span>
          <span className="w-1 h-1 rounded-full bg-[#D4D4D8]" />
          <span>SIMPLE</span>
          <span className="w-1 h-1 rounded-full bg-[#D4D4D8]" />
          <span>SECURE</span>
        </div>
      </div>
    </section>
  );
}
