'use client';

import Link from 'next/link';

interface VeloxLogoProps {
  className?: string;
  href?: string;
  alt?: string;
}

/**
 * Velox Brand Logo Component
 * Renders the official brand logo with locked aspect-ratio to ensure zero stretching.
 * Automatically adapts between light and dark backgrounds.
 */
export default function VeloxLogo({
  className = 'h-7 w-auto',
  href,
  alt = 'Velox',
}: VeloxLogoProps) {
  const logoContent = (
    <div className={`inline-flex items-center select-none shrink-0 ${className}`}>
      {/* Light theme logo */}
      <img
        src="/velox-logo.png"
        alt={alt}
        className="h-full w-auto max-h-full object-contain block dark:hidden select-none pointer-events-none"
      />
      {/* Dark theme logo */}
      <img
        src="/velox-logo-white.png"
        alt={alt}
        className="h-full w-auto max-h-full object-contain hidden dark:block select-none pointer-events-none"
      />
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center transition-opacity hover:opacity-90 shrink-0"
      >
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
