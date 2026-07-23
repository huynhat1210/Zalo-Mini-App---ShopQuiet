import { IToastComponentProps } from "./toast.type";
import { useCart } from "../../App";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

export const ToastComponent: React.FC<IToastComponentProps> = (_props) => {
  const { toast } = useCart();

  if (!toast) return null;

  return (
    <div className="fixed top-4 left-6 right-6 z-[120] bg-white/95 backdrop-blur-md border border-[#f0edeb] rounded-2xl px-5 py-3.5 shadow-lg flex items-center gap-3 animate-slide-down">
      {toast.type === "success" ? (
        <div className="w-7.5 h-7.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
          <CheckCircleIcon className="w-5 h-5" strokeWidth={2.2} />
        </div>
      ) : toast.type === "warning" ? (
        <div className="w-7.5 h-7.5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
          <ExclamationTriangleIcon className="w-5 h-5" strokeWidth={2.2} />
        </div>
      ) : (
        <div className="w-7.5 h-7.5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
          <InformationCircleIcon className="w-5 h-5" strokeWidth={2.2} />
        </div>
      )}
      <span className="text-[11.5px] font-bold text-textColor leading-tight">
        {toast.message}
      </span>
    </div>
  );
};
