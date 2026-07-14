import { useEffect, useState } from 'react';
import { useCart } from '../../App';
import { apiRequest } from '../../utils/api';
import { EmptyStateComponent } from '../../components';
import { ICartComponentProps } from './cart.type';

export const CartComponent: React.FC<ICartComponentProps> = (_props) => {
  const { cart, updateQuantity, updateItemSize, setActiveTab, setIsCartOpen, showToast } = useCart();
  const [estimatedShipping, setEstimatedShipping] = useState(5);

  useEffect(() => {
    async function loadShippingEstimate() {
      try {
        const methods = await apiRequest<Array<{ price: number }>>('/cms/shipping-methods');
        const paidMethod = methods.find((method) => method.price > 0);
        setEstimatedShipping(paidMethod?.price ?? methods[0]?.price ?? 0);
      } catch (e) {
        console.error('Failed to load cart shipping estimate:', e);
      }
    }

    loadShippingEstimate();
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal > 0 ? estimatedShipping : 0.00;
  const total = subtotal + shipping;

  const handleProceedCheckout = () => {
    if (cart.length === 0) {
      showToast('Giỏ hàng trống!', 'warning');
      return;
    }
    setIsCartOpen(false);
    setActiveTab('checkout');
  };

  return (
    <div className="h-full flex flex-col bg-surface overflow-hidden">
      {/* Scrollable Cart Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto px-6 py-5.5 pb-28">
        {cart.length === 0 ? (
          <EmptyStateComponent
            title="Cart is empty"
            description="Looks like you haven't added anything to your bag yet. Let's find some minimal goods!"
            actionText="Start Shopping"
            onAction={() => { setIsCartOpen(false); setActiveTab('home'); }}
          />
        ) : (
          /* Cart items list */
          <div className="space-y-3.5">
            {cart.map((item) => {
              let img = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=100&q=80';
              try {
                const parsed = JSON.parse(item.product.images);
                if (parsed && parsed.length > 0) img = parsed[0];
              } catch (e) {}

              return (
                <div key={`${item.product.id}-${item.size}`} className="flex gap-4 p-4 bg-white rounded-2xl border border-[#f0edeb] shadow-xs relative hover:shadow-sm transition-all duration-300">
                  {/* Product Image */}
                  <img src={img} alt={item.product.name} className="w-18 h-18 flex-shrink-0 object-cover rounded-xl border border-[#f0edeb]" />
                  
                  {/* Product details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="text-left">
                      <h4 className="text-xs font-semibold text-textColor line-clamp-1 pr-6 tracking-wide">{item.product.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs font-bold text-primary">${item.product.price.toFixed(2)}</span>
                        {item.product.variants && item.product.variants.length > 0 && item.product.variants.some(v => v.size !== 'DEFAULT') ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={item.size}
                              onChange={(e) => {
                                updateItemSize(item.product.id, item.size, e.target.value);
                                showToast(`Đã đổi sang Size: ${e.target.value}`, 'success');
                              }}
                              className="text-[9px] bg-neutral-100 text-[#526069] font-bold px-1.5 py-0.5 rounded outline-none border border-transparent hover:border-neutral-300 focus:bg-white cursor-pointer uppercase tracking-wider"
                            >
                              {item.product.variants
                                .filter(v => v.stock > 0 || v.size === item.size)
                                .map((v) => (
                                  <option key={v.size} value={v.size}>
                                    Size: {v.size}
                                  </option>
                                ))}
                            </select>
                          </div>
                        ) : item.size && item.size !== 'DEFAULT' ? (
                          <span className="text-[9px] bg-neutral-100 text-[#526069] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            Size: {item.size}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3">
                      {/* Quantity Selector Capsule */}
                      <div className="flex items-center gap-3 bg-[#f0edeb] rounded-full px-3 py-1">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.size)}
                          className="text-textColor-variant hover:text-textColor font-extrabold text-xs px-0.5 active:scale-75 transition-transform border-none bg-transparent cursor-pointer"
                        >
                          −
                        </button>
                        <span className="text-xs font-bold text-textColor min-w-3 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.size)}
                          className="text-textColor-variant hover:text-textColor font-extrabold text-xs px-0.5 active:scale-75 transition-transform border-none bg-transparent cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Trash Delete button */}
                      <button
                        onClick={() => updateQuantity(item.product.id, 0, item.size)}
                        className="text-red-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors border-none bg-transparent cursor-pointer"
                        title="Remove"
                      >
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* IOrder Summary Section */}
        {cart.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#f0edeb] p-4.5 space-y-3.5 shadow-xs">
            <h3 className="text-[10px] font-bold uppercase text-[#526069]/70 tracking-widest">IOrder Summary</h3>
            
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-textColor-variant font-medium">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-textColor-variant font-medium">
                <span>Shipping</span>
                <span>${shipping.toFixed(2)}</span>
              </div>
              <hr className="border-[#f0edeb] my-1" />
              <div className="flex justify-between font-bold text-textColor">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cart Summary & Action footer - Fixed at bottom */}
      {cart.length > 0 && (
        <div className="bg-white border-t border-[#f0edeb] px-4.5 py-4.5 flex-shrink-0 z-20 shadow-lg">
          <button
            onClick={handleProceedCheckout}
            className="w-full h-12 rounded-full text-xs font-bold uppercase tracking-widest bg-primary text-white hover:bg-primary-dark active:scale-[0.98] transition-all shadow-md flex items-center justify-center border-none"
          >
            Proceed to Checkout
          </button>
        </div>
      )}
    </div>
  );
}
