import React from "react";

interface IVoucherExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  gamificationData?: any;
  exchangeVoucher: (code: string, cost: number) => Promise<boolean>;
  onExchangeSuccess?: () => void;
}

export const VoucherExchangeModal: React.FC<IVoucherExchangeModalProps> = (
  props,
) => {
  const {
    isOpen,
    onClose,
    gamificationData,
    exchangeVoucher,
    onExchangeSuccess,
  } = props;

  if (!isOpen) return null;

  const vouchers = [
    {
      code: "DISCOUNT10",
      title: "Voucher Giảm 10K",
      desc: "Đơn hàng tối thiểu 50K",
      cost: 100,
    },
    {
      code: "DISCOUNT20",
      title: "Voucher Giảm 20K",
      desc: "Đơn hàng tối thiểu 100K",
      cost: 250,
    },
    {
      code: "DISCOUNT50",
      title: "Voucher Giảm 50K",
      desc: "Đơn hàng tối thiểu 200K",
      cost: 500,
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <h3 className="text-xs font-bold text-textColor uppercase tracking-wider">
            🎁 Chợ đổi Voucher
          </h3>
          <button
            onClick={onClose}
            className="p-2 -mr-2 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors border-none cursor-pointer flex items-center justify-center"
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

        <p className="text-[10px] text-textColor-variant font-semibold">
          Điểm tích lũy của bạn:{" "}
          <span className="text-primary font-bold">
            {gamificationData?.points || 0}
          </span>
        </p>

        <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
          {vouchers.map((item) => {
            const userPoints = gamificationData?.points || 0;
            const canExchange = userPoints >= item.cost;

            return (
              <div
                key={item.code}
                className="flex items-center justify-between p-2.5 rounded-xl border border-[#f0edeb] bg-neutral-50/50 hover:bg-neutral-50 transition-colors"
              >
                <div className="text-left space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10.5px] font-bold text-textColor">
                      {item.title}
                    </span>
                    <span className="text-[7.5px] bg-primary/10 text-primary font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      {item.code}
                    </span>
                  </div>
                  <p className="text-[8.5px] text-textColor-variant font-medium">
                    {item.desc}
                  </p>
                  <p className="text-[9px] text-primary font-extrabold">
                    Chi phí: {item.cost} điểm
                  </p>
                </div>

                <button
                  onClick={async () => {
                    const success = await exchangeVoucher(item.code, item.cost);
                    if (success && onExchangeSuccess) {
                      onExchangeSuccess();
                    }
                  }}
                  disabled={!canExchange}
                  className={`px-3 py-1.5 rounded-lg text-[9.5px] font-extrabold border-none transition-all active:scale-95 cursor-pointer ${
                    canExchange
                      ? "bg-primary hover:bg-primary-dark text-white shadow-xs"
                      : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                  }`}
                >
                  Đổi
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default VoucherExchangeModal;
