import { ReactNode, ErrorInfo } from "react";

export interface IErrorBoundaryComponentProps {
  children: ReactNode;
}

export interface IErrorBoundaryComponentState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}
