import React, { useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import { 
  ShoppingBag, 
  ReceiptText, 
  Ticket, 
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Truck
} from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalVouchers: number;
  recentOrders: any[];
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalVouchers: 0,
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [products, orders, vouchers] = await Promise.all([
          apiRequest('/products?page=1&limit=100').catch(() => ({ data: [] })),
          apiRequest('/orders').catch(() => []),
          apiRequest('/vouchers').catch(() => [])
        ]);

        const orderList = Array.isArray(orders) ? orders : [];
        const productList = products && Array.isArray(products) ? products : (products?.data || []);
        const voucherList = Array.isArray(vouchers) ? vouchers : [];

        const revenue = orderList
          .filter((o: any) => o.status === 'COMPLETED' || o.status === 'PROCESSING')
          .reduce((sum: number, o: any) => sum + (o.total || 0), 0);

        setStats({
          totalProducts: productList.length,
          totalOrders: orderList.length,
          totalRevenue: revenue,
          totalVouchers: voucherList.length,
          recentOrders: orderList.slice(0, 5)
        });
      } catch (err) {
        console.error('Failed to load dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full">Chờ thanh toán</span>;
      case 'PROCESSING':
        return <span className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full">Đang xử lý</span>;
      case 'SHIPPED':
        return <span className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-100 rounded-full">Đang giao</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-full">Hoàn thành</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-100 rounded-full">Đã hủy</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded-full">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fadeIn">
        <div className="w-12 h-12 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#526069] text-sm font-medium">Đang tải dữ liệu tổng quan...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Doanh thu thuần',
      value: formatPrice(stats.totalRevenue),
      desc: 'Từ đơn hoàn thành & xử lý',
      icon: DollarSign,
      color: 'text-[#0e6877] bg-[#ecf6f7] border-[#0e6877]/10'
    },
    {
      title: 'Tổng đơn hàng',
      value: stats.totalOrders.toString(),
      desc: 'Tất cả trạng thái đơn hàng',
      icon: ReceiptText,
      color: 'text-blue-600 bg-blue-50 border-blue-100'
    },
    {
      title: 'Số lượng sản phẩm',
      value: stats.totalProducts.toString(),
      desc: 'Đang hiển thị trên app',
      icon: ShoppingBag,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100'
    },
    {
      title: 'Voucher hiện có',
      value: stats.totalVouchers.toString(),
      desc: 'Mã giảm giá đang hoạt động',
      icon: Ticket,
      color: 'text-amber-600 bg-amber-50 border-amber-100'
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-[#1b1c1b] tracking-tight">Tổng quan hệ thống</h2>
        <p className="text-[#526069] text-sm mt-1">Theo dõi hoạt động kinh doanh của ShopQuiet</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-305 group">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-[#526069] text-xs font-bold uppercase tracking-wider">{card.title}</span>
                  <h3 className="text-2xl font-bold text-[#1b1c1b] tracking-tight">{card.value}</h3>
                  <p className="text-[#526069] text-xs font-medium">{card.desc}</p>
                </div>
                <div className={`p-3 rounded-2xl border ${card.color} transition-transform group-hover:scale-105 duration-300`}>
                  <Icon size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-[#1b1c1b]">Đơn hàng gần đây</h3>
              <p className="text-[#526069] text-xs">Danh sách 5 đơn hàng mới nhất</p>
            </div>
            <span className="text-xs font-bold text-[#0e6877] bg-[#ecf6f7] px-3 py-1 rounded-full flex items-center gap-1.5 border border-[#0e6877]/10">
              <TrendingUp size={12} />
              Thời gian thực
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#1b1c1b]">
              <thead className="bg-[#fbf9f7] text-[#526069] text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Mã đơn</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Tổng tiền</th>
                  <th className="py-3 px-4 rounded-r-xl">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentOrders.length > 0 ? (
                  stats.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4 font-mono text-xs text-[#0e6877] font-semibold">#{order.id.slice(-6).toUpperCase()}</td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800">{order.customerName || 'Zalo User'}</div>
                        <div className="text-[10px] text-[#526069] font-medium">{order.phone || 'Không có SĐT'}</div>
                      </td>
                      <td className="py-4 px-4 text-[#0e6877] font-bold">{formatPrice(order.total || 0)}</td>
                      <td className="py-4 px-4">{getStatusBadge(order.status)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#526069] text-xs font-medium">Chưa có đơn hàng nào trong hệ thống</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-[#1b1c1b]">Lối tắt thao tác nhanh</h3>
            <p className="text-[#526069] text-xs">Các hoạt động quản trị phổ biến</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#fbf9f7] border border-slate-100 hover:border-[#0e6877]/25 transition-all">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                <Clock size={16} />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-xs font-bold text-[#1b1c1b]">Kiểm tra kho hàng</p>
                <p className="text-[10px] text-[#526069] truncate font-medium">Kiểm tra mức độ tồn kho sản phẩm</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#fbf9f7] border border-slate-100 hover:border-[#0e6877]/25 transition-all">
              <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                <Truck size={16} />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-xs font-bold text-[#1b1c1b]">Trạng thái vận chuyển</p>
                <p className="text-[10px] text-[#526069] truncate font-medium">Cập nhật lộ trình giao nhận hàng</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#fbf9f7] border border-slate-100 hover:border-[#0e6877]/25 transition-all">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <CheckCircle size={16} />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-xs font-bold text-[#1b1c1b]">Ví Voucher</p>
                <p className="text-[10px] text-[#526069] truncate font-medium">Kích hoạt mã giảm giá chiến dịch</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
