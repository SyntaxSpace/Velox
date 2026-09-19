import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-center">
      <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter mb-4 text-primary">
        404
      </h1>
      <h2 className="text-2xl font-bold mb-6">Page not found</h2>
      <p className="text-muted mb-8 max-w-md">
        Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
      </p>
      <Link
        href="/"
        className="bg-primary text-primary-foreground font-medium py-2 px-6 rounded-md hover:opacity-90 transition-opacity"
      >
        Go back home
      </Link>
    </div>
  );
}
