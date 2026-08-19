"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin Dashboard] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center" role="alert">
      <div className="rounded-2xl bg-red-50 p-6 ring-1 ring-red-100 dark:bg-red-950/30 dark:ring-red-900/50">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-red-500 dark:text-red-500">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        Try again
      </button>
    </div>
  );
}
