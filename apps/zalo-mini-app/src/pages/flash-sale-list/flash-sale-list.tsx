import { useState, useEffect } from 'react';
import { useCart } from '../../App';
import { LazyImageComponent } from '../../components/lazy-image';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export const FlashSaleList = () => {
  const { setActiveTab, setSelectedProductDetail, addToComparison, comparisonProducts } = useCart();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Load products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${window.location.origin}/api/v1/products?page=1&limit=20`);
        const data = await response.json();
        const productList = Array.isArray(data) ? data : data?.data || [];
        // Map originalPrice to simulate discount
        const mapped = productList.map((p: any) => ({
          ...p,
          originalPrice: p.price * 1.3,
        }));
        setProducts(mapped);
      } catch (e) {
        console.error('Failed to load flash sale products:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Countdown timer (24h from now)
  useEffect(() => {
    const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000).getTime();
    
    const calculateTimeLeft = () => {
      const difference = endTime - Date.now();
      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  return (
    <div className="h-full flex flex-col bg-surface overflow-hidden">
      {/* Header */}
      <div className="h-14 bg-primary px-4 flex items-center gap-3 flex-shrink-0 shadow-sm z-10">
        <button
          onClick={() => setActiveTab('home')}
          className="p-1.5 rounded-full hover:bg-white/10 text-white border-none bg-transparent cursor-pointer active:scale-95 transition-transform"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <span className="text-white font-bold text-sm uppercase tracking-wider">Cơ hội Flash Sale</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4.5 py-4 space-y-4">
        {/* Countdown Card */}
        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-4.5 text-center text-white shadow-md">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary-light/80 mb-2">Chương trình kết thúc sau</p>
          <div className="flex items-center justify-center gap-2">
            <div className="bg-white/15 backdrop-blur-md rounded-lg px-3 py-2 text-white font-bold text-sm">
              {formatTime(timeLeft.days)}d
            </div>
            <span className="text-white/80 font-bold">:</span>
            <div className="bg-white/15 backdrop-blur-md rounded-lg px-3 py-2 text-white font-bold text-sm">
              {formatTime(timeLeft.hours)}h
            </div>
            <span className="text-white/80 font-bold">:</span>
            <div className="bg-white/15 backdrop-blur-md rounded-lg px-3 py-2 text-white font-bold text-sm">
              {formatTime(timeLeft.minutes)}m
            </div>
            <span className="text-white/80 font-bold">:</span>
            <div className="bg-white/15 backdrop-blur-md rounded-lg px-3 py-2 text-white font-bold text-sm">
              {formatTime(timeLeft.seconds)}s
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-textColor-variant text-xs">
            Đang tải sản phẩm sale...
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-textColor-variant text-xs">
            Không có sản phẩm Flash Sale nào hôm nay.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 pb-8">
            {products.map((product) => {
              let img = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80';
              try {
                const parsed = JSON.parse(product.images);
                if (parsed && parsed.length > 0) img = parsed[0];
              } catch (e) {}

              const discountPercent = product.originalPrice 
                ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                : 0;

              const isComparing = comparisonProducts.some((p: any) => p.id === product.id);

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-[#f0edeb] shadow-xs overflow-hidden hover:shadow-md transition-all duration-300 relative flex flex-col"
                >
                  {/* Image & Badges */}
                  <div 
                    onClick={() => setSelectedProductDetail(product)}
                    className="relative h-40 bg-neutral-50 cursor-pointer"
                  >
                    <LazyImageComponent src={img} alt={product.name} className="w-full h-full object-cover" />
                    {discountPercent > 0 && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        -{discountPercent}%
                      </div>
                    )}
                  </div>

                  {/* Add to Comparison Toggle Button */}
                  <button
                    onClick={() => addToComparison(product)}
                    className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm border transition-colors ${
                      isComparing 
                        ? 'bg-primary text-white border-primary' 
                        : 'bg-white text-textColor hover:bg-neutral-50 border-[#f0edeb]'
                    } cursor-pointer active:scale-90`}
                    title="So sánh sản phẩm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </button>

                  {/* Product Info */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 
                        onClick={() => setSelectedProductDetail(product)}
                        className="text-xs font-semibold text-textColor line-clamp-1 mb-1.5 cursor-pointer hover:text-primary transition-colors"
                      >
                        {product.name}
                      </h3>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-red-500">
                          {product.price.toLocaleString('vi-VN')}đ
                        </span>
                        {product.originalPrice && (
                          <span className="text-[10px] text-textColor-variant line-through font-medium">
                            {product.originalPrice.toLocaleString('vi-VN')}đ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="mt-3">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${Math.min(((product.soldCount || 10) / ((product.soldCount || 10) + 15)) * 100, 95)}%` }}
                          />
                        </div>
                        <span className="text-[8px] font-bold text-textColor-variant whitespace-nowrap">
                          Đã bán {product.soldCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
