import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api';
import { IVoucherWalletProps } from './voucher-wallet.type';

export const VoucherWallet: React.FC<IVoucherWalletProps> = (props) => {
  const { isOpen, onClose, showToast } = props;
  const [userVouchers, setUserVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<any[]>('/vouchers');
      setUserVouchers(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
      setUserVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVouchers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <h3 className="text-xs font-bold text-textColor uppercase tracking-wider">🎟️ Ví Voucher của tôi</h3>
          <button
            onClick={onClose}
            className="p-2 -mr-2 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors border-none cursor-pointer flex items-center justify-center"
          >
            <svg className="w-4 h-4 text-textColor" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400">Đang tải voucher...</div>
          ) : userVouchers.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <span className="text-4xl">🏷️</span>
              <p className="text-xs text-textColor-variant font-medium">
                Chưa có voucher nào
                <br />
                Hãy tham gia các chương trình khuyến mãi!
              </p>
            </div>
          ) : (
            userVouchers.map((v: any) => (
              <div key={v.code} className="border border-dashed border-teal-200 rounded-2xl overflow-hidden flex">
                <div className="bg-gradient-to-br from-teal-500 to-teal-700 text-white px-3 py-3 flex flex-col items-center justify-center min-w-[72px] gap-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {v.type === 'PERCENT' ? `${v.value}%` : v.type === 'FREESHIP' ? '🚚' : `${(v.value / 1000).toFixed(0)}K`}
                  </span>
                  <span className="text-[8px] font-bold opacity-80">{v.type === 'FREESHIP' ? 'Freeship' : 'Giảm'}</span>
                </div>
                <div className="flex-1 px-3 py-2.5 flex flex-col justify-center gap-0.5 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-textColor tracking-widest">{v.code}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(v.code).catch(() => {});
                        showToast(`Đã sao chép mã ${v.code}!`, 'success');
                      }}
                      className="text-[9px] bg-teal-50 text-teal-600 font-bold px-2 py-0.5 rounded-full border-none cursor-pointer"
                    >
                      Sao chép
                    </button>
                  </div>
                  <p className="text-[10px] text-textColor-variant">
                    {v.type === 'PERCENT' ? `Giảm ${v.value}%` : v.type === 'FIXED' ? `Giảm ${v.value.toLocaleString('vi-VN')}đ` : 'Miễn phí vận chuyển'}
                    {v.minOrderVal > 0 ? ` • Đơn tối thiểu ${v.minOrderVal.toLocaleString('vi-VN')}đ` : ''}
                  </p>
                  {v.expiresAt && (
                    <p className="text-[9px] text-amber-500 font-semibold">
                      HSD: {new Date(v.expiresAt).toLocaleDateString('vi-VN')}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
export default VoucherWallet;
