import React from 'react';

export interface IEmptyStateComponentProps {
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
