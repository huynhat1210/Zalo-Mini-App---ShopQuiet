import { useCart, IOrderItem } from '../../App';
import { apiRequest } from '../../utils/api';
import { IPaymentSimulateComponentProps } from './payment-simulate.type';

export const PaymentSimulateComponent: React.FC<IPaymentSimulateComponentProps> = (_props) => {
  const { selectedOrder, setActiveTab, showToast, clearCart, buyNowItem, setBuyNowItem, fetchNotifications } = useCart();

  if (!selectedOrder) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
        <span className="text-4xl">⚠️</span>
        <p className="text-xs text-textColor-variant">Không tìm thấy thông tin đơn hàng thanh toán.</p>
        <button
          onClick={() => setActiveTab('home')}
          className="h-10 px-6 bg-primary text-white text-xs font-bold uppercase rounded-full border-none cursor-pointer"
        >
          Quay lại trang chủ
        </button>
      </div>
    );
  }

  const handlePaySuccess = async () => {
    try {
      showToast('Đang xử lý giao dịch...', 'info');
      // Update status to PROCESSING on backend
      await apiRequest(`/orders/${selectedOrder.id}/status`, 'PATCH', { status: 'PROCESSING' });
      
      // Update local storage order cache as well
      const userId = localStorage.getItem('zalo_profile_custom') 
        ? JSON.parse(localStorage.getItem('zalo_profile_custom')!).id || 'cust-zalo-id-1'
        : 'cust-zalo-id-1';
      const offlineOrders = JSON.parse(localStorage.getItem(`offline_orders_${userId}`) || '[]');
      const updated = offlineOrders.map((o: any) => o.id === selectedOrder.id ? { ...o, status: 'PROCESSING' } : o);
      localStorage.setItem(`offline_orders_${userId}`, JSON.stringify(updated));

      // Setup details for final success tab display
      localStorage.setItem('last_success_order', JSON.stringify({
        orderNumber: selectedOrder.id,
        total: selectedOrder.totalAmount,
        itemsCount: (selectedOrder.items ?? []).reduce((sum: number, item: IOrderItem) => sum + item.quantity, 0),
        items: (selectedOrder.items ?? []).map((item: IOrderItem) => ({
          name: item.product?.name || 'Sản phẩm',
          price: item.price,
          quantity: item.quantity,
          size: item.size || 'DEFAULT'
        }))
      }));

      // Clear order cart
      if (buyNowItem) {
        setBuyNowItem(null);
      } else {
        clearCart();
      }

      showToast('Thanh toán thành công!', 'success');
      if (fetchNotifications) {
        fetchNotifications();
      }
      setActiveTab('order-success');
    } catch (e) {
      console.error(e);
      showToast('Thanh toán thất bại, vui lòng thử lại!', 'warning');
    }
  };

  const handlePayFail = () => {
    // Keep PENDING_PAYMENT status and redirect to draft orders
    showToast('Thanh toán chưa hoàn tất. Đơn hàng đã lưu vào Đơn nháp!', 'warning');
    setActiveTab('orders');
  };

  const isMoMo = selectedOrder.paymentMethod === 'MOMO';
  const isBank = selectedOrder.paymentMethod === 'BANK';

  let methodTitle = 'Cổng thanh toán ZaloPay';
  let methodBg = 'bg-[#007aff]';
  if (isMoMo) {
    methodTitle = 'Cổng thanh toán MoMo';
    methodBg = 'bg-[#a50064]';
  } else if (isBank) {
    methodTitle = 'Chuyển khoản Ngân hàng (QR)';
    methodBg = 'bg-[#1b5e20]';
  }

  return (
    <div className="bg-[#fbf9f7] min-h-screen flex flex-col items-center justify-between pb-8 animate-fade-in relative z-[150]">
      {/* Top Banner */}
      <div className={`w-full ${methodBg} text-white px-6 py-8 text-center space-y-2 shadow-md flex-shrink-0`}>
        <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-85">Cổng Thanh Toán Giả Lập</span>
        <h2 className="text-xl font-bold">{methodTitle}</h2>
        <p className="text-xs opacity-90">Đang thực hiện thanh toán an toàn cho đơn hàng của bạn</p>
      </div>

      {/* Main Box */}
      <div className="flex-1 w-full max-w-sm px-6 py-8 flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-[#f0edeb] p-6 shadow-xl space-y-6 text-center">
          <div className="space-y-1">
            <span className="text-[10px] text-textColor-variant font-bold uppercase tracking-wider">Mã đơn hàng</span>
            <h3 className="text-lg font-extrabold text-textColor">{selectedOrder.id}</h3>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-textColor-variant font-bold uppercase tracking-wider">Số tiền cần thanh toán</span>
            <h2 className="text-2xl font-black text-primary">{selectedOrder.totalAmount.toLocaleString('vi-VN')} đ</h2>
          </div>

          <div className="bg-[#fbf9f7] border border-[#f0edeb] rounded-2xl p-4 text-left space-y-3">
            <span className="text-[9px] text-[#526069]/70 font-extrabold uppercase tracking-widest block">Chi tiết sản phẩm</span>
            <div className="divide-y divide-[#f0edeb] text-xs">
              {(selectedOrder.items ?? []).map((item: IOrderItem, idx: number) => (
                <div key={idx} className="py-2.5 flex justify-between">
                  <span className="text-textColor truncate max-w-[200px]">
                    {item.product?.name || 'Sản phẩm'}{item.size && item.size !== 'DEFAULT' ? ` (${item.size})` : ''}
                  </span>
                  <span className="font-semibold text-textColor/75">x{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex gap-2.5 items-start text-left text-[10px] text-amber-800">
            <span className="text-sm">💡</span>
            <p className="leading-relaxed">Đây là môi trường thử nghiệm lập trình. Bạn có thể bấm xác nhận đã chuyển khoản để giả lập thanh toán thành công và tự động trừ kho hàng.</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-sm px-6 space-y-3 flex-shrink-0">
        <button
          onClick={handlePaySuccess}
          className="w-full h-12 bg-primary hover:bg-primary-dark text-white font-bold text-xs uppercase tracking-widest rounded-full shadow-md active:scale-98 transition-all border-none cursor-pointer"
        >
          Xác nhận đã thanh toán
        </button>
        <button
          onClick={handlePayFail}
          className="w-full h-12 bg-white hover:bg-neutral-50 text-red-500 font-bold text-xs uppercase tracking-widest rounded-full border border-[#f0edeb] shadow-xs active:scale-98 transition-all cursor-pointer"
        >
          Hủy thanh toán (Lưu đơn nháp)
        </button>
      </div>
    </div>
  );
}
