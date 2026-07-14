import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { User, Bell, Menu } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('zalo_profile_custom');
      if (cached) {
        setAdminUser(JSON.parse(cached));
      }
    } catch (e) {
      console.error('Failed to load user info in layout:', e);
    }
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#fbf9f7] text-[#1b1c1b] overscroll-behavior-none">
      {/* Sidebar Navigation */}
      <Sidebar 
        onLogout={onLogout} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col h-full min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'md:pl-64' : 'pl-0'
        }`}
      >
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0 z-40">
          <div className="flex items-center gap-4">
            {/* Toggle Hamburger Button */}
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-[#526069] hover:text-[#0e6877] hover:bg-[#ecf6f7] rounded-lg transition-all"
                title="Mở Sidebar"
              >
                <Menu size={20} />
              </button>
            )}
            <span className="text-[10px] font-bold text-[#0e6877] bg-[#ecf6f7] px-2.5 py-1 rounded-full uppercase tracking-wider">
              Admin Mode
            </span>
          </div>

          <div className="flex items-center">
            {/* Notification Badge */}
            <button className="p-2 text-[#526069] hover:text-[#0e6877] hover:bg-[#ecf6f7] rounded-lg transition-colors relative mr-4">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#10b981] rounded-full"></span>
            </button>

            {/* Vertical Divider */}
            <div className="h-6 w-px bg-slate-250/80 mr-4"></div>

            {/* Profile Info matching screenshot */}
            <div className="flex items-center gap-3">
              {adminUser?.avatar ? (
                <div className="w-8 h-8 rounded-full border-2 border-[#10b981] p-0.5 overflow-hidden shrink-0">
                  <img src={adminUser.avatar} alt="Admin" className="w-full h-full rounded-full object-cover" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full border-2 border-[#10b981] flex items-center justify-center text-[#10b981] bg-slate-50 shrink-0">
                  <User size={16} />
                </div>
              )}
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-[#1b1c1b]">{adminUser?.name || 'Quản trị viên'}</p>
                <p className="text-[10px] text-[#526069] font-medium">
                  {adminUser?.zaloId || adminUser?.id ? `id:${adminUser.zaloId || adminUser.id}` : 'admin@shopquiet.com'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Inner Scrollable Container with scroll height locked to screen limits */}
        <main className="flex-1 p-8 overflow-y-auto min-h-0 bg-[#fbf9f7]">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
export default Layout;
