import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  RefreshCw,
  FileSpreadsheet,
  DollarSign,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Eye,
  CheckCheck,
  X,
  User,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { exportToExcel } from '../../utils/excel-export.util';
import { useToast } from '../../contexts';
import { PaginationComponent } from '../../components';

interface ITransaction {
  id: string;
  orderId: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  transferContent: string;
  createdAt: string;
  paidAt?: string;
  user?: {
    zaloId: string;
    name: string;
    phone?: string;
    avatar?: string;
  };
}

export const TransactionsPage: React.FC = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);


  const [selectedTxn, setSelectedTxn] = useState<ITransaction | null>(null);
  const [confirmingOrder, setConfirmingOrder] = useState<ITransaction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.set('search', searchQuery);
      if (gatewayFilter !== 'ALL') queryParams.set('gateway', gatewayFilter);
      if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);

      const data = await apiRequest<ITransaction[]>(`/cms/transactions?${queryParams.toString()}`);
      if (Array.isArray(data)) {
        setTransactions(data);
      }
    } catch (e) {
      console.error('Failed to fetch transactions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [gatewayFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleManualConfirm = async () => {
    if (!confirmingOrder) return;
    setActionLoading(true);
    try {
      await apiRequest(`/cms/transactions/${confirmingOrder.orderId}/manual-confirm`, 'POST');
      toastSuccess('Thành công', `Đã xác nhận thanh toán thủ công cho đơn #${confirmingOrder.orderId}`);
      setConfirmingOrder(null);
      fetchTransactions();
    } catch (e: any) {
      toastError('Thất bại', e.message || 'Lỗi khi xác nhận thủ công');
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics calculation
  const totalRevenue = transactions
    .filter((t) => ['PAID', 'COMPLETED'].includes(t.paymentStatus))
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const pay2sCount = transactions.filter((t) => t.paymentMethod?.toUpperCase().includes('PAY2S')).length;
  const pendingCount = transactions.filter((t) => t.paymentStatus === 'PENDING').length;
  const successCount = transactions.filter((t) => ['PAID', 'COMPLETED'].includes(t.paymentStatus)).length;

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-teal-50 text-[#0e6877] text-xs font-extrabold uppercase tracking-wider rounded-full border border-teal-200 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Quản Lý Giao Dịch & Đối Soát
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
            Nhật Ký Thanh Toán & Biến Động Số Dư
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Theo dõi chi tiết các giao dịch chuyển khoản Pay2S VietQR và thanh toán COD theo thời gian thực
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() =>
              exportToExcel(
                transactions,
                `Lich_Su_Giao_Dich_Thanh_Toan_${new Date().toISOString().slice(0, 10)}`,
                [
                  { key: 'id', label: 'Mã Giao Dịch' },
                  { key: 'orderId', label: 'Mã Đơn Hàng' },
                  { key: 'paymentMethod', label: 'Cổng Thanh Toán' },
                  { key: 'amount', label: 'Số Tiền (VNĐ)', formatter: (v: any) => v?.toLocaleString('vi-VN') },
                  { key: 'transferContent', label: 'Nội Dung CK' },
                  { key: 'paymentStatus', label: 'Trạng Thái' },
                  { key: 'createdAt', label: 'Thời Gian', formatter: (v: any) => new Date(v).toLocaleString('vi-VN') },
                ],
              )
            }
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-2xl transition-all border-none cursor-pointer shadow-xs active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" /> Xuất Excel
          </button>
          <button
            onClick={fetchTransactions}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all border-none cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" /> Làm Mới
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Đã Thu</span>
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-2xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{formatVND(totalRevenue)}</p>
          <p className="text-[11px] font-medium text-emerald-600">Đã thanh toán thành công</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pay2S VietQR</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{pay2sCount} GD</p>
          <p className="text-[11px] font-medium text-slate-400">Khớp lệnh tự động</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chờ Thanh Toán</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600">{pendingCount} đơn</p>
          <p className="text-[11px] font-medium text-slate-400">Đang chờ quét QR/Chuyển khoản</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Thành Công</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600">{successCount} GD</p>
          <p className="text-[11px] font-medium text-slate-400">Tỷ lệ hoàn tất cao</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo Mã đơn SQ-XXXXX, SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-[#0e6877]"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs">
            {['ALL', 'PAY2S', 'COD'].map((g) => (
              <button
                key={g}
                onClick={() => setGatewayFilter(g)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border-none ${
                  gatewayFilter === g ? 'bg-[#0e6877] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {g === 'ALL' ? 'Tất cả cổng' : g}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'PAID', label: 'Đã nhận tiền' },
              { id: 'PENDING', label: 'Chờ thanh toán' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border-none ${
                  statusFilter === s.id ? 'bg-[#0e6877] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#0e6877] animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Đang nạp danh sách giao dịch thanh toán...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Chưa có giao dịch thanh toán nào</p>
            <p className="text-xs text-slate-400">Các giao dịch phát sinh qua VietQR Pay2S hoặc COD sẽ hiển thị tại đây.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Mã Giao Dịch / Đơn Hàng</th>
                  <th className="py-3.5 px-5">Khách Hàng</th>
                  <th className="py-3.5 px-5">Phương Thức</th>
                  <th className="py-3.5 px-5">Số Tiền</th>
                  <th className="py-3.5 px-5">Cú Pháp CK</th>
                  <th className="py-3.5 px-5">Trạng Thái</th>
                  <th className="py-3.5 px-5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {transactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((txn) => {
                  const isPaid = ['PAID', 'COMPLETED'].includes(txn.paymentStatus);
                  const isPending = txn.paymentStatus === 'PENDING';

                  return (
                    <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Order & Txn ID */}
                      <td className="py-4 px-5">
                        <div className="font-extrabold text-slate-900">#{txn.orderId}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{txn.id}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(txn.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center font-bold text-slate-600">
                            {txn.user?.avatar ? (
                              <img src={txn.user.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{txn.user?.name || 'Khách xem'}</div>
                            <div className="text-[11px] text-slate-400">{txn.user?.phone || txn.user?.zaloId?.slice(0, 12)}</div>
                          </div>
                        </div>
                      </td>

                      {/* Method */}
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {txn.paymentMethod?.toUpperCase().includes('PAY2S') ? (
                            <>
                              <Zap className="w-3.5 h-3.5 text-blue-600" /> Pay2S VietQR
                            </>
                          ) : (
                            <>
                              <Truck className="w-3.5 h-3.5 text-amber-600" /> COD Tiền Mặt
                            </>
                          )}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-5 font-black text-slate-900">
                        {formatVND(txn.amount)}
                      </td>

                      {/* Content */}
                      <td className="py-4 px-5">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-teal-50 text-teal-700 rounded-lg border border-teal-200">
                          {txn.transferContent}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isPending
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" /> Đã nhận tiền
                            </>
                          ) : isPending ? (
                            <>
                              <Clock className="w-3.5 h-3.5" /> Chờ chuyển khoản
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" /> Đã hủy
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedTxn(txn)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border-none cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isPending && (
                            <button
                              onClick={() => setConfirmingOrder(txn)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#0e6877] hover:bg-[#0b5460] text-white text-[11px] font-bold rounded-xl transition-all border-none cursor-pointer shadow-xs active:scale-95"
                              title="Xác nhận đối soát thủ công"
                            >
                              <CheckCheck className="w-3.5 h-3.5" /> Duyệt thủ công
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {transactions.length > 0 && (
              <div className="p-4 border-t border-slate-100">
                <PaginationComponent
                  currentPage={currentPage}
                  totalPages={Math.ceil(transactions.length / itemsPerPage)}
                  totalItems={transactions.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(newSize) => {
                    setItemsPerPage(newSize);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100 relative">
            <button
              onClick={() => setSelectedTxn(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 cursor-pointer bg-slate-100 p-1.5 rounded-full border-none"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-xs font-bold text-[#0e6877]">
              <CreditCard className="w-4 h-4" /> Chi Tiết Giao Dịch
            </div>
            <h3 className="text-lg font-black text-slate-900">Đơn hàng #{selectedTxn.orderId}</h3>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã Giao Dịch:</span>
                <span className="font-mono font-bold text-slate-800">{selectedTxn.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số Tiền:</span>
                <span className="font-black text-slate-900">{formatVND(selectedTxn.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cú Pháp CK:</span>
                <span className="font-mono font-bold text-[#0e6877]">{selectedTxn.transferContent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cổng Thanh Toán:</span>
                <span className="font-bold text-slate-800">{selectedTxn.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Thời Gian Tạo:</span>
                <span className="font-bold text-slate-800">{new Date(selectedTxn.createdAt).toLocaleString('vi-VN')}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedTxn(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-all border-none cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Confirm Modal */}
      {confirmingOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100 text-center">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">Xác Nhận Thanh Toán Thủ Công?</h3>
            <p className="text-xs text-slate-500">
              Bạn có chắc chắn muốn duyệt đối soát thủ công cho Đơn hàng <strong className="text-slate-800">#{confirmingOrder.orderId}</strong> với số tiền <strong className="text-slate-800">{formatVND(confirmingOrder.amount)}</strong>?
            </p>

            <div className="flex gap-3 pt-3">
              <button
                onClick={() => setConfirmingOrder(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl border-none cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleManualConfirm}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-[#0e6877] hover:bg-[#0b5460] text-white text-xs font-bold rounded-2xl border-none cursor-pointer shadow-xs"
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác Nhận Ngay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
