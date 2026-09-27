import { useState, useEffect } from "react";
import { ShieldAlert, ArrowRight, XCircle } from "lucide-react";

export function AgeGate() {
  const [isVerified, setIsVerified] = useState<boolean>(() => {
    return localStorage.getItem("desiredhub_age_verified") === "true";
  });
  const [hasLeft, setHasLeft] = useState<boolean>(false);

  useEffect(() => {
    if (!isVerified) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isVerified]);

  const handleVerify = () => {
    localStorage.setItem("desiredhub_age_verified", "true");
    setIsVerified(true);
  };

  const handleLeave = () => {
    setHasLeft(true);
  };

  if (isVerified) {
    return null;
  }

  if (hasLeft) {
    return (
      <div 
        className="fixed inset-0 z-[9999] bg-neutral-950 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Access Unavailable"
      >
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Access Unavailable</h2>
          <p className="text-neutral-400 text-sm sm:text-base mb-6">
            You must be 18 years or older to access DesiredHub. Access has been declined.
          </p>
          <button
            onClick={() => {
              window.location.href = "https://www.google.com";
            }}
            className="w-full py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-xl transition-colors focus:ring-2 focus:ring-neutral-600 focus:outline-none cursor-pointer"
          >
            Leave Site
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-neutral-950/95 backdrop-blur-lg flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Age Verification"
    >
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative my-auto">
        {/* Top Warning Icon Badge */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-600/10 border border-red-600/30 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
          <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
        </div>

        {/* Branding */}
        <div className="mb-2">
          <span className="inline-block px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs tracking-widest uppercase rounded-full">
            18+ Adults Only
          </span>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-3">
          Age Verification Required
        </h1>

        {/* Warning Description */}
        <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed mb-6">
          This website contains age-restricted adult entertainment. You must be at least 18 years of age (or the legal age of majority in your local jurisdiction) to enter and view content.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleVerify}
            className="w-full py-3.5 sm:py-4 px-5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold text-sm sm:text-base rounded-xl transition-all duration-200 shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 group focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
          >
            <span>I'm 18 or older — Enter DesiredHub</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={handleLeave}
            className="w-full py-3 px-5 bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-white font-medium text-xs sm:text-sm rounded-xl transition-colors border border-neutral-700/50 focus:ring-2 focus:ring-neutral-600 focus:outline-none cursor-pointer"
          >
            Leave
          </button>
        </div>

        {/* Footer legal note */}
        <div className="mt-6 pt-4 border-t border-neutral-800/60 text-[11px] sm:text-xs text-neutral-500">
          By entering, you confirm you are viewing this material voluntarily and that it is legal in your region.
        </div>
      </div>
    </div>
  );
}

export default AgeGate;
