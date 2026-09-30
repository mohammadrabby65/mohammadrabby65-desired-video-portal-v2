import { useState, useEffect } from "react";
import { ArrowRight, XCircle } from "lucide-react";

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
          <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-6 h-6 text-neutral-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Access Unavailable</h2>
          <p className="text-neutral-400 text-sm sm:text-base mb-6">
            You must be 18 years or older to access DesiredHub.
          </p>
          <button
            onClick={() => {
              window.location.href = "https://www.google.com";
            }}
            className="w-full py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-xl transition-colors focus:ring-2 focus:ring-neutral-600 focus:outline-none cursor-pointer"
          >
            Leave
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-neutral-950/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="18+ Age Notice"
    >
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl relative my-auto">
        <div className="mb-4">
          <span className="inline-block px-3.5 py-1 bg-red-600/15 border border-red-500/30 text-red-400 font-bold text-xs tracking-wider uppercase rounded-full">
            18+ Adults Only
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
          18+ Adults Only
        </h1>

        <p className="text-neutral-300 text-sm sm:text-base leading-relaxed mb-6">
          This website contains age-restricted adult content. You must be 18 or older, or the legal age of majority in your jurisdiction, to enter.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleVerify}
            className="w-full py-3.5 px-5 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm sm:text-base rounded-xl transition-colors shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 group focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
          >
            <span>I’m 18 or older — Enter</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={handleLeave}
            className="w-full py-3 px-5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-medium text-sm rounded-xl transition-colors border border-neutral-700/60 focus:ring-2 focus:ring-neutral-600 focus:outline-none cursor-pointer"
          >
            Leave
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-800/80 text-xs text-neutral-400">
          By entering, you confirm you are 18 years of age or older.
        </div>
      </div>
    </div>
  );
}

export default AgeGate;
