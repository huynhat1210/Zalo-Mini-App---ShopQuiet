import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Page } from 'zmp-ui';
import { useCart } from '../../App';
import { apiRequest } from '../../utils/api';
import { Payment } from 'zmp-sdk/apis';
import { calculateEstimatedDeliveryDate } from '../../utils/delivery-date.util';
import api from 'zmp-sdk';
const PageCast = Page as any;
import { ICheckoutProps } from './checkout.type';

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

const checkoutAddressSchema = z.object({
  name: z.string().trim().min(2, 'Vui lòng nhập họ và tên người nhận'),
  phone: z.string().trim().min(9, 'Số điện thoại không hợp lệ').regex(/^[0-9]{9,11}$/, 'Số điện thoại không hợp lệ'),
  street: z.string().trim().min(5, 'Vui lòng nhập địa chỉ chi tiết'),
  city: z.string().trim().min(2, 'Vui lòng nhập tỉnh/thành phố'),
});

type CheckoutAddressFormValues = z.infer<typeof checkoutAddressSchema>;

export const Checkout: React.FC<ICheckoutProps> = (_props) => {
  const { cart, removeFromCart, setActiveTab, showToast, zaloUser, buyNowItem, setBuyNowItem, setSelectedOrder, fetchNotifications } = useCart();

  // If buyNowItem exists, checkout only that item (direct buy); otherwise use selected cart items
  const getCheckoutItems = () => {
    if (buyNowItem) return [buyNowItem];
    const stored = localStorage.getItem('checkout_items');
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
      localStorage.removeItem('checkout_items');
      localStorage.removeItem('checkout_freeship');
    }
  };


  const [shippingMethod, setShippingMethod] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [shippingMethods, setShippingMethods] = useState<CmsShippingMethod[]>([
    { code: 'standard', name: 'Giao hàng tiêu chuẩn', description: 'Nhận hàng trong 3-5 ngày làm việc', price: 0 },
    { code: 'express', name: 'Giao hàng hỏa tốc', description: 'Nhận hàng trong 1-2 ngày làm việc', price: 5 },
  ]);
  const [paymentMethods, setPaymentMethods] = useState<CmsPaymentMethod[]>([
    { code: 'cod', name: 'Thanh toán khi nhận hàng (COD)', description: 'Thanh toán bằng tiền mặt khi giao hàng', provider: 'COD' },
    { code: 'zalopay', name: 'Cổng Sandbox ZaloPay', description: 'Thanh toán nhanh bằng ví hoặc quét mã QR', provider: 'ZALOPAY', badge: 'Ví ZaloPay' },
    { code: 'bank', name: 'Chuyển khoản Ngân hàng (QR)', description: 'Quét mã QR để chuyển khoản nhanh 24/7', provider: 'BANK', badge: 'Chuyển Khoản' },
  ]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isEnteringCustomAddress, setIsEnteringCustomAddress] = useState(false);

  // Promo code states
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; type: 'percent' | 'freeship' | 'fixed'; value: number; desc: string } | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [vouchers, setVouchers] = useState<any[]>([]);

  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const list = await apiRequest<any[]>('/vouchers');
        setVouchers(list || []);
      } catch (e) {
        console.error('Failed to fetch vouchers:', e);
      }
    };
    fetchVouchers();
  }, []);

  useEffect(() => {
    async function fetchCmsCheckoutConfig() {
      try {
        const [cmsShippingMethods, cmsPaymentMethods] = await Promise.all([
          apiRequest<CmsShippingMethod[]>('/cms/shipping-methods'),
          apiRequest<CmsPaymentMethod[]>('/cms/payment-methods'),
        ]);

        if (cmsShippingMethods?.length) {
          setShippingMethods(cmsShippingMethods);
          setShippingMethod((current) =>
            cmsShippingMethods.some((item) => item.code === current)
              ? current
              : cmsShippingMethods[0].code,
          );
        }

        if (cmsPaymentMethods?.length) {
          setPaymentMethods(cmsPaymentMethods);
          setPaymentMethod((current) =>
            cmsPaymentMethods.some((item) => item.code === current)
              ? current
              : cmsPaymentMethods[0].code,
          );
        }
      } catch (e) {
        console.error('Failed to fetch checkout CMS config:', e);
      }
    }

    fetchCmsCheckoutConfig();
  }, []);

  const [address, setAddress] = useState({
    name: '',
    street: '',
    city: '',
    phone: ''
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CheckoutAddressFormValues>({
    resolver: zodResolver(checkoutAddressSchema),
    defaultValues: {
      name: '',
      phone: '',
      street: '',
      city: '',
    },
  });

  const watchedAddress = watch();

  // Shared helper: fetch phone from Zalo SDK and call onSuccess(phone)
  const fetchZaloPhoneNumber = async (onSuccess: (phone: string) => void, silentFail = false) => {
    const apiAny = api as any;
    const handleDecrypt = async (token: string) => {
      const res = await apiRequest<{ success: boolean; phone?: string }>('/auth/decrypt-phone', 'POST', {
        zaloId: zaloUser?.id || 'guest',
        token,
      });
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
              if (!ok && !silentFail) showToast('Giải mã số điện thoại thất bại.', 'warning');
            } catch (err) {
              console.error(err);
              if (!silentFail) showToast('Lỗi giải mã số điện thoại.', 'warning');
            }
          }
        },
        fail: (error: any) => {
          // Zalo SDK failed - leave phone empty, user enters manually
          console.error('getPhoneNumber fail', error);
          if (!silentFail) showToast('Không thể lấy SĐT từ Zalo. Vui lòng nhập thủ công.', 'warning');
        }
      });
    }
    // No mock/browser fallback - only real Zalo SDK
  };

  // Auto-fetch phone when checkout opens and phone field is empty
  useEffect(() => {
    const currentPhone = watchedAddress.phone || '';
    if (!currentPhone) {
      fetchZaloPhoneNumber((phone) => {
        reset({ ...watchedAddress, phone });
      }, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Location feature
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const handleGetLocation = async () => {
    const apiAny = api as any;
    setIsLoadingLocation(true);

    const processCoords = async (lat: number, lng: number) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`,
          { headers: { 'User-Agent': 'ShopQuiet-MiniApp/1.0' } }
        );
        const data = await res.json();
        const addr = data.address || {};
        const road = addr.road || addr.pedestrian || addr.footway || '';
        const houseNumber = addr.house_number || '';
        const street = [houseNumber, road].filter(Boolean).join(' ')
          || addr.neighbourhood
          || addr.suburb
          || '';
        const city = addr.city || addr.town || addr.county || addr.state || '';

        reset({
          ...watchedAddress,
          street: street || watchedAddress.street,
          city: city || watchedAddress.city,
        });
        showToast('Đã điền địa chỉ từ vị trí hiện tại!', 'success');
      } catch (err) {
        console.error(err);
        showToast('Không thể lấy địa chỉ từ toạ độ.', 'warning');
      } finally {
        setIsLoadingLocation(false);
      }
    };

    if (apiAny && apiAny.getLocation) {
      apiAny.getLocation({
        success: (data: any) => {
          const lat = data.latitude ?? data.lat;
          const lng = data.longitude ?? data.lon ?? data.lng;
          if (lat != null && lng != null) {
            processCoords(Number(lat), Number(lng));
          } else {
            showToast('Không nhận được toạ độ vị trí.', 'warning');
            setIsLoadingLocation(false);
          }
        },
        fail: (err: any) => {
          console.error('getLocation fail', err);
          showToast('Không thể lấy vị trí. Vui lòng cấp quyền vị trí cho app.', 'warning');
          setIsLoadingLocation(false);
        }
      });
    } else if (navigator.geolocation) {
      // Browser fallback
      navigator.geolocation.getCurrentPosition(
        (pos) => processCoords(pos.coords.latitude, pos.coords.longitude),
        (err) => {
          console.error(err);
          showToast('Không thể lấy vị trí.', 'warning');
          setIsLoadingLocation(false);
        }
      );
    } else {
      showToast('Thiết bị không hỗ trợ lấy vị trí.', 'warning');
      setIsLoadingLocation(false);
    }
  };


  const decodeMojibakeText = (text: string | null | undefined) => {
    if (!text || typeof text !== 'string') return text || '';
    try {
      return decodeURIComponent(escape(text));
    } catch {
      return text;
    }
  };

  const formatAddressText = (text: string | null | undefined, fallback = '') => {
    const fixed = decodeMojibakeText(text);
    const normalized = fixed.trim();
    if (!normalized || normalized === 'f' || normalized === 'F' || normalized === '??') {
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
        const fetched = await apiRequest<any[]>('/addresses');
        const normalized = fetched.map(normalizeAddress);
        setAddresses(normalized);

        const active = normalized.find((a) => a.isDefault) || normalized[0];
        const nextAddress = active
          ? {
              name: zaloUser?.name || '',
              street: active.street,
              city: active.city,
              phone: active.phone,
            }
          : {
              name: zaloUser?.name || '',
              street: '',
              city: '',
              phone: '',
            };

        setAddress(nextAddress);
        reset(nextAddress);
      } catch (e) {
        console.error('Failed to load checkout addresses:', e);
      }
    };
    fetchAddresses();
  }, [zaloUser?.id, isSelectorOpen, reset]);

  useEffect(() => {
    const nextAddress = {
      name: watchedAddress.name ?? address.name,
      street: watchedAddress.street ?? address.street,
      city: watchedAddress.city ?? address.city,
      phone: watchedAddress.phone ?? address.phone,
    };

    setAddress((current) => {
      if (
        current.name === nextAddress.name &&
        current.street === nextAddress.street &&
        current.city === nextAddress.city &&
        current.phone === nextAddress.phone
      ) {
        return current;
      }
      return nextAddress;
    });
  }, [watchedAddress.city, watchedAddress.name, watchedAddress.phone, watchedAddress.street]);

  const subtotal = checkoutItems.reduce((sum: number, item: any) => sum + item.product.price * item.quantity, 0);

  // Calculate discount and shipping
  const isFreeshipEligible = subtotal >= 300000;
  const selectedShippingMethod = shippingMethods.find((item) => item.code === shippingMethod);
  let shippingCost = isFreeshipEligible ? 0 : (selectedShippingMethod?.price || 0);
  let discount = 0;

  if (appliedPromo) {
    if (appliedPromo.type === 'percent') {
      discount = subtotal * (appliedPromo.value / 100);
    } else if (appliedPromo.type === 'fixed') {
      discount = appliedPromo.value;
    } else if (appliedPromo.type === 'freeship') {
      discount = shippingCost;
      shippingCost = 0;
    }
  }

  const total = Math.max(0, subtotal + shippingCost - discount);

  const applyPromoCode = async (code: string) => {
    try {
      const res = await apiRequest<any>('/vouchers/apply', 'POST', {
        code,
        orderTotal: subtotal,
        zaloUserId: zaloUser?.id
      });
      if (res && res.code) {
        let desc = '';
        if (res.type === 'PERCENT') {
          desc = `Giảm ${res.value}% tổng đơn`;
        } else if (res.type === 'FIXED') {
          desc = `Giảm ${res.value.toLocaleString('vi-VN')} đ`;
        } else if (res.type === 'FREESHIP') {
          desc = 'Miễn phí vận chuyển';
        }
        setAppliedPromo({
          code: res.code,
          type: res.type.toLowerCase(),
          value: res.value,
          desc
        });
        showToast(`Đã áp dụng mã ${res.code} thành công!`, 'success');
      }
    } catch (err: any) {
      const msg = err?.message || 'Mã khuyến mãi không hợp lệ!';
      showToast(msg, 'warning');
    }
  };

  const handleApplyPromo = () => {
    if (!promoInput) {
      showToast('Vui lòng nhập mã khuyến mãi!', 'warning');
      return;
    }
    applyPromoCode(promoInput);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    showToast('Đã gỡ bỏ mã khuyến mãi!', 'info');
  };



  const handlePlaceOrder = async () => {
    if (checkoutItems.length === 0) {
      showToast('Giỏ hàng trống!', 'warning');
      return;
    }

    if (!address.name.trim() || !address.phone.trim() || !address.street.trim() || !address.city.trim()) {
      showToast('Vui lòng điền đầy đủ thông tin giao hàng!', 'warning');
      return;
    }

    try {
      // Auto-save custom address if it's the first one or user explicitly typed a new one
      if (addresses.length === 0 || isEnteringCustomAddress) {
        try {
          await apiRequest('/addresses', 'POST', {
            label: addresses.length === 0 ? 'Địa chỉ mặc định' : 'Địa chỉ mới',
            phone: address.phone.trim(),
            street: address.street.trim(),
            city: address.city.trim(),
            isDefault: addresses.length === 0
          });
        } catch (addrErr) {
          console.error('Failed to auto-save custom address to database:', addrErr);
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
        items: checkoutItems.map((item: any) => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
          size: item.size || 'DEFAULT',
          color: item.color || 'DEFAULT'
        })),
        isDirectBuy: !!buyNowItem
      };

      let createdOrder: any;
      let orderNumber: string;

      if (paymentMethod === 'zalopay' || paymentMethod === 'bank') {
        const checkoutRes = await apiRequest<any>('/orders/zalopay-checkout', 'POST', {
          ...orderData,
          paymentMethod
        });
        orderNumber = checkoutRes.orderId;

        createdOrder = {
          id: checkoutRes.orderId,
          totalAmount: total,
          status: 'PENDING_PAYMENT',
          createdAt: new Date().toISOString(),
          paymentMethod: paymentMethod.toUpperCase(),
          voucherCode: appliedPromo ? appliedPromo.code : null,
          discountAmount: discount,
          shippingAddress: `${address.street}, ${address.city}`,
          shippingPhone: address.phone.trim(),
          shippingName: address.name.trim(),
          items: checkoutItems.map((item: any) => ({
            quantity: item.quantity,
            price: item.product.price,
            product: { name: item.product.name },
            size: item.size || 'DEFAULT',
            color: item.color || 'DEFAULT'
          }))
        };

        // Try invoking Zalo SDK Payment sheet for ZaloPay / Bank Transfer
        try {
          Payment.createOrder({
            amount: checkoutRes.amount,
            desc: checkoutRes.desc,
            item: JSON.parse(checkoutRes.item),
            extradata: checkoutRes.extradata,
            method: checkoutRes.method,
            mac: checkoutRes.mac,
            success: (data) => {
              console.log('Payment.createOrder success, calling checkTransaction with data:', data);
              Payment.checkTransaction({
                data: data,
                success: (result) => {
                  console.log('Payment.checkTransaction success result:', result);
                  const resultCode = (result as any).resultCode;
                  if (resultCode === 1) {
                    // Success
                    apiRequest(`/orders/${checkoutRes.orderId}/status`, 'PATCH', { status: 'PROCESSING' })
                      .then(() => {
                        clearPurchasedItems();
                        showToast('Thanh toán thành công!', 'success');
                        if (fetchNotifications) {
                          fetchNotifications();
                        }
                        setActiveTab('order-success');
                      })
                      .catch((e) => {
                        console.error('Failed to update status on frontend after checkTransaction success:', e);
                        clearPurchasedItems();
                        setSelectedOrder(createdOrder);
                        setActiveTab('order-detail');
                      });
                  } else if (resultCode === 0) {
                    showToast('Giao dịch đang được xử lý...', 'info');
                    clearPurchasedItems();
                    setSelectedOrder(createdOrder);
                    setActiveTab('order-detail');
                  } else if (resultCode === -2) {
                    showToast('Bạn đã hủy thanh toán!', 'warning');
                    clearPurchasedItems();
                    setSelectedOrder(createdOrder);
                    setActiveTab('order-detail');
                  } else {
                    showToast('Thanh toán thất bại!', 'warning');
                    clearPurchasedItems();
                    setSelectedOrder(createdOrder);
                    setActiveTab('order-detail');
                  }
                },
                fail: (err) => {
                  console.error('Payment.checkTransaction failed:', err);
                  showToast('Không thể xác minh giao dịch!', 'warning');
                  clearPurchasedItems();
                  setSelectedOrder(createdOrder);
                  setActiveTab('order-detail');
                }
              });
            },
            fail: (err) => {
              console.warn('Payment.createOrder failed:', err);
              showToast('Không thể tạo đơn hàng thanh toán!', 'warning');
              clearPurchasedItems();
              setSelectedOrder(createdOrder);
              setActiveTab('order-detail');
            }
          });
          return;
        } catch (sdkErr) {
          console.error('Error invoking Zalo SDK payment:', sdkErr);
          clearPurchasedItems();
          setSelectedOrder(createdOrder);
          setActiveTab('order-detail');
          return;
        }
      } else {
        // Cash on delivery
        const codOrder = await apiRequest<any>('/orders', 'POST', orderData);
        orderNumber = codOrder.id;
        createdOrder = {
          id: codOrder.id,
          totalAmount: codOrder.totalAmount,
          status: codOrder.status,
          createdAt: codOrder.createdAt,
          paymentMethod: 'COD',
          voucherCode: codOrder.voucherCode,
          discountAmount: codOrder.discountAmount,
          shippingAddress: codOrder.shippingAddress,
          shippingPhone: codOrder.shippingPhone,
          shippingName: codOrder.shippingName,
          items: codOrder.items.map((item: any) => ({
            quantity: item.quantity,
            price: item.price,
            product: { name: item.product.name },
            size: item.size || 'DEFAULT',
            color: item.color || 'DEFAULT'
          }))
        };
      }

      const userId = zaloUser?.id || 'cust-zalo-id-1';
      const offlineOrders = JSON.parse(localStorage.getItem(`offline_orders_${userId}`) || '[]');
      localStorage.setItem(`offline_orders_${userId}`, JSON.stringify([createdOrder, ...offlineOrders]));
      
      // Calculate estimated delivery date for display
      const deliveryRange = calculateEstimatedDeliveryDate(new Date(), shippingMethod);
      
      localStorage.setItem('last_success_order', JSON.stringify({
        orderNumber,
        total,
        itemsCount: checkoutItems.reduce((sum: number, item: any) => sum + item.quantity, 0),
        items: checkoutItems.map((item: any) => ({
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          images: item.product.images,
          size: item.size || 'DEFAULT',
          color: item.color || 'DEFAULT'
        })),
        estimatedDeliveryDate: deliveryRange.displayText,
        shippingMethodCode: shippingMethod
      }));

      // Clear only what was ordered
      clearPurchasedItems();
      showToast(`Đặt hàng #${orderNumber} thành công!`, 'success');
      if (fetchNotifications) {
        fetchNotifications();
      }
      setActiveTab('order-success');

    } catch (error: any) {
      console.error(error);
      const msg = error?.message || 'Đặt hàng thất bại, vui lòng thử lại!';
      showToast(msg, 'warning');
    }
  };

  return (
    <PageCast className="bg-surface relative flex flex-col w-full h-full overscroll-none scrollbar-none animate-fade-in">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-[#f0edeb] sticky top-0 z-30 shadow-xs">
        <button onClick={() => setActiveTab('home')} className="p-1.5 hover:bg-[#f0edeb] rounded-full transition-colors active:scale-95">
          <svg className="w-5.5 h-5.5 text-textColor" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-textColor">Đặt hàng</span>
        <div className="w-8"></div>
      </div>

      <div className="flex-1 pb-32 px-6 py-5.5 space-y-5">
        {/* Step Indicator */}
        <div className="bg-white rounded-2xl border border-[#f0edeb] p-4 flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-textColor-variant shadow-xs">
          <div className="flex items-center gap-2 text-primary">
            <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[9px]">1</span>
            <span>Vận chuyển</span>
          </div>
          <div className="w-8 h-[1px] bg-[#f0edeb]"></div>
          <div className="flex items-center gap-2 text-textColor/35">
            <span className="w-5 h-5 rounded-full bg-[#f0edeb] text-textColor/35 flex items-center justify-center text-[9px]">2</span>
            <span>Thanh toán</span>
          </div>
          <div className="w-8 h-[1px] bg-[#f0edeb]"></div>
          <div className="flex items-center gap-2 text-textColor/35">
            <span className="w-5 h-5 rounded-full bg-[#f0edeb] text-textColor/35 flex items-center justify-center text-[9px]">3</span>
            <span>Xác nhận</span>
          </div>
        </div>

        {/* Shipping Address Section */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#526069]/70">Địa chỉ giao hàng</h2>
            {!isEnteringCustomAddress && addresses.length > 0 && (
              <button
                onClick={() => {
                  setAddress({ name: zaloUser?.name || '', street: '', city: '', phone: '' });
                  setIsEnteringCustomAddress(true);
                }}
                className="text-[10px] text-primary font-bold hover:underline bg-transparent border-none cursor-pointer"
              >
                + Thêm địa chỉ mới
              </button>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-[#f0edeb] p-4.5 shadow-xs relative text-left">
            {!isEnteringCustomAddress && addresses.length > 0 ? (
              <div className="flex justify-between items-start animate-fade-in">
                <div className="text-xs text-textColor space-y-1.5">
                  <p className="font-semibold">{formatAddressText(address.name, 'Người nhận')}</p>
                  <p className="text-textColor-variant leading-relaxed">{formatAddressText(address.street, '')}</p>
                  <p className="text-textColor-variant">{formatAddressText(address.city, '')}</p>
                  <p className="text-textColor-variant/80 font-bold">SĐT: {formatAddressText(address.phone, '')}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => setIsSelectorOpen(true)}
                    className="text-xs text-primary font-bold hover:underline border-none bg-transparent cursor-pointer"
                  >
                    Thay đổi
                  </button>
                  <button
                    onClick={() => {
                      reset({
                        name: address.name,
                        phone: address.phone,
                        street: address.street,
                        city: address.city,
                      });
                      setIsEnteringCustomAddress(true);
                    }}
                    className="text-xs text-[#526069] font-bold hover:underline border-none bg-transparent cursor-pointer"
                  >
                    Chỉnh sửa
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 animate-fade-in">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[9px] text-red-500 font-bold uppercase tracking-wider">Vui lòng nhập địa chỉ giao hàng:</p>
                  {addresses.length > 0 && (
                    <button
                      onClick={() => {
                        const active = addresses.find(a => a.isDefault) || addresses[0];
                        setAddress({
                          name: zaloUser?.name || '',
                          street: active.street,
                          city: active.city,
                          phone: active.phone
                        });
                        setIsEnteringCustomAddress(false);
                      }}
                      className="text-[9px] text-[#526069] font-bold hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Hủy / Chọn địa chỉ đã lưu
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <input
                      type="text"
                      placeholder="Họ và tên người nhận"
                      {...register('name')}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#f0edeb] bg-[#fbf9f7] text-textColor focus:border-primary focus:outline-none"
                    />
                    {errors.name && <p className="mt-1 text-[10px] text-red-500">{errors.name.message}</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Số điện thoại liên lạc"
                      {...register('phone')}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#f0edeb] bg-[#fbf9f7] text-textColor focus:border-primary focus:outline-none"
                    />
                    {errors.phone && <p className="mt-1 text-[10px] text-red-500">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Địa chỉ (Số nhà, tên đường)"
                        {...register('street')}
                        className="w-full text-xs px-3.5 py-2.5 pr-28 rounded-xl border border-[#f0edeb] bg-[#fbf9f7] text-textColor focus:border-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={isLoadingLocation}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 bg-[#f0edeb] text-[#526069] text-[8px] font-extrabold uppercase tracking-wider rounded-lg border-none cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
                      >
                        {isLoadingLocation ? (
                          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block" />
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                          </svg>
                        )}
                        Vị trí
                      </button>
                    </div>
                    {errors.street && <p className="mt-1 text-[10px] text-red-500">{errors.street.message}</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Tỉnh / Thành phố"
                      {...register('city')}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#f0edeb] bg-[#fbf9f7] text-textColor focus:border-primary focus:outline-none"
                    />
                    {errors.city && <p className="mt-1 text-[10px] text-red-500">{errors.city.message}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Shipping Method Section */}
        <div className="space-y-2.5">
          <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#526069]/70 px-1">Phương thức vận chuyển</h2>
          <div className="bg-white rounded-2xl border border-[#f0edeb] p-1 shadow-xs divide-y divide-[#f0edeb]">
            {shippingMethods.map((method, index) => {
              const deliveryRange = calculateEstimatedDeliveryDate(new Date(), method.code);
              return (
                <label
                  key={method.code}
                  className={`flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-50 transition-colors ${index === 0 ? 'rounded-t-2xl' : ''} ${index === shippingMethods.length - 1 ? 'rounded-b-2xl' : ''}`}
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
                      <p className="font-semibold text-textColor">{method.name}</p>
                      <p className="text-[10px] text-primary font-medium mt-0.5">Dự kiến: {deliveryRange.displayText}</p>
                      {method.description && (
                        <p className="text-[10px] text-textColor-variant mt-0.5">{method.description}</p>
                      )}
                    </div>
                  </div>
                   <span className="text-xs font-bold text-textColor">{method.price > 0 ? `${method.price.toLocaleString('vi-VN')} đ` : 'Miễn phí'}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Payment Method Section */}
        <div className="space-y-2.5">
          <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#526069]/70 px-1">Phương thức thanh toán</h2>
          <div className="bg-white rounded-2xl border border-[#f0edeb] p-1 shadow-xs divide-y divide-[#f0edeb]">
            {paymentMethods.map((method, index) => (
              <label
                key={method.code}
                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-neutral-50 transition-colors ${index === 0 ? 'rounded-t-2xl' : ''} ${index === paymentMethods.length - 1 ? 'rounded-b-2xl' : ''}`}
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
                      <span className="bg-[#007aff] text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase">{method.badge}</span>
                    )}
                    {method.name}
                  </p>
                  {method.description && (
                    <p className="text-[10px] text-textColor-variant mt-0.5">{method.description}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Promo Code Section */}
        <div className="space-y-2.5">
          <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#526069]/70 px-1">Mã Khuyến Mãi (Promo Code)</h2>
          <div className="bg-white rounded-2xl border border-[#f0edeb] p-4.5 shadow-xs space-y-3.5">
            <div className="flex gap-2.5">
              <input
                type="text"
                placeholder="Nhập mã ví dụ: WELCOME10, FREESHIP"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                className="flex-1 text-xs px-4 py-2.5 bg-neutral-50 rounded-xl border border-[#eae8e6] text-textColor focus:outline-none focus:border-primary focus:bg-white transition-all uppercase"
              />
              <button
                onClick={handleApplyPromo}
                className="h-10 px-5 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer active:scale-95 hover:bg-primary-dark transition-all"
              >
                Áp dụng
              </button>
            </div>

            {appliedPromo && (
              <div className="flex justify-between items-center bg-[#e8f5e9] text-[#2e7d32] px-3.5 py-2.5 rounded-xl text-xs font-bold animate-scale-up">
                <span className="truncate mr-2">Mã: {appliedPromo.code} ({appliedPromo.desc})</span>
                <button
                  onClick={handleRemovePromo}
                  className="text-red-500 hover:text-red-700 bg-transparent border-none font-bold text-xs cursor-pointer flex-shrink-0 whitespace-nowrap ml-1"
                >
                  Gỡ bỏ
                </button>
              </div>
            )}

            <div className="pt-1.5">
              <button
                onClick={() => setIsVoucherModalOpen(true)}
                className="w-full h-10 bg-[#e0f2f1]/60 hover:bg-[#e0f2f1] text-primary font-bold text-xs uppercase tracking-wider rounded-xl border border-primary/20 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-12h1.5m-1.5 3h1.5m-1.5 3h1.5m-1.5 3h1.5M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75H3.75a.75.75 0 01-.75-.75V6.75z" />
                </svg>
                Chọn Voucher Từ Kho
              </button>
            </div>
          </div>
        </div>

        {/* IOrder Review Section */}
        <div className="space-y-2.5">
          <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#526069]/70 px-1">Chi tiết đơn hàng</h2>
          <div className="bg-white rounded-2xl border border-[#f0edeb] p-4.5 shadow-xs divide-y divide-[#f0edeb] space-y-3">
            <div className="space-y-3.5">
              {checkoutItems.map((item: any) => {
                let img = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=100&q=80';
                try {
                  const parsed = JSON.parse(item.product.images);
                  if (parsed && parsed.length > 0) img = parsed[0];
                } catch (e) { }

                const selectedSize = item.size && item.size !== 'DEFAULT' ? item.size : null;
                const selectedColor = item.color && item.color !== 'DEFAULT' ? item.color : null;

                return (
                  <div key={`${item.product.id}-${item.color || 'DEFAULT'}-${item.size || 'DEFAULT'}`} className="flex justify-between items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <img src={img} alt={item.product.name} className="w-11 h-11 object-cover rounded-lg border border-[#f0edeb]" />
                      <div className="text-xs min-w-0">
                        <p className="font-semibold text-textColor line-clamp-1 max-w-[160px]">{item.product.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-textColor-variant flex-wrap">
                          <span>SL: {item.quantity}</span>
                          {selectedSize && (
                            <>
                              <span className="text-[#d8d2ce]">|</span>
                              <span className="font-bold text-[#526069]">Size: {selectedSize}</span>
                            </>
                          )}
                          {selectedColor && (
                            <>
                              <span className="text-[#d8d2ce]">|</span>
                              <span className="font-bold text-[#526069]">Màu: {selectedColor}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-textColor flex-shrink-0">{(item.product.price * item.quantity).toLocaleString('vi-VN')} đ</span>
                  </div>
                );
              })}
            </div>

            {/* Invoice billing breakdown */}
            <div className="pt-3.5 space-y-2 text-xs">
              <div className="flex justify-between text-textColor-variant">
                <span>Tạm tính</span>
                <span>{subtotal.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between text-textColor-variant">
                <span>Phí vận chuyển</span>
                <span>{shippingCost > 0 ? `${shippingCost.toLocaleString('vi-VN')} đ` : 'Miễn phí'}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#2e7d32] font-semibold animate-fade-in">
                  <span>Giảm giá {appliedPromo ? `(${appliedPromo.code})` : ''}</span>
                  <span>-{discount.toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-textColor pt-2.5 border-t border-dashed border-[#f0edeb]">
                <span>Tổng cộng</span>
                <span className="text-primary">{total.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-[80px] bg-white border-t border-[#f0edeb] flex justify-between items-center px-4.5 z-40 shadow-lg">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-textColor-variant uppercase tracking-wider">Tổng cộng</span>
          <span className="text-lg font-extrabold text-textColor">{total.toLocaleString('vi-VN')} đ</span>
        </div>

        <button
          onClick={handleSubmit(() => void handlePlaceOrder())}
          className="h-11 px-8 bg-primary hover:bg-primary-dark text-white font-bold text-xs uppercase tracking-widest rounded-full shadow-md active:scale-95 transition-all"
        >
          Đặt hàng
        </button>
      </div>

      {/* Address Selector Modal */}
      {isSelectorOpen && (
        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up">
            <h3 className="text-xs font-bold text-textColor uppercase tracking-wider">Chọn địa chỉ giao hàng</h3>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {addresses.map((addr) => {
                const isSelected = address.street === addr.street && address.city === addr.city;
                return (
                  <div
                    key={addr.id}
                    onClick={() => {
                      const userId = zaloUser?.id || 'cust-zalo-id-1';
                      setAddress({ name: address.name, street: addr.street, city: addr.city, phone: addr.phone });
                      localStorage.setItem(`shipping_address_${userId}`, JSON.stringify({ name: address.name, street: addr.street, city: addr.city, phone: addr.phone }));
                      localStorage.setItem(`shipping_address_active_id_${userId}`, addr.id.toString());
                      setIsSelectorOpen(false);
                      showToast('Đã chọn địa chỉ giao hàng!', 'success');
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex justify-between items-start text-left ${isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-[#f0edeb] bg-white hover:bg-neutral-50'
                      }`}
                  >
                    <div className="text-xs space-y-1">
                      <span className="font-extrabold text-textColor">{formatAddressText(addr.label, 'Địa chỉ')}</span>
                      <p className="text-textColor-variant leading-relaxed">{formatAddressText(addr.street, 'Địa chỉ không hợp lệ')}, {formatAddressText(addr.city, '')}</p>
                      <p className="text-textColor-variant/80 font-bold mt-0.5">SĐT: {formatAddressText(addr.phone, 'Không rõ')}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsSelectorOpen(false);
                  setActiveTab('profile');
                  showToast('Đang chuyển tới trang quản lý địa chỉ...', 'info');
                }}
                className="flex-1 h-10 border border-dashed border-primary/40 text-primary font-bold text-xs uppercase tracking-wider rounded-xl bg-transparent cursor-pointer hover:bg-primary/5 transition-all"
              >
                + Quản lý địa chỉ
              </button>
              <button
                onClick={() => setIsSelectorOpen(false)}
                className="h-10 px-4 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200"
              >
                Đóng
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
              <h3 className="text-xs font-bold text-textColor uppercase tracking-wider">Kho Voucher Của Bạn</h3>
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="text-[#526069] hover:text-black font-extrabold text-sm border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1 py-1">
              {vouchers.map((voucher) => {
                const isExpired = voucher.expiresAt && new Date(voucher.expiresAt) < new Date();
                const isOutOfStock = voucher.stock <= 0;
                const isBelowMinVal = subtotal < voucher.minOrderVal;

                const isEligible = !isExpired && !isOutOfStock && !isBelowMinVal;
                const isSelected = appliedPromo?.code === voucher.code;

                let voucherDesc = '';
                if (voucher.type === 'PERCENT') {
                  voucherDesc = `Giảm ${voucher.value}% tổng đơn hàng`;
                } else if (voucher.type === 'FIXED') {
                  voucherDesc = `Giảm ${voucher.value.toLocaleString('vi-VN')} đ`;
                } else if (voucher.type === 'FREESHIP') {
                  voucherDesc = `Miễn phí vận chuyển (Trị giá tối đa ${voucher.value.toLocaleString('vi-VN')} đ)`;
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
                    className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 relative text-left ${isEligible
                      ? isSelected
                        ? 'border-primary bg-primary/5 cursor-pointer shadow-xs'
                        : 'border-[#f0edeb] bg-white hover:bg-neutral-50 cursor-pointer'
                      : 'border-[#eae8e6] bg-[#fbf9f7] opacity-65 cursor-not-allowed'
                      }`}
                  >
                    {/* Circle radio box (chấm tròn) */}
                    <div className="flex-shrink-0">
                      <div
                        className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${isEligible
                          ? isSelected
                            ? 'border-primary bg-primary'
                            : 'border-neutral-300 bg-white'
                          : 'border-neutral-200 bg-neutral-100 cursor-not-allowed'
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
                        <span className={`text-[10px] font-black uppercase tracking-wide ${isEligible ? 'text-primary' : 'text-[#a8a19d]'}`}>
                          {voucher.code}
                        </span>
                        {isOutOfStock && (
                          <span className="text-[7.5px] font-extrabold bg-red-50 text-red-600 border border-red-100 px-1 py-0.5 rounded">Hết lượt</span>
                        )}
                        {isExpired && (
                          <span className="text-[7.5px] font-extrabold bg-amber-50 text-amber-600 border border-amber-100 px-1 py-0.5 rounded">Hết hạn</span>
                        )}
                        {isBelowMinVal && !isExpired && !isOutOfStock && (
                          <span className="text-[7.5px] font-extrabold bg-[#eae8e6] text-[#8e8580] px-1 py-0.5 rounded">
                            Đơn tối thiểu ${voucher.minOrderVal.toFixed(0)}
                          </span>
                        )}
                      </div>
                      <p className={`text-[10.5px] font-semibold mt-1 leading-snug ${isEligible ? 'text-textColor' : 'text-[#a8a19d]'}`}>
                        {voucherDesc}
                      </p>

                      <div className="flex justify-between items-center mt-2 text-[8.5px] text-textColor-variant">
                        <span>Lượt còn lại: {voucher.stock}</span>
                        {voucher.expiresAt && (
                          <span>HSD: {new Date(voucher.expiresAt).toLocaleDateString('vi-VN')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {vouchers.length === 0 && (
                <div className="text-center py-8 text-xs text-textColor-variant">
                  Hiện chưa có mã giảm giá nào khả dụng.
                </div>
              )}
            </div>

            <button
              onClick={() => setIsVoucherModalOpen(false)}
              className="w-full h-10 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200 mt-2 flex-shrink-0"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </PageCast>
  );
}
