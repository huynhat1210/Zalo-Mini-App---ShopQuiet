import { useEffect, useState } from 'react';
import { Page } from 'zmp-ui';
import { useCart } from '../../App';
import { ISuccessOrder, IOrderSuccessProps } from './order-success.type';

const PageCast = Page as any;

export const OrderSuccess: React.FC<IOrderSuccessProps> = (_props) => {
  const { setActiveTab } = useCart();
  const [order, setOrder] = useState<ISuccessOrder | null>(null);

  useEffect(() => {
    const lastOrder = localStorage.getItem('last_success_order');
    if (lastOrder) {
      try {
        setOrder(JSON.parse(lastOrder));
      } catch (e) {
        console.error('Error parsing last order', e);
      }
    }
  }, []);

  // Standard fallback if no order details are in storage
  const mockOrder: ISuccessOrder = {
    orderNumber: 'SQ-82934',
    total: 69.00,
    itemsCount: 2,
    items: [
      {
        name: 'Handcrafted Ceramic Mug',
        price: 24.00,
        quantity: 1,
        images: JSON.stringify(['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=100&q=80'])
      },
      {
        name: 'Everyday Linen Tote',
        price: 45.00,
        quantity: 1,
        images: JSON.stringify(['https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=100&q=80'])
      }
    ]
  };

  const activeOrder = order || mockOrder;

  return (
    <PageCast className="bg-surface relative flex flex-col w-full h-full overscroll-none scrollbar-none animate-fade-in">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-[#f0edeb] sticky top-0 z-30 shadow-xs">
        <button onClick={() => setActiveTab('home')} className="p-1.5 hover:bg-[#f0edeb] rounded-full transition-colors active:scale-95">
          <svg className="w-5.5 h-5.5 text-textColor" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-textColor">Đã xác nhận đơn hàng</span>
        <div className="w-8"></div>
      </div>

      <div className="flex-1 px-6 py-5.5 space-y-6 pb-28">
        {/* Success Indicator Card */}
        <div className="bg-white rounded-2xl border border-[#f0edeb] p-6.5 text-center space-y-3.5 shadow-xs">
          <div className="w-12.5 h-12.5 bg-primary-light rounded-full flex items-center justify-center text-primary mx-auto shadow-xs">
            <svg className="w-6.5 h-6.5" fill="none" stroke="currentColor" strokeWidth="2.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-textColor leading-tight">Cảm ơn bạn đã đặt hàng!</h2>
            <p className="text-xs text-textColor-variant leading-relaxed max-w-[270px] mx-auto">
              Đơn hàng <span className="font-semibold text-textColor">#{activeOrder.orderNumber}</span> của bạn đã được ghi nhận và đang chuẩn bị giao.
            </p>
          </div>
        </div>

        {/* Estimated Delivery Card */}
        <div className="bg-white rounded-2xl border border-[#f0edeb] p-4.5 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 bg-[#fbf9f7] rounded-full flex items-center justify-center text-primary border border-primary/5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125a1.125 1.125 0 001.125-1.125V9.75M16.5 18.75h-2.25m0-11.25H3.375a1.125 1.125 0 00-1.125 1.125V18h1.5m10.125-9.75V9m3.75 3h1.5m-.75-3v7.5M12 9v1.5m-1.5-1.5H12" />
              </svg>
            </div>
            <div className="text-xs">
              <p className="text-[#526069]/60 font-semibold uppercase tracking-wider text-[9px]">Dự kiến giao hàng</p>
              <p className="font-bold text-textColor mt-0.5">3 - 5 ngày làm việc</p>
            </div>
          </div>
        </div>

        {/* IOrder Summary Bento Card */}
        <div className="bg-white rounded-2xl border border-[#f0edeb] overflow-hidden shadow-xs">
          <div className="px-4.5 py-4 bg-neutral-50 border-b border-[#f0edeb] flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-textColor-variant">
            <span>Tóm tắt đơn hàng</span>
            <span>{activeOrder.itemsCount} Sản phẩm</span>
          </div>

          <div className="px-4.5 py-2 divide-y divide-[#f0edeb]">
            {activeOrder.items.map((item, idx) => {
              let img = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=100&q=80';
              try {
                const parsed = JSON.parse(item.images);
                if (parsed && parsed.length > 0) img = parsed[0];
              } catch (e) {}

              return (
                <div key={idx} className="flex justify-between items-center py-3.5">
                  <div className="flex items-center gap-3.5">
                    <img src={img} alt={item.name} className="w-12 h-12 object-cover rounded-lg border border-[#f0edeb]" />
                    <div className="text-xs space-y-0.5">
                      <p className="font-semibold text-textColor line-clamp-1 max-w-[170px] pr-2">{item.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                        <span className="text-textColor-variant font-medium">SL: x{item.quantity}</span>
                        {item.color && item.color !== 'DEFAULT' && (
                          <span className="bg-[#fcf8f5] border border-orange-200/50 text-orange-700 px-1.5 py-0.2 rounded font-medium text-[8px]">
                            Màu: {item.color}
                          </span>
                        )}
                        {item.size && item.size !== 'DEFAULT' && (
                          <span className="bg-neutral-100 text-[#526069] px-1.5 py-0.2 rounded font-medium uppercase text-[8px]">
                            Size: {item.size}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-textColor">{(item.price * item.quantity).toLocaleString('vi-VN')} đ</span>
                </div>
              );
            })}
          </div>

          <div className="px-4.5 py-4 bg-neutral-50 border-t border-[#f0edeb] flex justify-between items-center text-xs font-bold text-textColor">
            <span className="uppercase tracking-wider text-[10px] text-textColor-variant font-extrabold">Tổng thanh toán</span>
            <span className="text-base font-extrabold text-primary">{activeOrder.total.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3 pt-2.5">
          <button
            onClick={() => setActiveTab('orders')}
            className="w-full h-11.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary text-white hover:bg-primary-dark active:scale-[0.98] transition-all shadow-sm"
          >
            Theo dõi đơn hàng
          </button>
          
          <button
            onClick={() => setActiveTab('home')}
            className="w-full h-11.5 rounded-full text-xs font-bold uppercase tracking-wider border border-[#eae8e6] text-[#526069] bg-white hover:bg-neutral-50 active:scale-[0.98] transition-all"
          >
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    </PageCast>
  );
}
