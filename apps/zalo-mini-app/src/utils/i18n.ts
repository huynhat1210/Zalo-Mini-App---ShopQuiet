import { useState, useEffect } from 'react';

export type Language = 'vi' | 'en';

const translations = {
  vi: {
    // General
    'lang.name': 'Tiếng Việt',
    'lang.switch': 'Ngôn ngữ / Language',
    'brand.title': 'ShopQuiet - Tối Giản, Tinh Tế',
    
    // Bottom Nav Tabs
    'tab.home': 'Trang chủ',
    'tab.search': 'Tìm kiếm',
    'tab.orders': 'Đơn hàng',
    'tab.notifications': 'Thông báo',
    'tab.profile': 'Cá nhân',

    // Home Page
    'home.searchPlaceholder': 'Tìm kiếm sản phẩm...',
    'home.categories': 'Danh mục',
    'home.all': 'Tất cả',
    'home.featured': 'Sản phẩm nổi bật',
    'home.noReview': 'Chưa có đánh giá',
    'home.reviewsCount': 'đánh giá',
    'home.addToCartSuccess': 'Đã thêm sản phẩm vào giỏ hàng!',

    // Profile Page
    'profile.title': 'Tài khoản của tôi',
    'profile.membership': 'Thành viên',
    'profile.editInfo': 'Chỉnh sửa thông tin',
    'profile.addresses': 'Sổ địa chỉ',
    'profile.luckyWheel': 'Vòng quay may mắn',
    'profile.exchangeVoucher': 'Chợ đổi Voucher',
    'profile.myVouchers': 'Voucher của tôi',
    'profile.orderHistory': 'Lịch sử mua hàng',
    'profile.points': 'Điểm tích lũy',
    'profile.exchange': 'Đổi quà',
    'profile.systemInfo': 'Thông tin hệ thống',
    'profile.logout': 'Đăng xuất',
    'profile.section.shopping': 'Giao dịch & Mua sắm',
    'profile.myOrders': 'Đơn hàng của tôi',
    'profile.favorites': 'Sản phẩm yêu thích',
    'profile.section.settings': 'Thiết lập & Cá nhân',
    'profile.section.general': 'Thông tin ứng dụng',
    'profile.helpCenter': 'Trung tâm hỗ trợ',
    'profile.about': 'Về ShopQuiet',

    // Search Page
    'search.advanced': 'Bộ lọc nâng cao',
    'search.inStock': 'Còn hàng',
    'search.under1m': 'Giá < 1.000.000 đ',
    'search.appliances': 'Đồ gia dụng',
    'search.noResults': 'Không tìm thấy sản phẩm nào phù hợp',
    'search.recent': 'Tìm kiếm gần đây',
    'search.clearHistory': 'Xóa lịch sử',
    'search.cancel': 'Hủy',
    'search.placeholder': 'Tìm kiếm sản phẩm...',

    // Checkout Page
    'checkout.title': 'Thanh toán',
    'checkout.deliveryAddress': 'Địa chỉ giao hàng',
    'checkout.inputName': 'Họ tên người nhận',
    'checkout.inputPhone': 'Số điện thoại',
    'checkout.inputStreet': 'Địa chỉ chi tiết (Số nhà, Tên đường...)',
    'checkout.inputCity': 'Tỉnh / Thành phố',
    'checkout.shippingMethod': 'Phương thức vận chuyển',
    'checkout.paymentMethod': 'Phương thức thanh toán',
    'checkout.promoCode': 'Mã giảm giá',
    'checkout.orderSummary': 'Tóm tắt đơn hàng',
    'checkout.subtotal': 'Tạm tính',
    'checkout.shippingFee': 'Phí vận chuyển',
    'checkout.membershipDiscount': 'Giảm giá thành viên',
    'checkout.voucherDiscount': 'Giảm giá Voucher',
    'checkout.total': 'Tổng thanh toán',
    'checkout.placeOrder': 'Đặt đơn hàng',
    'checkout.success': 'Đặt hàng thành công!',
  },
  en: {
    // General
    'lang.name': 'English',
    'lang.switch': 'Language / Ngôn ngữ',
    'brand.title': 'ShopQuiet - Minimalist & Elegant',

    // Bottom Nav Tabs
    'tab.home': 'Home',
    'tab.search': 'Search',
    'tab.orders': 'Orders',
    'tab.notifications': 'Inbox',
    'tab.profile': 'Profile',

    // Home Page
    'home.searchPlaceholder': 'Search products...',
    'home.categories': 'Categories',
    'home.all': 'All',
    'home.featured': 'Featured Products',
    'home.noReview': 'No reviews yet',
    'home.reviewsCount': 'reviews',
    'home.addToCartSuccess': 'Added product to cart!',

    // Profile Page
    'profile.title': 'My Account',
    'profile.membership': 'Membership',
    'profile.editInfo': 'Edit Profile',
    'profile.addresses': 'Address Book',
    'profile.luckyWheel': 'Lucky Wheel',
    'profile.exchangeVoucher': 'Voucher Exchange',
    'profile.myVouchers': 'My Vouchers',
    'profile.orderHistory': 'Order History',
    'profile.points': 'Reward Points',
    'profile.exchange': 'Exchange',
    'profile.systemInfo': 'System Settings',
    'profile.logout': 'Sign Out',
    'profile.section.shopping': 'Transactions & Shopping',
    'profile.myOrders': 'My Orders',
    'profile.favorites': 'Favorites',
    'profile.section.settings': 'Settings & Profile',
    'profile.section.general': 'Application Info',
    'profile.helpCenter': 'Help Center',
    'profile.about': 'About ShopQuiet',

    // Search Page
    'search.advanced': 'Advanced Filter',
    'search.inStock': 'In Stock',
    'search.under1m': 'Price < 1,000,000 đ',
    'search.appliances': 'Home Appliances',
    'search.noResults': 'No matching products found',
    'search.recent': 'Recent Searches',
    'search.clearHistory': 'Clear History',
    'search.cancel': 'Cancel',
    'search.placeholder': 'Search products...',

    // Checkout Page
    'checkout.title': 'Checkout',
    'checkout.deliveryAddress': 'Delivery Address',
    'checkout.inputName': 'Recipient Name',
    'checkout.inputPhone': 'Phone Number',
    'checkout.inputStreet': 'Detail Address (Street, House No...)',
    'checkout.inputCity': 'Province / City',
    'checkout.shippingMethod': 'Shipping Method',
    'checkout.paymentMethod': 'Payment Method',
    'checkout.promoCode': 'Promo / Voucher Code',
    'checkout.orderSummary': 'Order Summary',
    'checkout.subtotal': 'Subtotal',
    'checkout.shippingFee': 'Shipping Fee',
    'checkout.membershipDiscount': 'Tier Discount',
    'checkout.voucherDiscount': 'Voucher Discount',
    'checkout.total': 'Total Amount',
    'checkout.placeOrder': 'Place Order',
    'checkout.success': 'Order placed successfully!',
  }
};

// Global state listeners
const listeners = new Set<(lang: Language) => void>();

let currentLang: Language = (localStorage.getItem('app_lang') as Language) || 'vi';

export const setLanguage = (lang: Language) => {
  currentLang = lang;
  localStorage.setItem('app_lang', lang);
  listeners.forEach((l) => l(lang));
};

export const getLanguage = (): Language => currentLang;

export const useTranslation = () => {
  const [lang, setLang] = useState<Language>(currentLang);

  useEffect(() => {
    const handleLangChange = (newLang: Language) => {
      setLang(newLang);
    };
    listeners.add(handleLangChange);
    return () => {
      listeners.delete(handleLangChange);
    };
  }, []);

  const t = (key: keyof typeof translations['vi']) => {
    return translations[lang][key] || translations['vi'][key] || key;
  };

  return { t, lang, setLanguage };
};
