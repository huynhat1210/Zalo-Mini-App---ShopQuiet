import React, { useState, useEffect } from "react";
import { XMarkIcon, GiftIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { apiRequest } from "../../utils/api";
import { IVoucherExchangeModalProps } from "./voucher-exchange-modal.type";

export const VoucherExchangeModalComponent: React.FC<
  IVoucherExchangeModalProps
> = (props) => {
  const {
    isOpen,
    onClose,
    userPoints = 0,
    showToast,
    exchangeVoucher,
    onExchangeSuccess,
    onVoucherExchanged,
  } = props;

  const [vouchers, setVouchers] = useState<any[]>([]);
  const [exchangingCode, setExchangingCode] = useState<string | null>(null);

  useEffect(() => {
    async function loadVouchers() {
      try {
        const res = await apiRequest<any[]>("/vouchers");
        if (res) setVouchers(res);
      } catch (e) {
        console.error("Failed to load vouchers for exchange modal:", e);
      }
    }
    if (isOpen) {
      loadVouchers();
    }
  }, [isOpen]);

  const handleExchange = async (voucher: any) => {
    const cost = voucher.pointCost || 500;
    if (userPoints < cost) {
      if (showToast) {
        showToast(
          `Bạn cần tối thiểu ${cost} Xu để đổi voucher này! (Hiện có: ${userPoints} Xu)`,
          "warning",
        );
      }
      return;
    }

    try {
      setExchangingCode(voucher.code);
      if (exchangeVoucher) {
        await exchangeVoucher(voucher.code, cost);
      } else {
        throw new Error("Chức năng đổi voucher chưa được cấu hình.");
      }
      if (showToast) showToast(`Đổi thành công mã ${voucher.code}!`, "success");
      if (onVoucherExchanged) onVoucherExchanged();
      if (onExchangeSuccess) onExchangeSuccess();
      onClose();
    } catch (e: any) {
      if (showToast) showToast(e?.message || "Đổi voucher thất bại", "error");
    } finally {
      setExchangingCode(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <h3 className="text-xs font-bold text-textColor uppercase tracking-wider flex items-center gap-1.5">
            <GiftIcon className="w-4 h-4" />
            Chợ đổi Voucher
          </h3>
          <button
            onClick={onClose}
            className="p-2 -mr-2 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors border-none cursor-pointer flex items-center justify-center"
          >
            <XMarkIcon className="w-4 h-4 text-textColor" strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          {vouchers.length === 0 ? (
            <p className="text-xs text-[#526069] text-center py-6">
              Hiện chưa có voucher đổi điểm.
            </p>
          ) : (
            vouchers.map((v) => {
              const cost = v.pointCost || 500;
              const canAfford = userPoints >= cost;
              return (
                <div
                  key={v.code}
                  className="bg-neutral-50 border border-[#f0edeb] rounded-2xl p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">
                      {v.code}
                    </span>
                    <h4 className="text-xs font-bold text-textColor truncate">
                      {v.title || `Giảm ${v.discountValue}%`}
                    </h4>
                    <p className="text-[10px] text-[#526069]">
                      Đổi bằng: <strong className="text-amber-600">{cost} Xu</strong>
                    </p>
                  </div>

                  <button
                    onClick={() => handleExchange(v)}
                    disabled={exchangingCode === v.code || !canAfford}
                    className={`shrink-0 text-xs font-bold px-3 py-2 rounded-xl transition-all border-none cursor-pointer ${
                      canAfford
                        ? "bg-primary text-white hover:bg-primary-dark active:scale-95 shadow-xs"
                        : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                    }`}
                  >
                    {exchangingCode === v.code ? "Đang đổi..." : "Đổi ngay"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
