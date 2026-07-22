import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../utils/api';
import {
  ShoppingBag,
  ReceiptText,
  Ticket,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Package,
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
        const [products, orders, vouchers] = await Promise.all([
          apiRequest('/products?page=1&limit=100').catch(() => ({ data: [] })),
          apiRequest('/orders/admin/all').catch(() => []),
          apiRequest('/vouchers').catch(() => []),
        ]);

        const orderList = Array.isArray(orders) ? orders : [];
        const productList = products && Array.isArray(products) ? products : products?.data || [];
        const voucherList = Array.isArray(vouchers) ? vouchers : [];

        // Calculate revenue for completed & processing orders
        const revenue = orderList
          .filter(
            (o: any) =>
              o.status === 'COMPLETED' ||
              o.status === 'DELIVERED' ||
              o.status === 'PROCESSING' ||
              o.status === 'SHIPPED',
          )
          .reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

        // Find products with low stock variants (stock < 5)
        const lowStock = productList
          .filter((prod: any) => {
            if (Array.isArray(prod.variants)) {
              return prod.variants.some((v: any) => v.stock < 5);
            }
            return false;
          })
          .slice(0, 5);

        setStats({
          totalProducts: productList.length,
          totalOrders: orderList.length,
          totalRevenue: revenue,
          totalVouchers: voucherList.length,
          recentOrders: orderList.slice(0, 5),
          allOrders: orderList,
          lowStockProducts: lowStock,
        });
      } catch (err) {
        console.error('Failed to load dashboard statistics:', err);
      } finally {
        if (!isSilent) setLoading(false);
      }
    };

    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'PENDING_PAYMENT':
        return <span className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 rounded-full border border-amber-200">Chờ thanh toán</span>;
      case 'PROCESSING':
        return <span className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 rounded-full border border-blue-200">Đang xử lý</span>;
      case 'SHIPPED':
        return <span className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 rounded-full border border-indigo-200">Đang giao</span>;
      case 'COMPLETED':
      case 'DELIVERED':
        return <span className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">Hoàn thành</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 rounded-full border border-rose-200">Đã hủy</span>;
      default:
        return <span className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 rounded-full">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fadeIn">
        <div className="w-12 h-12 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-xs font-semibold">Đang tải dữ liệu tổng quan...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Doanh thu tích lũy',
      value: formatPrice(stats.totalRevenue),
      desc: 'Từ các đơn hàng thành công',
      icon: DollarSign,
      color: 'text-[#0e6877] bg-teal-50 border-teal-100',
      onClick: () => navigate('/orders'),
    },
    {
      title: 'Tổng đơn hàng',
      value: `${stats.totalOrders} đơn`,
      desc: 'Toàn bộ đơn hàng ghi nhận',
      icon: ReceiptText,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
      onClick: () => navigate('/orders'),
    },
    {
      title: 'Sản phẩm kinh doanh',
      value: `${stats.totalProducts} sp`,
      desc: 'Đang hiển thị trên Mini App',
      icon: Package,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      onClick: () => navigate('/products'),
    },
    {
      title: 'Mã giảm giá (Vouchers)',
      value: `${stats.totalVouchers} mã`,
      desc: 'Mã khuyến mãi đang phát hành',
      icon: Ticket,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      onClick: () => navigate('/vouchers'),
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn text-[#1b1c1b]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">🔲 Tổng Quan Hệ Thống</h1>
        <p className="text-slate-500 text-xs mt-1">Theo dõi các chỉ số hoạt động chính của cửa hàng ShopQuiet</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <button
              key={i}
              onClick={card.onClick}
              className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-[#0e6877]/30 transition-all duration-200 group text-left cursor-pointer border-none"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{card.title}</span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{card.value}</h3>
                  <p className="text-slate-500 text-xs font-normal">{card.desc}</p>
                </div>
                <div className={`p-3 rounded-2xl border ${card.color} transition-transform group-hover:scale-110 duration-200`}>
                  <Icon size={20} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">🛍️ Đơn hàng mới tiếp nhận</h3>
              <p className="text-slate-400 text-xs mt-0.5">Danh sách các đơn hàng vừa tạo trên Zalo Mini App</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-[#0e6877] bg-teal-50 px-2.5 py-1 rounded-full flex items-center gap-1 border border-teal-200">
                <TrendingUp size={12} /> Live Sync
              </span>
              <button
                onClick={() => navigate('/orders')}
                className="text-xs font-bold text-slate-600 hover:text-[#0e6877] bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl flex items-center gap-1 transition-all cursor-pointer border-none"
              >
                Xem tất cả <ArrowRight size={12} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fbf9f7] text-[#526069] text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Mã đơn</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Tổng tiền</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentOrders.length > 0 ? (
                  stats.recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => navigate('/orders')}
                    >
                      <td className="py-3.5 px-4 font-mono text-xs text-[#0e6877] font-bold">
                        #{typeof order.id === 'string' ? order.id.slice(-6).toUpperCase() : String(order.id)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 text-xs">{order.customerName || order.shippingName || 'Khách Zalo'}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{order.phone || 'Không SĐT'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#0e6877] font-black text-xs">{formatPrice(order.totalAmount || order.total || 0)}</td>
                      <td className="py-3.5 px-4 text-right">{getStatusBadge(order.status)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">Chưa có đơn hàng nào cần xử lý</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Warning Panel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">⚠️ Cảnh báo kho hàng</h3>
              <p className="text-slate-400 text-xs mt-0.5">Sản phẩm sắp hết hàng (kho &lt; 5)</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <ShoppingBag size={18} />
            </div>
          </div>

          <div className="space-y-3">
            {stats.lowStockProducts.length > 0 ? (
              stats.lowStockProducts.map((product, index) => {
                const lowVariants = product.variants.filter((v: any) => v.stock < 5);
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-amber-50/50 rounded-2xl border border-amber-100">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{product.name}</p>
                      <p className="text-[10px] text-amber-700 font-semibold mt-0.5">
                        Biến thể: {lowVariants.map((v: any) => `${v.size || v.color} (${v.stock})`).join(', ')}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/inventory')}
                      className="text-[10px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition-all border-none cursor-pointer flex-shrink-0"
                    >
                      Nhập kho
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Không có sản phẩm nào sắp hết hàng. Kho hàng an toàn!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
