import { useState, useEffect } from 'react';
import { IFlashSaleProps } from './flash-sale.type';
import { LazyImageComponent } from '../lazy-image';

export const FlashSale: React.FC<IFlashSaleProps> = ({ endTime, products }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endTime).getTime() - new Date().getTime();
      
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
  }, [endTime]);

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  return (
    <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm uppercase tracking-wider">Flash Sale</span>
          <div className="flex items-center gap-1">
            <div className="bg-white/20 backdrop-blur-sm rounded px-2 py-1 text-white font-bold text-xs">
              {formatTime(timeLeft.days)}d
            </div>
            <span className="text-white font-bold">:</span>
            <div className="bg-white/20 backdrop-blur-sm rounded px-2 py-1 text-white font-bold text-xs">
              {formatTime(timeLeft.hours)}h
            </div>
            <span className="text-white font-bold">:</span>
            <div className="bg-white/20 backdrop-blur-sm rounded px-2 py-1 text-white font-bold text-xs">
              {formatTime(timeLeft.minutes)}m
            </div>
            <span className="text-white font-bold">:</span>
            <div className="bg-white/20 backdrop-blur-sm rounded px-2 py-1 text-white font-bold text-xs">
              {formatTime(timeLeft.seconds)}s
            </div>
          </div>
        </div>
        <button className="text-white text-xs font-semibold hover:underline">
          Xem tất cả
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {products.map((product) => {
          let img = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80';
          try {
            const parsed = JSON.parse(product.images);
            if (parsed && parsed.length > 0) img = parsed[0];
          } catch (e) {}

          const discountPercent = product.originalPrice 
            ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
            : 0;

          return (
            <div
              key={product.id}
              className="flex-shrink-0 w-32 bg-white rounded-xl overflow-hidden shadow-sm"
            >
              <div className="relative h-28 bg-neutral-50">
                <LazyImageComponent src={img} alt={product.name} className="w-full h-full" />
                {discountPercent > 0 && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    -{discountPercent}%
                  </div>
                )}
              </div>
              <div className="p-2">
                <h3 className="text-xs font-semibold text-textColor line-clamp-1 mb-1">{product.name}</h3>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-red-500">
                    {product.price.toLocaleString('vi-VN')}đ
                  </span>
                  {product.originalPrice && (
                    <span className="text-[10px] text-textColor-variant line-through">
                      {product.originalPrice.toLocaleString('vi-VN')}đ
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${Math.random() * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-textColor-variant">
                      Đã bán {product.soldCount || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
