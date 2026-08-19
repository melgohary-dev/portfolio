export default function Loading() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex items-center gap-3 text-slate-500">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  );
}
