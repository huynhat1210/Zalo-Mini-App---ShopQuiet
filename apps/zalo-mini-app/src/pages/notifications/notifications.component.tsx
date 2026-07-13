import { useEffect, useState } from 'react';
import { Page } from 'zmp-ui';
import { useCart, IOrder } from '../../App';
import { apiRequest } from '../../utils/api';
import { INotificationsComponentProps } from './notifications.type';

const PageCast = Page as any;


export const NotificationsComponent: React.FC<INotificationsComponentProps> = (_props) => {
  const { setActiveTab, showToast, setSelectedOrder, notifications, setNotifications, fetchNotifications } = useCart();
  const [activeCategory, setActiveCategory] = useState<'order' | 'system'>('order');

  const handleViewOrder = async (orderId: string) => {
    try {
      showToast('Đang tải chi tiết đơn hàng...', 'info');
      const order = await apiRequest<IOrder>(`/orders/${orderId}`);
      setSelectedOrder(order);
      setActiveTab('order-detail');
    } catch (e) {
      console.error(e);
      showToast('Không thể tải thông tin đơn hàng này!', 'warning');
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);


  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/mark-all-read', 'PATCH');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast('Đã đánh dấu đọc tất cả thông báo!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Thao tác thất bại!', 'warning');
    }
  };

  const handleMarkSingleRead = async (id: number) => {
    try {
      await apiRequest(`/notifications/${id}/read`, 'PATCH');
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast(`Đã sao chép mã: ${code}`, 'success');
  };

  const getOrderId = (title: string) => {
    const match = title.match(/#SQ-\d+/);
    return match ? match[0].substring(1) : undefined;
  };

  const getDiscountCode = (content: string) => {
    const match = content.match(/SUMMER26|WELCOME50/);
    return match ? match[0] : undefined;
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeCategory === 'order') {
      return item.type === 'order';
    } else {
      return item.type !== 'order';
    }
  });

  return (
    <PageCast className="bg-surface relative flex flex-col w-full h-full overscroll-none scrollbar-none animate-fade-in">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-[#f0edeb] sticky top-0 z-30 shadow-xs">
        <button onClick={() => setActiveTab('home')} className="p-1.5 -ml-1.5 hover:bg-[#f0edeb] rounded-full transition-colors active:scale-95">
          <svg className="w-5.5 h-5.5 text-textColor" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-textColor">Thông báo</span>
        <button 
          onClick={handleMarkAllRead} 
          className="p-1.5 -mr-1.5 hover:bg-[#f0edeb] rounded-full transition-colors active:scale-95 text-textColor-variant hover:text-textColor"
          title="Đánh dấu đã đọc"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="bg-white/95 backdrop-blur-md px-6 py-2.5 flex border-b border-[#f0edeb] sticky top-[53px] z-20 shadow-xs">
        <div className="flex bg-[#f5f3f0] p-1 w-full rounded-xl border border-[#eae8e6]">
          <button
            onClick={() => setActiveCategory('order')}
            className={`flex-1 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg border-none transition-all cursor-pointer ${
              activeCategory === 'order'
                ? 'bg-white text-primary shadow-xs'
                : 'bg-transparent text-textColor-variant hover:text-textColor'
            }`}
          >
            Đơn hàng
          </button>
          <button
            onClick={() => setActiveCategory('system')}
            className={`flex-1 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg border-none transition-all cursor-pointer ${
              activeCategory === 'system'
                ? 'bg-white text-primary shadow-xs'
                : 'bg-transparent text-textColor-variant hover:text-textColor'
            }`}
          >
            Hệ thống
          </button>
        </div>
      </div>

      {/* Notifications List content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-28">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center bg-white rounded-3xl border border-[#f0edeb] shadow-xs">
            <div className="w-16 h-16 rounded-full bg-[#f5f3f0] flex items-center justify-center text-[#526069] mb-4">
              <svg className="w-7 h-7 text-[#526069]/40" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xs font-bold text-textColor uppercase tracking-widest">Không có thông báo</h3>
            <p className="text-[11px] text-textColor-variant mt-2 max-w-[210px] leading-relaxed">
              {activeCategory === 'order'
                ? 'Bạn chưa nhận được thông báo nào về đơn hàng.'
                : 'Bạn chưa nhận được thông báo khuyến mãi, voucher hay sự kiện nào.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredNotifications.map((item) => {
              const orderId = getOrderId(item.title);
              const discountCode = getDiscountCode(item.content);
              return (
                <div 
                  key={item.id} 
                  onClick={() => {
                    handleMarkSingleRead(item.id);
                    if (orderId) {
                      handleViewOrder(orderId);
                    }
                  }}
                  className={`p-4 bg-white rounded-2xl border border-[#f0edeb] shadow-xs flex gap-4 transition-all duration-300 relative cursor-pointer ${
                    !item.read ? 'border-primary/20 bg-primary-light/10' : ''
                  }`}
                >
                  {/* Unread dot indicator */}
                  {!item.read && (
                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}

                  {/* Left Side Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.type === 'promo' ? 'bg-amber-50 text-amber-700' : 'bg-primary-light text-primary'
                  }`}>
                    {item.type === 'promo' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l6.499 6.499c.404.404.935.612 1.469.612.534 0 1.065-.208 1.469-.612l4.318-4.318a2.036 2.036 0 000-2.872L11.159 3.66a2.25 2.25 0 00-1.591-.659zm-1.818 4.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    )}
                  </div>

                  {/* Right Side Content Details */}
                  <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-bold text-textColor leading-snug pr-3">{item.title}</h4>
                    <p className="text-[11px] text-textColor-variant leading-relaxed">{item.content}</p>
                    
                    {/* Additional Actions */}
                    {discountCode && (
                      <div className="flex items-center gap-2 pt-2.5" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] font-mono font-bold bg-[#f0edeb] text-textColor px-3 py-1 rounded border border-[#eae8e6]">
                          {discountCode}
                        </span>
                        <button
                          onClick={() => handleCopyCode(discountCode)}
                          className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider border-none bg-transparent"
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
                        className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider pt-2 block border-none bg-transparent cursor-pointer"
                      >
                        Xem hành trình đơn hàng
                      </button>
                    )}

                    <p className="text-[9px] text-[#526069]/55 font-medium pt-1.5">{item.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageCast>
  );
}

