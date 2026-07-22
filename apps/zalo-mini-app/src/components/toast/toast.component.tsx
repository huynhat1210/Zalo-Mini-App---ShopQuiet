import { IToastComponentProps } from "./toast.type";
import { useCart } from "../../App";

export const ToastComponent: React.FC<IToastComponentProps> = (_props) => {
  const { toast } = useCart();

  if (!toast) return null;

  return (
    <div className="fixed top-4 left-6 right-6 z-[120] bg-white/95 backdrop-blur-md border border-[#f0edeb] rounded-2xl px-5 py-3.5 shadow-lg flex items-center gap-3 animate-slide-down">
      {toast.type === "success" ? (
        <div className="w-7.5 h-7.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-4.5 h-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
      ) : toast.type === "warning" ? (
        <div className="w-7.5 h-7.5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
      ) : (
        <div className="w-7.5 h-7.5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-4.5 h-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 111.085 1.086L12 13.5l-1.626-1.627a.75.75 0 00-1.085-1.085l.02.041zm.75 4.5h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      )}
      <span className="text-[11.5px] font-bold text-textColor leading-tight">
        {toast.message}
      </span>
    </div>
  );
};
