import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

export function TelegramWelcomeCard() {
  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    // Check if the user has already dismissed the card
    const hasJoined = localStorage.getItem('hasJoinedTelegram_welcome');
    if (!hasJoined) {
      setIsRendered(true);
      // Small delay to make it feel natural
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleJoin = () => {
    window.open('https://t.me/+WBulzWgERLA4Nzhl', '_blank');
  };

  const handleDismiss = () => {
    localStorage.setItem('hasJoinedTelegram_welcome', 'true');
    setIsVisible(false);
    setTimeout(() => setIsRendered(false), 400); // Wait for transition
  };

  if (!isRendered) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-50",
        "w-auto md:w-[400px] transition-all duration-500 ease-out",
        isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-12 scale-95 pointer-events-none"
      )}
    >
      <div className="relative overflow-hidden rounded-2xl bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-2xl p-6">
        {/* Gradient accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-blue-600" />
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex-shrink-0 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.26-5.61 3.71-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.41-1.44-.87.03-.24.36-.49.99-.74 3.86-1.68 6.43-2.79 7.73-3.33 3.67-1.53 4.43-1.79 4.92-1.8.11 0 .35.03.49.15.11.1.15.23.16.35-.01.07-.01.19-.03.29z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white leading-tight">
              🚀 Unlock Unlimited Viral Videos
            </h3>
          </div>
          
          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Join our official Telegram community to get more viral sex videos, premium content, early uploads, and daily updates before anyone else.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <button
              onClick={handleJoin}
              className="flex-1 py-2.5 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors text-sm text-center shadow-lg shadow-blue-500/25"
            >
              Join Telegram
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-medium rounded-xl transition-colors text-sm text-center"
            >
              I Have Joined
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
