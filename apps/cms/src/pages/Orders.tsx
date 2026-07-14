import React, { useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import { 
  Search, 
  Eye, 
  Check, 
  Truck, 
  XCircle, 
  FileText,
  Clock
} from 'lucide-react';

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
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  total: number;
  createdAt: string;
  items: OrderItem[];
}

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await apiRequest(`/orders/${orderId}/status`, 'PATCH', { status: newStatus });
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus as any } : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus as any });
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật trạng thái đơn hàng');
    }
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
        return <span className="px-2.5 py-1 text-xs font-semibold text-amber-300 bg-amber-500/10 rounded-full">Chờ thanh toán</span>;
      case 'PROCESSING':
        return <span className="px-2.5 py-1 text-xs font-semibold text-blue-300 bg-blue-500/10 rounded-full">Đang xử lý</span>;
      case 'SHIPPED':
        return <span className="px-2.5 py-1 text-xs font-semibold text-indigo-300 bg-indigo-500/10 rounded-full">Đang giao</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-500/10 rounded-full">Hoàn thành</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-xs font-semibold text-rose-300 bg-rose-500/10 rounded-full">Đã hủy</span>;
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
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Quản lý đơn hàng</h2>
        <p className="text-slate-400 text-sm mt-1">Duyệt đơn, cập nhật trạng thái giao hàng và thanh toán</p>
      </div>

      {/* Grid Content Split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {/* Orders Table */}
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm theo mã đơn, khách hàng, số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-700 focus:outline-none transition-all"
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 text-xs">Đang tải danh sách đơn hàng...</p>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 rounded-l-xl">Mã đơn</th>
                    <th className="py-3.5 px-4">Khách hàng</th>
                    <th className="py-3.5 px-4">Tổng tiền</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4 rounded-r-xl">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredOrders.map((order) => (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-slate-850/30 transition-colors cursor-pointer ${
                        selectedOrder?.id === order.id ? 'bg-slate-850/50' : ''
                      }`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="py-4 px-4 font-mono text-xs text-white">#{order.id.slice(-6).toUpperCase()}</td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-200">{order.customerName || 'Zalo User'}</div>
                        <div className="text-[10px] text-slate-400">{order.phone || 'Không có SĐT'}</div>
                      </td>
                      <td className="py-4 px-4 font-semibold text-emerald-400">{formatPrice(order.total || 0)}</td>
                      <td className="py-4 px-4">{getStatusBadge(order.status)}</td>
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center gap-3">
              <FileText size={32} className="text-slate-700" />
              <p className="text-xs">Không tìm thấy đơn hàng nào phù hợp.</p>
            </div>
          )}
        </div>

        {/* Selected Order Detail Sidebar Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          {selectedOrder ? (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-white">Chi tiết đơn hàng</h3>
                <p className="font-mono text-xs text-slate-450 mt-1">#{selectedOrder.id.toUpperCase()}</p>
              </div>

              {/* Order Status Controller */}
              <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-3">
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Trạng thái đơn hàng</span>
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.status === 'PENDING' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'PROCESSING')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl text-xs transition-colors"
                    >
                      <Check size={12} />
                      Duyệt đơn
                    </button>
                  )}
                  {selectedOrder.status === 'PROCESSING' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'SHIPPED')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl text-xs transition-colors"
                    >
                      <Truck size={12} />
                      Giao hàng
                    </button>
                  )}
                  {selectedOrder.status === 'SHIPPED' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-xs transition-colors"
                    >
                      <Check size={12} />
                      Hoàn thành
                    </button>
                  )}
                  {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white font-semibold rounded-xl text-xs transition-colors"
                    >
                      <XCircle size={12} />
                      Hủy đơn
                    </button>
                  )}
                </div>
              </div>

              {/* Customer details */}
              <div className="space-y-3 text-xs border-b border-slate-800 pb-5">
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Thông tin khách hàng</span>
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-slate-500">Tên:</span><span className="text-slate-200 font-medium">{selectedOrder.customerName || 'Zalo User'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Số điện thoại:</span><span className="text-slate-200 font-medium">{selectedOrder.phone || 'Không có'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Địa chỉ giao hàng:</span><span className="text-slate-200 font-medium text-right max-w-[200px] break-words">{selectedOrder.address || 'Tại cửa hàng'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Thời gian tạo:</span><span className="text-slate-200 font-medium">{formatDate(selectedOrder.createdAt)}</span></div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sản phẩm đã chọn</span>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex gap-3 bg-slate-950/40 p-2.5 rounded-2xl border border-slate-850">
                      <img src={item.product?.image} alt={item.product?.name} className="w-12 h-12 object-cover rounded-xl shrink-0 bg-slate-950" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate">{item.product?.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-1">Size: {item.size} | Số lượng: {item.quantity}</p>
                        <p className="text-emerald-400 text-xs font-bold mt-0.5">{formatPrice(item.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="flex justify-between items-center bg-slate-950/60 p-4 rounded-2xl border border-slate-850">
                <span className="text-xs font-semibold text-slate-400">Tổng doanh thu đơn:</span>
                <span className="text-base font-bold text-emerald-400">{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>
          ) : (
            <div className="h-96 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <Clock size={32} className="text-slate-700" />
              <p className="text-xs">Chọn một đơn hàng để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Orders;
