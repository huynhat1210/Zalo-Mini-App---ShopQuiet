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
  Barcode,
  X,
  User,
  Calendar,
  Package,
  Copy,
  RefreshCw
} from 'lucide-react';
import type { IOrdersProps } from './orders.type';
import { exportToExcel } from '../../utils/excel-export.util';
import { useToast } from '../../contexts';

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  size: string;
  color?: string;
  price: number;
  product?: {
    name: string;
    image?: string;
    images?: string;
  };
}

interface Order {
  id: string;
  zaloUserId?: string;
  customerName?: string;
  phone?: string;
  address?: string;
  status: string;
  total?: number;
  totalAmount?: number;
  shippingFee?: number;
  discountAmount?: number;
  createdAt: string;
  paymentMethod?: string | null;
  items: OrderItem[];
  trackingNumber?: string | null;
  returnReason?: string | null;
  returnDescription?: string | null;
  returnImages?: string | null;
}

export const Orders: React.FC<IOrdersProps> = (_props) => {
  const { success: toastSuccess, error: toastError } = useToast();
  
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

  // ZNS Push Logs state
  const [showZnsModal, setShowZnsModal] = useState(false);
  const [znsLogs, setZnsLogs] = useState<any[]>([]);
  const [loadingZns, setLoadingZns] = useState(false);

  // Safe Total Calculation Helper (Fixes 0đ and NaNđ bugs)
  const getOrderTotal = (o: Order): number => {
    const totalVal = Number(o.totalAmount ?? o.total);
    if (!isNaN(totalVal) && totalVal > 0) return totalVal;
    
    if (o.items && o.items.length > 0) {
      return o.items.reduce((sum, item) => {
        const p = Number(item.price || 0);
        const q = Number(item.quantity || 1);
        return sum + p * q;
      }, 0);
    }
    return 0;
  };

  // Safe Image Extractor Helper
  const getProductImage = (item: OrderItem): string => {
    if (item.product?.image) return item.product.image;
    if (item.product?.images) {
      try {
        const parsed = JSON.parse(item.product.images);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      } catch (e) {
        if (typeof item.product.images === 'string') return item.product.images;
      }
    }
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=60';
  };

  const formatPrice = (amount: number) => {
    const validAmount = isNaN(amount) ? 0 : amount;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(validAmount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const fetchZnsLogs = async () => {
    try {
      setLoadingZns(true);
      const res = await apiRequest('/orders/zns-logs');
      setZnsLogs(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('Failed to fetch ZNS logs:', e);
    } finally {
      setLoadingZns(false);
    }
  };

  const fetchOrders = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await apiRequest<Order[]>('/orders/admin/all');
      const list = Array.isArray(res) ? res : [];
      setOrders(list);

      // Keep selected order in sync with latest data
      if (selectedOrder) {
        const updated = list.find((o) => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string, trackNum?: string) => {
    try {
      const payload: Record<string, string> = { status: newStatus };
      if (trackNum) {
        payload.trackingNumber = trackNum;
      }

      await apiRequest(`/orders/${orderId}/status`, 'PATCH', payload);
      
      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, trackingNumber: trackNum || o.trackingNumber } : o)),
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus, trackingNumber: trackNum || selectedOrder.trackingNumber });
      }
      
      setShowTrackingForm(false);
      setTrackingNumber('');
      toastSuccess('Cập nhật thành công', `Đơn hàng #${orderId.slice(-6).toUpperCase()} chuyển sang ${newStatus}.`);
    } catch (err: any) {
      toastError('Cập nhật thất bại', err.message || 'Lỗi khi cập nhật trạng thái đơn hàng.');
    }
  };

  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    
    const itemsHtml = order.items?.map((item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #edf2f7; text-align: left;">${item.product?.name || 'Sản phẩm'} (${item.size || 'F'})</td>
        <td style="padding: 10px; border-bottom: 1px solid #edf2f7; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #edf2f7; text-align: right;">${formatPrice(item.price)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #edf2f7; text-align: right; font-weight: bold;">${formatPrice(item.price * item.quantity)}</td>
      </tr>
    `).join('') || '';

    const orderTotal = getOrderTotal(order);

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
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <div class="header">
              <div>
                <div class="company-name">ShopQuiet</div>
                <div style="font-size: 12px; color: #718096; margin-top: 4px;">Premium E-Commerce Platform</div>
              </div>
              <div>
                <div class="invoice-title">HÓA ĐƠN BÁN LẺ</div>
                <div style="font-size: 12px; color: #718096; text-align: right;">Mã đơn: #${order.id.toUpperCase()}</div>
              </div>
            </div>
            
            <div class="info-grid">
              <div class="info-block">
                <h4>Khách hàng nhận hàng</h4>
                <strong>Họ tên:</strong> ${order.customerName || 'Khách hàng Zalo'}<br>
                <strong>Điện thoại:</strong> ${order.phone || 'Không có'}<br>
                <strong>Địa chỉ nhận:</strong> ${order.address || 'Tại cửa hàng'}
              </div>
              <div class="info-block" style="text-align: right;">
                <h4>Chi tiết giao dịch</h4>
                <strong>Ngày tạo đơn:</strong> ${formatDate(order.createdAt)}<br>
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
              Tổng thanh toán: <span class="total-val">${formatPrice(orderTotal)}</span>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'DELIVERED':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">Hoàn thành</span>;
      case 'PROCESSING':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 rounded-full border border-amber-200">Đang xử lý</span>;
      case 'SHIPPED':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 rounded-full border border-blue-200">Đang giao</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-600 rounded-full border border-red-200">Đã hủy</span>;
      case 'RETURN_REQUESTED':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 rounded-full border border-purple-200 animate-pulse">Chờ trả hàng</span>;
      case 'RETURNED':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-600 rounded-full border border-gray-200">Đã trả hàng</span>;
      default:
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 rounded-full border border-slate-200">{status}</span>;
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

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">🛒 Quản Lý Đơn Hàng</h1>
          <p className="text-slate-500 text-xs mt-1">Duyệt đơn, bàn giao vận chuyển, in hóa đơn và xử lý khiếu nại khách hàng</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchOrders()}
            className="px-3 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Tải lại danh sách đơn hàng"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
          <button
            onClick={() =>
              exportToExcel(
                filteredOrders,
                'Bao_Cao_Don_Hang_ShopQuiet',
                [
                  { key: 'id', label: 'Mã Đơn Hàng' },
                  { key: 'customerName', label: 'Tên Khách Hàng' },
                  { key: 'phone', label: 'Số Điện Thoại' },
                  { key: 'address', label: 'Địa Chỉ Giao Hàng' },
                  { key: 'totalAmount', label: 'Tổng Tiền (VNĐ)', formatter: (_val: any, row: Order) => getOrderTotal(row).toLocaleString('vi-VN') },
                  { key: 'status', label: 'Trạng Thái' },
                  { key: 'paymentMethod', label: 'Phương Thức Thanh Toán' },
                  { key: 'createdAt', label: 'Ngày Tạo', formatter: (val: any) => formatDate(val) },
                ],
              )
            }
            className="px-4 py-2.5 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition-all flex items-center gap-2 border-none cursor-pointer shadow-xs active:scale-95"
          >
            📊 Xuất Excel Đơn Hàng
          </button>
          <button
            onClick={() => {
              setShowZnsModal(true);
              fetchZnsLogs();
            }}
            className="px-4 py-2.5 bg-[#0e6877] text-white text-xs font-bold rounded-xl hover:bg-[#0b5460] transition-all flex items-center gap-2 border-none cursor-pointer shadow-xs active:scale-95"
          >
            📱 Lịch sử ZNS Push (Zalo OA)
          </button>
        </div>
      </div>

      {/* ── Main Split View ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

        {/* ── Orders Table (Left 2 Columns) ── */}
        <div className="xl:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 space-y-5 shadow-xs">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm theo mã đơn, tên khách hàng, số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#0e6877] rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all focus:bg-white shadow-2xs"
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 text-xs font-medium">Đang cập nhật đơn hàng...</p>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f8fafc] text-slate-500 text-[10.5px] font-extrabold uppercase tracking-wider border-b border-slate-200/60">
                  <tr>
                    <th className="py-3.5 px-4 rounded-l-xl">Mã đơn</th>
                    <th className="py-3.5 px-4">Khách hàng</th>
                    <th className="py-3.5 px-4">Tổng tiền</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4 rounded-r-xl text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredOrders.map((order) => {
                    const isSelected = selectedOrder?.id === order.id;
                    const orderTotal = getOrderTotal(order);
                    return (
                      <tr 
                        key={order.id} 
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowTrackingForm(false);
                        }}
                        className={`transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-teal-50/60 border-l-4 border-[#0e6877] font-semibold' 
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-4 px-4 font-mono text-xs text-[#0e6877] font-bold">
                          #{order.id.slice(-6).toUpperCase()}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-800 text-xs">{order.customerName || 'Zalo User'}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{order.phone || 'Không có SĐT'}</div>
                        </td>
                        <td className="py-4 px-4 font-black text-teal-700 text-xs">
                          {formatPrice(orderTotal)}
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowTrackingForm(false);
                              }}
                              className={`p-2 rounded-xl transition-all border cursor-pointer ${
                                isSelected 
                                  ? 'bg-[#0e6877] text-white border-[#0e6877]' 
                                  : 'bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-[#0e6877] border-slate-200'
                              }`}
                              title="Xem chi tiết đơn hàng"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handlePrint(order)}
                              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all border border-slate-200 cursor-pointer"
                              title="In hóa đơn bán lẻ"
                            >
                              <Printer size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center gap-3">
              <FileText size={36} className="text-slate-300" />
              <p className="text-xs font-semibold">Không tìm thấy đơn hàng nào phù hợp.</p>
            </div>
          )}
        </div>

        {/* ── Order Detail Panel (Right Side Panel - Modern Redesign) ── */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden sticky top-6">
          {selectedOrder ? (
            <div className="flex flex-col h-full animate-fadeIn">
              
              {/* ── Gradient Panel Header ── */}
              <div className="bg-gradient-to-r from-[#0e6877] to-[#168a9e] text-white p-5 flex justify-between items-center relative shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-teal-100">Chi Tiết Đơn Hàng</span>
                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full font-mono">
                      #{selectedOrder.id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-teal-100/80 mt-1 flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(selectedOrder.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrint(selectedOrder)}
                    className="p-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-xl transition-all border-none cursor-pointer"
                    title="In hóa đơn"
                  >
                    <Printer size={15} />
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-full transition-all border-none cursor-pointer"
                    title="Đóng panel chi tiết"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* ── Scrollable Body Content ── */}
              <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-220px)]">

                {/* Status Bar & Action Controller */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Trạng thái hiện tại</span>
                    {getStatusBadge(selectedOrder.status)}
                  </div>

                  {/* Dynamic Action Buttons */}
                  {showTrackingForm ? (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleUpdateStatus(selectedOrder.id, 'SHIPPED', trackingNumber);
                      }}
                      className="space-y-2.5 pt-2 border-t border-slate-200/60 animate-fadeIn"
                    >
                      <label className="text-[10px] font-extrabold text-slate-700 block uppercase tracking-wider">
                        Nhập Mã Vận Đơn (GHN / GHTK / ViettelPost)
                      </label>
                      <input
                        type="text"
                        placeholder="VD: GHN123456789VN..."
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] font-mono shadow-2xs"
                        required
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 py-2 bg-[#0e6877] hover:bg-[#0b5460] text-white font-bold rounded-xl text-xs border-none cursor-pointer active:scale-95 transition-all shadow-xs"
                        >
                          Xác nhận & Giao Shipper
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowTrackingForm(false)}
                          className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs border-none cursor-pointer transition-all"
                        >
                          Hủy
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/60">
                      {selectedOrder.status === 'PENDING' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'PROCESSING')}
                          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer shadow-xs active:scale-95"
                        >
                          <Check size={14} /> Duyệt Đơn Hàng
                        </button>
                      )}
                      {selectedOrder.status === 'PROCESSING' && (
                        <button
                          onClick={() => setShowTrackingForm(true)}
                          className="flex-1 py-2 bg-[#0e6877] hover:bg-[#0c5966] text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer shadow-xs active:scale-95"
                        >
                          <Truck size={14} /> Giao Cho Shipper
                        </button>
                      )}
                      {selectedOrder.status === 'SHIPPED' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer shadow-xs active:scale-95"
                        >
                          <Check size={14} /> Đã Giao Hoàn Thành
                        </button>
                      )}
                      {selectedOrder.status === 'RETURN_REQUESTED' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(selectedOrder.id, 'RETURNED')}
                            className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer shadow-xs active:scale-95"
                          >
                            <Check size={14} /> Đồng Ý Trả Hàng
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                            className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all border-none cursor-pointer"
                          >
                            Từ Chối
                          </button>
                        </>
                      )}
                      {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'DELIVERED' && selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'RETURNED' && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc muốn hủy đơn hàng #${selectedOrder.id.slice(-6).toUpperCase()}?`)) {
                              handleUpdateStatus(selectedOrder.id, 'CANCELLED');
                            }
                          }}
                          className="py-2 px-3.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold rounded-xl text-xs transition-all border border-red-200 hover:border-red-600 cursor-pointer active:scale-95"
                        >
                          <XCircle size={14} className="inline mr-1" /> Hủy Đơn
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Customer Info Card */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-2xs">
                  <span className="block text-[10px] font-extrabold text-[#0e6877] uppercase tracking-wider flex items-center gap-1.5">
                    <User size={13} /> Thông Tin Khách Hàng
                  </span>
                  
                  <div className="space-y-2 text-xs divide-y divide-slate-100">
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-400">Người nhận:</span>
                      <span className="font-bold text-slate-800">{selectedOrder.customerName || 'Khách hàng Zalo'}</span>
                    </div>

                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">Số điện thoại:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-slate-800">{selectedOrder.phone || 'Không có SĐT'}</span>
                        {selectedOrder.phone && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(selectedOrder.phone || '');
                              toastSuccess('Đã sao chép SĐT', selectedOrder.phone || '');
                            }}
                            className="text-slate-400 hover:text-[#0e6877] p-0.5 border-none bg-transparent cursor-pointer"
                            title="Sao chép SĐT"
                          >
                            <Copy size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400 shrink-0">Địa chỉ giao:</span>
                      <span className="font-bold text-slate-800 text-right max-w-[200px] break-words">
                        {selectedOrder.address || 'Tại cửa hàng'}
                      </span>
                    </div>

                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">Phương thức:</span>
                      <span className="font-bold text-[#0e6877] bg-teal-50 px-2 py-0.5 rounded-md text-[11px]">
                        {selectedOrder.paymentMethod || 'COD'}
                      </span>
                    </div>

                    {selectedOrder.trackingNumber && (
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-indigo-600 font-bold flex items-center gap-1 text-[11px]">
                          <Barcode size={13} /> Mã vận đơn:
                        </span>
                        <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md text-xs">
                          {selectedOrder.trackingNumber}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Return Request Details Card (if applicable) */}
                {['RETURN_REQUESTED', 'RETURNED'].includes(selectedOrder.status) && (
                  <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-4 space-y-2.5 text-xs text-left">
                    <span className="block text-[10px] font-black text-purple-800 uppercase tracking-wider flex items-center gap-1">
                      ⚠️ Thông Tin Đổi Trả / Hoàn Tiền
                    </span>
                    <div className="space-y-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-purple-700 font-medium">Lý do:</span>
                        <span className="text-slate-800 font-bold">{selectedOrder.returnReason}</span>
                      </div>
                      {selectedOrder.returnDescription && (
                        <div>
                          <span className="text-purple-700 font-medium block mb-1">Mô tả chi tiết:</span>
                          <p className="text-slate-700 bg-white border border-purple-200 p-2.5 rounded-xl leading-relaxed break-words">
                            {selectedOrder.returnDescription}
                          </p>
                        </div>
                      )}
                      {selectedOrder.returnImages && (() => {
                        try {
                          const parsed = JSON.parse(selectedOrder.returnImages);
                          if (Array.isArray(parsed) && parsed.length > 0) {
                            return (
                              <div className="space-y-1.5 pt-1">
                                <span className="text-purple-700 font-medium block">Ảnh bằng chứng từ khách:</span>
                                <div className="flex gap-2 flex-wrap">
                                  {parsed.map((img: string, idx: number) => {
                                    const full = img.startsWith('http') ? img : `${serverUrl}${img}`;
                                    return (
                                      <a 
                                        key={idx} 
                                        href={full} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="w-14 h-14 rounded-xl border border-purple-200 overflow-hidden bg-white hover:scale-105 transition-transform"
                                      >
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

                {/* Selected Products List */}
                <div className="space-y-3">
                  <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={13} /> Danh Sách Sản Phẩm ({selectedOrder.items?.length || 0})
                  </span>
                  
                  <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                    {selectedOrder.items?.map((item) => {
                      const img = getProductImage(item);
                      const itemTotal = Number(item.price || 0) * Number(item.quantity || 1);
                      return (
                        <div key={item.id} className="flex items-center gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 hover:bg-slate-100/60 transition-colors">
                          <img 
                            src={img} 
                            alt={item.product?.name} 
                            className="w-13 h-13 object-cover rounded-xl shrink-0 bg-white border border-slate-200" 
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 truncate">{item.product?.name || 'Sản phẩm'}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                Size: {item.size || 'F'}
                              </span>
                              {item.color && (
                                <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                  {item.color}
                                </span>
                              )}
                              <span className="text-[10px] font-extrabold text-slate-600">
                                x{item.quantity}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-black text-teal-700">{formatPrice(itemTotal)}</p>
                            <p className="text-[9.5px] text-slate-400">{formatPrice(item.price)}/sp</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total Payment Summary Box (Clean calculation fix) */}
                <div className="bg-gradient-to-r from-teal-50 to-emerald-50 p-4 rounded-2xl border border-teal-150 space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>Tạm tính sản phẩm:</span>
                    <span className="font-semibold">{formatPrice(getOrderTotal(selectedOrder))}</span>
                  </div>
                  {selectedOrder.shippingFee !== undefined && selectedOrder.shippingFee > 0 && (
                    <div className="flex justify-between items-center text-xs text-slate-600">
                      <span>Phí giao hàng:</span>
                      <span className="font-semibold">{formatPrice(selectedOrder.shippingFee)}</span>
                    </div>
                  )}
                  {selectedOrder.discountAmount !== undefined && selectedOrder.discountAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-600">
                      <span>Giảm giá Voucher:</span>
                      <span className="font-semibold">-{formatPrice(selectedOrder.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-teal-200/60">
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Tổng Thanh Toán:</span>
                    <span className="text-lg font-black text-[#0e6877]">
                      {formatPrice(getOrderTotal(selectedOrder))}
                    </span>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="h-96 text-center text-slate-400 flex flex-col items-center justify-center p-6 gap-3">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                <Clock size={28} />
              </div>
              <p className="text-xs font-bold text-slate-600">Chưa chọn đơn hàng nào</p>
              <p className="text-[11px] text-slate-400 max-w-[200px]">
                Bấm vào một dòng đơn hàng bên danh sách để xem chi tiết & cập nhật trạng thái
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ── ZNS Push Logs Modal ── */}
      {showZnsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-xl border border-slate-200 animate-scaleUp">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-800">📱 Lịch sử Gửi Thông Báo ZNS (Zalo OA)</h3>
                <p className="text-xs text-slate-500 mt-0.5">Nhật ký tin nhắn Zalo Notification Service được đẩy tới khách hàng</p>
              </div>
              <button
                onClick={() => setShowZnsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center border-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loadingZns ? (
              <div className="py-12 text-center text-xs text-slate-500">Đang tải nhật ký ZNS...</div>
            ) : znsLogs.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {znsLogs.map((log: any) => (
                  <div key={log.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[#0e6877]">{log.name} ({log.phone})</span>
                      <span className="text-slate-400 font-medium">{log.time}</span>
                    </div>
                    <p className="text-xs text-slate-700 font-semibold">{log.content}</p>
                    <span className="text-[10px] font-black text-emerald-600 self-start bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Sent via Zalo OA ({log.status})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">Chưa có nhật ký tin nhắn ZNS nào.</div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowZnsModal(false)}
                className="px-5 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-300 transition-colors border-none cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Orders;
