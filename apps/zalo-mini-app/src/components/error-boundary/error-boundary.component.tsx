import { Component, ErrorInfo } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
  IErrorBoundaryComponentProps,
  IErrorBoundaryComponentState,
} from "./error-boundary.type";

function isScriptError(msg: any): boolean {
  if (!msg) return true;
  if (typeof msg === "string") {
    const lower = msg.toLowerCase();
    return lower.includes("script error") || lower.includes("script error.");
  }
  return false;
}

export class ErrorBoundaryComponent extends Component<
  IErrorBoundaryComponentProps,
  IErrorBoundaryComponentState
> {
  public state: IErrorBoundaryComponentState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(
    error: Error,
  ): IErrorBoundaryComponentState {
    const msg = error?.message || String(error);
    if (isScriptError(msg)) {
      return { hasError: false, error: null, errorInfo: null };
    }
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const msg = error?.message || String(error);
    if (isScriptError(msg)) {
      console.warn("[ErrorBoundary] Suppressed Zalo SDK script error:", msg);
      return;
    }
    this.setState({ errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    try {
      localStorage.removeItem("shopquiet_app_store");
      localStorage.removeItem("zalo_profile_custom");
    } catch (e) {}
    window.location.href = window.location.origin + window.location.pathname;
  };

  public render() {
    const { hasError, error, errorInfo } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="bg-surface flex flex-col items-center justify-center min-h-screen p-6 text-center">
          <div className="bg-white rounded-3xl border border-[#f0edeb] p-8 max-w-sm w-full shadow-md space-y-6 animate-scale-up">
            {/* Warning Icon */}
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <ExclamationTriangleIcon className="w-8 h-8" strokeWidth={2.2} />
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-black text-textColor uppercase tracking-widest">
                Đã xảy ra sự cố
              </h2>
              <p className="text-[11px] text-textColor-variant leading-relaxed">
                Rất tiếc, đã có lỗi xảy ra khi tải nội dung này. Vui lòng thử
                tải lại trang hoặc quay về trang chủ.
              </p>
            </div>

            {error && (
              <details className="text-left bg-neutral-50 rounded-xl p-3 border border-neutral-100 cursor-pointer">
                <summary className="text-[10px] font-bold text-textColor-variant uppercase tracking-wider select-none outline-none">
                  Chi tiết lỗi
                </summary>
                <p className="text-[9px] font-mono text-red-600 mt-2 overflow-x-auto whitespace-pre-wrap select-text">
                  {error.toString()}
                  {errorInfo?.componentStack}
                </p>
              </details>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full h-10 bg-primary hover:bg-primary-dark text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl border-none cursor-pointer active:scale-95 transition-all shadow-xs"
              >
                Tải lại trang
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full h-10 bg-neutral-100 hover:bg-neutral-200 text-textColor font-extrabold text-[10px] uppercase tracking-widest rounded-xl border-none cursor-pointer active:scale-95 transition-all"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}
