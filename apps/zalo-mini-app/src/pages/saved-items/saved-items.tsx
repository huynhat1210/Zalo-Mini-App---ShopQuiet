import { Page } from "zmp-ui";
import { useCart } from "../../App";
import { safeParseImages, useTranslation } from "../../utils";
import { EmptyStateComponent, LazyImageComponent } from "../../components";
import { ISavedItemsProps } from "./saved-items.type";
import {
  ChevronLeftIcon,
  ShareIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";

const PageCast = Page as any;

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

    if (navigator.share) {
      navigator
        .share({
          title: t("saved.title"),
          text: shareContent,
        })
        .catch((error: any) => {
          console.error("Share failed:", error);
          copyToClipboard(shareContent);
        });
    } else {
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
          className="p-1.5 -ml-1.5 hover:bg-[#f0edeb] rounded-full transition-colors active:scale-95 border-none bg-transparent cursor-pointer"
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

      {/* Bulk Action Header Bar */}
      {savedItems.length > 0 && (
        <div className="px-6 pt-3 flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
            Sản phẩm đã thích ({savedItems.length})
          </span>
          <button
            onClick={handleMoveAllToCart}
            className="text-[10px] font-bold text-[#0e6877] hover:underline uppercase tracking-wider flex items-center gap-1 border-none bg-transparent cursor-pointer active:scale-95"
          >
            <ShoppingBagIcon className="w-4 h-4" />
            {t("saved.moveToCart")}
          </button>
        </div>
      )}

      <div className="flex-1 px-6 py-4 space-y-4 pb-28">
        {savedItems.length === 0 ? (
          <EmptyStateComponent
            title={t("saved.empty")}
            description="Nhấn icon trái tim trên sản phẩm để lưu lại tại đây."
            actionText="Khám phá ngay"
            onAction={() => setActiveTab("home")}
          />
        ) : (
          /* Saved items grid */
          <div className="grid grid-cols-2 gap-x-5 gap-y-6">
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
                    className="absolute top-2.5 right-2.5 z-10 w-7.5 h-7.5 rounded-full bg-white/95 shadow-sm flex items-center justify-center text-red-500 hover:bg-red-50 active:scale-90 transition-all border-none cursor-pointer"
                    title="Bỏ yêu thích"
                  >
                    <HeartSolid className="w-4 h-4 text-red-500" />
                  </button>

                  {/* Image */}
                  <div className="h-[140px] w-full overflow-hidden bg-neutral-50 border-b border-[#f0edeb]">
                    <LazyImageComponent
                      src={img}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Info */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] text-[#526069]/60 uppercase font-bold tracking-wider">
                        {prod.category?.name || "Sản phẩm"}
                      </span>
                      <h3 className="text-xs font-semibold text-textColor mt-0.5 line-clamp-1 group-hover:text-[#0e6877] transition-colors">
                        {prod.name}
                      </h3>
                    </div>

                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs font-extrabold text-textColor">
                        {prod.price.toLocaleString("vi-VN")} đ
                      </span>
                      {/* Cart Icon Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(prod);
                        }}
                        className="w-7 h-7 rounded-full bg-[#0e6877] text-white flex items-center justify-center active:scale-90 transition-all shadow-2xs border-none cursor-pointer hover:bg-[#0c5966]"
                        title="Thêm vào giỏ hàng"
                      >
                        <ShoppingBagIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
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

export default SavedItems;
