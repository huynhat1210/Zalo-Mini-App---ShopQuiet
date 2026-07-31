import { useEffect, useState } from "react";
import { useCart } from "../../App";
import { apiRequest, safeParseImages, useTranslation } from "../../utils";
import { EmptyStateComponent } from "../../components";
import { ICartProps } from "./cart.type";
import {
  ChevronLeftIcon,
  TrashIcon,
  TicketIcon,
  CheckCircleIcon,
  ShoppingBagIcon,
  XMarkIcon,
  TagIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

export const Cart: React.FC<ICartProps> = (_props) => {
  const { t } = useTranslation();
  const {
    cart,
    updateQuantity,
    updateItemVariant,
    setActiveTab,
    setIsCartOpen,
    showToast,
  } = useCart();
  const [estimatedShipping, setEstimatedShipping] = useState(15000);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [vouchersList, setVouchersList] = useState<any[]>([]);

  useEffect(() => {
    async function loadVouchersAndShipping() {
      try {
        const [methods, list] = await Promise.all([
          apiRequest<Array<{ price: number }>>("/cms/shipping-methods").catch(() => []),
          apiRequest<any[]>("/vouchers").catch(() => []),
        ]);
        setEstimatedShipping(methods[0]?.price ?? 15000);

        if (Array.isArray(list)) {
          setVouchersList(list);
          const storedCode = localStorage.getItem("selected_voucher_code");
          if (storedCode) {
            const found = list.find((v: any) => v.code === storedCode);
            if (found) setSelectedVoucher(found);
          }
        }
      } catch (e) {
        console.error("Failed to load cart initialization data:", e);
      }
    }

    loadVouchersAndShipping();
  }, []);

  const handleSelectVoucher = (voucher: any) => {
    setSelectedVoucher(voucher);
    if (voucher) {
      localStorage.setItem("selected_voucher_code", voucher.code);
      showToast(`${t("cart.applied")} ${voucher.code}!`, "success");
    } else {
      localStorage.removeItem("selected_voucher_code");
      showToast(t("cart.removed"), "info");
    }
    setIsVoucherModalOpen(false);
  };

  const getItemKey = (item: any) =>
    `${item.product.id}-${item.color || "DEFAULT"}-${item.size || "DEFAULT"}`;

  // Automatically check all items initially
  useEffect(() => {
    if (cart.length > 0) {
      setCheckedKeys((prev) => {
        const cartKeys = cart.map(getItemKey);
        const newKeys = [...prev];
        cartKeys.forEach((k) => {
          if (!newKeys.includes(k)) {
            newKeys.push(k);
          }
        });
        return newKeys.filter((k) => cartKeys.includes(k));
      });
    } else {
      setCheckedKeys([]);
    }
  }, [cart]);

  const toggleCheckItem = (key: string) => {
    setCheckedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const toggleCheckAll = () => {
    if (checkedKeys.length === cart.length) {
      setCheckedKeys([]);
    } else {
      setCheckedKeys(cart.map(getItemKey));
    }
  };

  const selectedItems = cart.filter((item) =>
    checkedKeys.includes(getItemKey(item)),
  );

  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  const [cmsSettings, setCmsSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadCmsSettings() {
      try {
        const res = await apiRequest<Record<string, string>>('/cms/settings');
        if (res && typeof res === 'object') setCmsSettings(res);
      } catch (e) {}
    }
    loadCmsSettings();
  }, []);

  // Freeship threshold dynamically from CMS (default: 500,000 đ)
  const freeshipThreshold = Number(cmsSettings['shipping.freeThreshold']) || 500000;
  const isFreeshipEligible = subtotal >= freeshipThreshold;
  const remainingForFreeship = Math.max(0, freeshipThreshold - subtotal);
  const freeshipProgressPercent = Math.min(
    100,
    (subtotal / freeshipThreshold) * 100,
  );

  let voucherDiscount = 0;
  if (selectedVoucher && subtotal > 0) {
    if (selectedVoucher.type === "PERCENT") {
      voucherDiscount = Math.round((subtotal * selectedVoucher.value) / 100);
      if (selectedVoucher.maxDiscount > 0) {
        voucherDiscount = Math.min(voucherDiscount, selectedVoucher.maxDiscount);
      }
    } else if (selectedVoucher.type === "FIXED") {
      voucherDiscount = Math.min(subtotal, selectedVoucher.value);
    }
  }

  const shipping =
    subtotal > 0 ? (isFreeshipEligible ? 0 : estimatedShipping) : 0;
  const total = Math.max(0, subtotal + shipping - voucherDiscount);

  const handleProceedCheckout = () => {
    if (selectedItems.length === 0) {
      showToast(t("cart.selectItem"), "warning");
      return;
    }
    localStorage.setItem("checkout_items", JSON.stringify(selectedItems));
    localStorage.setItem(
      "checkout_freeship",
      isFreeshipEligible ? "true" : "false",
    );
    setIsCartOpen(false);
    setActiveTab("checkout");
  };

  return (
    <div className="h-full flex flex-col bg-surface overflow-hidden">
      {/* Top Header */}
      <div className="bg-white/95 backdrop-blur-md px-6 py-4 flex items-center gap-3 border-b border-[#f0edeb] sticky top-0 z-30 shadow-xs">
        <button
          onClick={() => {
            setIsCartOpen(false);
            setActiveTab("home");
          }}
          className="p-1.5 -ml-1.5 hover:bg-[#f0edeb] rounded-full transition-colors active:scale-95 border-none bg-transparent cursor-pointer"
        >
          <ChevronLeftIcon className="w-5.5 h-5.5 text-textColor" strokeWidth={2.2} />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-textColor">
          {t("cart.title")} ({cart.length})
        </span>
      </div>

      {/* Scrollable Cart Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto px-6 py-5 space-y-4 pb-28 scrollbar-none">
        {cart.length === 0 ? (
          <EmptyStateComponent
            title={t("cart.empty")}
            description={t("cart.emptyDesc")}
            actionText={t("cart.startShopping")}
            onAction={() => {
              setIsCartOpen(false);
              setActiveTab("home");
            }}
          />
        ) : (
          /* Cart items list */
          <div className="space-y-4">
            {/* Freeship Progress Bar */}
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 rounded-2xl p-4 mb-2 space-y-2 text-left shadow-2xs">
              <div className="flex justify-between items-center text-xs">
                {isFreeshipEligible ? (
                  <span className="font-extrabold text-[#0e6877] flex items-center gap-1.5">
                    <TruckIcon className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2} />
                    {t("cart.freeshipEligible")}
                  </span>
                ) : (
                  <span className="font-medium text-slate-700 flex items-center gap-1">
                    <TruckIcon className="w-4 h-4 text-[#0e6877] shrink-0" strokeWidth={2} />
                    {t("cart.buyMoreFreeship")}{" "}
                    <span className="font-bold text-[#0e6877]">
                      {remainingForFreeship.toLocaleString("vi-VN")} đ
                    </span>{" "}
                    {t("cart.forFreeship")}
                  </span>
                )}
                <span className="text-[10px] text-[#0e6877] font-black">
                  {subtotal.toLocaleString("vi-VN")}đ / {freeshipThreshold.toLocaleString("vi-VN")}đ
                </span>
              </div>
              <div className="w-full h-2 bg-teal-100/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0e6877] rounded-full transition-all duration-500"
                  style={{ width: `${freeshipProgressPercent}%` }}
                />
              </div>
            </div>

            {/* Checkbox Select All */}
            <div className="flex items-center gap-3 pb-2 pl-1 border-b border-neutral-100 text-left">
              <input
                type="checkbox"
                className="w-4.5 h-4.5 text-[#0e6877] accent-[#0e6877] cursor-pointer"
                checked={checkedKeys.length === cart.length && cart.length > 0}
                onChange={toggleCheckAll}
              />
              <span className="text-xs text-textColor font-bold">
                {t("cart.selectAll")} ({cart.length})
              </span>
            </div>

            <div className="space-y-3">
              {cart.map((item) => {
                const itemKey = getItemKey(item);
                const img = safeParseImages(item.product.images)[0];

                return (
                  <div
                    key={itemKey}
                    className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-[#f0edeb] shadow-xs relative hover:shadow-sm transition-all duration-300"
                  >
                    {/* Item Checkbox */}
                    <input
                      type="checkbox"
                      className="w-4.5 h-4.5 text-[#0e6877] accent-[#0e6877] flex-shrink-0 cursor-pointer"
                      checked={checkedKeys.includes(itemKey)}
                      onChange={() => toggleCheckItem(itemKey)}
                    />

                    {/* Product Image */}
                    <img
                      src={img}
                      alt={item.product.name}
                      className="w-16 h-16 flex-shrink-0 object-cover rounded-xl border border-[#f0edeb]"
                    />

                    {/* Product details */}
                    <div className="flex-1 flex flex-col justify-between min-w-0 text-left">
                      <div>
                        <h4 className="text-xs font-bold text-textColor truncate pr-2">
                          {item.product.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-extrabold text-[#0e6877]">
                            {item.product.price.toLocaleString("vi-VN")} đ
                          </span>
                          {/* Variant info if present */}
                          {(item.color !== "DEFAULT" || item.size !== "DEFAULT") && (
                            <span className="text-[9.5px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {[item.color !== "DEFAULT" && item.color, item.size !== "DEFAULT" && item.size]
                                .filter(Boolean)
                                .join(" / ")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-3">
                        {/* Quantity Selector Capsule */}
                        <div className="flex items-center gap-3 bg-[#f0edeb] rounded-full px-3 py-1">
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.quantity - 1,
                                item.size,
                                item.color,
                              )
                            }
                            className="text-textColor-variant hover:text-textColor font-extrabold text-xs px-0.5 active:scale-75 transition-transform border-none bg-transparent cursor-pointer"
                          >
                            −
                          </button>
                          <span className="text-xs font-bold text-textColor min-w-3 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.quantity + 1,
                                item.size,
                                item.color,
                              )
                            }
                            className="text-textColor-variant hover:text-textColor font-extrabold text-xs px-0.5 active:scale-75 transition-transform border-none bg-transparent cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Trash Delete button */}
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.product.id,
                              0,
                              item.size,
                              item.color,
                            )
                          }
                          className="p-1.5 rounded-full hover:bg-red-50 transition-colors border-none bg-transparent cursor-pointer text-red-500"
                          title="Xóa sản phẩm"
                        >
                          <TrashIcon className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Shop Voucher Section */}
        {selectedItems.length > 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-[#0e6877]/40 p-3.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-teal-50 text-[#0e6877] shrink-0">
                <TicketIcon className="w-4.5 h-4.5" strokeWidth={2} />
              </div>
              <div className="text-left min-w-0">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t("cart.shopVoucher")}</p>
                {selectedVoucher ? (
                  <p className="text-xs font-extrabold text-[#0e6877] truncate mt-0.5 flex items-center gap-1">
                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2.5} />
                    <span>{selectedVoucher.code}</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      ({selectedVoucher.type === 'PERCENT' ? `${t("cart.save")} ${selectedVoucher.value}%` : `${t("cart.save")} ${selectedVoucher.value.toLocaleString('vi-VN')}đ`})
                    </span>
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">{t("cart.noVoucherApplied")}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsVoucherModalOpen(true)}
              className="text-[10px] font-extrabold bg-teal-50 text-[#0e6877] hover:bg-[#0e6877] hover:text-white px-3.5 py-1.5 rounded-full border border-teal-100 cursor-pointer transition-all shrink-0 active:scale-95"
            >
              {selectedVoucher ? t("cart.change") : t("cart.select")}
            </button>
          </div>
        )}

        {/* Order Summary Section */}
        {selectedItems.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#f0edeb] p-4.5 space-y-3 shadow-xs">
            <h3 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-widest text-left">
              {t("cart.orderSummary")}
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>{t("cart.subtotal")} ({selectedItems.length})</span>
                <span className="font-bold text-slate-800">{subtotal.toLocaleString("vi-VN")} đ</span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>{t("cart.shipping")}</span>
                <span>
                  {shipping === 0 && subtotal > 0 ? (
                    <span className="text-emerald-600 font-bold">
                      {t("cart.freeship")}
                    </span>
                  ) : (
                    `${shipping.toLocaleString("vi-VN")} đ`
                  )}
                </span>
              </div>
              {voucherDiscount > 0 && (
                <div className="flex justify-between text-[#0e6877] font-bold">
                  <span>{t("cart.voucherDiscount")} ({selectedVoucher?.code})</span>
                  <span>−{voucherDiscount.toLocaleString("vi-VN")} đ</span>
                </div>
              )}
              <hr className="border-[#f0edeb] my-1" />
              <div className="flex justify-between font-bold text-slate-900 text-sm">
                <span>{t("cart.total")}</span>
                <span className="text-[#0e6877] text-base font-extrabold">
                  {total.toLocaleString("vi-VN")} đ
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cart Summary & Action footer - Fixed at bottom */}
      {selectedItems.length > 0 && (
        <div className="bg-white border-t border-[#f0edeb] px-5 py-4 flex-shrink-0 z-20 shadow-lg">
          <button
            onClick={handleProceedCheckout}
            className="w-full h-12 rounded-full text-xs font-black uppercase tracking-widest bg-[#0e6877] text-white hover:bg-[#0c5966] active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 border-none cursor-pointer"
          >
            <ShoppingBagIcon className="w-4 h-4" strokeWidth={2.2} />
            <span>{t("cart.checkout")} ({selectedItems.length})</span>
          </button>
        </div>
      )}

      {/* Cart Voucher Modal */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0 pb-2 border-b border-[#f5f3f0]">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <TagIcon className="w-4 h-4 text-[#0e6877]" strokeWidth={2} />
                {t("cart.selectVoucherModal")}
              </h3>
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors border-none bg-transparent cursor-pointer text-slate-500"
              >
                <XMarkIcon className="w-4.5 h-4.5" strokeWidth={2.2} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1 scrollbar-none">
              {vouchersList.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">{t("cart.noVouchersAvailable")}</div>
              ) : (
                vouchersList.map((v: any) => {
                  const isSelected = selectedVoucher?.code === v.code;
                  return (
                    <div
                      key={v.code}
                      onClick={() => handleSelectVoucher(isSelected ? null : v)}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-teal-50/80 border-[#0e6877]"
                          : "bg-white border-[#eeebe8] hover:border-teal-200"
                      }`}
                    >
                      <div>
                        <span className="font-black text-xs text-[#0e6877] tracking-wider font-mono">{v.code}</span>
                        <p className="text-[10.5px] font-bold text-slate-700 mt-0.5">
                          {v.type === 'PERCENT' ? `${t("cart.save")} ${v.value}%` : `${t("cart.save")} ${v.value.toLocaleString('vi-VN')}đ`}
                        </p>
                      </div>
                      <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${isSelected ? "bg-[#0e6877] text-white" : "bg-slate-100 text-slate-600"}`}>
                        {isSelected ? t("cart.selected") : t("cart.apply")}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Cart;
