import { useEffect, useState } from "react";
import { useCart } from "../../App";
import { apiRequest } from "../../utils/api";
import { IMenuDrawerComponentProps } from "./menu-drawer.type";

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
  const { showToast } = useCart();
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

  return (
    <div className="fixed inset-0 z-[100] flex bg-black/45 backdrop-blur-xs animate-fade-in">
      <div className="w-[80%] max-w-[320px] h-full bg-white shadow-2xl flex flex-col border-r border-[#f0edeb] animate-slide-right">
        <div className="px-6 py-5 flex items-center justify-between border-b border-[#f0edeb]">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-textColor">
            {brandName}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#f0edeb] rounded-full transition-colors active:scale-95 border-none bg-transparent"
          >
            <svg
              className="w-5 h-5 text-textColor-variant"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="space-y-3">
            <h3 className="text-[10px] font-extrabold text-[#526069]/50 uppercase tracking-widest">
              Bộ sưu tập độc quyền
            </h3>
            <div className="space-y-2">
              {collections.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item)}
                  className="w-full text-left py-2.5 px-3 bg-[#fbf9f7] rounded-xl hover:bg-[#f0edeb] transition-all flex items-center justify-between group border-none"
                >
                  <span className="text-xs font-bold text-textColor group-hover:text-primary transition-colors">
                    {item.label}
                  </span>
                  <svg
                    className="w-3.5 h-3.5 text-[#526069]/40 group-hover:text-primary transition-colors"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-extrabold text-[#526069]/50 uppercase tracking-widest">
              Chất liệu tự nhiên
            </h3>
            <div className="flex flex-wrap gap-2">
              {materials.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item)}
                  className="text-[10.5px] font-medium text-textColor-variant bg-white border border-[#eae8e6] px-3 py-1.5 rounded-full hover:border-primary hover:text-primary hover:bg-primary-light/10 transition-all active:scale-95 bg-transparent"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <h3 className="text-[10px] font-extrabold text-[#526069]/50 uppercase tracking-widest">
              {storyTitle}
            </h3>
            <div className="bg-[#fbf9f7] rounded-2xl p-4.5 border border-[#f0edeb] space-y-2.5">
              <p className="text-[10.5px] italic text-[#526069] leading-relaxed">
                "{storyContent}"
              </p>
              <img
                src={storyImageUrl}
                alt="Brand mood"
                className="w-full h-24 rounded-xl object-cover border border-[#f0edeb]/50"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="flex justify-between items-center text-[10px] text-[#526069]/60 font-semibold px-1">
              <span>{returnPolicy}</span>
              <span>•</span>
              <span>Hotline: {hotline}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1" onClick={onClose}></div>
    </div>
  );
};
