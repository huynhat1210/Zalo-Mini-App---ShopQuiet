import { useEffect, useState } from "react";
import { Page } from "zmp-ui";
import { useQueryClient } from "@tanstack/react-query";
import { useCart, IOrder } from "../../App";
import { apiRequest, useTranslation } from "../../utils";
import { EmptyStateComponent } from "../../components";
import { INotificationsProps } from "./notifications.type";

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
      <PageCast className="bg-surface  relative flex flex-col w-full h-full overscroll-none scrollbar-none items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <span className="text-[10px] font-bold text-textColor-variant  tracking-wider uppercase">
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
    <PageCast className="bg-surface  text-slate-900  relative flex flex-col w-full h-full overscroll-none scrollbar-none animate-fade-in">
      {/* Header */}
      <div className="bg-white/95 /95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-[#f0edeb]  sticky top-0 z-30 shadow-xs">
        <button
          onClick={() => setActiveTab("home")}
          className="p-1.5 -ml-1.5 hover:bg-[#f0edeb] :bg-slate-800 rounded-full transition-colors active:scale-95 border-none bg-transparent cursor-pointer"
        >
          <svg
            className="w-5.5 h-5.5 text-textColor "
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-textColor ">
          {t("notification.title")} ({notifications.length})
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleMarkAllRead}
            className="p-1.5 hover:bg-[#f0edeb] :bg-slate-800 rounded-full transition-colors active:scale-95 text-textColor-variant  hover:text-textColor border-none bg-transparent cursor-pointer"
            title={t("notification.markAllRead")}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
          <button
            onClick={handleDeleteAllNotifications}
            className="p-1.5 hover:bg-red-50 :bg-red-950/30 text-red-500 rounded-full transition-colors active:scale-95 border-none bg-transparent cursor-pointer"
            title={t("common.delete")}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white/95 /95 backdrop-blur-md px-6 py-2.5 flex border-b border-[#f0edeb]  sticky top-[53px] z-20 shadow-xs">
        <div className="flex bg-[#f5f3f0]  p-1 w-full rounded-xl border border-[#eae8e6]  gap-1">
          <button
            onClick={() => setActiveCategory("order")}
            className={`flex-1 py-1.5 text-[9px] font-extrabold uppercase tracking-wider rounded-lg border-none transition-all cursor-pointer ${
              activeCategory === "order"
                ? "bg-white  text-primary  shadow-xs"
                : "bg-transparent text-textColor-variant  hover:text-textColor"
            }`}
          >
            {t("notification.order")}
          </button>
          <button
            onClick={() => setActiveCategory("promo")}
            className={`flex-1 py-1.5 text-[9px] font-extrabold uppercase tracking-wider rounded-lg border-none transition-all cursor-pointer ${
              activeCategory === "promo"
                ? "bg-white  text-primary  shadow-xs"
                : "bg-transparent text-textColor-variant  hover:text-textColor"
            }`}
          >
            {t("notification.promo")}
          </button>
          <button
            onClick={() => setActiveCategory("system")}
            className={`flex-1 py-1.5 text-[9px] font-extrabold uppercase tracking-wider rounded-lg border-none transition-all cursor-pointer ${
              activeCategory === "system"
                ? "bg-white  text-primary  shadow-xs"
                : "bg-transparent text-textColor-variant  hover:text-textColor"
            }`}
          >
            {t("notification.system")}
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
                  className={`p-4 bg-white  rounded-2xl border border-[#f0edeb]  shadow-xs flex gap-4 transition-all duration-300 relative cursor-pointer hover:border-primary/25 ${
                    !item.read
                      ? "border-primary/20 bg-primary-light/10 /40"
                      : ""
                  }`}
                >
                  {/* Unread dot indicator */}
                  {!item.read && (
                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary  animate-pulse" />
                  )}

                  {/* Left Side Icon */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      activeCategory === "promo"
                        ? "bg-amber-50 /40 text-amber-700 "
                        : "bg-primary-light /50 text-primary "
                    }`}
                  >
                    {activeCategory === "promo" ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l6.499 6.499c.404.404.935.612 1.469.612.534 0 1.065-.208 1.469-.612l4.318-4.318a2.036 2.036 0 000-2.872L11.159 3.66a2.25 2.25 0 00-1.591-.659zm-1.818 4.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Right Side Content Details */}
                  <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-bold text-textColor  leading-snug pr-3">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-textColor-variant  leading-relaxed font-medium">
                      {item.content}
                    </p>

                    {/* Additional Actions */}
                    {discountCode && (
                      <div
                        className="flex items-center gap-2 pt-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] font-mono font-bold bg-[#f0edeb]  text-textColor  px-3 py-1 rounded border border-[#eae8e6] ">
                          {discountCode}
                        </span>
                        <button
                          onClick={() => handleCopyCode(discountCode)}
                          className="text-[10px] font-bold text-primary  hover:underline uppercase tracking-wider border-none bg-transparent cursor-pointer"
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
                        className="text-[10px] font-bold text-primary  hover:underline uppercase tracking-wider pt-2 block border-none bg-transparent cursor-pointer"
                      >
                        Xem hành trình đơn hàng
                      </button>
                    )}

                    <p className="text-[9px] text-[#526069]/55  font-medium pt-1.5">
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
