import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import logo from '../assets/logo.png';
import { 
  LayoutDashboard, 
  LogOut, 
  Database,
  X,
  Users
} from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

interface ModelSummary {
  model: string;
  count: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout, isOpen, onClose }) => {
  const [models, setModels] = useState<ModelSummary[]>([]);

  useEffect(() => {
    const fetchModelsSummary = async () => {
      try {
        const res = await apiRequest('/cms/database/summary');
        if (Array.isArray(res)) {
          const sorted = res.sort((a, b) => a.model.localeCompare(b.model));
          setModels(sorted);
        }
      } catch (err) {
        console.error('Failed to load database summary in sidebar:', err);
      }
    };

    fetchModelsSummary();
  }, []);

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 flex flex-col h-screen transition-all duration-300 ease-in-out shrink-0 ${
        isOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full overflow-hidden'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-250/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 overflow-hidden rounded-xl border border-slate-200 flex items-center justify-center bg-white shrink-0">
            <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-[#1b1c1b] tracking-wide text-sm">SoftShop CMS</h1>
            <p className="text-[10px] text-[#526069] font-medium">Bảng Quản Trị</p>
          </div>
        </div>
        
        {/* Toggle Close Button */}
        <button 
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-[#0e6877] hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main Pages Menu */}
      <div className="px-4 pt-6 space-y-1">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-[#0e6877] text-white shadow-md shadow-[#0e6877]/10'
                : 'text-[#526069] hover:bg-[#ecf6f7] hover:text-[#0e6877]'
            }`
          }
        >
          <LayoutDashboard size={16} />
          <span>Tổng quan</span>
        </NavLink>
        <NavLink
          to="/users"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-[#0e6877] text-white shadow-md shadow-[#0e6877]/10'
                : 'text-[#526069] hover:bg-[#ecf6f7] hover:text-[#0e6877]'
            }`
          }
        >
          <Users size={16} />
          <span>Quản lý người dùng</span>
        </NavLink>
      </div>

      {/* Divider */}
      <div className="px-6 py-4">
        <div className="border-t border-slate-100"></div>
      </div>

      {/* Dynamic Database Models List */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-6 mb-2">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
            Tất cả bảng dữ liệu (Models)
          </span>
        </div>
        
        {/* Scrollable Model Container */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 scrollbar-thin">
          {models.map((m) => (
            <NavLink
              key={m.model}
              to={`/database/${m.model}`}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#ecf6f7] text-[#0e6877] font-semibold border-l-4 border-[#0e6877] rounded-l-none'
                    : 'text-[#526069] hover:bg-[#ecf6f7]/60 hover:text-[#0e6877]'
                }`
              }
            >
              <div className="flex items-center gap-2 truncate">
                <Database size={13} className="text-slate-400 shrink-0" />
                <span className="truncate">{m.model}</span>
              </div>
              <span className="px-2 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-500 rounded-full border border-slate-200 shrink-0 ml-2">
                {m.count}
              </span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Logout Footer */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all duration-200"
        >
          <LogOut size={16} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};
export default Sidebar;
