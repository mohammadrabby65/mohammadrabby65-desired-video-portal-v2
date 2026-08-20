import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Menu, User } from "lucide-react";
import { LiveSearch } from "./LiveSearch";
import { Sidebar } from "./Sidebar";
import { ScriptManager } from "./ScriptManager";
import { usePopunderRecovery } from "../../hooks/usePopunderRecovery";

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  usePopunderRecovery();

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
                className="h-10 sm:h-12 md:h-[50px] w-auto max-w-[150px] sm:max-w-[200px] md:max-w-none object-contain hidden dark:block  drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.2)] relative z-10"
                referrerPolicy="no-referrer"
              />
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <LiveSearch />
            <Link
              to="/admin"
              className="p-2 rounded-full    group relative overflow-hidden flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-neutral-800/0 group-hover:bg-white/10 rounded-full  " />
              <div className="bg-neutral-900/80 backdrop-blur-md p-2 rounded-full  relative z-10">
                <User className="w-5 h-5 text-neutral-400 group-hover:text-white  " />
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
            <Link to="/2257" className="hover:text-white ">
              18 U.S.C. § 2257 Compliance
            </Link>
            <span className="text-neutral-700">|</span>
            <Link to="/dmca" className="hover:text-white ">
              DMCA Policy
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
