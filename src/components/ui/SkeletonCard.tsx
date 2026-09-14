import { memo } from "react";

export const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-video rounded-lg bg-[#141417] border border-white/5 w-full relative overflow-hidden">
        <div className="absolute inset-0 bg-white/[0.02] rounded-lg" />
      </div>
      <div className="space-y-2.5 px-1 mt-1">
        <div className="h-4 bg-[#141417] rounded-md w-full" />
        <div className="h-4 bg-[#141417] rounded-md w-3/4" />
        <div className="h-3.5 bg-[#141417] rounded-md w-2/5 mt-3" />
      </div>
    </div>
  );
});
