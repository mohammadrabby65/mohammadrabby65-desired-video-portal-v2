import { Link, useLocation } from 'react-router-dom';
import { Home as HomeIcon, X } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-64 bg-neutral-950 border-r border-neutral-800 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } overflow-y-auto`}
      >
        <div className="p-4 flex items-center justify-between border-b border-neutral-800">
          <Link to="/" onClick={onClose} className="flex items-center">
            <img 
              src="https://i.ibb.co.com/ZzT2wvV0/Header-Logo-White-Version.png" 
              alt="DesiredHub" 
              className="h-10 w-auto object-contain dark:hidden"
              referrerPolicy="no-referrer"
            />
            <img 
              src="https://i.ibb.co.com/SwNGJTLW/Header-Logo-black-Version.png" 
              alt="DesiredHub" 
              className="h-10 w-auto object-contain hidden dark:block"
              referrerPolicy="no-referrer"
            />
          </Link>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <nav className="p-4 flex flex-col gap-1">
          <Link
            to="/"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
              location.pathname === '/'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <HomeIcon className="w-5 h-5" />
            Home
          </Link>
        </nav>
      </div>
    </>
  );
}
