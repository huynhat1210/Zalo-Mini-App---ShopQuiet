import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import {
  Megaphone,
  Plus,
  CheckCircle2,
  Clock,
  Send,
  Users,
  TrendingUp,
  Search,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react';
import type { ICampaignsProps } from './campaigns.type';
import { useToast } from '../../contexts';

interface ICampaign {
  id: number;
  title: string;
  description?: string | null;
  type: string; // 'VOUCHER', 'BONUS_COINS', 'BROADCAST', 'FLASH_SALE'
  targetSegment: string; // 'ALL', 'SILVER', 'GOLD', 'DIAMOND', 'INACTIVE_30_DAYS', 'VIP'
  voucherCode?: string | null;
  bonusCoins: number;
  discountPercent: number;
  status: string; // 'DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED'
  scheduledAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  totalTargeted: number;
  totalOpened: number;
  totalConverted: number;
  revenueGenerated: number;
  createdAt: string;
  _count?: { users: number };
}

export const Campaigns: React.FC<ICampaignsProps> = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [campaigns, setCampaigns] = useState<ICampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [launchingId, setLaunchingId] = useState<number | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('VOUCHER');
  const [targetSegment, setTargetSegment] = useState('ALL');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherMode, setVoucherMode] = useState<'SELECT' | 'CREATE'>('SELECT');
  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherTitle, setNewVoucherTitle] = useState('');
  const [newVoucherDiscount, setNewVoucherDiscount] = useState<number>(30000);
  const [newVoucherMinOrder, setNewVoucherMinOrder] = useState<number>(100000);
  const [bonusCoins, setBonusCoins] = useState<number>(100);
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [scheduledAt, setScheduledAt] = useState('');
  const [vouchers, setVouchers] = useState<{ code: string; title?: string }[]>([]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('VOUCHER');
    setTargetSegment('ALL');
    setVoucherCode('');
    setVoucherMode('SELECT');
    setNewVoucherCode('');
    setNewVoucherTitle('');
    setNewVoucherDiscount(30000);
    setNewVoucherMinOrder(100000);
    setBonusCoins(100);
    setDiscountPercent(10);
    setScheduledAt('');
  };

  const handleGenerateAi = async () => {
    try {
      setIsAiGenerating(true);
      const res = await apiRequest<{ title: string; description: string }>('/campaigns/generate-ai', 'POST', {
        topic: title || 'Khuyến mãi đặc biệt ShopQuiet',
        targetSegment,
      });
      if (res?.title) setTitle(res.title);
      if (res?.description) setDescription(res.description);
      toastSuccess('Thành công', 'Gemini AI đã tạo nội dung chiến dịch tiếp thị!');
    } catch (e) {
      toastError('Lỗi', 'Không thể tạo nội dung bằng AI');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<ICampaign[]>('/campaigns');
      setCampaigns(res || []);
    } catch (e) {
      toastError('Lỗi', 'Không thể tải danh sách chiến dịch');
    } finally {
      setLoading(false);
    }
  };

  const fetchVouchers = async () => {
    try {
      const res = await apiRequest<any[]>('/vouchers');
      setVouchers(res || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchCampaigns();
    fetchVouchers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toastError('Lỗi', 'Vui lòng nhập tên chiến dịch');
      return;
    }

    let finalVoucherCode = voucherCode;

    if (type === 'VOUCHER') {
      if (voucherMode === 'CREATE') {
        if (!newVoucherCode.trim()) {
          toastError('Lỗi', 'Vui lòng nhập mã Voucher mới');
          return;
        }
        try {
          const vCode = newVoucherCode.trim().toUpperCase();
          await apiRequest('/vouchers', 'POST', {
            code: vCode,
            title: newVoucherTitle.trim() || `Ưu đãi ${vCode}`,
            discountValue: Number(newVoucherDiscount),
            discountType: 'FIXED_AMOUNT',
            minOrderValue: Number(newVoucherMinOrder),
            stock: 9999,
            status: 'ACTIVE',
          });
          finalVoucherCode = vCode;
          fetchVouchers();
        } catch (vErr: any) {
          toastError('Lỗi tạo Voucher', vErr?.message || 'Không thể tạo Voucher mới');
          return;
        }
      } else if (!voucherCode) {
        toastError('Lỗi', 'Vui lòng chọn hoặc tạo mới mã Voucher');
        return;
      }
    }

    try {
      await apiRequest('/campaigns', 'POST', {
        title,
        description,
        type,
        targetSegment,
        voucherCode: type === 'VOUCHER' ? finalVoucherCode : null,
        bonusCoins: type === 'BONUS_COINS' ? Number(bonusCoins) : 0,
        discountPercent: type === 'FLASH_SALE' ? Number(discountPercent) : 0,
        scheduledAt: scheduledAt || null,
      });

      toastSuccess('Thành công', 'Đã tạo chiến dịch tiếp thị mới');
      setIsModalOpen(false);
      resetForm();
      fetchCampaigns();
    } catch (e: any) {
      toastError('Thất bại', e?.message || 'Không thể tạo chiến dịch');
    }
  };

  const handleLaunch = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn KÍCH HOẠT PHÁT chiến dịch này ngay lập tức?')) return;
    try {
      setLaunchingId(id);
      await apiRequest(`/campaigns/${id}/launch`, 'POST');
      toastSuccess('Thành công', 'Chiến dịch đã được phát tới người dùng Zalo!');
      fetchCampaigns();
    } catch (e: any) {
      toastError('Lỗi', e?.message || 'Không thể phát chiến dịch');
    } finally {
      setLaunchingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Xóa chiến dịch này?')) return;
    try {
      await apiRequest(`/campaigns/${id}`, 'DELETE');
      toastSuccess('Đã xóa', 'Chiến dịch đã được loại bỏ');
      fetchCampaigns();
    } catch (e) {
      toastError('Lỗi', 'Không thể xóa chiến dịch');
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalTargetedAll = campaigns.reduce((sum, c) => sum + c.totalTargeted, 0);
  const totalRevenueAll = campaigns.reduce((sum, c) => sum + c.revenueGenerated, 0);
  const completedCount = campaigns.filter((c) => c.status === 'COMPLETED').length;

  return (
    <div className="p-6 space-[#0e6877] space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-teal-50 text-[#0e6877] rounded-2xl">
              <Megaphone size={22} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Quản Lý Chiến Dịch Marketing</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Tạo chiến dịch tiếp thị, tặng voucher, quà tặng Xu & truyền thông trực tiếp đến Zalo Mini App
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-[#0e6877] hover:bg-[#0b5460] text-white text-xs font-bold rounded-2xl transition-all shadow-md flex items-center gap-2 border-none cursor-pointer active:scale-95"
        >
          <Plus size={16} /> Tạo Chiến Dịch Mới
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Megaphone size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tổng Chiến Dịch</span>
            <h3 className="text-xl font-extrabold text-slate-900">{campaigns.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Đã Hoàn Thành</span>
            <h3 className="text-xl font-extrabold text-emerald-600">{completedCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Khách Hàng Tiếp Cận</span>
            <h3 className="text-xl font-extrabold text-blue-600">{totalTargetedAll.toLocaleString('vi-VN')}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Doanh Thu Mang Về</span>
            <h3 className="text-xl font-extrabold text-amber-600">{totalRevenueAll.toLocaleString('vi-VN')} đ</h3>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên chiến dịch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-[#0e6877]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'VOUCHER', label: '🎟️ Tặng Voucher' },
            { id: 'BONUS_COINS', label: '💰 Tặng Xu' },
            { id: 'BROADCAST', label: '📢 Thông báo' },
            { id: 'FLASH_SALE', label: '⚡ Flash Sale' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border-none cursor-pointer transition-all whitespace-nowrap ${
                typeFilter === t.id ? 'bg-[#0e6877] text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Đang tải danh sách chiến dịch...</div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">Chưa có chiến dịch nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Chiến dịch</th>
                  <th className="py-3.5 px-4">Loại</th>
                  <th className="py-3.5 px-4">Phân tập Khách</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-center">Tiếp cận / Mở</th>
                  <th className="py-3.5 px-4 text-center">Chuyển đổi ROI</th>
                  <th className="py-3.5 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCampaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-extrabold text-slate-900 text-sm">{c.title}</div>
                      {c.description && <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{c.description}</div>}
                      <div className="text-[10px] text-slate-400 mt-1">
                        Ngày tạo: {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1 bg-slate-100 text-slate-700">
                        {c.type === 'VOUCHER' && <>🎟️ Voucher: {c.voucherCode || 'N/A'}</>}
                        {c.type === 'BONUS_COINS' && <>💰 Tặng {c.bonusCoins} Xu</>}
                        {c.type === 'BROADCAST' && <>📢 Thông báo</>}
                        {c.type === 'FLASH_SALE' && <>⚡ Giảm {c.discountPercent}%</>}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-semibold text-slate-600">
                      <span className="bg-teal-50 text-[#0e6877] px-2.5 py-0.5 rounded-md text-[10.5px]">
                        {c.targetSegment === 'ALL' && '🌐 Tất cả người dùng'}
                        {c.targetSegment === 'SILVER' && '🥈 Hạng Bạc'}
                        {c.targetSegment === 'GOLD' && '🥇 Hạng Vàng'}
                        {c.targetSegment === 'DIAMOND' && '💎 Hạng Kim cương'}
                        {c.targetSegment === 'INACTIVE_30_DAYS' && '⏰ Chưa mua 30 ngày'}
                        {c.targetSegment === 'VIP' && '⭐ Khách hàng VIP'}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      {c.status === 'COMPLETED' ? (
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1">
                          <CheckCircle2 size={12} /> Đã phát
                        </span>
                      ) : c.status === 'SCHEDULED' ? (
                        <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1">
                          <Clock size={12} /> Hẹn giờ ngầm
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full text-[10px]">
                          Bản nháp
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <div className="font-extrabold text-slate-900">
                        {c.totalTargeted > 0 ? `${c.totalTargeted} khách` : '-'}
                      </div>
                      {c.totalTargeted > 0 && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {c.totalOpened} mở ({Math.round((c.totalOpened / c.totalTargeted) * 100)}%)
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <div className="font-extrabold text-emerald-700">
                        {c.revenueGenerated ? `${c.revenueGenerated.toLocaleString('vi-VN')} đ` : '0 đ'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-bold">
                        {c.totalConverted} đơn chốt
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {c.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleLaunch(c.id)}
                            disabled={launchingId === c.id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 border-none cursor-pointer active:scale-95 transition-all shadow-xs disabled:opacity-50"
                          >
                            <Send size={12} /> {launchingId === c.id ? 'Đang phát...' : 'Phát ngay'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border-none cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Create Campaign */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Megaphone size={18} className="text-[#0e6877]" /> Tạo Chiến Dịch Tiếp Thị Mới
              </h3>
              <button
                type="button"
                onClick={handleGenerateAi}
                disabled={isAiGenerating}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-extrabold text-[11px] rounded-xl border border-amber-300/60 flex items-center gap-1 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                <Sparkles size={13} className="text-amber-600" />
                {isAiGenerating ? 'AI đang viết...' : 'Gemini AI Viết Mẫu'}
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên chiến dịch *</label>
                <input
                  type="text"
                  placeholder="VD: Tri ân Hội Viên Kim Cương 8/8"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877]"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mô tả thông báo / Ưu đãi</label>
                <textarea
                  placeholder="Nội dung sẽ gửi đến Zalo Mini App của khách hàng..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Loại chiến dịch</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877]"
                  >
                    <option value="VOUCHER">🎟️ Tặng Voucher</option>
                    <option value="BONUS_COINS">💰 Tặng Xu Quà Tặng</option>
                    <option value="BROADCAST">📢 Thông Báo / Banner</option>
                    <option value="FLASH_SALE">⚡ Giảm Giá Flash Sale</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phân tập Khách hàng</label>
                  <select
                    value={targetSegment}
                    onChange={(e) => setTargetSegment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877]"
                  >
                    <option value="ALL">🌐 Tất cả người dùng</option>
                    <option value="SILVER">🥈 Hạng Bạc</option>
                    <option value="GOLD">🥇 Hạng Vàng</option>
                    <option value="DIAMOND">💎 Hạng Kim Cương</option>
                    <option value="INACTIVE_30_DAYS">⏰ Chưa mua 30 ngày</option>
                    <option value="VIP">⭐ Khách VIP (Trên 1M)</option>
                  </select>
                </div>
              </div>

              {type === 'VOUCHER' && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">Mã Voucher Tặng</label>
                    <div className="flex gap-1 bg-slate-200/70 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setVoucherMode('SELECT')}
                        className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-all border-none cursor-pointer ${
                          voucherMode === 'SELECT'
                            ? 'bg-white text-[#0e6877] shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Chọn có sẵn
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoucherMode('CREATE')}
                        className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-all border-none cursor-pointer ${
                          voucherMode === 'CREATE'
                            ? 'bg-[#0e6877] text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        + Tạo mới trực tiếp
                      </button>
                    </div>
                  </div>

                  {voucherMode === 'SELECT' ? (
                    <select
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877]"
                    >
                      <option value="">-- Chọn mã voucher sẵn có --</option>
                      {vouchers.map((v) => (
                        <option key={v.code} value={v.code}>
                          {v.code} ({v.title || 'Ưu đãi'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Mã Voucher mới *</label>
                          <input
                            type="text"
                            placeholder="VD: SHOPQUIET50K"
                            value={newVoucherCode}
                            onChange={(e) => setNewVoucherCode(e.target.value.toUpperCase())}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0e6877] uppercase font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Tên ưu đãi</label>
                          <input
                            type="text"
                            placeholder="VD: Giảm 50K đơn từ 200K"
                            value={newVoucherTitle}
                            onChange={(e) => setNewVoucherTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0e6877]"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Số tiền giảm (VNĐ)</label>
                          <input
                            type="number"
                            value={newVoucherDiscount}
                            onChange={(e) => setNewVoucherDiscount(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0e6877]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Đơn tối thiểu (VNĐ)</label>
                          <input
                            type="number"
                            value={newVoucherMinOrder}
                            onChange={(e) => setNewVoucherMinOrder(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0e6877]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {type === 'BONUS_COINS' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số Xu Tặng (1 Xu = 1 VNĐ)</label>
                  <input
                    type="number"
                    value={bonusCoins}
                    onChange={(e) => setBonusCoins(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877]"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  ⏰ Hẹn Giờ Phát Tự Động (Bỏ trống nếu phát thủ công)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl border-none cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0e6877] text-white font-bold rounded-xl border-none cursor-pointer shadow-xs hover:bg-[#0b5460]"
                >
                  Lưu Chiến Dịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
