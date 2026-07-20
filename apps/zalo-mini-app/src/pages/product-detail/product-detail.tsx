import { useState, useEffect } from 'react';
import { Page, Box, Swiper } from 'zmp-ui';
import { IProduct, useCart } from '../../App';
import api from 'zmp-sdk';
import { apiRequest, API_BASE_URL } from '../../utils/api';
import { ChevronLeftIcon, ShareIcon, ShoppingBagIcon, HeartIcon as HeartOutline, ChatBubbleOvalLeftEllipsisIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { IProductDetailProps } from './product-detail.type';
import { LazyImageComponent } from '../../components';

const PageCast = Page as any;
const BoxCast = Box as any;

export const ProductDetail: React.FC<IProductDetailProps> = (props) => {
  const { product, onClose, onAddToCart } = props;
  const { toggleSavedItem, isSavedItem, setActiveTab, showToast, setBuyNowItem, setSelectedProductDetail, cart, setIsCartOpen, setIsChatOpen, setChatContextProduct } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [likeCount, setLikeCount] = useState(product.likeCount || 0);

  useEffect(() => {
    setLikeCount(product.likeCount || 0);
  }, [product.id, product.likeCount]);

  // Scroll to top when product ID changes
  useEffect(() => {
    const overlays = document.querySelectorAll('.fixed.inset-0.z-\\[100\\], .bg-surface.fixed.inset-0');
    overlays.forEach(el => {
      el.scrollTop = 0;
    });
  }, [product.id]);
  
  // Accordion toggle states
  const [expandedSection, setExpandedSection] = useState<string | null>('materials');

  // DB-backed detail states
  const [productDetails, setProductDetails] = useState<any>(null);
  
  // Variant selections
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');

  const [comments, setComments] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<IProduct[]>([]);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const details = await apiRequest<any>(`/products/${product.id}`);
        if (details) {
          setProductDetails(details);
          setComments(details.comments || []);
          
          if (details.variants && details.variants.length > 0) {
            // Find first available variant
            const available = details.variants.find((v: any) => v.stock > 0);
            const initialVariant = available || details.variants[0];
            setSelectedColor(initialVariant.color);
            setSelectedSize(initialVariant.size);
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

  let images: string[] = ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80'];
  try {
    const parsed = JSON.parse(product.images);
    if (parsed && Array.isArray(parsed) && parsed.length > 0) images = parsed;
  } catch (e) {
    if (typeof product.images === 'string' && product.images) {
      images = [product.images];
    }
  }

  // Get unique colors and sizes
  const uniqueColors = Array.from(new Set(productDetails?.variants?.map((v: any) => v.color).filter((c: string) => c && c !== 'DEFAULT'))) as string[];
  
  // Sizes available for the selected color
  const sizesForColor = productDetails?.variants?.filter((v: any) => v.color === (selectedColor || 'DEFAULT')) || [];
  const uniqueSizes = Array.from(new Set(sizesForColor.map((v: any) => v.size).filter((s: string) => s && s !== 'DEFAULT'))) as string[];

  const selectedVariant = productDetails?.variants?.find((v: any) => v.color === (selectedColor || 'DEFAULT') && v.size === (selectedSize || 'DEFAULT'));
  const stockCount = selectedVariant ? selectedVariant.stock : 0;
  
  const hasColors = uniqueColors.length > 0;
  const hasSizes = uniqueSizes.length > 0;

  // Auto-select first available size when color changes
  useEffect(() => {
    if (hasSizes && selectedColor) {
      const sizes = productDetails?.variants?.filter((v: any) => v.color === selectedColor);
      if (sizes && sizes.length > 0) {
        const available = sizes.find((v: any) => v.stock > 0);
        setSelectedSize(available ? available.size : sizes[0].size);
      }
    }
  }, [selectedColor, hasSizes, productDetails]);

  const handleAdd = () => {
    // If product has variants, require selection and check stock
    if (hasColors || hasSizes) {
      const size = selectedSize || 'DEFAULT';
      const color = selectedColor || 'DEFAULT';
      if (stockCount <= 0) {
        showToast('Sản phẩm với phân loại này đã hết hàng!', 'warning');
        return;
      }
      onAddToCart(product, quantity, size, color);
    } else {
      // Product has no variants, add directly
      onAddToCart(product, quantity, 'DEFAULT', 'DEFAULT');
    }
    showToast(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`, 'success');
  };

  const handleBuyNow = () => {
    // If product has variants, require selection and check stock
    if (hasColors || hasSizes) {
      const size = selectedSize || 'DEFAULT';
      const color = selectedColor || 'DEFAULT';
      if (stockCount <= 0) {
        showToast('Sản phẩm với phân loại này đã hết hàng!', 'warning');
        return;
      }
      setBuyNowItem({ product, quantity, size, color });
    } else {
      // Product has no variants, buy directly
      setBuyNowItem({ product, quantity, size: 'DEFAULT', color: 'DEFAULT' });
    }
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

  // Cart total items badge
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <PageCast className="bg-surface fixed inset-0 z-[100] h-full overflow-y-auto pb-[80px] animate-fade-in scrollbar-none relative">
      {/* Contextual Top Nav (Fixed at top of screen) */}
      <div className="fixed top-4 left-4 right-4 flex justify-between items-center z-30 pointer-events-none">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-all border-none cursor-pointer pointer-events-auto"
        >
          <ChevronLeftIcon className="w-5.5 h-5.5" strokeWidth={2.5} />
        </button>
        
        <div className="flex gap-2 pointer-events-auto">
          {/* Share Button */}
          <button
            onClick={() => {
              const apiAny = api as any;
              try {
                if (apiAny.shareApp) {
                  apiAny.shareApp({
                    title: product.name,
                    desc: product.description || 'Khám phá sản phẩm cao cấp tại ShopQuiet!',
                    thumb: images[0],
                    path: `pages/product-detail?id=${product.id}`,
                    success: () => showToast('Đã mở chia sẻ Zalo!', 'success'),
                    fail: () => {
                      navigator.clipboard?.writeText(window.location.href || '').catch(() => {});
                      showToast('Đã sao chép liên kết chia sẻ!', 'success');
                    }
                  });
                } else if (apiAny.shareCurrentPage) {
                  apiAny.shareCurrentPage({
                    title: product.name,
                    desc: product.description || 'ShopQuiet',
                    thumb: images[0],
                    success: () => showToast('Chia sẻ thành công!', 'success'),
                    fail: () => showToast('Chia sẻ thất bại!', 'warning')
                  });
                } else {
                  navigator.clipboard?.writeText(window.location.href || '').catch(() => {});
                  showToast('Đã sao chép liên kết sản phẩm!', 'success');
                }
              } catch (e) {
                navigator.clipboard?.writeText(window.location.href || '').catch(() => {});
                showToast('Đã sao chép liên kết sản phẩm!', 'success');
              }
            }}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-all border-none cursor-pointer"
            title="Chia sẻ Zalo"
          >
            <ShareIcon className="w-5.5 h-5.5" strokeWidth={2.2} />
          </button>

          {/* Cart Icon in Top Bar */}
          <button
            onClick={() => {
              onClose();
              setIsCartOpen(true);
            }}
            className="relative w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-all border-none cursor-pointer"
          >
            <ShoppingBagIcon className="w-5.5 h-5.5" strokeWidth={2.2} />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Product Image Carousel */}
      <div className="relative w-full aspect-[4/3] bg-white overflow-hidden">
        <Swiper autoplay duration={4000} dots={true} loop={true}>
          {images.map((img, idx) => (
            <Swiper.Slide key={idx} className="bg-white">
              <img
                src={img}
                alt={`${product.name} ${idx + 1}`}
                className="w-full h-full object-contain pointer-events-none select-none"
                loading="eager"
              />
            </Swiper.Slide>
          ))}
        </Swiper>
      </div>

      {/* Details Content */}
      <BoxCast className="bg-white -mt-4 relative z-10 space-y-2 shadow-sm">
        {/* Price & Name Section */}
        <div className="px-4 py-4 space-y-2 text-left bg-white rounded-t-2xl">
          <div className="flex items-end justify-between">
            <span className="text-xl font-extrabold text-primary">{product.price.toLocaleString('vi-VN')} đ</span>
          </div>
          
          <h1 className="text-base font-medium text-textColor leading-tight">{product.name}</h1>
          
          {/* Sales & Likes metrics (Shopee Style) */}
          <div className="flex items-center text-xs text-textColor-variant gap-3 pt-1">
            <div className="flex items-center gap-1">
              <span className="text-amber-500">★</span>
              <span>{comments.length > 0 ? (comments.reduce((acc, c) => acc + c.rating, 0) / comments.length).toFixed(1) : '5.0'}</span>
            </div>
            <div className="w-px h-3 bg-neutral-300"></div>
            <span>Đã bán {product.soldCount || 0}</span>
            <div className="w-px h-3 bg-neutral-300"></div>
            
            <button
              onClick={() => {
                toggleSavedItem(product);
                if (isLiked) {
                  setLikeCount(prev => Math.max(0, prev - 1));
                } else {
                  setLikeCount(prev => prev + 1);
                }
                showToast(isLiked ? `Đã bỏ lưu ${product.name}` : `Đã lưu ${product.name}`, 'success');
              }}
              className="flex items-center gap-1 ml-auto border-none bg-transparent"
            >
              {isLiked ? (
                <HeartSolid className="w-4 h-4 text-red-500" />
              ) : (
                <HeartOutline className="w-4 h-4 text-textColor-variant" />
              )}
              <span className="text-textColor-variant">{likeCount}</span>
            </button>
          </div>
        </div>
        
        {/* Description Snippet */}
        <div className="px-4 pb-4 text-left bg-white">
          <p className="text-xs text-[#526069] leading-relaxed line-clamp-3">
            {product.description}
          </p>
        </div>
      </BoxCast>

      {/* Visual Variations Selector */}
      {(hasColors || hasSizes) && (
        <div className="mt-2 bg-white px-4 py-4 space-y-4">
          
          {/* Color Option */}
          {hasColors && (
            <div className="text-left">
              <h3 className="text-xs font-semibold text-textColor mb-3">Màu sắc: {selectedColor}</h3>
              <div className="flex gap-3 flex-wrap">
                {uniqueColors.map((color) => {
                  const isActive = selectedColor === color;
                  // Get thumbnail for color if available
                  const variantForColor = productDetails?.variants?.find((v: any) => v.color === color && v.colorImage);
                  const colorThumbnail = variantForColor?.colorImage;
                  
                  return (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`relative overflow-hidden rounded-md border-2 transition-all cursor-pointer flex flex-col items-center justify-center p-1 ${
                        isActive 
                          ? 'border-primary' 
                          : 'border-transparent bg-neutral-100 hover:bg-neutral-200'
                      }`}
                      style={{ minWidth: colorThumbnail ? '60px' : 'auto' }}
                    >
                      {colorThumbnail ? (
                        <>
                          <div className="w-10 h-10 mb-1">
                            <LazyImageComponent src={colorThumbnail} alt={color} className="w-full h-full object-cover rounded-sm" />
                          </div>
                          <span className="text-[10px] whitespace-nowrap px-1">{color}</span>
                        </>
                      ) : (
                        <span className="text-xs px-3 py-1">{color}</span>
                      )}
                      
                      {isActive && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-primary text-white flex items-center justify-center rounded-tl-md">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Option */}
          {hasSizes && (
            <div className="text-left">
              <h3 className="text-xs font-semibold text-textColor mb-3">Kích Cỡ: {selectedSize}</h3>
              <div className="flex gap-2 flex-wrap">
                {uniqueSizes.map((size) => {
                  const variantForSize = sizesForColor.find((v: any) => v.size === size);
                  const isActive = selectedSize === size;
                  const isOutOfStock = !variantForSize || variantForSize.stock <= 0;
                  return (
                    <button
                      key={size}
                      disabled={isOutOfStock}
                      onClick={() => setSelectedSize(size)}
                      className={`text-xs px-4 py-2 rounded-md border transition-all relative cursor-pointer ${
                        isActive 
                          ? 'border-primary bg-primary/10 text-primary font-semibold' 
                          : isOutOfStock
                            ? 'border-neutral-200 text-neutral-400 bg-neutral-50 cursor-not-allowed opacity-60'
                            : 'border-neutral-200 text-textColor bg-white hover:border-primary/50'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity & Stock Status */}
          <div className="flex justify-between items-center pt-2">
            <h3 className="text-xs font-semibold text-textColor">Số lượng</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-neutral-200 rounded">
                <button
                  disabled={stockCount <= 0 || quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 flex items-center justify-center text-textColor-variant hover:text-textColor active:bg-neutral-100 disabled:opacity-30 border-none bg-transparent"
                >
                  −
                </button>
                <div className="w-10 h-8 flex items-center justify-center text-xs font-medium border-l border-r border-neutral-200">
                  {stockCount > 0 ? quantity : 0}
                </div>
                <button
                  disabled={stockCount <= 0 || quantity >= stockCount}
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 flex items-center justify-center text-textColor-variant hover:text-textColor active:bg-neutral-100 disabled:opacity-30 border-none bg-transparent"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          <div className="text-right text-[10px] text-textColor-variant pt-1">
            {stockCount > 0 ? `Còn ${stockCount} sản phẩm` : 'Đã hết hàng'}
          </div>
        </div>
      )}

      {/* Accordions */}
      <div className="mt-2 space-y-0 bg-white">
        {/* Materials & Care */}
        <div className="border-b border-[#f0edeb]">
          <button
            onClick={() => setExpandedSection(expandedSection === 'materials' ? null : 'materials')}
            className="w-full px-4 py-4 flex items-center justify-between text-sm font-medium text-textColor transition-colors hover:bg-neutral-50 border-none text-left bg-transparent"
          >
            <span>Chất liệu & Cách bảo quản</span>
            <ChevronLeftIcon className={`w-4 h-4 text-textColor-variant transition-transform duration-200 ${expandedSection === 'materials' ? 'rotate-90' : '-rotate-90'}`} />
          </button>
          {expandedSection === 'materials' && (
            <div className="px-4 pb-4 text-xs text-[#526069] leading-relaxed text-left">
              {productDetails?.materialCare || 'Chất liệu sản xuất tự nhiên cao cấp, độ bền cao. Khuyến khích giặt bằng tay hoặc giặt máy chế độ nhẹ.'}
            </div>
          )}
        </div>

        {/* Shipping & Returns */}
        <div className="border-b border-[#f0edeb]">
          <button
            onClick={() => setExpandedSection(expandedSection === 'shipping' ? null : 'shipping')}
            className="w-full px-4 py-4 flex items-center justify-between text-sm font-medium text-textColor transition-colors hover:bg-neutral-50 border-none text-left bg-transparent"
          >
            <span>Vận chuyển & Đổi trả</span>
            <ChevronLeftIcon className={`w-4 h-4 text-textColor-variant transition-transform duration-200 ${expandedSection === 'shipping' ? 'rotate-90' : '-rotate-90'}`} />
          </button>
          {expandedSection === 'shipping' && (
            <div className="px-4 pb-4 text-xs text-[#526069] leading-relaxed text-left">
              {productDetails?.shippingReturn || 'Miễn phí vận chuyển toàn quốc cho đơn hàng từ 2.500.000 đ. Đổi trả miễn phí trong vòng 30 ngày.'}
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-2 bg-white px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-textColor">Đánh giá sản phẩm ({comments.length})</h3>
          <div className="flex items-center text-xs text-primary">
            <span>Xem tất cả</span>
            <ChevronLeftIcon className="w-3 h-3 ml-1 rotate-180" />
          </div>
        </div>
        
        <div className="divide-y divide-neutral-100 space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-6 text-xs text-textColor-variant">
              Chưa có đánh giá nào cho sản phẩm này.
            </div>
          ) : (
            comments.map((rev) => (
              <div key={rev.id} className="pt-4 first:pt-0 space-y-2 text-left">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {rev.user?.avatar ? (
                      <img src={rev.user.avatar} className="w-6 h-6 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-[10px]">
                        {rev.user?.name ? rev.user.name[0].toUpperCase() : 'U'}
                      </div>
                    )}
                    <span className="text-xs text-textColor">{rev.user?.name || 'Khách hàng'}</span>
                  </div>
                </div>
                
                <div className="flex text-amber-500 text-[10px] gap-0.5">
                  {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                </div>
                
                <p className="text-textColor text-xs leading-relaxed">{rev.content}</p>
                <div className="text-[10px] text-textColor-variant">{formatDate(rev.createdAt)} | Phân loại: {rev.color || 'Mặc định'}, Size: {rev.size || 'Mặc định'}</div>
                
                {/* Review attached images */}
                {rev.images && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(() => {
                      try {
                        const parsed = JSON.parse(rev.images);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                          return parsed.map((imgUrl: string, idx: number) => {
                            const fullUrl = imgUrl.startsWith('http') ? imgUrl : `${API_BASE_URL.replace('/api/v1', '')}${imgUrl}`;
                            return (
                              <div key={idx} className="w-16 h-16 rounded overflow-hidden border border-[#f0edeb] bg-neutral-50">
                                <img src={fullUrl} className="w-full h-full object-cover" alt="" />
                              </div>
                            );
                          });
                        }
                      } catch (e) {
                        if (typeof rev.images === 'string' && rev.images.trim()) {
                          const fullUrl = rev.images.startsWith('http') ? rev.images : `${API_BASE_URL.replace('/api/v1', '')}${rev.images}`;
                          return (
                            <div className="w-16 h-16 rounded overflow-hidden border border-[#f0edeb] bg-neutral-50">
                              <img src={fullUrl} className="w-full h-full object-cover" alt="" />
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Suggested Products Section */}
      {relatedProducts.length > 0 && (
        <div className="mt-2 bg-white px-4 py-4 space-y-4">
          <h3 className="text-sm font-medium text-textColor mb-2 text-left">Sản Phẩm Gợi Ý</h3>
          <div className="grid grid-cols-2 gap-3">
            {relatedProducts.map((prod) => {
              let imgUrl = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80';
              try {
                const parsed = JSON.parse(prod.images);
                if (parsed && parsed.length > 0) imgUrl = parsed[0];
              } catch (e) {}

              return (
                <div
                  key={prod.id}
                  onClick={() => setSelectedProductDetail(prod)}
                  className="group cursor-pointer flex flex-col space-y-1.5 text-left border border-neutral-100 rounded-lg overflow-hidden pb-2"
                >
                  <div className="relative aspect-square w-full bg-neutral-50">
                    <LazyImageComponent
                      src={imgUrl}
                      alt={prod.name}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="px-2 pt-1 flex flex-col space-y-1">
                    <h4 className="text-[11px] font-medium text-textColor leading-snug line-clamp-2 min-h-[32px]">
                      {prod.name}
                    </h4>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">{prod.price.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="text-[9px] text-textColor-variant">Đã bán {prod.soldCount || 0}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contextual Bottom Action Bar (Shopee Style) */}
      <div className="fixed bottom-0 left-0 right-0 h-[60px] bg-white border-t border-[#f0edeb] flex z-50 shadow-lg">
        {/* Chat Button */}
        <button
          onClick={() => {
            setChatContextProduct(product);
            setIsChatOpen(true);
          }}
          className="flex-1 max-w-[60px] flex flex-col items-center justify-center border-r border-neutral-100 bg-teal-50/50 hover:bg-teal-50 active:bg-teal-100 border-none cursor-pointer"
        >
          <ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5 text-teal-600 mb-0.5" strokeWidth={2} />
          <span className="text-[9px] text-teal-700 font-medium">Chat ngay</span>
        </button>

        {/* Add to Cart Button */}
        <button
          disabled={(hasColors || hasSizes) && stockCount <= 0}
          onClick={handleAdd}
          className="flex-[1.2] flex flex-col items-center justify-center bg-amber-50 hover:bg-amber-100 text-amber-600 active:bg-amber-200 transition-colors border-none cursor-pointer disabled:opacity-50 disabled:bg-neutral-100 disabled:text-neutral-400"
        >
          <ShoppingBagIcon className="w-5 h-5 mb-0.5" strokeWidth={2} />
          <span className="text-[9px] font-medium">Thêm vào giỏ</span>
        </button>

        {/* Buy Now Button */}
        <button
          disabled={(hasColors || hasSizes) && stockCount <= 0}
          onClick={handleBuyNow}
          className="flex-[1.8] bg-primary hover:bg-primary-dark text-white font-semibold text-[13px] flex items-center justify-center active:bg-primary-darker transition-colors border-none cursor-pointer disabled:bg-neutral-400"
        >
          {(hasColors || hasSizes) && stockCount <= 0 ? 'Hết hàng' : 'Mua ngay'}
        </button>
      </div>
    </PageCast>
  );
}
