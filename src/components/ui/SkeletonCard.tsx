import { memo } from "react";

export const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="flex flex-col gap-1 sm:gap-2.5 animate-pulse min-w-0">
      <div className="aspect-video rounded-lg sm:rounded-xl bg-neutral-900 border border-white/[0.07] w-full relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] via-white/[0.04] to-white/[0.01]" />
        <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 h-3.5 sm:h-4 w-9 sm:w-11 rounded bg-white/[0.06]" />
      </div>
      <div className="flex flex-col gap-1 sm:gap-1.5 px-0.5">
        <div className="h-3.5 sm:h-4 bg-neutral-900 rounded-md w-11/12" />
        <div className="h-3 sm:h-3.5 bg-neutral-900/70 rounded-md w-2/3" />
      </div>
    </div>
  );
});

export const HeroSpotlightSkeleton = memo(function HeroSpotlightSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 rounded-xl sm:rounded-2xl overflow-hidden bg-neutral-900/70 border border-white/[0.08] animate-pulse">
      <div className="lg:col-span-7 w-full h-[154px] sm:h-[190px] lg:h-auto lg:aspect-video bg-neutral-900 relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] via-white/[0.04] to-white/[0.01]" />
      </div>
      <div className="lg:col-span-5 px-3 py-2 sm:p-5 lg:p-8 flex flex-col justify-between gap-1.5 sm:gap-4">
        <div className="space-y-1 sm:space-y-3 lg:space-y-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-3.5 sm:h-5 w-20 sm:w-24 rounded bg-white/[0.08]" />
            <div className="h-3.5 sm:h-5 w-10 sm:w-12 rounded bg-white/[0.05]" />
          </div>
          <div className="h-4 sm:h-7 bg-white/[0.08] rounded-md sm:rounded-lg w-full" />
          <div className="h-4 sm:h-7 bg-white/[0.06] rounded-md sm:rounded-lg w-3/4" />
          <div className="h-3 sm:h-4 bg-white/[0.05] rounded w-1/2" />
        </div>
        <div className="pt-0.5 lg:pt-2">
          <div className="h-7 sm:h-11 w-24 sm:w-40 rounded-md sm:rounded-xl bg-white/[0.08]" />
        </div>
      </div>
    </div>
  );
});
