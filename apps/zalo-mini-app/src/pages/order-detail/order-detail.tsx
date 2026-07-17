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
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  PENDING_PAYMENT: 'Chờ thanh toán',
  RETURN_REQUESTED: 'Chờ hoàn trả',
  RETURNED: 'Đã hoàn trả',
};

const STATUS_CLASS: Record<string, string> = {
  PROCESSING: 'bg-yellow-50 text-yellow-700',
  SHIPPED: 'bg-blue-50 text-blue-700',
  DELIVERED: 'bg-green-50 text-green-700',
  COMPLETED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-600',
  PENDING_PAYMENT: 'bg-orange-50 text-orange-600',
  RETURN_REQUESTED: 'bg-indigo-50 text-indigo-700',
  RETURNED: 'bg-neutral-100 text-neutral-600',
};

export const OrderDetail: React.FC<IOrderDetailProps> = (_props) => {
  const { selectedOrder, setSelectedOrder, setActiveTab, showToast, addToCart, setIsCartOpen } = useCart();
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [paying, setPaying] = useState(false);

  // Return/Refund states
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('Sản phẩm lỗi kỹ thuật / không hoạt động');
  const [returnDescription, setReturnDescription] = useState('');
  const [returnImages, setReturnImages] = useState<string[]>([]);
  const [uploadingReturnImg, setUploadingReturnImg] = useState(false);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [completing, setCompleting] = useState(false);

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

  const handleConfirmReceived = async () => {
    setCompleting(true);
    try {
      await apiRequest(`/orders/${selectedOrder.id}/status`, 'PATCH', { status: 'DELIVERED' });
      showToast('Xác nhận nhận hàng thành công!', 'success');
      setSelectedOrder({ ...selectedOrder, status: 'DELIVERED' });
    } catch (e: any) {
      showToast(e?.message || 'Không thể xác nhận nhận hàng!', 'warning');
    } finally {
      setCompleting(false);
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

  const handleReorder = async () => {
    try {
      showToast('Đang mua lại đơn hàng...', 'info');
      for (const item of selectedOrder.items) {
        if (item.product) {
          await addToCart(item.product as any, item.quantity, item.size, item.color);
        }
      }
      showToast('Đã thêm sản phẩm vào giỏ hàng!', 'success');
      setSelectedOrder(null);
      setIsCartOpen(true);
    } catch (e) {
      console.error(e);
      showToast('Lỗi mua lại đơn hàng!', 'warning');
    }
  };

  const handleReturnImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingReturnImg(true);
    try {
      const urls = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE_URL}/products/0/comments/upload-image`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data && data.url) {
          urls.push(data.url);
        }
      }
      if (urls.length > 0) {
        setReturnImages(prev => [...prev, ...urls]);
        showToast('Tải ảnh bằng chứng lên thành công!', 'success');
      } else {
        showToast('Tải ảnh thất bại!', 'warning');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi tải ảnh!', 'warning');
    } finally {
      setUploadingReturnImg(false);
    }
  };

  const handleSubmitReturn = async () => {
    if (!returnReason) {
      showToast('Vui lòng chọn lý do hoàn trả!', 'warning');
      return;
    }
    setSubmittingReturn(true);
    try {
      const res = await apiRequest<any>(`/orders/${selectedOrder.id}/return`, 'POST', {
        reason: returnReason,
        description: returnDescription,
        images: returnImages,
      });
      if (res) {
        showToast('Đã gửi yêu cầu hoàn trả thành công!', 'success');
        setSelectedOrder({
          ...selectedOrder,
          status: 'RETURN_REQUESTED',
          returnReason,
          returnDescription,
          returnImages: JSON.stringify(returnImages),
        });
        setIsReturnModalOpen(false);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Lỗi gửi yêu cầu hoàn trả!', 'warning');
    } finally {
      setSubmittingReturn(false);
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
                  { label: 'Đang chuẩn bị', desc: 'Kho hàng đang đóng gói sản phẩm của bạn', active: ['PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(selectedOrder.status), isCancelled: false },
                  { label: 'Đang giao hàng', desc: 'Đơn hàng đã bàn giao cho đơn vị vận chuyển', active: ['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(selectedOrder.status), isCancelled: false },
                  { label: 'Đã hoàn thành', desc: 'Đơn hàng đã được giao nhận thành công', active: ['DELIVERED', 'COMPLETED'].includes(selectedOrder.status), isCancelled: false }
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

        {/* Confirm Received action for SHIPPED status */}
        {selectedOrder.status === 'SHIPPED' && (
          <button
            disabled={completing}
            onClick={handleConfirmReceived}
            className="w-full h-11 bg-[#0e6877] text-white font-bold text-xs uppercase tracking-wider rounded-2xl border-none cursor-pointer hover:bg-[#0c5966] active:scale-[0.98] transition-all shadow-md mt-4"
          >
            {completing ? 'Đang cập nhật...' : '✓ Đã nhận được hàng'}
          </button>
        )}

        {/* Re-order & Return actions for DELIVERED status */}
        {['DELIVERED', 'COMPLETED'].includes(selectedOrder.status) && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleReorder}
              className="flex-1 h-11 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-2xl border-none cursor-pointer hover:bg-primary-dark active:scale-[0.98] transition-all shadow-md"
            >
              🔄 Mua lại đơn này
            </button>
            <button
              onClick={() => {
                setReturnReason('Sản phẩm lỗi kỹ thuật / không hoạt động');
                setReturnDescription('');
                setReturnImages([]);
                setIsReturnModalOpen(true);
              }}
              className="flex-1 h-11 border border-indigo-250 bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wider rounded-2xl cursor-pointer hover:bg-indigo-100 active:scale-[0.98] transition-all"
            >
              📦 Trả hàng / Hoàn tiền
            </button>
          </div>
        )}

        {/* Return request details display if in RETURN_REQUESTED or RETURNED */}
        {['RETURN_REQUESTED', 'RETURNED'].includes(selectedOrder.status) && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4.5 space-y-2 text-left mt-4">
            <p className="font-bold text-indigo-800 text-xs">
              {selectedOrder.status === 'RETURNED' ? '✓ Đơn hàng đã được hoàn trả thành công' : '⏳ Yêu cầu Trả hàng / Hoàn tiền đang chờ duyệt'}
            </p>
            <p className="text-indigo-750 font-medium text-[10.5px] mt-1">Lý do: <span className="font-bold text-textColor">{selectedOrder.returnReason}</span></p>
            {selectedOrder.returnDescription && (
              <p className="text-indigo-750 font-medium text-[10.5px]">Chi tiết: <span className="text-textColor">{selectedOrder.returnDescription}</span></p>
            )}
            {selectedOrder.returnImages && (() => {
              try {
                const parsed = JSON.parse(selectedOrder.returnImages);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  return (
                    <div className="flex gap-2 mt-2">
                      {parsed.map((img: string, idx: number) => {
                        const full = img.startsWith('http') ? img : `${API_BASE_URL.replace('/api/v1', '')}${img}`;
                        return (
                          <img key={idx} src={full} alt="Bằng chứng" className="w-12 h-12 object-cover rounded-xl border border-indigo-150" />
                        );
                      })}
                    </div>
                  );
                }
              } catch (e) {}
              return null;
            })()}
          </div>
        )}
      </div>

      {/* Return request modal */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6 text-left">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
              <h3 className="text-xs font-black text-textColor uppercase tracking-wider">Yêu cầu Trả hàng / Hoàn tiền</h3>
              <button 
                onClick={() => setIsReturnModalOpen(false)} 
                className="text-neutral-400 hover:text-textColor border-none bg-transparent cursor-pointer font-bold text-xs p-1"
              >
                ×
              </button>
            </div>

            {/* Reason dropdown */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold text-[#526069]/70 uppercase tracking-widest block">Lý do hoàn trả</label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full text-xs p-3 bg-neutral-50 rounded-xl border border-neutral-200 outline-none font-bold text-textColor cursor-pointer focus:border-primary"
              >
                <option value="Sản phẩm lỗi kỹ thuật / không hoạt động">Sản phẩm lỗi kỹ thuật / không hoạt động</option>
                <option value="Sản phẩm hư hỏng do vận chuyển">Sản phẩm hư hỏng do vận chuyển</option>
                <option value="Gửi sai sản phẩm / thiếu hàng">Gửi sai sản phẩm / thiếu hàng</option>
                <option value="Hàng giả / hàng nhái">Hàng giả / hàng nhái</option>
                <option value="Khác">Khác (Nêu chi tiết ở mô tả)</option>
              </select>
            </div>

            {/* Description textarea */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold text-[#526069]/70 uppercase tracking-widest block">Mô tả chi tiết</label>
              <textarea
                rows={3}
                placeholder="Mô tả cụ thể tình trạng lỗi của sản phẩm..."
                value={returnDescription}
                onChange={(e) => setReturnDescription(e.target.value)}
                className="w-full text-xs p-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:border-primary outline-none resize-none font-medium text-textColor leading-relaxed"
              />
            </div>

            {/* Images upload */}
            <div className="space-y-2">
              <label className="text-[9px] font-extrabold text-[#526069]/70 uppercase tracking-widest block">Ảnh bằng chứng lỗi (Tối đa 3 ảnh)</label>
              <div className="flex flex-wrap gap-2.5">
                {returnImages.map((url, idx) => (
                  <div key={idx} className="w-14 h-14 rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50 relative">
                    <img src={url.startsWith('http') ? url : `${API_BASE_URL.replace('/api/v1', '')}${url}`} alt="Return proof" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setReturnImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-xs border border-white active:scale-90"
                    >
                      ×
                    </button>
                  </div>
                ))}
                
                {returnImages.length < 3 && (
                  <label className="w-14 h-14 rounded-xl border-2 border-dashed border-neutral-300 hover:border-primary flex flex-col items-center justify-center cursor-pointer bg-neutral-50 transition-colors">
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                      onChange={handleReturnImageUpload}
                      disabled={uploadingReturnImg}
                    />
                    {uploadingReturnImg ? (
                      <div className="w-4.5 h-4.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span className="text-base font-bold text-neutral-400">+</span>
                        <span className="text-[7.5px] text-neutral-450 font-bold uppercase mt-0.5">Ảnh</span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                disabled={submittingReturn || !returnReason}
                onClick={handleSubmitReturn}
                className="flex-1 h-10 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-primary-dark disabled:bg-neutral-300 active:scale-98 transition-all"
              >
                {submittingReturn ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="h-10 px-4 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </PageCast>
  );
}
