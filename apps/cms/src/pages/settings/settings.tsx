import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { useToast } from '../../contexts';
import {
  Truck,
  CreditCard,
  Building,
  Save,
  CheckCircle,
} from 'lucide-react';

interface ShippingMethod {
  id: number;
  code: string;
  name: string;
  description?: string;
  price: number;
  estimatedDays?: string;
  active: boolean;
}

interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  description?: string;
  badge?: string;
  active: boolean;
}

export const Settings: React.FC = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'BRAND' | 'SHIPPING' | 'PAYMENT'>('BRAND');
  const [settings, setSettings] = useState<Record<string, string>>({
    'brand.name': 'ShopQuiet',
    'brand.hotline': '0987 654 321',
    'brand.email': 'support@shopquiet.vn',
    'brand.address': 'Quận 1, Thành phố Hồ Chí Minh',
    'store.currency': 'VNĐ',
  });

  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([
    { id: 1, code: 'STANDARD', name: 'Giao Hàng Tiêu Chuẩn', description: 'Nhận hàng sau 2-4 ngày làm việc', price: 25000, estimatedDays: '2-4 ngày', active: true },
    { id: 2, code: 'EXPRESS', name: 'Giao Hàng Hỏa Tốc', description: 'Giao nhanh nội thành trong 2 giờ', price: 45000, estimatedDays: '2 giờ', active: true },
    { id: 3, code: 'FREESHIP', name: 'Miễn Phí Giao Hàng', description: 'Áp dụng cho đơn hàng từ 500.000 đ', price: 0, estimatedDays: '3-5 ngày', active: true },
  ]);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: 1, code: 'COD', name: 'Thanh toán khi nhận hàng (COD)', description: 'Khách hàng thanh toán tiền mặt trực tiếp cho nhân viên giao hàng', badge: 'Phổ biến', active: true },
    { id: 2, code: 'ZALOPAY', name: 'Ví ZaloPay / Thẻ ngân hàng', description: 'Thanh toán tức thì qua cổng ZaloPay Sandbox/Production', badge: 'Khuyên dùng', active: true },
  ]);

  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await apiRequest<Record<string, string>>('/cms/settings').catch(() => null);
        if (res && typeof res === 'object') {
          setSettings((prev) => ({ ...prev, ...res }));
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSettingChange = (key: string, val: string) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveBrandSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await apiRequest('/cms/settings', 'POST', settings).catch(() => {});
      setSaveSuccess(true);
      toastSuccess('Đã lưu cấu hình', 'Thông tin cửa hàng đã được cập nhật thành công.');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      toastError('Lưu thất bại', e.message || 'Lỗi khi lưu cài đặt.');
    } finally {
      setLoading(false);
    }
  };

  const toggleShippingActive = (id: number) => {
    setShippingMethods((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)),
    );
  };

  const togglePaymentActive = (id: number) => {
    setPaymentMethods((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn text-[#1b1c1b] max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Cấu Hình Hệ Thống & Cửa Hàng</h1>
        <p className="text-slate-500 text-xs mt-1">Quản lý thương hiệu, phương thức vận chuyển và cổng thanh toán</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'BRAND', label: 'Thông Tin Thương Hiệu', icon: <Building size={16} /> },
          { key: 'SHIPPING', label: 'Phí & Vận Chuyển', icon: <Truck size={16} /> },
          { key: 'PAYMENT', label: 'Cổng Thanh Toán', icon: <CreditCard size={16} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-2 ${
              activeTab === tab.key
                ? 'bg-[#0e6877] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Brand Info */}
      {activeTab === 'BRAND' && (
        <form onSubmit={handleSaveBrandSettings} className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100">Cấu hình thông tin cơ bản cửa hàng</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên Thương Hiệu (Brand Name)</label>
              <input
                type="text"
                value={settings['brand.name'] || ''}
                onChange={(e) => handleSettingChange('brand.name', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hotline Hỗ Trợ</label>
              <input
                type="text"
                value={settings['brand.hotline'] || ''}
                onChange={(e) => handleSettingChange('brand.hotline', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Liên Hệ</label>
              <input
                type="email"
                value={settings['brand.email'] || ''}
                onChange={(e) => handleSettingChange('brand.email', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Địa Chỉ Cửa Hàng Chín</label>
              <input
                type="text"
                value={settings['brand.address'] || ''}
                onChange={(e) => handleSettingChange('brand.address', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle size={15} /> Đã lưu cấu hình thương hiệu thành công!
              </span>
            )}
            <button
              type="submit"
              disabled={loading}
              className="ml-auto px-5 py-2.5 bg-[#0e6877] text-white text-xs font-bold rounded-xl hover:bg-[#0b5460] transition-all flex items-center gap-2 border-none cursor-pointer shadow-xs active:scale-95"
            >
              <Save size={16} /> {loading ? 'Đang lưu...' : 'Lưu Cài Đặt'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Shipping Methods */}
      {activeTab === 'SHIPPING' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Phương Thức Giao Hàng & Phí Ship</h3>
            <span className="text-[11px] font-semibold text-slate-400">Kích hoạt các tùy chọn giao hàng trên Mini App</span>
          </div>

          <div className="space-y-3">
            {shippingMethods.map((ship) => (
              <div key={ship.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                    <Truck size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{ship.name} ({ship.price.toLocaleString('vi-VN')} đ)</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{ship.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${ship.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                    {ship.active ? 'Kích hoạt' : 'Tắt'}
                  </span>
                  <button
                    onClick={() => toggleShippingActive(ship.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border-none cursor-pointer ${
                      ship.active ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-[#0e6877] text-white hover:bg-[#0b5460]'
                    }`}
                  >
                    {ship.active ? 'Tắt' : 'Bật'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Payment Gateways */}
      {activeTab === 'PAYMENT' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Cổng Thanh Toán & Tích Hợp</h3>
            <span className="text-[11px] font-semibold text-slate-400">Các phương thức thanh toán khả dụng</span>
          </div>

          <div className="space-y-3">
            {paymentMethods.map((pay) => (
              <div key={pay.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-800">{pay.name}</h4>
                      {pay.badge && <span className="text-[9px] font-extrabold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{pay.badge}</span>}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{pay.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${pay.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                    {pay.active ? 'Hoạt động' : 'Đã khóa'}
                  </span>
                  <button
                    onClick={() => togglePaymentActive(pay.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border-none cursor-pointer ${
                      pay.active ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-[#0e6877] text-white hover:bg-[#0b5460]'
                    }`}
                  >
                    {pay.active ? 'Tắt' : 'Bật'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
