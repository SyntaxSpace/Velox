import Image from 'next/image';

export function AudienceSection() {
  const categories = [
    {
      label: 'Assignments',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      ),
    },
    {
      label: 'Project Reports',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      ),
    },
    {
      label: 'Presentations',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
    {
      label: 'Notes & Study Material',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      ),
    },
    {
      label: 'Official Documents',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-24 md:py-36 bg-white overflow-hidden border-t border-[#F5F5F5]">
      <div className="max-w-[1240px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left Column: Official Stack of Pages from Assets */}
        <div className="lg:col-span-6 relative flex items-center justify-center">
          <div className="relative w-full max-w-[520px] aspect-[1.3/1] transition-transform duration-700 hover:scale-[1.02]">
            <Image
              src="/pages_stack.png"
              alt="Velox Printed Pages Stack"
              fill
              sizes="(max-width: 768px) 100vw, 500px"
              className="object-contain object-center drop-shadow-[0_24px_48px_rgba(0,0,0,0.06)]"
              priority
            />
          </div>
        </div>

        {/* Right Column: Editorial Copy & Minimal List */}
        <div className="lg:col-span-6 flex flex-col items-start">
          <div className="mb-4">
            <span className="text-[12px] md:text-[13px] font-bold tracking-[0.26em] text-[#71717A] uppercase select-none">
              B U I L T &nbsp; F O R &nbsp; E V E R Y O N E
            </span>
          </div>

          <h2 className="text-[38px] sm:text-[46px] md:text-[52px] font-extrabold tracking-[-0.035em] text-[#050505] leading-[1.08] mb-6">
            <span>For Students.</span>
            <br />
            <span>Creators. Professionals.</span>
            <br />
            <span className="bg-gradient-to-r from-[#2563EB] via-[#8B5CF6] via-[#EC4899] to-[#F97316] bg-clip-text text-transparent">
              Everyone.
            </span>
          </h2>

          <p className="text-[17px] text-[#667085] leading-relaxed mb-9 max-w-lg">
            Notes, assignments, project reports, presentations and more — printed easily.
          </p>

          {/* Minimal Feature List matching reference */}
          <div className="flex flex-col gap-4 w-full max-w-md">
            {categories.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3.5 group">
                <div className="text-[#3F3F46] group-hover:text-[#050505] transition-colors">
                  {item.icon}
                </div>
                <span className="text-[15px] font-medium text-[#18181B] tracking-tight">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
