import Link from 'next/link';

export function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Upload',
      desc: 'Upload your PDF and choose your print settings.',
      iconColor: 'text-[#2563EB]',
      icon: (
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="12" y2="12" />
          <line x1="15" y1="15" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      num: '02',
      title: 'Pay',
      desc: 'Make a quick and secure UPI payment.',
      iconColor: 'text-[#EC4899]',
      icon: (
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <line x1="6" y1="15" x2="10" y2="15" />
        </svg>
      ),
    },
    {
      num: '03',
      title: 'Track',
      desc: 'See real-time queue updates.',
      iconColor: 'text-[#F97316]',
      icon: (
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      num: '04',
      title: 'Pickup',
      desc: 'Get your prints at the counter with a unique code.',
      iconColor: 'text-[#16A34A]',
      icon: (
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" rx="1" />
        </svg>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-white border-t border-[#F5F5F5]">
      <div className="max-w-[1240px] mx-auto px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <div className="mb-3">
              <span className="text-[12px] md:text-[13px] font-bold tracking-[0.26em] text-[#71717A] uppercase select-none">
                H O W &nbsp; V E L O X &nbsp; W O R K S
              </span>
            </div>
            <h2 className="text-[34px] sm:text-[42px] md:text-[48px] font-extrabold tracking-[-0.035em] text-[#050505] leading-[1.12]">
              From file to print
              <br />
              in just a few steps.
            </h2>
          </div>

          <div>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#F4F4F6] text-[#050505] text-[13px] font-semibold hover:bg-[#EAEAEF] transition-colors"
            >
              <span>See Full Process</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Process Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch relative">
          {steps.map((step, idx) => (
            <div key={idx} className="relative flex items-center">
              {/* Card Container */}
              <div className="w-full bg-white border border-[#EAEAEA] rounded-[22px] p-7 md:p-8 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#D4D4D8] hover:shadow-[0_12px_32px_rgba(0,0,0,0.04)] h-full">
                {/* Step Number */}
                <div className="w-full text-left text-[13px] font-medium text-[#98A2B3] mb-6">
                  {step.num}
                </div>

                {/* Accent Icon */}
                <div className={`mb-5 ${step.iconColor}`}>{step.icon}</div>

                {/* Title */}
                <h3 className="text-[19px] font-bold text-[#050505] mb-2.5 tracking-tight">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-[13px] text-[#667085] leading-relaxed">{step.desc}</p>
              </div>

              {/* Arrow separator (desktop only) */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-[#98A2B3] pointer-events-none items-center justify-center">
                  <span className="text-base font-normal">→</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
