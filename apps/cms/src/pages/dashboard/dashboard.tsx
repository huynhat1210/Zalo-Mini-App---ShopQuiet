import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../utils/api';
import { 
  ShoppingBag, 
  ReceiptText, 
  Ticket, 
  DollarSign,
  TrendingUp,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalVouchers: number;
  recentOrders: any[];
  allOrders: any[];
  allProducts: any[];
}

import type { IDashboardProps } from './dashboard.type';

export const Dashboard: React.FC<IDashboardProps> = (_props) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalVouchers: 0,
    recentOrders: [],
    allOrders: [],
    allProducts: []
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

        // Use correct Prisma fields: totalAmount (not total)
        const revenue = orderList
          .filter((o: any) => o.status === 'COMPLETED' || o.status === 'PROCESSING')
          .reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

        setStats({
          totalProducts: productList.length,
          totalOrders: orderList.length,
          totalRevenue: revenue,
          totalVouchers: voucherList.length,
          recentOrders: orderList.slice(0, 5),
          allOrders: orderList,
          allProducts: productList
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

  // Prepare chart data
  const revenueChartData = useMemo(() => {
    const last7Days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      
      const dayRevenue = stats.allOrders
        .filter((o: any) => {
          const orderDate = new Date(o.createdAt);
          return orderDate.toDateString() === date.toDateString() && 
                 (o.status === 'COMPLETED' || o.status === 'PROCESSING');
        })
        .reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
      
      last7Days.push({ date: dateStr, revenue: dayRevenue });
    }
    return last7Days;
  }, [stats.allOrders]);

  const orderStatusData = useMemo(() => {
    const statusCounts = {
      COMPLETED: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      PENDING: 0,
      CANCELLED: 0
    };
    
    stats.allOrders.forEach((order: any) => {
      if (statusCounts.hasOwnProperty(order.status)) {
        statusCounts[order.status as keyof typeof statusCounts]++;
      }
    });
    
    return [
      { name: 'Hoàn thành', value: statusCounts.COMPLETED, color: '#10b981' },
      { name: 'Đang xử lý', value: statusCounts.PROCESSING, color: '#3b82f6' },
      { name: 'Đang giao', value: statusCounts.SHIPPED, color: '#6366f1' },
      { name: 'Chờ thanh toán', value: statusCounts.PENDING, color: '#f59e0b' },
      { name: 'Đã hủy', value: statusCounts.CANCELLED, color: '#ef4444' }
    ].filter(item => item.value > 0);
  }, [stats.allOrders]);

  const topSellingProducts = useMemo(() => {
    const productSales: Record<number, { name: string; revenue: number; quantity: number }> = {};
    
    stats.allOrders.forEach((order: any) => {
      if (order.status === 'COMPLETED' && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const productId = item.product?.id;
          const productName = item.product?.name || 'Sản phẩm không tên';
          const price = item.price || 0;
          const quantity = item.quantity || 1;
          
          if (productId) {
            if (!productSales[productId]) {
              productSales[productId] = { name: productName, revenue: 0, quantity: 0 };
            }
            productSales[productId].revenue += price * quantity;
            productSales[productId].quantity += quantity;
          }
        });
      }
    });
    
    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [stats.allOrders]);

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
      color: 'text-[#0e6877] bg-[#ecf6f7] border-[#0e6877]/10',
      onClick: () => navigate('/database/Order')
    },
    {
      title: 'Tổng đơn hàng',
      value: stats.totalOrders.toString(),
      desc: 'Tất cả trạng thái đơn hàng',
      icon: ReceiptText,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
      onClick: () => navigate('/database/Order')
    },
    {
      title: 'Số lượng sản phẩm',
      value: stats.totalProducts.toString(),
      desc: 'Đang hiển thị trên app',
      icon: ShoppingBag,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      onClick: () => navigate('/database/Product')
    },
    {
      title: 'Voucher hiện có',
      value: stats.totalVouchers.toString(),
      desc: 'Mã giảm giá đang hoạt động',
      icon: Ticket,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      onClick: () => navigate('/database/Voucher')
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
            <button key={i} onClick={card.onClick} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-[#0e6877]/20 transition-all duration-300 group text-left w-full">
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
            </button>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Chart */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-[#1b1c1b]">Doanh thu 7 ngày qua</h3>
              <p className="text-[#526069] text-xs">Tổng doanh thu từ đơn hoàn thành & đang xử lý</p>
            </div>
            <div className="p-2 bg-[#ecf6f7] rounded-xl">
              <DollarSign size={18} className="text-[#0e6877]" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tick={{ fill: '#64748b' }} />
              <YAxis stroke="#94a3b8" fontSize={11} tick={{ fill: '#64748b' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255,255,255,0.95)', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '12px',
                  fontSize: '12px'
                }}
                formatter={(value: any) => formatPrice(Number(value || 0))}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#0e6877" 
                strokeWidth={2.5}
                dot={{ fill: '#0e6877', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#0e6877', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-[#1b1c1b]">Phân phối đơn hàng</h3>
              <p className="text-[#526069] text-xs">Theo trạng thái đơn hàng</p>
            </div>
            <div className="p-2 bg-[#ecf6f7] rounded-xl">
              <BarChart3 size={18} className="text-[#0e6877]" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={orderStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {orderStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255,255,255,0.95)', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '12px',
                  fontSize: '12px'
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
                formatter={(value: string) => <span className="text-xs text-slate-700">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
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
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0e6877] bg-[#ecf6f7] px-3 py-1 rounded-full flex items-center gap-1.5 border border-[#0e6877]/10">
                <TrendingUp size={12} />
                Thời gian thực
              </span>
              <button
                onClick={() => navigate('/database/Order')}
                className="text-xs font-bold text-[#526069] hover:text-[#0e6877] bg-slate-50 hover:bg-[#ecf6f7] border border-slate-200 hover:border-[#0e6877]/20 px-3 py-1 rounded-full flex items-center gap-1.5 transition-all"
              >
                Xem tất cả <ArrowRight size={11} />
              </button>
            </div>
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
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate('/database/Order')}>
                      <td className="py-4 px-4 font-mono text-xs text-[#0e6877] font-semibold">
                        #{typeof order.id === 'string' ? order.id.slice(-6).toUpperCase() : String(order.id)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800">{order.shippingName || 'Zalo User'}</div>
                        <div className="text-[10px] text-[#526069] font-medium">{order.shippingPhone || 'Không có SĐT'}</div>
                      </td>
                      <td className="py-4 px-4 text-[#0e6877] font-bold">{formatPrice(order.totalAmount || 0)}</td>
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

        {/* Top Selling Products */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-[#1b1c1b]">Top sản phẩm bán chạy</h3>
              <p className="text-[#526069] text-xs">Theo doanh thu</p>
            </div>
            <div className="p-2 bg-[#ecf6f7] rounded-xl">
              <ShoppingBag size={18} className="text-[#0e6877]" />
            </div>
          </div>

          <div className="space-y-3">
            {topSellingProducts.length > 0 ? (
              topSellingProducts.map((product, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-[#fbf9f7] rounded-xl border border-slate-100">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    index === 0 ? 'bg-[#0e6877]' : index === 1 ? 'bg-[#0a9bb5]' : index === 2 ? 'bg-[#14b8a6]' : 'bg-slate-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1b1c1b] truncate">{product.name}</p>
                    <p className="text-[10px] text-[#526069]">Đã bán: {product.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-[#0e6877]">{formatPrice(product.revenue)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-[#526069] text-xs">
                Chưa có dữ liệu bán hàng
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

