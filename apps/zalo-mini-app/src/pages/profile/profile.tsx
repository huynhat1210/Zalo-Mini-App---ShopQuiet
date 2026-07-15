import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Page } from 'zmp-ui';
import { useCart, IProduct, IOrder } from '../../App';
import { apiRequest } from '../../utils/api';
import { EmptyStateComponent } from '../../components';
import { IProfileProps } from './profile.type';
import api from 'zmp-sdk';

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

const profileAddressSchema = z.object({
  label: z.string().trim().min(2, 'Vui lòng nhập tên nhãn'),
  phone: z.string().trim().min(9, 'Số điện thoại không hợp lệ').regex(/^[0-9]{9,11}$/, 'Số điện thoại không hợp lệ'),
  street: z.string().trim().min(5, 'Vui lòng nhập địa chỉ chi tiết'),
  city: z.string().trim().min(2, 'Vui lòng nhập tỉnh/thành phố'),
});

type ProfileAddressFormValues = z.infer<typeof profileAddressSchema>;

export const Profile: React.FC<IProfileProps> = (props) => {
  const { initialSubPage = 'profile' } = props;
  const { setActiveTab, setSelectedProductDetail, showToast, zaloUser, updateZaloUser, setSelectedOrder, savedItems, setIsCartOpen, cart, logout } = useCart();
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [recommendationProducts, setRecommendationProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ShopeeFood style tabs state
  const [ordersTab, setOrdersTab] = useState<'active' | 'history' | 'reviews'>('active');

  // User reviews state (for reviews tab)
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Show ranking info modal state on the ranking page
  const [showRankingInfo, setShowRankingInfo] = useState(false);

  // Review Modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState('');
  const [reviewProductId, setReviewProductId] = useState<number | null>(null);
  const [reviewProductName, setReviewProductName] = useState('');
  const [reviewProductSize, setReviewProductSize] = useState('');
  const [reviewProductQuantity, setReviewProductQuantity] = useState(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleOpenReviewModal = (orderId: string, productId: number, productName: string, size?: string, quantity?: number) => {
    setReviewOrderId(orderId);
    setReviewProductId(productId);
    setReviewProductName(productName);
    setReviewProductSize(size || 'DEFAULT');
    setReviewProductQuantity(quantity || 1);
    setReviewRating(5);
    setReviewComment('');
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewProductId || !reviewComment.trim()) {
      showToast('Vui lòng nhập bình luận nhận xét!', 'warning');
      return;
    }
    setSubmittingReview(true);
    try {
      const sizeText = reviewProductSize && reviewProductSize !== 'DEFAULT' ? ` - Size: ${reviewProductSize}` : '';
      const formattedComment = `[Đã mua: ${reviewProductName} x${reviewProductQuantity}${sizeText}] ${reviewComment}`;
      
      const res = await apiRequest<any>(`/products/${reviewProductId}/comments`, 'POST', {
        content: formattedComment,
        rating: reviewRating,
        orderId: reviewOrderId
      });
      
      if (res) {
        setOrders(prevOrders => 
          prevOrders.map(o => {
            if (o.id === reviewOrderId) {
              return {
                ...o,
                items: (o.items || []).map((item: any) => {
                  if (item.product?.id === reviewProductId) {
                    return { ...item, isReviewed: true };
                  }
                  return item;
                })
              };
            }
            return o;
          })
        );
        setIsReviewModalOpen(false);
        showToast('Đánh giá sản phẩm thành công!', 'success');
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Gửi đánh giá thất bại!', 'warning');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [userVouchers, setUserVouchers] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [cmsSettings, setCmsSettings] = useState<Record<string, string>>({});
  const [staticPages, setStaticPages] = useState<CmsStaticPage[]>([]);
  const [activeStaticPageSlug, setActiveStaticPageSlug] = useState('help-support');

  // DB address state
  const [addresses, setAddresses] = useState<any[]>([]);
  const [activeAddressId, setActiveAddressId] = useState<string>('');

  // Add/Edit Address Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const {
    register: registerAddress,
    handleSubmit: handleAddressSubmit,
    reset: resetAddressForm,
    formState: { errors: addressErrors },
  } = useForm<ProfileAddressFormValues>({
    resolver: zodResolver(profileAddressSchema),
    defaultValues: {
      label: '',
      phone: '',
      street: '',
      city: '',
    },
  });

  // Profile details dynamically linked to Zalo User Auth
  const profile = {
    name: zaloUser?.name || cmsSettings['profile.defaultName'] || '',
    phone: zaloUser?.phone || cmsSettings['profile.defaultPhone'] || '',
    email: zaloUser?.email || cmsSettings['profile.defaultEmail'] || '',
    avatar: zaloUser?.avatar || cmsSettings['profile.defaultAvatar'] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    zaloId: zaloUser?.id || 'cust-zalo-id-1',
    birthday: zaloUser?.birthday || '',
  };

  const handleSelectAddress = async (id: number) => {
    try {
      await apiRequest(`/addresses/${id}/default`, 'PATCH');
      await fetchAddresses();
      showToast('Đã đặt làm địa chỉ mặc định!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Không thể đặt làm địa chỉ mặc định!', 'warning');
    }
  };

  // Edit fields states
  const [editName, setEditName] = useState(profile.name);
  const [editAvatar, setEditAvatar] = useState(profile.avatar);
  const [editPhone, setEditPhone] = useState(zaloUser?.phone || '');
  const [editEmail, setEditEmail] = useState(zaloUser?.email || '');
  const [editBirthday, setEditBirthday] = useState(zaloUser?.birthday || '');

  // Birthday split state for 3-select picker
  const parseBirthday = (val: string) => {
    if (!val) return { d: '', m: '', y: '' };
    const parts = val.split('-');
    if (parts.length === 3) return { d: parts[2], m: parts[1], y: parts[0] };
    return { d: '', m: '', y: '' };
  };
  const bday = parseBirthday(editBirthday);
  const [bdDay, setBdDay] = useState(bday.d);
  const [bdMonth, setBdMonth] = useState(bday.m);
  const [bdYear, setBdYear] = useState(bday.y);

  useEffect(() => {
    const b = parseBirthday(editBirthday);
    setBdDay(b.d); setBdMonth(b.m); setBdYear(b.y);
  }, [editBirthday]);

  const handleBirthdayChange = (d: string, m: string, y: string) => {
    if (d && m && y) setEditBirthday(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
    else setEditBirthday('');
  };

  useEffect(() => {
    setEditName(zaloUser?.name || profile.name);
    setEditAvatar(zaloUser?.avatar || profile.avatar);
    setEditPhone(zaloUser?.phone || '');
    setEditEmail(zaloUser?.email || '');
    setEditBirthday(zaloUser?.birthday || '');
  }, [zaloUser]);

  // Auto-fetch phone from Zalo when edit profile modal opens and phone is empty
  const fetchZaloPhone = async () => {
    const apiAny = api as any;
    const handleDecrypt = async (token: string) => {
      const res = await apiRequest<{ success: boolean; phone?: string }>('/auth/decrypt-phone', 'POST', {
        zaloId: zaloUser?.id || 'guest',
        token,
      });
      if (res.success && res.phone) {
        setEditPhone(res.phone);
        return true;
      }
      return false;
    };

    if (apiAny && apiAny.getPhoneNumber) {
      apiAny.getPhoneNumber({
        success: async (data: any) => {
          if (data?.token) {
            try {
              await handleDecrypt(data.token);
            } catch (err) {
              console.error(err);
            }
          }
        },
        fail: (err: any) => {
          // Zalo SDK failed - leave phone field empty, user will enter manually
          console.error('getPhoneNumber fail', err);
        }
      });
    }
    // No browser/mock fallback - only fill from real Zalo SDK
  };

  useEffect(() => {
    if (isEditProfileOpen && !editPhone) {
      fetchZaloPhone();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditProfileOpen]);

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

  const fetchAddresses = async () => {
    try {
      const fetched = await apiRequest<any[]>('/addresses');
      setAddresses(fetched);
      const active = fetched.find(a => a.isDefault) || fetched[0];
      if (active) {
        setActiveAddressId(active.id.toString());
        const userId = zaloUser?.id || 'cust-zalo-id-1';
        localStorage.setItem(`shipping_address_${userId}`, JSON.stringify({
          name: zaloUser?.name || 'Alex Johnson',
          street: active.street,
          city: active.city,
          phone: active.phone
        }));
      } else {
        setActiveAddressId('');
      }
    } catch (e) {
      console.error('Failed to fetch addresses:', e);
    }
  };

  const fetchOrdersAndProducts = async () => {
    const userId = zaloUser?.id || 'cust-zalo-id-1';
    try {
      const [fetchedOrders, fetchedProducts] = await Promise.all([
        apiRequest<IOrder[]>('/orders'),
        apiRequest<any>('/products?page=1&limit=10')
      ]);
      setOrders(fetchedOrders);
      const productList = Array.isArray(fetchedProducts) ? fetchedProducts : (fetchedProducts?.data || []);
      const recs = productList.slice(0, 3);
      setRecommendationProducts(recs);

      // Save fresh data to cache
      localStorage.setItem(`cache_orders_${userId}`, JSON.stringify(fetchedOrders));
      localStorage.setItem('cache_rec_products', JSON.stringify(recs));
    } catch (err) {
      console.error('Failed to fetch profile page data:', err);
      // Fallback to localStorage if server is down
      const local = JSON.parse(localStorage.getItem(`offline_orders_${userId}`) || '[]');
      setOrders(local);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserReviews = async () => {
    setLoadingReviews(true);
    try {
      const res = await apiRequest<any[]>('/users/me/reviews');
      setUserReviews(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('Failed to fetch user reviews:', e);
      setUserReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    const userId = zaloUser?.id || 'cust-zalo-id-1';
    if (typeof window !== 'undefined') {
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
    }
    fetchOrdersAndProducts();
    fetchAddresses();
  }, [zaloUser?.id]);

  // Fetch user reviews when the reviews tab is selected
  useEffect(() => {
    if (ordersTab === 'reviews') {
      fetchUserReviews();
    }
  }, [ordersTab]);

  useEffect(() => {
    if (!showAddForm) {
      resetAddressForm({
        label: '',
        phone: '',
        street: '',
        city: '',
      });
      setEditingAddressId(null);
    }
  }, [showAddForm, resetAddressForm]);

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

  const handleLogout = async () => {
    await logout();
    showToast('Đã đăng xuất tài khoản!', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const activeOrdersList = orders.filter(
    (o) => o.status === 'PROCESSING' || o.status === 'PENDING' || o.status === 'SHIPPED' || o.status === 'PENDING_PAYMENT'
  );
  
  const historyOrdersList = orders.filter(
    (o) => o.status === 'COMPLETED' || o.status === 'DELIVERED' || o.status === 'CANCELLED'
  );

  const reviewsOrdersList = orders.filter(
    (o) => o.status === 'COMPLETED' || o.status === 'DELIVERED'
  );

  const displayedOrders = 
    ordersTab === 'active' ? activeOrdersList :
    ordersTab === 'history' ? historyOrdersList :
    ordersTab === 'reviews' ? reviewsOrdersList : [];
  const activeStaticPage =
    staticPages.find((page) => page.slug === activeStaticPageSlug) ||
    staticPages.find((page) => page.slug === 'help-support');

  if (initialSubPage === 'ranking') {
    return (
      <PageCast className="bg-[#f7f7f7] relative flex flex-col w-full h-full overscroll-none scrollbar-none animate-fade-in text-left">
        {/* Header */}
        <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-[#f0edeb] sticky top-0 z-30 shadow-xs">
          <button onClick={() => setActiveTab('profile')} className="p-1.5 -ml-1.5 hover:bg-[#f0edeb] rounded-full transition-colors border-none bg-transparent cursor-pointer">
            <svg className="w-5.5 h-5.5 text-textColor" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-xs font-bold uppercase tracking-widest text-textColor">Hạng thành viên</span>
          <button 
            onClick={() => setShowRankingInfo(true)} 
            className="p-1.5 -mr-1.5 hover:bg-[#f0edeb] rounded-full transition-colors border-none bg-transparent cursor-pointer relative"
          >
            <svg className="w-5.5 h-5.5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </button>
        </div>

        {/* Info Explanatory Overlay if open */}
        {showRankingInfo && (
          <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-6" onClick={() => setShowRankingInfo(false)}>
            <div className="bg-white rounded-3xl p-6 border border-[#f0edeb] shadow-2xl max-w-xs space-y-4 animate-scale-up" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <span>Quy chế hoạt động</span>
              </div>
              <p className="text-xs text-textColor leading-relaxed font-medium">
                Hạng thành viên được tự động nâng cấp dựa trên tổng chi tiêu tích lũy của bạn tại hệ thống ShopQuiet.
              </p>
              <p className="text-xs text-textColor leading-relaxed font-medium">
                Mỗi khi hoàn thành một đơn hàng, giá trị đơn hàng sẽ được cộng trực tiếp vào tổng chi tiêu tích lũy của bạn để xét hạng.
              </p>
              <button 
                onClick={() => setShowRankingInfo(false)} 
                className="w-full h-9 bg-primary text-white text-[11px] font-bold uppercase tracking-wider rounded-xl border-none cursor-pointer active:scale-95 transition-all"
              >
                Đồng ý
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5.5 space-y-6 pb-28">
          {/* User Current Tier Status Card */}
          <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-primary text-white rounded-3xl p-5 shadow-md relative overflow-hidden">
            <div className="absolute inset-0 opacity-15" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='0.4' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E\")"}} />
            
            <div className="flex items-center gap-4 relative z-10">
              <img src={profile.avatar} alt={profile.name} className="w-14 h-14 rounded-full border-2 border-white/80 object-cover shadow-sm" />
              <div className="flex-1 text-left space-y-0.5">
                <p className="text-xs font-semibold text-white/70">Thành viên hiện tại</p>
                <h3 className="text-base font-bold tracking-tight">{profile.name}</h3>
                <span className="inline-block mt-1 bg-amber-400 text-teal-950 font-black text-[9px] uppercase px-2.5 py-0.5 rounded shadow-xs">★ BẠC</span>
              </div>
            </div>

            {/* Spent progress bar */}
            <div className="mt-5 space-y-1.5 relative z-10 text-left">
              <div className="flex justify-between items-center text-[10px] text-white/85 font-medium">
                <span>Chi tiêu: 2.500.000 đ</span>
                <span>Mục tiêu Gold: 10.000.000 đ</span>
              </div>
              <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: '25%' }}></div>
              </div>
              <p className="text-[10px] text-white/70 italic text-center mt-1">Cần mua thêm 7.500.000 đ để lên hạng Vàng</p>
            </div>
          </div>

          {/* Member tiers list */}
          <div className="space-y-4 text-left">
            <h3 className="text-[10px] font-extrabold text-[#526069]/55 uppercase tracking-widest pl-1">Danh sách phân hạng</h3>
            {[
              { level: 'Đồng', color: 'bg-white text-textColor border-[#f0edeb]', badge: '🥉', min: '0đ', max: '1.999.999đ', perks: ['Tích điểm x1', 'Ưu đãi sản phẩm cơ bản', 'Hỗ trợ tiêu chuẩn'] },
              { level: 'Bạc', color: 'bg-white text-textColor border-[#f0edeb]', badge: '🥈', min: '2.000.000đ', max: '9.999.999đ', perks: ['Tích điểm x1.5', 'Miễn phí vận chuyển đơn >200k', 'Ưu đãi thành viên hàng tháng', 'Hỗ trợ ưu tiên'], current: true },
              { level: 'Vàng', color: 'bg-white text-textColor border-[#f0edeb]', badge: '🥇', min: '10.000.000đ', max: '49.999.999đ', perks: ['Tích điểm x2', 'Miễn phí vận chuyển mọi đơn', 'Flash sale độc quyền', 'Hoàn tiền 5%', 'Hỗ trợ 24/7'] },
              { level: 'Kim cương', color: 'bg-white text-textColor border-[#f0edeb]', badge: '💎', min: '50.000.000đ', max: 'Không giới hạn', perks: ['Tích điểm x3', 'Miễn phí ship & đổi trả tự do', 'Early access sản phẩm mới', 'Hoàn tiền 10%', 'Quản lý tài khoản cá nhân'] },
            ].map(tier => (
              <div key={tier.level} className={`border rounded-2xl p-4.5 space-y-3 bg-white relative transition-all shadow-xs ${tier.current ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                {tier.current && (
                  <span className="absolute top-4 right-4 bg-primary text-white font-extrabold text-[8px] uppercase px-2 py-0.5 rounded-full tracking-wider">Hạng hiện tại</span>
                )}
                <div className="flex justify-between items-center pb-2 border-b border-[#f0edeb]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{tier.badge}</span>
                    <div>
                      <p className="font-bold text-xs text-textColor">Hạng {tier.level}</p>
                      <p className="text-[10px] text-textColor-variant/70 mt-0.5">Yêu cầu tích lũy: {tier.min} – {tier.max}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-extrabold text-[#526069]/55 uppercase tracking-widest">Đặc quyền nhận được:</p>
                  <ul className="grid grid-cols-1 gap-2">
                    {tier.perks.map(perk => (
                      <li key={perk} className="text-xs text-textColor-variant flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-primary flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageCast>
    );
  }

  if (initialSubPage === 'orders') {
    return (
      <PageCast className="bg-surface relative flex flex-col w-full h-full overscroll-none scrollbar-none">
        {/* Header - ShopeeFood inspired layout */}
        <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-[#f0edeb] sticky top-0 z-30 shadow-xs">
          <button onClick={() => setActiveTab('home')} className="p-1.5 -ml-1.5 hover:bg-[#f0edeb] rounded-full transition-colors">
            <svg className="w-5.5 h-5.5 text-textColor" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-xs font-bold uppercase tracking-widest text-textColor">Đơn hàng</span>
          <button className="p-1.5 -mr-1.5 hover:bg-[#f0edeb] rounded-full transition-colors">
            <svg className="w-5 h-5 text-textColor" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {/* Top Tab Bar - ShopeeFood style */}
        <div className="bg-white flex border-b border-[#f0edeb] px-2 overflow-x-auto scrollbar-none sticky top-[53px] z-20">
          {[
            { id: 'active', label: 'Đang đến' },
            { id: 'history', label: 'Lịch sử' },
            { id: 'reviews', label: 'Đánh giá' }
          ].map((tab) => {
            const isTabActive = ordersTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setOrdersTab(tab.id as any)}
                className={`flex-1 py-3.5 text-xs text-center font-bold tracking-wide relative whitespace-nowrap min-w-[80px] transition-all border-none ${
                  isTabActive ? 'text-primary' : 'text-[#526069]'
                }`}
              >
                {tab.label}
                {isTabActive && (
                  <div className="absolute bottom-0 left-4 right-4 h-[2.5px] bg-primary rounded-full animate-fade-in"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable container content */}
        <div className="flex-1 overflow-y-auto px-6 py-5.5 space-y-7 pb-28">
          {/* Main Display List */}
          {ordersTab === 'reviews' ? (
            /* REVIEWS TAB - show user's submitted reviews */
            loadingReviews ? (
              <div className="text-center py-10 text-textColor-variant text-xs font-medium">Đang tải đánh giá...</div>
            ) : userReviews.length === 0 ? (
              <EmptyStateComponent
                title="Chưa có đánh giá nào"
                description="Sau khi mua hàng hoàn tất, bạn có thể đánh giá sản phẩm tại tab Lịch sử."
                actionText="Xem lịch sử mua hàng"
                onAction={() => setOrdersTab('history')}
              />
            ) : (
              <div className="space-y-4 animate-fade-in">
                {userReviews.map((review) => {
                  let img = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80';
                  try {
                    const parsed = JSON.parse(review.product?.images || '[]');
                    if (parsed && parsed.length > 0) img = parsed[0];
                  } catch (e) {}
                  return (
                    <div
                      key={review.id}
                      onClick={() => {
                        const prod = { id: review.product?.id, name: review.product?.name, images: review.product?.images };
                        if (prod.id) setSelectedProductDetail(prod as any);
                      }}
                      className="bg-white rounded-2xl border border-[#f0edeb] p-4.5 space-y-3 shadow-xs hover:border-primary/30 transition-all cursor-pointer"
                    >
                      {/* Product row */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#f0edeb] bg-neutral-50 flex-shrink-0">
                          <img src={img} alt={review.product?.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-textColor line-clamp-1">{review.product?.name || 'Sản phẩm'}</p>
                          <p className="text-[10px] text-textColor-variant mt-0.5">
                            {new Date(review.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        {/* Stars */}
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {[1,2,3,4,5].map(star => (
                            <svg key={star} className={`w-3.5 h-3.5 ${star <= (review.rating || 5) ? 'text-amber-400' : 'text-neutral-200'}`} viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      {/* Review content */}
                      <div className="bg-neutral-50 rounded-xl px-4 py-3">
                        <p className="text-xs text-textColor leading-relaxed">{review.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : loading ? (
            <div className="text-center py-10 text-textColor-variant text-xs font-medium">Đang tải đơn hàng...</div>
          ) : displayedOrders.length === 0 ? (
            <EmptyStateComponent
              title={ordersTab === 'active' ? 'Quên chưa đặt sản phẩm rồi nè bạn ơi?' : 'Chưa có lịch sử mua hàng'}
              description={ordersTab === 'active'
                ? 'Bạn sẽ nhìn thấy các đơn hàng đang được chuẩn bị hoặc giao đi tại đây để kiểm tra đơn hàng nhanh hơn!'
                : 'Khám phá các sản phẩm tối giản cao cấp của chúng tôi để mua sắm ngay.'}
              actionText="Mua sắm ngay"
              onAction={() => setActiveTab('home')}
            />
          ) : (
            /* Orders List displaying */
            <div className="space-y-4 animate-fade-in">
              {displayedOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(order);
                    setActiveTab('order-detail');
                  }}
                  className="bg-white rounded-2xl border border-[#f0edeb] p-4.5 space-y-3.5 shadow-xs hover:border-primary/40 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-center pb-2.5 border-b border-[#f0edeb]">
                    <div>
                      <span className="text-xs font-bold text-textColor">Mã đơn #{order.id}</span>
                      <span className="text-[10px] text-textColor-variant block mt-0.5 font-medium">
                        {new Date(order.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      order.status === 'DELIVERED' ? 'bg-green-50 text-green-700' :
                      order.status === 'SHIPPED' ? 'bg-blue-50 text-blue-700' :
                      order.status === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                      order.status === 'PENDING_PAYMENT' ? 'bg-orange-50 text-orange-600' :
                      'bg-yellow-50 text-yellow-700'
                    }`}>
                      {order.status === 'DELIVERED' ? 'Hoàn thành' :
                       order.status === 'SHIPPED' ? 'Đang giao' :
                       order.status === 'PROCESSING' ? 'Đang xử lý' :
                       order.status === 'CANCELLED' ? 'Đã hủy' :
                       order.status === 'PENDING_PAYMENT' ? 'Chờ thanh toán' :
                       order.status}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-textColor-variant">
                        <span className="line-clamp-1 max-w-[180px] text-left">
                          {item.product?.name}
                          {item.size && item.size !== 'DEFAULT' && (
                            <span className="ml-1.5 text-[9px] bg-neutral-100 text-[#526069] px-1 py-0.5 rounded font-bold uppercase">
                              {item.size}
                            </span>
                          )}
                          <span className="font-semibold text-textColor ml-1">x{item.quantity}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-textColor">{(item.price * item.quantity).toLocaleString('vi-VN')} đ</span>
                          {(order.status === 'COMPLETED' || order.status === 'DELIVERED') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.isReviewed) {
                                  showToast('Sản phẩm đã được đánh giá!', 'info');
                                  return;
                                }
                                handleOpenReviewModal(String(order.id), item.product?.id, item.product?.name, item.size, item.quantity);
                              }}
                              className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${
                                item.isReviewed
                                  ? 'bg-neutral-100 text-neutral-450 border-neutral-200'
                                  : 'bg-primary text-white border-primary active:scale-95'
                              }`}
                            >
                              {item.isReviewed ? 'Đã đánh giá' : 'Đánh giá'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* IOrder tracking status timeline or payment pending banner */}
                  {order.status === 'PENDING_PAYMENT' ? (
                    <div className="pt-3 border-t border-[#f0edeb] space-y-2.5">
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2.5">
                        <span className="text-orange-500 text-lg mt-0.5">•</span>
                        <div className="text-xs">
                          <p className="font-bold text-orange-700">Chờ thanh toán ZaloPay</p>
                          <p className="text-orange-600/80 text-[10px] mt-0.5 leading-relaxed">Đơn hàng này chưa được thanh toán thành công. Bạn có thể thử lại hoặc hủy đơn này.</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setActiveTab('order-detail'); }}
                          className="flex-1 h-9 bg-[#007aff] text-white font-bold text-[10px] uppercase tracking-wider rounded-xl border-none cursor-pointer active:scale-95 transition-all"
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  ) : (
                  <div className="pt-3 border-t border-[#f0edeb] space-y-3">
                    <div className="text-[9px] font-extrabold text-[#526069]/65 uppercase tracking-widest text-left">Lịch trình đơn hàng</div>
                    
                    <div className="flex flex-col gap-3 pl-2.5 relative border-l-2 border-neutral-100 mt-1.5 text-left">
                      {[
                        { label: 'Đã nhận đơn hàng', desc: 'Hệ thống đã ghi nhận đơn thành công', active: true },
                        { label: 'Đang chuẩn bị', desc: 'Kho hàng đang đóng gói sản phẩm của bạn', active: order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'DELIVERED' },
                        { label: 'Đang giao hàng', desc: 'Đơn hàng đã bàn giao cho đơn vị vận chuyển', active: order.status === 'SHIPPED' || order.status === 'DELIVERED' },
                        { label: 'Đã hoàn thành', desc: 'Đơn hàng đã được giao nhận thành công', active: order.status === 'DELIVERED' }
                      ].map((step, sIdx) => (
                        <div key={sIdx} className="relative pl-5 text-xs">
                          {/* Dot indicator */}
                          <div className={`absolute left-[-16px] top-[3px] w-2.5 h-2.5 rounded-full border-2 ${
                            step.active 
                              ? 'bg-primary border-primary shadow-xs scale-105' 
                              : 'bg-white border-neutral-300'
                          }`} />
                          
                          <div className="space-y-0.5">
                            <p className={`font-bold ${step.active ? 'text-textColor' : 'text-textColor-variant/50'}`}>{step.label}</p>
                            <p className={`text-[10px] ${step.active ? 'text-textColor-variant' : 'text-textColor-variant/40'}`}>{step.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  <div className="flex justify-between items-center pt-2.5 border-t border-[#f0edeb] text-xs font-bold text-textColor">
                    <span>Tổng tiền</span>
                    <span className="text-primary">{order.totalAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendation Divider Section (ShopeeFood style) */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-[1px] bg-neutral-200"></div>
              <span className="text-[9px] font-extrabold text-[#526069]/65 uppercase tracking-widest">Có thể bạn cũng thích</span>
              <div className="flex-1 h-[1px] bg-neutral-200"></div>
            </div>

            {/* Vertical Recommended list */}
            <div className="space-y-3.5">
              {recommendationProducts.map((prod) => {
                let img = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=200&q=80';
                try {
                  const parsed = JSON.parse(prod.images);
                  if (parsed && parsed.length > 0) img = parsed[0];
                } catch (e) {}

                return (
                  <div
                    key={prod.id}
                    onClick={() => setSelectedProductDetail(prod)}
                    className="bg-white rounded-2xl border border-[#f0edeb] p-3 flex gap-4 shadow-xs hover:shadow-sm transition-all duration-300 cursor-pointer"
                  >
                    {/* Thumbnail Image Left */}
                    <img
                      src={img}
                      alt={prod.name}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-[#f0edeb]"
                    />

                    {/* Details Info Right */}
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[7px] font-extrabold">✓</span>
                          <h4 className="text-xs font-bold text-textColor line-clamp-1">{prod.name}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-[9.5px] text-[#526069]/65 mt-0.5 font-medium">
                          <span>★ 4.8</span>
                          <span>•</span>
                          <span>{prod.category?.name}</span>
                          <span>•</span>
                          <span className="text-green-600">Còn hàng</span>
                        </div>
                      </div>

                      {/* Promo Tags and Price */}
                      <div className="flex justify-between items-end mt-2">
                        <div className="flex gap-1.5">
                          <span className="text-[8px] font-bold text-primary bg-primary-light px-2 py-0.5 rounded-md">
                            Freeship
                          </span>
                          <span className="text-[8px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                            Giảm 10%
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-textColor">{prod.price.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 6. Review Product Modal */}
        {isReviewModalOpen && (
          <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6 text-left">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-5 animate-scale-up">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
                <h3 className="text-xs font-black text-textColor uppercase tracking-wider">Đánh giá sản phẩm</h3>
                <button 
                  onClick={() => setIsReviewModalOpen(false)} 
                  className="text-neutral-400 hover:text-textColor border-none bg-transparent cursor-pointer font-bold text-xs p-1"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-1">
                <span className="text-[9px] bg-primary-light text-primary px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  {reviewProductSize !== 'DEFAULT' ? `Size: ${reviewProductSize}` : 'Free Size'}
                </span>
                <h4 className="text-xs font-bold text-textColor leading-snug line-clamp-2 mt-1">{reviewProductName}</h4>
                <p className="text-[10px] text-textColor-variant">
                  Số lượng mua: <span className="font-semibold text-textColor">x{reviewProductQuantity}</span>
                </p>
              </div>

              {/* Rating Stars Select */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-extrabold text-[#526069]/70 uppercase tracking-widest block">Độ hài lòng (Chọn sao)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-0 border-none bg-transparent cursor-pointer text-xl text-amber-500 hover:scale-110 active:scale-95 transition-transform"
                    >
                      {star <= reviewRating ? '★' : '☆'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment Area */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-extrabold text-[#526069]/70 uppercase tracking-widest block">Nhận xét của bạn</label>
                <textarea
                  rows={3}
                  placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full text-xs p-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:border-primary outline-none resize-none font-medium text-textColor leading-relaxed"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  disabled={submittingReview || !reviewComment.trim()}
                  onClick={handleSubmitReview}
                  className="flex-1 h-10 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-primary-dark disabled:bg-neutral-300 active:scale-98 transition-all"
                >
                  {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="h-10 px-4 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

      </PageCast>
    );
  }

  // Profile View
  return (
    <PageCast className="bg-[#f7f7f7] relative flex flex-col w-full h-full overscroll-none scrollbar-none">
      {/* Top Banner (ShopeeFood style / custom teal brand gradient) */}
      <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-primary text-white pt-6 pb-9 px-6 relative rounded-b-[32px] shadow-md">
        {/* Navigation Bar */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setActiveTab('home')} className="p-2 -ml-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full transition-colors border-none text-white cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-xs font-black uppercase tracking-[0.2em] font-sans">ShopQuiet ID</span>
          <button onClick={() => setIsEditProfileOpen(true)} className="p-2 -mr-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full transition-colors border-none text-white cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
          </button>
        </div>

        {/* User Card Row */}
        <div className="flex items-center gap-4.5">
          <div className="relative">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-19 h-19 rounded-full object-cover border-3 border-white/90 shadow-md"
            />
            {/* Verified Badge */}
            <span className="absolute bottom-0 right-0 w-5 h-5 bg-amber-400 text-teal-950 rounded-full flex items-center justify-center font-bold text-[9px] border-2 border-white shadow-xs">✓</span>
          </div>

          <div className="flex-1 text-left space-y-1.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight line-clamp-1">{profile.name}</h2>
              {/* Member Level Badge */}
              <span className="bg-amber-400 text-teal-950 font-black tracking-widest text-[8px] uppercase px-2 py-0.5 rounded flex items-center gap-1 shadow-xs animate-pulse">
                ★ BẠC
              </span>
            </div>

            <div className="space-y-0.5 text-[10.5px] text-white/80 font-medium">
              <p className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 opacity-75" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.387a12.035 12.035 0 01-7.108-7.108c-.155-.44.01-1.03.387-1.312l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.318A2.25 2.25 0 002.1 4.5v2.25z" />
                </svg>
                <span>{profile.phone || 'Chưa cập nhật số điện thoại'}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 opacity-75" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span>{profile.email || 'Chưa cập nhật email'}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 opacity-75" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M12 8.25v5.25m0 0l-3-3m3 3l3-3M3.375 19.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                <span>
                  {profile.birthday
                    ? new Date(profile.birthday).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })
                    : 'Chưa cập nhật ngày sinh'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Dashboard Counter Stats Card (Overlapping like ShopeeFood) */}
      <div className="mx-6 -mt-5 bg-white rounded-2xl p-4 shadow-sm border border-[#f0edeb] grid grid-cols-3 divide-x divide-neutral-100 z-10 relative text-center">
        <button onClick={() => setActiveTab('saved-items')} className="flex flex-col items-center justify-center border-none bg-transparent cursor-pointer active:scale-95 transition-transform">
          <span className="text-base font-extrabold text-textColor">{savedItems.length}</span>
          <span className="text-[10px] text-[#526069]/65 font-bold uppercase tracking-wider mt-1">Yêu thích</span>
        </button>
        <button onClick={() => setIsCartOpen(true)} className="flex flex-col items-center justify-center border-none bg-transparent cursor-pointer active:scale-95 transition-transform">
          <span className="text-base font-extrabold text-textColor">
            {cart.reduce((sum: number, item: any) => sum + item.quantity, 0)}
          </span>
          <span className="text-[10px] text-[#526069]/65 font-bold uppercase tracking-wider mt-1">Giỏ hàng</span>
        </button>
        <button onClick={() => setActiveTab('orders')} className="flex flex-col items-center justify-center border-none bg-transparent cursor-pointer active:scale-95 transition-transform">
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
                <span className="font-semibold text-textColor">Sản phẩm yêu thích</span>
              </div>
              <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            {/* Ranking section button */}
            <button
              onClick={() => setActiveTab('ranking')}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                </svg>
                <span className="font-semibold text-textColor">Hạng thành viên</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="bg-amber-400 text-teal-950 font-black text-[9px] uppercase px-2 py-0.5 rounded">★ BẠC</span>
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
              onClick={async () => {
                try {
                  const res = await apiRequest<any[]>('/vouchers');
                  setUserVouchers(Array.isArray(res) ? res : []);
                } catch { setUserVouchers([]); }
                setIsVoucherModalOpen(true);
              }}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-textColor/60" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <span className="font-semibold text-textColor">Ví Voucher</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="bg-teal-50 text-teal-600 font-bold text-[10px] px-2 py-0.5 rounded-full">{userVouchers.length > 0 ? `${userVouchers.length} mã` : ''}</span>
                <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a9.04 9.04 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-textColor">Thông báo</span>
              </div>
              <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            
            <button 
              onClick={() => {
                setActiveStaticPageSlug('help-support');
                setIsHelpModalOpen(true);
              }}
              className="w-full px-4.5 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-textColor/60" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <span className="font-semibold text-textColor">Về ShopQuiet</span>
              </div>
              <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full h-11 bg-white border border-[#eae8e6] text-red-500 font-extrabold text-xs uppercase tracking-wider rounded-2xl hover:bg-red-50 transition-all flex items-center justify-center shadow-xs cursor-pointer"
        >
          Đăng xuất tài khoản
        </button>
      </div>

      {/* MODALS RENDER SECTION */}
      {/* 1. Edit Profile Modal */}
      {isEditProfileOpen && (

        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up">
<h3 className="text-xs font-bold text-textColor uppercase tracking-wider">Chỉnh sửa thông tin</h3>
            
            <div className="space-y-3 text-left">
              <div>
                <label className="text-[9px] font-extrabold text-textColor-variant uppercase tracking-wider block mb-1">Họ tên</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-textColor"
                />
              </div>

              <div>
                <label className="text-[9px] font-extrabold text-textColor-variant uppercase tracking-wider block mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Chưa cập nhật SĐT"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-textColor"
                />
              </div>

              <div>
                <label className="text-[9px] font-extrabold text-textColor-variant uppercase tracking-wider block mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Chưa cập nhật email"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-textColor"
                />
              </div>

              <div>
                <label className="text-[9px] font-extrabold text-textColor-variant uppercase tracking-wider block mb-2">Ngày sinh</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={bdDay}
                    onChange={e => { setBdDay(e.target.value); handleBirthdayChange(e.target.value, bdMonth, bdYear); }}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-2.5 text-xs focus:outline-none focus:border-primary text-textColor"
                  >
                    <option value="">Ngày</option>
                    {Array.from({length:31},(_,i)=>i+1).map(d=>(
                      <option key={d} value={String(d).padStart(2,'0')}>{d}</option>
                    ))}
                  </select>
                  <select
                    value={bdMonth}
                    onChange={e => { setBdMonth(e.target.value); handleBirthdayChange(bdDay, e.target.value, bdYear); }}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-2.5 text-xs focus:outline-none focus:border-primary text-textColor"
                  >
                    <option value="">Tháng</option>
                    {Array.from({length:12},(_,i)=>i+1).map(m=>(
                      <option key={m} value={String(m).padStart(2,'0')}>Tháng {m}</option>
                    ))}
                  </select>
                  <select
                    value={bdYear}
                    onChange={e => { setBdYear(e.target.value); handleBirthdayChange(bdDay, bdMonth, e.target.value); }}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-2.5 text-xs focus:outline-none focus:border-primary text-textColor"
                  >
                    <option value="">Năm</option>
                    {Array.from({length:60},(_,i)=>new Date().getFullYear()-i).map(y=>(
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  updateZaloUser({
                    name: editName,
                    avatar: editAvatar,
                    id: profile.zaloId,
                    phone: editPhone,
                    email: editEmail,
                    birthday: editBirthday,
                  });
                  setIsEditProfileOpen(false);
                  showToast('Cập nhật thông tin thành công!', 'success');
                }}
                className="flex-1 h-10 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-primary-dark"
              >
                Lưu lại
              </button>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="h-10 px-4 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Shipping Address Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up">
            <h3 className="text-xs font-bold text-textColor uppercase tracking-wider">Sổ địa chỉ giao hàng</h3>
            
            {/* Addresses list */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {addresses.length === 0 ? (
                <div className="text-center py-6 text-[10px] text-textColor-variant">
                  Chưa có địa chỉ nào. Vui lòng thêm mới!
                </div>
              ) : (
                addresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => handleSelectAddress(addr.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex justify-between items-start text-left ${
                      activeAddressId === addr.id.toString()
                        ? 'border-primary bg-primary/5'
                        : 'border-[#f0edeb] bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <div className="text-xs space-y-1.5 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-textColor">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="bg-primary text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            Mặc định
                          </span>
                        )}
                      </div>
                      <p className="text-textColor-variant leading-relaxed">{addr.street}, {addr.city}</p>
                      <p className="text-textColor-variant/80 font-semibold">SĐT: {addr.phone}</p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAddressId(addr.id);
                          resetAddressForm({
                            label: addr.label || '',
                            phone: addr.phone || '',
                            street: addr.street || '',
                            city: addr.city || '',
                          });
                          setShowAddForm(true);
                        }}
                        className="text-primary hover:text-primary-dark p-1 border-none bg-transparent cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await apiRequest(`/addresses/${addr.id}`, 'DELETE');
                            await fetchAddresses();
                            showToast('Đã xóa địa chỉ!', 'info');
                          } catch (e) {
                            showToast('Xóa địa chỉ thất bại!', 'warning');
                          }
                        }}
                        className="text-red-500 hover:text-red-700 p-1 border-none bg-transparent cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add new address button/form */}
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full h-10 border border-dashed border-primary/40 text-primary font-bold text-xs uppercase tracking-wider rounded-xl bg-transparent cursor-pointer hover:bg-primary/5 transition-all mt-2"
              >
                + Thêm địa chỉ mới
              </button>
            ) : (
              <div className="border border-neutral-100 bg-neutral-50/50 p-4 rounded-2xl space-y-3 mt-2 animate-fade-in text-left">
                <div className="text-[9px] font-extrabold text-[#526069]/70 uppercase tracking-widest border-b border-neutral-100 pb-1">
                  {editingAddressId ? 'Chỉnh sửa địa chỉ' : 'Địa chỉ mới'}
                </div>
                
                <div>
                  <label className="text-[9px] font-bold text-textColor-variant uppercase tracking-wider block mb-1">Tên nhãn (ví dụ: Nhà riêng, Văn phòng)</label>
                  <input
                    type="text"
                    {...registerAddress('label')}
                    placeholder="Nhà riêng"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                  {addressErrors.label && <p className="mt-1 text-[10px] text-red-500">{addressErrors.label.message}</p>}
                </div>

                <div>
                  <label className="text-[9px] font-bold text-textColor-variant uppercase tracking-wider block mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    {...registerAddress('phone')}
                    placeholder="0987654321"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                  {addressErrors.phone && <p className="mt-1 text-[10px] text-red-500">{addressErrors.phone.message}</p>}
                </div>

                <div>
                  <label className="text-[9px] font-bold text-textColor-variant uppercase tracking-wider block mb-1">Địa chỉ (Số nhà, Tên đường)</label>
                  <input
                    type="text"
                    {...registerAddress('street')}
                    placeholder="123 Nguyễn Du"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                  {addressErrors.street && <p className="mt-1 text-[10px] text-red-500">{addressErrors.street.message}</p>}
                </div>

                <div>
                  <label className="text-[9px] font-bold text-textColor-variant uppercase tracking-wider block mb-1">Thành phố / Tỉnh</label>
                  <input
                    type="text"
                    {...registerAddress('city')}
                    placeholder="Hồ Chí Minh"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                  {addressErrors.city && <p className="mt-1 text-[10px] text-red-500">{addressErrors.city.message}</p>}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAddressSubmit(async (values) => {
                      try {
                        if (editingAddressId) {
                          // Update existing address
                          await apiRequest(`/addresses/${editingAddressId}`, 'PUT', {
                            label: values.label,
                            phone: values.phone,
                            street: values.street,
                            city: values.city,
                          });
                          await fetchAddresses();
                          setShowAddForm(false);
                          showToast('Đã cập nhật địa chỉ!', 'success');
                        } else {
                          // Add new address
                          const saved = await apiRequest<any>('/addresses', 'POST', {
                            label: values.label,
                            phone: values.phone,
                            street: values.street,
                            city: values.city,
                            isDefault: addresses.length === 0,
                          });
                          if (saved) {
                            await fetchAddresses();
                            setShowAddForm(false);
                            resetAddressForm({ label: '', phone: '', street: '', city: '' });
                            showToast('Đã thêm địa chỉ mới!', 'success');
                          }
                        }
                      } catch (e) {
                        showToast(editingAddressId ? 'Cập nhật địa chỉ thất bại!' : 'Thêm địa chỉ thất bại!', 'warning');
                      }
                    })}
                    className="flex-1 h-9 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-primary-dark"
                  >
                    {editingAddressId ? 'Cập nhật' : 'Lưu địa chỉ'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      resetAddressForm({
                        label: '',
                        phone: '',
                        street: '',
                        city: '',
                      });
                    }}
                    className="h-9 px-3 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}

            {!showAddForm && (
              <button
                onClick={() => setIsAddressModalOpen(false)}
                className="w-full h-10 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200 mt-2"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Voucher Wallet Modal */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold text-textColor uppercase tracking-wider">🎟️ Ví Voucher của tôi</h3>
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="p-2 -mr-2 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors border-none cursor-pointer"
              >
                <svg className="w-4 h-4 text-textColor" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2.5">
              {userVouchers.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <span className="text-4xl">🏷️</span>
                  <p className="text-xs text-textColor-variant font-medium">Chưa có voucher nào<br/>Hãy tham gia các chương trình khuyến mãi!</p>
                </div>
              ) : (
                userVouchers.map((v: any) => (
                  <div key={v.code} className="border border-dashed border-teal-200 rounded-2xl overflow-hidden flex">
                    <div className="bg-gradient-to-br from-teal-500 to-teal-700 text-white px-3 py-3 flex flex-col items-center justify-center min-w-[72px] gap-0.5">
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        {v.type === 'PERCENT' ? `${v.value}%` : v.type === 'FREESHIP' ? '🚚' : `${(v.value/1000).toFixed(0)}K`}
                      </span>
                      <span className="text-[8px] font-bold opacity-80">{v.type === 'FREESHIP' ? 'Freeship' : 'Giảm'}</span>
                    </div>
                    <div className="flex-1 px-3 py-2.5 flex flex-col justify-center gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-textColor tracking-widest">{v.code}</span>
                        <button
                          onClick={() => { navigator.clipboard?.writeText(v.code).catch(()=>{}); showToast(`Đã sao chép mã ${v.code}!`, 'success'); }}
                          className="text-[9px] bg-teal-50 text-teal-600 font-bold px-2 py-0.5 rounded-full border-none cursor-pointer"
                        >Sao chép</button>
                      </div>
                      <p className="text-[10px] text-textColor-variant">
                        {v.type === 'PERCENT' ? `Giảm ${v.value}%` : v.type === 'FIXED' ? `Giảm ${v.value.toLocaleString('vi-VN')}đ` : 'Miễn phí vận chuyển'}
                        {v.minOrderVal > 0 ? ` • Đơn tối thiểu ${v.minOrderVal.toLocaleString('vi-VN')}đ` : ''}
                      </p>
                      {v.expiresAt && (
                        <p className="text-[9px] text-amber-500 font-semibold">
                          HSD: {new Date(v.expiresAt).toLocaleDateString('vi-VN')}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Help & Support / Static Page Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up">
            <h3 className="text-xs font-bold text-textColor uppercase tracking-wider">
              {activeStaticPage?.title || 'Trợ giúp & Hỗ trợ'}
            </h3>

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


      {/* 5. Registered Users (Admin) Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up flex flex-col max-h-[80vh]">
            <h3 className="text-xs font-bold text-textColor uppercase tracking-wider">Người dùng đã đăng nhập</h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {usersList.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-8">Chưa có người dùng nào đăng ký.</p>
              ) : (
                usersList.map((user) => (
                  <div key={user.zaloId} className="p-3 border border-neutral-100 rounded-2xl flex items-center gap-3 bg-neutral-50/50">
                    <img 
                      src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80'} 
                      alt={user.name} 
                      className="w-10 h-10 rounded-full object-cover border border-neutral-200"
                    />
                    <div className="text-xs flex-1 min-w-0">
                      <p className="font-semibold text-textColor truncate">{user.name}</p>
                      <p className="text-[9px] text-[#526069]/70 font-mono truncate">ID: {user.zaloId}</p>
                    </div>
                    <div className="text-right text-[10px] text-textColor-variant">
                      <p className="font-bold text-primary">{user._count?.orders || 0} Đơn</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setIsAdminModalOpen(false)}
              className="w-full h-10 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200 mt-2 flex-shrink-0"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
      {/* 6. Review Product Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6 text-left">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-5 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
              <h3 className="text-xs font-black text-textColor uppercase tracking-wider">Đánh giá sản phẩm</h3>
              <button 
                onClick={() => setIsReviewModalOpen(false)} 
                className="text-neutral-400 hover:text-textColor border-none bg-transparent cursor-pointer font-bold text-xs p-1"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-1">
              <span className="text-[9px] bg-primary-light text-primary px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                {reviewProductSize !== 'DEFAULT' ? `Size: ${reviewProductSize}` : 'Free Size'}
              </span>
              <h4 className="text-xs font-bold text-textColor leading-snug line-clamp-2 mt-1">{reviewProductName}</h4>
              <p className="text-[10px] text-textColor-variant">
                Số lượng mua: <span className="font-semibold text-textColor">x{reviewProductQuantity}</span>
              </p>
            </div>

            {/* Rating Stars Select */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold text-[#526069]/70 uppercase tracking-widest block">Độ hài lòng (Chọn sao)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-0 border-none bg-transparent cursor-pointer text-xl text-amber-500 hover:scale-110 active:scale-95 transition-transform"
                  >
                    {star <= reviewRating ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment Area */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold text-[#526069]/70 uppercase tracking-widest block">Nhận xét của bạn</label>
              <textarea
                rows={3}
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full text-xs p-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:border-primary outline-none resize-none font-medium text-textColor leading-relaxed"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                disabled={submittingReview || !reviewComment.trim()}
                onClick={handleSubmitReview}
                className="flex-1 h-10 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-primary-dark disabled:bg-neutral-300 active:scale-98 transition-all"
              >
                {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="h-10 px-4 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

    </PageCast>
  );
}
