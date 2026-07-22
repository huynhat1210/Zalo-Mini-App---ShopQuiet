import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { 
  Search, 
  Check, 
  Truck, 
  XCircle, 
  FileText, 
  Printer, 
  Barcode,
  User,
  Calendar,
  Package,
  Copy,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle
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
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
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
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Expanded row IDs set (all expanded by default for maximum visibility!)
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});

  // Tracking modal state
  const [trackingModalOrderId, setTrackingModalOrderId] = useState<string | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState('');

  // ZNS Push Logs state
  const [showZnsModal, setShowZnsModal] = useState(false);
  const [znsLogs, setZnsLogs] = useState<any[]>([]);
  const [loadingZns, setLoadingZns] = useState(false);

  // Field Normalizers (Fixes missing name/phone/address bugs)
  const getRecipientName = (o: Order): string => {
    return o.shippingName || o.customerName || 'Khách hàng Zalo';
  };

  const getRecipientPhone = (o: Order): string => {
    return o.shippingPhone || o.phone || 'Không có SĐT';
  };

  const getRecipientAddress = (o: Order): string => {
    return o.shippingAddress || o.address || 'Tại cửa hàng';
  };

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

  const toggleExpand = (id: string) => {
    setExpandedOrderIds((prev) => ({ ...prev, [id]: !prev[id] }));
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

      // Expand all by default so user sees everything directly
      const expandMap: Record<string, boolean> = {};
      list.forEach((o) => { expandMap[o.id] = true; });
      setExpandedOrderIds((prev) => ({ ...expandMap, ...prev }));
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
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string, trackNum?: string) => {
    try {
      const payload: Record<string, string> = { status: newStatus };
      if (trackNum) {
        payload.trackingNumber = trackNum;
      }

      await apiRequest(`/orders/${orderId}/status`, 'PATCH', payload);
      
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, trackingNumber: trackNum || o.trackingNumber } : o)),
      );
      
      setTrackingModalOrderId(null);
      setTrackingNumberInput('');
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
    const name = getRecipientName(order);
    const phone = getRecipientPhone(order);
    const address = getRecipientAddress(order);

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
                <strong>Họ tên:</strong> ${name}<br>
                <strong>Điện thoại:</strong> ${phone}<br>
                <strong>Địa chỉ nhận:</strong> ${address}
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
        return <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 shadow-2xs">Hoàn thành</span>;
      case 'PROCESSING':
        return <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 rounded-full border border-amber-200 shadow-2xs">Đang xử lý</span>;
      case 'SHIPPED':
        return <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 rounded-full border border-blue-200 shadow-2xs">Đang giao</span>;
      case 'CANCELLED':
        return <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-red-50 text-red-600 rounded-full border border-red-200 shadow-2xs">Đã hủy</span>;
      case 'RETURN_REQUESTED':
        return <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 rounded-full border border-purple-200 shadow-2xs animate-pulse">Chờ trả hàng</span>;
      case 'RETURNED':
        return <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-gray-100 text-gray-600 rounded-full border border-gray-200 shadow-2xs">Đã trả hàng</span>;
      default:
        return <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 rounded-full border border-slate-200">{status}</span>;
    }
  };

  const filteredOrders = orders.filter((o) => {
    const name = getRecipientName(o).toLowerCase();
    const phone = getRecipientPhone(o);
    const matchSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      name.includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm);
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn text-[#1b1c1b] pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">🛒 Quản Lý Đơn Hàng Doanh Nghiệp</h1>
          <p className="text-slate-500 text-xs mt-1">Duyệt đơn, bàn giao shipper, theo dõi thông tin nhận hàng và in hóa đơn trực tiếp</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchOrders()}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[#0e6877]' : ''} />
            Làm mới
          </button>
          <button
            onClick={() =>
              exportToExcel(
                filteredOrders,
                'Bao_Cao_Don_Hang_ShopQuiet',
                [
                  { key: 'id', label: 'Mã Đơn Hàng' },
                  { key: 'shippingName', label: 'Tên Khách Hàng', formatter: (_v: any, r: Order) => getRecipientName(r) },
                  { key: 'shippingPhone', label: 'Số Điện Thoại', formatter: (_v: any, r: Order) => getRecipientPhone(r) },
                  { key: 'shippingAddress', label: 'Địa Chỉ Giao Hàng', formatter: (_v: any, r: Order) => getRecipientAddress(r) },
                  { key: 'totalAmount', label: 'Tổng Tiền (VNĐ)', formatter: (_v: any, r: Order) => getOrderTotal(r).toLocaleString('vi-VN') },
                  { key: 'status', label: 'Trạng Thái' },
                  { key: 'paymentMethod', label: 'Phương Thức Thanh Toán' },
                  { key: 'createdAt', label: 'Ngày Tạo', formatter: (v: any) => formatDate(v) },
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
            📱 Nhật Ký ZNS Push (Zalo OA)
          </button>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="relative w-full md:w-96">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm mã đơn, tên người nhận, số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#0e6877] rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all focus:bg-white shadow-2xs"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'Tất cả đơn' },
            { id: 'PROCESSING', label: 'Đang xử lý' },
            { id: 'SHIPPED', label: 'Đang giao' },
            { id: 'COMPLETED', label: 'Hoàn thành' },
            { id: 'RETURN_REQUESTED', label: 'Chờ trả hàng' },
            { id: 'CANCELLED', label: 'Đã hủy' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border-none cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-[#0e6877] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Full-Width Orders List Cards (All Info Rendered Directly!) ── */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-xs font-semibold">Đang tải toàn bộ dữ liệu đơn hàng...</p>
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = !!expandedOrderIds[order.id];
            const recipientName = getRecipientName(order);
            const recipientPhone = getRecipientPhone(order);
            const recipientAddress = getRecipientAddress(order);
            const orderTotal = getOrderTotal(order);

            return (
              <div 
                key={order.id} 
                className={`bg-white border rounded-3xl shadow-xs overflow-hidden transition-all duration-200 ${
                  isExpanded ? 'border-[#0e6877]/40 ring-1 ring-[#0e6877]/20 shadow-md' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                
                {/* ── Card Summary Bar (Always Visible!) ── */}
                <div className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50/50">
                  
                  {/* Left: Order Info & Status */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Mã Đơn</span>
                      <span className="font-mono text-sm font-black text-[#0e6877]">#{order.id.toUpperCase()}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-850 text-sm">{recipientName}</span>
                        <span className="text-xs font-bold text-slate-500">({recipientPhone})</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <div className="ml-0 lg:ml-2">
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  {/* Right: Order Total & Primary Action Toolbar */}
                  <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200/60">
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Tổng Thanh Toán</span>
                      <span className="text-base font-black text-teal-700">{formatPrice(orderTotal)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Action Buttons */}
                      {order.status === 'PENDING' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'PROCESSING')}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 border-none cursor-pointer shadow-xs active:scale-95"
                        >
                          <Check size={14} /> Duyệt Đơn
                        </button>
                      )}
                      {order.status === 'PROCESSING' && (
                        <button
                          onClick={() => {
                            setTrackingModalOrderId(order.id);
                            setTrackingNumberInput('');
                          }}
                          className="px-3.5 py-2 bg-[#0e6877] hover:bg-[#0c5966] text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 border-none cursor-pointer shadow-xs active:scale-95"
                        >
                          <Truck size={14} /> Bàn Giao Shipper
                        </button>
                      )}
                      {order.status === 'SHIPPED' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 border-none cursor-pointer shadow-xs active:scale-95"
                        >
                          <Check size={14} /> Hoàn Thành
                        </button>
                      )}

                      <button
                        onClick={() => handlePrint(order)}
                        className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl transition-all border border-slate-200 cursor-pointer shadow-2xs"
                        title="In hóa đơn"
                      >
                        <Printer size={15} />
                      </button>

                      <button
                        onClick={() => toggleExpand(order.id)}
                        className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-all border border-slate-200 cursor-pointer text-xs flex items-center gap-1 shadow-2xs"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                      </button>
                    </div>
                  </div>

                </div>

                {/* ── Expanded Full Details Section (Rich Grid!) ── */}
                {isExpanded && (
                  <div className="p-6 border-t border-slate-200/80 bg-white grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
                    
                    {/* Column 1: Customer & Delivery Info */}
                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                      <span className="text-[10.5px] font-black text-[#0e6877] uppercase tracking-wider flex items-center gap-1.5">
                        <User size={14} /> Thông Tin Giao Hàng
                      </span>

                      <div className="space-y-2 text-xs divide-y divide-slate-200/60">
                        <div className="flex justify-between pt-1">
                          <span className="text-slate-400">Người nhận:</span>
                          <span className="font-bold text-slate-800">{recipientName}</span>
                        </div>

                        <div className="flex justify-between pt-2">
                          <span className="text-slate-400">Số điện thoại:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-800">{recipientPhone}</span>
                            {recipientPhone !== 'Không có SĐT' && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(recipientPhone);
                                  toastSuccess('Đã sao chép SĐT', recipientPhone);
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
                          <span className="font-bold text-slate-800 text-right max-w-[220px] break-words">
                            {recipientAddress}
                          </span>
                        </div>

                        <div className="flex justify-between pt-2">
                          <span className="text-slate-400">Phương thức:</span>
                          <span className="font-bold text-[#0e6877] bg-teal-50 px-2.5 py-0.5 rounded-md text-[11px]">
                            {order.paymentMethod || 'COD'}
                          </span>
                        </div>

                        {order.trackingNumber && (
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-indigo-600 font-bold flex items-center gap-1 text-[11px]">
                              <Barcode size={14} /> Mã vận đơn (GHN):
                            </span>
                            <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md text-xs">
                              {order.trackingNumber}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 2: Items List */}
                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                      <span className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Package size={14} /> Sản Phẩm Đã Mua ({order.items?.length || 0})
                      </span>

                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {order.items?.map((item) => {
                          const img = getProductImage(item);
                          const itemTotal = Number(item.price || 0) * Number(item.quantity || 1);
                          return (
                            <div key={item.id} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                              <img 
                                src={img} 
                                alt={item.product?.name} 
                                className="w-12 h-12 object-cover rounded-lg shrink-0 border border-slate-200" 
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-slate-800 truncate">{item.product?.name || 'Sản phẩm'}</h4>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    Size: {item.size || 'F'}
                                  </span>
                                  {item.color && (
                                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                      {item.color}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold text-slate-600">
                                    x{item.quantity}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-black text-teal-700">{formatPrice(itemTotal)}</p>
                                <p className="text-[9px] text-slate-400">{formatPrice(item.price)}/sp</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Column 3: Return Complaints or Payment Summary */}
                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 flex flex-col justify-between space-y-3">
                      {['RETURN_REQUESTED', 'RETURNED'].includes(order.status) ? (
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 space-y-2 text-xs">
                          <span className="block text-[10px] font-black text-purple-800 uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle size={13} /> Yêu Cầu Hoàn Trả
                          </span>
                          <div className="space-y-1 text-[11px]">
                            <p><span className="text-purple-700 font-bold">Lý do:</span> {order.returnReason}</p>
                            {order.returnDescription && (
                              <p className="text-slate-700 bg-white p-2 rounded-lg border border-purple-200 mt-1">{order.returnDescription}</p>
                            )}
                            {order.returnImages && (() => {
                              try {
                                const parsed = JSON.parse(order.returnImages);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                  return (
                                    <div className="flex gap-2 pt-1 flex-wrap">
                                      {parsed.map((img: string, idx: number) => {
                                        const full = img.startsWith('http') ? img : `${serverUrl}${img}`;
                                        return (
                                          <a key={idx} href={full} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-lg border border-purple-200 overflow-hidden bg-white hover:scale-105 transition-transform">
                                            <img src={full} alt="Bằng chứng" className="w-full h-full object-cover" />
                                          </a>
                                        );
                                      })}
                                    </div>
                                  );
                                }
                              } catch (e) {}
                              return null;
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <span className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider block">
                            Tổng Quan Thanh Toán
                          </span>
                          <div className="space-y-1.5 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                            <div className="flex justify-between"><span>Tạm tính:</span><span className="font-semibold">{formatPrice(orderTotal)}</span></div>
                            <div className="flex justify-between"><span>Phí giao hàng:</span><span className="font-semibold text-emerald-600">Miễn phí</span></div>
                            <div className="flex justify-between pt-1 border-t border-slate-100 font-black text-sm text-[#0e6877]">
                              <span>Tổng cộng:</span>
                              <span>{formatPrice(orderTotal)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bottom Secondary Action Bar */}
                      <div className="pt-2 flex items-center gap-2">
                        {order.status !== 'COMPLETED' && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && order.status !== 'RETURNED' && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Bạn có chắc muốn hủy đơn hàng #${order.id.slice(-6).toUpperCase()}?`)) {
                                handleUpdateStatus(order.id, 'CANCELLED');
                              }
                            }}
                            className="w-full py-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold rounded-xl text-xs transition-all border border-red-200 hover:border-red-600 cursor-pointer"
                          >
                            <XCircle size={14} className="inline mr-1" /> Hủy Đơn Hàng Này
                          </button>
                        )}
                      </div>

                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 text-slate-400 flex flex-col items-center justify-center gap-3">
          <FileText size={40} className="text-slate-300" />
          <p className="text-xs font-bold text-slate-600">Không tìm thấy đơn hàng nào phù hợp.</p>
        </div>
      )}

      {/* ── Tracking Number Modal Form ── */}
      {trackingModalOrderId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200 animate-scaleUp">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Truck size={16} className="text-[#0e6877]" /> Bàn Giao Vận Chuyển Shipper
              </h3>
              <button
                onClick={() => setTrackingModalOrderId(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center border-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateStatus(trackingModalOrderId, 'SHIPPED', trackingNumberInput);
              }}
              className="space-y-3 text-left"
            >
              <p className="text-xs text-slate-600">
                Nhập mã vận đơn bưu gửi (GHN / GHTK / ViettelPost) cho đơn hàng <strong className="text-[#0e6877]">#{trackingModalOrderId.slice(-6).toUpperCase()}</strong>:
              </p>

              <input
                type="text"
                placeholder="VD: GHN123456789VN"
                value={trackingNumberInput}
                onChange={(e) => setTrackingNumberInput(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:border-[#0e6877] rounded-xl focus:outline-none font-mono font-bold"
                required
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0e6877] hover:bg-[#0b5460] text-white font-bold rounded-xl text-xs border-none cursor-pointer transition-all shadow-xs"
                >
                  Xác nhận Bàn giao
                </button>
                <button
                  type="button"
                  onClick={() => setTrackingModalOrderId(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs border-none cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ZNS Push Logs Modal ── */}
      {showZnsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-xl border border-slate-200 animate-scaleUp text-left">
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
