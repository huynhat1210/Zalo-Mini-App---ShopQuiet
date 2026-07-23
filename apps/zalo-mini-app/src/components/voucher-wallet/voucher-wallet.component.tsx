import React, { useState, useEffect } from "react";
import { apiRequest } from "../../utils/api";
import { IVoucherWalletProps } from "./voucher-wallet.type";

export const VoucherWallet: React.FC<IVoucherWalletProps> = (props) => {
  const { isOpen, onClose, showToast, onApplyVoucher } = props;
  const [userVouchers, setUserVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<any[]>("/vouchers");
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

  const handleApply = (code: string) => {
    if (onApplyVoucher) {
      onApplyVoucher(code);
    } else {
      navigator.clipboard?.writeText(code).catch(() => {});
      showToast(`Đã sao chép mã ${code}! Mở giỏ hàng để sử dụng.`, "success");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up max-h-[75vh] flex flex-col">
        <div className="flex items-center justify-between shrink-0 pb-2 border-b border-[#f5f3f0]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎟️</span>
            <div>
              <h3 className="text-xs font-bold text-textColor tracking-wide">
                Ví Voucher Của Tôi
              </h3>
              <p className="text-[10px] text-textColor-variant">Mã ưu đãi đã nhận & đổi điểm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors border-none cursor-pointer flex items-center justify-center"
          >
            <svg
              className="w-4 h-4 text-textColor"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-3 pr-1">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Đang tải danh sách voucher...
            </div>
          ) : userVouchers.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <span className="text-4xl">🏷️</span>
              <p className="text-xs text-textColor-variant font-medium">
                Chưa có voucher khả dụng
                <br />
                Hãy tham gia Vòng Quay May Mắn để đổi điểm nhận thêm!
              </p>
            </div>
          ) : (
            userVouchers.map((v: any) => (
              <div
                key={v.code}
                className="border border-dashed border-[#0e6877]/30 rounded-2xl overflow-hidden flex bg-[#fcfbfa] shadow-2xs hover:shadow-xs transition-shadow"
              >
                <div className="bg-gradient-to-br from-[#0e6877] to-[#168a9e] text-white px-3 py-3 flex flex-col items-center justify-center min-w-[76px] gap-0.5 shrink-0">
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    {v.type === "PERCENT"
                      ? `${v.value}%`
                      : v.type === "FREESHIP"
                        ? "FREESHIP"
                        : `${(v.value / 1000).toFixed(0)}K`}
                  </span>
                  <span className="text-[8px] font-bold opacity-85">
                    {v.type === "FREESHIP" ? "Freeship" : "Giảm giá"}
                  </span>
                </div>
                <div className="flex-1 px-3 py-2.5 flex flex-col justify-between text-left gap-1">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-black text-xs text-[#0e6877] tracking-widest font-mono">
                        {v.code}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-textColor font-bold mt-0.5">
                      {v.type === "PERCENT"
                        ? `Giảm trực tiếp ${v.value}%`
                        : v.type === "FIXED"
                          ? `Giảm ngay ${v.value.toLocaleString("vi-VN")}đ`
                          : "Miễn phí vận chuyển"}
                    </p>
                    {v.minOrderVal > 0 && (
                      <p className="text-[9.5px] text-textColor-variant mt-0.5">
                        Áp dụng đơn từ {v.minOrderVal.toLocaleString("vi-VN")}đ
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-dashed border-neutral-200">
                    <span className="text-[9px] text-amber-600 font-semibold">
                      {v.expiresAt
                        ? `HSD: ${new Date(v.expiresAt).toLocaleDateString("vi-VN")}`
                        : "Vô thời hạn"}
                    </span>
                    <button
                      onClick={() => handleApply(v.code)}
                      className="text-[9.5px] bg-[#0e6877] hover:bg-[#0b5460] text-white font-extrabold px-3 py-1 rounded-full border-none cursor-pointer shadow-2xs active:scale-95 transition-transform"
                    >
                      Dùng Ngay ➔
                    </button>
                  </div>
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
