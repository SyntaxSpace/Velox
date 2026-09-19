'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-center">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-muted mb-8 max-w-md">An unexpected error occurred. Please try again.</p>
      <button
        onClick={() => reset()}
        className="bg-primary text-primary-foreground font-medium py-2 px-6 rounded-md hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  );
}
