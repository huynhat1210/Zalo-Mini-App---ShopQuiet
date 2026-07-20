import React, { useState, useEffect } from 'react';
import { Page } from 'zmp-ui';
import { apiRequest, API_BASE_URL } from '../../utils/api';
import { EmptyStateComponent } from '../empty-state';
import { ReviewModal } from '../review-modal';
import { IOrderHistoryProps } from './order-history.type';

const PageCast = Page as any;

export const OrderHistory: React.FC<IOrderHistoryProps> = (props) => {
  const {
    orders,
    loading,
    zaloUser,
    recommendationProducts,
    setActiveTab,
    setSelectedOrder,
    setSelectedProductDetail,
    showToast,
    onReviewSuccess,
  } = props;

  const [ordersTab, setOrdersTab] = useState<'active' | 'history' | 'reviews'>('active');
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Review Modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState('');
  const [reviewProductId, setReviewProductId] = useState<number | null>(null);
  const [reviewProductName, setReviewProductName] = useState('');
  const [reviewProductSize, setReviewProductSize] = useState('');
  const [reviewProductQuantity, setReviewProductQuantity] = useState(1);

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
    if (ordersTab === 'reviews') {
      fetchUserReviews();
    }
  }, [ordersTab]);

  const handleOpenReviewModal = (
    orderId: string,
    productId: number,
    productName: string,
    size?: string,
    quantity?: number
  ) => {
    setReviewOrderId(orderId);
    setReviewProductId(productId);
    setReviewProductName(productName);
    setReviewProductSize(size || 'DEFAULT');
    setReviewProductQuantity(quantity || 1);
    setIsReviewModalOpen(true);
  };

  const handleReviewSuccessLocal = (orderId: string, productId: number) => {
    onReviewSuccess(orderId, productId);
    if (ordersTab === 'reviews') {
      fetchUserReviews();
    }
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

  return (
    <PageCast className="bg-[#f7f7f7] relative flex flex-col w-full h-full overscroll-none scrollbar-none">
      {/* Header - ShopeeFood inspired layout */}
      <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-[#f0edeb] sticky top-0 z-30 shadow-xs">
        <button onClick={() => setActiveTab('profile')} className="p-1.5 -ml-1.5 hover:bg-[#f0edeb] rounded-full transition-colors border-none bg-transparent cursor-pointer">
          <svg className="w-5.5 h-5.5 text-textColor" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-textColor">Đơn hàng</span>
        <div className="w-5.5 h-5.5" /> {/* Empty div for balance */}
      </div>

      {/* Top Tab Bar - ShopeeFood style */}
      <div className="bg-white flex border-b border-[#f0edeb] px-2 overflow-x-auto scrollbar-none sticky top-[53px] z-20">
        {[
          { id: 'active', label: 'Đang đến' },
          { id: 'history', label: 'Lịch sử' },
          { id: 'reviews', label: 'Đánh giá' },
        ].map((tab) => {
          const isTabActive = ordersTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setOrdersTab(tab.id as any)}
              className={`flex-1 py-3.5 text-xs text-center font-bold tracking-wide relative whitespace-nowrap min-w-[80px] transition-all border-none bg-transparent cursor-pointer ${
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
      <div className="flex-1 overflow-y-auto px-6 py-5.5 space-y-7 pb-28 text-left">
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
                      if (review.product) setSelectedProductDetail(review.product as any);
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
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-3.5 h-3.5 ${star <= (review.rating || 5) ? 'text-amber-400' : 'text-neutral-200'}`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    {/* Review content */}
                    <div className="bg-neutral-50 rounded-xl px-4 py-3 space-y-3">
                      <p className="text-xs text-textColor leading-relaxed">{review.content}</p>
                      {(() => {
                        try {
                          const parsedImages = JSON.parse(review.images || '[]');
                          if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                            return (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {parsedImages.map((u: string, i: number) => (
                                  <div key={i} className="w-14 h-14 rounded-lg border border-neutral-250/60 overflow-hidden bg-white flex-shrink-0">
                                    <img
                                      src={u.startsWith('http') ? u : `${API_BASE_URL.replace('/api/v1', '')}${u}`}
                                      alt="Đánh giá"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            );
                          }
                        } catch (e) {}
                        return null;
                      })()}
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
            description={
              ordersTab === 'active'
                ? 'Bạn sẽ nhìn thấy các đơn hàng đang được chuẩn bị hoặc giao đi tại đây để kiểm tra đơn hàng nhanh hơn!'
                : 'Khám phá các sản phẩm tối giản cao cấp của chúng tôi để mua sắm ngay.'
            }
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
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      order.status === 'DELIVERED' || order.status === 'COMPLETED' ? 'bg-green-50 text-green-700' :
                      order.status === 'SHIPPED' ? 'bg-blue-50 text-blue-700' :
                      order.status === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                      order.status === 'PENDING_PAYMENT' ? 'bg-orange-50 text-orange-600' :
                      'bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {order.status === 'DELIVERED' || order.status === 'COMPLETED' ? 'Hoàn thành' :
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

                {/* Order tracking status timeline */}
                {order.status === 'PENDING_PAYMENT' ? (
                  <div className="pt-3 border-t border-[#f0edeb] space-y-2.5">
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2.5">
                      <span className="text-orange-500 text-lg mt-0.5">•</span>
                      <div className="text-xs">
                        <p className="font-bold text-orange-700">Chờ thanh toán ZaloPay</p>
                        <p className="text-orange-600/80 text-[10px] mt-0.5 leading-relaxed">
                          Đơn hàng này chưa được thanh toán thành công. Bạn có thể thử lại hoặc hủy đơn này.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                          setActiveTab('order-detail');
                        }}
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
                      {(order.status === 'CANCELLED'
                        ? [
                            { label: 'Đã nhận đơn hàng', desc: 'Hệ thống đã ghi nhận đơn thành công', active: true, isCancelled: false },
                            { label: 'Đơn hàng đã hủy', desc: 'Đơn hàng đã bị hủy bỏ', active: true, isCancelled: true },
                          ]
                        : [
                            { label: 'Đã nhận đơn hàng', desc: 'Hệ thống đã ghi nhận đơn thành công', active: true, isCancelled: false },
                            {
                              label: 'Đang chuẩn bị',
                              desc: 'Kho hàng đang đóng gói sản phẩm của bạn',
                              active: order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'DELIVERED' || order.status === 'COMPLETED',
                              isCancelled: false,
                            },
                            {
                              label: 'Đang giao hàng',
                              desc: 'Đơn hàng đã bàn giao cho đơn vị vận chuyển',
                              active: order.status === 'SHIPPED' || order.status === 'DELIVERED' || order.status === 'COMPLETED',
                              isCancelled: false,
                            },
                            {
                              label: 'Đã hoàn thành',
                              desc: 'Đơn hàng đã được giao nhận thành công',
                              active: order.status === 'DELIVERED' || order.status === 'COMPLETED',
                              isCancelled: false,
                            },
                          ]
                      ).map((step, sIdx) => (
                        <div key={sIdx} className="relative pl-5 text-xs">
                          {/* Dot indicator */}
                          <div
                            className={`absolute left-[-16px] top-[3px] w-2.5 h-2.5 rounded-full border-2 ${
                              step.active
                                ? step.isCancelled
                                  ? 'bg-red-500 border-red-500 shadow-xs scale-105'
                                  : 'bg-primary border-primary shadow-xs scale-105'
                                : 'bg-white border-neutral-300'
                            }`}
                          />

                          <div className="space-y-0.5">
                            <p
                              className={`font-bold ${
                                step.active ? (step.isCancelled ? 'text-red-600' : 'text-textColor') : 'text-textColor-variant/50'
                              }`}
                            >
                              {step.label}
                            </p>
                            <p
                              className={`text-[10px] ${
                                step.active ? (step.isCancelled ? 'text-red-500/80' : 'text-textColor-variant') : 'text-textColor-variant/40'
                              }`}
                            >
                              {step.desc}
                            </p>
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

        {/* Recommendation Divider Section */}
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
                  <img src={img} alt={prod.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-[#f0edeb]" />

                  {/* Details Info Right */}
                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[7px] font-extrabold">
                          ✓
                        </span>
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
                        <span className="text-[8px] font-bold text-primary bg-primary-light px-2 py-0.5 rounded-md">Freeship</span>
                        <span className="text-[8px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">Giảm 10%</span>
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

      {/* Internal Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        zaloUser={zaloUser}
        orderId={reviewOrderId}
        productId={reviewProductId}
        productName={reviewProductName}
        productSize={reviewProductSize}
        productQuantity={reviewProductQuantity}
        showToast={showToast}
        onReviewSuccess={handleReviewSuccessLocal}
      />
    </PageCast>
  );
};
export default OrderHistory;
