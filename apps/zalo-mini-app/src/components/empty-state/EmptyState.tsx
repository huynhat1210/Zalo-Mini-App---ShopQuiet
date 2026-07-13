import React from "react";

export interface EmptyStateProps {
  /** Title displayed in the empty state */
  title: string;
  /** Description text displayed below the title */
  description: string;
  /** Optional custom icon JSX */
  icon?: React.ReactNode;
  /** Optional call‑to‑action text */
  actionText?: string;
  /** Optional click handler for the call‑to‑action */
  onAction?: () => void;
}

/**
 * EmptyState – a reusable component that follows the same structural pattern as
 * other UI primitives in this project (e.g., skeleton components).
 * It provides a centered layout, optional icon, title, description, and an
 * optional CTA button.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionText,
  onAction,
}) => {
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
