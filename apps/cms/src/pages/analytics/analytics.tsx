import React, { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '../../utils/api';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag,
  Layers
} from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { IAnalyticsProps } from './analytics.type';

interface AnalyticsData {
  allOrders: any[];
  allProducts: any[];
}

export const Analytics: React.FC<IAnalyticsProps> = (_props) => {
  const [data, setData] = useState<AnalyticsData>({
    allOrders: [],
    allProducts: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<7 | 30>(7);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        const [products, orders] = await Promise.all([
          apiRequest('/products?page=1&limit=100').catch(() => ({ data: [] })),
          apiRequest('/orders').catch(() => [])
        ]);

        const orderList = Array.isArray(orders) ? orders : [];
        const productList = products && Array.isArray(products) ? products : (products?.data || []);

        setData({
          allOrders: orderList,
          allProducts: productList
        });
      } catch (err) {
        console.error('Failed to load analytics data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Process data for line chart dynamically based on timeRange
  const revenueChartData = useMemo(() => {
    const chartPoints = [];
    const today = new Date();
    for (let i = timeRange - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      
      const dayRevenue = data.allOrders
        .filter((o: any) => {
          const orderDate = new Date(o.createdAt);
          return orderDate.toDateString() === date.toDateString() && 
                 (o.status === 'COMPLETED' || o.status === 'PROCESSING' || o.status === 'SHIPPED');
        })
        .reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
      
      chartPoints.push({ date: dateStr, revenue: dayRevenue });
    }
    return chartPoints;
  }, [data.allOrders, timeRange]);

  // Order status distribution
  const orderStatusData = useMemo(() => {
    const statusCounts = {
      COMPLETED: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      PENDING: 0,
      CANCELLED: 0
    };
    
    data.allOrders.forEach((order: any) => {
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
  }, [data.allOrders]);

  // Top selling products
  const topSellingProducts = useMemo(() => {
    const productSales: Record<number, { name: string; revenue: number; quantity: number }> = {};
    
    data.allOrders.forEach((order: any) => {
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
  }, [data.allOrders]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const completedOrders = data.allOrders.filter(o => o.status === 'COMPLETED');
    const totalRev = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const avgOrderValue = completedOrders.length > 0 ? totalRev / completedOrders.length : 0;
    
    return {
      totalRevenue: totalRev,
      avgOrderValue,
      completedCount: completedOrders.length,
      conversionRate: data.allOrders.length > 0 ? (completedOrders.length / data.allOrders.length) * 100 : 0
    };
  }, [data.allOrders]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fadeIn">
        <div className="w-12 h-12 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium">Đang chuẩn bị báo cáo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn text-slate-100">
      {/* Header with Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#1b1c1b] dark:text-white">Báo cáo & Thống kê</h2>
          <p className="text-[#526069] dark:text-slate-400 text-sm mt-1">Phân tích chuyên sâu doanh thu và hiệu suất bán hàng</p>
        </div>
        
        {/* Time Selector Dropdown */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-sm">
          <button 
            onClick={() => setTimeRange(7)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              timeRange === 7 
                ? 'bg-[#0e6877] text-white' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            7 ngày qua
          </button>
          <button 
            onClick={() => setTimeRange(30)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              timeRange === 30 
                ? 'bg-[#0e6877] text-white' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            30 ngày qua
          </button>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[#ecf6f7] dark:bg-[#0e6877]/10 rounded-2xl text-[#0e6877]">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-[#526069] dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Doanh thu tích lũy</p>
            <h3 className="text-xl font-bold text-[#1b1c1b] dark:text-white mt-1">{formatPrice(summaryMetrics.totalRevenue)}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-2xl text-blue-600">
            <ShoppingBag size={22} />
          </div>
          <div>
            <p className="text-[#526069] dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Đơn hàng hoàn tất</p>
            <h3 className="text-xl font-bold text-[#1b1c1b] dark:text-white mt-1">{summaryMetrics.completedCount} đơn hàng</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl text-indigo-600">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-[#526069] dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Giá trị đơn trung bình</p>
            <h3 className="text-xl font-bold text-[#1b1c1b] dark:text-white mt-1">{formatPrice(summaryMetrics.avgOrderValue)}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl text-emerald-600">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-[#526069] dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Tỷ lệ mua hàng</p>
            <h3 className="text-xl font-bold text-[#1b1c1b] dark:text-white mt-1">{summaryMetrics.conversionRate.toFixed(1)}%</h3>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue line chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-[#1b1c1b] dark:text-white">Xu hướng Doanh thu</h3>
              <p className="text-[#526069] dark:text-slate-400 text-xs">Tổng doanh số tích lũy của cửa hàng trong {timeRange} ngày qua</p>
            </div>
          </div>
          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0e6877" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0e6877" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="opacity-30" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tick={{ fill: '#64748b' }} />
                <YAxis stroke="#94a3b8" fontSize={11} tick={{ fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155', 
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [formatPrice(Number(value || 0)), 'Doanh thu']}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#0e6877" 
                  strokeWidth={3}
                  dot={{ fill: '#0e6877', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 7, stroke: '#0e6877', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#1b1c1b] dark:text-white">Tỷ lệ Đơn hàng</h3>
            <p className="text-[#526069] dark:text-slate-400 text-xs">Cơ cấu đơn hàng phân theo trạng thái xử lý</p>
          </div>
          <div className="w-full h-[220px] relative flex justify-center items-center">
            {orderStatusData.length === 0 ? (
              <p className="text-slate-400 text-xs">Chưa có dữ liệu</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value} đơn`, 'Số lượng']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Custom Legends */}
          <div className="grid grid-cols-2 gap-3 text-xs pt-4 border-t border-slate-100 dark:border-slate-800">
            {orderStatusData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[#1b1c1b] dark:text-slate-300 font-medium truncate">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Selling Products Bento Box Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-lg font-bold text-[#1b1c1b] dark:text-white">Top 5 Sản phẩm bán chạy nhất</h3>
          <p className="text-[#526069] dark:text-slate-400 text-xs">Danh sách các sản phẩm đem lại doanh thu cao nhất (Dựa trên đơn đã hoàn thành)</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[#526069] dark:text-slate-400 font-extrabold uppercase tracking-wider">
                <th className="py-4 px-4">Tên sản phẩm</th>
                <th className="py-4 px-4 text-center">Số lượng bán ra</th>
                <th className="py-4 px-4 text-right">Doanh thu thu về</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {topSellingProducts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400">Chưa có đơn hàng hoàn thành để tổng hợp dữ liệu sản phẩm.</td>
                </tr>
              ) : (
                topSellingProducts.map((prod, index) => (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-4 font-bold text-[#1b1c1b] dark:text-white flex items-center gap-3">
                      <span className="w-5 h-5 bg-[#ecf6f7] text-[#0e6877] rounded-full flex items-center justify-center font-bold text-[10px]">
                        {index + 1}
                      </span>
                      {prod.name}
                    </td>
                    <td className="py-4 px-4 text-center font-semibold">{prod.quantity} chiếc</td>
                    <td className="py-4 px-4 text-right font-bold text-teal-600 dark:text-emerald-500">{formatPrice(prod.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default Analytics;
