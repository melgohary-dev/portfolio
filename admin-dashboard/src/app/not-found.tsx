import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">404 — Page not found</h2>
      <p className="text-sm text-slate-500">The page you are looking for does not exist.</p>
      <Link
        href="/"
        className="mt-2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
