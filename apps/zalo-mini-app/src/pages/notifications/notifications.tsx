import { useEffect, useState } from "react";
import { Page } from "zmp-ui";
import { useQueryClient } from "@tanstack/react-query";
import { useCart, IOrder } from "../../App";
import { apiRequest, useTranslation } from "../../utils";
import { EmptyStateComponent } from "../../components";
import { INotificationsProps } from "./notifications.type";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  TrashIcon,
  TagIcon,
  ShoppingBagIcon,
  BellIcon,
} from "@heroicons/react/24/outline";

const PageCast = Page as any;

export const Notifications: React.FC<INotificationsProps> = (_props) => {
  const { t } = useTranslation();
  const {
    setActiveTab,
    showToast,
    setSelectedOrder,
    notifications,
    setNotifications,
    fetchNotifications,
    zaloUser,
  } = useCart();
  const [activeCategory, setActiveCategory] = useState<
    "order" | "promo" | "system"
  >("order");
  const queryClient = useQueryClient();

  const handleViewOrder = async (orderId: string) => {
    try {
      showToast(t("notification.loading"), "info");
      const order = await apiRequest<IOrder>(`/orders/${orderId}`);
      setSelectedOrder(order);
      setActiveTab("order-detail");
    } catch (e) {
      console.error(e);
      showToast(t("toast.serverError"), "warning");
    }
  };

  useEffect(() => {
    if (zaloUser?.id) {
      fetchNotifications();
    }
  }, [fetchNotifications, zaloUser?.id]);

  if (!zaloUser) {
    return (
      <PageCast className="bg-surface relative flex flex-col w-full h-full overscroll-none scrollbar-none items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <span className="text-[10px] font-bold text-textColor-variant tracking-wider uppercase">
            {t("common.loading")}
          </span>
        </div>
      </PageCast>
    );
  }

  const handleMarkAllRead = async () => {
    try {
      await apiRequest("/notifications/mark-all-read", "PATCH");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      showToast(t("notification.markAllRead"), "success");
    } catch (err) {
      console.error(err);
      showToast(t("toast.error"), "warning");
    }
  };

  const handleDeleteAllNotifications = async () => {
    if (notifications.length === 0) return;
    try {
      await apiRequest("/notifications/delete-all", "DELETE");
      setNotifications([]);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      showToast(t("toast.success"), "success");
    } catch (err) {
      console.error(err);
      showToast(t("toast.error"), "warning");
    }
  };

  const handleMarkSingleRead = async (id: number) => {
    try {
      await apiRequest(`/notifications/${id}/read`, "PATCH");
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast(t("toast.copied"), "success");
  };

  const getOrderId = (title: string, content: string) => {
    const titleText = title || "";
    const contentText = content || "";

    const matchSq = titleText.match(/SQ-\d+/) || contentText.match(/SQ-\d+/);
    if (matchSq) return matchSq[0];

    const matchHashNum =
      titleText.match(/#(\d+)/) || contentText.match(/#(\d+)/);
    if (matchHashNum) return matchHashNum[1];

    const matchOrderNum =
      titleText.match(
        /(?:đơn hàng|Mã đơn|mã đơn|Đơn hàng)\s+(?:số\s+)?(\d+)/i,
      ) ||
      contentText.match(
        /(?:đơn hàng|Mã đơn|mã đơn|Đơn hàng)\s+(?:số\s+)?(\d+)/i,
      );
    if (matchOrderNum) return matchOrderNum[1];

    return undefined;
  };

  const getDiscountCode = (content: string) => {
    const contentText = content || "";
    const match = contentText.match(/[A-Z0-9]{5,15}/);
    return match ? match[0] : undefined;
  };

  // Check unread count for red dot badges per category tab
  const hasUnreadOrder = notifications.some(
    (n) => !n.read && (n.type || "").toLowerCase() === "order",
  );
  const hasUnreadPromo = notifications.some(
    (n) =>
      !n.read &&
      ["promo", "voucher", "discount"].includes((n.type || "").toLowerCase()),
  );
  const hasUnreadSystem = notifications.some(
    (n) =>
      !n.read &&
      !["order", "promo", "voucher", "discount"].includes(
        (n.type || "").toLowerCase(),
      ),
  );

  const filteredNotifications = notifications.filter((item) => {
    const itemType = (item.type || "").toLowerCase();
    if (activeCategory === "order") {
      return itemType === "order";
    } else if (activeCategory === "promo") {
      return (
        itemType === "promo" ||
        itemType === "voucher" ||
        itemType === "discount"
      );
    } else {
      return (
        itemType !== "order" &&
        itemType !== "promo" &&
        itemType !== "voucher" &&
        itemType !== "discount"
      );
    }
  });

  return (
    <PageCast className="bg-surface text-slate-900 relative flex flex-col w-full h-full overscroll-none scrollbar-none animate-fade-in">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-[#f0edeb] sticky top-0 z-30 shadow-xs">
        <button
          onClick={() => setActiveTab("home")}
          className="p-1.5 -ml-1.5 hover:bg-[#f0edeb] rounded-full transition-colors active:scale-95 border-none bg-transparent cursor-pointer"
        >
          <ArrowLeftIcon className="w-5.5 h-5.5 text-textColor" strokeWidth={2.2} />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-textColor">
          {t("notification.title")} ({notifications.length})
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleMarkAllRead}
            className="p-1.5 hover:bg-[#f0edeb] rounded-full transition-colors active:scale-95 text-textColor-variant hover:text-textColor border-none bg-transparent cursor-pointer"
            title={t("notification.markAllRead")}
          >
            <CheckCircleIcon className="w-5 h-5" strokeWidth={2} />
          </button>
          <button
            onClick={handleDeleteAllNotifications}
            className="p-1.5 hover:bg-red-50 text-red-500 rounded-full transition-colors active:scale-95 border-none bg-transparent cursor-pointer"
            title={t("common.delete")}
          >
            <TrashIcon className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Category Tabs with Unread Red Dot Indicators */}
      <div className="bg-white/95 backdrop-blur-md px-6 py-2.5 flex border-b border-[#f0edeb] sticky top-[53px] z-20 shadow-xs">
        <div className="flex bg-[#f5f3f0] p-1 w-full rounded-xl border border-[#eae8e6] gap-1">
          <button
            onClick={() => setActiveCategory("order")}
            className={`flex-1 py-1.5 text-[9px] font-extrabold uppercase tracking-wider rounded-lg border-none transition-all cursor-pointer relative flex items-center justify-center gap-1 ${
              activeCategory === "order"
                ? "bg-white text-primary shadow-xs"
                : "bg-transparent text-textColor-variant hover:text-textColor"
            }`}
          >
            <span>{t("notification.order")}</span>
            {hasUnreadOrder && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveCategory("promo")}
            className={`flex-1 py-1.5 text-[9px] font-extrabold uppercase tracking-wider rounded-lg border-none transition-all cursor-pointer relative flex items-center justify-center gap-1 ${
              activeCategory === "promo"
                ? "bg-white text-primary shadow-xs"
                : "bg-transparent text-textColor-variant hover:text-textColor"
            }`}
          >
            <span>{t("notification.promo")}</span>
            {hasUnreadPromo && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveCategory("system")}
            className={`flex-1 py-1.5 text-[9px] font-extrabold uppercase tracking-wider rounded-lg border-none transition-all cursor-pointer relative flex items-center justify-center gap-1 ${
              activeCategory === "system"
                ? "bg-white text-primary shadow-xs"
                : "bg-transparent text-textColor-variant hover:text-textColor"
            }`}
          >
            <span>{t("notification.system")}</span>
            {hasUnreadSystem && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Notifications List content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-28 text-left animate-fade-in">
        {filteredNotifications.length === 0 ? (
          <EmptyStateComponent
            title={t("notification.empty")}
            description={
              activeCategory === "order"
                ? t("notification.order")
                : activeCategory === "promo"
                  ? t("notification.promo")
                  : t("notification.system")
            }
          />
        ) : (
          <div className="space-y-3.5">
            {filteredNotifications.map((item) => {
              const orderId = getOrderId(item.title, item.content);
              const discountCode =
                activeCategory === "promo"
                  ? getDiscountCode(item.content)
                  : undefined;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    handleMarkSingleRead(item.id);
                    if (orderId) {
                      handleViewOrder(orderId);
                    }
                  }}
                  className={`p-4 bg-white rounded-2xl border border-[#f0edeb] shadow-xs flex gap-4 transition-all duration-300 relative cursor-pointer hover:border-primary/25 ${
                    !item.read
                      ? "border-primary/20 bg-primary-light/10"
                      : ""
                  }`}
                >
                  {/* Unread dot indicator */}
                  {!item.read && (
                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}

                  {/* Left Side Icon */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      activeCategory === "promo"
                        ? "bg-amber-50 text-amber-700"
                        : activeCategory === "order"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-primary-light/50 text-primary"
                    }`}
                  >
                    {activeCategory === "promo" ? (
                      <TagIcon className="w-5 h-5" strokeWidth={2.2} />
                    ) : activeCategory === "order" ? (
                      <ShoppingBagIcon className="w-5 h-5" strokeWidth={2.2} />
                    ) : (
                      <BellIcon className="w-5 h-5" strokeWidth={2.2} />
                    )}
                  </div>

                  {/* Right Side Content Details */}
                  <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-bold text-textColor leading-snug pr-3">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-textColor-variant leading-relaxed font-medium">
                      {item.content}
                    </p>

                    {/* Additional Actions */}
                    {discountCode && (
                      <div
                        className="flex items-center gap-2 pt-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] font-mono font-bold bg-[#f0edeb] text-textColor px-3 py-1 rounded border border-[#eae8e6]">
                          {discountCode}
                        </span>
                        <button
                          onClick={() => handleCopyCode(discountCode)}
                          className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider border-none bg-transparent cursor-pointer"
                        >
                          Copy Mã
                        </button>
                      </div>
                    )}

                    {orderId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkSingleRead(item.id);
                          handleViewOrder(orderId);
                        }}
                        className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider pt-2 block border-none bg-transparent cursor-pointer"
                      >
                        Xem hành trình đơn hàng
                      </button>
                    )}

                    <p className="text-[9px] text-[#526069]/55 font-medium pt-1.5">
                      {item.date}
                    </p>
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
export default Notifications;
