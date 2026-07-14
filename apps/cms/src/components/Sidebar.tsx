import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  ReceiptText, 
  Ticket, 
  Image as ImageIcon, 
  LogOut, 
  Store
} from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
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

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200"
        >
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};
export default Sidebar;
