import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  ReceiptText, 
  Ticket, 
  Image as ImageIcon, 
  LogOut, 
  Store,
  Database
} from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
}

interface ModelSummary {
  model: string;
  count: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const [models, setModels] = useState<ModelSummary[]>([]);

  useEffect(() => {
    const fetchModelsSummary = async () => {
      try {
        const res = await apiRequest('/cms/database/summary');
        if (Array.isArray(res)) {
          // Sort models alphabetically
          const sorted = res.sort((a, b) => a.model.localeCompare(b.model));
          setModels(sorted);
        }
      } catch (err) {
        console.error('Failed to load database summary in sidebar:', err);
      }
    };

    fetchModelsSummary();
  }, []);

  const menuItems = [
    { name: 'Tổng quan', path: '/', icon: LayoutDashboard },
    { name: 'Sản phẩm', path: '/products', icon: ShoppingBag },
    { name: 'Đơn hàng', path: '/orders', icon: ReceiptText },
    { name: 'Ví Voucher', path: '/vouchers', icon: Ticket },
    { name: 'Quản lý Banners', path: '/banners', icon: ImageIcon },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
          <Store size={20} />
        </div>
        <div>
          <h1 className="font-bold text-white tracking-wide text-sm">ShopQuiet CMS</h1>
          <p className="text-[10px] text-slate-400 font-medium">Bảng Quản Trị Hệ Thống</p>
        </div>
      </div>

      {/* Main Pages Menu */}
      <div className="px-4 pt-6 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <Icon size={16} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Divider */}
      <div className="px-6 py-4">
        <div className="border-t border-slate-800"></div>
      </div>

      {/* Dynamic Database Models List */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-6 mb-2">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
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
                `flex items-center justify-between px-4 py-2 rounded-xl text-xs transition-all duration-200 ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                }`
              }
            >
              <div className="flex items-center gap-2 truncate">
                <Database size={13} className="text-slate-550 shrink-0" />
                <span className="truncate">{m.model}</span>
              </div>
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-950 text-slate-400 rounded-full border border-slate-800 group-hover:border-slate-700 shrink-0 ml-2">
                {m.count}
              </span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Logout Footer */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200"
        >
          <LogOut size={16} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};
export default Sidebar;
