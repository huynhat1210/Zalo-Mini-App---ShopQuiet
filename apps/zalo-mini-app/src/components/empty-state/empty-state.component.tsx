import React from "react";
import { IEmptyStateComponentProps } from "./empty-state.type";
import { ShoppingBagIcon } from "@heroicons/react/24/outline";

export const EmptyStateComponent: React.FC<IEmptyStateComponentProps> = (
  props,
) => {
  const { title, description, icon, actionText, onAction } = props;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-surface">
      <div className="w-16 h-16 rounded-full bg-[#f5f3f0] flex items-center justify-center mb-4 shadow-2xs">
        {icon ? icon : <ShoppingBagIcon className="w-7.5 h-7.5 text-[#526069]/50" strokeWidth={1.8} />}
      </div>
      <h3 className="text-xs font-bold text-textColor uppercase tracking-widest">
        {title}
      </h3>
      <p className="text-[11px] text-textColor-variant mt-2 max-w-[210px] leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-primary text-white text-xs font-bold rounded-full border-none cursor-pointer shadow-xs active:scale-95 transition-transform"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
