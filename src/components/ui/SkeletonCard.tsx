export function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      <div className="aspect-video rounded-xl bg-neutral-900 border border-neutral-800 w-full" />
      <div className="space-y-2 px-0.5 mt-1">
        <div className="h-4 bg-neutral-900 rounded w-full" />
        <div className="h-4 bg-neutral-900 rounded w-4/5" />
        <div className="h-3 bg-neutral-900 rounded w-1/2 mt-2" />
      </div>
    </div>
  );
}
