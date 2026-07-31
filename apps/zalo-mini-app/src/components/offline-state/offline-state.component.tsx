import React from "react";
import { SignalSlashIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
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
          <SignalSlashIcon className="w-10 h-10" strokeWidth={2} />
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
          <ArrowPathIcon className="w-4 h-4" strokeWidth={2.5} />
          <span>Thử kết nối lại</span>
        </button>
      </div>
    </div>
  );
};
