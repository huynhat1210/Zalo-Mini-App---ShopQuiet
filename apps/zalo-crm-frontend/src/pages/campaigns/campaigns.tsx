import React, { useEffect, useState } from 'react';
import { apiRequest, crmApiRequest } from '../../utils/api';
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
  Ticket,
  Coins,
  Radio,
  Zap,
  Globe,
  Award,
  Crown,
  Gem,
  Star,
  Eye,
  CalendarDays,
  UserCheck,
  ChevronRight,
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

interface ICampaignRecipient {
  id: number;
  openedAt?: string | null;
  convertedAt?: string | null;
  user?: {
    name?: string | null;
    avatar?: string | null;
    membershipTier?: string | null;
    zaloId?: string | null;
  } | null;
}

interface ICampaignDetail extends ICampaign {
  users?: ICampaignRecipient[];
}

export const Campaigns: React.FC<ICampaignsProps> = () => {
  const { success: toastSuccess, error: toastError, confirm } = useToast();
  const [campaigns, setCampaigns] = useState<ICampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [launchingId, setLaunchingId] = useState<number | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<ICampaignDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
  const [aiPrediction, setAiPrediction] = useState<{
    targetAudienceCount: number;
    estimatedBudget: number;
    estimatedRevenue: number;
    estimatedRoi: number;
    estimatedOpenRate: string;
    estimatedConversionRate: string;
    aiAdvice: string;
  } | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [marketingLists, setMarketingLists] = useState<any[]>([]);

  const fetchMarketingLists = async () => {
    try {
      const res = await crmApiRequest<any[]>('/marketing-lists');
      setMarketingLists(res || []);
    } catch (e) {}
  };

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
    setAiPrediction(null);
  };

  const handleGenerateAi = async () => {
    try {
      setIsAiGenerating(true);
      const res = await crmApiRequest<{ title: string; description: string }>('/campaigns/generate-ai', 'POST', {
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

  // Dedicated AI Predictor Studio State
  const [isPredictorModalOpen, setIsPredictorModalOpen] = useState(false);
  const [simType, setSimType] = useState('VOUCHER');
  const [simSegment, setSimSegment] = useState('ALL');
  const [simDiscountValue, setSimDiscountValue] = useState<number>(50000);
  const [simBonusCoins, setSimBonusCoins] = useState<number>(20000);
  const [simDiscountPercent, setSimDiscountPercent] = useState<number>(15);

  const handleRunSimulation = async (
    overrideType?: string,
    overrideSegment?: string,
    overrideDiscount?: number,
    overrideCoins?: number,
    overridePercent?: number,
  ) => {
    const targetType = overrideType || simType;
    const targetSeg = overrideSegment || simSegment;
    const targetDisc = overrideDiscount !== undefined ? overrideDiscount : simDiscountValue;
    const targetCoins = overrideCoins !== undefined ? overrideCoins : simBonusCoins;
    const targetPct = overridePercent !== undefined ? overridePercent : simDiscountPercent;

    try {
      setIsPredicting(true);
      const res = await crmApiRequest('/campaigns/predict-ai', 'POST', {
        type: targetType,
        targetSegment: targetSeg,
        bonusCoins: targetCoins,
        discountPercent: targetPct,
        discountValue: targetDisc,
      });
      if (res) setAiPrediction(res);
    } catch (e) {
      toastError('Lỗi', 'Không thể chạy mô phỏng AI');
    } finally {
      setIsPredicting(false);
    }
  };

  const handleOpenPredictorStudio = (initialCampaign?: ICampaign) => {
    if (initialCampaign) {
      setSimType(initialCampaign.type || 'VOUCHER');
      setSimSegment(initialCampaign.targetSegment || 'ALL');
      setSimBonusCoins(initialCampaign.bonusCoins || 20000);
      setSimDiscountPercent(initialCampaign.discountPercent || 15);
      setSimDiscountValue(50000);
      handleRunSimulation(
        initialCampaign.type,
        initialCampaign.targetSegment,
        50000,
        initialCampaign.bonusCoins || 20000,
        initialCampaign.discountPercent || 15,
      );
    } else {
      handleRunSimulation();
    }
    setIsPredictorModalOpen(true);
  };

  const handleApplySimulationToModal = () => {
    setType(simType);
    setTargetSegment(simSegment);
    if (simType === 'VOUCHER') {
      setVoucherMode('CREATE');
      setNewVoucherDiscount(simDiscountValue);
    } else if (simType === 'BONUS_COINS') {
      setBonusCoins(simBonusCoins);
    } else if (simType === 'FLASH_SALE') {
      setDiscountPercent(simDiscountPercent);
    }
    setIsPredictorModalOpen(false);
    setIsModalOpen(true);
    toastSuccess('Đã áp dụng', 'Đã đưa thông số mô phỏng AI vào form tạo mới');
  };

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await crmApiRequest<ICampaign[]>('/campaigns');
      setCampaigns(res || []);
    } catch (e) {
      toastError('Lỗi', 'Không thể tải danh sách chiến dịch');
    } finally {
      setLoading(false);
    }
  };

  const openCampaignDetail = async (campaign: ICampaign) => {
    setSelectedCampaign(campaign);
    setDetailLoading(true);
    try {
      const detail = await crmApiRequest<ICampaignDetail>(`/campaigns/${campaign.id}`);
      setSelectedCampaign(detail || campaign);
    } catch (e) {
      toastError('Error', 'Could not load campaign details');
    } finally {
      setDetailLoading(false);
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
    fetchMarketingLists();
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
            type: 'FIXED',
            value: Number(newVoucherDiscount),
            minOrderVal: Number(newVoucherMinOrder),
            stock: 9999,
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
      await crmApiRequest('/campaigns', 'POST', {
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
    if (!(await confirm('Phát chiến dịch ngay?', 'Chiến dịch sẽ được gửi tới nhóm khách hàng đã chọn.'))) return;
    try {
      setLaunchingId(id);
      await crmApiRequest(`/campaigns/${id}/launch`, 'POST');
      toastSuccess('Thành công', 'Chiến dịch đã được phát tới người dùng Zalo!');
      fetchCampaigns();
    } catch (e: any) {
      toastError('Lỗi', e?.message || 'Không thể phát chiến dịch');
    } finally {
      setLaunchingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm('Xóa chiến dịch?', 'Thao tác này không thể hoàn tác.'))) return;
    try {
      await crmApiRequest(`/campaigns/${id}`, 'DELETE');
      toastSuccess('Đã xóa', 'Chiến dịch đã được loại bỏ');
      fetchCampaigns();
    } catch (e) {
      toastError('Lỗi', 'Không thể xóa chiến dịch');
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || c.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalTargetedAll = campaigns.reduce((sum, c) => sum + c.totalTargeted, 0);
  const totalRevenueAll = campaigns.reduce((sum, c) => sum + c.revenueGenerated, 0);
  const completedCount = campaigns.filter((c) => c.status === 'COMPLETED').length;
  const scheduledCount = campaigns.filter((c) => c.status === 'SCHEDULED').length;
  const draftCount = campaigns.filter((c) => c.status === 'DRAFT').length;

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

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenPredictorStudio()}
            className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 text-xs font-extrabold rounded-2xl transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-xs"
          >
            <Sparkles size={16} className="text-amber-600" /> Mô Phỏng & Dự Đoán ROI AI
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-[#0e6877] hover:bg-[#0b5460] text-white text-xs font-bold rounded-2xl transition-all shadow-md flex items-center gap-2 border-none cursor-pointer active:scale-95"
          >
            <Plus size={16} /> Tạo Chiến Dịch Mới
          </button>
        </div>
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

      {/* Operational status tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-1">
        {[
          { id: 'ALL', label: 'All campaigns', count: campaigns.length },
          { id: 'DRAFT', label: 'Drafts', count: draftCount },
          { id: 'SCHEDULED', label: 'Scheduled', count: scheduledCount },
          { id: 'COMPLETED', label: 'Published', count: completedCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              statusFilter === tab.id ? 'border-[#0e6877] text-[#0e6877]' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label} <span className="ml-1 text-[10px] text-slate-400">{tab.count}</span>
          </button>
        ))}
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
            { id: 'VOUCHER', label: 'Tặng Voucher', icon: <Ticket size={13} /> },
            { id: 'BONUS_COINS', label: 'Tặng Xu', icon: <Coins size={13} /> },
            { id: 'BROADCAST', label: 'Thông báo', icon: <Radio size={13} /> },
            { id: 'FLASH_SALE', label: 'Flash Sale', icon: <Zap size={13} /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border-none cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
                typeFilter === t.id ? 'bg-[#0e6877] text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.icon}
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
                  <tr key={c.id} onClick={() => openCampaignDetail(c)} className="hover:bg-slate-50/60 transition-colors cursor-pointer">
                    <td className="py-4 px-5">
                      <div className="font-extrabold text-slate-900 text-sm">{c.title}</div>
                      {c.description && <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{c.description}</div>}
                      <div className="text-[10px] text-slate-400 mt-1">
                        Ngày tạo: {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {c.type === 'VOUCHER' && (
                        <span className="font-extrabold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1.5 whitespace-nowrap bg-pink-50 text-pink-700 border border-pink-200/60">
                          <Ticket size={12} className="text-pink-600" /> Voucher: {c.voucherCode || 'N/A'}
                        </span>
                      )}
                      {c.type === 'BONUS_COINS' && (
                        <span className="font-extrabold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1.5 whitespace-nowrap bg-amber-50 text-amber-800 border border-amber-200/60">
                          <Coins size={12} className="text-amber-500" /> Tặng {c.bonusCoins} Xu
                        </span>
                      )}
                      {c.type === 'BROADCAST' && (
                        <span className="font-extrabold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1.5 whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200/60">
                          <Radio size={12} className="text-blue-500" /> Thông báo
                        </span>
                      )}
                      {c.type === 'FLASH_SALE' && (
                        <span className="font-extrabold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1.5 whitespace-nowrap bg-red-50 text-red-700 border border-red-200/60">
                          <Zap size={12} className="text-red-500" /> Giảm {c.discountPercent}%
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 font-semibold text-slate-600">
                      <span className="bg-teal-50/80 text-[#0e6877] px-2.5 py-1 rounded-lg text-[10.5px] inline-flex items-center gap-1.5 whitespace-nowrap border border-teal-200/50 font-bold">
                        {c.targetSegment === 'ALL' && <><Globe size={12} className="text-[#0e6877]" /> Tất cả người dùng</>}
                        {c.targetSegment === 'SILVER' && <><Award size={12} className="text-slate-500" /> Hạng Bạc</>}
                        {c.targetSegment === 'GOLD' && <><Crown size={12} className="text-amber-500" /> Hạng Vàng</>}
                        {c.targetSegment === 'DIAMOND' && <><Gem size={12} className="text-sky-500" /> Hạng Kim cương</>}
                        {c.targetSegment === 'INACTIVE_30_DAYS' && <><Clock size={12} className="text-orange-500" /> Chưa mua 30 ngày</>}
                        {c.targetSegment === 'VIP' && <><Star size={12} className="text-yellow-500" /> Khách hàng VIP</>}
                        {c.targetSegment === 'NEW_USER_WELCOME' && <><Sparkles size={12} className="text-amber-500" /> Tự động: Khách hàng mới</>}
                        {c.targetSegment === 'USER_BIRTHDAY' && <><Sparkles size={12} className="text-pink-500" /> Tự động: Sinh nhật</>}
                        {c.targetSegment === 'ABANDONED_CART' && <><Clock size={12} className="text-red-500" /> Tự động: Bỏ quên giỏ hàng</>}
                        {c.targetSegment.startsWith('LIST_') && (
                          <>
                            <Users size={12} className="text-emerald-600" /> 
                            Tệp: {marketingLists.find(l => `LIST_${l.id}` === c.targetSegment)?.name || 'Tệp tiếp thị'}
                          </>
                        )}
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
                      ) : c.status === 'RUNNING' ? (
                        <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1">
                          <Send size={12} /> Running
                        </span>
                      ) : c.status === 'CANCELLED' ? (
                        <span className="bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1">
                          <X size={12} /> Cancelled
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
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenPredictorStudio(c); }}
                          title="Mô phỏng ROI & Dự đoán AI"
                          className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200/80 cursor-pointer"
                        >
                          <Sparkles size={14} />
                        </button>
                        {c.status !== 'COMPLETED' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLaunch(c.id); }}
                            disabled={launchingId === c.id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 border-none cursor-pointer active:scale-95 transition-all shadow-xs disabled:opacity-50"
                          >
                            <Send size={12} /> {launchingId === c.id ? 'Đang phát...' : 'Phát ngay'}
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border-none cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openCampaignDetail(c); }}
                          title="View campaign details"
                          className="p-1.5 text-slate-400 hover:text-[#0e6877] hover:bg-teal-50 rounded-lg transition-colors border-none cursor-pointer"
                        >
                          <ChevronRight size={15} />
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

      {/* Campaign details drawer */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35" onMouseDown={() => setSelectedCampaign(null)}>
          <aside
            className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#0e6877]">
                    <Megaphone size={13} /> Campaign details
                  </div>
                  <h2 className="truncate text-lg font-extrabold text-slate-900">{selectedCampaign.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">{selectedCampaign.description || 'No campaign description'}</p>
                </div>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="rounded-lg border-none bg-transparent p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  title="Close details"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">{selectedCampaign.type}</span>
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-[#0e6877]">{selectedCampaign.targetSegment}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  selectedCampaign.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                  selectedCampaign.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                  selectedCampaign.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                }`}>{selectedCampaign.status}</span>
              </div>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Targeted', value: selectedCampaign.totalTargeted.toLocaleString('vi-VN'), icon: <Users size={15} />, tone: 'text-blue-700 bg-blue-50' },
                  { label: 'Opened', value: selectedCampaign.totalOpened.toLocaleString('vi-VN'), icon: <Eye size={15} />, tone: 'text-teal-700 bg-teal-50' },
                  { label: 'Converted', value: selectedCampaign.totalConverted.toLocaleString('vi-VN'), icon: <UserCheck size={15} />, tone: 'text-emerald-700 bg-emerald-50' },
                  { label: 'Revenue', value: `${selectedCampaign.revenueGenerated.toLocaleString('vi-VN')} đ`, icon: <TrendingUp size={15} />, tone: 'text-amber-700 bg-amber-50' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-slate-200 p-3">
                    <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${stat.tone}`}>{stat.icon}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</div>
                    <div className="mt-0.5 truncate text-sm font-extrabold text-slate-900">{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Campaign performance</span>
                  <span className="text-[#0e6877]">{selectedCampaign.totalTargeted ? Math.round((selectedCampaign.totalOpened / selectedCampaign.totalTargeted) * 100) : 0}% open rate</span>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[10px] text-slate-500"><span>Opened</span><span>{selectedCampaign.totalOpened} / {selectedCampaign.totalTargeted}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0e6877]" style={{ width: `${selectedCampaign.totalTargeted ? Math.min(100, (selectedCampaign.totalOpened / selectedCampaign.totalTargeted) * 100) : 0}%` }} /></div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[10px] text-slate-500"><span>Converted</span><span>{selectedCampaign.totalConverted} / {selectedCampaign.totalTargeted}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${selectedCampaign.totalTargeted ? Math.min(100, (selectedCampaign.totalConverted / selectedCampaign.totalTargeted) * 100) : 0}%` }} /></div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4 text-xs">
                  <div className="mb-2 flex items-center gap-2 font-bold text-slate-700"><CalendarDays size={15} className="text-[#0e6877]" /> Timing</div>
                  <div className="space-y-1 text-slate-500">
                    <div>Created: {new Date(selectedCampaign.createdAt).toLocaleString('vi-VN')}</div>
                    {selectedCampaign.scheduledAt && <div>Scheduled: {new Date(selectedCampaign.scheduledAt).toLocaleString('vi-VN')}</div>}
                    {selectedCampaign.startedAt && <div>Started: {new Date(selectedCampaign.startedAt).toLocaleString('vi-VN')}</div>}
                    {selectedCampaign.endedAt && <div>Ended: {new Date(selectedCampaign.endedAt).toLocaleString('vi-VN')}</div>}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 text-xs">
                  <div className="mb-2 flex items-center gap-2 font-bold text-slate-700"><Ticket size={15} className="text-pink-600" /> Offer</div>
                  <div className="space-y-1 text-slate-500">
                    {selectedCampaign.voucherCode && <div>Voucher: <strong className="text-slate-800">{selectedCampaign.voucherCode}</strong></div>}
                    {selectedCampaign.bonusCoins > 0 && <div>Bonus: <strong className="text-slate-800">{selectedCampaign.bonusCoins} coins</strong></div>}
                    {selectedCampaign.discountPercent > 0 && <div>Discount: <strong className="text-slate-800">{selectedCampaign.discountPercent}%</strong></div>}
                    {!selectedCampaign.voucherCode && selectedCampaign.bonusCoins <= 0 && selectedCampaign.discountPercent <= 0 && <div>Broadcast message</div>}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Recipients</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">Showing up to 50 recipients returned by the campaign service.</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{selectedCampaign.users?.length || 0}</span>
                </div>
                {detailLoading ? (
                  <div className="rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">Loading recipients...</div>
                ) : selectedCampaign.users?.length ? (
                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                    {selectedCampaign.users.map((recipient) => (
                      <div key={recipient.id} className="flex items-center gap-3 px-4 py-3">
                        {recipient.user?.avatar ? <img src={recipient.user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" /> : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{(recipient.user?.name || 'U').slice(0, 1).toUpperCase()}</div>}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-slate-800">{recipient.user?.name || recipient.user?.zaloId || 'Unknown user'}</div>
                          <div className="text-[10px] text-slate-400">{recipient.user?.membershipTier || 'Member'}</div>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold">
                          <span className={recipient.openedAt ? 'text-teal-700' : 'text-slate-300'}><Eye size={13} /></span>
                          <span className={recipient.convertedAt ? 'text-emerald-600' : 'text-slate-300'}><CheckCircle2 size={13} /></span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-400">No recipients yet. Launch the campaign to create its delivery list.</div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button onClick={() => handleOpenPredictorStudio(selectedCampaign)} className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"><Sparkles size={14} /> Predict ROI</button>
                {selectedCampaign.status !== 'COMPLETED' && <button onClick={() => handleLaunch(selectedCampaign.id)} disabled={launchingId === selectedCampaign.id} className="flex items-center gap-1.5 rounded-xl border-none bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><Send size={14} /> {launchingId === selectedCampaign.id ? 'Launching...' : 'Launch now'}</button>}
              </div>
            </div>
          </aside>
        </div>
      )}

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
                    <option value="VOUCHER">Tặng Voucher</option>
                    <option value="BONUS_COINS">Tặng Xu Quà Tặng</option>
                    <option value="BROADCAST">Thông Báo / Banner</option>
                    <option value="FLASH_SALE">Giảm Giá Flash Sale</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phân tập Khách hàng / Sự kiện Tự động</label>
                  <select
                    value={targetSegment}
                    onChange={(e) => setTargetSegment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877]"
                  >
                    <option value="ALL">Tất cả người dùng</option>
                    <option value="SILVER">Hạng Bạc</option>
                    <option value="GOLD">Hạng Vàng</option>
                    <option value="DIAMOND">Hạng Kim Cương</option>
                    <option value="INACTIVE_30_DAYS">Chưa mua 30 ngày</option>
                    <option value="VIP">Khách VIP (Trên 1M)</option>
                    <option value="NEW_USER_WELCOME">⚡ Tự động: Chào mừng tài khoản mới</option>
                    <option value="USER_BIRTHDAY">⚡ Tự động: Mừng sinh nhật khách trong tháng</option>
                    <option value="ABANDONED_CART">⚡ Tự động: Nhắc giỏ hàng chưa mua (2h)</option>
                    {marketingLists.map((list) => (
                      <option key={list.id} value={`LIST_${list.id}`}>👥 Tệp: {list.name} ({list.totalEntries} SĐT)</option>
                    ))}
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
                <label className="font-bold text-slate-700 block mb-1 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Hẹn Giờ Phát Tự Động (Bỏ trống nếu phát thủ công / sự kiện)
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

      {/* ── Dedicated Gemini AI Predictor & Simulator Studio Modal ── */}
      {isPredictorModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 rounded-2xl shadow-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    Gemini AI ROI & Budget Predictor Studio
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mô phỏng ngân sách, lượt tiếp cận & doanh thu dự kiến trước khi khởi chạy chiến dịch
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPredictorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1.5 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Simulation Controls Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Loại Ưu Đãi</label>
                <select
                  value={simType}
                  onChange={(e) => setSimType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] font-semibold"
                >
                  <option value="VOUCHER">Tặng Voucher</option>
                  <option value="BONUS_COINS">Tặng Xu Quà Tặng</option>
                  <option value="FLASH_SALE">Giảm Giá Flash Sale</option>
                  <option value="BROADCAST">Thông Báo / Banner</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Phân Tập Khách Hàng</label>
                <select
                  value={simSegment}
                  onChange={(e) => setSimSegment(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] font-semibold"
                >
                  <option value="ALL">Tất cả người dùng</option>
                  <option value="SILVER">Hạng Bạc</option>
                  <option value="GOLD">Hạng Vàng</option>
                  <option value="DIAMOND">Hạng Kim Cương</option>
                  <option value="INACTIVE_30_DAYS">Chưa mua 30 ngày</option>
                  <option value="VIP">Khách VIP (Trên 1M)</option>
                  <option value="NEW_USER_WELCOME">Tự động: Khách mới</option>
                  <option value="ABANDONED_CART">Tự động: Giỏ hàng chưa mua</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {simType === 'BONUS_COINS' ? 'Số Xu Tặng (VNĐ)' : simType === 'FLASH_SALE' ? 'Tỷ lệ Giảm (%)' : 'Số Tiền Giảm (VNĐ)'}
                </label>
                {simType === 'BONUS_COINS' ? (
                  <input
                    type="number"
                    value={simBonusCoins}
                    onChange={(e) => setSimBonusCoins(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] font-bold"
                  />
                ) : simType === 'FLASH_SALE' ? (
                  <input
                    type="number"
                    value={simDiscountPercent}
                    onChange={(e) => setSimDiscountPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] font-bold"
                  />
                ) : (
                  <input
                    type="number"
                    value={simDiscountValue}
                    onChange={(e) => setSimDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] font-bold"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => handleRunSimulation()}
                disabled={isPredicting}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95 border-none disabled:opacity-50"
              >
                <Sparkles size={16} /> {isPredicting ? 'Gemini AI Đang Tính Toán...' : 'Chạy Mô Phỏng Dự Đoán AI'}
              </button>
            </div>

            {/* AI Results Display */}
            {aiPrediction && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Khách Tiếp Cận</span>
                    <h4 className="text-lg font-extrabold text-slate-900 mt-0.5">{aiPrediction.targetAudienceCount} khách</h4>
                    <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-full inline-block mt-1">
                      Mở ~{aiPrediction.estimatedOpenRate}
                    </span>
                  </div>

                  <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Ngân Sách Dự Kiến</span>
                    <h4 className="text-lg font-extrabold text-amber-900 mt-0.5">
                      {aiPrediction.estimatedBudget.toLocaleString('vi-VN')} đ
                    </h4>
                    <span className="text-[10px] text-amber-800 font-bold block mt-1">Chi phí khuyến mãi</span>
                  </div>

                  <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Doanh Thu AI Dự Báo</span>
                    <h4 className="text-lg font-extrabold text-emerald-900 mt-0.5">
                      {aiPrediction.estimatedRevenue.toLocaleString('vi-VN')} đ
                    </h4>
                    <span className="text-[10px] text-emerald-800 font-bold block mt-1">Chuyển đổi ~{aiPrediction.estimatedConversionRate}</span>
                  </div>

                  <div className="bg-teal-900 text-white p-3.5 rounded-2xl text-center shadow-md">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block">Tỷ Lệ ROI Dự Kiến</span>
                    <h4 className="text-xl font-black text-amber-300 mt-0.5">+{aiPrediction.estimatedRoi}%</h4>
                    <span className="text-[10px] text-teal-200 font-semibold block mt-1">Hiệu quả đầu tư</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Sparkles size={14} /> Nhận Xét & Lời Khuyên Chiến Lược Từ Gemini AI:
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed italic">
                    "{aiPrediction.aiAdvice}"
                  </p>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 flex justify-between items-center border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPredictorModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl border-none cursor-pointer"
              >
                Đóng Studio
              </button>
              <button
                type="button"
                onClick={handleApplySimulationToModal}
                className="px-5 py-2.5 bg-[#0e6877] hover:bg-[#0b5460] text-white font-extrabold text-xs rounded-xl border-none cursor-pointer shadow-md flex items-center gap-2 active:scale-95 transition-all"
              >
                <Plus size={15} /> Áp Dụng Thông Số & Tạo Chiến Dịch Mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
