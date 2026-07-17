import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { 
  Search, 
  Eye, 
  Check, 
  Truck, 
  XCircle, 
  FileText,
  Clock,
  Printer,
  Barcode
} from 'lucide-react';
import type { IOrdersProps } from './orders.type';

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  size: string;
  price: number;
  product: {
    name: string;
    image: string;
  };
}

interface Order {
  id: string;
  zaloUserId: string;
  customerName: string;
  phone: string;
  address: string;
  status: string;
  total: number;
  createdAt: string;
  paymentMethod?: string | null;
  items: OrderItem[];
  trackingNumber?: string | null;
  returnReason?: string | null;
  returnDescription?: string | null;
  returnImages?: string | null;
}

export const Orders: React.FC<IOrdersProps> = (_props) => {
  const getBackendUrl = () => {
    return window.location.origin.includes('localhost') ? 'http://localhost:3000' : 'https://zalo-mini-app-shopquiet.onrender.com';
  };
  const serverUrl = getBackendUrl();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Tracking modal form state
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/orders');
      setOrders(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string, trackNum?: string) => {
    try {
      const payload: Record<string, string> = { status: newStatus };
      if (trackNum) {
        payload.trackingNumber = trackNum;
      }

      await apiRequest(`/orders/${orderId}/status`, 'PATCH', payload);
      
      // Update local state
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus as any, trackingNumber: trackNum || o.trackingNumber } : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus as any, trackingNumber: trackNum || selectedOrder.trackingNumber });
      }
      
      setShowTrackingForm(false);
      setTrackingNumber('');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật trạng thái đơn hàng');
    }
  };

  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    
    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #edf2f7; text-align: left;">${item.product?.name} (${item.size})</td>
        <td style="padding: 10px; border-bottom: 1px solid #edf2f7; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #edf2f7; text-align: right;">${item.price.toLocaleString('vi-VN')} đ</td>
        <td style="padding: 10px; border-bottom: 1px solid #edf2f7; text-align: right; font-weight: bold;">${(item.price * item.quantity).toLocaleString('vi-VN')} đ</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Hóa đơn ShopQuiet #${order.id.toUpperCase()}</title>
          <style>
            body { font-family: 'Inter', sans-serif; color: #2d3748; padding: 40px; line-height: 1.6; }
            .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #edf2f7; padding-bottom: 20px; margin-bottom: 30px; }
            .company-name { font-size: 20px; font-weight: 800; color: #0e6877; text-transform: uppercase; letter-spacing: 1.5px; }
            .invoice-title { font-size: 22px; font-weight: 700; text-align: right; color: #1a202c; }
            .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 30px; margin-bottom: 40px; font-size: 13px; }
            .info-block h4 { margin: 0 0 10px 0; color: #4a5568; text-transform: uppercase; letter-spacing: 1px; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
            th { background-color: #f7fafc; padding: 12px 10px; text-align: left; border-bottom: 2px solid #edf2f7; color: #4a5568; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
            .total-section { display: flex; justify-content: flex-end; align-items: center; font-size: 15px; font-weight: 700; margin-top: 30px; border-top: 2px solid #edf2f7; padding-top: 20px; }
            .total-val { color: #0e6877; font-size: 22px; font-weight: 800; margin-left: 15px; }
            .footer { text-align: center; margin-top: 60px; font-size: 11px; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <div class="header">
              <div>
                <div class="company-name">ShopQuiet</div>
                <div style="font-size: 12px; color: #718096; mt-1">Premium E-Commerce Platform</div>
              </div>
              <div>
                <div class="invoice-title">HÓA ĐƠN BÁN LẺ</div>
                <div style="font-size: 12px; color: #718096; text-align: right;">Mã đơn: #${order.id.toUpperCase()}</div>
              </div>
            </div>
            
            <div class="info-grid">
              <div class="info-block">
                <h4>Khách hàng nhận tin</h4>
                <strong>Họ tên:</strong> ${order.customerName || 'Khách hàng Zalo'}<br>
                <strong>Điện thoại:</strong> ${order.phone || 'Không có'}<br>
                <strong>Địa chỉ nhận:</strong> ${order.address || 'Tại cửa hàng'}
              </div>
              <div class="info-block" style="text-align: right;">
                <h4>Chi tiết giao dịch</h4>
                <strong>Ngày tạo đơn:</strong> ${new Date(order.createdAt).toLocaleString('vi-VN')}<br>
                <strong>Phương thức:</strong> ${order.paymentMethod || 'COD'}<br>
                <strong>Mã vận đơn:</strong> ${order.trackingNumber || 'Chưa bàn giao'}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Tên sản phẩm</th>
                  <th style="text-align: center; width: 80px;">Số lượng</th>
                  <th style="text-align: right; width: 130px;">Đơn giá</th>
                  <th style="text-align: right; width: 150px;">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="total-section">
              Tổng thanh toán: <span class="total-val">${order.total.toLocaleString('vi-VN')} đ</span>
            </div>

            <div class="footer">
              Xin cảm ơn và hẹn gặp lại quý khách!<br>
              ShopQuiet Premium Store • Support Zalo Mini App
            </div>
          </div>
          <script>
            window.onload = function() { 
              window.print(); 
              setTimeout(function() { window.close(); }, 500); 
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'PENDING_PAYMENT':
        return <span className="px-2.5 py-1 text-xs font-semibold text-amber-300 bg-amber-500/10 rounded-full">Chờ thanh toán</span>;
      case 'PROCESSING':
        return <span className="px-2.5 py-1 text-xs font-semibold text-blue-300 bg-blue-500/10 rounded-full">Đang xử lý</span>;
      case 'SHIPPED':
        return <span className="px-2.5 py-1 text-xs font-semibold text-indigo-300 bg-indigo-500/10 rounded-full">Đang giao</span>;
      case 'COMPLETED':
      case 'DELIVERED':
        return <span className="px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-500/10 rounded-full">Hoàn thành</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-xs font-semibold text-rose-300 bg-rose-500/10 rounded-full">Đã hủy</span>;
      case 'RETURN_REQUESTED':
        return <span className="px-2.5 py-1 text-xs font-semibold text-purple-300 bg-purple-500/10 rounded-full font-bold">Chờ hoàn trả</span>;
      case 'RETURNED':
        return <span className="px-2.5 py-1 text-xs font-semibold text-slate-300 bg-slate-500/10 rounded-full">Đã hoàn trả</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold text-slate-300 bg-slate-500/10 rounded-full">{status}</span>;
    }
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.phone && o.phone.includes(searchTerm)),
  );

  return (
    <div className="space-y-6 animate-fadeIn text-[#1b1c1b]">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Quản lý đơn hàng</h2>
        <p className="text-[#526069] text-sm mt-1">Duyệt đơn, cập nhật trạng thái giao hàng, in hóa đơn bán lẻ và mã vận đơn</p>
      </div>

      {/* Grid Content Split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {/* Orders Table */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm theo mã đơn, khách hàng, số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#0e6877] rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-450 focus:outline-none transition-all focus:bg-white"
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[#526069] text-xs">Đang tải danh sách đơn hàng...</p>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-655">
                <thead className="bg-[#fbf9f7] text-[#526069] text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 rounded-l-xl">Mã đơn</th>
                    <th className="py-3.5 px-4">Khách hàng</th>
                    <th className="py-3.5 px-4">Tổng tiền</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4 rounded-r-xl">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredOrders.map((order) => (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-[#fbf9f7]/40 transition-colors cursor-pointer ${
                        selectedOrder?.id === order.id ? 'bg-[#ecf6f7]/25 border-l-3 border-[#0e6877]' : ''
                      }`}
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowTrackingForm(false);
                      }}
                    >
                      <td className="py-4 px-4 font-mono text-xs text-[#0e6877] font-bold">#{order.id.slice(-6).toUpperCase()}</td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-850">{order.customerName || 'Zalo User'}</div>
                        <div className="text-[10px] text-[#526069] font-medium">{order.phone || 'Không có SĐT'}</div>
                      </td>
                      <td className="py-4 px-4 font-bold text-teal-600">{formatPrice(order.total || 0)}</td>
                      <td className="py-4 px-4">{getStatusBadge(order.status)}</td>
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowTrackingForm(false);
                            }}
                            className="p-2 bg-slate-50 hover:bg-[#ecf6f7] hover:text-[#0e6877] text-slate-500 rounded-xl transition-all border border-slate-200"
                            title="Xem chi tiết"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handlePrint(order)}
                            className="p-2 bg-slate-50 hover:bg-[#ecf6f7] hover:text-[#0e6877] text-slate-500 rounded-xl transition-all border border-slate-200"
                            title="In hóa đơn"
                          >
                            <Printer size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center gap-3">
              <FileText size={32} className="text-slate-400" />
              <p className="text-xs">Không tìm thấy đơn hàng nào phù hợp.</p>
            </div>
          )}
        </div>

        {/* Selected Order Detail Sidebar Panel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6.5 space-y-6 shadow-sm">
          {selectedOrder ? (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">Chi tiết đơn hàng</h3>
                  <p className="font-mono text-xs text-[#526069] mt-1">#{selectedOrder.id.toUpperCase()}</p>
                </div>
                <button
                  onClick={() => handlePrint(selectedOrder)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-[#ecf6f7] text-[#0e6877] border border-[#0e6877]/10 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all"
                >
                  <Printer size={12} />
                  In hóa đơn
                </button>
              </div>

              {/* Order Status Controller */}
              <div className="bg-[#fbf9f7] border border-slate-200 rounded-2xl p-4.5 space-y-3.5">
                <span className="block text-[10px] font-extrabold text-[#526069] uppercase tracking-wider">Trạng thái đơn hàng</span>
                
                {showTrackingForm ? (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdateStatus(selectedOrder.id, 'SHIPPED', trackingNumber);
                    }}
                    className="space-y-2.5 animate-fadeIn"
                  >
                    <label className="text-[10px] font-bold text-slate-600 block">Nhập mã vận đơn</label>
                    <input
                      type="text"
                      placeholder="Mã Giao Hàng Nhanh / GHN..."
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877]"
                      required
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-1.5 bg-[#0e6877] hover:bg-[#0c5966] text-white font-bold rounded-xl text-[10px] uppercase border-none cursor-pointer"
                      >
                        Bàn giao shipper
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTrackingForm(false)}
                        className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-[10px] uppercase border-none cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedOrder.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'PROCESSING')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors border-none cursor-pointer"
                      >
                        <Check size={12} />
                        Duyệt đơn
                      </button>
                    )}
                    {selectedOrder.status === 'PROCESSING' && (
                      <button
                        onClick={() => setShowTrackingForm(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors border-none cursor-pointer"
                      >
                        <Truck size={12} />
                        Giao hàng (Shipper)
                      </button>
                    )}
                    {selectedOrder.status === 'SHIPPED' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors border-none cursor-pointer"
                      >
                        <Check size={12} />
                        Hoàn thành
                      </button>
                    )}
                    {selectedOrder.status === 'RETURN_REQUESTED' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'RETURNED')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors border-none cursor-pointer"
                        >
                          <Check size={12} />
                          Chấp nhận Trả hàng
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors border border-slate-200 cursor-pointer"
                        >
                          <XCircle size={12} />
                          Từ chối Trả hàng
                        </button>
                      </>
                    )}
                    {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'RETURNED' && selectedOrder.status !== 'RETURN_REQUESTED' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white font-semibold rounded-xl text-xs transition-colors border border-rose-200 hover:border-rose-600 cursor-pointer"
                      >
                        <XCircle size={12} />
                        Hủy đơn
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Customer details */}
              <div className="space-y-3.5 text-xs border-b border-slate-100 pb-5">
                <span className="block text-[10px] font-extrabold text-[#526069]/65 uppercase tracking-wider">Thông tin khách hàng</span>
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-slate-450">Tên người nhận:</span><span className="text-slate-800 font-bold">{selectedOrder.customerName || 'Zalo User'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-450">Số điện thoại:</span><span className="text-slate-800 font-bold">{selectedOrder.phone || 'Không có'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-450">Địa chỉ giao:</span><span className="text-slate-800 font-bold text-right max-w-[200px] break-words">{selectedOrder.address || 'Tại cửa hàng'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-450">Phương thức:</span><span className="text-[#0e6877] font-bold">{selectedOrder.paymentMethod || 'COD'}</span></div>
                  
                  {selectedOrder.trackingNumber && (
                    <div className="flex justify-between bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/60 mt-1">
                      <span className="text-indigo-600 font-bold flex items-center gap-1.5">
                        <Barcode size={14} />
                        Mã vận đơn:
                      </span>
                      <span className="text-indigo-700 font-extrabold font-mono">{selectedOrder.trackingNumber}</span>
                    </div>
                  )}

                  <div className="flex justify-between"><span className="text-slate-450">Thời gian tạo:</span><span className="text-slate-800 font-semibold">{formatDate(selectedOrder.createdAt)}</span></div>
                </div>
              </div>

              {/* Return request details if present */}
              {['RETURN_REQUESTED', 'RETURNED'].includes(selectedOrder.status) && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4.5 space-y-2.5 text-xs text-left">
                  <span className="block text-[10px] font-extrabold text-indigo-800 uppercase tracking-wider">Thông tin yêu cầu hoàn trả</span>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between"><span className="text-indigo-700 font-medium">Lý do:</span><span className="text-slate-800 font-bold">{selectedOrder.returnReason}</span></div>
                    {selectedOrder.returnDescription && (
                      <div className="flex flex-col gap-0.5"><span className="text-indigo-700 font-medium">Chi tiết lỗi:</span><p className="text-slate-700 bg-white border border-indigo-150 p-2.5 rounded-xl mt-0.5 leading-relaxed break-words">{selectedOrder.returnDescription}</p></div>
                    )}
                    {selectedOrder.returnImages && (() => {
                      try {
                        const parsed = JSON.parse(selectedOrder.returnImages);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                          return (
                            <div className="flex flex-col gap-1.5">
                              <span className="text-indigo-700 font-medium">Ảnh bằng chứng:</span>
                              <div className="flex gap-2">
                                {parsed.map((img: string, idx: number) => {
                                  const full = img.startsWith('http') ? img : `${serverUrl || ''}${img}`;
                                  return (
                                    <a key={idx} href={full} target="_blank" rel="noreferrer" className="block w-14 h-14 rounded-xl border border-indigo-200 overflow-hidden bg-white shadow-2xs hover:scale-105 active:scale-95 transition-transform">
                                      <img src={full} alt="Bằng chứng" className="w-full h-full object-cover" />
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                      } catch (e) {}
                      return null;
                    })()}
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-4">
                <span className="block text-[10px] font-extrabold text-[#526069]/65 uppercase tracking-wider">Sản phẩm đã chọn</span>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                      <img src={item.product?.image} alt={item.product?.name} className="w-12 h-12 object-cover rounded-xl shrink-0 bg-slate-100 border border-slate-200" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-slate-800 truncate">{item.product?.name}</h4>
                        <p className="text-[10px] text-[#526069] mt-1">Size: {item.size} | Số lượng: {item.quantity}</p>
                        <p className="text-teal-600 text-xs font-bold mt-0.5">{formatPrice(item.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="flex justify-between items-center bg-[#fbf9f7] p-4.5 rounded-2xl border border-slate-200">
                <span className="text-xs font-semibold text-[#526069]">Tổng cộng:</span>
                <span className="text-base font-black text-[#0e6877]">{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>
          ) : (
            <div className="h-96 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Clock size={32} className="text-slate-350" />
              <p className="text-xs">Chọn một đơn hàng để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Orders;
