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
}

export const Analytics: React.FC<IAnalyticsProps> = (_props) => {
  const [data, setData] = useState<AnalyticsData>({ allOrders: [] });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<7 | 30>(7);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        const orders = await apiRequest('/orders').catch(() => []);
        setData({
          allOrders: Array.isArray(orders) ? orders : []
        });
      } catch (err) {
        console.error('Failed to fetch analytics database:', err);
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
        <p className="text-[#526069] text-sm font-medium">Đang chuẩn bị báo cáo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn text-[#1b1c1b] max-w-7xl mx-auto px-2">
      {/* Header with Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Báo cáo & Thống kê</h2>
          <p className="text-[#526069] text-xs font-medium mt-1">Phân tích doanh thu và hiệu suất bán hàng tổng quan</p>
        </div>
        
        {/* Time Selector Dropdown */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs">
          <button 
            onClick={() => setTimeRange(7)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border-none ${
              timeRange === 7 
                ? 'bg-[#0e6877] text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            7 ngày qua
          </button>
          <button 
            onClick={() => setTimeRange(30)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border-none ${
              timeRange === 30 
                ? 'bg-[#0e6877] text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            30 ngày qua
          </button>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-350 flex items-center gap-4">
          <div className="p-3 bg-[#ecf6f7] rounded-2xl text-[#0e6877]">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-[#526069] text-[10px] font-extrabold uppercase tracking-wider">Doanh thu tích lũy</p>
            <h3 className="text-lg font-black text-slate-850 mt-1">{formatPrice(summaryMetrics.totalRevenue)}</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-350 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
            <ShoppingBag size={22} />
          </div>
          <div>
            <p className="text-[#526069] text-[10px] font-extrabold uppercase tracking-wider">Đơn hàng hoàn tất</p>
            <h3 className="text-lg font-black text-slate-850 mt-1">{summaryMetrics.completedCount} đơn hàng</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-350 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-[#526069] text-[10px] font-extrabold uppercase tracking-wider">Giá trị đơn trung bình</p>
            <h3 className="text-lg font-black text-slate-850 mt-1">{formatPrice(summaryMetrics.avgOrderValue)}</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-350 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-[#526069] text-[10px] font-extrabold uppercase tracking-wider">Tỷ lệ mua hàng</p>
            <h3 className="text-lg font-black text-slate-850 mt-1">{summaryMetrics.conversionRate.toFixed(1)}%</h3>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue line chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-slate-850">Xu hướng Doanh thu</h3>
            <p className="text-[#526069] text-xs font-semibold">Tổng doanh số tích lũy của cửa hàng trong {timeRange} ngày qua</p>
          </div>
          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tick={{ fill: '#64748b' }} />
                <YAxis stroke="#94a3b8" fontSize={11} tick={{ fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.96)', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '16px',
                    color: '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
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
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-850">Cơ cấu Đơn hàng</h3>
            <p className="text-[#526069] text-xs font-semibold">Tỷ lệ đơn hàng phân bổ theo trạng thái</p>
          </div>
          <div className="w-full h-[220px] relative flex justify-center items-center">
            {orderStatusData.length === 0 ? (
              <p className="text-slate-400 text-xs">Chưa có dữ liệu đơn hàng</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
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
          <div className="grid grid-cols-2 gap-3 text-xs pt-4 border-t border-slate-100">
            {orderStatusData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-700 font-bold truncate">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Selling Products Bento Box Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-850">Top 5 Sản phẩm bán chạy nhất</h3>
          <p className="text-[#526069] text-xs font-semibold">Danh sách sản phẩm đem lại doanh thu cao nhất (Dựa trên đơn hoàn tất)</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-150 text-[#526069] font-extrabold uppercase tracking-wider">
                <th className="py-4 px-4">Tên sản phẩm</th>
                <th className="py-4 px-4 text-center">Số lượng bán ra</th>
                <th className="py-4 px-4 text-right">Doanh thu thu về</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {topSellingProducts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400 font-medium">Chưa có dữ liệu sản phẩm.</td>
                </tr>
              ) : (
                topSellingProducts.map((prod, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-850 flex items-center gap-3">
                      <span className="w-5 h-5 bg-[#ecf6f7] text-[#0e6877] rounded-full flex items-center justify-center font-bold text-[10px]">
                        {index + 1}
                      </span>
                      {prod.name}
                    </td>
                    <td className="py-4 px-4 text-center font-bold">{prod.quantity} chiếc</td>
                    <td className="py-4 px-4 text-right font-black text-[#0e6877]">{formatPrice(prod.revenue)}</td>
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
