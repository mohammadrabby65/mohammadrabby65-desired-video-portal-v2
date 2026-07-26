import { memo } from 'react';

export const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-video rounded-xl bg-neutral-900 border border-neutral-800 w-full relative overflow-hidden">
        <div className="absolute inset-0 bg-neutral-800/20 rounded-xl" />
      </div>
      <div className="space-y-2.5 px-1 mt-1">
        <div className="h-4 bg-neutral-900 rounded-md w-full" />
        <div className="h-4 bg-neutral-900 rounded-md w-3/4" />
        <div className="h-3.5 bg-neutral-900 rounded-md w-2/5 mt-3" />
      </div>
    </div>
  );
});
