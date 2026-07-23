import React, { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '../../utils/api';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Eye,
  ShoppingCart,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { IAnalyticsProps } from './analytics.type';
import { exportToExcel } from '../../utils/excel-export.util';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface IOrder {
  id: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  items?: { product?: { id: number; name: string }; price: number; quantity: number; productId: number }[];
}

interface IDailyStatPoint {
  date: string;
  views: number;
  addToCarts: number;
  purchases: number;
  searches: number;
}

interface ITopProduct {
  productId: number;
  productName: string;
  views: number;
  productPrice: number;
}

interface IFunnelData {
  views: number;
  addToCarts: number;
  purchases: number;
  searches: number;
  conversionRates: {
    viewToCart: string;
    cartToPurchase: string;
    viewToPurchase: string;
  };
}

// ─── Component ───────────────────────────────────────────────────────────────
export const Analytics: React.FC<IAnalyticsProps> = (_props) => {
  const [allOrders, setAllOrders] = useState<IOrder[]>([]);
  const [dailyStats, setDailyStats] = useState<IDailyStatPoint[]>([]);
  const [topProducts, setTopProducts] = useState<ITopProduct[]>([]);
  const [topSearchKeywords, setTopSearchKeywords] = useState<{ keyword: string; count: number }[]>([]);
  const [funnelData, setFunnelData] = useState<IFunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<7 | 30>(7);

  // ─── Fetch All Data ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async (isSilent = false) => {
      try {
        if (!isSilent) setLoading(true);

        const [orders, daily, topProds, funnel, topSearches] = await Promise.allSettled([
          apiRequest<IOrder[]>('/orders/admin/all').catch(() => []),
          apiRequest<IDailyStatPoint[]>(`/analytics/daily-stats?days=${timeRange}`).catch(() => []),
          apiRequest<ITopProduct[]>('/analytics/top-products?limit=8').catch(() => []),
          apiRequest<IFunnelData>('/analytics/funnel').catch(() => null),
          apiRequest<{ keyword: string; count: number }[]>('/analytics/top-searches?limit=8').catch(() => []),
        ]);

        if (orders.status === 'fulfilled') setAllOrders(Array.isArray(orders.value) ? orders.value : []);
        if (daily.status === 'fulfilled') setDailyStats(Array.isArray(daily.value) ? daily.value : []);
        if (topProds.status === 'fulfilled') setTopProducts(Array.isArray(topProds.value) ? topProds.value : []);
        if (funnel.status === 'fulfilled' && funnel.value) setFunnelData(funnel.value);
        if (topSearches.status === 'fulfilled' && Array.isArray(topSearches.value)) setTopSearchKeywords(topSearches.value);
      } catch (err) {
        console.error('Analytics fetch error:', err);
      } finally {
        if (!isSilent) setLoading(false);
      }
    };

    fetchAll();
    const interval = setInterval(() => fetchAll(true), 30_000);
    return () => clearInterval(interval);
  }, [timeRange]);

  // ─── Formatters ─────────────────────────────────────────────────────────────
  const formatPrice = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  // ─── Computed Metrics from Orders ───────────────────────────────────────────
  const summaryMetrics = useMemo(() => {
    const done = allOrders.filter((o) => ['COMPLETED', 'DELIVERED'].includes(o.status));
    const totalRevenue = done.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const avgOrderValue = done.length > 0 ? totalRevenue / done.length : 0;
    const conversionRate = allOrders.length > 0 ? (done.length / allOrders.length) * 100 : 0;

    // Compare with previous period
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - timeRange);
    const prevCutoff = new Date(cutoff);
    prevCutoff.setDate(prevCutoff.getDate() - timeRange);

    const currentPeriodOrders = allOrders.filter((o) => new Date(o.createdAt) >= cutoff);
    const prevPeriodOrders = allOrders.filter(
      (o) => new Date(o.createdAt) >= prevCutoff && new Date(o.createdAt) < cutoff,
    );
    const currentRevenue = currentPeriodOrders
      .filter((o) => ['COMPLETED', 'DELIVERED'].includes(o.status))
      .reduce((s, o) => s + (o.totalAmount || 0), 0);
    const prevRevenue = prevPeriodOrders
      .filter((o) => ['COMPLETED', 'DELIVERED'].includes(o.status))
      .reduce((s, o) => s + (o.totalAmount || 0), 0);
    const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : null;

    return { totalRevenue, avgOrderValue, conversionRate, completedCount: done.length, revenueGrowth, currentRevenue };
  }, [allOrders, timeRange]);

  // ─── Revenue Chart (from orders, day by day) ────────────────────────────────
  const revenueChartData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: timeRange }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (timeRange - 1 - i));
      const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      const isoDate = date.toISOString().split('T')[0];

      const dayRevenue = allOrders
        .filter((o) => {
          const od = new Date(o.createdAt).toISOString().split('T')[0];
          return od === isoDate && ['COMPLETED', 'DELIVERED', 'PROCESSING', 'SHIPPED'].includes(o.status);
        })
        .reduce((s, o) => s + (o.totalAmount || 0), 0);

      const stat = dailyStats.find((d) => d.date === isoDate);

      return { date: dateStr, revenue: dayRevenue, views: stat?.views || 0, addToCarts: stat?.addToCarts || 0 };
    });
  }, [allOrders, dailyStats, timeRange]);

  // ─── Order Status Pie ────────────────────────────────────────────────────────
  const orderStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    allOrders.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    const labels: Record<string, string> = {
      COMPLETED: 'Hoàn thành', DELIVERED: 'Đã giao', PROCESSING: 'Đang xử lý',
      SHIPPED: 'Đang giao', PENDING: 'Chờ xác nhận', CANCELLED: 'Đã hủy',
    };
    const colors: Record<string, string> = {
      COMPLETED: '#10b981', DELIVERED: '#3b82f6', PROCESSING: '#f59e0b',
      SHIPPED: '#8b5cf6', PENDING: '#6b7280', CANCELLED: '#ef4444',
    };
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: labels[k] || k, value: v, color: colors[k] || '#94a3b8' }));
  }, [allOrders]);

  // ─── Top Products from Orders ────────────────────────────────────────────────
  const topSellingProducts = useMemo(() => {
    const map: Record<number, { name: string; revenue: number; count: number }> = {};
    allOrders
      .filter((o) => ['COMPLETED', 'DELIVERED'].includes(o.status))
      .forEach((o) => {
        o.items?.forEach((item) => {
          const id = item.productId;
          if (!map[id]) map[id] = { name: item.product?.name || `#${id}`, revenue: 0, count: 0 };
          map[id].revenue += item.price * item.quantity;
          map[id].count += item.quantity;
        });
      });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [allOrders]);

  // ─── Funnel Chart Data ───────────────────────────────────────────────────────
  const funnelChartData = useMemo(() => {
    if (!funnelData) return [];
    return [
      { label: '👁 Lượt xem', value: funnelData.views, color: '#0e6877', pct: '100%' },
      { label: '🛒 Thêm giỏ', value: funnelData.addToCarts, color: '#3b82f6', pct: funnelData.conversionRates.viewToCart },
      { label: '💳 Mua hàng', value: funnelData.purchases, color: '#10b981', pct: funnelData.conversionRates.viewToPurchase },
    ];
  }, [funnelData]);

  // ─── Top Products Bar Chart (from analytics API) ─────────────────────────────
  const topProductsBarData = useMemo(() =>
    topProducts.slice(0, 8).map((p) => ({ name: p.productName.slice(0, 15) + (p.productName.length > 15 ? '…' : ''), views: p.views })),
    [topProducts],
  );

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="w-12 h-12 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm font-semibold">Đang tải dữ liệu phân tích...</p>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Phân Tích & Báo Cáo</h1>
          <p className="text-gray-500 text-xs mt-1">Tổng quan hiệu suất kinh doanh theo thời gian thực</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              exportToExcel(
                revenueChartData,
                `Bao_Cao_Doanh_Thu_Analytics_${timeRange}Ngay`,
                [
                  { key: 'date', label: 'Ngày' },
                  { key: 'revenue', label: 'Doanh Thu (VNĐ)', formatter: (val) => val?.toLocaleString('vi-VN') },
                  { key: 'views', label: 'Lượt Xem Sản Phẩm' },
                  { key: 'addToCarts', label: 'Lượt Thêm Giỏ Hàng' },
                ],
              )
            }
            className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-2xl hover:bg-emerald-800 transition-all flex items-center gap-2 border-none cursor-pointer shadow-xs active:scale-95"
          >
            📊 Xuất Excel Báo Cáo
          </button>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-1">
            {([7, 30] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border-none ${timeRange === r ? 'bg-[#0e6877] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {r} ngày
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <DollarSign className="w-5 h-5" />,
            bg: 'bg-teal-50', text: 'text-teal-600',
            label: 'Doanh thu tích lũy',
            value: formatPrice(summaryMetrics.totalRevenue),
            growth: summaryMetrics.revenueGrowth,
          },
          {
            icon: <ShoppingBag className="w-5 h-5" />,
            bg: 'bg-blue-50', text: 'text-blue-600',
            label: 'Đơn hoàn thành',
            value: `${summaryMetrics.completedCount} đơn`,
            growth: null,
          },
          {
            icon: <TrendingUp className="w-5 h-5" />,
            bg: 'bg-purple-50', text: 'text-purple-600',
            label: 'Giá trị đơn TB',
            value: formatPrice(summaryMetrics.avgOrderValue),
            growth: null,
          },
          {
            icon: <Users className="w-5 h-5" />,
            bg: 'bg-emerald-50', text: 'text-emerald-600',
            label: 'Tỉ lệ hoàn thành',
            value: `${summaryMetrics.conversionRate.toFixed(1)}%`,
            growth: null,
          },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`${card.bg} ${card.text} p-2.5 rounded-xl`}>{card.icon}</div>
              {card.growth !== null && (
                <span className={`flex items-center gap-0.5 text-xs font-bold ${card.growth >= 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                  {card.growth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {Math.abs(card.growth).toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">{card.label}</p>
            <p className="text-lg font-black text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Revenue + Views Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-1">Xu hướng Doanh thu & Lượt xem</h3>
          <p className="text-gray-400 text-xs mb-4">{timeRange} ngày qua — kết hợp dữ liệu đơn hàng và analytics tracking</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }}
                formatter={((value: any, name: any) => [
                  name === 'revenue' ? formatPrice(Number(value)) : value,
                  name === 'revenue' ? 'Doanh thu' : name === 'views' ? 'Lượt xem' : 'Thêm giỏ',
                ]) as any}
              />
              <Legend formatter={(v) => (v === 'revenue' ? 'Doanh thu' : v === 'views' ? 'Lượt xem' : 'Thêm giỏ')} />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#0e6877" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line yAxisId="right" type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="addToCarts" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 2" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Pie */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-sm font-bold text-gray-800 mb-1">Cơ cấu Đơn hàng</h3>
          <p className="text-gray-400 text-xs mb-4">Phân bổ theo trạng thái</p>
          {orderStatusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value">
                    {orderStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} đơn`, 'Số lượng']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-gray-100">
                {orderStatusData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-600 truncate">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu</div>
          )}
        </div>
      </div>

      {/* ── Funnel Conversion + Top Products BarChart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Conversion Funnel */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-1">Phễu Chuyển Đổi</h3>
          <p className="text-gray-400 text-xs mb-5">Lượt xem → Thêm giỏ → Mua hàng (dữ liệu analytics thực tế)</p>
          {funnelChartData.length > 0 ? (
            <div className="space-y-3">
              {funnelChartData.map((step, i) => {
                const maxVal = funnelChartData[0]?.value || 1;
                const pct = Math.round((step.value / maxVal) * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-700">{step.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{step.value.toLocaleString()}</span>
                        {i > 0 && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ backgroundColor: step.color + '20', color: step.color }}>
                            {step.pct}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: step.color }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold">View → Giỏ</p>
                  <p className="text-sm font-black text-blue-600">{funnelData?.conversionRates.viewToCart || '0%'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold">Giỏ → Mua</p>
                  <p className="text-sm font-black text-teal-600">{funnelData?.conversionRates.cartToPurchase || '0%'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold">View → Mua</p>
                  <p className="text-sm font-black text-emerald-600">{funnelData?.conversionRates.viewToPurchase || '0%'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Chưa có dữ liệu analytics. Hãy chắc chắn Mini App đang track events.
            </div>
          )}
        </div>

        {/* Top Products Bar Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-1">Top Sản phẩm được xem nhiều nhất</h3>
          <p className="text-gray-400 text-xs mb-4">Dữ liệu từ Analytics API — lượt xem sản phẩm</p>
          {topProductsBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProductsBarData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#374151' }} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
                  formatter={(v: any) => [`${v} lượt xem`, 'Lượt xem']}
                />
                <Bar dataKey="views" fill="#0e6877" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Chưa có dữ liệu. Analytics events chưa được ghi nhận.
            </div>
          )}
        </div>
      </div>

      {/* ── Top Searched Keywords Section ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800">🔍 Top Từ Khóa Được Tìm Kiếm Nhiều Nhất</h3>
            <p className="text-gray-400 text-xs mt-0.5">Dữ liệu thực tế từ lượt tìm kiếm của khách hàng trên Zalo Mini App</p>
          </div>
          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
            Realtime Analytics
          </span>
        </div>

        {topSearchKeywords.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {topSearchKeywords.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-purple-50/50 hover:bg-purple-50 border border-purple-100 rounded-xl transition-all">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] font-black shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-gray-800 truncate">
                    #{item.keyword}
                  </span>
                </div>
                <span className="text-[10px] font-black text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200 shrink-0">
                  {item.count} lượt
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-24 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
            Chưa có từ khóa tìm kiếm nào được ghi nhận. Hãy thử tìm kiếm trên Zalo Mini App.
          </div>
        )}
      </div>

      {/* ── Top Selling Products Table (from Orders) ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Top 5 Sản phẩm Doanh thu cao nhất</h3>
            <p className="text-gray-400 text-xs mt-0.5">Tính từ đơn hàng hoàn thành (COMPLETED / DELIVERED)</p>
          </div>
          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">Từ đơn hàng</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                <th className="text-left py-3 px-2">#</th>
                <th className="text-left py-3 px-2">Sản phẩm</th>
                <th className="text-center py-3 px-2">SL bán</th>
                <th className="text-right py-3 px-2">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {topSellingProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">Chưa có đơn hàng hoàn thành nào.</td>
                </tr>
              ) : (
                topSellingProducts.map((prod, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 px-2">
                      <span className="w-6 h-6 bg-teal-50 text-teal-700 rounded-full flex items-center justify-center text-[10px] font-black">{i + 1}</span>
                    </td>
                    <td className="py-3.5 px-2 text-sm font-semibold text-gray-800">{prod.name}</td>
                    <td className="py-3.5 px-2 text-center text-sm text-gray-500">{prod.count}</td>
                    <td className="py-3.5 px-2 text-right text-sm font-black text-teal-700">{formatPrice(prod.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Analytics Quick Stats ── */}
      {funnelData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: <Eye className="w-4 h-4" />, label: 'Tổng lượt xem SP', value: funnelData.views.toLocaleString(), bg: 'bg-blue-50', text: 'text-blue-600' },
            { icon: <ShoppingCart className="w-4 h-4" />, label: 'Lần thêm giỏ', value: funnelData.addToCarts.toLocaleString(), bg: 'bg-amber-50', text: 'text-amber-600' },
            { icon: <ShoppingBag className="w-4 h-4" />, label: 'Lần mua hàng', value: funnelData.purchases.toLocaleString(), bg: 'bg-emerald-50', text: 'text-emerald-600' },
            { icon: <TrendingUp className="w-4 h-4" />, label: 'Lượt tìm kiếm', value: funnelData.searches.toLocaleString(), bg: 'bg-purple-50', text: 'text-purple-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className={`${stat.bg} ${stat.text} p-2 rounded-xl`}>{stat.icon}</div>
              <div>
                <p className="text-[10px] text-gray-400 font-semibold">{stat.label}</p>
                <p className="text-base font-black text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default Analytics;
