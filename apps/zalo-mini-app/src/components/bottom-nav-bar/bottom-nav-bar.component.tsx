import { IBottomNavBarComponentProps } from "./bottom-nav-bar.type";
import { useCart } from "../../App";
import {
  HomeIcon as HomeOutline,
  ClipboardDocumentListIcon as ClipboardOutline,
  BellIcon as BellOutline,
  UserIcon as UserOutline,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  ClipboardDocumentListIcon as ClipboardSolid,
  BellIcon as BellSolid,
  UserIcon as UserSolid,
} from "@heroicons/react/24/solid";

export const BottomNavBarComponent: React.FC<IBottomNavBarComponentProps> = (
  _props,
) => {
  const { activeTab, setActiveTab, setIsCartOpen, notifications } = useCart();
  const showNavbar = [
    "home",
    "orders",
    "notifications",
    "profile",
  ].includes(activeTab);

  if (!showNavbar) return null;

  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[68px] bg-white/95 backdrop-blur-md border-t border-[#f0edeb] flex justify-around items-center px-2 z-50 shadow-lg">
      {/* Trang Chủ Tab */}
      <button
        onClick={() => {
          setActiveTab("home");
          setIsCartOpen(false);
        }}
        className="flex flex-col items-center justify-center flex-1 h-full transition-all border-none bg-transparent cursor-pointer group"
      >
        {activeTab === "home" ? (
          <HomeSolid className="w-5.5 h-5.5 text-primary scale-105 transition-transform" />
        ) : (
          <HomeOutline className="w-5.5 h-5.5 text-[#526069] opacity-70 group-hover:opacity-100 transition-opacity" />
        )}
        <span
          className={`text-[10px] mt-1 font-extrabold tracking-tight transition-colors ${
            activeTab === "home" ? "text-primary" : "text-[#526069]/70"
          }`}
        >
          Trang chủ
        </span>
      </button>

      {/* Đơn Hàng Tab */}
      <button
        onClick={() => {
          setActiveTab("orders");
          setIsCartOpen(false);
        }}
        className="flex flex-col items-center justify-center flex-1 h-full transition-all border-none bg-transparent cursor-pointer group"
      >
        {activeTab === "orders" ? (
          <ClipboardSolid className="w-5.5 h-5.5 text-primary scale-105 transition-transform" />
        ) : (
          <ClipboardOutline className="w-5.5 h-5.5 text-[#526069] opacity-70 group-hover:opacity-100 transition-opacity" />
        )}
        <span
          className={`text-[10px] mt-1 font-extrabold tracking-tight transition-colors ${
            activeTab === "orders" ? "text-primary" : "text-[#526069]/70"
          }`}
        >
          Đơn hàng
        </span>
      </button>

      {/* Thông Báo Tab */}
      <button
        onClick={() => {
          setActiveTab("notifications");
          setIsCartOpen(false);
        }}
        className="flex flex-col items-center justify-center flex-1 h-full transition-all relative border-none bg-transparent cursor-pointer group"
      >
        <div className="relative">
          {activeTab === "notifications" ? (
            <BellSolid className="w-5.5 h-5.5 text-primary scale-105 transition-transform" />
          ) : (
            <BellOutline className="w-5.5 h-5.5 text-[#526069] opacity-70 group-hover:opacity-100 transition-opacity" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white z-10 animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <span
          className={`text-[10px] mt-1 font-extrabold tracking-tight transition-colors ${
            activeTab === "notifications" ? "text-primary" : "text-[#526069]/70"
          }`}
        >
          Thông báo
        </span>
      </button>

      {/* Tài Khoản / Cá Nhân Tab */}
      <button
        onClick={() => {
          setActiveTab("profile");
          setIsCartOpen(false);
        }}
        className="flex flex-col items-center justify-center flex-1 h-full transition-all border-none bg-transparent cursor-pointer group"
      >
        {activeTab === "profile" ? (
          <UserSolid className="w-5.5 h-5.5 text-primary scale-105 transition-transform" />
        ) : (
          <UserOutline className="w-5.5 h-5.5 text-[#526069] opacity-70 group-hover:opacity-100 transition-opacity" />
        )}
        <span
          className={`text-[10px] mt-1 font-extrabold tracking-tight transition-colors ${
            activeTab === "profile" ? "text-primary" : "text-[#526069]/70"
          }`}
        >
          Tài khoản
        </span>
      </button>
    </div>
  );
};
