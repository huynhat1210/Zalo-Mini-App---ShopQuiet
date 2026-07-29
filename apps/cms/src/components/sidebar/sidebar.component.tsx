import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { apiRequest } from '../../utils/api';
import logo from '../../assets/logo.png';
import {
  LayoutDashboard,
  BarChart3,
  ShoppingBag,
  Package,
  FolderTree,
  Boxes,
  Users,
  Ticket,
  Zap,
  Layers,
  Image as ImageIcon,
  MessageSquare,
  Star,
  CreditCard,
  Settings,
  Database,
  X,
  ChevronDown,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import type { ISidebarComponentProps } from './sidebar.type';

interface ModelSummary {
  model: string;
  count: number;
}

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  Category: 'Danh mục sản phẩm',
  ChatMessage: 'Lịch sử chat',
  Comment: 'Đánh giá sản phẩm',
  Favorite: 'Sản phẩm yêu thích',
  MenuItem: 'Menu ứng dụng',
  Notification: 'Thông báo hệ thống',
  Order: 'Đơn hàng (Raw)',
  OrderItem: 'Chi tiết đơn hàng',
  Product: 'Sản phẩm (Raw)',
  ProductVariant: 'Biến thể sản phẩm',
  User: 'Khách hàng (Raw)',
  Voucher: 'Mã giảm giá (Raw)',
  Banner: 'Banner quảng cáo',
  ShippingMethod: 'Phương thức giao hàng',
  SiteSetting: 'Cấu hình hệ thống',
  UserAddress: 'Địa chỉ khách hàng',
  PaymentMethod: 'Phương thức thanh toán',
  CartItem: 'Chi tiết giỏ hàng',
  PointsHistory: 'Lịch sử điểm thưởng & Xu',
  AuditLog: 'Nhật ký quản trị',
  AnalyticsEvent: 'Sự kiện phân tích',
};

export const SidebarComponent: React.FC<ISidebarComponentProps> = (props) => {
  const { onLogout, isOpen, onClose } = props;
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [showDevTools, setShowDevTools] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const orders = await apiRequest<any[]>('/orders/admin/all').catch(() => []);
        if (Array.isArray(orders)) {
          const pending = orders.filter((o) => o.status === 'PROCESSING' || o.status === 'PENDING' || o.status === 'RETURN_REQUESTED').length;
          setPendingOrdersCount(pending);
        }
      } catch (e) {
        console.error('Failed to load pending orders count in sidebar:', e);
      }
    };

    const fetchUnreadChatCount = async () => {
      try {
        const res = await apiRequest<{ unreadCount: number }>('/chat/unread-count').catch(() => null);
        if (res && typeof res.unreadCount === 'number') {
          setUnreadChatCount(res.unreadCount);
        }
      } catch (e) {}
    };

    fetchPendingCount();
    fetchUnreadChatCount();

    const interval = setInterval(() => {
      fetchPendingCount();
      fetchUnreadChatCount();
    }, 45000);
    return () => clearInterval(interval);
  }, []);

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

  const navGroups = [
    {
      title: 'TỔNG QUAN',
      items: [
        { to: '/', label: 'Tổng quan', icon: <LayoutDashboard size={17} /> },
        { to: '/analytics', label: 'Báo cáo & Thống kê', icon: <BarChart3 size={17} /> },
      ],
    },
    {
      title: 'BÁN HÀNG & KHO',
      items: [
        { to: '/orders', label: 'Quản lý đơn hàng', icon: <ShoppingBag size={17} /> },
        { to: '/transactions', label: 'Quản lý Giao dịch', icon: <CreditCard size={17} /> },
        { to: '/products', label: 'Sản phẩm', icon: <Package size={17} /> },
        { to: '/categories', label: 'Danh mục sản phẩm', icon: <FolderTree size={17} /> },
        { to: '/inventory', label: 'Quản lý kho hàng', icon: <Boxes size={17} /> },
      ],
    },
    {
      title: 'MARKETING & KHÁCH HÀNG',
      items: [
        { to: '/users', label: 'Khách hàng', icon: <Users size={17} /> },
        { to: '/comments', label: 'Bình luận & Đánh giá', icon: <Star size={17} /> },
        { to: '/flash-sale', label: 'Quản lý Flash Sale', icon: <Zap size={17} /> },
        { to: '/vouchers', label: 'Mã giảm giá & KM', icon: <Ticket size={17} /> },
        { to: '/banners', label: 'Banner & Quảng cáo', icon: <Layers size={17} /> },
        { to: '/media', label: 'Thư viện hình ảnh', icon: <ImageIcon size={17} /> },
        { to: '/support', label: 'Hỗ trợ khách hàng', icon: <MessageSquare size={17} /> },
      ],
    },
    {
      title: 'HỆ THỐNG',
      items: [
        { to: '/settings', label: 'Cấu hình hệ thống', icon: <Settings size={17} /> },
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
                ShopQuiet <span className="text-[9px] px-1.5 py-0.2 bg-teal-50 text-[#0e6877] rounded font-black border border-teal-200">CMS</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Hệ Thống Quản Trị Mini App</p>
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
                    {item.to === '/orders' && pendingOrdersCount > 0 && (
                      <span className="px-2 py-0.5 text-[9.5px] font-black bg-rose-500 text-white rounded-full animate-pulse shadow-2xs">
                        +{pendingOrdersCount}
                      </span>
                    )}
                    {item.to === '/support' && unreadChatCount > 0 && (
                      <span className="px-2 py-0.5 text-[9.5px] font-black bg-[#0e6877] text-white rounded-full animate-pulse shadow-2xs">
                        {unreadChatCount}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {/* Optional Collapsible Developer Tools */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowDevTools(!showDevTools)}
              className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors border-none cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Database size={14} />
                <span>Cơ sở dữ liệu (Raw Tables)</span>
              </div>
              {showDevTools ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {showDevTools && (
              <div className="mt-1 pl-2 space-y-0.5 animate-fadeIn">
                {models.map((m) => (
                  <NavLink
                    key={m.model}
                    to={`/database/${m.model}`}
                    onClick={() => {
                      if (window.innerWidth < 768) onClose();
                    }}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                        isActive
                          ? 'bg-teal-50 text-[#0e6877] font-bold'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`
                    }
                  >
                    <span className="truncate">{MODEL_DISPLAY_NAMES[m.model] || m.model}</span>
                    <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded-full text-slate-500 ml-1">
                      {m.count}
                    </span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
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
