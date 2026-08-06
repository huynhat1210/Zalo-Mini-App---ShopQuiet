import React from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../../assets/logo.png';
import {
  LayoutDashboard,
  Megaphone,
  Bot,
  Users,
  LogOut,
  X,
} from 'lucide-react';
import type { ISidebarComponentProps } from './sidebar.type';

export const SidebarComponent: React.FC<ISidebarComponentProps> = (props) => {
  const { onLogout, isOpen, onClose } = props;

  const navGroups = [
    {
      title: 'CHIẾN DỊCH & TIẾP THỊ',
      items: [
        { to: '/', label: 'Tổng quan Chiến dịch', icon: <LayoutDashboard size={17} /> },
        { to: '/marketing-lists', label: 'Tệp khách hàng', icon: <Users size={17} /> },
        { to: '/campaigns', label: 'Chiến dịch Marketing', icon: <Megaphone size={17} /> },
        { to: '/automation', label: 'Chăm sóc Tự động', icon: <Bot size={17} /> },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden animate-backdropIn"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white/95 backdrop-blur-md border-r border-slate-200/80 flex flex-col h-screen transition-all duration-300 ease-in-out shrink-0 shadow-xl md:shadow-none ${
          isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0 md:w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100/80 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 overflow-hidden rounded-xl border border-teal-100 flex items-center justify-center bg-teal-50/50 shrink-0 shadow-xs">
              <img src={logo} alt="Logo" className="w-6.5 h-6.5 object-contain" />
            </div>
            <div>
            <h1 className="font-black text-slate-900 tracking-tight text-sm flex items-center gap-1.5">
                ShopQuiet <span className="text-[8px] px-1.5 py-0.2 bg-teal-50 text-[#0e6877] rounded font-black border border-teal-200">CHIẾN DỊCH</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Hệ thống Chiến dịch Zalo</p>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border-none cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Navigation Scroll Area */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5 scrollbar-thin">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              <div className="px-3 mb-1.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                  {group.title}
                </span>
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => {
                      if (window.innerWidth < 768) onClose();
                    }}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                        isActive
                          ? 'bg-[#0e6877] text-white shadow-md shadow-[#0e6877]/25 font-black scale-[1.01]'
                          : 'text-slate-600 hover:bg-teal-50/60 hover:text-[#0e6877]'
                      }`
                    }
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer / Logout */}
        <div className="p-3 border-t border-slate-100 shrink-0 bg-white">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-rose-600 bg-rose-50/70 hover:bg-rose-100 text-rose-700 rounded-xl transition-all border-none cursor-pointer active:scale-95"
          >
            <LogOut size={15} />
            <span>Đăng xuất hệ thống</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default SidebarComponent;
