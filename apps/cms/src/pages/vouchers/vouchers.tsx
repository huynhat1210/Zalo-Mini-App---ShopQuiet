import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { 
  Plus, 
  Trash2, 
  Ticket, 
  Save, 
  X,
  AlertCircle
} from 'lucide-react';

interface Voucher {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrder: number;
  maxUses?: number;
  usedCount?: number;
  description?: string;
  startDate?: string;
  endDate?: string;
}

import type { IVouchersComponentProps } from './vouchers.type';

export const VouchersComponent: React.FC<IVouchersComponentProps> = (_props) => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');

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

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/vouchers');
      setVouchers(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load vouchers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
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
    setError('');
  };

  const handleDeleteVoucher = async (id: string) => {
    if (!window.confirm('Bạn có muốn xóa mã giảm giá này không?')) return;
    try {
      await apiRequest(`/vouchers/${id}`, 'DELETE');
      setVouchers(vouchers.filter((v) => v.id !== id));
    } catch (err) {
      alert('Không thể xóa mã giảm giá. Lỗi kết nối.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Simple validation
    if (!formData.code.trim()) {
      setError('Mã voucher không được để trống');
      return;
    }

    try {
      await apiRequest('/vouchers', 'POST', {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        value: Number(formData.value),
        minOrder: Number(formData.minOrder),
        maxUses: Number(formData.maxUses),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      });
      fetchVouchers();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo voucher mới.');
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
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Kho Voucher cửa hàng</h2>
          <p className="text-slate-400 text-sm mt-1">Thiết lập các chiến dịch quà tặng, giảm giá và khuyến mãi</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 px-5 rounded-xl text-sm flex items-center gap-2 transition-all duration-200 shadow-lg shadow-emerald-500/10"
        >
          <Plus size={16} />
          <span>Tạo Voucher mới</span>
        </button>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-xs">Đang tải danh sách voucher...</p>
        </div>
      ) : vouchers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vouchers.map((voucher) => (
            <div 
              key={voucher.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-6 flex flex-col justify-between relative group hover:border-slate-750 transition-all duration-200"
            >
              {/* Ticket background outline */}
              <div className="absolute top-1/2 -left-3 w-6 h-6 bg-slate-950 rounded-full border border-slate-800 border-r-transparent -translate-y-1/2"></div>
              <div className="absolute top-1/2 -right-3 w-6 h-6 bg-slate-950 rounded-full border border-slate-800 border-l-transparent -translate-y-1/2"></div>

              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-amber-500/10 text-amber-450 rounded-2xl border border-amber-500/20">
                      <Ticket size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white tracking-wide text-sm">{voucher.code}</h4>
                      <p className="text-[10px] text-slate-450 uppercase font-semibold">
                        {voucher.type === 'PERCENTAGE' ? `Giảm ${voucher.value}%` : `Giảm ${formatPrice(voucher.value)}`}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteVoucher(voucher.id)}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-450 hover:text-white rounded-lg transition-colors"
                    title="Xóa voucher"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="space-y-2 border-t border-dashed border-slate-800 pt-4 text-xs">
                  <p className="text-slate-400 font-medium">{voucher.description || 'Giảm giá cực sốc dành cho tất cả khách hàng.'}</p>
                  <div className="flex justify-between text-[11px]"><span className="text-slate-500">Đơn tối thiểu:</span><span className="text-slate-200 font-semibold">{formatPrice(voucher.minOrder)}</span></div>
                  <div className="flex justify-between text-[11px]"><span className="text-slate-500">Đã dùng:</span><span className="text-slate-200 font-semibold">{voucher.usedCount || 0} / {voucher.maxUses || 'Vô hạn'}</span></div>
                  <div className="flex justify-between text-[11px]"><span className="text-slate-500">Hạn dùng:</span><span className="text-slate-200 font-semibold">{formatDate(voucher.startDate)} - {formatDate(voucher.endDate)}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <Ticket size={32} className="text-slate-700" />
          <p className="text-xs">Chưa có mã giảm giá nào hoạt động.</p>
        </div>
      )}

      {/* Modal Add Voucher */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-slideUp">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Tạo mã giảm giá mới</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="p-4 mx-6 mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-start gap-2.5">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-450 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                    Mã Voucher (Code)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="VD: QUYETDEPZAI"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-700 focus:outline-none transition-all uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-450 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                    Loại giảm giá
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none transition-all"
                  >
                    <option value="PERCENTAGE">Phần trăm (%)</option>
                    <option value="FIXED">Trừ tiền cố định (đ)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-450 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                    Giá trị giảm
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-450 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                    Giá trị đơn tối thiểu (đ)
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.minOrder}
                    onChange={(e) => setFormData({ ...formData, minOrder: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-450 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-450 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-450 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                  Số lượng phát hành tối đa
                </label>
                <input
                  type="number"
                  required
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-450 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                  Mô tả / Điều kiện
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Nhập điều kiện áp dụng voucher..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-700 focus:outline-none transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/10"
                >
                  <Save size={14} />
                  Phát hành mã
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

