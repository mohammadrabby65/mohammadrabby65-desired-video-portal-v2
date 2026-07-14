import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Sparkles } from 'lucide-react';

interface TelegramPopupProps {
  onClose?: () => void;
}

export function TelegramPopup({ onClose }: TelegramPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Check if user has already seen the popup
    const hasSeen = localStorage.getItem('desiredhub_home_popup_seen');
    if (!hasSeen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000); // 1 second delay
      return () => clearTimeout(timer);
    }
  }, []);

  // Handle Close & set localStorage
  const handleClose = () => {
    localStorage.setItem('desiredhub_home_popup_seen', 'true');
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
  };

  // Handle Telegram Join Link Click
  const handleJoin = () => {
    window.open('https://telegram.me/+km7ZYCx-QaYyYTU1', '_blank', 'noopener,noreferrer');
    handleClose();
  };

  // Handle Keyboard (ESC key to close and Tab trapping)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }

      if (e.key === 'Tab' && containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Auto focus the main CTA when opened for accessibility
    setTimeout(() => {
      if (triggerButtonRef.current) {
        triggerButtonRef.current.focus();
      }
    }, 100);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur/Dim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Premium Glassmorphism Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="popup-title"
            aria-describedby="popup-desc"
            className="relative w-full max-w-md overflow-hidden rounded-[24px] border border-neutral-800 bg-neutral-950/90 p-6 shadow-2xl backdrop-blur-xl md:p-8"
          >
            {/* Ambient Background Gradient Glows */}
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-red-600/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={handleClose}
              aria-label="Close dialog"
              className="absolute right-4 top-4 rounded-full p-1.5 text-neutral-400 hover:bg-neutral-800/80 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Telegram Icon with visual rings */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500 ring-4 ring-red-500/5">
                <Send className="h-7 w-7 rotate-[-20deg] transform" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 p-0.5 text-[9px] text-white font-bold animate-pulse">
                  !
                </span>
              </div>

              {/* Premium Access Badge */}
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500 tracking-wide border border-red-500/20">
                <Sparkles className="h-3 w-3 animate-pulse" />
                PREMIUM ACCESS
              </div>

              {/* Popup Title */}
              <h2
                id="popup-title"
                className="mb-3 text-2xl font-extrabold text-white tracking-tight"
              >
                🔥 Join More Premium Viral Videos
              </h2>

              {/* Popup Description */}
              <p
                id="popup-desc"
                className="mb-8 text-neutral-300 text-sm leading-relaxed max-w-sm"
              >
                Get instant access to exclusive premium viral videos, daily updates, and early releases.
              </p>

              {/* CTA Buttons */}
              <div className="flex w-full flex-col gap-3">
                <button
                  ref={triggerButtonRef}
                  onClick={handleJoin}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 py-3.5 px-4 text-sm font-bold text-white shadow-lg hover:from-red-500 hover:to-red-400 transition-all duration-200 hover:shadow-red-500/15 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-neutral-950 active:scale-[0.98]"
                >
                  <Send className="h-4 w-4" />
                  🚀 Join Telegram
                </button>

                <button
                  onClick={handleClose}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900/50 py-3 px-4 text-sm font-semibold text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-700"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
