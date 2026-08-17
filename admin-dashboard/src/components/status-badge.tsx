import { cn } from "@/lib/utils";

const VARIANTS: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  invited: "bg-amber-50 text-amber-700 ring-amber-200",
  refunded: "bg-slate-100 text-slate-600 ring-slate-200",
  suspended: "bg-red-50 text-red-700 ring-red-200",
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1",
        VARIANTS[status] ?? "bg-slate-100 text-slate-600 ring-slate-200",
      )}
    >
      {label ?? status}
    </span>
  );
}
