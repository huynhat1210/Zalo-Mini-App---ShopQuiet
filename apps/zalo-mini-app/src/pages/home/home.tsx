import { useState, useEffect, useRef, useCallback } from 'react';
import { Page, Box, Text } from 'zmp-ui';
import { useCart, IProduct } from '../../App';
import { apiRequest } from '../../utils/api';
import { useInfiniteProducts, useCategories, useBanners } from '../../hooks';
import { Bars3Icon, ShoppingCartIcon } from '@heroicons/react/24/outline';
// @ts-ignore
import logoIcon from '../../assets/logo.png';
import { MenuDrawerComponent, BannerSkeleton, CategorySkeleton, ProductGridSkeleton, LazyImageComponent, LuckyWheel, FlashSale } from '../../components';
import { IHomeProps } from './home.type';
import { trackAnalyticsEvent } from '../../utils/analytics';
import { useTranslation } from '../../utils/i18n';

const PageCast = Page as any;
const BoxCast = Box as any;
const TextCast = Text as any;

export const Home: React.FC<IHomeProps> = (_props) => {
  const { t } = useTranslation();
  const { addToCart, setSelectedProductDetail, cart, setIsCartOpen, toggleSavedItem, isSavedItem, showToast, zaloUser } = useCart();
  const [isLuckyWheelOpen, setIsLuckyWheelOpen] = useState(false);

  
  const { data: productsData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: isLoadingProducts, refetch: refetchProducts } = useInfiniteProducts();
  const { data: categoriesData, isLoading: isLoadingCategories, refetch: refetchCategories } = useCategories();
  const { data: bannersData, isLoading: isLoadingBanners, refetch: refetchBanners } = useBanners();

  const products = productsData ? productsData.pages.flatMap((page: any) => page.data || page) : [];
  const categories = categoriesData || [];
  const banners = bannersData || [];
  const isFetchingProducts = isLoadingProducts;
  const isFetchingCategories = isLoadingCategories;
  const isFetchingBanners = isLoadingBanners;
  const isFetchingMoreProducts = isFetchingNextPage;
  const productsHasMore = hasNextPage;

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (isFetchingMoreProducts) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && productsHasMore) {
        fetchNextPage();
      }
    });
    if (node) observer.current.observe(node);
  }, [isFetchingMoreProducts, productsHasMore, fetchNextPage]);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [flashSaleProducts, setFlashSaleProducts] = useState<any[]>([]);
  const [flashSaleEndTime, setFlashSaleEndTime] = useState<string>('');

  // Carousel Slide State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [brandName, setBrandName] = useState('ShopQuiet');
  const [isCartBouncing, setIsCartBouncing] = useState(false);

  useEffect(() => {
    // settings isn't cached yet, fetch independently
    async function loadSettings() {
      try {
        const settings = await apiRequest<Record<string, string>>('/cms/settings');
        if (settings?.['brand.name']) {
          setBrandName(settings['brand.name']);
        }
      } catch (e) {
        console.error('Failed to load home CMS settings:', e);
      }
    }
    loadSettings();
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [zaloUser?.id]);

  useEffect(() => {
    async function loadFlashSale() {
      try {
        const res = await apiRequest<{ products: any[]; endTime: string }>('/products/flash-sale');
        if (res) {
          setFlashSaleProducts(res.products || []);
          setFlashSaleEndTime(res.endTime || '');
        }
      } catch (e) {
        console.error('Failed to load flash sale products:', e);
      }
    }
    loadFlashSale();
  }, []);

  const bannerSlides = banners
    .filter((banner) => banner.imageUrl)
    .map((banner) => ({
      id: banner.id,
      tag: banner.tag || 'Khuyến mãi',
      title: banner.title || 'Ưu đãi mới',
      description: banner.description || 'Khám phá các ưu đãi đang được cập nhật tại ShopQuiet.',
      cta: banner.cta || 'Xem ngay',
      image: banner.imageUrl,
      category: banner.link || null,
    }));

  // Auto-scroll logic for Carousel banner
  useEffect(() => {
    if (bannerSlides.length === 0) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [bannerSlides.length]);

  const filteredProducts = Array.isArray(products) ? (selectedCategory
    ? products.filter((p) => p.category?.slug === selectedCategory)
    : products) : [];

  const handleAddToCart = (product: IProduct) => {
    // Check if product has variants (size or color)
    const hasVariants = product.variants && product.variants.length > 0;
    const hasColors = hasVariants && product.variants!.some((v: any) => v.color && v.color !== 'DEFAULT');
    const hasSizes = hasVariants && product.variants!.some((v: any) => v.size && v.size !== 'DEFAULT');

    if (hasColors || hasSizes) {
      // Product has variants - open product detail to select
      setSelectedProductDetail(product);
      showToast('Vui lòng chọn phân loại sản phẩm!', 'info');
    } else {
      // Product has no variants - add directly
      addToCart(product);
      showToast(`Đã thêm ${product.name} vào giỏ hàng!`, 'success');
      
      // Track add_to_cart event
      if (zaloUser?.id) {
        trackAnalyticsEvent(zaloUser.id, 'add_to_cart', product.id, product.category?.id);
      }

      setIsCartBouncing(true);
      setTimeout(() => setIsCartBouncing(false), 300);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      refetchBanners(),
      refetchCategories(),
      refetchProducts(),
    ]);
  };

  return (
    <PageCast pullToRefresh onRefresh={handleRefresh} className="bg-surface relative flex flex-col w-full h-full overscroll-none scrollbar-none animate-fade-in">
        {/* Top Header App Bar */}
        <div className="bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-[#f0edeb] sticky top-0 z-30 shadow-xs">
        <button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 hover:bg-neutral-100 rounded-full transition-colors active:scale-95 border-none bg-transparent cursor-pointer">
          <Bars3Icon className="w-5.5 h-5.5 text-textColor" strokeWidth={2} />
        </button>

        <div className="flex items-center gap-1.5 justify-center">
          <img src={logoIcon} className="w-6.5 h-6.5 object-contain rounded-xl shadow-xs" alt="Logo" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-textColor font-sans">{brandName}</span>
        </div>

        <button
          onClick={() => setIsCartOpen(true)}
          className="p-2 -mr-2 hover:bg-neutral-100 rounded-full transition-colors relative active:scale-95 border-none bg-transparent cursor-pointer"
        >
          <ShoppingCartIcon className={`w-5.5 h-5.5 text-textColor ${isCartBouncing ? 'animate-cart-bounce' : ''}`} strokeWidth={2} />
          {cart.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold border border-white animate-pulse">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Main Content scroll window */}
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Banner Carousel Slider */}
        {isFetchingBanners && bannerSlides.length === 0 ? (
          <BannerSkeleton />
        ) : bannerSlides.length > 0 ? (
        <BoxCast className="mx-6 my-4 rounded-3xl overflow-hidden relative h-[220px] bg-stone-100 flex items-center shadow-sm group">
          {bannerSlides.map((slide, index) => {
            const isActive = index === currentSlide;
            return (
              <div
                key={slide.id}
                className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
              >
                <LazyImageComponent
                  src={slide.image}
                  alt={slide.title || 'Banner'}
                  className="absolute inset-0 w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-transparent z-10"></div>

                <div className="relative z-20 px-6 flex flex-col justify-center h-full max-w-[270px] text-white">
                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-primary-light bg-primary/45 w-fit px-2.5 py-0.5 rounded-md mb-2">
                    {slide.tag}
                  </span>
                  <h2 className="text-xl font-bold leading-tight tracking-tight">
                    {slide.title}
                  </h2>
                  <p className="text-white/80 text-[10.5px] mt-1 leading-relaxed">
                    {slide.description}
                  </p>
                  <button
                    className="mt-4.5 h-8.5 w-fit bg-white text-textColor text-[9px] font-extrabold uppercase tracking-widest px-5 rounded-full shadow-xs hover:bg-neutral-50 active:scale-95 transition-all flex items-center justify-center border-none"
                    onClick={() => slide.category && setSelectedCategory(slide.category)}
                  >
                    {slide.cta}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Dots Indicator */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20">
            {bannerSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-1.5 rounded-full transition-all duration-350 ${index === currentSlide ? 'w-4.5 bg-white' : 'w-1.5 bg-white/45'
                  } border-none outline-none cursor-pointer`}
              />
            ))}
          </div>
        </BoxCast>
        ) : null}

        {/* Flash Sale Section */}
        {flashSaleProducts.length > 0 && (
          <div className="mx-6 my-4">
            <FlashSale
              endTime={flashSaleEndTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()}
              products={flashSaleProducts}
            />
          </div>
        )}

        {/* Categories Section - Clean horizontal capsule scrolling */}
        <BoxCast className="my-6">
          <div className="flex justify-between items-center px-6 mb-3">
            <TextCast className="text-[10px] font-extrabold uppercase tracking-widest text-[#526069]/80">{t('home.categories')}</TextCast>
          </div>

          {isFetchingCategories && categories.length === 0 ? (
            <CategorySkeleton />
          ) : (
          <div className="flex gap-2.5 overflow-x-auto pl-6 pr-6 scrollbar-none py-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all whitespace-nowrap ${selectedCategory === null
                ? 'border-primary bg-primary text-white shadow-xs'
                : 'border-[#f0edeb] bg-white text-textColor-variant hover:bg-neutral-50'
                }`}
            >
              {t('home.all')}
            </button>
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(isActive ? null : cat.slug)}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all whitespace-nowrap ${isActive
                    ? 'border-primary bg-primary text-white shadow-xs'
                    : 'border-[#f0edeb] bg-white text-textColor-variant hover:bg-neutral-50'
                    }`}
                >
                  <span className="mr-1.5">{cat.icon}</span>
                  {cat.name}
                </button>
              );
            })}
          </div>
          )}
        </BoxCast>

        {/* Featured Products - High-fidelity borderless grid cards */}
        <BoxCast className="my-6">
          <div className="px-6 mb-4">
            <TextCast className="text-[10px] font-extrabold uppercase tracking-widest text-[#526069]/80">{t('home.featured')}</TextCast>
          </div>

          {isFetchingProducts && products.length === 0 ? (
            <ProductGridSkeleton count={4} />
          ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-7 px-6">
            {filteredProducts.map((prod) => {
              let img = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80';
              try {
                const parsed = JSON.parse(prod.images);
                if (parsed && parsed.length > 0) img = parsed[0];
              } catch (e) { }

              const isLiked = isSavedItem(prod.id);

              return (
                <div
                  key={prod.id}
                  onClick={() => setSelectedProductDetail(prod)}
                  className="group cursor-pointer flex flex-col space-y-2.5 animate-slide-up"
                >
                  {/* Image Wrapper Aspect Ratio 3:4 */}
                  <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-neutral-50 shadow-xs border border-[#f0edeb]">
                    <LazyImageComponent
                      src={img}
                      alt={prod.name}
                      className="w-full h-full card-hover-zoom"
                    />

                    {/* Floating Heart Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSavedItem(prod);
                        showToast(isLiked ? `Đã bỏ lưu ${prod.name}` : `Đã lưu ${prod.name}`, 'success');
                      }}
                      className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md shadow-xs flex items-center justify-center text-textColor transition-all active:scale-90 hover:bg-white"
                    >
                      <svg
                        className={`w-4 h-4 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-[#526069]'}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>

                    {/* Floating Tag */}
                    {prod.tags && (
                      <span className="absolute bottom-2.5 left-2.5 z-10 text-[8px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-md text-textColor px-2.5 py-1 rounded-full border border-white/50 shadow-xs">
                        {prod.tags}
                      </span>
                    )}
                  </div>

                  {/* Product Details Section */}
                  <div className="px-1 flex flex-col text-left">
                    <span className="text-[9px] text-[#526069]/60 uppercase font-bold tracking-widest">
                      {prod.category?.name || 'Home'}
                    </span>
                    <h3 className="text-xs font-semibold text-textColor mt-0.5 line-clamp-1 group-hover:text-primary transition-colors">
                      {prod.name}
                    </h3>

                    {/* Render rating stars and count */}
                    <div className="flex items-center gap-1 mt-1 text-[9.5px] font-bold text-amber-500">
                      <span>⭐</span>
                      <span>
                        {prod.comments && prod.comments.length > 0
                          ? (prod.comments.reduce((sum: number, c: any) => sum + c.rating, 0) / prod.comments.length).toFixed(1)
                          : '5.0'}
                      </span>
                      <span className="text-textColor-variant font-semibold">
                        ({prod.comments ? prod.comments.length : 0} đánh giá)
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs font-extrabold text-textColor">{prod.price.toLocaleString('vi-VN')} đ</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAddToCart(prod); }}
                        className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm active:scale-90 transition-transform shadow-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}


          
          {/* Loading more indicator & intersection observer target */}
          <div ref={lastElementRef} className="w-full h-12 mt-4 flex items-center justify-center">
            {isFetchingMoreProducts && (
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
        </BoxCast>
      </div>

      {/* Side Menu Drawer (Collections & Brand Story) */}
      <MenuDrawerComponent
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        setSelectedCategory={setSelectedCategory}
      />

      {/* Floating Lucky Wheel Button */}
      <button
        onClick={() => setIsLuckyWheelOpen(true)}
        className="fixed bottom-24 right-5 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform animate-pulse border-2 border-white"
        style={{ animationDuration: '3s' }}
      >
        <span className="text-xl">🎡</span>
      </button>

      {/* Lucky Wheel Modal */}
      <LuckyWheel
        isOpen={isLuckyWheelOpen}
        onClose={() => setIsLuckyWheelOpen(false)}
        zaloUser={zaloUser}
        showToast={showToast}
      />
    </PageCast>
  );
}
