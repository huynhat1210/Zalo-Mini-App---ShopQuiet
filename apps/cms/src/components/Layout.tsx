import React from 'react';
import { Sidebar } from './Sidebar';
import { User, Bell } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar onLogout={onLogout} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-8 sticky top-0 z-40">
          <div>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Admin Mode
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Badge */}
            <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full"></span>
            </button>

            {/* Profile Info */}
            <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
                <User size={16} />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-semibold text-white">Quản trị viên</p>
                <p className="text-[10px] text-slate-400">admin@shopquiet.com</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Pages Root Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
export default Layout;
