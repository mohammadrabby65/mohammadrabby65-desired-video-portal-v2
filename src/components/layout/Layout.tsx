import { useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Menu, Dices, ShieldAlert, Mail, Send, ChevronRight } from "lucide-react";
import { LiveSearch } from "./LiveSearch";
import { Sidebar } from "./Sidebar";
import { ScriptManager } from "./ScriptManager";

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isNavigatingRandom, setIsNavigatingRandom] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsMobileSearchOpen(false);
  }, [location.pathname, location.search]);

  const handleRandomVideo = async () => {
    if (isNavigatingRandom) return;
    setIsNavigatingRandom(true);
    try {
      const res = await fetch("/api/videos/random-slug");
      if (res.ok) {
        const data = await res.json();
        if (data.slug) {
          navigate(`/video/${data.slug}`);
        }
      }
    } catch (err) {
      console.error("Failed to fetch random video", err);
    } finally {
      setIsNavigatingRandom(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col w-full overflow-x-hidden relative selection:bg-primary/30 selection:text-white">
      <ScriptManager />
      <header className="sticky top-0 z-50 bg-neutral-950/90 backdrop-blur-xl border-b border-neutral-800">
        <div className="container mx-auto px-3 sm:px-6 lg:px-8 h-12 sm:h-16 flex items-center justify-between gap-2 sm:gap-6 relative">
          {/* Left Zone: Drawer Trigger & Brand Mark */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="h-9 w-9 sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center hover:bg-neutral-800/80 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
              aria-label="Open categories menu"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-200" />
            </button>
            <Link
              to="/"
              className="flex items-center min-w-0 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
            >
              <img
                src="https://i.ibb.co.com/ZzT2wvV0/Header-Logo-White-Version.png"
                alt="DesiredHub"
                className="h-6.5 sm:h-10 md:h-11 w-auto max-w-[125px] sm:max-w-[180px] object-contain dark:hidden"
                referrerPolicy="no-referrer"
              />
              <img
                src="https://i.ibb.co.com/SwNGJTLW/Header-Logo-black-Version.png"
                alt="DesiredHub"
                className="h-6.5 sm:h-10 md:h-11 w-auto max-w-[125px] sm:max-w-[180px] object-contain hidden dark:block"
                referrerPolicy="no-referrer"
              />
            </Link>
          </div>

          {/* Center & Right Zones: Search & Random Action */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <LiveSearch
              isMobileOpen={isMobileSearchOpen}
              onMobileToggle={setIsMobileSearchOpen}
            />
            <button
              type="button"
              onClick={handleRandomVideo}
              disabled={isNavigatingRandom}
              title="Watch a Random Video"
              aria-label="Watch a Random Video"
              className="h-9 w-9 sm:min-h-[44px] sm:min-w-[44px] sm:w-auto sm:px-3.5 flex items-center justify-center gap-2 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
            >
              <Dices
                className={`w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 ${
                  isNavigatingRandom ? "animate-spin" : ""
                }`}
              />
              <span className="hidden lg:inline text-xs font-semibold whitespace-nowrap">
                Random
              </span>
            </button>
          </div>
        </div>
      </header>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <Outlet />
      </main>

      {/* Dedicated DMCA / Abuse / Report Support Card */}
      <section aria-label="DMCA and Content Reporting" className="container mx-auto px-3.5 sm:px-6 lg:px-8 my-6 sm:my-10">
        <div className="max-w-5xl mx-auto bg-neutral-900/90 border border-neutral-800 rounded-xl sm:rounded-2xl p-4 sm:p-7 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    DMCA / Abuse / Report
                  </h3>
                  <a
                    href="mailto:dmca@desiredhub.xyz?subject=DMCA%20Copyright%20Infringement%20Notice"
                    className="inline-flex items-center gap-1.5 text-amber-400 font-mono text-xs font-medium hover:underline"
                  >
                    <Mail className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>dmca@desiredhub.xyz</span>
                  </a>
                </div>
              </div>

              <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed pt-1">
                Report copyright infringement, abusive content, or request removal of content from DesiredHub.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
              <a
                href="mailto:dmca@desiredhub.xyz?subject=DMCA%20Copyright%20Infringement%20Notice"
                className="min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs sm:text-sm transition-colors w-full sm:w-auto whitespace-nowrap"
              >
                <Send className="w-4 h-4" />
                <span>Report / Contact DMCA</span>
              </a>

              <Link
                to="/dmca"
                className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs sm:text-sm transition-colors border border-neutral-700/60 w-full sm:w-auto whitespace-nowrap"
              >
                <span>View Policy</span>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-800 bg-neutral-950 py-7 mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-neutral-500 text-xs sm:text-sm">
            &copy; {new Date().getFullYear()} DesiredHub. All rights reserved.
          </p>
          <nav aria-label="Legal and Compliance" className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 text-xs sm:text-sm text-neutral-400">
            <Link to="/2257" className="hover:text-white transition-colors whitespace-nowrap">
              18 U.S.C. § 2257 Compliance
            </Link>
            <span aria-hidden="true" className="text-neutral-700">·</span>
            <Link to="/dmca" className="hover:text-white transition-colors whitespace-nowrap">
              DMCA / Abuse / Report
            </Link>
            <span aria-hidden="true" className="text-neutral-700">·</span>
            <Link to="/privacy-policy" className="hover:text-white transition-colors whitespace-nowrap">
              Privacy Policy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
