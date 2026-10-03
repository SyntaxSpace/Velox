import Link from 'next/link';
import Image from 'next/image';

export function ShopDashboard() {
  const orders = [
    {
      id: 'A15',
      name: 'assignment.pdf',
      pages: '12',
      type: 'B&W',
      status: 'Printing',
      statusClass: 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]/60',
    },
    {
      id: 'A14',
      name: 'project_report.pdf',
      pages: '28',
      type: 'Color',
      status: 'Waiting',
      statusClass: 'bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA]/60',
    },
    {
      id: 'A13',
      name: 'notes.pdf',
      pages: '6',
      type: 'B&W',
      status: 'Completed',
      statusClass: 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]/60',
    },
    {
      id: 'A12',
      name: 'presentation.pdf',
      pages: '20',
      type: 'Color',
      status: 'Completed',
      statusClass: 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]/60',
    },
  ];

  return (
    <section
      id="for-shops"
      className="py-24 md:py-36 bg-white overflow-hidden border-t border-[#F5F5F5]"
    >
      <div className="max-w-[1240px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
        {/* Left Column: Pitch */}
        <div className="lg:col-span-5 flex flex-col items-start z-10">
          <div className="mb-4">
            <span className="text-[12px] md:text-[13px] font-bold tracking-[0.26em] text-[#71717A] uppercase select-none">
              F O R &nbsp; S H O P &nbsp; O W N E R S
            </span>
          </div>

          <h2 className="text-[38px] sm:text-[46px] md:text-[52px] font-extrabold tracking-[-0.035em] text-[#050505] leading-[1.08] mb-6">
            Run your print shop
            <br />
            smarter with Velox.
          </h2>

          <p className="text-[17px] text-[#667085] leading-relaxed mb-9 max-w-md">
            Manage orders, printers, payments and queue all in one simple dashboard.
          </p>

          <Link
            href="#for-shops"
            className="inline-flex items-center justify-center rounded-full bg-[#050505] text-white px-8 py-3.5 text-[15px] font-medium hover:bg-[#1a1a1a] active:scale-[0.98] transition-all duration-200 shadow-[0_2px_10px_rgba(0,0,0,0.1)] group"
          >
            <span>Learn More</span>
            <span className="ml-2 transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>

        {/* Right Column: Premium Hardware Display Frame */}
        <div className="lg:col-span-7 relative w-full">
          {/* Subtle Ambient Drop Glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-orange-500/5 blur-2xl rounded-[32px] -z-10" />

          {/* Device Mockup Shell */}
          <div className="w-full bg-[#18181B] p-2.5 sm:p-3 rounded-[26px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] border border-[#27272A] relative">
            {/* Camera dot */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#3F3F46]" />

            {/* Screen Inner */}
            <div className="w-full bg-white rounded-[18px] overflow-hidden border border-[#E4E4E7]/60 flex flex-col text-[#050505]">
              {/* Screen Top Header */}
              <div className="h-14 px-6 border-b border-[#F0F0F0] flex items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                  <div className="relative h-5 w-20">
                    <Image
                      src="/velox-wordmark.png"
                      alt="Velox"
                      fill
                      className="object-contain object-left"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                  <span className="text-[12px] font-medium text-[#18181B]">Printer Online</span>
                </div>
              </div>

              {/* Dashboard Layout */}
              <div className="flex min-h-[380px] bg-white">
                {/* Left Mini Sidebar */}
                <div className="w-44 sm:w-48 border-r border-[#F0F0F0] p-3 flex flex-col gap-1.5 bg-[#FCFCFD]">
                  {/* Active Orders */}
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#EFF6FF] text-[#2563EB] text-[13px] font-semibold">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="7" height="9" />
                      <rect x="14" y="3" width="7" height="5" />
                      <rect x="14" y="12" width="7" height="9" />
                      <rect x="3" y="16" width="7" height="5" />
                    </svg>
                    <span>Orders</span>
                  </div>

                  {/* Printers */}
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#71717A] hover:text-[#050505] text-[13px] font-medium transition-colors">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" rx="1" />
                    </svg>
                    <span>Printers</span>
                  </div>

                  {/* Payments */}
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#71717A] hover:text-[#050505] text-[13px] font-medium transition-colors">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                    <span>Payments</span>
                  </div>

                  {/* Analytics */}
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#71717A] hover:text-[#050505] text-[13px] font-medium transition-colors">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    <span>Analytics</span>
                  </div>

                  {/* Settings */}
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#71717A] hover:text-[#050505] text-[13px] font-medium transition-colors mt-auto">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span>Settings</span>
                  </div>
                </div>

                {/* Right Orders Workspace */}
                <div className="flex-1 p-5 sm:p-6 overflow-x-auto">
                  <h4 className="text-[20px] font-bold text-[#050505] mb-4 tracking-tight">
                    Orders
                  </h4>

                  {/* Tabs */}
                  <div className="flex items-center gap-6 border-b border-[#F0F0F0] mb-5 text-[13px]">
                    <span className="font-semibold text-[#050505] pb-2 border-b-2 border-[#050505]">
                      All
                    </span>
                    <span className="font-medium text-[#71717A] hover:text-[#050505] pb-2 cursor-pointer">
                      Printing
                    </span>
                    <span className="font-medium text-[#71717A] hover:text-[#050505] pb-2 cursor-pointer">
                      Completed
                    </span>
                    <span className="font-medium text-[#71717A] hover:text-[#050505] pb-2 cursor-pointer">
                      Cancelled
                    </span>
                  </div>

                  {/* Table Header */}
                  <div className="grid grid-cols-12 text-[11px] font-semibold text-[#98A2B3] pb-2.5 px-2 border-b border-[#F4F4F5]">
                    <div className="col-span-1">#</div>
                    <div className="col-span-5">File Name</div>
                    <div className="col-span-2">Pages</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-2 text-right">Status</div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-[#F4F4F5]">
                    {orders.map((order, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-12 items-center py-3 px-2 text-[12px] sm:text-[13px] hover:bg-[#FAFAFA] rounded-md transition-colors"
                      >
                        <div className="col-span-1 font-semibold text-[#050505]">{order.id}</div>
                        <div className="col-span-5 flex items-center gap-2 truncate text-[#18181B] font-medium pr-2">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-[#98A2B3] flex-shrink-0"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span className="truncate">{order.name}</span>
                        </div>
                        <div className="col-span-2 text-[#71717A]">{order.pages}</div>
                        <div className="col-span-2 text-[#71717A]">{order.type}</div>
                        <div className="col-span-2 text-right">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${order.statusClass}`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
