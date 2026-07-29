import React, { useState, useEffect, useRef } from 'react';
import { SidebarComponent } from '../sidebar';
import { AiOpsChatbox } from '../ai-ops-chatbox';
import { Bell, Menu, Check, Clock } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { useLocation } from 'react-router-dom';




interface Notification {
  id: number;
  title: string;
  content: string;
  type: string;
  date: string;
  read: boolean;
}

import type { ILayoutComponentProps } from './layout.type';

export const LayoutComponent: React.FC<ILayoutComponentProps> = (props) => {
  const { children, onLogout } = props;
  const location = useLocation();
  const isFullBleed = location.pathname === '/support';
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Fetch admin profile
  useEffect(() => {
    try {
      const cached = localStorage.getItem('zalo_profile_custom');
      if (cached) {
        setAdminUser(JSON.parse(cached));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await apiRequest('/cms/notifications');
      if (Array.isArray(res)) {
        setNotifications(res);
      }
    } catch (e) {
      console.error('Failed to load notifications in layout:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 10 seconds for real-time order alerts
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    // Optimistic UI update
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    try {
      // In a real system we would hit PATCH /cms/notifications/read-all
      // For this generic setup, we can write back status to DB or just clear local state
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 overscroll-behavior-none">
      {/* Sidebar Navigation */}
      <SidebarComponent 
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
        {/* Glass Header */}
        <header className="h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md flex items-center justify-between px-4 md:px-8 shrink-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Toggle Hamburger Button (Mobile & Desktop) */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-500 hover:text-[#0e6877] hover:bg-teal-50 rounded-xl transition-all border-none cursor-pointer"
              title="Chuyển đổi Menu Sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#0e6877] bg-teal-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-teal-200 shadow-2xs">
                Admin Control Panel
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Bell Icon & Dropdown Container */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                className="p-2 text-slate-500 hover:text-[#0e6877] hover:bg-teal-50 rounded-xl transition-colors relative border-none cursor-pointer"
                title="Thông báo"
              >
                <Bell size={19} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse border-2 border-white"></span>
                )}
              </button>

              {/* Sliding Dropdown Overlay */}
              {isNotifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 overflow-hidden animate-slideUp">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-2">
                      <Bell size={15} className="text-[#0e6877]" />
                      Thông báo hệ thống ({unreadCount})
                    </span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-bold text-[#0e6877] hover:underline flex items-center gap-1 border-none bg-transparent cursor-pointer"
                      >
                        <Check size={12} />
                        Đánh dấu tất cả đã đọc
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length > 0 ? (
                      notifications.map((notif: any) => (
                        <div 
                          key={notif.id} 
                          onClick={() => {
                            if (notif.link) window.location.href = notif.link;
                            setIsNotifDropdownOpen(false);
                          }}
                          className={`p-3.5 text-left transition-colors hover:bg-slate-50 cursor-pointer ${
                            !notif.read ? 'bg-teal-50/40' : ''
                          }`}
                        >
                          <h4 className="text-xs text-slate-900 font-extrabold line-clamp-1">{notif.title}</h4>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{notif.content}</p>
                          <div className="flex items-center justify-between text-[9.5px] text-slate-400 mt-2 font-semibold">
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              <span>{notif.date}</span>
                            </span>
                            <span className="text-[#0e6877] font-black hover:underline">Xử lý ngay ➔</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-400 text-xs font-medium">
                        Hệ thống vận hành trơn tru, không có thông báo mới.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Vertical Divider */}
            <div className="h-5 w-px bg-slate-200 mx-2"></div>

            {/* Profile Info Badge */}
            <div className="flex items-center gap-2.5 bg-slate-100/80 p-1.5 pr-3 rounded-2xl border border-slate-200/60">
              <div className="w-7 h-7 bg-[#0e6877] text-white rounded-xl flex items-center justify-center font-black text-xs shadow-2xs">
                {(adminUser?.name || 'A')[0].toUpperCase()}
              </div>
              <div className="text-left hidden md:block leading-tight">
                <p className="text-xs font-black text-slate-900">{adminUser?.name || 'Quản trị viên'}</p>
                <p className="text-[9.5px] text-teal-700 font-bold tracking-wide">
                  ADMINISTRATOR
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Inner Scrollable Container */}
        <main className={isFullBleed
          ? 'flex-1 overflow-hidden min-h-0 flex flex-col bg-slate-50'
          : 'flex-1 p-4 md:p-8 overflow-y-auto min-h-0 bg-slate-50/80'
        }>
          {isFullBleed ? children : (
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          )}
        </main>
      </div>

      {/* ── AI Operations Chatbox (Gemini AI Alert Launcher) ── */}
      <AiOpsChatbox />
    </div>
  );
};


