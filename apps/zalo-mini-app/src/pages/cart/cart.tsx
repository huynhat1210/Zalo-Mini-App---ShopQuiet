import { useEffect, useState } from 'react';
import { useCart } from '../../App';
import { apiRequest } from '../../utils/api';
import { EmptyStateComponent } from '../../components';
import { ICartProps } from './cart.type';

export const Cart: React.FC<ICartProps> = (_props) => {
  const { cart, updateQuantity, updateItemVariant, setActiveTab, setIsCartOpen, showToast } = useCart();
  const [estimatedShipping, setEstimatedShipping] = useState(5);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);

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

  const getItemKey = (item: any) => `${item.product.id}-${item.color || 'DEFAULT'}-${item.size || 'DEFAULT'}`;

  // Automatically check all items initially or when new items are added
  useEffect(() => {
    if (cart.length > 0) {
      setCheckedKeys((prev) => {
        const cartKeys = cart.map(getItemKey);
        const newKeys = [...prev];
        cartKeys.forEach(k => {
          if (!newKeys.includes(k)) {
            newKeys.push(k);
          }
        });
        return newKeys.filter(k => cartKeys.includes(k));
      });
    } else {
      setCheckedKeys([]);
    }
  }, [cart]);

  const toggleCheckItem = (key: string) => {
    setCheckedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleCheckAll = () => {
    if (checkedKeys.length === cart.length) {
      setCheckedKeys([]);
    } else {
      setCheckedKeys(cart.map(getItemKey));
    }
  };

  const selectedItems = cart.filter(item => checkedKeys.includes(getItemKey(item)));

  const subtotal = selectedItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Freeship threshold limit at 300,000 đ
  const freeshipThreshold = 300000;
  const isFreeshipEligible = subtotal >= freeshipThreshold;
  const remainingForFreeship = Math.max(0, freeshipThreshold - subtotal);
  const freeshipProgressPercent = Math.min(100, (subtotal / freeshipThreshold) * 100);

  const shipping = subtotal > 0 ? (isFreeshipEligible ? 0 : estimatedShipping) : 0;
  const total = subtotal + shipping;

  const handleProceedCheckout = () => {
    if (selectedItems.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 sản phẩm để thanh toán!', 'warning');
      return;
    }
    // Save selected checkout items & freeship status to localStorage
    localStorage.setItem('checkout_items', JSON.stringify(selectedItems));
    localStorage.setItem('checkout_freeship', isFreeshipEligible ? 'true' : 'false');
    setIsCartOpen(false);
    setActiveTab('checkout');
  };

  return (
    <div className="h-full flex flex-col bg-surface overflow-hidden">
      {/* Scrollable Cart Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto px-6 py-5.5 pb-28">
        {cart.length === 0 ? (
          <EmptyStateComponent
            title="Giỏ hàng trống"
            description="Có vẻ như bạn chưa thêm bất kỳ sản phẩm nào vào giỏ hàng. Hãy cùng khám phá các sản phẩm tối giản của chúng tôi!"
            actionText="Bắt đầu mua sắm"
            onAction={() => { setIsCartOpen(false); setActiveTab('home'); }}
          />
        ) : (
          /* Cart items list */
          <div className="space-y-4">
            {/* Freeship Progress Bar */}
            <div className="bg-teal-50 border border-teal-150 rounded-2xl p-4 mb-2 space-y-2 text-left">
              <div className="flex justify-between items-center text-xs">
                {isFreeshipEligible ? (
                  <span className="font-bold text-teal-700">🎉 Đơn hàng của bạn đã được FREESHIP!</span>
                ) : (
                  <span className="font-medium text-[#526069]">
                    Mua thêm <span className="font-bold text-teal-600">{remainingForFreeship.toLocaleString('vi-VN')} đ</span> để được Freeship (Mốc 300K)
                  </span>
                )}
                <span className="text-[10px] text-teal-600 font-extrabold">{subtotal.toLocaleString('vi-VN')}đ / 300.000đ</span>
              </div>
              <div className="w-full h-2.5 bg-teal-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-teal-500 rounded-full transition-all duration-300"
                  style={{ width: `${freeshipProgressPercent}%` }}
                />
              </div>
            </div>

            {/* Checkbox Select All */}
            <div className="flex items-center gap-3 pb-2 pl-1 border-b border-neutral-100 text-left">
              <input
                type="checkbox"
                className="w-4.5 h-4.5 text-primary accent-primary"
                checked={checkedKeys.length === cart.length && cart.length > 0}
                onChange={toggleCheckAll}
              />
              <span className="text-xs text-textColor-variant font-bold">Chọn tất cả ({cart.length} sản phẩm)</span>
            </div>

            <div className="space-y-3.5">
              {cart.map((item) => {
                const itemKey = getItemKey(item);
                let img = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=100&q=80';
                try {
                  const parsed = JSON.parse(item.product.images);
                  if (parsed && parsed.length > 0) img = parsed[0];
                } catch (e) {}

                return (
                  <div key={itemKey} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-[#f0edeb] shadow-xs relative hover:shadow-sm transition-all duration-300">
                    {/* Item Checkbox */}
                    <input
                      type="checkbox"
                      className="w-4.5 h-4.5 text-primary accent-primary flex-shrink-0 cursor-pointer"
                      checked={checkedKeys.includes(itemKey)}
                      onChange={() => toggleCheckItem(itemKey)}
                    />

                    {/* Product Image */}
                    <img src={img} alt={item.product.name} className="w-18 h-18 flex-shrink-0 object-cover rounded-xl border border-[#f0edeb]" />
                    
                    {/* Product details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="text-left">
                        <h4 className="text-xs font-semibold text-textColor line-clamp-1 pr-6 tracking-wide">{item.product.name}</h4>
                        <div className="flex flex-col mt-1 gap-1">
                          <span className="text-xs font-bold text-primary">{item.product.price.toLocaleString('vi-VN')} đ</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(() => {
                              // Check if product has real variants (non-DEFAULT size or color)
                              const hasRealVariants = item.product.variants && item.product.variants.length > 0 &&
                                (item.product.variants.some((v: any) => v.color && v.color !== 'DEFAULT') ||
                                 item.product.variants.some((v: any) => v.size && v.size !== 'DEFAULT'));

                              if (hasRealVariants) {
                                // Show dropdowns for products with variants
                                return (
                                  <>
                                    {item.product.variants!.some((v: any) => v.color && v.color !== 'DEFAULT') && (
                                      <select
                                        value={item.color}
                                        onChange={(e) => {
                                          updateItemVariant(item.product.id, item.size, item.size, item.color, e.target.value);
                                          showToast(`Đã đổi sang Màu: ${e.target.value}`, 'success');
                                        }}
                                        className="text-[9px] bg-neutral-100 text-[#526069] font-bold px-1.5 py-0.5 rounded outline-none border border-transparent hover:border-neutral-300 focus:bg-white cursor-pointer uppercase tracking-wider"
                                      >
                                        {Array.from(new Set(item.product.variants!.map((v: any) => v.color))).filter((c: string) => c && c !== 'DEFAULT').map((c: string) => (
                                          <option key={c} value={c}>Màu: {c}</option>
                                        ))}
                                        {item.color === 'DEFAULT' && <option value="DEFAULT">Màu: Mặc định</option>}
                                      </select>
                                    )}
                                    {item.product.variants!.some((v: any) => v.size && v.size !== 'DEFAULT') && (
                                      <select
                                        value={item.size}
                                        onChange={(e) => {
                                          updateItemVariant(item.product.id, item.size, e.target.value, item.color, item.color);
                                          showToast(`Đã đổi sang Size: ${e.target.value}`, 'success');
                                        }}
                                        className="text-[9px] bg-neutral-100 text-[#526069] font-bold px-1.5 py-0.5 rounded outline-none border border-transparent hover:border-neutral-300 focus:bg-white cursor-pointer uppercase tracking-wider"
                                      >
                                        {item.product.variants!
                                          .filter((v: any) => v.color === item.color && (v.stock > 0 || v.size === item.size))
                                          .map((v: any) => (
                                            <option key={v.size} value={v.size}>Size: {v.size}</option>
                                          ))}
                                        {item.size === 'DEFAULT' && <option value="DEFAULT">Size: Mặc định</option>}
                                      </select>
                                    )}
                                  </>
                                );
                              } else {
                                // No variants - don't show any variant UI
                                return null;
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-3">
                        {/* Quantity Selector Capsule */}
                        <div className="flex items-center gap-3 bg-[#f0edeb] rounded-full px-3 py-1">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.size, item.color)}
                            className="text-textColor-variant hover:text-textColor font-extrabold text-xs px-0.5 active:scale-75 transition-transform border-none bg-transparent cursor-pointer"
                          >
                            −
                          </button>
                          <span className="text-xs font-bold text-textColor min-w-3 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.size, item.color)}
                            className="text-textColor-variant hover:text-textColor font-extrabold text-xs px-0.5 active:scale-75 transition-transform border-none bg-transparent cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Trash Delete button */}
                        <button
                          onClick={() => updateQuantity(item.product.id, 0, item.size, item.color)}
                          className="text-red-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors border-none bg-transparent cursor-pointer"
                          title="Xóa"
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
          </div>
        )}

        {/* Order Summary Section */}
        {selectedItems.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#f0edeb] p-4.5 space-y-3.5 shadow-xs mt-4">
            <h3 className="text-[10px] font-bold uppercase text-[#526069]/70 tracking-widest text-left">Tóm tắt đơn hàng</h3>
            
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-textColor-variant font-medium">
                <span>Tạm tính ({selectedItems.length} món)</span>
                <span>{subtotal.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between text-textColor-variant font-medium">
                <span>Phí vận chuyển</span>
                <span>{shipping === 0 && subtotal > 0 ? <span className="text-teal-600 font-bold">Miễn phí (Freeship)</span> : `${shipping.toLocaleString('vi-VN')} đ`}</span>
              </div>
              <hr className="border-[#f0edeb] my-1" />
              <div className="flex justify-between font-bold text-textColor text-sm">
                <span>Tổng cộng</span>
                <span className="text-primary">{total.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cart Summary & Action footer - Fixed at bottom */}
      {selectedItems.length > 0 && (
        <div className="bg-white border-t border-[#f0edeb] px-4.5 py-4.5 flex-shrink-0 z-20 shadow-lg">
          <button
            onClick={handleProceedCheckout}
            className="w-full h-12 rounded-full text-xs font-bold uppercase tracking-widest bg-primary text-white hover:bg-primary-dark active:scale-[0.98] transition-all shadow-md flex items-center justify-center border-none"
          >
            Tiến hành đặt hàng ({selectedItems.length})
          </button>
        </div>
      )}
    </div>
  );
};
export default Cart;
