import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../utils/api';
import {
  ShoppingBag,
  ReceiptText,
  Ticket,
  DollarSign,
  ArrowRight,
  Package,
  Clock,
  CheckCircle,
  Truck,
  AlertTriangle,
  Zap,
  Check,
} from 'lucide-react';
import type { IDashboardProps } from './dashboard.type';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalVouchers: number;
  recentOrders: any[];
  allOrders: any[];
  lowStockProducts: any[];
}

export const Dashboard: React.FC<IDashboardProps> = (_props) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalVouchers: 0,
    recentOrders: [],
    allOrders: [],
    lowStockProducts: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async (isSilent = false) => {
      try {
        if (!isSilent) setLoading(true);
        const dashboard = await apiRequest<any>('/cms/analytics/dashboard');
        const orderList = Array.isArray(dashboard?.recentOrders) ? dashboard.recentOrders : [];
        const lowStock = (dashboard?.lowStockVariants || []).reduce((products: any[], variant: any) => {
          const productId = variant.productId ?? variant.product?.id;
          const existing = products.find((product) => product.id === productId);
          if (existing) {
            existing.variants.push(variant);
          } else {
            products.push({
              id: productId,
              name: variant.product?.name || 'Sản phẩm',
              variants: [variant],
            });
          }
          return products;
        }, []).slice(0, 5);

        setStats({
          totalProducts: Number(dashboard?.totalProducts || 0),
          totalOrders: Number(dashboard?.totalOrders || 0),
          totalRevenue: Number(dashboard?.totalRevenue || 0),
          totalVouchers: Number(dashboard?.totalVouchers || 0),
          recentOrders: orderList,
          allOrders: [],
          lowStockProducts: lowStock,
        });
      } catch (err) {
        console.error('Failed to load dashboard statistics:', err);
      } finally {
        if (!isSilent) setLoading(false);
      }
    };

    fetchDashboardData();
    const refreshWhenVisible = () => {
      if (!document.hidden) void fetchDashboardData(true);
    };
    const interval = setInterval(refreshWhenVisible, 60000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getStatusBadge = (status: string, paymentMethod?: string) => {
    const isCod = (paymentMethod || 'COD').toUpperCase() === 'COD';
    switch (status) {
      case 'PENDING':
      case 'PENDING_PAYMENT':
        return (
          <span className="px-2.5 py-1 text-[11px] font-black text-amber-700 bg-amber-50 rounded-xl border border-amber-200 inline-flex items-center gap-1">
            <Clock size={12} /> Chờ thanh toán
          </span>
        );
      case 'PROCESSING':
        return isCod ? (
          <span className="px-2.5 py-1 text-[11px] font-black text-orange-700 bg-orange-50 rounded-xl border border-orange-200 inline-flex items-center gap-1">
            <Truck size={12} /> Chuẩn bị (COD)
          </span>
        ) : (
          <span className="px-2.5 py-1 text-[11px] font-black text-blue-700 bg-blue-50 rounded-xl border border-blue-200 inline-flex items-center gap-1">
            <CheckCircle size={12} /> Đã nhận tiền (Pay2S)
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="px-2.5 py-1 text-[11px] font-black text-indigo-700 bg-indigo-50 rounded-xl border border-indigo-200 inline-flex items-center gap-1">
            <Truck size={12} /> Đang giao
          </span>
        );
      case 'COMPLETED':
      case 'DELIVERED':
        return (
          <span className="px-2.5 py-1 text-[11px] font-black text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200 inline-flex items-center gap-1">
            <CheckCircle size={12} /> Hoàn thành
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 text-[11px] font-black text-rose-700 bg-rose-50 rounded-xl border border-rose-200">
            Đã hủy
          </span>
        );
      default:
        return <span className="px-2.5 py-1 text-[11px] font-black text-slate-700 bg-slate-100 rounded-xl">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="h-8 w-48 bg-slate-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-3xl border border-slate-200/80 p-5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'TỔNG DOANH THU',
      value: formatPrice(stats.totalRevenue),
      desc: 'Doanh số thực tế ghi nhận',
      icon: DollarSign,
      bgIcon: 'bg-teal-50 text-[#0e6877] border-teal-200',
      gradient: 'from-[#0e6877]/5 via-white to-white',
      badge: 'Thanh toán thành công',
      onClick: () => navigate('/orders'),
    },
    {
      title: 'TỔNG ĐƠN HÀNG',
      value: `${stats.totalOrders} đơn`,
      desc: 'Toàn bộ đơn trên Mini App',
      icon: ReceiptText,
      bgIcon: 'bg-blue-50 text-blue-600 border-blue-200',
      gradient: 'from-blue-50/40 via-white to-white',
      badge: 'Cập nhật realtime',
      onClick: () => navigate('/orders'),
    },
    {
      title: 'SẢN PHẨM HIỂN THỊ',
      value: `${stats.totalProducts} sản phẩm`,
      desc: 'Đang bán trên Cửa hàng',
      icon: Package,
      bgIcon: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      gradient: 'from-indigo-50/40 via-white to-white',
      badge: 'Kho hàng sẵn sàng',
      onClick: () => navigate('/products'),
    },
    {
      title: 'VOUCHER KHUYẾN MÃI',
      value: `${stats.totalVouchers} mã`,
      desc: 'Chương trình ưu đãi active',
      icon: Ticket,
      bgIcon: 'bg-amber-50 text-amber-600 border-amber-200',
      gradient: 'from-amber-50/40 via-white to-white',
      badge: 'Kích cầu mua sắm',
      onClick: () => navigate('/vouchers'),
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-teal-50 text-[#0e6877] text-xs font-black uppercase tracking-wider rounded-full border border-teal-200 flex items-center gap-1.5">
              <Zap size={13} /> Control Dashboard
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
            Trung Tâm Điều Hành ShopQuiet
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Tổng quan hiệu suất kinh doanh, quản lý đơn hàng & cảnh báo tồn kho thời gian thực
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0e6877] hover:bg-[#0b5460] text-white text-xs font-bold rounded-2xl transition-all border-none cursor-pointer shadow-sm active:scale-95"
          >
            <ShoppingBag size={15} /> Xử lý đơn mới ({stats.recentOrders.filter(o => o.status === 'PROCESSING' || o.status === 'PENDING').length})
          </button>
        </div>
      </div>

      {/* Modern Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              onClick={card.onClick}
              className={`bg-gradient-to-br ${card.gradient} bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs hover:shadow-md hover:border-[#0e6877]/40 transition-all duration-200 group text-left cursor-pointer relative overflow-hidden`}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1 z-10">
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{card.title}</span>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{card.value}</h3>
                  <p className="text-slate-500 text-[11px] font-medium">{card.desc}</p>
                </div>
                <div className={`p-3 rounded-2xl border ${card.bgIcon} transition-transform group-hover:scale-110 duration-200 shrink-0 shadow-2xs`}>
                  <Icon size={22} />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#0e6877]">{card.badge}</span>
                <ArrowRight size={13} className="text-slate-400 group-hover:text-[#0e6877] group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Cards */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span className="flex items-center gap-2"><ShoppingBag size={16} /> Đơn hàng tiếp nhận gần đây</span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5 font-medium">Danh sách các đơn phát sinh từ Zalo Mini App</p>
            </div>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-bold text-[#0e6877] bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border-none"
            >
              Xem tất cả <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-3">
            {stats.recentOrders.length > 0 ? (
              stats.recentOrders.map((order) => {
                const customerName = order.shippingName || order.customerName || order.user?.name || 'Khách hàng Zalo';
                const customerPhone = order.shippingPhone || order.phone || order.user?.phone || '0336433234';
                const itemsCount = Array.isArray(order.items) ? order.items.reduce((s: number, it: any) => s + (it.quantity || 1), 0) : 1;

                return (
                  <div
                    key={order.id}
                    onClick={() => navigate('/orders')}
                    className="p-4 bg-slate-50/60 hover:bg-teal-50/40 border border-slate-200/70 rounded-2xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center font-black text-xs text-[#0e6877] shrink-0 shadow-2xs group-hover:border-teal-300">
                        <Package size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-900 text-xs">#{order.id}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg">
                            {order.paymentMethod || 'COD'}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-800 mt-0.5">
                          {customerName} • <span className="text-slate-500 font-normal">{customerPhone}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {itemsCount} sản phẩm • {new Date(order.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60">
                      <span className="text-sm font-black text-[#0e6877]">
                        {formatPrice(order.totalAmount || order.total || 0)}
                      </span>
                      <div className="mt-1">{getStatusBadge(order.status, order.paymentMethod)}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                Chưa có đơn hàng nào phát sinh. Hệ thống đang sẵn sàng!
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Warning Panel */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <AlertTriangle size={17} className="text-amber-500" /> Cảnh Báo Tồn Kho
                </h3>
                <p className="text-slate-400 text-xs mt-0.5 font-medium">Sản phẩm có biến thể &lt; 5 sản phẩm</p>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                {stats.lowStockProducts.length} SP
              </span>
            </div>

            <div className="space-y-3 mt-4">
              {stats.lowStockProducts.length > 0 ? (
                stats.lowStockProducts.map((product, index) => {
                  const lowVariants = product.variants.filter((v: any) => v.stock < 5);
                  return (
                    <div key={index} className="p-3.5 bg-amber-50/40 rounded-2xl border border-amber-200/60 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{product.name}</p>
                        <p className="text-[10.5px] text-amber-800 font-semibold mt-0.5">
                          Tồn kho: {lowVariants.map((v: any) => `${v.size || v.color}: ${v.stock}`).join(', ')}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate('/inventory')}
                        className="text-[10px] font-black text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition-all border-none cursor-pointer shrink-0 shadow-2xs"
                      >
                        Nhập kho
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs font-medium space-y-2">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <p>Kho hàng đang ở trạng thái an toàn!</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={() => navigate('/inventory')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all border-none cursor-pointer flex items-center justify-center gap-1.5"
            >
              Quản lý toàn bộ kho hàng <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
