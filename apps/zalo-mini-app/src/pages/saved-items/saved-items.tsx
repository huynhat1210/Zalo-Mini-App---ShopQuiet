import { useState } from "react";
import { Page } from "zmp-ui";
import { useCart } from "../../App";
import { safeParseImages, useTranslation } from "../../utils";
import { EmptyStateComponent, LazyImageComponent } from "../../components";
import { ISavedItemsProps } from "./saved-items.type";
import {
  ChevronLeftIcon,
  ShareIcon,
  ShoppingBagIcon,
  FolderIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";

const PageCast = Page as any;

const WISHLIST_FOLDERS = [
  { id: "all", name: "Tất cả yêu thích" },
  { id: "summer", name: "Đồ mùa hè ☀️" },
  { id: "gifts", name: "Gợi ý quà tặng 🎁" },
  { id: "work", name: "Trang phục công sở 💼" },
];

export const SavedItems: React.FC<ISavedItemsProps> = (_props) => {
  const { t } = useTranslation();
  const {
    savedItems,
    toggleSavedItem,
    addToCart,
    setSelectedProductDetail,
    setActiveTab,
    showToast,
  } = useCart();

  const [activeFolder, setActiveFolder] = useState("all");

  const handleAddToCart = (product: any) => {
    const hasVariants = product.variants && product.variants.length > 0;
    const hasColors =
      hasVariants &&
      product.variants.some((v: any) => v.color && v.color !== "DEFAULT");
    const hasSizes =
      hasVariants &&
      product.variants.some((v: any) => v.size && v.size !== "DEFAULT");

    if (hasColors || hasSizes) {
      setSelectedProductDetail(product);
      showToast(t("product.selectSize"), "info");
    } else {
      addToCart(product);
      showToast(`Đã thêm ${product.name} vào giỏ hàng!`, "success");
    }
  };

  const handleMoveAllToCart = () => {
    if (savedItems.length === 0) return;
    let count = 0;
    savedItems.forEach((p) => {
      addToCart(p);
      count++;
    });
    showToast(`${t("saved.moveToCart")} ${count} ${t("saved.title")}!`, "success");
  };

  const handleShareWishlist = () => {
    if (savedItems.length === 0) {
      showToast(t("saved.empty"), "warning");
      return;
    }

    const wishlistText = savedItems
      .map(
        (item, index) =>
          `${index + 1}. ${item.name} - ${item.price.toLocaleString("vi-VN")}đ`,
      )
      .join("\n");

    const shareContent = `${t("saved.title")} (${savedItems.length}):\n\n${wishlistText}\n\nXem thêm tại ShopQuiet!`;

    // Try Web Share API first
    if (navigator.share) {
      navigator
        .share({
          title: t("saved.title"),
          text: shareContent,
        })
        .catch((error: any) => {
          console.error("Share failed:", error);
          // Fallback to clipboard
          copyToClipboard(shareContent);
        });
    } else {
      // Fallback to clipboard
      copyToClipboard(shareContent);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast(t("toast.copied"), "success");
      })
      .catch(() => {
        showToast(t("toast.error"), "warning");
      });
  };

  return (
    <PageCast className="bg-surface relative flex flex-col w-full h-full overscroll-none scrollbar-none animate-fade-in">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-[#f0edeb] sticky top-0 z-30 shadow-xs">
        <button
          onClick={() => setActiveTab("profile")}
          className="p-1.5 hover:bg-[#f0edeb] rounded-full transition-colors active:scale-95 border-none bg-transparent cursor-pointer"
        >
          <ChevronLeftIcon className="w-5.5 h-5.5 text-textColor" strokeWidth={2.2} />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-textColor">
          {t("saved.title")} ({savedItems.length})
        </span>
        <button
          onClick={handleShareWishlist}
          className="p-1.5 hover:bg-[#f0edeb] rounded-full transition-colors active:scale-95 border-none bg-transparent cursor-pointer"
          title={t("product.share")}
        >
          <ShareIcon className="w-5.5 h-5.5 text-textColor" strokeWidth={2.2} />
        </button>
      </div>

      {/* Multi-Wishlist Folder Tabs */}
      <div className="flex gap-2 px-6 py-3 bg-white border-b border-slate-100 overflow-x-auto scrollbar-none">
        {WISHLIST_FOLDERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFolder(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wider shrink-0 transition-all border-none cursor-pointer flex items-center gap-1.5 ${
              activeFolder === f.id
                ? "bg-primary text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <FolderIcon className="w-3.5 h-3.5" />
            {f.name}
          </button>
        ))}
      </div>

      {/* Bulk Action Header Bar */}
      {savedItems.length > 0 && (
        <div className="px-6 pt-3 flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
            {t("saved.title")} ({savedItems.length})
          </span>
          <button
            onClick={handleMoveAllToCart}
            className="text-[10px] font-bold text-primary hover:text-primary-dark uppercase tracking-wider flex items-center gap-1 border-none bg-transparent cursor-pointer active:scale-95"
          >
            <ShoppingBagIcon className="w-4 h-4" />
            {t("saved.moveToCart")}
          </button>
        </div>
      )}

      <div className="flex-1 px-6 py-5.5 space-y-4 pb-28">
        {savedItems.length === 0 ? (
          <EmptyStateComponent
            title={t("saved.empty")}
            description="Tap heart icon on products to save them here."
            actionText="Explore"
            onAction={() => setActiveTab("home")}
          />
        ) : (
          /* Saved items list */
          <div className="grid grid-cols-2 gap-x-5 gap-y-7">
            {savedItems.map((prod) => {
              const img = safeParseImages(prod.images)[0];

              return (
                <div
                  key={prod.id}
                  onClick={() => setSelectedProductDetail(prod)}
                  className="bg-white rounded-2xl overflow-hidden flex flex-col relative border border-[#f0edeb] shadow-xs group hover:shadow-md cursor-pointer transition-all duration-300"
                >
                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSavedItem(prod);
                    }}
                    className="absolute top-2.5 right-2.5 z-10 w-7.5 h-7.5 rounded-full bg-white/95 shadow-sm flex items-center justify-center text-red-500 hover:bg-red-50 active:scale-90 transition-all"
                  >
                    <svg
                      className="w-4 h-4 fill-red-500 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </button>

                  {/* Image */}
                  <div className="h-[140px] w-full overflow-hidden bg-neutral-50 border-b border-[#f0edeb]">
                    <LazyImageComponent
                      src={img}
                      alt={prod.name}
                      className="w-full h-full"
                    />
                  </div>

                  {/* Info */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] text-[#526069]/60 uppercase font-bold tracking-wider">
                        {prod.category?.name}
                      </span>
                      <h3 className="text-xs font-semibold text-textColor mt-0.5 line-clamp-1">
                        {prod.name}
                      </h3>
                    </div>

                    <div className="flex justify-between items-center mt-3.5">
                      <span className="text-xs font-bold text-textColor">
                        {prod.price.toLocaleString("vi-VN")} đ
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(prod);
                        }}
                        className="text-[9px] font-bold uppercase tracking-wider text-primary hover:text-primary-dark active:scale-95 transition-transform"
                      >
                        {t("product.addToCart")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageCast>
  );
};
