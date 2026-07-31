import { useEffect, useState } from "react";
import { Page } from "zmp-ui";
import { useCart, IOrder } from "../../App";
import { apiRequest, useTranslation } from "../../utils";
import { IProfileProps } from "./profile.type";
import {
  UserPlusIcon,
  ShareIcon,
  DocumentDuplicateIcon,
  ChevronLeftIcon,
  PencilSquareIcon,
  CheckIcon,
  SparklesIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  UserIcon,
  HeartIcon,
  ShoppingBagIcon,
  TrophyIcon,
  MapPinIcon,
  TicketIcon,
  GiftIcon,
  LanguageIcon,
  BellIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  KeyIcon,
  CheckBadgeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

// Import sub-components from global components folder
import {
  MembershipCard,
  AddressManager,
  EditProfile,
  VoucherWallet,
  OrderHistory,
  LuckyWheel,
  VoucherExchangeModal,
  AuthModal,
} from "../../components";

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
  const { initialSubPage = "profile" } = props;
  const { t, lang, setLanguage } = useTranslation();
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
    gamificationData,
    fetchGamificationData,
    claimDailyReward,
    exchangeVoucher,
  } = useCart();

  const [orders, setOrders] = useState<IOrder[]>([]);
  const [recommendationProducts, setRecommendationProducts] = useState<any[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isLuckyWheelOpen, setIsLuckyWheelOpen] = useState(false);
  const [isVoucherExchangeOpen, setIsVoucherExchangeOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [userVouchersCount, setUserVouchersCount] = useState(0);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [cmsSettings, setCmsSettings] = useState<Record<string, string>>({});
  const [staticPages, setStaticPages] = useState<CmsStaticPage[]>([]);
  const [activeStaticPageSlug, setActiveStaticPageSlug] =
    useState("help-support");

  // Dynamic membership ranking badge settings
  const currentTier = zaloUser?.membershipTier || "Bronze";
  let tierBadge = "BRONZE";
  let badgeColor = "bg-neutral-400 text-white";

  if (currentTier === "Diamond") {
    tierBadge = "DIAMOND";
    badgeColor = "bg-cyan-400 text-teal-950";
  } else if (currentTier === "Gold") {
    tierBadge = "GOLD";
    badgeColor = "bg-yellow-400 text-teal-950";
  } else if (currentTier === "Silver") {
    tierBadge = "SILVER";
    badgeColor = "bg-slate-300 text-teal-950";
  } else {
    tierBadge = "BRONZE";
    badgeColor = "bg-amber-600 text-white";
  }

  const profile = {
    name: zaloUser?.name || "",
    phone: zaloUser?.phone || "",
    email: zaloUser?.email || "",
    avatar: zaloUser?.avatar || "",
    zaloId: zaloUser?.id || "",
    birthday: zaloUser?.birthday || "",
    gender: zaloUser?.gender || "",
  };

  const fetchUsersList = async () => {
    try {
      const res = await apiRequest<any[]>("/users");
      if (res && Array.isArray(res)) {
        setUsersList(res);
      }
    } catch (e) {
      console.error("Failed to fetch user list:", e);
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
        const data = await apiRequest<CmsBootstrap>("/cms/bootstrap");
        setCmsSettings(data.settings || {});
        setStaticPages(data.staticPages || []);
      } catch (e) {
        console.error("Failed to fetch profile CMS config:", e);
      }
    }
    fetchCmsProfileConfig();
  }, []);

  const fetchOrdersAndProducts = async () => {
    if (!zaloUser?.id) return;
    const userId = zaloUser.id;
    try {
      const [fetchedOrders, fetchedProducts, fetchedVouchers] =
        await Promise.all([
          apiRequest<IOrder[]>("/orders"), // Get orders for current user
          apiRequest<any>("/products?page=1&limit=10"),
          apiRequest<any[]>("/vouchers").catch(() => []),
        ]);

      setOrders(fetchedOrders);
      setUserVouchersCount(fetchedVouchers.length);

      const productList = Array.isArray(fetchedProducts)
        ? fetchedProducts
        : fetchedProducts?.data || [];
      const recs = productList.slice(0, 3);
      setRecommendationProducts(recs);

      // Cache fresh data
      localStorage.setItem(
        `cache_orders_${userId}`,
        JSON.stringify(fetchedOrders),
      );
      localStorage.setItem("cache_rec_products", JSON.stringify(recs));
    } catch (err) {
      console.error("Failed to fetch profile page data:", err);
      const local = JSON.parse(
        localStorage.getItem(`offline_orders_${userId}`) || "[]",
      );
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
    const cachedRecs = localStorage.getItem("cache_rec_products");
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
    fetchGamificationData();
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
      }),
    );
    // Refetch to ensure sync with server
    fetchOrdersAndProducts();
  };

  const activeStaticPage =
    staticPages.find((page) => page.slug === activeStaticPageSlug) ||
    staticPages.find((page) => page.slug === "help-support");

  // Subpages Router
  if (initialSubPage === "ranking") {
    return <MembershipCard zaloUser={zaloUser} setActiveTab={setActiveTab} />;
  }

  if (initialSubPage === "orders") {
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
          <span className="text-[10px] font-bold text-[#526069] tracking-wider uppercase">
            Loading profile information...
          </span>
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
            onClick={() => setActiveTab("home")}
            className="p-2 -ml-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full transition-colors border-none text-white cursor-pointer"
          >
            <ChevronLeftIcon className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <span className="text-xs font-black uppercase tracking-[0.2em] font-sans">
            ShopQuiet ID
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 active:scale-95 rounded-full transition-all border-none text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Auth"
            >
              <KeyIcon className="w-3.5 h-3.5 text-amber-300" strokeWidth={2.2} />
              Auth
            </button>
            <button
              onClick={() => setIsEditProfileOpen(true)}
              className="p-2 -mr-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full transition-colors border-none text-white cursor-pointer"
            >
              <PencilSquareIcon className="w-5 h-5" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* User Card Row */}
        <div className="flex items-center gap-4.5">
          <div className="relative">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-19 h-19 rounded-full object-cover border-3 border-white/90 shadow-md"
            />
            <span className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-[9px] border-2 border-white shadow-xs">
              <CheckBadgeIcon className="w-3.5 h-3.5 text-white" />
            </span>
          </div>

          <div className="flex-1 text-left space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold tracking-tight line-clamp-1">
                {profile.name}
              </h2>
              <span
                className={`${badgeColor} font-black tracking-widest text-[8px] uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs border border-white/20`}
              >
                <SparklesIcon className="w-3 h-3 text-amber-300" />
                {tierBadge} • {gamificationData?.points ? Math.round(gamificationData.points) : 0} Xu
              </span>
            </div>

            <div className="space-y-0.5 text-[10.5px] text-white/80 font-medium">
              <p className="flex items-center gap-1.5">
                <PhoneIcon className="w-3.5 h-3.5 opacity-80" strokeWidth={2} />
                <span>{profile.phone || t("profile.phoneNotUpdated")}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <EnvelopeIcon className="w-3.5 h-3.5 opacity-80" strokeWidth={2} />
                <span>{profile.email || t("profile.emailNotUpdated")}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 opacity-80" strokeWidth={2} />
                <span>{profile.birthday || t("profile.birthdayNotUpdated")}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 opacity-80" strokeWidth={2} />
                <span>{profile.gender || t("profile.genderNotUpdated")}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Dashboard Counter Stats Card */}
      <div className="mx-6 -mt-5 bg-white rounded-2xl p-4 shadow-sm border border-[#f0edeb] grid grid-cols-3 divide-x divide-neutral-100 z-10 relative text-center">
        <button
          onClick={() => setActiveTab("saved-items")}
          className="flex flex-col items-center justify-center border-none bg-transparent cursor-pointer active:scale-95 transition-transform"
        >
          <span className="text-base font-extrabold text-textColor">
            {savedItems.length}
          </span>
          <span className="text-[10px] text-[#526069]/65 font-bold uppercase tracking-wider mt-1">
            Favorites
          </span>
        </button>
        <button
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center justify-center border-none bg-transparent cursor-pointer active:scale-95 transition-transform"
        >
          <span className="text-base font-extrabold text-textColor">
            {cart.reduce((sum: number, item: any) => sum + item.quantity, 0)}
          </span>
          <span className="text-[10px] text-[#526069]/65 font-bold uppercase tracking-wider mt-1">
            Cart
          </span>
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className="flex flex-col items-center justify-center border-none bg-transparent cursor-pointer active:scale-95 transition-transform"
        >
          <span className="text-base font-extrabold text-teal-600">
            {orders.length}
          </span>
          <span className="text-[10px] text-[#526069]/65 font-bold uppercase tracking-wider mt-1">
            Orders
          </span>
        </button>
      </div>

      {/* Profile menu categories list */}
      <div className="flex-1 overflow-y-auto px-6 py-5.5 space-y-5 pb-28">
        {/* Gamification Reward & Daily Check-in Card */}
        {(() => {
          const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
          const todayVN = new Date(now);
          const dayOfWeek = todayVN.getDay(); // 0=CN, 1=T2...6=T7
          const weekDays = [
            { key: 0, label: 'CN',  xu: 500, color: 'bg-violet-500' },
            { key: 1, label: 'T2',  xu: 100, color: 'bg-sky-400' },
            { key: 2, label: 'T3',  xu: 150, color: 'bg-sky-400' },
            { key: 3, label: 'T4',  xu: 200, color: 'bg-teal-400' },
            { key: 4, label: 'T5',  xu: 250, color: 'bg-teal-400' },
            { key: 5, label: 'T6',  xu: 300, color: 'bg-orange-400' },
            { key: 6, label: 'T7',  xu: 400, color: 'bg-orange-500' },
          ];
          const orderedDays = [
            weekDays[1], weekDays[2], weekDays[3],
            weekDays[4], weekDays[5], weekDays[6], weekDays[0],
          ];
          const todayConfig = weekDays.find(d => d.key === dayOfWeek) || weekDays[1];
          const hasClaimed = gamificationData?.hasClaimedToday;
          return (
            <div className="bg-white rounded-2xl border border-[#f0edeb] p-4 shadow-xs space-y-3">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-textColor flex items-center gap-1.5">
                    <CalendarDaysIcon className="w-4 h-4 text-primary" strokeWidth={2.2} />
                    {t("profile.dailyCheckin")}
                  </h4>
                  <p className="text-[10px] text-textColor-variant mt-0.5 font-semibold">
                    Today{" "}
                    <span className="text-primary font-bold">
                      +{todayConfig.xu} Xu
                    </span>{" "}• Balance:{" "}
                    <span className="text-amber-500 font-bold">
                      {gamificationData?.points || 0} Xu
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => claimDailyReward()}
                  disabled={!!hasClaimed}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border-none transition-all active:scale-95 cursor-pointer flex items-center gap-1 ${
                    hasClaimed
                      ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-dark text-white shadow-sm'
                  }`}
                >
                  {hasClaimed ? (
                    <>
                      <CheckIcon className="w-3 h-3" strokeWidth={3} />
                      {t("profile.claimed")}
                    </>
                  ) : (
                    `+${todayConfig.xu} Xu`
                  )}
                </button>
              </div>

              {/* Weekly days strip */}
              <div className="grid grid-cols-7 gap-1">
                {orderedDays.map((day) => {
                  const isToday = day.key === dayOfWeek;
                  const isPast = (() => {
                    const ordered = [1,2,3,4,5,6,0];
                    return ordered.indexOf(day.key) < ordered.indexOf(dayOfWeek);
                  })();
                  return (
                    <div
                      key={day.key}
                      className={`flex flex-col items-center rounded-xl py-1.5 transition-all ${
                        isToday
                          ? `${day.color} shadow-sm scale-105`
                          : isPast
                          ? 'bg-neutral-100'
                          : 'bg-neutral-50 border border-neutral-100'
                      }`}
                    >
                      <span className={`text-[9px] font-bold ${isToday ? 'text-white' : 'text-textColor-variant'}`}>
                        {day.label}
                      </span>
                      <span className={`text-[11px] font-black mt-0.5 ${isToday ? 'text-white' : isPast ? 'text-neutral-400' : 'text-textColor'}`}>
                        {isPast && hasClaimed ? '✓' : `${day.xu}`}
                      </span>
                      <span className={`text-[7px] font-semibold ${isToday ? 'text-white/80' : 'text-textColor-variant'}`}>xu</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Section 1: Shopping */}
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-extrabold text-[#526069]/55 uppercase tracking-widest pl-2">
            {t("profile.section.shopping")}
          </h3>
          <div className="bg-white rounded-2xl border border-[#f0edeb] overflow-hidden shadow-xs divide-y divide-[#f0edeb]">
            <button
              onClick={() => setActiveTab("orders")}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ShoppingBagIcon className="w-5 h-5 text-textColor/70" strokeWidth={2} />
                <span className="font-semibold text-textColor">
                  {t("profile.myOrders")}
                </span>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-[#526069]/40" strokeWidth={2.5} />
            </button>

            <button
              onClick={() => setActiveTab("saved-items")}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <HeartIcon className="w-5 h-5 text-[#0e6877]" strokeWidth={2} />
                <span className="font-semibold text-textColor">
                  {t("profile.favorites")}
                </span>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-[#526069]/40" strokeWidth={2.5} />
            </button>

            <button
              onClick={() => setActiveTab("ranking")}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <TrophyIcon className="w-5 h-5 text-amber-500" strokeWidth={2} />
                <span className="font-semibold text-textColor">
                  {t("profile.membership")}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-black text-[9px] uppercase px-2.5 py-0.5 rounded shadow-xs ${badgeColor}`}
                >
                  ★ {tierBadge}
                </span>
                <ChevronRightIcon className="w-4 h-4 text-[#526069]/40" strokeWidth={2.5} />
              </div>
            </button>
          </div>
        </div>

        {/* Section 2: Account */}
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-extrabold text-[#526069]/55 uppercase tracking-widest pl-2">
            {t("profile.section.settings")}
          </h3>
          <div className="bg-white rounded-2xl border border-[#f0edeb] overflow-hidden shadow-xs divide-y divide-[#f0edeb]">
            <button
              onClick={() => setIsAddressModalOpen(true)}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <MapPinIcon className="w-5 h-5 text-textColor/70" strokeWidth={2} />
                <span className="font-semibold text-textColor">
                  {t("profile.addresses")}
                </span>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-[#526069]/40" strokeWidth={2.5} />
            </button>

            <button
              onClick={() => setIsVoucherModalOpen(true)}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <TicketIcon className="w-5 h-5 text-purple-600" strokeWidth={2} />
                <span className="font-semibold text-textColor">
                  {t("profile.myVouchers")}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="bg-teal-50 text-teal-600 font-bold text-[10px] px-2 py-0.5 rounded-full">
                  {userVouchersCount > 0 ? `${userVouchersCount} codes` : ""}
                </span>
                <ChevronRightIcon className="w-4 h-4 text-[#526069]/40" strokeWidth={2.5} />
              </div>
            </button>

            <button
              onClick={() => setIsLuckyWheelOpen(true)}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <SparklesIcon className="w-5 h-5 text-amber-500" strokeWidth={2} />
                <span className="font-semibold text-textColor">
                  {t("profile.luckyWheel")}
                </span>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-[#526069]/40" strokeWidth={2.5} />
            </button>

            <button
              onClick={() => setIsVoucherExchangeOpen(true)}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <GiftIcon className="w-5 h-5 text-rose-500" strokeWidth={2} />
                <span className="font-semibold text-textColor">
                  {t("profile.exchangeVoucher")}
                </span>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-[#526069]/40" strokeWidth={2.5} />
            </button>

            {/* Language Switcher */}
            <div className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent">
              <div className="flex items-center gap-3">
                <LanguageIcon className="w-5 h-5 text-[#0e6877]" strokeWidth={2} />
                <span className="font-semibold text-textColor">
                  {t("lang.switch")}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setLanguage(lang === "vi" ? "en" : "vi")}
                  className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-wider rounded-lg border-none cursor-pointer active:scale-95 transition-all"
                >
                  {lang === "vi" ? "🇻🇳 Tiếng Việt (➔ EN)" : "🇬🇧 English (➔ VI)"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: General & CSKH */}
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-extrabold text-[#526069]/55 uppercase tracking-widest pl-2">
            {t("profile.section.general")}
          </h3>
          <div className="bg-white rounded-2xl border border-[#f0edeb] overflow-hidden shadow-xs divide-y divide-[#f0edeb]">
            <button
              onClick={() => setActiveTab("notifications")}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <BellIcon className="w-5 h-5 text-textColor/70" strokeWidth={2} />
                <span className="font-semibold text-textColor">
                  {t("tab.notifications")}
                </span>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-[#526069]/40" strokeWidth={2.5} />
            </button>

            {/* CSKH / Help Center Button */}
            <button
              onClick={() => {
                setActiveStaticPageSlug("help-support");
                setIsHelpModalOpen(true);
              }}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <QuestionMarkCircleIcon className="w-5 h-5 text-[#0e6877]" strokeWidth={2} />
                <span className="font-semibold text-textColor">
                  {t("help.title")}
                </span>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-[#526069]/40" strokeWidth={2.5} />
            </button>

            <button
              onClick={() => {
                setActiveStaticPageSlug("about-shopquiet");
                setIsHelpModalOpen(true);
              }}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <InformationCircleIcon className="w-5 h-5 text-textColor/70" strokeWidth={2} />
                <span className="font-semibold text-textColor">
                  {t("profile.about")}
                </span>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-[#526069]/40" strokeWidth={2.5} />
            </button>

            {/* Follow Zalo Official Account */}
            <button
              onClick={() => {
                try {
                  const apiAny = require("zmp-sdk") as any;
                  if (apiAny && apiAny.openOutApp) {
                    apiAny.openOutApp({ url: cmsSettings["brand.zalo_oa_url"] || "https://zalo.me" });
                  } else {
                    window.open(cmsSettings["brand.zalo_oa_url"] || "https://zalo.me", "_blank");
                  }
                  showToast("Mở Zalo Official Account...", "info");
                } catch (e) {
                  window.open("https://zalo.me", "_blank");
                }
              }}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600" strokeWidth={2} />
                <span className="font-semibold text-textColor">
                  {t("help.zaloOa")}
                </span>
              </div>
              <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Zalo OA
              </span>
            </button>

            {/* Share Mini App */}
            <button
              onClick={() => {
                try {
                  const apiAny = require("zmp-sdk") as any;
                  if (apiAny && apiAny.shareApp) {
                    apiAny.shareApp({
                      title: "ShopQuiet - Thương Mại Điện Tử Zalo Mini App",
                      path: "pages/home/index",
                    });
                  }
                  showToast("Đã mở cửa sổ chia sẻ Mini App!", "success");
                } catch (e) {
                  showToast("Tính năng chia sẻ chỉ hoạt động trong Zalo App", "info");
                }
              }}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ShareIcon className="w-5 h-5 text-teal-600" strokeWidth={2} />
                <span className="font-semibold text-textColor">
                  {t("help.shareApp")}
                </span>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-[#526069]/40" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Compact & Elegant Referral System Banner */}
        <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 rounded-2xl p-3.5 border border-teal-200/70 shadow-xs mt-4 mb-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#0e6877] text-white flex items-center justify-center shrink-0 shadow-xs">
              <UserPlusIcon className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 text-left">
              <h4 className="text-xs font-bold text-slate-800 truncate">
                {t("profile.referralTitle")} <span className="text-[#0e6877] font-extrabold">+50 Xu</span>
              </h4>
              <p className="text-[10px] text-slate-500 font-medium truncate">
                Mã: <span className="font-mono font-bold text-[#0e6877] underline">REF-{zaloUser?.id ? zaloUser.id.substring(0, 6) : "SHOP"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                const refCode = `REF-${zaloUser?.id || "SHOPQUIET"}`;
                navigator.clipboard?.writeText(refCode).catch(() => {});
                showToast(`Đã sao chép mã: ${refCode}`, "success");
              }}
              className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 active:scale-95 transition-all cursor-pointer shadow-xs"
              title={t("profile.copyCode")}
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const shareText = `Tặng bạn voucher giảm giá khi mua sắm tại ShopQuiet Zalo Mini App! Mã giới thiệu: REF-${zaloUser?.id || "VIP"}`;
                if (navigator.share) {
                  navigator.share({ title: "ShopQuiet Zalo Mini App", text: shareText }).catch(() => {});
                } else {
                  navigator.clipboard?.writeText(shareText).catch(() => {});
                  showToast("Đã sao chép liên kết giới thiệu!", "success");
                }
              }}
              className="px-3 py-2 bg-[#0e6877] hover:bg-[#0f766e] text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs active:scale-95 transition-all border-none cursor-pointer"
            >
              <ShareIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>{t("profile.shareBtn")}</span>
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
        onApplyVoucher={(code) => {
          setIsVoucherModalOpen(false);
          setIsCartOpen(true);
          showToast(`Đã chọn mã ${code}! Giỏ hàng đã được mở.`, "success");
        }}
      />

      {/* Static Info Page / CSKH Help Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up text-left">
            <div className="flex items-center justify-between border-b border-[#f5f3f0] pb-3">
              <h3 className="text-xs font-bold text-textColor uppercase tracking-wider flex items-center gap-2">
                <QuestionMarkCircleIcon className="w-5 h-5 text-[#0e6877]" strokeWidth={2} />
                {activeStaticPage?.title || t("help.title")}
              </h3>
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="p-1 bg-neutral-100 rounded-full border-none cursor-pointer text-slate-500 hover:bg-neutral-200"
              >
                <XMarkIcon className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-textColor-variant">
              {(
                activeStaticPage?.content ||
                t("help.welcome")
              )
                .split("\n")
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              <div className="bg-teal-50/70 p-3.5 rounded-2xl border border-teal-100 font-mono text-[11px] text-[#0e6877] space-y-1.5">
                <p className="flex items-center gap-2 font-bold">
                  <PhoneIcon className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                  <span>{t("help.hotline")}: {activeStaticPage?.contactPhone || cmsSettings["support.hotline"] || "1900 6868"}</span>
                </p>
                <p className="flex items-center gap-2 font-bold">
                  <EnvelopeIcon className="w-4 h-4 text-blue-600" strokeWidth={2} />
                  <span>{t("help.email")}: {activeStaticPage?.contactEmail || cmsSettings["support.email"] || "support@shopquiet.vn"}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsHelpModalOpen(false)}
              className="w-full h-10 bg-[#0e6877] text-white font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-[#0f766e] active:scale-95 transition-all shadow-xs mt-2"
            >
              {t("help.close")}
            </button>
          </div>
        </div>
      )}

      {/* Registered Users Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up flex flex-col max-h-[80vh] text-left">
            <h3 className="text-xs font-bold text-textColor uppercase tracking-wider">
              Người dùng đã đăng nhập
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {usersList.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-8">
                  Chưa có người dùng nào đăng ký.
                </p>
              ) : (
                usersList.map((usr: any) => (
                  <div
                    key={usr.id}
                    className="p-3 border border-neutral-100 bg-neutral-50/50 rounded-2xl flex gap-3 items-center"
                  >
                    <img
                      src={usr.avatar}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover border border-neutral-200"
                    />
                    <div>
                      <p className="font-bold text-xs text-textColor">
                        {usr.name}
                      </p>
                      <p className="text-[10px] text-textColor-variant">
                        ZaloID: {usr.zaloId}
                      </p>
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

      {/* Voucher Exchange Modal */}
      <VoucherExchangeModal
        isOpen={isVoucherExchangeOpen}
        onClose={() => setIsVoucherExchangeOpen(false)}
        gamificationData={gamificationData}
        exchangeVoucher={exchangeVoucher}
        onExchangeSuccess={fetchOrdersAndProducts}
      />
      {/* Auth Modal (Login / Register / Forgot Password) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </PageCast>
  );
};
export default Profile;
