import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { Menu, Dices, ShieldAlert, Mail, Send, ChevronRight } from "lucide-react";
import { LiveSearch } from "./LiveSearch";
import { Sidebar } from "./Sidebar";
import { ScriptManager } from "./ScriptManager";

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNavigatingRandom, setIsNavigatingRandom] = useState(false);
  const navigate = useNavigate();

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
      <header className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800   shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0 shrink">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-white/10 rounded-full    group relative"
              aria-label="Menu"
            >
              <Menu className="w-6 h-6 text-neutral-300 group-hover:text-white  relative z-10" />
              
            </button>
            <Link
              to="/"
              className="flex items-center min-w-0 shrink   hover:scale-[1.02]  group relative"
            >
              
              <img
                src="https://i.ibb.co.com/ZzT2wvV0/Header-Logo-White-Version.png"
                alt="DesiredHub"
                className="h-10 sm:h-12 md:h-[50px] w-auto max-w-[150px] sm:max-w-[200px] md:max-w-none object-contain dark:hidden  relative z-10"
                referrerPolicy="no-referrer"
              />
              <img
                src="https://i.ibb.co.com/SwNGJTLW/Header-Logo-black-Version.png"
                alt="DesiredHub"
                className="h-10 sm:h-12 md:h-[50px] w-auto max-w-[150px] sm:max-w-[200px] md:max-w-none object-contain hidden dark:block relative z-10 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <LiveSearch />
            <button
              onClick={handleRandomVideo}
              disabled={isNavigatingRandom}
              title="Random Video"
              className="p-2.5 rounded-full transition-all duration-200 group relative disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-neutral-800/0 group-hover:bg-neutral-800/80 rounded-full transition-colors" />
              <Dices className={`w-5 h-5 text-neutral-400 group-hover:text-white relative z-10 transition-colors ${isNavigatingRandom ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <Outlet />
      </main>

      {/* Dedicated DMCA / Abuse / Report Support Card */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 my-8 sm:my-12">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-900 border border-amber-500/30 hover:border-amber-500/50 rounded-2xl p-6 sm:p-8 shadow-2xl transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-all" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    DMCA / Abuse / Report
                  </h3>
                  <a
                    href="mailto:dmca@vezlo.xyz?subject=DMCA%20Copyright%20Infringement%20Notice"
                    className="inline-flex items-center gap-1.5 text-amber-400 font-mono text-xs sm:text-sm font-semibold hover:underline mt-0.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>dmca@vezlo.xyz</span>
                  </a>
                </div>
              </div>

              <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed pt-1">
                Report copyright infringement, abusive content, or request removal of content from DesiredHub.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
              <a
                href="mailto:dmca@vezlo.xyz?subject=DMCA%20Copyright%20Infringement%20Notice"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-extrabold text-xs sm:text-sm transition-all shadow-lg hover:shadow-amber-500/20 w-full sm:w-auto"
              >
                <Send className="w-4 h-4" />
                <span>Report / Contact DMCA</span>
              </a>

              <Link
                to="/dmca"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs sm:text-sm transition-colors border border-neutral-700/60 w-full sm:w-auto"
              >
                <span>View Policy</span>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-800 bg-neutral-950 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-neutral-500 text-sm mb-4">
            &copy; {new Date().getFullYear()} DesiredHub. All rights reserved.
          </p>
          <div className="flex justify-center items-center gap-4 text-sm text-neutral-400">
            <Link to="/2257" className="hover:text-white ">
              18 U.S.C. § 2257 Compliance
            </Link>
            <span className="text-neutral-700">|</span>
            <Link to="/dmca" className="hover:text-white transition-colors">
              DMCA / Abuse / Report
            </Link>
            <span className="text-neutral-700">|</span>
            <Link to="/privacy-policy" className="hover:text-white ">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
