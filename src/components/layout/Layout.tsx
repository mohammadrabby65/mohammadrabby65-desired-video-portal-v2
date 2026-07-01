import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Menu, User } from "lucide-react";
import { LiveSearch } from "./LiveSearch";
import { Sidebar } from "./Sidebar";

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col">
      <header className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-neutral-800 rounded-full transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="text-xl font-bold tracking-tight text-red-500 uppercase">
              Desire
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <LiveSearch />
            <Link to="/admin" className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
              <User className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>
      
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
