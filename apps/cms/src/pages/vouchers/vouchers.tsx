import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import {
  Plus,
  Trash2,
  Ticket,
  Save,
  X,
  Megaphone,
  CheckCircle,
} from 'lucide-react';
import { useToast } from '../../contexts';
import { PaginationComponent } from '../../components';

interface Voucher {
  id?: string;
  code: string;
  type: 'PERCENT' | 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrderVal?: number;
  minOrder?: number;
  stock?: number;
  maxUses?: number;
  expiresAt?: string;
  endDate?: string;
  usedCount?: number;
  description?: string;
  startDate?: string;
}

export const Vouchers: React.FC = () => {
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Distribution states
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [voucherToDistribute, setVoucherToDistribute] = useState<Voucher | null>(null);
  const [targetSegment, setTargetSegment] = useState('ALL');
  const [distributing, setDistributing] = useState(false);
  const [distributeSuccess, setDistributeSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    value: 10,
    minOrder: 100000,
    description: '',
    maxUses: 100,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const fetchVouchers = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await apiRequest('/vouchers');
      setVouchers(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load vouchers:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
    const interval = setInterval(() => {
      fetchVouchers(true);
    }, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      code: '',
      type: 'PERCENTAGE',
      value: 10,
      minOrder: 50000,
      description: '',
      maxUses: 100,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleDeleteVoucher = async (code: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa mã giảm giá "${code}" không?`)) return;
    try {
      await apiRequest(`/vouchers/${code}`, 'DELETE');
      setVouchers(vouchers.filter((v) => v.code !== code));
      toastSuccess('Đã xóa Voucher', `Mã giảm giá "${code}" đã được gỡ.`);
    } catch (err: any) {
      console.error('Lỗi khi xóa voucher:', err);
      toastError('Không thể xóa Voucher', err.message || 'Lỗi server.');
    }
  };

  const handleOpenDistribute = (voucher: Voucher) => {
    setVoucherToDistribute(voucher);
    setTargetSegment('ALL');
    setIsDistributeModalOpen(true);
    setDistributeSuccess(false);
  };

  const handleDistributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherToDistribute) return;

    try {
      setDistributing(true);
      await apiRequest('/vouchers/distribute', 'POST', {
        voucherCode: voucherToDistribute.code,
        targetSegment,
      });

      setDistributeSuccess(true);
      toastSuccess('Phát hành thành công', `Đã gửi mã ${voucherToDistribute.code} qua Zalo OA!`);
      setTimeout(() => {
        setIsDistributeModalOpen(false);
        setDistributeSuccess(false);
      }, 2000);
    } catch (err: any) {
      toastError('Phát hành thất bại', err.message || 'Lỗi khi phát hành qua Zalo OA.');
    } finally {
      setDistributing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      toastWarning('Thiếu thông tin', 'Vui lòng nhập mã giảm giá.');
      return;
    }

    try {
      await apiRequest('/vouchers', 'POST', formData);
      toastSuccess('Tạo Voucher mới', `Mã "${formData.code}" đã được tạo thành công.`);
      fetchVouchers();
      setIsModalOpen(false);
    } catch (err: any) {
      toastError('Tạo thất bại', err.message || 'Lỗi khi tạo mã giảm giá.');
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Vô hạn';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  return (
    <div className="space-y-6 animate-fadeIn text-[#1b1c1b]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Quản Lý Mã Giảm Giá & Khuyến Mãi</h1>
          <p className="text-slate-500 text-xs mt-1">Thiết lập các chiến dịch quà tặng, mã giảm giá và gửi thông báo Zalo</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-[#0e6877] text-white text-xs font-bold rounded-xl hover:bg-[#0b5460] transition-all flex items-center gap-2 border-none cursor-pointer shadow-xs active:scale-95"
        >
          <Plus size={16} /> Tạo Voucher Mới
        </button>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-10 h-10 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-xs">Đang tải kho voucher...</p>
        </div>
      ) : vouchers.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vouchers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((voucher) => (
            <div
              key={voucher.code}
              className="bg-white border border-slate-200 hover:border-[#0e6877]/30 rounded-3xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 relative group"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-teal-50 text-[#0e6877] rounded-2xl border border-teal-100">
                      <Ticket size={22} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 tracking-wider text-sm">{voucher.code}</h4>
                      <p className="text-[11px] text-[#0e6877] font-black uppercase">
                        {voucher.type === 'PERCENT' || voucher.type === 'PERCENTAGE'
                          ? `Giảm ${voucher.value}%`
                          : `Giảm ${formatPrice(voucher.value)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenDistribute(voucher)}
                      className="p-2 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-all border-none cursor-pointer"
                      title="Phát hành Voucher qua Zalo OA"
                    >
                      <Megaphone size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteVoucher(voucher.code)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border-none cursor-pointer"
                      title="Xóa voucher"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {voucher.description && <p className="text-xs text-slate-500 line-clamp-2">{voucher.description}</p>}

                <div className="bg-slate-50 rounded-2xl p-3 space-y-1.5 border border-slate-100 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Đơn tối thiểu:</span>
                    <span className="font-bold text-slate-800">{formatPrice(voucher.minOrder || voucher.minOrderVal || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Số lượng sử dụng:</span>
                    <span className="font-bold text-slate-800">
                      {voucher.usedCount || 0} / {voucher.maxUses || voucher.stock || '∞'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hạn sử dụng:</span>
                    <span className="font-bold text-slate-800">{formatDate(voucher.endDate || voucher.expiresAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>

          <PaginationComponent
            currentPage={currentPage}
            totalPages={Math.ceil(vouchers.length / itemsPerPage)}
            totalItems={vouchers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newSize) => {
              setItemsPerPage(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      ) : (
        <div className="py-20 text-center text-slate-400 text-sm bg-white rounded-3xl border border-slate-200">
          Chưa có voucher nào được phát hành.
        </div>
      )}

      {/* Slide-Over Drawer: Add Voucher */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Transparent Backdrop */}
          <div
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 bg-transparent transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-50 flex flex-col justify-between border-l border-slate-200 animate-slideLeft">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-[#0e6877] to-[#168a9e] text-white">
              <div>
                <h3 className="text-base font-black text-white">🎟️ Tạo Mã Giảm Giá Mới</h3>
                <p className="text-[11px] text-white/80 font-medium mt-0.5">Thiết lập điều kiện khuyến mãi cho khách hàng</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center border-none cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="voucherForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-thin">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mã Voucher (Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: HELLO2026, SUMMER20"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:outline-none font-mono font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Loại giảm giá</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:outline-none font-bold"
                  >
                    <option value="PERCENTAGE">Theo Phần Trăm (%)</option>
                    <option value="FIXED">Số Tiền Cố Định (VNĐ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giá trị giảm *</label>
                  <input
                    type="number"
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:outline-none font-black text-[#0e6877]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Đơn hàng tối thiểu (VNĐ)</label>
                <input
                  type="number"
                  value={formData.minOrder}
                  onChange={(e) => setFormData({ ...formData, minOrder: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả ngắn</label>
                <input
                  type="text"
                  placeholder="Áp dụng cho mọi đơn hàng..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:outline-none"
                />
              </div>
            </form>

            {/* Sticky Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 border-none cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="voucherForm"
                className="px-5 py-2.5 bg-[#0e6877] text-white text-xs font-bold rounded-xl hover:bg-[#0b5460] border-none cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
              >
                <Save size={15} /> Tạo Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Distribute Modal */}
      {isDistributeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200 animate-scaleUp">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Gửi Voucher Qua Zalo Notification</h3>
              <button
                onClick={() => setIsDistributeModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 flex items-center justify-center border-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleDistributeSubmit} className="space-y-4">
              <p className="text-xs text-slate-600">
                Gửi mã giảm giá <strong className="text-[#0e6877]">{voucherToDistribute?.code}</strong> đến các nhóm đối tượng khách hàng Zalo:
              </p>

              <select
                value={targetSegment}
                onChange={(e) => setTargetSegment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 font-bold focus:border-[#0e6877]"
              >
                <option value="ALL">Tất cả khách hàng Zalo Mini App</option>
                <option value="VIP">Khách hàng Thân Thiết / VIP</option>
                <option value="NEW">Khách hàng Mới Đăng Ký</option>
              </select>

              {distributeSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-200">
                  <CheckCircle size={16} /> Đã gửi thông báo Voucher thành công!
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDistributeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 border-none cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={distributing}
                  className="px-4 py-2 bg-[#0e6877] text-white text-xs font-bold rounded-xl hover:bg-[#0b5460] border-none cursor-pointer flex items-center gap-1.5"
                >
                  <Megaphone size={15} /> {distributing ? 'Đang gửi...' : 'Gửi Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Vouchers;
