import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileVideo, ListVideo, FolderKanban, BarChart3, Settings, LogOut, Menu, UserCircle, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';
import { SEO } from '../seo/SEO';

const MENU_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: FileVideo, label: 'Upload Post', path: '/admin/posts/new' },
  { icon: ListVideo, label: 'Manage Posts', path: '/admin/posts' },
  { icon: FolderKanban, label: 'Categories', path: '/admin/categories' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { icon: LinkIcon, label: 'Dead URLs', path: '/admin/dead-urls' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
  { icon: UserCircle, label: 'Profile', path: '/admin/profile' },
];

export function AdminLayout() {
  const { logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-950 flex text-neutral-200">
      <SEO 
        title="Admin Dashboard - Desired"
        description="Desired admin control panel to manage categories, video uploads, posts, and settings."
        exactTitle={true}
        noIndex={true}
      />
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 flex items-center px-6 border-b border-neutral-800">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="https://i.ibb.co.com/fV4JS3LH/20260701-143429.png" 
              alt="DESIRED" 
              className="h-6 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-400">
              Admin
            </span>
          </Link>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {MENU_ITEMS.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive ? 'bg-red-500/10 text-red-500 font-medium' : 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <button 
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 lg:hidden flex items-center px-4 border-b border-neutral-800 bg-neutral-900 sticky top-0 z-30">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-neutral-800"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="ml-3 flex items-center gap-2">
            <img 
              src="https://i.ibb.co.com/fV4JS3LH/20260701-143429.png" 
              alt="DESIRED" 
              className="h-6 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-400">
              Admin
            </span>
          </div>
        </header>
        
        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
