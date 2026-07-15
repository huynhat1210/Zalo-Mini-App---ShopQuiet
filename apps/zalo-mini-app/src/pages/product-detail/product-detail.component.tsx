import { useState, useEffect } from 'react';
import { Page, Box } from 'zmp-ui';
import { IProduct, useCart } from '../../App';
import api from 'zmp-sdk';
import { apiRequest } from '../../utils/api';
import { ChevronLeftIcon, ShareIcon, ShoppingBagIcon, HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { IProductDetailComponentProps } from './product-detail.type';
import { LazyImageComponent } from '../../components';

const PageCast = Page as any;
const BoxCast = Box as any;

export const ProductDetailComponent: React.FC<IProductDetailComponentProps> = (props) => {
  const { product, onClose, onAddToCart } = props;
  const { toggleSavedItem, isSavedItem, setActiveTab, showToast, setBuyNowItem, setSelectedProductDetail } = useCart();
  const [quantity, setQuantity] = useState(1);
  
  // Accordion toggle states
  const [expandedSection, setExpandedSection] = useState<string | null>('materials');

  // DB-backed detail states
  const [productDetails, setProductDetails] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<IProduct[]>([]);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const details = await apiRequest<any>(`/products/${product.id}`);
        if (details) {
          setProductDetails(details);
          setComments(details.comments || []);
          
          if (details.variants && details.variants.length > 0) {
            const available = details.variants.find((v: any) => v.stock > 0);
            setSelectedSize(available ? available.size : details.variants[0].size);
          }
        }
      } catch (e) {
        console.error('Error fetching product details:', e);
      }
    };

    const fetchRelated = async () => {
      const catId = product.category?.id;
      if (!catId) return;
      try {
        const listRes = await apiRequest<any>(`/products?categoryId=${catId}`);
        const list = Array.isArray(listRes) ? listRes : (listRes?.data || []);
        if (list && Array.isArray(list)) {
          setRelatedProducts(list.filter((p: IProduct) => p.id !== product.id).slice(0, 4));
        }
      } catch (e) {
        console.error('Error fetching related products:', e);
      }
    };

    fetchDetails();
    fetchRelated();
  }, [product.id, product.category?.id]);

  const isLiked = isSavedItem(product.id);

  let img = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80';
  try {
    const parsed = JSON.parse(product.images);
    if (parsed && parsed.length > 0) img = parsed[0];
  } catch (e) {}

  const selectedVariant = productDetails?.variants?.find((v: any) => v.size === (selectedSize || 'DEFAULT'));
  const stockCount = selectedVariant ? selectedVariant.stock : 0;
  const hasSizes = productDetails?.variants && (productDetails.variants.length > 1 || (productDetails.variants.length === 1 && productDetails.variants[0].size !== 'DEFAULT'));

  const handleAdd = () => {
    const size = selectedSize || 'DEFAULT';
    if (stockCount <= 0) {
      showToast('Sản phẩm kích cỡ này đã hết hàng!', 'warning');
      return;
    }
    onAddToCart(product, quantity, size);
    showToast(`Đã thêm ${quantity} sản phẩm (Size: ${size === 'DEFAULT' ? 'Tiêu chuẩn' : size}) vào giỏ hàng!`, 'success');
    onClose();
  };

  const handleBuyNow = () => {
    const size = selectedSize || 'DEFAULT';
    if (stockCount <= 0) {
      showToast('Sản phẩm kích cỡ này đã hết hàng!', 'warning');
      return;
    }
    setBuyNowItem({ product, quantity, size });
    onClose();
    setActiveTab('checkout');
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN');
    } catch (e) {
      return 'Gần đây';
    }
  };

  return (
    <PageCast className="bg-surface fixed inset-0 z-[100] h-full overflow-y-auto pb-[80px] animate-fade-in scrollbar-none relative">
      {/* Contextual Top Nav (Fixed at top of screen) */}
      <div className="fixed top-4 left-4 right-4 flex justify-between items-center z-30">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-md flex items-center justify-center text-textColor active:scale-95 transition-all hover:bg-white border-none cursor-pointer"
        >
          <ChevronLeftIcon className="w-5.5 h-5.5 text-textColor" strokeWidth={2.5} />
        </button>
        
        <div className="flex gap-2">
          {/* Share Button */}
          <button
            onClick={() => {
              const apiAny = api as any;
              if (apiAny.shareCurrentPage) {
                apiAny.shareCurrentPage({
                  title: product.name,
                  desc: product.description,
                  thumb: img,
                  success: () => showToast('Chia sẻ thành công!', 'success'),
                  fail: () => showToast('Chia sẻ thất bại!', 'warning')
                });
              } else {
                showToast('Đã sao chép liên kết chia sẻ Zalo!', 'success');
              }
            }}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-md flex items-center justify-center text-primary active:scale-95 transition-all hover:bg-white border-none cursor-pointer"
            title="Chia sẻ Zalo"
          >
            <ShareIcon className="w-5.5 h-5.5 text-primary" strokeWidth={2.2} />
          </button>

          {/* Favorite Button */}
          <button
            onClick={() => {
              toggleSavedItem(product);
              showToast(isLiked ? `Đã bỏ lưu ${product.name}` : `Đã lưu ${product.name}`, 'success');
            }}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-md flex items-center justify-center text-textColor active:scale-95 transition-all hover:bg-white border-none cursor-pointer"
          >
            {isLiked ? (
              <HeartSolid className="w-5.5 h-5.5 text-red-500" />
            ) : (
              <HeartOutline className="w-5.5 h-5.5 text-textColor" strokeWidth={2.2} />
            )}
          </button>
        </div>
      </div>

      {/* Product Image Cover Section */}
      <div className="relative w-full h-[360px] bg-neutral-100">
        <LazyImageComponent
          src={img}
          alt={product.name}
          className="w-full h-full"
        />
      </div>

      {/* Details Content (Scrolls with the page) */}
      <BoxCast className="bg-white rounded-t-3xl -mt-6 relative z-10 px-5.5 py-6.5 space-y-6.5 shadow-md">
        {/* Header detail */}
        <div className="space-y-2 text-left">
          <span className="text-[9px] bg-primary-light text-primary px-3 py-1 rounded-full font-bold uppercase tracking-widest inline-block border border-primary/10">
            {product.category?.name || 'Home'}
          </span>
          <h1 className="text-xl font-bold text-textColor leading-tight pr-4">{product.name}</h1>
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold text-primary">{product.price.toLocaleString('vi-VN')} đ</span>
            <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[9px] font-extrabold border border-amber-100">
              <span>{comments.length > 0 ? (comments.reduce((acc, c) => acc + c.rating, 0) / comments.length).toFixed(1) : '5.0'} ★</span>
              <span className="text-amber-600/70 font-medium">({comments.length})</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1 text-left">
          <p className="text-xs text-[#526069] leading-relaxed">
            {product.description}
          </p>
        </div>

        <hr className="border-[#f0edeb]" />

        {/* Options Selection (Size & Quantity) */}
        <div className="space-y-5">
          {/* Size Option (Only if product has size variants) */}
          {hasSizes && (
            <div className="text-left">
              <h3 className="text-[10px] font-extrabold text-[#526069]/60 uppercase tracking-widest mb-2.5">Chọn Kích Cỡ (Size)</h3>
              <div className="flex gap-2 flex-wrap">
                {productDetails.variants.map((v: any) => {
                  const isActive = selectedSize === v.size;
                  const isOutOfStock = v.stock <= 0;
                  return (
                    <button
                      key={v.size}
                      disabled={isOutOfStock}
                      onClick={() => setSelectedSize(v.size)}
                      className={`text-xs px-4 py-2.5 rounded-xl border transition-all relative cursor-pointer ${
                        isActive 
                          ? 'border-primary bg-primary-light text-primary font-bold shadow-xs' 
                          : isOutOfStock
                            ? 'border-dashed border-[#e6e2e0] text-[#a8a19d] bg-neutral-50/55 cursor-not-allowed'
                            : 'border-[#eae8e6] text-[#526069] bg-white hover:bg-neutral-50'
                      }`}
                    >
                      {v.size}
                      {isOutOfStock && (
                        <span className="absolute -top-1.5 -right-1 text-[8px] bg-red-100 text-red-600 px-1 rounded-full scale-75">
                          Hết
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock Display */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#526069] font-medium">Tình trạng:</span>
            {stockCount > 0 ? (
              <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                Còn hàng (Còn {stockCount} sản phẩm)
              </span>
            ) : (
              <span className="text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-full text-[10px]">
                Hết hàng
              </span>
            )}
          </div>

          {/* Quantity Selector */}
          <div className="flex justify-between items-center py-1">
            <h3 className="text-[10px] font-extrabold text-[#526069]/60 uppercase tracking-widest">Số lượng</h3>
            <div className="flex items-center gap-4 bg-[#f0edeb] rounded-full px-4 py-2">
              <button
                disabled={stockCount <= 0}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="text-textColor-variant hover:text-textColor font-extrabold text-sm px-1 transition-transform active:scale-75 border-none bg-transparent cursor-pointer disabled:opacity-50"
              >
                −
              </button>
              <span className="text-xs font-bold text-textColor min-w-4 text-center">{stockCount > 0 ? quantity : 0}</span>
              <button
                disabled={stockCount <= 0 || quantity >= stockCount}
                onClick={() => setQuantity((q) => q + 1)}
                className="text-textColor-variant hover:text-textColor font-extrabold text-sm px-1 transition-transform active:scale-75 border-none bg-transparent cursor-pointer disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <hr className="border-[#f0edeb]" />

        {/* Expandable Details Section (Accordions) */}
        <div className="space-y-3.5 pb-6">
          {/* Materials & Care */}
          <div className="border border-[#f0edeb] rounded-2xl overflow-hidden shadow-xs">
            <button
              onClick={() => setExpandedSection(expandedSection === 'materials' ? null : 'materials')}
              className="w-full px-4.5 py-3.5 bg-neutral-50 flex items-center justify-between text-xs font-bold text-[#526069]/80 uppercase tracking-wider transition-colors hover:bg-neutral-100 border-none text-left"
            >
              <span>Chất liệu & Cách bảo quản</span>
              <svg className={`w-4 h-4 text-textColor-variant transition-transform duration-200 ${expandedSection === 'materials' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {expandedSection === 'materials' && (
              <div className="px-4.5 py-3.5 text-xs text-[#526069] border-t border-[#f0edeb] leading-relaxed bg-white text-left">
                {productDetails?.materialCare || 'Chất liệu sản xuất tự nhiên cao cấp, độ bền cao. Khuyến khích giặt bằng tay hoặc giặt máy chế độ nhẹ, vắt khô tự nhiên để giữ độ mịn mát của vải.'}
              </div>
            )}
          </div>

          {/* Shipping & Returns */}
          <div className="border border-[#f0edeb] rounded-2xl overflow-hidden shadow-xs">
            <button
              onClick={() => setExpandedSection(expandedSection === 'shipping' ? null : 'shipping')}
              className="w-full px-4.5 py-3.5 bg-neutral-50 flex items-center justify-between text-xs font-bold text-[#526069]/80 uppercase tracking-wider transition-colors hover:bg-neutral-100 border-none text-left"
            >
              <span>Vận chuyển & Đổi trả</span>
              <svg className={`w-4 h-4 text-textColor-variant transition-transform duration-200 ${expandedSection === 'shipping' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {expandedSection === 'shipping' && (
              <div className="px-4.5 py-3.5 text-xs text-[#526069] border-t border-[#f0edeb] leading-relaxed bg-white text-left">
                {productDetails?.shippingReturn || 'Miễn phí vận chuyển toàn quốc cho đơn hàng từ 2.500.000 đ. Đổi trả miễn phí trong vòng 30 ngày đối với sản phẩm còn nguyên tem mác, hộp đựng.'}
              </div>
            )}
          </div>

          {/* Ratings & Reviews */}
          <div className="border border-[#f0edeb] rounded-2xl overflow-hidden shadow-xs">
            <button
              onClick={() => setExpandedSection(expandedSection === 'reviews' ? null : 'reviews')}
              className="w-full px-4.5 py-3.5 bg-neutral-50 flex items-center justify-between text-xs font-bold text-[#526069]/80 uppercase tracking-wider transition-colors hover:bg-neutral-100 border-none text-left"
            >
              <span>Đánh giá & Nhận xét ({comments.length})</span>
              <svg className={`w-4 h-4 text-textColor-variant transition-transform duration-200 ${expandedSection === 'reviews' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {expandedSection === 'reviews' && (
              <div className="px-4.5 py-3.5 text-xs text-[#526069] border-t border-[#f0edeb] bg-white text-left space-y-4">
                {/* Viết đánh giá mới */}
                <div className="bg-[#fbf9f7] rounded-xl p-3 border border-[#f0edeb] space-y-3">
                  <span className="font-extrabold text-[10px] uppercase text-[#526069]/80 tracking-wide block">Viết Đánh Giá Của Bạn</span>
                  
                  {/* Chọn sao */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-textColor-variant">Chọn số sao:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          className="p-0 border-none bg-transparent cursor-pointer text-base text-amber-500 hover:scale-110 active:scale-95 transition-transform"
                        >
                          {star <= newRating ? '★' : '☆'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nhập nội dung */}
                  <textarea
                    rows={2}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Chia sẻ nhận xét của bạn về sản phẩm này..."
                    className="w-full text-[11px] p-2 bg-white rounded-lg border border-[#eae8e6] focus:border-primary outline-none resize-none font-medium text-textColor"
                  />

                  {/* Nút gửi */}
                  <button
                    disabled={submittingComment || !newComment.trim()}
                    onClick={async () => {
                      if (!newComment.trim()) return;
                      setSubmittingComment(true);
                      try {
                        const saved = await apiRequest<any>(`/products/${product.id}/comments`, 'POST', {
                          content: newComment,
                          rating: newRating,
                        });
                        if (saved) {
                          setComments((prev) => [saved, ...prev]);
                          setNewComment('');
                          setNewRating(5);
                          showToast('Gửi nhận xét thành công!', 'success');
                        }
                      } catch (e) {
                        showToast('Gửi nhận xét thất bại!', 'warning');
                      } finally {
                        setSubmittingComment(false);
                      }
                    }}
                    className="w-full py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold text-[10px] uppercase tracking-wider disabled:bg-neutral-300 disabled:cursor-not-allowed border-none active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    {submittingComment ? 'Đang gửi...' : 'Gửi nhận xét'}
                  </button>
                </div>

                {/* Danh sách nhận xét */}
                <div className="divide-y divide-neutral-100 space-y-3.5">
                  {comments.length === 0 ? (
                    <div className="text-center py-6 text-[10px] text-textColor-variant">
                      Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên!
                    </div>
                  ) : (
                    comments.map((rev) => (
                      <div key={rev.id} className="pt-3.5 first:pt-0 space-y-1.5 text-left">
                        <div className="flex justify-between items-center text-[10px]">
                          <div className="flex items-center gap-1.5">
                            {rev.user?.avatar ? (
                              <img src={rev.user.avatar} className="w-5 h-5 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-[8px]">
                                {rev.user?.name ? rev.user.name[0].toUpperCase() : 'U'}
                              </div>
                            )}
                            <span className="font-extrabold text-textColor">{rev.user?.name || 'Khách hàng'}</span>
                          </div>
                          <span className="text-textColor-variant">{formatDate(rev.createdAt)}</span>
                        </div>
                        <div className="text-amber-500 text-[10px] tracking-xs">
                          {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                        </div>
                        <p className="text-textColor-variant text-[11px] leading-relaxed">{rev.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Suggested Products Section */}
        {relatedProducts.length > 0 && (
          <div className="space-y-4 pt-2">
            <hr className="border-[#f0edeb]" />
            <div className="text-left">
              <h3 className="text-[10px] font-extrabold text-[#526069]/60 uppercase tracking-widest mb-3.5">Sản Phẩm Gợi Ý</h3>
              <div className="grid grid-cols-2 gap-4">
                {relatedProducts.map((prod) => {
                  let imgUrl = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80';
                  try {
                    const parsed = JSON.parse(prod.images);
                    if (parsed && parsed.length > 0) imgUrl = parsed[0];
                  } catch (e) {}

                  return (
                    <div
                      key={prod.id}
                      onClick={() => {
                        // Switch active detail view to this product
                        setSelectedProductDetail(prod);
                      }}
                      className="group cursor-pointer flex flex-col space-y-2 text-left"
                    >
                      <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-neutral-50 border border-[#f0edeb]">
                        <LazyImageComponent
                          src={imgUrl}
                          alt={prod.name}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="px-1 flex flex-col">
                        <span className="text-[8px] text-[#526069]/50 uppercase font-bold tracking-widest">
                          {prod.category?.name || 'Home'}
                        </span>
                        <h4 className="text-[11px] font-semibold text-textColor mt-0.5 line-clamp-1 group-hover:text-primary transition-colors">
                          {prod.name}
                        </h4>
                        <span className="text-[10.5px] font-extrabold text-textColor mt-1">{prod.price.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </BoxCast>

      {/* Contextual Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-[80px] bg-white border-t border-[#f0edeb] flex items-center px-4.5 gap-3 z-20 shadow-lg">
        <button
          disabled={stockCount <= 0}
          onClick={handleAdd}
          className="w-12 h-12 bg-primary-light hover:bg-[#e0f2f1] text-primary rounded-full shadow-xs flex items-center justify-center flex-shrink-0 active:scale-90 transition-all border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="Thêm vào giỏ hàng"
        >
          <ShoppingBagIcon className="w-5.5 h-5.5 text-primary" strokeWidth={2.2} />
        </button>



        <button
          disabled={stockCount <= 0}
          onClick={handleBuyNow}
          className="flex-1 h-12 bg-primary hover:bg-primary-dark text-white font-bold text-xs uppercase tracking-widest rounded-full shadow-md flex items-center justify-center active:scale-[0.98] transition-all border-none cursor-pointer disabled:bg-neutral-300 disabled:cursor-not-allowed"
        >
          {stockCount > 0 ? `Mua ngay — ${(product.price * quantity).toLocaleString('vi-VN')} đ` : 'Hết hàng'}
        </button>
      </div>
    </PageCast>
  );
}
