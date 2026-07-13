import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Page, Text } from 'zmp-ui';
import { useCart, IProduct, IOrder } from '../../App';
import { apiRequest } from '../../utils/api';
import api from 'zmp-sdk';
import { IProfileComponentProps } from './profile.type';

const PageCast = Page as any;
const TextCast = Text as any;

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

export const ProfileComponent: React.FC<IProfileComponentProps> = (props) => {
  const { initialSubPage = 'profile' } = props;
  const { setActiveTab, setSelectedProductDetail, showToast, zaloUser, updateZaloUser, setSelectedOrder } = useCart();
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [recommendationProducts, setRecommendationProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ShopeeFood style tabs state
  const [ordersTab, setOrdersTab] = useState<'active' | 'history' | 'reviews' | 'drafts'>('active');

  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [cmsSettings, setCmsSettings] = useState<Record<string, string>>({});
  const [staticPages, setStaticPages] = useState<CmsStaticPage[]>([]);
  const [activeStaticPageSlug, setActiveStaticPageSlug] = useState('help-support');

  // DB address state
  const [addresses, setAddresses] = useState<any[]>([]);
  const [activeAddressId, setActiveAddressId] = useState<string>('');

  // Add Address Form state
  const [showAddForm, setShowAddForm] = useState(false);
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
    name: zaloUser?.name || cmsSettings['profile.defaultName'] || 'Alex Johnson',
    phone: cmsSettings['profile.defaultPhone'] || '0987654321',
    avatar: zaloUser?.avatar || cmsSettings['profile.defaultAvatar'] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    zaloId: zaloUser?.id || 'cust-zalo-id-1',
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



  const presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=200&q=80'
  ];

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
        apiRequest<IProduct[]>('/products')
      ]);
      setOrders(fetchedOrders);
      const recs = fetchedProducts.slice(0, 3);
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

  useEffect(() => {
    if (!showAddForm) {
      resetAddressForm({
        label: '',
        phone: '',
        street: '',
        city: '',
      });
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

  const handleLogout = () => {
    localStorage.removeItem('zalo_profile_custom');
    localStorage.removeItem('shipping_address');
    showToast('Đã đăng xuất tài khoản và xóa bộ nhớ cache!', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  // Filter orders by active tab
  const activeOrdersList = orders.filter(
    (o) => o.status === 'PROCESSING' || o.status === 'SHIPPED'
  );
  
  const historyOrdersList = orders.filter(
    (o) => o.status === 'DELIVERED' || o.status === 'CANCELLED'
  );

  const draftOrdersList = orders.filter(
    (o) => o.status === 'PENDING_PAYMENT'
  );

  const displayedOrders = 
    ordersTab === 'active' ? activeOrdersList :
    ordersTab === 'history' ? historyOrdersList :
    ordersTab === 'drafts' ? draftOrdersList : [];
  const activeStaticPage =
    staticPages.find((page) => page.slug === activeStaticPageSlug) ||
    staticPages.find((page) => page.slug === 'help-support');

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
            { id: 'reviews', label: 'Đánh giá' },
            { id: 'drafts', label: 'Đơn nháp' }
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
          {loading ? (
            <div className="text-center py-10 text-textColor-variant text-xs font-medium">Đang tải đơn hàng...</div>
          ) : displayedOrders.length === 0 ? (
            /* ShopeeFood Empty State */
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center bg-white rounded-3xl border border-[#f0edeb] shadow-xs">
              <div className="w-24 h-24 flex items-center justify-center text-primary/10 mb-4">
                <svg className="w-20 h-20 text-[#526069]/30" viewBox="0 0 120 120" fill="none">
                  {/* Document Illustration SVG */}
                  <rect x="25" y="15" width="70" height="90" rx="10" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
                  <path d="M40 35H80" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  <path d="M40 50H80" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  <path d="M40 65H70" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="85" cy="85" r="15" fill="#ecf6f7" stroke="currentColor" strokeWidth="3" />
                  <path d="M85 78V92M78 85H92" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-xs font-bold text-textColor leading-tight">
                {ordersTab === 'active' ? 'Quên chưa đặt sản phẩm rồi nè bạn ơi?' : 
                 ordersTab === 'history' ? 'Chưa có lịch sử mua hàng' :
                 ordersTab === 'reviews' ? 'Chưa có đánh giá nào' : 'Chưa có đơn nháp nào'}
              </h3>
              <p className="text-[10.5px] text-textColor-variant mt-2 max-w-[240px] leading-relaxed">
                {ordersTab === 'active' ? 'Bạn sẽ nhìn thấy các đơn hàng đang được chuẩn bị hoặc giao đi tại đây để kiểm tra đơn hàng nhanh hơn!' : 
                 'Khám phá các sản phẩm tối giản cao cấp của chúng tôi để mua sắm ngay.'}
              </p>
              <button
                onClick={() => setActiveTab('home')}
                className="mt-6.5 bg-primary hover:bg-primary-dark text-white text-[9.5px] font-extrabold uppercase tracking-widest px-6 py-3 rounded-full shadow-xs active:scale-95 transition-all border-none"
              >
                Mua sắm ngay
              </button>
            </div>
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
                        <span className="line-clamp-1 max-w-[200px] text-left">
                          {item.product?.name}
                          {item.size && item.size !== 'DEFAULT' && (
                            <span className="ml-1.5 text-[9px] bg-neutral-100 text-[#526069] px-1 py-0.5 rounded font-bold uppercase">
                              {item.size}
                            </span>
                          )}
                          <span className="font-semibold text-textColor ml-1">x{item.quantity}</span>
                        </span>
                        <span className="font-semibold text-textColor">${(item.price * item.quantity).toFixed(2)}</span>
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
                    <span className="text-primary">${order.totalAmount.toFixed(2)}</span>
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
                          <span className="text-green-600">In Stock</span>
                        </div>
                      </div>

                      {/* Promo Tags and Price */}
                      <div className="flex justify-between items-end mt-2">
                        <div className="flex gap-1.5">
                          <span className="text-[8px] font-bold text-primary bg-primary-light px-2 py-0.5 rounded-md">
                            Free Ship
                          </span>
                          <span className="text-[8px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                            10% Off
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-textColor">${prod.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </PageCast>
    );
  }

  // Profile View
  return (
    <PageCast className="bg-surface relative flex flex-col w-full h-full overscroll-none scrollbar-none">
      {/* Header */}
      <div className="bg-white px-6 py-4.5 flex items-center justify-between border-b border-[#f0edeb] sticky top-0 z-30">
        <button onClick={() => setActiveTab('home')} className="p-1 hover:bg-[#f0edeb] rounded-full transition-colors">
          <svg className="w-5.5 h-5.5 text-textColor" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-sm font-bold uppercase tracking-wider text-textColor">Profile</span>
        <button onClick={() => setIsEditProfileOpen(true)} className="p-1 hover:bg-[#f0edeb] rounded-full transition-colors border-none bg-transparent cursor-pointer">
          <svg className="w-5.5 h-5.5 text-textColor" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.99l1.005.831a1.125 1.125 0 01.26 1.43l-1.297 2.247a1.125 1.125 0 01-1.37.491l-1.216-.456c-.356-.133-.751-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.83c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.831a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
 
      {/* User Card */}
      <div className="bg-white p-6 border-b border-[#f0edeb] flex flex-col items-center text-center space-y-3">
        <img
          src={profile.avatar}
          alt={profile.name}
          className="w-18 h-18 rounded-full object-cover border border-[#f0edeb] shadow-sm"
        />
        <div>
          <TextCast className="text-base font-bold text-textColor">{profile.name}</TextCast>
          {zaloUser?.name ? (
            <button onClick={() => setIsEditProfileOpen(true)} className="text-xs text-[#526069]/70 font-semibold mt-1 hover:underline border-none bg-transparent cursor-pointer">
              ✓ Sửa hồ sơ
            </button>
          ) : (
            <button 
              onClick={() => {
                const apiAny = api as any;
                if (typeof window !== 'undefined' && apiAny) {
                  apiAny.authorize({
                    scopes: ['scope.userInfo'],
                    success: () => {
                      apiAny.getUserInfo({
                        success: (data: any) => {
                          if (data?.userInfo?.name) {
                            updateZaloUser({
                              name: data.userInfo.name,
                              avatar: data.userInfo.avatar,
                              id: data.userInfo.id,
                            });
                            showToast('Đăng nhập Zalo thành công!', 'success');
                          } else {
                            showToast('Không lấy được thông tin Zalo, vui lòng thử lại!', 'warning');
                          }
                        },
                        fail: () => {
                          showToast('Vui lòng cấp quyền xem thông tin cá nhân!', 'warning');
                        }
                      });
                    },
                    fail: () => {
                      showToast('Không thể kết nối Zalo!', 'warning');
                    }
                  });
                }
              }} 
              className="text-xs text-primary font-bold mt-1.5 hover:underline border-none bg-transparent cursor-pointer flex items-center gap-1 mx-auto"
            >
              <span>🔗 Đăng nhập bằng Zalo</span>
            </button>
          )}
        </div>
      </div>
 
      {/* Menu Sections (Figma structure) */}
      <div className="px-6 py-5.5 space-y-5 pb-28">
        {/* Section 1: Shopping */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-extrabold text-[#526069]/50 uppercase tracking-wider px-2">Shopping</h3>
          <div className="bg-white rounded-2xl border border-[#f0edeb] overflow-hidden shadow-sm divide-y divide-[#f0edeb]">
            <button 
              onClick={() => setActiveTab('orders')}
              className="w-full px-4 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <span>My Orders</span>
              <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            
            <button 
              onClick={() => setActiveTab('saved-items')}
              className="w-full px-4 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <span>Saved Items</span>
              <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
 
        {/* Section 2: Account */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-extrabold text-[#526069]/50 uppercase tracking-wider px-2">Account</h3>
          <div className="bg-white rounded-2xl border border-[#f0edeb] overflow-hidden shadow-sm divide-y divide-[#f0edeb]">
            <button 
              onClick={() => setIsAddressModalOpen(true)}
              className="w-full px-4 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <span>Shipping Address</span>
              <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            
            <button 
              onClick={() => setIsPaymentModalOpen(true)}
              className="w-full px-4 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <span>Payment Methods</span>
              <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
 
        {/* Section 3: General */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-extrabold text-[#526069]/50 uppercase tracking-wider px-2">General</h3>
          <div className="bg-white rounded-2xl border border-[#f0edeb] overflow-hidden shadow-sm divide-y divide-[#f0edeb]">
            <button 
              onClick={() => setActiveTab('notifications')}
              className="w-full px-4 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <span>Notifications</span>
              <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            
            <button 
              onClick={() => {
                setActiveStaticPageSlug('help-support');
                setIsHelpModalOpen(true);
              }}
              className="w-full px-4 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <span>Help & Support</span>
              <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            
            <button
              onClick={() => {
                setActiveStaticPageSlug('about-shopquiet');
                setIsHelpModalOpen(true);
              }}
              className="w-full px-4 py-3.5 flex justify-between items-center text-xs text-textColor hover:bg-neutral-50 text-left border-none bg-transparent cursor-pointer"
            >
              <span>About ShopQuiet</span>
              <svg className="w-4 h-4 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>


          </div>
        </div>
 
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full h-11 bg-white border border-[#eae8e6] text-red-500 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-red-50 transition-all flex items-center justify-center shadow-sm cursor-pointer"
        >
          Logout
        </button>
      </div>

      {/* MODALS RENDER SECTION */}
      {/* 1. Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up">
<h3 className="text-xs font-bold text-textColor uppercase tracking-wider">Chỉnh sửa thông tin</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-textColor-variant uppercase tracking-wider block mb-1">Họ tên</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary"
                />
              </div>
              
              <div>
                <label className="text-[9px] font-bold text-textColor-variant uppercase tracking-wider block mb-2">Ảnh đại diện</label>
                <div className="flex gap-3 justify-center py-2">
                  {presetAvatars.map((av, index) => (
                    <img
                      key={index}
                      src={av}
                      onClick={() => setEditAvatar(av)}
                      className={`w-12 h-12 rounded-full object-cover border-2 cursor-pointer transition-all ${
                        editAvatar === av ? 'border-primary scale-105 shadow-md' : 'border-transparent opacity-65'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  updateZaloUser({ name: editName, avatar: editAvatar, id: profile.zaloId });
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
                <div className="text-[9px] font-extrabold text-[#526069]/70 uppercase tracking-widest border-b border-neutral-100 pb-1">Địa chỉ mới</div>
                
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
                          resetAddressForm({
                            label: '',
                            phone: '',
                            street: '',
                            city: '',
                          });
                          showToast('Đã thêm địa chỉ mới!', 'success');
                        }
                      } catch (e) {
                        showToast('Thêm địa chỉ thất bại!', 'warning');
                      }
                    })}
                    className="flex-1 h-9 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-primary-dark"
                  >
                    Lưu địa chỉ
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

      {/* 3. Payment Methods Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up">
            <h3 className="text-xs font-bold text-textColor uppercase tracking-wider">Phương thức thanh toán</h3>
            
            <div className="space-y-3">
              <div className="p-3 border border-neutral-100 rounded-2xl flex items-center gap-3 bg-neutral-50/50">
                <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xs">💳</span>
                <div className="text-xs">
                  <p className="font-semibold text-textColor">Visa ending in 4242</p>
                  <p className="text-[10px] text-textColor-variant">Mặc định • Hạn dùng 12/28</p>
                </div>
              </div>
              <div className="p-3 border border-dashed border-neutral-200 rounded-2xl flex items-center justify-center text-xs text-neutral-400 py-4 font-semibold">
                + Thêm thẻ tín dụng mới
              </div>
            </div>

            <button
              onClick={() => setIsPaymentModalOpen(false)}
              className="w-full h-10 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200 mt-2"
            >
              Đóng
            </button>
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


    </PageCast>
  );
}
