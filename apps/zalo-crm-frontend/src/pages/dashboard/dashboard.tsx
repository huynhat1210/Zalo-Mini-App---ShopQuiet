import React, { useEffect, useState } from 'react';
import { crmApiRequest } from '../../utils/api';
import { 
  Megaphone, 
  Bot, 
  TrendingUp, 
  Users, 
  MessageSquare,
  Sparkles 
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalAutomations: 0,
    activeCampaigns: 0,
    activeAutomations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [campaigns, automations] = await Promise.all([
          crmApiRequest<any[]>('/campaigns').catch(() => []),
          crmApiRequest<any[]>('/automation').catch(() => []),
        ]);

        setStats({
          totalCampaigns: campaigns.length,
          totalAutomations: automations.length,
          activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE' || c.status === 'LAUNCHED').length,
          activeAutomations: automations.filter(a => a.enabled).length,
        });
      } catch (err) {
        console.error('Failed to load CRM stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const chartData = [
    { name: 'Thứ 2', reach: 1200, clicks: 450, conversions: 120 },
    { name: 'Thứ 3', reach: 1900, clicks: 600, conversions: 180 },
    { name: 'Thứ 4', reach: 1500, clicks: 500, conversions: 150 },
    { name: 'Thứ 5', reach: 2100, clicks: 800, conversions: 240 },
    { name: 'Thứ 6', reach: 2400, clicks: 950, conversions: 310 },
    { name: 'Thứ 7', reach: 3000, clicks: 1200, conversions: 420 },
    { name: 'Chủ Nhật', reach: 2800, clicks: 1100, conversions: 380 },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] gap-3">
        <div className="w-8 h-8 border-3 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Đang tải dữ liệu Chiến dịch...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tổng quan Chiến dịch ShopQuiet</h2>
          <p className="text-xs text-slate-500">Giám sát hiệu quả chiến dịch và kịch bản tự động hóa Zalo</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-100 rounded-xl text-teal-800 text-xs font-semibold">
          <Sparkles size={14} className="text-teal-600 animate-pulse" />
          <span>AI Campaign Assistant Active</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
            <Megaphone size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng chiến dịch</p>
            <h3 className="text-2xl font-black text-slate-800 leading-none mt-1">{stats.totalCampaigns}</h3>
            <p className="text-[9px] text-slate-500 mt-1">Đang chạy: {stats.activeCampaigns}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-2xs">
            <Bot size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kịch bản tự động</p>
            <h3 className="text-2xl font-black text-slate-800 leading-none mt-1">{stats.totalAutomations}</h3>
            <p className="text-[9px] text-slate-500 mt-1">Đang kích hoạt: {stats.activeAutomations}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
            <Users size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lượt tiếp cận (Tuần)</p>
            <h3 className="text-2xl font-black text-slate-800 leading-none mt-1">14.9K</h3>
            <p className="text-[9px] text-emerald-600 mt-1 flex items-center gap-0.5">
              <TrendingUp size={10} />
              <span>+18.4% so với trước</span>
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs">
            <MessageSquare size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lượt click tin nhắn</p>
            <h3 className="text-2xl font-black text-slate-800 leading-none mt-1">5.6K</h3>
            <p className="text-[9px] text-slate-500 mt-1">Tỷ lệ tương tác: 37.5%</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs md:col-span-2 space-y-4">
          <h4 className="text-xs font-bold text-[#526069] uppercase tracking-wider">Hiệu quả phễu tiếp thị Zalo (Reach &rarr; Click &rarr; Convert)</h4>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="reach" name="Tiếp cận" stroke="#3b82f6" strokeWidth={2.2} dot={false} />
                <Line type="monotone" dataKey="clicks" name="Lượt Click" stroke="#a855f7" strokeWidth={2.2} dot={false} />
                <Line type="monotone" dataKey="conversions" name="Đơn hàng" stroke="#10b981" strokeWidth={2.2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <h4 className="text-xs font-bold text-[#526069] uppercase tracking-wider">Hiệu quả chuyển đổi Chiến dịch</h4>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="conversions" name="Đơn hàng mua" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
