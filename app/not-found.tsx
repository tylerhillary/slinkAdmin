import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="text-center">
        <p className="text-2xs font-semibold uppercase tracking-widest text-content-subtle">
          404
        </p>
        <h1 className="mt-2 text-lg font-semibold text-content">Page not found</h1>
        <p className="mt-1.5 max-w-sm text-sm text-content-muted">
          This route does not exist in the admin console.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}
