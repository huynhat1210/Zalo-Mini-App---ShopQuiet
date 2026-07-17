import { useState } from 'react';
import { Page } from 'zmp-ui';
import { useCart, IOrderItem } from '../../App';
import { apiRequest } from '../../utils/api';
import { IOrderDetailProps } from './order-detail.type';
import { Payment } from 'zmp-sdk/apis';

const PageCast = Page as any;

const STATUS_LABEL: Record<string, string> = {
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  PENDING_PAYMENT: 'Chờ thanh toán',
};

const STATUS_CLASS: Record<string, string> = {
  PROCESSING: 'bg-yellow-50 text-yellow-700',
  SHIPPED: 'bg-blue-50 text-blue-700',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-600',
  PENDING_PAYMENT: 'bg-orange-50 text-orange-600',
};

export const OrderDetail: React.FC<IOrderDetailProps> = (_props) => {
  const { selectedOrder, setSelectedOrder, setActiveTab, showToast } = useCart();
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [paying, setPaying] = useState(false);

  if (!selectedOrder) {
    return (
      <PageCast className="bg-surface p-6 text-center text-xs">
        <p>Không tìm thấy đơn hàng.</p>
        <button
          onClick={() => setActiveTab('profile')}
          className="mt-4 bg-primary text-white px-4 py-2 rounded-xl border-none font-bold cursor-pointer"
        >
          Quay lại trang cá nhân
        </button>
      </PageCast>
    );
  }

  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      await apiRequest(`/orders/${selectedOrder.id}/status`, 'PATCH', { status: 'CANCELLED' });
      showToast('Đã hủy đơn hàng thành công!', 'success');
      setSelectedOrder({ ...selectedOrder, status: 'CANCELLED' });
      setConfirmCancel(false);
    } catch (e: any) {
      showToast(e?.message || 'Không thể hủy đơn hàng!', 'warning');
    } finally {
      setCancelling(false);
    }
  };

  const handleContinuePayment = async () => {
    setPaying(true);
    try {
      showToast('Đang khởi tạo thanh toán...', 'info');
      const checkoutRes = await apiRequest<any>(`/orders/${selectedOrder.id}/zalopay-mac`, 'POST', { paymentMethod: selectedOrder.paymentMethod });
      
      if (checkoutRes && checkoutRes.mac) {
        Payment.createOrder({
          amount: checkoutRes.amount,
          desc: checkoutRes.desc,
          item: JSON.parse(checkoutRes.item),
          extradata: checkoutRes.extradata,
          method: checkoutRes.method,
          mac: checkoutRes.mac,
          success: (data) => {
            console.log('Zalo SDK Payment Success from Order Detail:', data);
            Payment.checkTransaction({
              data: data,
              success: (result) => {
                const resultCode = (result as any).resultCode;
                if (resultCode === 1) {
                  apiRequest(`/orders/${selectedOrder.id}/status`, 'PATCH', { status: 'PROCESSING' })
                    .then(() => {
                      showToast('Thanh toán ZaloPay thành công!', 'success');
                      setSelectedOrder({ ...selectedOrder, status: 'PROCESSING' });
                    })
                    .catch((e) => {
                      console.error('Failed to update status after checkTransaction success:', e);
                      showToast('Thanh toán thành công, vui lòng chờ hệ thống cập nhật!', 'success');
                    });
                } else if (resultCode === 0) {
                  showToast('Giao dịch đang được xử lý...', 'info');
                } else if (resultCode === -2) {
                  showToast('Bạn đã hủy thanh toán ZaloPay!', 'warning');
                } else {
                  showToast('Thanh toán ZaloPay thất bại!', 'warning');
                }
              },
              fail: (err) => {
                console.error('checkTransaction failed:', err);
                showToast('Không thể xác minh giao dịch!', 'warning');
              }
            });
          },
          fail: (err) => {
            console.error('Payment.createOrder failed from Order Detail:', err);
            showToast('Không thể khởi chạy cổng ZaloPay!', 'warning');
          }
        });
      }
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || 'Lỗi khởi tạo cổng thanh toán!', 'warning');
    } finally {
      setPaying(false);
    }
  };


  const statusLabel = STATUS_LABEL[selectedOrder.status] || selectedOrder.status;
  const statusClass = STATUS_CLASS[selectedOrder.status] || 'bg-neutral-100 text-textColor-variant';
  const isPendingPayment = selectedOrder.status === 'PENDING_PAYMENT';
  const isCancellable = ['PROCESSING', 'PENDING_PAYMENT'].includes(selectedOrder.status);

  return (
    <PageCast className="bg-surface flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-[#f0edeb] sticky top-0 z-30 shadow-xs flex-shrink-0">
        <button 
          onClick={() => {
            setSelectedOrder(null);
            setActiveTab('profile');
          }} 
          className="p-1.5 -ml-1.5 hover:bg-[#f0edeb] rounded-full transition-colors active:scale-95 border-none bg-transparent cursor-pointer"
        >
          <svg className="w-5.5 h-5.5 text-textColor" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-textColor">Chi tiết đơn hàng</span>
        <div className="w-8"></div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5.5 space-y-5 text-xs text-left pb-28">
        
        {/* ZaloPay Pending Banner */}
        {isPendingPayment && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4.5 space-y-3 animate-fade-in">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⏳</span>
              <div>
                <p className="font-bold text-orange-700 text-xs">Chờ thanh toán ZaloPay</p>
                <p className="text-orange-600/80 text-[10px] mt-0.5 leading-relaxed">
                  Đơn hàng đã được tạo nhưng chưa thanh toán. Nếu đã thanh toán, vui lòng đợi hệ thống xác nhận (1-5 phút).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* IOrder Number & Status card */}
        <div className="bg-white rounded-2xl border border-[#f0edeb] p-4.5 space-y-3.5 shadow-xs relative text-left">
          <div className="flex justify-between items-center pb-2.5 border-b border-[#f0edeb]">
            <div>
              <span className="text-xs font-bold text-textColor">Mã đơn #{selectedOrder.id}</span>
              <span className="text-[10px] text-textColor-variant block mt-0.5 font-medium">
                {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${statusClass}`}>
              {statusLabel}
            </span>
          </div>

          {/* Delivery tracking status timeline — only for non-draft orders */}
          {!isPendingPayment && (
            <div className="pt-1.5 space-y-3">
              <div className="text-[9px] font-extrabold text-[#526069]/65 uppercase tracking-widest">Lịch trình đơn hàng</div>
              
              <div className="flex flex-col gap-3 pl-2.5 relative border-l-2 border-neutral-100 mt-1.5">
                {(selectedOrder.status === 'CANCELLED' ? [
                  { label: 'Đã nhận đơn hàng', desc: 'Hệ thống đã ghi nhận đơn thành công', active: true, isCancelled: false },
                  { label: 'Đơn hàng đã hủy', desc: 'Đơn hàng đã bị hủy bỏ', active: true, isCancelled: true }
                ] : [
                  { label: 'Đã nhận đơn hàng', desc: 'Hệ thống đã ghi nhận đơn thành công', active: true, isCancelled: false },
                  { label: 'Đang chuẩn bị', desc: 'Kho hàng đang đóng gói sản phẩm của bạn', active: selectedOrder.status === 'PROCESSING' || selectedOrder.status === 'SHIPPED' || selectedOrder.status === 'DELIVERED', isCancelled: false },
                  { label: 'Đang giao hàng', desc: 'Đơn hàng đã bàn giao cho đơn vị vận chuyển', active: selectedOrder.status === 'SHIPPED' || selectedOrder.status === 'DELIVERED', isCancelled: false },
                  { label: 'Đã hoàn thành', desc: 'Đơn hàng đã được giao nhận thành công', active: selectedOrder.status === 'DELIVERED', isCancelled: false }
                ]).map((step, sIdx) => (
                  <div key={sIdx} className="relative pl-5 text-xs">
                    <div className={`absolute left-[-16px] top-[3px] w-2.5 h-2.5 rounded-full border-2 ${
                      step.active 
                        ? (step.isCancelled ? 'bg-red-500 border-red-500 shadow-xs scale-105' : 'bg-primary border-primary shadow-xs scale-105') 
                        : 'bg-white border-neutral-300'
                    }`} />
                    <div className="space-y-0.5">
                      <p className={`font-bold ${step.active ? (step.isCancelled ? 'text-red-600' : 'text-textColor') : 'text-textColor-variant/50'}`}>{step.label}</p>
                      <p className={`text-[10px] ${step.active ? (step.isCancelled ? 'text-red-500/80' : 'text-textColor-variant') : 'text-textColor-variant/40'}`}>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delivery address info */}
        <div className="space-y-2.5">
          <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#526069]/70 px-1">Thông tin giao hàng</h2>
          <div className="bg-white rounded-2xl border border-[#f0edeb] p-4.5 shadow-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-textColor-variant">Người nhận:</span>
              <span className="font-bold text-textColor">{selectedOrder.shippingName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textColor-variant">Số điện thoại:</span>
              <span className="font-bold text-textColor">{selectedOrder.shippingPhone}</span>
            </div>
            <div className="flex flex-col mt-1 pt-1.5 border-t border-[#f5f3f0]">
              <span className="text-textColor-variant">Địa chỉ nhận:</span>
              <span className="font-semibold text-textColor mt-0.5 leading-relaxed">{selectedOrder.shippingAddress || 'Chưa cung cấp'}</span>
            </div>
          </div>
        </div>

        {/* Purchased products list */}
        <div className="space-y-2.5">
          <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#526069]/70 px-1">Danh sách sản phẩm</h2>
          <div className="bg-white rounded-2xl border border-[#f0edeb] divide-y divide-[#f0edeb] shadow-xs overflow-hidden">
            {selectedOrder.items?.map((item: IOrderItem, idx: number) => (
              <div key={idx} className="flex justify-between items-center p-4">
                <div className="text-left space-y-1">
                  <span className="font-semibold text-textColor leading-tight block">{item.product?.name}</span>
                  <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                    <span className="text-textColor-variant">SL: x{item.quantity}</span>
                    {item.color && item.color !== 'DEFAULT' && (
                      <span className="bg-[#fcf8f5] border border-orange-200/50 text-orange-700 px-1.5 py-0.5 rounded font-medium text-[8px]">
                        Màu: {item.color}
                      </span>
                    )}
                    {item.size && item.size !== 'DEFAULT' && (
                      <span className="bg-neutral-100 text-[#526069] px-1.5 py-0.5 rounded font-medium uppercase text-[8px]">
                        Size: {item.size}
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-extrabold text-textColor">{(item.price * item.quantity).toLocaleString('vi-VN')} đ</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment recap */}
        <div className="space-y-2.5">
          <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#526069]/70 px-1">Chi tiết thanh toán</h2>
          <div className="bg-white rounded-2xl border border-[#f0edeb] p-4.5 shadow-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-textColor-variant">Phương thức:</span>
              <span className="font-bold text-textColor">
                {selectedOrder.paymentMethod === 'ZALOPAY' ? '💳 Cổng ZaloPay' : '💵 COD (Tiền mặt)'}
              </span>
            </div>
            {selectedOrder.voucherCode && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Voucher ({selectedOrder.voucherCode}):</span>
                <span>-{selectedOrder.discountAmount?.toLocaleString('vi-VN')} đ</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-textColor pt-2.5 border-t border-dashed border-[#f0edeb] text-sm">
              <span>Tổng thanh toán:</span>
              <span className="text-primary">{selectedOrder.totalAmount.toLocaleString('vi-VN')} đ</span>
            </div>
          </div>
        </div>

        {/* ZaloPay Continue Payment */}
        {isPendingPayment && selectedOrder.paymentMethod === 'ZALOPAY' && (
          <button
            disabled={paying || cancelling}
            onClick={handleContinuePayment}
            className="w-full h-11 bg-primary hover:bg-primary-dark text-white font-bold text-xs uppercase tracking-widest rounded-2xl cursor-pointer shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-2.5 disabled:bg-neutral-300 disabled:cursor-not-allowed border-none"
          >
            {paying ? 'Đang khởi tạo...' : '💳 Tiếp Tục Thanh Toán'}
          </button>
        )}

        {/* Cancel action */}
        {isCancellable && !confirmCancel && (
          <button
            disabled={cancelling}
            onClick={() => setConfirmCancel(true)}
            className="w-full h-11 border border-red-200 bg-red-50 text-red-600 font-bold text-xs uppercase tracking-widest rounded-2xl cursor-pointer hover:bg-red-100 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            ✕ Hủy đơn hàng
          </button>
        )}

        {/* Inline Confirm Cancel */}
        {isCancellable && confirmCancel && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3 animate-fade-in">
            <p className="text-xs font-bold text-red-700 text-center">Bạn có chắc muốn hủy đơn hàng này?</p>
            <p className="text-[10px] text-red-600/70 text-center">Hành động này không thể hoàn tác.</p>
            <div className="flex gap-2">
              <button
                disabled={cancelling}
                onClick={handleCancelOrder}
                className="flex-1 h-10 bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer active:scale-95 transition-all disabled:opacity-60"
              >
                {cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                className="flex-1 h-10 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200 transition-all"
              >
                Không
              </button>
            </div>
          </div>
        )}
      </div>
    </PageCast>
  );
}
