import React, { useState, useEffect, useRef } from 'react';
import { SidebarComponent } from '../sidebar';
import { AiOpsChatbox } from '../ai-ops-chatbox';
import { User, Bell, Menu, Check, Clock } from 'lucide-react';
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#fbf9f7] text-[#1b1c1b] overscroll-behavior-none">
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
            {/* Notification Bell Icon & Dropdown Container */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                className="p-2 text-[#526069] hover:text-[#0e6877] hover:bg-[#ecf6f7] rounded-lg transition-colors relative"
                title="Thông báo"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                )}
              </button>

              {/* Sliding Dropdown Overlay */}
              {isNotifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-slideUp">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-[#fbf9f7]">
                    <span className="text-xs font-bold text-[#1b1c1b] flex items-center gap-1.5">
                      <Bell size={14} className="text-[#0e6877]" />
                      Thông báo hệ thống ({unreadCount})
                    </span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-semibold text-[#0e6877] hover:underline flex items-center gap-1"
                      >
                        <Check size={10} />
                        Đọc tất cả
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length > 0 ? (
                      notifications.map((notif: any) => (
                        <div 
                          key={notif.id} 
                          onClick={() => {
                            if (notif.link) window.location.href = notif.link;
                            setIsNotifDropdownOpen(false);
                          }}
                          className={`p-3 text-left transition-colors hover:bg-slate-50 cursor-pointer ${
                            !notif.read ? 'bg-teal-50/40' : ''
                          }`}
                        >
                          <h4 className="text-xs text-slate-800 font-bold line-clamp-1">{notif.title}</h4>
                          <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{notif.content}</p>
                          <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2 font-semibold">
                            <span className="flex items-center gap-1">
                              <Clock size={9} />
                              <span>{notif.date}</span>
                            </span>
                            <span className="text-[#0e6877] font-extrabold hover:underline">Xử lý ngay ➔</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        Hệ thống vận hành trơn tru, không có sự cố mới.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Vertical Divider */}
            <div className="h-6 w-px bg-slate-200 mx-4"></div>

            {/* Profile Info (No circular avatar image as requested) */}
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 rounded-lg text-[#526069]">
                <User size={15} />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-[#1b1c1b]">{adminUser?.name || 'Quản trị viên'}</p>
                <p className="text-[9px] text-[#526069] font-medium tracking-wide">
                  {adminUser?.zaloId || adminUser?.id ? `ID: ${adminUser.zaloId || adminUser.id}` : 'ROLE: ADMIN'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Inner Scrollable Container */}
        <main className={isFullBleed
          ? 'flex-1 overflow-hidden min-h-0 flex flex-col'
          : 'flex-1 p-8 overflow-y-auto min-h-0 bg-[#fbf9f7]'
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


