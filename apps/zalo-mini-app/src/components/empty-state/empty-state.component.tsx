import React from "react";
import { IEmptyStateComponentProps } from "./empty-state.type";

export const EmptyStateComponent: React.FC<IEmptyStateComponentProps> = (
  props,
) => {
  const { title, description, icon, actionText, onAction } = props;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-surface">
      {icon ? (
        <div className="w-16 h-16 rounded-full bg-[#f5f3f0] flex items-center justify-center mb-4">
          {icon}
        </div>
      ) : (
        <div className="w-16 h-16 rounded-full bg-[#f5f3f0] flex items-center justify-center mb-4">
          <svg
            className="w-7.5 h-7.5 text-[#526069]/50"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </div>
      )}
      <h3 className="text-xs font-bold text-textColor uppercase tracking-widest">
        {title}
      </h3>
      <p className="text-[11px] text-textColor-variant mt-2 max-w-[210px] leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-primary text-white rounded"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
