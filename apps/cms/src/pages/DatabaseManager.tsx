import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  X, 
  Save, 
  Database,
  ArrowLeft,
  AlertCircle,
  Check,
  XCircle,
  Truck,
  User as UserIcon,
  Star,
  Ticket
} from 'lucide-react';

export const DatabaseManager: React.FC = () => {
  const { modelName } = useParams<{ modelName: string }>();
  const navigate = useNavigate();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<Record<string, any>>({});

  const fetchRecords = async () => {
    if (!modelName) return;
    try {
      setLoading(true);
      const res = await apiRequest(`/cms/database/models/${modelName}`);
      setRecords(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(`Failed to load records for model ${modelName}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    setIsModalOpen(false);
    setEditingRecord(null);
  }, [modelName]);

  const getColumns = () => {
    if (records.length === 0) return ['id'];
    return Object.keys(records[0]).filter(
      (key) => typeof records[0][key] !== 'object' || records[0][key] === null
    );
  };

  const columns = getColumns();

  const handleOpenAddModal = () => {
    setEditingRecord(null);
    const initialForm: Record<string, any> = {};
    columns.forEach((col) => {
      if (col === 'id' || col === 'createdAt' || col === 'updatedAt') return;
      
      const sampleVal = records[0]?.[col];
      if (typeof sampleVal === 'number') {
        initialForm[col] = 0;
      } else if (typeof sampleVal === 'boolean') {
        initialForm[col] = true;
      } else {
        initialForm[col] = '';
      }
    });
    setFormData(initialForm);
    setIsModalOpen(true);
    setError('');
  };

  const handleOpenEditModal = (record: any) => {
    setEditingRecord(record);
    const initialForm: Record<string, any> = {};
    columns.forEach((col) => {
      if (col === 'id' || col === 'createdAt' || col === 'updatedAt') return;
      initialForm[col] = record[col] ?? '';
    });
    setFormData(initialForm);
    setIsModalOpen(true);
    setError('');
  };

  const handleDeleteRecord = async (id: string | number) => {
    if (!modelName) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản ghi này của bảng ${modelName}?`)) return;
    try {
      await apiRequest(`/cms/database/models/${modelName}/${id}`, 'DELETE');
      setRecords(records.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err.message || 'Không thể xóa bản ghi do ràng buộc dữ liệu.');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    if (!modelName) return;
    try {
      await apiRequest(`/cms/database/models/Order/${orderId}`, 'PATCH', { status });
      setRecords(records.map(r => r.id === orderId ? { ...r, status } : r));
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật trạng thái đơn hàng.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName) return;
    setError('');

    try {
      const castedData: Record<string, any> = {};
      Object.keys(formData).forEach((key) => {
        const originalVal = records[0]?.[key];
        if (typeof originalVal === 'number') {
          castedData[key] = Number(formData[key]);
        } else if (typeof originalVal === 'boolean') {
          castedData[key] = formData[key] === 'true' || formData[key] === true;
        } else {
          castedData[key] = formData[key];
        }
      });

      if (editingRecord) {
        await apiRequest(`/cms/database/models/${modelName}/${editingRecord.id}`, 'PATCH', castedData);
      } else {
        await apiRequest(`/cms/database/models/${modelName}`, 'POST', castedData);
      }
      fetchRecords();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu dữ liệu bản ghi.');
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const filteredRecords = records.filter((r) => {
    return columns.some((col) => {
      const val = r[col];
      return val !== null && String(val).toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  // --- Specialized Custom Renderers ---

  const renderProductView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredRecords.map((product) => (
        <div key={product.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200 group">
          <div className="h-44 bg-[#fbf9f7] relative">
            <img src={product.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'} alt={product.name} className="w-full h-full object-cover" />
            <span className="absolute top-3 left-3 bg-[#ecf6f7] text-[#0e6877] border border-[#0e6877]/10 px-2 py-0.5 rounded-full text-[10px] font-bold">
              ID: {product.id}
            </span>
          </div>
          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-[#1b1c1b] line-clamp-1">{product.name}</h4>
              <p className="text-[#526069] text-xs line-clamp-2 leading-relaxed">{product.description || 'Không có mô tả.'}</p>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div>
                <p className="text-[#0e6877] font-bold text-sm">{formatPrice(product.price)}</p>
                {product.originalPrice && product.originalPrice > product.price && (
                  <p className="text-[10px] text-slate-400 line-through">{formatPrice(product.originalPrice)}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenEditModal(product)} className="p-2 bg-slate-50 hover:bg-[#ecf6f7] text-[#526069] hover:text-[#0e6877] border border-slate-200 rounded-xl transition-all"><Edit3 size={12} /></button>
                <button onClick={() => handleDeleteRecord(product.id)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-all"><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="px-2.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 rounded-full border border-amber-200">Chờ thanh toán</span>;
      case 'PROCESSING': return <span className="px-2.5 py-1 text-[10px] font-bold text-blue-700 bg-blue-50 rounded-full border border-blue-200">Đang xử lý</span>;
      case 'SHIPPED': return <span className="px-2.5 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 rounded-full border border-indigo-200">Đang giao</span>;
      case 'COMPLETED': return <span className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">Hoàn thành</span>;
      case 'CANCELLED': return <span className="px-2.5 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 rounded-full border border-rose-200">Đã hủy</span>;
      default: return <span className="px-2.5 py-1 text-[10px] font-bold text-slate-700 bg-slate-50 rounded-full border border-slate-200">{status}</span>;
    }
  };

  const renderOrderView = () => (
    <div className="space-y-4">
      {filteredRecords.map((order) => (
        <div key={order.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 hover:border-slate-300 transition-all duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-3 border-b border-slate-100">
            <div>
              <span className="font-mono text-xs text-[#0e6877] font-bold">#{order.id.slice(-6).toUpperCase()}</span>
              <span className="text-[10px] text-slate-400 font-medium ml-3">Ngày đặt: {new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
            </div>
            <div className="flex items-center gap-3">
              {getOrderStatusBadge(order.status)}
              <div className="flex gap-1.5">
                {order.status === 'PENDING' && (
                  <button onClick={() => handleUpdateOrderStatus(order.id, 'PROCESSING')} className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold flex items-center gap-1"><Check size={10} /> Duyệt</button>
                )}
                {order.status === 'PROCESSING' && (
                  <button onClick={() => handleUpdateOrderStatus(order.id, 'SHIPPED')} className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1"><Truck size={10} /> Giao hàng</button>
                )}
                {order.status === 'SHIPPED' && (
                  <button onClick={() => handleUpdateOrderStatus(order.id, 'COMPLETED')} className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center gap-1"><Check size={10} /> Hoàn tất</button>
                )}
                {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                  <button onClick={() => handleUpdateOrderStatus(order.id, 'CANCELLED')} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold flex items-center gap-1"><XCircle size={10} /> Hủy</button>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-slate-400 font-medium uppercase text-[9px] tracking-wider">Khách hàng</p>
              <p className="font-bold text-[#1b1c1b] mt-1">{order.customerName || 'Zalo User'}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">{order.phone || 'Không có SĐT'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium uppercase text-[9px] tracking-wider">Địa chỉ giao hàng</p>
              <p className="font-semibold text-slate-700 mt-1 line-clamp-2">{order.address || 'Tại cửa hàng'}</p>
            </div>
            <div className="flex flex-col justify-between items-end">
              <span className="text-slate-400 font-medium uppercase text-[9px] tracking-wider">Tổng đơn hàng</span>
              <span className="text-[#0e6877] font-bold text-sm mt-1">{formatPrice(order.total || 0)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderVoucherView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredRecords.map((v) => (
        <div key={v.id} className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between relative shadow-sm group hover:border-[#0e6877]/30 transition-all duration-200">
          <div className="absolute top-1/2 -left-3 w-6 h-6 bg-[#fbf9f7] rounded-full border border-slate-200 border-r-transparent -translate-y-1/2"></div>
          <div className="absolute top-1/2 -right-3 w-6 h-6 bg-[#fbf9f7] rounded-full border border-slate-200 border-l-transparent -translate-y-1/2"></div>
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-[#ecf6f7] text-[#0e6877] rounded-2xl border border-[#0e6877]/10">
                  <Ticket size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-[#1b1c1b] tracking-wide text-sm">{v.code}</h4>
                  <p className="text-[10px] text-[#0e6877] font-bold uppercase">
                    {v.type === 'PERCENTAGE' ? `Giảm ${v.value}%` : `Giảm ${formatPrice(v.value)}`}
                  </p>
                </div>
              </div>
              <button onClick={() => handleDeleteRecord(v.id)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors"><Trash2 size={12} /></button>
            </div>
            <div className="space-y-2 border-t border-dashed border-slate-100 pt-4 text-xs font-semibold">
              <p className="text-[#526069] font-medium text-xs">{v.description || 'Không có mô tả.'}</p>
              <div className="flex justify-between text-[11px]"><span className="text-slate-400">Đơn tối thiểu:</span><span className="text-[#1b1c1b]">{formatPrice(v.minOrder)}</span></div>
              <div className="flex justify-between text-[11px]"><span className="text-slate-400">Đã dùng:</span><span className="text-[#1b1c1b]">{v.usedCount || 0} / {v.maxUses || 'Vô hạn'}</span></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderBannerView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {filteredRecords.map((banner) => (
        <div key={banner.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-all duration-200 group">
          <div className="h-44 bg-[#fbf9f7] relative overflow-hidden">
            <img src={banner.imageUrl} alt={banner.title || 'Slide Banner'} className="w-full h-full object-cover" />
            <button onClick={() => handleDeleteRecord(banner.id)} className="absolute top-4 right-4 p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors shadow-lg"><Trash2 size={13} /></button>
          </div>
          <div className="p-5 space-y-2 flex-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ID: {banner.id}</span>
            <h4 className="font-bold text-[#1b1c1b] tracking-wide text-sm">{banner.title || 'Không có tiêu đề'}</h4>
            <p className="text-xs text-[#526069] leading-relaxed">{banner.description || 'Không có mô tả.'}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderUserView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredRecords.map((user) => (
        <div key={user.zaloId} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 hover:border-slate-300 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#ecf6f7] text-[#0e6877] rounded-full shrink-0 border border-[#0e6877]/10">
              <UserIcon size={20} />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-[#1b1c1b] text-sm truncate">{user.name}</h4>
              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider ${
                user.role === 'admin' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-slate-600 bg-slate-50 border border-slate-200'
              }`}>
                {user.role}
              </span>
            </div>
          </div>
          <div className="space-y-2 border-t border-slate-100 pt-4 text-xs">
            <div className="flex justify-between text-[11px]"><span className="text-slate-400">Số điện thoại:</span><span className="text-[#1b1c1b] font-semibold">{user.phone || 'Chưa cập nhật'}</span></div>
            <div className="flex justify-between text-[11px]"><span className="text-slate-400">Ngày sinh:</span><span className="text-[#1b1c1b] font-semibold">{user.birthday || 'Chưa cập nhật'}</span></div>
            <div className="flex justify-between text-[11px]"><span className="text-slate-400">Zalo ID:</span><span className="text-[#1b1c1b] font-mono text-[10px]">{user.zaloId}</span></div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCommentView = () => (
    <div className="space-y-4">
      {filteredRecords.map((c) => (
        <div key={c.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3 hover:border-slate-350 transition-all duration-200">
          <div className="flex justify-between items-start border-b border-slate-100 pb-3">
            <div>
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Người dùng ID: {c.zaloUserId}</div>
              <div className="text-[10px] text-slate-450 font-medium mt-0.5">Sản phẩm ID: {c.productId}</div>
            </div>
            <div className="flex gap-0.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} fill={i < (c.rating || 0) ? 'currentColor' : 'none'} className={i < (c.rating || 0) ? 'text-amber-400' : 'text-slate-200'} />
              ))}
            </div>
          </div>
          <p className="text-xs text-[#1b1c1b] leading-relaxed font-semibold">{c.content}</p>
        </div>
      ))}
    </div>
  );

  // Fallback simplified table rendering (for Category, MenuItem, SiteSetting, StaticPage, etc.)
  const renderDefaultTableView = () => {
    // Columns to exclude from simplified view to make it extremely easy to read
    const excludedColumns = ['description', 'images', 'link', 'createdAt', 'updatedAt', 'materialCare', 'shippingReturn', 'avatar'];
    const simpleColumns = columns.filter(col => !excludedColumns.includes(col));

    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-6 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 whitespace-nowrap">
            <thead className="bg-[#fbf9f7] text-[#526069] text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10">
              <tr>
                {simpleColumns.map((col) => (
                  <th key={col} className="py-3.5 px-4 bg-[#fbf9f7] border-b border-slate-200">{col}</th>
                ))}
                <th className="py-3.5 px-4 bg-[#fbf9f7] border-b border-slate-200 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {filteredRecords.map((record) => (
                <tr key={record.id || record.zaloId || record.code} className="hover:bg-slate-50 transition-colors">
                  {simpleColumns.map((col) => {
                    const val = record[col];
                    let displayVal = String(val ?? 'NULL');
                    if (typeof val === 'boolean') {
                      displayVal = val ? 'TRUE' : 'FALSE';
                    }
                    return (
                      <td key={col} className="py-3.5 px-4 max-w-xs truncate text-[#1b1c1b] font-medium" title={displayVal}>
                        {displayVal}
                      </td>
                    );
                  })}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenEditModal(record)}
                        className="p-1.5 bg-slate-50 hover:bg-[#ecf6f7] text-[#526069] hover:text-[#0e6877] border border-slate-200 rounded-lg transition-colors"
                        title="Sửa"
                      >
                        <Edit3 size={11} />
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(record.id || record.zaloId || record.code)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const getBespokeLayout = () => {
    if (filteredRecords.length === 0) {
      return (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-[#526069] flex flex-col items-center justify-center gap-3 shadow-sm">
          <Database size={32} className="text-slate-300" />
          <p className="text-xs font-semibold">Bảng {modelName} hiện đang trống và chưa có bản ghi nào.</p>
        </div>
      );
    }
    
    switch (modelName) {
      case 'Product': return renderProductView();
      case 'Order': return renderOrderView();
      case 'Voucher': return renderVoucherView();
      case 'Banner': return renderBannerView();
      case 'User': return renderUserView();
      case 'Comment': return renderCommentView();
      default: return renderDefaultTableView();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-[#1b1c1b]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-[#526069] rounded-xl transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-[#1b1c1b] tracking-tight">Dữ liệu bảng: {modelName}</h2>
            <p className="text-[#526069] text-sm mt-1">
              Quản lý và thực hiện chỉnh sửa cơ sở dữ liệu trực tiếp
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-[#0e6877] hover:bg-[#0a4c57] text-white font-semibold py-2.5 px-5 rounded-xl text-sm flex items-center gap-2 transition-all duration-200 shadow-md shadow-[#0e6877]/10"
        >
          <Plus size={16} />
          <span>Thêm bản ghi mới</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder={`Tìm kiếm trong các cột của bảng ${modelName}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#fbf9f7] border border-slate-200 focus:border-[#0e6877] focus:ring-1 focus:ring-[#0e6877] rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#1b1c1b] placeholder-slate-400 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Tailored Layout List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#526069] text-xs">Đang tải cấu trúc dữ liệu...</p>
        </div>
      ) : (
        getBespokeLayout()
      )}

      {/* Dynamic Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-slideUp">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#1b1c1b]">
                {editingRecord ? `Chỉnh sửa: ${modelName}` : `Thêm bản ghi mới: ${modelName}`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#1b1c1b] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="p-4 mx-6 mt-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-start gap-2.5">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[450px] overflow-y-auto">
              {Object.keys(formData).map((key) => {
                const sampleVal = records[0]?.[key];
                return (
                  <div key={key}>
                    <label className="block text-[#526069] text-[10px] font-bold mb-1.5 uppercase tracking-wider">
                      {key}
                    </label>
                    
                    {typeof sampleVal === 'boolean' ? (
                      <select
                        value={formData[key] ? 'true' : 'false'}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value === 'true' })}
                        className="w-full bg-[#fbf9f7] border border-slate-200 focus:border-[#0e6877] rounded-xl py-2 px-3 text-xs text-[#1b1c1b] focus:outline-none transition-all"
                      >
                        <option value="true">TRUE</option>
                        <option value="false">FALSE</option>
                      </select>
                    ) : typeof sampleVal === 'number' ? (
                      <input
                        type="number"
                        required
                        value={formData[key]}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                        className="w-full bg-[#fbf9f7] border border-slate-200 focus:border-[#0e6877] rounded-xl py-2 px-3 text-xs text-[#1b1c1b] focus:outline-none transition-all"
                      />
                    ) : (
                      <input
                        type="text"
                        value={formData[key]}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                        placeholder={`Nhập ${key}...`}
                        className="w-full bg-[#fbf9f7] border border-slate-200 focus:border-[#0e6877] rounded-xl py-2 px-3 text-xs text-[#1b1c1b] focus:outline-none transition-all"
                      />
                    )}
                  </div>
                );
              })}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#526069] font-bold rounded-xl text-xs transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0e6877] hover:bg-[#0a4c57] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-[#0e6877]/10"
                >
                  <Save size={14} />
                  Lưu bản ghi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default DatabaseManager;
