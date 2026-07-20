import { useEffect, useState } from 'react';
import { Page } from 'zmp-ui';
import { useCart, IOrder } from '../../App';
import { apiRequest } from '../../utils/api';
import { IProfileProps } from './profile.type';

// Import sub-components from global components folder
import { 
  MembershipCard, 
  AddressManager, 
  EditProfile, 
  VoucherWallet, 
  OrderHistory,
  LuckyWheel
} from '../../components';



const PageCast = Page as any;

type CmsStaticPage = {
  slug: string;
  title: string;
  excerpt?: string | null;
  content: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
};

type CmsBootstrap = {
  settings: Record<string, string>;
  staticPages: CmsStaticPage[];
};

export const Profile: React.FC<IProfileProps> = (props) => {
  const { initialSubPage = 'profile' } = props;
  const {
    setActiveTab,
    setSelectedProductDetail,
    showToast,
    zaloUser,
    updateZaloUser,
    setSelectedOrder,
    savedItems,
    setIsCartOpen,
    cart,
    refreshZaloProfile,
    setIsChatOpen,
  } = useCart();

  const [orders, setOrders] = useState<IOrder[]>([]);
  const [recommendationProducts, setRecommendationProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isLuckyWheelOpen, setIsLuckyWheelOpen] = useState(false);


  const [userVouchersCount, setUserVouchersCount] = useState(0);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [cmsSettings, setCmsSettings] = useState<Record<string, string>>({});
  const [staticPages, setStaticPages] = useState<CmsStaticPage[]>([]);
  const [activeStaticPageSlug, setActiveStaticPageSlug] = useState('help-support');

  // Dynamic membership ranking badge settings
  const currentTier = zaloUser?.membershipTier || 'Đồng';
  let tierBadge = 'ĐỒNG';
  let badgeColor = 'bg-neutral-400 text-white';

  if (currentTier === 'Kim cương') {
    tierBadge = 'KIM CƯƠNG';
    badgeColor = 'bg-cyan-400 text-teal-950';
  } else if (currentTier === 'Vàng') {
    tierBadge = 'VÀNG';
    badgeColor = 'bg-yellow-400 text-teal-950';
  } else if (currentTier === 'Bạc') {
    tierBadge = 'BẠC';
    badgeColor = 'bg-slate-300 text-teal-950';
  } else {
    tierBadge = 'ĐỒNG';
    badgeColor = 'bg-amber-600 text-white';
  }

  const profile = {
    name: zaloUser?.name || '',
    phone: zaloUser?.phone || '',
    email: zaloUser?.email || '',
    avatar: zaloUser?.avatar || '',
    zaloId: zaloUser?.id || '',
    birthday: zaloUser?.birthday || '',
    gender: zaloUser?.gender || '',
  };

  const fetchUsersList = async () => {
    try {
      const res = await apiRequest<any[]>('/users');
      if (res && Array.isArray(res)) {
        setUsersList(res);
      }
    } catch (e) {
      console.error('Failed to fetch user list:', e);
    }
  };

  useEffect(() => {
    if (isAdminModalOpen) {
      fetchUsersList();
    }
  }, [isAdminModalOpen]);

  useEffect(() => {
    async function fetchCmsProfileConfig() {
      try {
        const data = await apiRequest<CmsBootstrap>('/cms/bootstrap');
        setCmsSettings(data.settings || {});
        setStaticPages(data.staticPages || []);
      } catch (e) {
        console.error('Failed to fetch profile CMS config:', e);
      }
    }
    fetchCmsProfileConfig();
  }, []);

  const fetchOrdersAndProducts = async () => {
    if (!zaloUser?.id) return;
    const userId = zaloUser.id;
    try {
      const [fetchedOrders, fetchedProducts, fetchedVouchers] = await Promise.all([
        apiRequest<IOrder[]>('/orders/admin/all'), // Lấy tất cả đơn hàng cho đồng bộ
        apiRequest<any>('/products?page=1&limit=10'),
        apiRequest<any[]>('/vouchers').catch(() => []),
      ]);

      const userSpecificOrders = fetchedOrders.filter((o) => o.zaloUserId === userId);
      setOrders(userSpecificOrders);
      setUserVouchersCount(fetchedVouchers.length);

      const productList = Array.isArray(fetchedProducts) ? fetchedProducts : fetchedProducts?.data || [];
      const recs = productList.slice(0, 3);
      setRecommendationProducts(recs);

      // Cache fresh data
      localStorage.setItem(`cache_orders_${userId}`, JSON.stringify(userSpecificOrders));
      localStorage.setItem('cache_rec_products', JSON.stringify(recs));
    } catch (err) {
      console.error('Failed to fetch profile page data:', err);
      const local = JSON.parse(localStorage.getItem(`offline_orders_${userId}`) || '[]');
      setOrders(local);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!zaloUser?.id) {
      setLoading(false);
      return;
    }
    const userId = zaloUser.id;
    const cachedOrders = localStorage.getItem(`cache_orders_${userId}`);
    const cachedRecs = localStorage.getItem('cache_rec_products');
    if (cachedOrders) {
      setOrders(JSON.parse(cachedOrders));
      setLoading(false);
    } else {
      setOrders([]);
      setLoading(true);
    }
    if (cachedRecs) {
      setRecommendationProducts(JSON.parse(cachedRecs));
    }

    fetchOrdersAndProducts();
    refreshZaloProfile();
  }, [zaloUser?.id]);

  const handleReviewSuccess = (orderId: string, productId: number) => {
    setOrders((prevOrders) =>
      prevOrders.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            items: (o.items || []).map((item: any) => {
              if (item.product?.id === productId) {
                return { ...item, isReviewed: true };
              }
              return item;
            }),
          };
        }
        return o;
      })
    );
    // Refetch to ensure sync with server
    fetchOrdersAndProducts();
  };

  const activeStaticPage =
    staticPages.find((page) => page.slug === activeStaticPageSlug) ||
    staticPages.find((page) => page.slug === 'help-support');

  // Subpages Router
  if (initialSubPage === 'ranking') {
    return <MembershipCard zaloUser={zaloUser} setActiveTab={setActiveTab} />;
  }

  if (initialSubPage === 'orders') {
    return (
      <OrderHistory
        orders={orders}
        loading={loading}
        zaloUser={zaloUser}
        recommendationProducts={recommendationProducts}
        setActiveTab={setActiveTab}
        setSelectedOrder={setSelectedOrder}
        setSelectedProductDetail={setSelectedProductDetail}
        showToast={showToast}
        onReviewSuccess={handleReviewSuccess}
      />
    );
  }

  if (!zaloUser) {
    return (
      <PageCast className="bg-[#f7f7f7] relative flex flex-col w-full h-full overscroll-none scrollbar-none items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <span className="text-[10px] font-bold text-[#526069] tracking-wider uppercase">Đang tải thông tin cá nhân...</span>
        </div>
      </PageCast>
    );
  }

  return (
    <PageCast className="bg-[#f7f7f7] relative flex flex-col w-full h-full overscroll-none scrollbar-none">
      {/* Top Banner (ShopeeFood style) */}
      <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-primary text-white pt-6 pb-9 px-6 relative rounded-b-[32px] shadow-md">
        {/* Navigation Bar */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setActiveTab('home')}
            className="p-2 -ml-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full transition-colors border-none text-white cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-xs font-black uppercase tracking-[0.2em] font-sans">ShopQuiet ID</span>
          <button
            onClick={() => setIsEditProfileOpen(true)}
            className="p-2 -mr-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full transition-colors border-none text-white cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
              />
            </svg>
          </button>
        </div>

        {/* User Card Row */}
        <div className="flex items-center gap-4.5">
          <div className="relative">
            <img src={profile.avatar} alt={profile.name} className="w-19 h-19 rounded-full object-cover border-3 border-white/90 shadow-md" />
            <span className="absolute bottom-0 right-0 w-5 h-5 bg-amber-400 text-teal-950 rounded-full flex items-center justify-center font-bold text-[9px] border-2 border-white shadow-xs">
              ✓
            </span>
          </div>

          <div className="flex-1 text-left space-y-1.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight line-clamp-1">{profile.name}</h2>
              <span className={`${badgeColor} font-black tracking-widest text-[8px] uppercase px-2 py-0.5 rounded flex items-center gap-1 shadow-xs`}>
                ★ {tierBadge}
              </span>
            </div>

            <div className="space-y-0.5 text-[10.5px] text-white/80 font-medium">
              <p className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 opacity-75" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.387a12.035 12.035 0 01-7.108-7.108c-.155-.44.01-1.03.387-1.312l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.318A2.25 2.25 0 002.1 4.5v2.25z"
                  />
                </svg>
                <span>{profile.phone || 'Chưa cập nhật số điện thoại'}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 opacity-75" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
                <span>{profile.email || 'Chưa cập nhật email'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Dashboard Counter Stats Card */}
      <div className="mx-6 -mt-5 bg-white rounded-2xl p-4 shadow-sm border border-[#f0edeb] grid grid-cols-3 divide-x divide-neutral-100 z-10 relative text-center">
        <button
          onClick={() => setActiveTab('saved-items')}
          className="flex flex-col items-center justify-center border-none bg-transparent cursor-pointer active:scale-95 transition-transform"
        >
          <span className="text-base font-extrabold text-textColor">{savedItems.length}</span>
          <span className="text-[10px] text-[#526069]/65 font-bold uppercase tracking-wider mt-1">Yêu thích</span>
        </button>
        <button
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center justify-center border-none bg-transparent cursor-pointer active:scale-95 transition-transform"
        >
          <span className="text-base font-extrabold text-textColor">{cart.reduce((sum: number, item: any) => sum + item.quantity, 0)}</span>
          <span className="text-[10px] text-[#526069]/65 font-bold uppercase tracking-wider mt-1">Giỏ hàng</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className="flex flex-col items-center justify-center border-none bg-transparent cursor-pointer active:scale-95 transition-transform"
        >
          <span className="text-base font-extrabold text-teal-600">{orders.length}</span>
          <span className="text-[10px] text-[#526069]/65 font-bold uppercase tracking-wider mt-1">Đơn hàng</span>
        </button>
      </div>

      {/* Profile menu categories list */}
      <div className="flex-1 overflow-y-auto px-6 py-5.5 space-y-5 pb-28">
        {/* Section 1: Shopping */}
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-extrabold text-[#526069]/55 uppercase tracking-widest pl-2">Giao dịch & Mua sắm</h3>
          <div className="bg-white rounded-2xl border border-[#f0edeb] overflow-hidden shadow-xs divide-y divide-[#f0edeb]">
            <button
              onClick={() => setActiveTab('orders')}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-textColor/60" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
                <span className="font-semibold text-textColor">Đơn hàng của tôi</span>
              </div>
              <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            <button
              onClick={() => setActiveTab('saved-items')}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-textColor/60" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                  />
                </svg>
                <span className="font-semibold text-textColor">Sản phẩm yêu thích</span>
              </div>
              <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            <button
              onClick={() => setActiveTab('ranking')}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
                  />
                </svg>
                <span className="font-semibold text-textColor">Hạng thành viên</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`font-black text-[9px] uppercase px-2.5 py-0.5 rounded shadow-xs ${badgeColor}`}>★ {tierBadge}</span>
                <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </button>
          </div>
        </div>

        {/* Section 2: Account */}
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-extrabold text-[#526069]/55 uppercase tracking-widest pl-2">Thiết lập & Cá nhân</h3>
          <div className="bg-white rounded-2xl border border-[#f0edeb] overflow-hidden shadow-xs divide-y divide-[#f0edeb]">
            <button
              onClick={() => setIsAddressModalOpen(true)}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-textColor/60" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span className="font-semibold text-textColor">Địa chỉ nhận hàng</span>
              </div>
              <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            <button
              onClick={() => setIsVoucherModalOpen(true)}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-textColor/60" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
                <span className="font-semibold text-textColor">Ví Voucher</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="bg-teal-50 text-teal-600 font-bold text-[10px] px-2 py-0.5 rounded-full">
                  {userVouchersCount > 0 ? `${userVouchersCount} mã` : ''}
                </span>
                <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </button>

            <button
              onClick={() => setIsLuckyWheelOpen(true)}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg leading-none">🎡</span>
                <span className="font-semibold text-textColor">Vòng quay may mắn</span>
              </div>
              <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Section 3: General */}
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-extrabold text-[#526069]/55 uppercase tracking-widest pl-2">Thông tin ứng dụng</h3>
          <div className="bg-white rounded-2xl border border-[#f0edeb] overflow-hidden shadow-xs divide-y divide-[#f0edeb]">
            <button
              onClick={() => setActiveTab('notifications')}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-textColor/60" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a9.04 9.04 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-semibold text-textColor">Thông báo</span>
              </div>
              <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            <button
              onClick={() => {
                setIsChatOpen(true);
              }}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-textColor/60" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                  />
                </svg>
                <span className="font-semibold text-textColor">Trung tâm hỗ trợ</span>
              </div>
              <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            <button
              onClick={() => {
                setActiveStaticPageSlug('about-shopquiet');
                setIsHelpModalOpen(true);
              }}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-textColor/60" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  />
                </svg>
                <span className="font-semibold text-textColor">Về ShopQuiet</span>
              </div>
              <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODALS INJECTIONS ─── */}
      <EditProfile
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        zaloUser={zaloUser}
        updateZaloUser={updateZaloUser}
        showToast={showToast}
      />

      <AddressManager
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        zaloUser={zaloUser}
        showToast={showToast}
      />

      <VoucherWallet
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        showToast={showToast}
      />

      {/* Static Info Page Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up text-left">
            <h3 className="text-xs font-bold text-textColor uppercase tracking-wider">{activeStaticPage?.title || 'Trợ giúp & Hỗ trợ'}</h3>

            <div className="space-y-3 text-xs leading-relaxed text-textColor-variant">
              {(activeStaticPage?.content || 'Chào mừng bạn đến với tổng đài hỗ trợ của ShopQuiet.')
                .split('\n')
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-100 font-mono text-[11px] text-textColor space-y-1">
                <p>📞 Hotline: {activeStaticPage?.contactPhone || cmsSettings['support.hotline'] || '1900 6000'}</p>
                <p>📧 Email: {activeStaticPage?.contactEmail || cmsSettings['support.email'] || 'support@shopquiet.vn'}</p>
              </div>
            </div>

            <button
              onClick={() => setIsHelpModalOpen(false)}
              className="w-full h-10 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200 mt-2"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Registered Users Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up flex flex-col max-h-[80vh] text-left">
            <h3 className="text-xs font-bold text-textColor uppercase tracking-wider">Người dùng đã đăng nhập</h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {usersList.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-8">Chưa có người dùng nào đăng ký.</p>
              ) : (
                usersList.map((usr: any) => (
                  <div key={usr.id} className="p-3 border border-neutral-100 bg-neutral-50/50 rounded-2xl flex gap-3 items-center">
                    <img src={usr.avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-neutral-200" />
                    <div>
                      <p className="font-bold text-xs text-textColor">{usr.name}</p>
                      <p className="text-[10px] text-textColor-variant">ZaloID: {usr.zaloId}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setIsAdminModalOpen(false)}
              className="w-full h-10 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200 shrink-0 mt-2"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
      {/* Lucky Wheel Modal */}
      <LuckyWheel

        isOpen={isLuckyWheelOpen}
        onClose={() => setIsLuckyWheelOpen(false)}
        zaloUser={zaloUser}
        showToast={showToast}
        onVoucherClaimed={fetchOrdersAndProducts}
      />
    </PageCast>
  );
};
export default Profile;
