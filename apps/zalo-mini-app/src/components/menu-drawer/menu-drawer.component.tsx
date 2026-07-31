import { useEffect, useState } from "react";
import { useCart } from "../../App";
import { apiRequest, useTranslation } from "../../utils";
import { IMenuDrawerComponentProps } from "./menu-drawer.type";
import {
  XMarkIcon,
  ShoppingBagIcon,
  HeartIcon,
  GiftIcon,
  TicketIcon,
  PhoneIcon,
  ChevronRightIcon,
  UserIcon,
  ShieldCheckIcon,
  TruckIcon,
  ArrowPathIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

type CmsMenuItem = {
  id: number;
  section: string;
  label: string;
  targetType: string;
  target?: string | null;
  description?: string | null;
  imageUrl?: string | null;
};

type CmsBootstrap = {
  settings: Record<string, string>;
  menuItems: CmsMenuItem[];
};

const fallbackSettings: Record<string, string> = {
  "brand.name": "ShopQuiet",
  "brand.story.title": "Quiet Space",
  "brand.story.content":
    "Chúng tôi tin vào vẻ đẹp tĩnh lặng, những đường nét gọn gàng và chất liệu thô mộc tự nhiên mang lại cảm giác bình yên trong cuộc sống hằng ngày.",
  "brand.story.imageUrl":
    "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400&q=80",
  "support.returnPolicyShort": "Chính sách đổi trả 7 ngày",
  "support.hotline": "1900 6868",
};

const fallbackMenuItems: CmsMenuItem[] = [
  {
    id: 1,
    section: "collections",
    label: "Minimalist Living",
    targetType: "CATEGORY",
    target: "home",
  },
  {
    id: 2,
    section: "collections",
    label: "Summer Breathable",
    targetType: "CATEGORY",
    target: "clothing",
  },
  {
    id: 3,
    section: "collections",
    label: "Earth Tones Selection",
    targetType: "CATEGORY",
    target: "home",
  },
  {
    id: 4,
    section: "materials",
    label: "100% Organic Linen",
    targetType: "TOAST",
    target: "100% Organic Linen",
  },
  {
    id: 5,
    section: "materials",
    label: "Premium Ceramic",
    targetType: "TOAST",
    target: "Premium Ceramic",
  },
  {
    id: 6,
    section: "materials",
    label: "Hand-poured Concrete",
    targetType: "TOAST",
    target: "Hand-poured Concrete",
  },
];

export const MenuDrawerComponent: React.FC<IMenuDrawerComponentProps> = (
  props,
) => {
  const { isOpen, onClose, setSelectedCategory } = props;
  const {
    showToast,
    zaloUser,
    setActiveTab,
    setIsAuthModalOpen,
  } = useCart();
  const { t } = useTranslation();
  const [settings, setSettings] = useState(fallbackSettings);
  const [menuItems, setMenuItems] = useState<CmsMenuItem[]>(fallbackMenuItems);

  useEffect(() => {
    async function loadCms() {
      try {
        const data = await apiRequest<CmsBootstrap>("/cms/bootstrap");
        setSettings({ ...fallbackSettings, ...(data.settings || {}) });
        setMenuItems(
          data.menuItems?.length ? data.menuItems : fallbackMenuItems,
        );
      } catch (e) {
        console.error("Failed to load drawer CMS:", e);
      }
    }

    loadCms();
  }, []);

  if (!isOpen) return null;

  const brandName = settings["brand.name"] || fallbackSettings["brand.name"];
  const storyTitle =
    settings["brand.story.title"] || fallbackSettings["brand.story.title"];
  const storyContent =
    settings["brand.story.content"] || fallbackSettings["brand.story.content"];
  const storyImageUrl =
    settings["brand.story.imageUrl"] ||
    fallbackSettings["brand.story.imageUrl"];
  const returnPolicy =
    settings["support.returnPolicyShort"] ||
    fallbackSettings["support.returnPolicyShort"];
  const hotline =
    settings["support.hotline"] || fallbackSettings["support.hotline"];
  const collections = menuItems.filter(
    (item) => item.section === "collections",
  );
  const materials = menuItems.filter((item) => item.section === "materials");

  const handleMenuClick = (item: CmsMenuItem) => {
    if (item.targetType === "CATEGORY" && item.target) {
      setSelectedCategory(item.target);
      showToast(`Đang lọc bộ sưu tập: ${item.label}`, "info");
    } else if (item.targetType === "TOAST") {
      showToast(
        `Đã chọn lọc chất liệu: ${item.target || item.label}`,
        "success",
      );
    } else if (item.targetType === "URL" && item.target) {
      window.open(item.target, "_blank");
    }

    onClose();
  };

  const isGuest = !zaloUser || zaloUser.name === "Khách" || zaloUser.id?.startsWith("guest_");

  return (
    <div className="fixed inset-0 z-[100] flex bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-[85%] max-w-[330px] h-full bg-white text-slate-900 shadow-2xl flex flex-col border-r border-[#f0edeb] animate-slide-right">
        {/* Drawer Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-[#f0edeb] sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0e6877] animate-ping" />
            <span className="text-xs font-black uppercase tracking-[0.25em] text-textColor">
              {brandName}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-full transition-all active:scale-90 border-none bg-transparent cursor-pointer text-slate-500"
          >
            <XMarkIcon className="w-5 h-5" strokeWidth={2.2} />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 scrollbar-none">
          {/* User Profile Header Card */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50/60 rounded-2xl p-4 border border-teal-100/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={
                    zaloUser?.avatar ||
                    "https://zalo-api.zdn.vn/api/emoticon/avatar"
                  }
                  alt={zaloUser?.name || "Avatar"}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                />
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-xs font-black text-slate-900 truncate">
                  {zaloUser?.name || "Khách"}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-black uppercase tracking-wider bg-[#0e6877] text-white px-2 py-0.5 rounded-full">
                    {zaloUser?.membershipTier || "Thành viên"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-teal-100 flex justify-between items-center">
              {isGuest ? (
                <button
                  onClick={() => {
                    onClose();
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full py-2 bg-[#0e6877] hover:bg-[#0f766e] text-white text-[10px] font-extrabold uppercase tracking-wider rounded-xl border-none cursor-pointer active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <UserIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Đăng Nhập / Đăng Ký
                </button>
              ) : (
                <button
                  onClick={() => {
                    onClose();
                    setActiveTab("profile");
                  }}
                  className="w-full py-1.5 bg-white text-[#0e6877] text-[10px] font-extrabold uppercase tracking-wider rounded-xl border border-teal-200 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <UserIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Trang cá nhân
                </button>
              )}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-left pl-1">
              Lối Tắt Mua Sắm
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onClose();
                  setActiveTab("orders");
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 flex items-center gap-2.5 transition-all cursor-pointer border-none text-left"
              >
                <div className="p-1.5 rounded-xl bg-blue-50 text-blue-600">
                  <ShoppingBagIcon className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <span className="text-[11px] font-bold text-slate-700">
                  Đơn hàng
                </span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  setActiveTab("saved-items");
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 flex items-center gap-2.5 transition-all cursor-pointer border-none text-left"
              >
                <div className="p-1.5 rounded-xl bg-rose-50 text-rose-600">
                  <HeartIcon className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <span className="text-[11px] font-bold text-slate-700">
                  Yêu thích
                </span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  setActiveTab("profile");
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 flex items-center gap-2.5 transition-all cursor-pointer border-none text-left"
              >
                <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600">
                  <GiftIcon className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <span className="text-[11px] font-bold text-slate-700">
                  Vòng quay
                </span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  setActiveTab("profile");
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 flex items-center gap-2.5 transition-all cursor-pointer border-none text-left"
              >
                <div className="p-1.5 rounded-xl bg-purple-50 text-purple-600">
                  <TicketIcon className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <span className="text-[11px] font-bold text-slate-700">
                  Voucher
                </span>
              </button>
            </div>
          </div>

          {/* Exclusive Collections */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-left pl-1">
              Bộ Sưu Tập Độc Quyền
            </h3>
            <div className="space-y-1.5">
              {collections.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item)}
                  className="w-full text-left py-2.5 px-3.5 bg-slate-50/70 rounded-xl hover:bg-slate-100 transition-all flex items-center justify-between group border-none cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-800 group-hover:text-primary transition-colors">
                    {item.label}
                  </span>
                  <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                </button>
              ))}
            </div>
          </div>

          {/* Natural Materials */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-left pl-1">
              Chất Liệu Tự Nhiên
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {materials.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item)}
                  className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:border-[#0e6877] hover:text-[#0e6877] transition-all active:scale-95 cursor-pointer shadow-2xs"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Story Card */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-left pl-1 flex items-center gap-1">
              <SparklesIcon className="w-3 h-3 text-amber-500" />
              {storyTitle}
            </h3>
            <div className="bg-gradient-to-b from-stone-50 to-amber-50/40 rounded-2xl p-4 border border-stone-200/60 space-y-2 text-left">
              <p className="text-[10.5px] italic text-slate-600 leading-relaxed">
                "{storyContent}"
              </p>
              <img
                src={storyImageUrl}
                alt="Brand mood"
                className="w-full h-24 rounded-xl object-cover border border-stone-200"
              />
            </div>
          </div>

          {/* Shopping Guarantees */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-2 text-left">
            <div className="flex items-center gap-2 text-[10.5px] font-semibold text-slate-600">
              <TruckIcon className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2} />
              <span>Freeship cho đơn hàng từ 500k</span>
            </div>
            <div className="flex items-center gap-2 text-[10.5px] font-semibold text-slate-600">
              <ArrowPathIcon className="w-4 h-4 text-blue-500 shrink-0" strokeWidth={2} />
              <span>{returnPolicy}</span>
            </div>
            <div className="flex items-center gap-2 text-[10.5px] font-semibold text-slate-600">
              <ShieldCheckIcon className="w-4 h-4 text-amber-500 shrink-0" strokeWidth={2} />
              <span>100% Sản phẩm chính hãng</span>
            </div>
          </div>

          {/* Support Hotline Footer */}
          <div className="pt-1 pb-2">
            <a
              href={`tel:${hotline}`}
              className="w-full py-2.5 px-4 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-center gap-2 text-xs font-extrabold text-[#0e6877] no-underline hover:bg-teal-100/60 transition-all"
            >
              <PhoneIcon className="w-4 h-4" strokeWidth={2} />
              <span>Hotline Hỗ Trợ: {hotline}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuDrawerComponent;
