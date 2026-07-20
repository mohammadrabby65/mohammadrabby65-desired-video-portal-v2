import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Menu, User } from "lucide-react";
import { LiveSearch } from "./LiveSearch";
import { Sidebar } from "./Sidebar";
import { AdInjector } from "./AdInjector";

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col w-full overflow-x-hidden relative selection:bg-primary/30 selection:text-white">
      <AdInjector />
      <header className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800 transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0 shrink">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-all duration-300 active:scale-95 group relative"
              aria-label="Menu"
            >
              <Menu className="w-6 h-6 text-neutral-300 group-hover:text-white transition-colors relative z-10" />
              <div className="absolute inset-0 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
            <Link to="/" className="flex items-center min-w-0 shrink transition-transform duration-300 hover:scale-[1.02] active:scale-95 group relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img 
                src="https://i.ibb.co.com/ZzT2wvV0/Header-Logo-White-Version.png" 
                alt="DesiredHub" 
                className="h-8 sm:h-10 md:h-[40px] w-auto max-w-[120px] sm:max-w-[160px] md:max-w-none object-contain dark:hidden group-hover:brightness-110 transition-all relative z-10"
                referrerPolicy="no-referrer"
              />
              <img 
                src="https://i.ibb.co.com/SwNGJTLW/Header-Logo-black-Version.png" 
                alt="DesiredHub" 
                className="h-8 sm:h-10 md:h-[40px] w-auto max-w-[120px] sm:max-w-[160px] md:max-w-none object-contain hidden dark:block group-hover:brightness-110 transition-all drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.2)] relative z-10"
                referrerPolicy="no-referrer"
              />
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <LiveSearch />
            <Link to="/admin" className="p-2 rounded-full transition-all duration-300 active:scale-95 group relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-neutral-800/0 group-hover:bg-white/10 rounded-full transition-colors duration-300" />
              <div className="bg-neutral-900/80 backdrop-blur-md p-2 rounded-full group-hover:bg-transparent transition-colors border border-neutral-700/50 group-hover:border-transparent shadow-sm relative z-10">
                <User className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors duration-300" />
              </div>
            </Link>
          </div>
        </div>
      </header>
      
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <Outlet />
      </main>

      <footer className="border-t border-neutral-800 bg-neutral-950 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-neutral-500 text-sm mb-4">
            &copy; {new Date().getFullYear()} DesiredHub. All rights reserved.
          </p>
          <div className="flex justify-center items-center gap-4 text-sm text-neutral-400">
            <Link to="/2257" className="hover:text-white transition-colors">
              18 U.S.C. § 2257 Compliance
            </Link>
            <span className="text-neutral-700">|</span>
            <Link to="/dmca" className="hover:text-white transition-colors">
              DMCA Policy
            </Link>
            <span className="text-neutral-700">|</span>
            <Link to="/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
