import { cn } from "@/lib/utils";

export function AggCard({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100 dark:bg-slate-800/50 dark:ring-slate-700">
      <p className="text-xs text-slate-600 dark:text-slate-300">{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate text-base font-bold text-slate-900 dark:text-slate-50",
          loading && "animate-pulse text-slate-600 dark:text-slate-200",
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 truncate text-[11px] text-slate-600 dark:text-slate-300">
          {sub}
        </p>
      )}
    </div>
  );
}
