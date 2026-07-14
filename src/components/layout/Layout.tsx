import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Menu, User } from "lucide-react";
import { LiveSearch } from "./LiveSearch";
import { Sidebar } from "./Sidebar";

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col w-full overflow-x-hidden relative">
      <header className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800">
        <div className="container mx-auto px-4 h-20 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 shrink">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-neutral-800 rounded-full transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="flex items-center min-w-0 shrink">
              <img 
                src="https://i.ibb.co.com/ZzT2wvV0/Header-Logo-White-Version.png" 
                alt="DesiredHub" 
                className="h-8 sm:h-10 md:h-[52px] w-auto max-w-[120px] sm:max-w-[180px] md:max-w-none object-contain dark:hidden"
                referrerPolicy="no-referrer"
              />
              <img 
                src="https://i.ibb.co.com/SwNGJTLW/Header-Logo-black-Version.png" 
                alt="DesiredHub" 
                className="h-8 sm:h-10 md:h-[52px] w-auto max-w-[120px] sm:max-w-[180px] md:max-w-none object-contain hidden dark:block"
                referrerPolicy="no-referrer"
              />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin" className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
              <User className="w-5 h-5" />
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
