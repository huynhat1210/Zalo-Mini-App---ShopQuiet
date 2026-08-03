import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Page } from "zmp-ui";
import { useCart } from "../../App";
import {
  apiRequest,
  calculateEstimatedDeliveryDate,
  trackAnalyticsEvent,
  useTranslation,
  safeParseImages,
} from "../../utils";
import {
  getProvinces,
  getDistricts,
  getWards,
  parseAddressComponents,
} from "../../constants/vietnam-locations";
import { Payment } from "zmp-sdk/apis";
import api from "zmp-sdk";
const PageCast = Page as any;
import { ICheckoutProps } from "./checkout.type";
import { ChevronLeft, MapPin, Ticket, Sparkles, Compass, X, ShieldCheck } from "lucide-react";

type CmsShippingMethod = {
  code: string;
  name: string;
  description?: string | null;
  price: number;
};

type CmsPaymentMethod = {
  code: string;
  name: string;
  description?: string | null;
  provider?: string | null;
  badge?: string | null;
};

const createCheckoutAddressSchema = (t: (key: any) => string) => z.object({
  name: z.string().trim().min(2, t("checkout.recipientName")),
  phone: z
    .string()
    .trim()
    .min(9, t("checkout.phoneNumber"))
    .regex(/^[0-9]{9,11}$/, t("checkout.phoneNumber")),
  houseNumber: z.string().trim().min(2, t("checkout.houseStreet")),
});

type CheckoutAddressFormValues = z.infer<ReturnType<typeof createCheckoutAddressSchema>>;

export const Checkout: React.FC<ICheckoutProps> = (_props) => {
  const { t } = useTranslation();
  const checkoutAddressSchema = createCheckoutAddressSchema(t);
  const {
    cart,
    removeFromCart,
    setActiveTab,
    showToast,
    zaloUser,
    buyNowItem,
    setBuyNowItem,
    setSelectedOrder,
    fetchNotifications,
  } = useCart();

  // If buyNowItem exists, checkout only that item (direct buy); otherwise use selected cart items
  const getCheckoutItems = () => {
    if (buyNowItem) return [buyNowItem];
    const stored = localStorage.getItem("checkout_items");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return cart;
      }
    }
    return cart;
  };

  const checkoutItems = getCheckoutItems();

  const clearPurchasedItems = () => {
    if (buyNowItem) {
      setBuyNowItem(null);
    } else {
      // Remove only checked items from cart
      checkoutItems.forEach((item: any) => {
        removeFromCart(item.product.id, item.size, item.color);
      });
      localStorage.removeItem("checkout_items");
      localStorage.removeItem("checkout_freeship");
    }
  };

  const [shippingMethod, setShippingMethod] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("pay2s");
  const [shippingMethods, setShippingMethods] = useState<CmsShippingMethod[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<CmsPaymentMethod[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isEnteringCustomAddress, setIsEnteringCustomAddress] = useState(false);

  // Promo code states
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    type: "percent" | "freeship" | "fixed";
    value: number;
    desc: string;
  } | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [vouchers, setVouchers] = useState<any[]>([]);

  // VietQR Payment Modal State
  const [vietQrModalData, setVietQrModalData] = useState<{
    qrUrl: string;
    bankId: string;
    accountNo: string;
    accountName: string;
    amount: number;
    transferContent: string;
    orderId: string;
    deepLinks?: {
      vcb?: string;
      mb?: string;
      tcb?: string;
      acb?: string;
      momo?: string;
      universal?: string;
    };
  } | null>(null);
  const [isCopiedNo, setIsCopiedNo] = useState(false);
  const [isCopiedContent, setIsCopiedContent] = useState(false);

  // Auto-listen to Order Payment Status via Polling while VietQR modal is open
  useEffect(() => {
    if (!vietQrModalData?.orderId) return;
    const interval = setInterval(async () => {
      try {
        const order = await apiRequest<any>(`/orders/${vietQrModalData.orderId}`);
        if (
          order &&
          (order.status === "PROCESSING" ||
            order.status === "COMPLETED" ||
            order.status === "SHIPPED")
        ) {
          setVietQrModalData(null);
          showToast(t("checkout.bankConfirmed"), "success");
          if (fetchNotifications) {
            fetchNotifications();
          }
          setActiveTab("order-success");
        }
      } catch (e) {}
    }, 3000);
    return () => clearInterval(interval);
  }, [vietQrModalData?.orderId]);

  // Tier benefits state
  const [tierBenefits, setTierBenefits] = useState<{
    tier: string;
    discountPercentage: number;
    freeShippingThreshold: number;
    pointsMultiplier: number;
  } | null>(null);

  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const list = await apiRequest<any[]>("/vouchers");
        setVouchers(list || []);
      } catch (e) {
        console.error("Failed to fetch vouchers:", e);
      }
    };
    fetchVouchers();
  }, []);

  useEffect(() => {
    const fetchTierBenefits = async () => {
      try {
        const benefits = await apiRequest<{
          tier: string;
          discountPercentage: number;
          freeShippingThreshold: number;
          pointsMultiplier: number;
        }>("/users/tier-benefits");
        setTierBenefits(benefits);
      } catch (e) {
        console.error("Failed to fetch tier benefits:", e);
      }
    };
    fetchTierBenefits();
  }, [zaloUser?.id]);

  useEffect(() => {
    async function fetchCmsCheckoutConfig() {
      try {
        const [cmsShippingMethods, cmsPaymentMethods] = await Promise.all([
          apiRequest<CmsShippingMethod[]>("/cms/shipping-methods"),
          apiRequest<CmsPaymentMethod[]>("/cms/payment-methods"),
        ]);

        if (cmsShippingMethods?.length) {
          setShippingMethods(cmsShippingMethods);
          setShippingMethod((current) =>
            cmsShippingMethods.some((item) => item.code === current)
              ? current
              : cmsShippingMethods[0].code,
          );
        }

        /* const defaultPay2s: CmsPaymentMethod = {
          code: "pay2s",
          name: "Chuyển khoản Ngân hàng",
          description: "Thanh toán an toàn qua mã QR Ngân hàng (Tự động xác nhận)",
          provider: "PAY2S",
          badge: "KHUYÊN DÙNG",
        };
        const defaultCod: CmsPaymentMethod = {
          code: "cod",
          name: "Thanh toán khi nhận hàng (COD)",
          description: "Nhận hàng, kiểm tra hàng trước khi thanh toán cho shipper",
          provider: "COD",
        };

        const mergedPaymentMethods = [defaultPay2s, defaultCod]; */

        // Labels, descriptions and ordering are maintained in CMS. Only the
        // two payment codes implemented by checkout are eligible here.
        const mergedPaymentMethods = (cmsPaymentMethods || []).filter(
          (item) => item.code === "pay2s" || item.code === "cod",
        );

        setPaymentMethods(mergedPaymentMethods);
        setPaymentMethod((current) =>
          mergedPaymentMethods.some((item) => item.code === current)
            ? current
            : mergedPaymentMethods[0]?.code || "pay2s",
        );
      } catch (e) {
        console.error("Failed to fetch checkout CMS config:", e);
      }
    }

    fetchCmsCheckoutConfig();
  }, []);

  const [address, setAddress] = useState({
    name: "",
    street: "",
    city: "",
    phone: "",
  });

  // Vietnam Administrative Location States for Checkout
  const provincesList = getProvinces();
  const [selectedProvince, setSelectedProvince] = useState<string>("TP. Hồ Chí Minh");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("Quận 1");
  const [selectedWard, setSelectedWard] = useState<string>("Phường Bến Nghé");

  const districtList = getDistricts(selectedProvince);
  const wardList = getWards(selectedProvince, selectedDistrict);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutAddressFormValues>({
    resolver: zodResolver(createCheckoutAddressSchema(t)),
    defaultValues: {
      name: "",
      phone: "",
      houseNumber: "",
    },
  });

  const watchedAddress = watch();

  // Shared helper: fetch phone from Zalo SDK and call onSuccess(phone)
  const fetchZaloPhoneNumber = async (
    onSuccess: (phone: string) => void,
    silentFail = false,
  ) => {
    const apiAny = api as any;
    const handleDecrypt = async (token: string) => {
      const res = await apiRequest<{ success: boolean; phone?: string }>(
        "/auth/decrypt-phone",
        "POST",
        {
          zaloId: zaloUser?.id || "guest",
          token,
        },
      );
      if (res.success && res.phone) {
        onSuccess(res.phone);
        return true;
      }
      return false;
    };

    if (apiAny && apiAny.getPhoneNumber) {
      apiAny.getPhoneNumber({
        success: async (data: any) => {
          const token = data.token;
          if (token) {
            try {
              const ok = await handleDecrypt(token);
              if (!ok && !silentFail)
                showToast(t("checkout.phoneDecryptError"), "warning");
            } catch (err) {
              console.error(err);
              if (!silentFail)
                showToast(t("checkout.phoneDecryptFail"), "warning");
            }
          }
        },
        fail: (error: any) => {
          // Zalo SDK failed - leave phone empty, user enters manually
          console.error("getPhoneNumber fail", error);
          if (!silentFail)
            showToast(
              t("checkout.phoneZaloError"),
              "warning",
            );
        },
      });
    }
    // No mock/browser fallback - only real Zalo SDK
  };

  // Auto-fetch phone when checkout opens and phone field is empty
  useEffect(() => {
    const currentPhone = watchedAddress.phone || "";
    if (!currentPhone) {
      fetchZaloPhoneNumber((phone) => {
        reset({ ...watchedAddress, phone });
      }, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Location feature
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const handleOpenLocationModal = () => {
    setIsLocationModalOpen(true);
  };

  const executeGpsFetch = async () => {
    const apiAny = api as any;
    setIsLoadingLocation(true);

    const processCoords = async (lat: number, lng: number) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`,
          { headers: { "User-Agent": "ShopQuiet-MiniApp/1.0" } },
        );
        const data = await res.json();
        const addr = data.address || {};
        const road = addr.road || addr.pedestrian || addr.footway || "";
        const houseNumber = addr.house_number || "";
        const street =
          [houseNumber, road].filter(Boolean).join(" ") ||
          addr.neighbourhood ||
          addr.suburb ||
          "";
        const city = addr.city || addr.town || addr.county || addr.state || "";

        if (city && provincesList.includes(city)) {
          setSelectedProvince(city);
        }

        reset({
          ...watchedAddress,
          houseNumber: street || watchedAddress.houseNumber,
        });
        showToast("✨ Đã định vị thành công địa chỉ giao hàng của bạn!", "success");
        setIsLocationModalOpen(false);
      } catch (err) {
        console.error(err);
        showToast("Không thể giải mã địa chỉ từ GPS. Vui lòng chọn Tỉnh/Thành thủ công.", "warning");
      } finally {
        setIsLoadingLocation(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => processCoords(pos.coords.latitude, pos.coords.longitude),
        (_err) => {
          if (apiAny && apiAny.getLocation) {
            apiAny.getLocation({
              success: (data: any) => {
                const lat = data.latitude ?? data.lat;
                const lng = data.longitude ?? data.lon ?? data.lng;
                if (lat != null && lng != null) {
                  processCoords(Number(lat), Number(lng));
                } else {
                  showToast("Không lấy được tọa độ vị trí. Vui lòng tự chọn Tỉnh/Thành phố.", "warning");
                  setIsLoadingLocation(false);
                }
              },
              fail: () => {
                showToast("Bạn chưa bật GPS trên điện thoại. Vui lòng thử lại.", "warning");
                setIsLoadingLocation(false);
              },
            });
          } else {
            showToast("Thiết bị chưa cấp quyền vị trí. Vui lòng chọn thủ công.", "warning");
            setIsLoadingLocation(false);
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
      );
    } else if (apiAny && apiAny.getLocation) {
      apiAny.getLocation({
        success: (data: any) => {
          const lat = data.latitude ?? data.lat;
          const lng = data.longitude ?? data.lon ?? data.lng;
          if (lat != null && lng != null) {
            processCoords(Number(lat), Number(lng));
          } else {
            showToast("Không lấy được tọa độ vị trí.", "warning");
            setIsLoadingLocation(false);
          }
        },
        fail: () => {
          showToast("Vui lòng bật định vị GPS để tự động lấy vị trí.", "warning");
          setIsLoadingLocation(false);
        },
      });
    } else {
      showToast("Trình duyệt không hỗ trợ định vị GPS.", "warning");
      setIsLoadingLocation(false);
    }
  };

  const decodeMojibakeText = (text: string | null | undefined) => {
    if (!text || typeof text !== "string") return text || "";
    try {
      return decodeURIComponent(escape(text));
    } catch {
      return text;
    }
  };

  const formatAddressText = (
    text: string | null | undefined,
    fallback = "",
  ) => {
    const fixed = decodeMojibakeText(text);
    const normalized = fixed.trim();
    if (
      !normalized ||
      normalized === "f" ||
      normalized === "F" ||
      normalized === "??"
    ) {
      return fallback;
    }
    return normalized;
  };

  const normalizeAddress = (addr: any) => ({
    ...addr,
    label: formatAddressText(addr.label),
    street: formatAddressText(addr.street),
    city: formatAddressText(addr.city),
    phone: formatAddressText(addr.phone),
  });

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const fetched = await apiRequest<any[]>("/addresses");
        const normalized = fetched.map(normalizeAddress);
        setAddresses(normalized);

        const active = normalized.find((a) => a.isDefault) || normalized[0];
        const nextAddress = active
          ? {
              name: zaloUser?.name || "",
              street: active.street,
              city: active.city,
              phone: active.phone,
            }
          : {
              name: zaloUser?.name || "",
              street: "",
              city: "",
              phone: "",
            };

        setAddress(nextAddress);
        const parsed = parseAddressComponents(nextAddress.street, nextAddress.city);
        if (parsed.city && provincesList.includes(parsed.city)) {
          setSelectedProvince(parsed.city);
        }
        if (parsed.district) setSelectedDistrict(parsed.district);
        if (parsed.ward) setSelectedWard(parsed.ward);

        reset({
          name: nextAddress.name,
          phone: nextAddress.phone,
          houseNumber: parsed.houseNumber || nextAddress.street,
        });
      } catch (e) {
        console.error("Failed to load checkout addresses:", e);
      }
    };
    fetchAddresses();
  }, [zaloUser?.id, isSelectorOpen, reset]);

  useEffect(() => {
    const compiledStreet = watchedAddress.houseNumber
      ? `${watchedAddress.houseNumber}, ${selectedWard}, ${selectedDistrict}`
      : address.street;

    setAddress((current) => {
      const name = watchedAddress.name ?? current.name;
      const phone = watchedAddress.phone ?? current.phone;
      const street = compiledStreet;
      const city = selectedProvince;

      if (
        current.name === name &&
        current.street === street &&
        current.city === city &&
        current.phone === phone
      ) {
        return current;
      }
      return { name, street, city, phone };
    });
  }, [
    watchedAddress.houseNumber,
    watchedAddress.name,
    watchedAddress.phone,
    selectedProvince,
    selectedDistrict,
    selectedWard,
  ]);

  const subtotal = checkoutItems.reduce(
    (sum: number, item: any) => sum + item.product.price * item.quantity,
    0,
  );

  // Calculate discount and shipping based on tier benefits
  const freeShippingThreshold = tierBenefits?.freeShippingThreshold || 300000;
  const isStandardShipping = shippingMethod === "standard";
  const isFreeshipEligible = isStandardShipping && subtotal >= freeShippingThreshold;
  const selectedShippingMethod = shippingMethods.find(
    (item) => item.code === shippingMethod,
  );
  let shippingCost = isFreeshipEligible
    ? 0
    : selectedShippingMethod?.price || 0;
  const [usePoints, setUsePoints] = useState(false);
  const [userCoins, setUserCoins] = useState(0);

  useEffect(() => {
    const fetchUserCoins = async () => {
      if (!zaloUser?.id) return;
      try {
        const res = await apiRequest<any>("/users/profile");
        if (res && res.gamificationPoints != null) {
          setUserCoins(Math.round(res.gamificationPoints));
        }
      } catch (e) {
        console.error("Failed to fetch user coins:", e);
      }
    };
    fetchUserCoins();
  }, [zaloUser?.id]);

  let discount = 0;

  // Apply tier discount percentage
  if (tierBenefits?.discountPercentage && tierBenefits.discountPercentage > 0) {
    discount = subtotal * (tierBenefits.discountPercentage / 100);
  }

  if (appliedPromo) {
    if (appliedPromo.type === "percent") {
      discount = subtotal * (appliedPromo.value / 100);
    } else if (appliedPromo.type === "fixed") {
      discount = appliedPromo.value;
    } else if (appliedPromo.type === "freeship") {
      const maxFreeshipValue =
        appliedPromo.value && appliedPromo.value > 0
          ? appliedPromo.value
          : shippingCost;
      discount = Math.min(shippingCost, maxFreeshipValue);
    }
  }

  const amountBeforeCoins = Math.max(0, subtotal + shippingCost - discount);
  const coinDiscount = usePoints ? Math.min(userCoins, amountBeforeCoins) : 0;
  const total = Math.max(0, amountBeforeCoins - coinDiscount);

  const applyPromoCode = async (code: string) => {
    try {
      const res = await apiRequest<any>("/vouchers/apply", "POST", {
        code,
        orderTotal: subtotal,
        zaloUserId: zaloUser?.id,
      });
      if (res && res.code) {
        let desc = "";
        if (res.type === "PERCENT") {
          desc = t("checkout.voucherSavePercent").replace("%1%", String(res.value));
        } else if (res.type === "FIXED") {
          desc = t("checkout.voucherSaveFixed").replace("%1%", res.value.toLocaleString("vi-VN"));
        } else if (res.type === "FREESHIP") {
          desc = t("checkout.voucherFreeship").replace("%1%", res.value.toLocaleString("vi-VN"));
        }
        setAppliedPromo({
          code: res.code,
          type: res.type.toLowerCase(),
          value: res.value,
          desc,
        });
        showToast(`${t("cart.applied")} ${res.code}`, "success");
      }
    } catch (err: any) {
      const msg = err?.message || t("checkout.promoRequired");
      showToast(msg, "warning");
    }
  };

  const handleApplyPromo = () => {
    if (!promoInput) {
      showToast(t("checkout.promoRequired"), "warning");
      return;
    }
    applyPromoCode(promoInput);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    showToast(t("checkout.promoRemoved"), "info");
  };

  const handlePlaceOrder = async () => {
    if (checkoutItems.length === 0) {
      showToast(t("checkout.cartEmpty"), "warning");
      return;
    }

    if (
      !address.name.trim() ||
      !address.phone.trim() ||
      !address.street.trim() ||
      !address.city.trim()
    ) {
      showToast(t("checkout.fillDelivery"), "warning");
      return;
    }

    try {
      // Auto-save custom address if it's the first one or user explicitly typed a new one
      if (addresses.length === 0 || isEnteringCustomAddress) {
        try {
          await apiRequest("/addresses", "POST", {
            label: addresses.length === 0 ? t("checkout.selectDeliveryAddress") : t("checkout.addNewAddress"),
            phone: address.phone.trim(),
            street: address.street.trim(),
            city: address.city.trim(),
            isDefault: addresses.length === 0,
          });
        } catch (addrErr) {
          console.error(
            "Failed to auto-save custom address to database:",
            addrErr,
          );
        }
      }
      const orderData = {
        totalAmount: total,
        paymentMethod: paymentMethod.toUpperCase(),
        voucherCode: appliedPromo ? appliedPromo.code : null,
        discountAmount: discount,
        shippingAddress: `${address.street}, ${address.city}`,
        shippingPhone: address.phone.trim(),
        shippingName: address.name.trim(),
        shippingMethodCode: shippingMethod,
        usePoints: usePoints && coinDiscount > 0,
        items: checkoutItems.map((item: any) => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
          size: item.size || "DEFAULT",
          color: item.color || "DEFAULT",
        })),
        isDirectBuy: !!buyNowItem,
      };

      let createdOrder: any;
      let orderNumber: string;

      if (paymentMethod === "pay2s") {
        // 1. Create order in DB with PENDING_PAYMENT status
        const createdDbOrder = await apiRequest<any>("/orders", "POST", {
          ...orderData,
          status: "PENDING_PAYMENT",
          paymentMethod: "PAY2S",
        });
        orderNumber = createdDbOrder.id;
        createdOrder = createdDbOrder;

        // 2. Fetch Pay2S payment URL from backend
        try {
          showToast(t("checkout.paymentConnecting"), "info");
          const pay2sRes = await apiRequest<any>(
            `/orders/${createdDbOrder.id}/pay2s`,
            "POST",
          );

          if (pay2sRes && pay2sRes.payUrl) {
            // Open Pay2S gateway URL
            if (typeof api !== "undefined" && (api as any).openWebview) {
              (api as any).openWebview({ url: pay2sRes.payUrl });
            } else if (typeof window !== "undefined") {
              window.open(pay2sRes.payUrl, "_blank");
            }
          }
        } catch (pay2sErr) {
          console.error("Failed to generate Pay2S link:", pay2sErr);
        }

        clearPurchasedItems();
        setSelectedOrder(createdOrder);
        if (fetchNotifications) fetchNotifications();
        setActiveTab("order-detail");
        return;
      } else {
        // Cash on delivery
        const codOrder = await apiRequest<any>("/orders", "POST", orderData);
        orderNumber = codOrder.id;
        createdOrder = {
          id: codOrder.id,
          totalAmount: codOrder.totalAmount,
          status: codOrder.status,
          createdAt: codOrder.createdAt,
          paymentMethod: "COD",
          voucherCode: codOrder.voucherCode,
          discountAmount: codOrder.discountAmount,
          shippingAddress: codOrder.shippingAddress,
          shippingPhone: codOrder.shippingPhone,
          shippingName: codOrder.shippingName,
          items: codOrder.items.map((item: any) => ({
            quantity: item.quantity,
            price: item.price,
            product: { name: item.product.name },
            size: item.size || "DEFAULT",
            color: item.color || "DEFAULT",
          })),
        };
      }

      const userId = zaloUser?.id || "cust-zalo-id-1";
      const offlineOrders = JSON.parse(
        localStorage.getItem(`offline_orders_${userId}`) || "[]",
      );
      localStorage.setItem(
        `offline_orders_${userId}`,
        JSON.stringify([createdOrder, ...offlineOrders]),
      );

      // Track purchase event
      if (zaloUser?.id) {
        trackAnalyticsEvent(zaloUser.id, "purchase", undefined, undefined, {
          orderId: orderNumber,
          totalAmount: total,
          itemsCount: checkoutItems.reduce(
            (sum: number, item: any) => sum + item.quantity,
            0,
          ),
        });
      }

      // Calculate estimated delivery date for display
      const deliveryRange = calculateEstimatedDeliveryDate(
        new Date(),
        shippingMethod,
      );

      localStorage.setItem(
        "last_success_order",
        JSON.stringify({
          orderNumber,
          total,
          itemsCount: checkoutItems.reduce(
            (sum: number, item: any) => sum + item.quantity,
            0,
          ),
          items: checkoutItems.map((item: any) => ({
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            images: item.product.images,
            size: item.size || "DEFAULT",
            color: item.color || "DEFAULT",
          })),
          estimatedDeliveryDate: deliveryRange.displayText,
          shippingMethodCode: shippingMethod,
        }),
      );

      // Clear only what was ordered
      clearPurchasedItems();
      showToast(t("checkout.orderSuccess").replace("%1%", orderNumber), "success");
      if (fetchNotifications) {
        fetchNotifications();
      }
      setActiveTab("order-success");
    } catch (error: any) {
      console.error(error);
      const msg = error?.message || t("checkout.orderError");
      showToast(msg, "warning");
    }
  };

  return (
    <PageCast className="bg-surface  text-slate-900  relative flex flex-col w-full h-full overscroll-none scrollbar-none animate-fade-in">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-[#f0edeb] sticky top-0 z-30 shadow-xs">
        <button
          onClick={() => setActiveTab("home")}
          className="p-1.5 hover:bg-[#f0edeb] rounded-full transition-colors active:scale-95 border-none bg-transparent cursor-pointer"
        >
          <ChevronLeft className="w-5.5 h-5.5 text-textColor" />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-textColor">
          {t("checkout.title")}
        </span>
        <div className="w-8"></div>
      </div>

      <div className="flex-1 pb-32 px-6 py-5.5 space-y-5">
        {/* Step Indicator */}
        <div className="bg-white rounded-2xl border border-[#f0edeb] p-4 flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-textColor-variant shadow-xs">
          <div className="flex items-center gap-2 text-primary">
            <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[9px]">
              1
            </span>
            <span>{t("checkout.stepShipping")}</span>
          </div>
          <div className="w-8 h-[1px] bg-[#f0edeb]"></div>
          <div className="flex items-center gap-2 text-textColor/35">
            <span className="w-5 h-5 rounded-full bg-[#f0edeb] text-textColor/35 flex items-center justify-center text-[9px]">
              2
            </span>
            <span>{t("checkout.stepPayment")}</span>
          </div>
          <div className="w-8 h-[1px] bg-[#f0edeb]"></div>
          <div className="flex items-center gap-2 text-textColor/35">
            <span className="w-5 h-5 rounded-full bg-[#f0edeb] text-textColor/35 flex items-center justify-center text-[9px]">
              3
            </span>
            <span>{t("checkout.stepConfirm")}</span>
          </div>
        </div>

        {/* Shipping Address Section */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#526069]/70">
              {t("checkout.deliveryAddress")}
            </h2>
            {!isEnteringCustomAddress && addresses.length > 0 && (
              <button
                onClick={() => {
                  setAddress({
                    name: zaloUser?.name || "",
                    street: "",
                    city: "",
                    phone: "",
                  });
                  setIsEnteringCustomAddress(true);
                }}
                className="text-[10px] text-primary font-bold hover:underline bg-transparent border-none cursor-pointer"
              >
                {t("checkout.addNewAddress")}
              </button>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-[#f0edeb] p-4.5 shadow-xs relative text-left">
            {!isEnteringCustomAddress && addresses.length > 0 ? (
              <div className="flex justify-between items-start animate-fade-in">
                <div className="text-xs text-textColor space-y-1.5">
                  <p className="font-semibold">
                    {formatAddressText(address.name, "Recipient")}
                  </p>
                  <p className="text-textColor-variant leading-relaxed">
                    {formatAddressText(address.street, "")}
                  </p>
                  <p className="text-textColor-variant">
                    {formatAddressText(address.city, "")}
                  </p>
                  <p className="text-textColor-variant/80 font-bold">
                    {t("checkout.phone")} {formatAddressText(address.phone, "")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => setIsSelectorOpen(true)}
                    className="text-xs text-primary font-bold hover:underline border-none bg-transparent cursor-pointer"
                  >
                    {t("checkout.changeAddress")}
                  </button>
                  <button
                    onClick={() => {
                      const parsed = parseAddressComponents(address.street, address.city);
                      if (parsed.city && provincesList.includes(parsed.city)) {
                        setSelectedProvince(parsed.city);
                      }
                      if (parsed.district) setSelectedDistrict(parsed.district);
                      if (parsed.ward) setSelectedWard(parsed.ward);

                      reset({
                        name: address.name,
                        phone: address.phone,
                        houseNumber: parsed.houseNumber || address.street,
                      });
                      setIsEnteringCustomAddress(true);
                    }}
                    className="text-xs text-[#526069] font-bold hover:underline border-none bg-transparent cursor-pointer"
                  >
                    {t("checkout.editAddress")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 animate-fade-in text-left">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[9px] text-red-500 font-bold uppercase tracking-wider">
                    {t("checkout.selectAddress")}
                  </p>
                  {addresses.length > 0 && (
                    <button
                      onClick={() => {
                        const active =
                          addresses.find((a) => a.isDefault) || addresses[0];
                        setAddress({
                          name: zaloUser?.name || "",
                          street: active.street,
                          city: active.city,
                          phone: active.phone,
                        });
                        setIsEnteringCustomAddress(false);
                      }}
                      className="text-[9px] text-[#526069] font-bold hover:underline bg-transparent border-none cursor-pointer"
                    >
                      {t("checkout.cancelSelectAddress")}
                    </button>
                  )}
                </div>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[9px] font-bold text-[#526069] uppercase tracking-wider block mb-1">
                      {t("checkout.recipientName")}
                    </label>
                    <input
                      type="text"
                      placeholder={t("checkout.recipientName")}
                      {...register("name")}
                      onChange={(e) => {
                        register("name").onChange(e);
                        setAddress((prev) => ({ ...prev, name: e.target.value }));
                      }}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#f0edeb] bg-[#fbf9f7] text-textColor font-semibold focus:border-primary focus:outline-none"
                    />
                    {errors.name && (
                      <p className="mt-1 text-[10px] text-red-500">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[#526069] uppercase tracking-wider block mb-1">
                      {t("checkout.phoneNumber")}
                    </label>
                    <input
                      type="text"
                      placeholder={t("checkout.phoneNumber")}
                      {...register("phone")}
                      onChange={(e) => {
                        register("phone").onChange(e);
                        setAddress((prev) => ({ ...prev, phone: e.target.value }));
                      }}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#f0edeb] bg-[#fbf9f7] text-textColor font-semibold focus:border-primary focus:outline-none"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-[10px] text-red-500">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>

                  {/* Vietnam Administrative Location Dropdowns */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-[9px] font-bold text-[#526069] uppercase tracking-wider block mb-1">
                        {t("checkout.provinceCity")}
                      </label>
                      <select
                        value={selectedProvince}
                        onChange={(e) => {
                          const newProv = e.target.value;
                          setSelectedProvince(newProv);
                          const dists = getDistricts(newProv);
                          const newDist = dists[0] || "";
                          setSelectedDistrict(newDist);
                          const wards = getWards(newProv, newDist);
                          const newWard = wards[0] || "";
                          setSelectedWard(newWard);

                          const hNum = watchedAddress.houseNumber || "";
                          setAddress((prev) => ({
                            ...prev,
                            street: `${hNum}, ${newWard}, ${newDist}`,
                            city: newProv,
                          }));
                        }}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-[#f0edeb] bg-white text-textColor font-semibold focus:border-primary focus:outline-none cursor-pointer"
                      >
                        {provincesList.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-[#526069] uppercase tracking-wider block mb-1">
                        {t("checkout.district")}
                      </label>
                      <select
                        value={selectedDistrict}
                        onChange={(e) => {
                          const newDist = e.target.value;
                          setSelectedDistrict(newDist);
                          const wards = getWards(selectedProvince, newDist);
                          const newWard = wards[0] || "";
                          setSelectedWard(newWard);

                          const hNum = watchedAddress.houseNumber || "";
                          setAddress((prev) => ({
                            ...prev,
                            street: `${hNum}, ${newWard}, ${newDist}`,
                            city: selectedProvince,
                          }));
                        }}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-[#f0edeb] bg-white text-textColor font-semibold focus:border-primary focus:outline-none cursor-pointer"
                      >
                        {districtList.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-[#526069] uppercase tracking-wider block mb-1">
                        {t("checkout.ward")}
                      </label>
                      <select
                        value={selectedWard}
                        onChange={(e) => {
                          const newWard = e.target.value;
                          setSelectedWard(newWard);
                          const hNum = watchedAddress.houseNumber || "";
                          setAddress((prev) => ({
                            ...prev,
                            street: `${hNum}, ${newWard}, ${selectedDistrict}`,
                            city: selectedProvince,
                          }));
                        }}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-[#f0edeb] bg-white text-textColor font-semibold focus:border-primary focus:outline-none cursor-pointer"
                      >
                        {wardList.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[#526069] uppercase tracking-wider block mb-1">
                      {t("checkout.houseStreet")}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t("checkout.houseStreetPlaceholder")}
                        {...register("houseNumber")}
                        onChange={(e) => {
                          register("houseNumber").onChange(e);
                          const hNum = e.target.value;
                          setAddress((prev) => ({
                            ...prev,
                            street: `${hNum}, ${selectedWard}, ${selectedDistrict}`,
                            city: selectedProvince,
                          }));
                        }}
                        className="w-full text-xs px-3.5 py-2.5 pr-24 rounded-xl border border-[#f0edeb] bg-[#fbf9f7] text-textColor font-semibold focus:border-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleOpenLocationModal}
                        disabled={isLoadingLocation}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 bg-[#f0edeb] text-[#526069] text-[8px] font-extrabold uppercase tracking-wider rounded-lg border-none cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
                      >
                        {isLoadingLocation ? (
                          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block" />
                        ) : (
                          <MapPin className="w-2.5 h-2.5" />
                        )}
                        {t("checkout.locationBtn")}
                      </button>
                    </div>
                    {errors.houseNumber && (
                      <p className="mt-1 text-[10px] text-red-500">
                        {errors.houseNumber.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Shipping Method Section */}
        <div className="space-y-2.5">
          <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#526069]/70 px-1">
            {t("checkout.shippingMethod")}
          </h2>
          <div className="bg-white rounded-2xl border border-[#f0edeb] p-1 shadow-xs divide-y divide-[#f0edeb]">
            {shippingMethods.map((method, index) => {
              const deliveryRange = calculateEstimatedDeliveryDate(
                new Date(),
                method.code,
              );
              return (
                <label
                  key={method.code}
                  className={`flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-50 transition-colors ${index === 0 ? "rounded-t-2xl" : ""} ${index === shippingMethods.length - 1 ? "rounded-b-2xl" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      className="w-4.5 h-4.5 text-primary accent-primary"
                      checked={shippingMethod === method.code}
                      onChange={() => setShippingMethod(method.code)}
                    />
                    <div className="text-xs">
                      <p className="font-semibold text-textColor">
                        {method.name}
                      </p>
                      <p className="text-[10px] text-primary font-medium mt-0.5">
                        {t("checkout.estimated")} {deliveryRange.displayText}
                      </p>
                      {method.description && (
                        <p className="text-[10px] text-textColor-variant mt-0.5">
                          {method.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-textColor">
                    {method.price > 0
                      ? `${method.price.toLocaleString("vi-VN")} đ`
                      : t("checkout.free")}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Payment Method Section */}
        <div className="space-y-2.5">
          <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#526069]/70 px-1">
            {t("checkout.paymentMethod")}
          </h2>
          <div className="bg-white rounded-2xl border border-[#f0edeb] p-1 shadow-xs divide-y divide-[#f0edeb]">
            {paymentMethods.map((method, index) => (
              <label
                key={method.code}
                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-neutral-50 transition-colors ${index === 0 ? "rounded-t-2xl" : ""} ${index === paymentMethods.length - 1 ? "rounded-b-2xl" : ""}`}
              >
                <input
                  type="radio"
                  name="payment"
                  className="w-4.5 h-4.5 text-primary accent-primary"
                  checked={paymentMethod === method.code}
                  onChange={() => setPaymentMethod(method.code)}
                />
                <div className="text-xs">
                  <p className="font-semibold text-textColor flex items-center gap-1.5">
                    {method.badge && (
                      <span className="bg-[#007aff] text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                        {method.badge}
                      </span>
                    )}
                    {method.name}
                  </p>
                  {method.description && (
                    <p className="text-[10px] text-textColor-variant mt-0.5">
                      {method.description}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Promo Code Section */}
        <div className="space-y-2.5">
          <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#526069]/70 px-1">
            {t("checkout.promoCode")}
          </h2>
          <div className="bg-white rounded-2xl border border-[#f0edeb] p-4.5 shadow-xs space-y-3.5">
            <div className="flex gap-2.5">
              <input
                type="text"
                placeholder={t("checkout.promoCodePlaceholder")}
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                className="flex-1 text-xs px-4 py-2.5 bg-neutral-50 rounded-xl border border-[#eae8e6] text-textColor focus:outline-none focus:border-primary focus:bg-white transition-all uppercase"
              />
              <button
                onClick={handleApplyPromo}
                className="h-10 px-5 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer active:scale-95 hover:bg-primary-dark transition-all"
              >
                {t("checkout.applyBtn")}
              </button>
            </div>

            {appliedPromo && (
              <div className="flex justify-between items-center bg-[#e8f5e9] text-[#2e7d32] px-3.5 py-2.5 rounded-xl text-xs font-bold animate-scale-up">
                <span className="truncate mr-2">
                  {t("checkout.codeApplied")} {appliedPromo.code} ({appliedPromo.desc})
                </span>
                <button
                  onClick={handleRemovePromo}
                  className="text-red-500 hover:text-red-700 bg-transparent border-none font-bold text-xs cursor-pointer flex-shrink-0 whitespace-nowrap ml-1"
                >
                  {t("checkout.removePromoBtn")}
                </button>
              </div>
            )}

            <div className="pt-1.5">
              <button
                onClick={() => setIsVoucherModalOpen(true)}
                className="w-full h-10 bg-[#e0f2f1]/60 hover:bg-[#e0f2f1] text-primary font-bold text-xs uppercase tracking-wider rounded-xl border border-primary/20 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Ticket className="w-4 h-4 text-primary" />
                {t("checkout.selectVoucherBtn")}
              </button>
            </div>
          </div>
        </div>

        {/* Use Xu Coins Payment Section (1 Xu = 1 VNĐ) */}
        <div className="space-y-2.5">
          <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#526069]/70 px-1 flex items-center justify-between">
            <span>{t("checkout.useXu")}</span>
            <span className="text-amber-600 font-black">{t("checkout.xuRate")}</span>
          </h2>
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 rounded-2xl border border-amber-200 p-4 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-400 text-teal-950 flex items-center justify-center font-black text-sm shadow-xs border border-amber-300">
                💰
              </div>
              <div>
                <p className="text-xs font-extrabold text-textColor">
                  {t("checkout.xuBalance")} <span className="text-amber-600 font-black">{userCoins.toLocaleString("vi-VN")} Xu</span>
                </p>
                <p className="text-[10px] text-[#526069] font-medium mt-0.5">
                  {userCoins > 0
                    ? `${t("checkout.xuSave")} ${Math.min(userCoins, amountBeforeCoins).toLocaleString("vi-VN")}đ`
                    : t("checkout.xuEmpty")}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={usePoints}
                disabled={userCoins <= 0}
                onChange={(e) => setUsePoints(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 peer-disabled:opacity-50"></div>
            </label>
          </div>
        </div>

        {/* IOrder Review Section */}
        <div className="space-y-2.5">
          <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#526069]/70 px-1">
            {t("checkout.orderSummary")}
          </h2>
          <div className="bg-white rounded-2xl border border-[#f0edeb] p-4.5 shadow-xs divide-y divide-[#f0edeb] space-y-3">
            <div className="space-y-3.5">
              {checkoutItems.map((item: any) => {
                const img = safeParseImages(item.product.images)[0];

                const selectedSize =
                  item.size && item.size !== "DEFAULT" ? item.size : null;
                const selectedColor =
                  item.color && item.color !== "DEFAULT" ? item.color : null;

                return (
                  <div
                    key={`${item.product.id}-${item.color || "DEFAULT"}-${item.size || "DEFAULT"}`}
                    className="flex justify-between items-center gap-3 py-3.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={img}
                        alt={item.product.name}
                        className="w-11 h-11 object-cover rounded-lg border border-[#f0edeb]"
                      />
                      <div className="text-xs min-w-0">
                        <p className="font-semibold text-textColor line-clamp-1 max-w-[160px]">
                          {item.product.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-textColor-variant flex-wrap">
                          <span>{t("checkout.qty")} {item.quantity}</span>
                          {selectedSize && (
                            <>
                              <span className="text-[#d8d2ce]">|</span>
                              <span className="font-bold text-[#526069]">
                                {t("checkout.size")} {selectedSize}
                              </span>
                            </>
                          )}
                          {selectedColor && (
                            <>
                              <span className="text-[#d8d2ce]">|</span>
                              <span className="font-bold text-[#526069]">
                                {t("checkout.color")} {selectedColor}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-textColor flex-shrink-0">
                      {(item.product.price * item.quantity).toLocaleString(
                        "vi-VN",
                      )}{" "}
                      đ
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Invoice billing breakdown */}
            <div className="pt-3.5 space-y-2 text-xs">
              <div className="flex justify-between text-textColor-variant">
                <span>{t("checkout.subtotal")}</span>
                <span>{subtotal.toLocaleString("vi-VN")} đ</span>
              </div>
              <div className="flex justify-between text-textColor-variant">
                <span>{t("checkout.shippingFee")}</span>
                <span>
                  {shippingCost > 0
                    ? `${shippingCost.toLocaleString("vi-VN")} đ`
                    : t("checkout.free")}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#2e7d32] font-semibold animate-fade-in">
                  <span>
                    {t("checkout.discount")} {appliedPromo ? `(${appliedPromo.code})` : ""}
                  </span>
                  <span>-{discount.toLocaleString("vi-VN")} đ</span>
                </div>
              )}
              {coinDiscount > 0 && (
                <div className="flex justify-between text-amber-600 font-bold animate-fade-in">
                  <span>{t("checkout.xuDeduction")} ({coinDiscount.toLocaleString("vi-VN")} Xu)</span>
                  <span>-{coinDiscount.toLocaleString("vi-VN")} đ</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-textColor pt-2.5 border-t border-dashed border-[#f0edeb]">
                <span>{t("checkout.total")}</span>
                <span className="text-primary">
                  {total.toLocaleString("vi-VN")} đ
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-[80px] bg-white border-t border-[#f0edeb] flex justify-between items-center px-4.5 z-40 shadow-lg">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-textColor-variant uppercase tracking-wider">
            {t("checkout.total")}
          </span>
          <span className="text-lg font-extrabold text-textColor">
            {total.toLocaleString("vi-VN")} đ
          </span>
        </div>

        <button
          onClick={handleSubmit(() => void handlePlaceOrder())}
          className="h-11 px-8 bg-primary hover:bg-primary-dark text-white font-bold text-xs uppercase tracking-widest rounded-full shadow-md active:scale-95 transition-all"
        >
          {t("checkout.placeOrder")}
        </button>
      </div>

      {/* Address Selector Modal */}
      {isSelectorOpen && (
        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up">
            <h3 className="text-xs font-bold text-textColor uppercase tracking-wider">
              {t("checkout.selectDeliveryAddress")}
            </h3>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {addresses.map((addr) => {
                const isSelected =
                  address.street === addr.street && address.city === addr.city;
                return (
                  <div
                    key={addr.id}
                    onClick={() => {
                      const userId = zaloUser?.id || "cust-zalo-id-1";
                      setAddress({
                        name: address.name,
                        street: addr.street,
                        city: addr.city,
                        phone: addr.phone,
                      });
                      localStorage.setItem(
                        `shipping_address_${userId}`,
                        JSON.stringify({
                          name: address.name,
                          street: addr.street,
                          city: addr.city,
                          phone: addr.phone,
                        }),
                      );
                      localStorage.setItem(
                        `shipping_address_active_id_${userId}`,
                        addr.id.toString(),
                      );
                      setIsSelectorOpen(false);
                      showToast(t("checkout.addressSelected"), "success");
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex justify-between items-start text-left ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-[#f0edeb] bg-white hover:bg-neutral-50"
                    }`}
                  >
                    <div className="text-xs space-y-1">
                      <span className="font-extrabold text-textColor">
                        {formatAddressText(addr.label, "Address")}
                      </span>
                      <p className="text-textColor-variant leading-relaxed">
                        {formatAddressText(addr.street, "Invalid address")}
                        , {formatAddressText(addr.city, "")}
                      </p>
                      <p className="text-textColor-variant/80 font-bold mt-0.5">
                        {t("checkout.phone")} {formatAddressText(addr.phone, "Unknown")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsSelectorOpen(false);
                  setActiveTab("profile");
                  showToast(t("checkout.navigatingAddresses"), "info");
                }}
                className="flex-1 h-10 border border-dashed border-primary/40 text-primary font-bold text-xs uppercase tracking-wider rounded-xl bg-transparent cursor-pointer hover:bg-primary/5 transition-all"
              >
                {t("checkout.manageAddresses")}
              </button>
              <button
                onClick={() => setIsSelectorOpen(false)}
                className="h-10 px-4 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voucher Selector Modal */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center pb-2 border-b border-[#f0edeb]">
              <h3 className="text-xs font-bold text-textColor uppercase tracking-wider">
                {t("checkout.yourVoucherStore")}
              </h3>
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="text-[#526069] hover:text-black font-extrabold text-sm border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1 py-1">
              {vouchers.map((voucher) => {
                const isExpired =
                  voucher.expiresAt && new Date(voucher.expiresAt) < new Date();
                const isOutOfStock = voucher.stock <= 0;
                const isBelowMinVal = subtotal < voucher.minOrderVal;

                const isEligible =
                  !isExpired && !isOutOfStock && !isBelowMinVal;
                const isSelected = appliedPromo?.code === voucher.code;

                let voucherDesc = "";
                if (voucher.type === "PERCENT") {
                  voucherDesc = t("checkout.voucherSavePercent").replace("%1%", String(voucher.value));
                } else if (voucher.type === "FIXED") {
                  voucherDesc = t("checkout.voucherSaveFixed").replace("%1%", voucher.value.toLocaleString("vi-VN"));
                } else if (voucher.type === "FREESHIP") {
                  voucherDesc = t("checkout.voucherFreeship").replace("%1%", voucher.value.toLocaleString("vi-VN"));
                }

                return (
                  <div
                    key={voucher.code}
                    onClick={() => {
                      if (!isEligible) return;
                      if (isSelected) {
                        handleRemovePromo();
                      } else {
                        applyPromoCode(voucher.code);
                      }
                      setIsVoucherModalOpen(false);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 relative text-left ${
                      isEligible
                        ? isSelected
                          ? "border-primary bg-primary/5 cursor-pointer shadow-xs"
                          : "border-[#f0edeb] bg-white hover:bg-neutral-50 cursor-pointer"
                        : "border-[#eae8e6] bg-[#fbf9f7] opacity-65 cursor-not-allowed"
                    }`}
                  >
                    {/* Circle radio box (chấm tròn) */}
                    <div className="flex-shrink-0">
                      <div
                        className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${
                          isEligible
                            ? isSelected
                              ? "border-primary bg-primary"
                              : "border-neutral-300 bg-white"
                            : "border-neutral-200 bg-neutral-100 cursor-not-allowed"
                        }`}
                      >
                        {isSelected && isEligible && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white animate-scale-up" />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wide ${isEligible ? "text-primary" : "text-[#a8a19d]"}`}
                        >
                          {voucher.code}
                        </span>
                        {isOutOfStock && (
                          <span className="text-[7.5px] font-extrabold bg-red-50 text-red-600 border border-red-100 px-1 py-0.5 rounded">
                            {t("checkout.outOfStock")}
                          </span>
                        )}
                        {isExpired && (
                          <span className="text-[7.5px] font-extrabold bg-amber-50 text-amber-600 border border-amber-100 px-1 py-0.5 rounded">
                            {t("checkout.expired")}
                          </span>
                        )}
                        {isBelowMinVal && !isExpired && !isOutOfStock && (
                          <span className="text-[7.5px] font-extrabold bg-[#eae8e6] text-[#8e8580] px-1 py-0.5 rounded">
                            {t("checkout.minOrder")} {voucher.minOrderVal.toLocaleString("vi-VN")}đ
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[10.5px] font-semibold mt-1 leading-snug ${isEligible ? "text-textColor" : "text-[#a8a19d]"}`}
                      >
                        {voucherDesc}
                      </p>

                      <div className="flex justify-between items-center mt-2 text-[8.5px] text-textColor-variant">
                        <span>{t("checkout.remaining")} {voucher.stock}</span>
                        {voucher.expiresAt && (
                          <span>
                            {t("checkout.exp")}{" "}
                            {new Date(voucher.expiresAt).toLocaleDateString(
                              "vi-VN",
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {vouchers.length === 0 && (
                <div className="text-center py-8 text-xs text-textColor-variant">
                  {t("checkout.noVouchers")}
                </div>
              )}
            </div>

            <button
              onClick={() => setIsVoucherModalOpen(false)}
              className="w-full h-10 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200 mt-2 flex-shrink-0"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}

      {/* Premium Location Permission & GPS Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div
            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-scale-up text-center p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsLocationModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors border-none cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Icon with Glowing Radar Rings */}
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 bg-teal-500/20 rounded-full animate-ping" />
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/30">
                <Compass className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 px-3 py-1 rounded-full border border-teal-200/50">
                📍 Tự Động Định Vị Giao Hàng
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight pt-1">
                Lấy Vị Trí Giao Hàng Của Bạn?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                ShopQuiet sử dụng định vị GPS để tự động điền chính xác Tỉnh/Thành phố & Phường/Xã giúp tính phí vận chuyển chuẩn nhất cho đơn hàng.
              </p>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={executeGpsFetch}
                disabled={isLoadingLocation}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition-all border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoadingLocation ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang dò tìm tọa độ GPS...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Dùng Vị Trí GPS Hiện Tại</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs transition-all border-none cursor-pointer"
              >
                Tự Chọn Tỉnh / Thành Phố
              </button>
            </div>

            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-medium pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Bảo mật thông tin vị trí của bạn</span>
            </div>
          </div>
        </div>
      )}

    </PageCast>
  );
};
