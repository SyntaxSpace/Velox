import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { AudienceSection } from '@/components/landing/AudienceSection';
import { ShopDashboard } from '@/components/landing/ShopDashboard';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="velox-page flex min-h-screen flex-col bg-white font-sans text-[#050505] antialiased selection:bg-[#2563EB]/20">
      <Navbar />
      <main className="flex-1">
        <div id="features">
          <Hero />
        </div>
        <HowItWorks />
        <AudienceSection />
        <ShopDashboard />
        <CTA />
      </main>
      <div id="contact">
        <Footer />
      </div>
      <style>{`
        .velox-page {
          --velox-ink: #050505;
          --velox-muted: #667085;
          --velox-border: #eaeaea;
          overflow-x: clip;
        }

        .velox-page > header > div {
          height: 68px;
          max-width: 1200px;
        }

        .velox-page > header > div > a:first-child > div {
          height: 28px;
          display: flex;
          align-items: center;
        }

        .velox-page footer img {
          filter: brightness(0) invert(1) !important;
        }

        .velox-page #features > section {
          padding-block: 38px 50px;
        }

        .velox-page #features > section > div {
          max-width: 1200px;
          column-gap: 32px;
        }

        .velox-page #features h1 {
          margin-bottom: 18px;
          font-size: 54px;
          line-height: 1.02;
          letter-spacing: 0;
        }

        .velox-page #features h1 span:last-child {
          white-space: nowrap;
        }

        .velox-page #features > section > div > div:last-child > div {
          max-width: 560px;
          aspect-ratio: 1.25;
          background: url('/phone_qrcocode_stand.png') center / contain no-repeat;
        }

        .velox-page #features > section > div > div:last-child > div > img {
          opacity: 0 !important;
        }

        .velox-page #features > section > div > div:first-child > div:nth-child(3) {
          margin-bottom: 28px;
        }

        .velox-page main > section {
          padding-block: 58px;
        }

        .velox-page #how-it-works > div,
        .velox-page #for-shops > div {
          max-width: 1200px;
        }

        .velox-page #how-it-works > div > div:first-child {
          margin-bottom: 32px;
        }

        .velox-page #how-it-works h2 {
          font-size: 42px;
          line-height: 1.08;
          letter-spacing: 0;
        }

        .velox-page #how-it-works > div > div:last-child > div > div:first-child {
          padding: 22px 20px;
          border-radius: 14px;
        }

        .velox-page main > section:nth-of-type(2) > div {
          max-width: 1200px;
          column-gap: 48px;
        }

        .velox-page main > section:nth-of-type(2) > div > div:first-child > div {
          max-width: 440px;
          aspect-ratio: 1.45;
        }

        .velox-page main > section:nth-of-type(2) > div > div:last-child {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(190px, 0.75fr);
          align-items: center;
          column-gap: 24px;
        }

        .velox-page main > section:nth-of-type(2) > div > div:last-child > :nth-child(-n + 3) {
          grid-column: 1;
        }

        .velox-page main > section:nth-of-type(2) h2,
        .velox-page #for-shops h2 {
          font-size: 42px;
          line-height: 1.06;
          letter-spacing: 0;
        }

        .velox-page main > section:nth-of-type(2) > div > div:last-child > p {
          margin-bottom: 0;
        }

        .velox-page main > section:nth-of-type(2) > div > div:last-child > div:last-child {
          grid-column: 2;
          grid-row: 1 / span 4;
          padding-left: 20px;
          border-left: 1px solid var(--velox-border);
          gap: 14px;
        }

        .velox-page #for-shops > div {
          column-gap: 40px;
        }

        .velox-page #for-shops > div > div:last-child > div > div > div:last-child {
          min-height: 310px;
        }

        .velox-page #get-started {
          padding-block: 72px;
        }

        .velox-page #get-started h2 {
          font-size: 44px;
          line-height: 1.08;
          letter-spacing: 0;
        }

        .velox-page #get-started > div > div:nth-last-child(1) {
          margin-bottom: 0;
        }

        @media (max-width: 1023px) {
          .velox-page #features h1 {
            font-size: 48px;
          }

          .velox-page #features h1 span:last-child {
            white-space: normal;
          }

          .velox-page main > section:nth-of-type(2) > div > div:last-child {
            grid-template-columns: minmax(0, 1fr) minmax(180px, 0.75fr);
          }

          .velox-page #for-shops > div > div:last-child > div > div > div:last-child {
            min-height: 280px;
          }
        }

        @media (max-width: 767px) {
          .velox-page > header > div {
            height: 64px;
          }

          .velox-page #features > section {
            padding-block: 34px 42px;
          }

          .velox-page #features h1 {
            font-size: 42px;
          }

          .velox-page #features > section > div > div:last-child > div {
            max-width: 480px;
            aspect-ratio: 1.2;
          }

          .velox-page main > section {
            padding-block: 44px;
          }

          .velox-page #how-it-works h2,
          .velox-page main > section:nth-of-type(2) h2,
          .velox-page #for-shops h2,
          .velox-page #get-started h2 {
            font-size: 34px;
          }

          .velox-page main > section:nth-of-type(2) > div > div:last-child {
            display: flex;
          }

          .velox-page main > section:nth-of-type(2) > div > div:last-child > div:last-child {
            padding: 0;
            border: 0;
          }

          .velox-page #for-shops > div > div:last-child > div > div > div:last-child {
            min-height: 280px;
          }

          .velox-page #get-started {
            padding-block: 56px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .velox-page *,
          .velox-page *::before,
          .velox-page *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
