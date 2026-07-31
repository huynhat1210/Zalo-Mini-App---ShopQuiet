import { useEffect, useState } from "react";
import { Page } from "zmp-ui";
import { useCart } from "../../App";
import { safeParseImages, useTranslation } from "../../utils";
import { ISuccessOrder, IOrderSuccessProps } from "./order-success.type";
import { X, Check, Truck, Zap } from "lucide-react";

const PageCast = Page as any;

export const OrderSuccess: React.FC<IOrderSuccessProps> = (_props) => {
  const { setActiveTab } = useCart();
  const { t } = useTranslation();
  const [order, setOrder] = useState<ISuccessOrder | null>(null);

  useEffect(() => {
    const lastOrder = localStorage.getItem("last_success_order");
    if (lastOrder) {
      try {
        setOrder(JSON.parse(lastOrder));
      } catch (e) {
        console.error("Error parsing last order", e);
      }
    }
  }, []);

  // Standard fallback if no order details are in storage
  const mockOrder: ISuccessOrder = {
    orderNumber: "SQ-82934",
    total: 690000,
    itemsCount: 2,
    shippingMethodCode: "standard",
    items: [
      {
        name: "Sản phẩm Mẫu 1",
        price: 240000,
        quantity: 1,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=100&q=80",
        ]),
      },
      {
        name: "Sản phẩm Mẫu 2",
        price: 450000,
        quantity: 1,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=100&q=80",
        ]),
      },
    ],
  };

  const activeOrder = order || mockOrder;
  const isExpress = activeOrder.shippingMethodCode === "express";

  return (
    <PageCast className="bg-surface relative flex flex-col w-full h-full overscroll-none scrollbar-none animate-fade-in">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-[#f0edeb] sticky top-0 z-30 shadow-xs">
        <button
          onClick={() => setActiveTab("home")}
          className="p-1.5 hover:bg-[#f0edeb] rounded-full transition-colors active:scale-95 border-none bg-transparent cursor-pointer"
        >
          <X className="w-5.5 h-5.5 text-textColor" />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-textColor">
          {t("orderSuccess.confirmed")}
        </span>
        <div className="w-8"></div>
      </div>

      <div className="flex-1 px-6 py-5.5 space-y-4 pb-28">
        {/* Success Indicator Card */}
        <div className="bg-white rounded-2xl border border-[#f0edeb] p-6 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center text-primary mx-auto shadow-xs">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-textColor leading-tight">
              {t("orderSuccess.thankYou")}
            </h2>
            <p className="text-xs text-textColor-variant leading-relaxed max-w-[280px] mx-auto">
              {t("orderSuccess.orderMessage").replace("%1%", `#${activeOrder.orderNumber}`)}
            </p>
          </div>
        </div>

        {/* Estimated Delivery & Shipping Method Card */}
        <div className="bg-white rounded-2xl border border-[#f0edeb] p-4.5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#fbf9f7] rounded-full flex items-center justify-center text-primary border border-primary/5">
                {isExpress ? (
                  <Zap className="w-5 h-5 text-amber-600" />
                ) : (
                  <Truck className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="text-xs">
                <p className="text-[#526069]/60 font-semibold uppercase tracking-wider text-[9px]">
                  {t("orderSuccess.estimatedDelivery")}
                </p>
                <p className="font-bold text-textColor mt-0.5">
                  {activeOrder.estimatedDeliveryDate || (isExpress ? "1 - 2 ngày làm việc" : "3 - 5 ngày làm việc")}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#f5f3f0] flex justify-between items-center text-xs">
            <span className="text-[#526069]/70 font-medium text-[10px] uppercase tracking-wider">
              {t("orderSuccess.shippingMethod")}
            </span>
            <span className={`font-bold px-2.5 py-1 rounded-full text-[10.5px] ${isExpress ? "bg-amber-100 text-amber-900 border border-amber-300/60" : "bg-blue-50 text-blue-800 border border-blue-200/60"}`}>
              {isExpress ? t("order.expressShipping") : t("order.standardShipping")}
            </span>
          </div>
        </div>

        {/* Order Summary Bento Card */}
        <div className="bg-white rounded-2xl border border-[#f0edeb] overflow-hidden shadow-xs">
          <div className="px-4.5 py-3 bg-neutral-50 border-b border-[#f0edeb] flex justify-between items-center text-[9.5px] font-bold uppercase tracking-wider text-textColor-variant">
            <span>{t("orderSuccess.orderSummary")}</span>
            <span>{t("orderSuccess.productsCount").replace("%1%", String(activeOrder.itemsCount))}</span>
          </div>

          <div className="px-4.5 py-1 divide-y divide-[#f0edeb]">
            {activeOrder.items.map((item, idx) => {
              const img = safeParseImages(item.images)[0];

              return (
                <div
                  key={idx}
                  className="flex justify-between items-center py-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={img}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-lg border border-[#f0edeb]"
                    />
                    <div className="text-xs space-y-0.5">
                      <p className="font-semibold text-textColor line-clamp-1 max-w-[170px] pr-2">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                        <span className="text-textColor-variant font-medium">
                          {t("order.quantity")}: x{item.quantity}
                        </span>
                        {item.color && item.color !== "DEFAULT" && (
                          <span className="bg-[#fcf8f5] border border-orange-200/50 text-orange-700 px-1.5 py-0.2 rounded font-medium text-[8px]">
                            {t("checkout.color")} {item.color}
                          </span>
                        )}
                        {item.size && item.size !== "DEFAULT" && (
                          <span className="bg-neutral-100 text-[#526069] px-1.5 py-0.2 rounded font-medium uppercase text-[8px]">
                            {t("checkout.size")} {item.size}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-textColor">
                    {(item.price * item.quantity).toLocaleString("vi-VN")} đ
                  </span>
                </div>
              );
            })}
          </div>

          <div className="px-4.5 py-3.5 bg-neutral-50 border-t border-[#f0edeb] flex justify-between items-center text-xs font-bold text-textColor">
            <span className="uppercase tracking-wider text-[10px] text-textColor-variant font-extrabold">
              {t("orderSuccess.totalPayment")}
            </span>
            <span className="text-base font-extrabold text-primary">
              {activeOrder.total.toLocaleString("vi-VN")} đ
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => setActiveTab("orders")}
            className="w-full h-11 rounded-full text-xs font-bold uppercase tracking-wider bg-primary text-white hover:bg-primary-dark active:scale-[0.98] transition-all shadow-sm border-none cursor-pointer"
          >
            {t("orderSuccess.trackOrder")}
          </button>

          <button
            onClick={() => setActiveTab("home")}
            className="w-full h-11 rounded-full text-xs font-bold uppercase tracking-wider border border-[#eae8e6] text-[#526069] bg-white hover:bg-neutral-50 active:scale-[0.98] transition-all cursor-pointer"
          >
            {t("orderSuccess.continueShopping")}
          </button>
        </div>
      </div>
    </PageCast>
  );
};
