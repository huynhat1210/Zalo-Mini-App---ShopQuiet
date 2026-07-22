import React from "react";
import { IOfflineStateComponentProps } from "./offline-state.type";

export const OfflineStateComponent: React.FC<IOfflineStateComponentProps> = (
  props,
) => {
  const { isOffline, onRetry } = props;

  if (!isOffline) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[9999] flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white border border-[#f0edeb] rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center space-y-6">
        {/* Offline Icon Illustration */}
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
          <svg
            className="w-10 h-10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.284 16.284A3 3 0 0 0 12 17h.01a3 3 0 0 0 3.717-2.717M2.01 2.01l19.98 19.98M12 7V4.01a3 3 0 0 0-3-3H7.01a3 3 0 0 0-3 3V7m9 3h3a3 3 0 0 1 3 3v2.01c0 .59-.17 1.139-.465 1.6M12 12h.01"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-textColor leading-tight">
            Mất kết nối Internet
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Vui lòng kiểm tra lại kết nối Wifi hoặc 3G/4G của bạn để tiếp tục
            mua sắm tại ShopQuiet.
          </p>
        </div>

        <button
          onClick={onRetry}
          className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 px-6 rounded-2xl text-xs transition-all active:scale-[0.98] shadow-md shadow-primary/10 flex items-center justify-center gap-2"
        >
          <svg
            className="w-4 h-4 animate-spin-hover"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          Thử kết nối lại
        </button>
      </div>
    </div>
  );
};
