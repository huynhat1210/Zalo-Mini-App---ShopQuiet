import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest, apiUploadRequest } from '../../utils/api';
import { useToast } from '../../contexts';
import { validateField, validateRecord } from '../../utils/validation';
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
  Ticket,
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  X as CloseIcon,
  PackageSearch
} from 'lucide-react';

import type { IDatabaseManagerComponentProps } from './database-manager.type';

export const DatabaseManagerComponent: React.FC<IDatabaseManagerComponentProps> = (_props) => {
  const { modelName } = useParams<{ modelName: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [selectedRecords, setSelectedRecords] = useState<Set<string | number>>(new Set());
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const handleFileUpload = async (key: string, file: File) => {
    try {
      setUploadingField(key);
      const url = await apiUploadRequest(file);
      
      if (key === 'images') {
        let currentImages: string[] = [];
        try {
          const parsed = JSON.parse(formData[key] || '[]');
          if (Array.isArray(parsed)) currentImages = parsed;
        } catch {}
        currentImages.push(url);
        handleFieldChange(key, JSON.stringify(currentImages));
      } else {
        handleFieldChange(key, url);
      }
      success('Tải ảnh lên thành công!');
    } catch (err: any) {
      toastError(err.message || 'Lỗi tải ảnh lên');
    } finally {
      setUploadingField(null);
    }
  };

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
    setRecords([]);
    setSearchTerm('');
    setSelectedRecords(new Set());
    setColumnFilters({});
    setIsFilterPanelOpen(false);
    fetchRecords();
    setIsDrawerOpen(false);
    setEditingRecord(null);
  }, [modelName]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getColumns = () => {
    if (records.length === 0) return ['id'];
    return Object.keys(records[0]).filter(
      (key) => typeof records[0][key] !== 'object' || records[0][key] === null
    );
  };

  const columns = getColumns();

  const openDrawerForAdd = () => {
    setEditingRecord(null);
    const initialForm: Record<string, any> = {};
    columns.forEach((col) => {
      if (col === 'id' || col === 'createdAt' || col === 'updatedAt') return;
      const sampleVal = records[0]?.[col];
      if (typeof sampleVal === 'number') initialForm[col] = 0;
      else if (typeof sampleVal === 'boolean') initialForm[col] = true;
      else initialForm[col] = '';
    });
    setFormData(initialForm);
    setError('');
    setIsDrawerOpen(true);
  };

  const openDrawerForEdit = (record: any) => {
    setEditingRecord(record);
    const initialForm: Record<string, any> = {};
    columns.forEach((col) => {
      if (col === 'id' || col === 'createdAt' || col === 'updatedAt') return;
      initialForm[col] = record[col] ?? '';
    });
    setFormData(initialForm);
    setError('');
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingRecord(null);
    setError('');
  };

  const handleDeleteRecord = async (id: string | number) => {
    if (!modelName) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản ghi này của bảng ${modelName}?`)) return;
    try {
      await apiRequest(`/cms/database/models/${modelName}/${id}`, 'DELETE');
      setRecords(records.filter((r) => r.id !== id));
      success('Đã xóa', `Bản ghi đã được xóa thành công khỏi bảng ${modelName}`);
    } catch (err: any) {
      toastError('Lỗi xóa', err.message || 'Không thể xóa bản ghi do ràng buộc dữ liệu.');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    if (!modelName) return;
    try {
      await apiRequest(`/cms/database/models/Order/${orderId}`, 'PATCH', { status });
      setRecords(records.map(r => r.id === orderId ? { ...r, status } : r));
      success('Cập nhật thành công', `Trạng thái đơn hàng đã được cập nhật thành ${status}`);
    } catch (err: any) {
      toastError('Lỗi cập nhật', err.message || 'Lỗi khi cập nhật trạng thái đơn hàng.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName) return;
    setError('');

    // Validate form data
    const validationErrors = validateRecord(modelName, formData);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      toastError('Lỗi validation', 'Vui lòng kiểm tra lại các trường có lỗi.');
      return;
    }

    setFieldErrors({});

    try {
      const castedData: Record<string, any> = {};
      Object.keys(formData).forEach((key) => {
        const originalVal = records[0]?.[key];
        if (typeof originalVal === 'number') castedData[key] = Number(formData[key]);
        else if (typeof originalVal === 'boolean') castedData[key] = formData[key] === 'true' || formData[key] === true;
        else castedData[key] = formData[key];
      });

      if (editingRecord) {
        await apiRequest(`/cms/database/models/${modelName}/${editingRecord.id}`, 'PATCH', castedData);
      } else {
        await apiRequest(`/cms/database/models/${modelName}`, 'POST', castedData);
      }
      await fetchRecords();
      closeDrawer();
      success(editingRecord ? 'Cập nhật thành công' : 'Thêm mới thành công', `Bản ghi đã được ${editingRecord ? 'cập nhật' : 'thêm'} vào bảng ${modelName}`);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu dữ liệu bản ghi.');
      toastError('Lỗi lưu', err.message || 'Lỗi khi lưu dữ liệu bản ghi.');
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData({ ...formData, [fieldName]: value });

    // Real-time validation
    const errors = validateField(modelName || '', fieldName, value);
    if (errors.length > 0) {
      setFieldErrors(prev => ({ ...prev, [fieldName]: errors }));
    } else {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const filteredRecords = records.filter((r) => {
    // Global search
    const matchesSearch = columns.some((col) => {
      const val = r[col];
      return val !== null && String(val).toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Column filters
    const matchesColumnFilters = Object.entries(columnFilters).every(([col, filterValue]) => {
      if (!filterValue) return true;
      const val = r[col];
      return val !== null && String(val).toLowerCase().includes(filterValue.toLowerCase());
    });

    return matchesSearch && matchesColumnFilters;
  });

  const toggleRecordSelection = (id: string | number) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRecords.size === filteredRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(filteredRecords.map(r => r.id || r.zaloId || r.code)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRecords.size === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedRecords.size} bản ghi đã chọn?`)) return;

    try {
      await Promise.all(
        Array.from(selectedRecords).map(id =>
          apiRequest(`/cms/database/models/${modelName}/${id}`, 'DELETE')
        )
      );
      setRecords(records.filter(r => !selectedRecords.has(r.id || r.zaloId || r.code)));
      setSelectedRecords(new Set());
      success('Đã xóa', `${selectedRecords.size} bản ghi đã được xóa thành công`);
    } catch (err: any) {
      toastError('Lỗi xóa hàng loạt', err.message || 'Không thể xóa một số bản ghi do ràng buộc dữ liệu.');
    }
  };

  const clearColumnFilters = () => {
    setColumnFilters({});
  };



  // ── Specialized Custom Renderers ──

  const renderProductView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredRecords.map((product) => {
        let imgUrl = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400';
        if (product.images) {
          try {
            const parsed = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
            if (Array.isArray(parsed) && parsed.length > 0) {
              imgUrl = parsed[0];
            } else if (typeof parsed === 'string') {
              imgUrl = parsed;
            }
          } catch (e) {
            imgUrl = product.images;
          }
        }
        return (
          <div key={product.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col hover:shadow-lg transition-all duration-300 group">
            {/* Product Image */}
            <div className="h-52 bg-[#fbf9f7] relative overflow-hidden">
              <img
                src={imgUrl}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-3 left-3 flex gap-2">
                <span className="bg-[#ecf6f7] text-[#0e6877] border border-[#0e6877]/10 px-2.5 py-1 rounded-full text-[10px] font-bold">
                  ID: {product.id}
                </span>
                {product.stock !== undefined && (
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${product.stock > 10 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      product.stock > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                    Tồn: {product.stock}
                  </span>
                )}
              </div>
              {product.originalPrice && product.originalPrice > product.price && (
                <div className="absolute top-3 right-3 bg-rose-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold">
                  -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="p-5 flex-1 flex flex-col space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-[#1b1c1b] line-clamp-2 leading-tight">{product.name}</h4>
                <p className="text-[#526069] text-xs line-clamp-2 leading-relaxed">{product.description || 'Không có mô tả.'}</p>
              </div>

              {/* Price and Category */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[#0e6877] font-bold text-lg">{formatPrice(product.price)}</p>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <p className="text-[11px] text-slate-400 line-through">{formatPrice(product.originalPrice)}</p>
                  )}
                </div>
                {product.categoryId && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Danh mục:</span>
                    <span className="text-[10px] font-semibold text-[#0e6877] bg-[#ecf6f7] px-2 py-0.5 rounded-full">#{product.categoryId}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => openDrawerForEdit(product)}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-[#ecf6f7] text-[#526069] hover:text-[#0e6877] border border-slate-200 hover:border-[#0e6877]/30 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-semibold"
                >
                  <Edit3 size={12} /> Sửa
                </button>
                <button
                  onClick={() => handleDeleteRecord(product.id)}
                  className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-all"
                  title="Xóa"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
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
        <div key={order.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 hover:border-slate-350 transition-all duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-3 border-b border-slate-100">
            <div>
              <span className="font-mono text-xs text-[#0e6877] font-bold">
                #{typeof order.id === 'string' ? order.id.slice(-6).toUpperCase() : String(order.id)}
              </span>
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
              <p className="font-bold text-[#1b1c1b] mt-1">{order.shippingName || 'Zalo User'}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">{order.shippingPhone || 'Không có SĐT'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium uppercase text-[9px] tracking-wider">Địa chỉ giao hàng</p>
              <p className="font-semibold text-slate-700 mt-1 line-clamp-2">{order.shippingAddress || 'Tại cửa hàng'}</p>
            </div>
            <div className="flex flex-col justify-between items-end">
              <span className="text-slate-400 font-medium uppercase text-[9px] tracking-wider">Tổng đơn hàng</span>
              <span className="text-[#0e6877] font-bold text-sm mt-1">{formatPrice(order.totalAmount || 0)}</span>
            </div>
          </div>

          {/* Purchased Items List */}
          {Array.isArray(order.items) && order.items.length > 0 && (
            <div className="bg-[#fbf9f7] rounded-2xl p-4 border border-slate-100/60 mt-3 space-y-2">
              <p className="text-[9px] font-bold text-[#526069] uppercase tracking-wider">Sản phẩm đã mua</p>
              <div className="divide-y divide-slate-150/60">
                {order.items.map((item: any, idx: number) => {
                  let imgUrl = '';
                  try {
                    const parsed = typeof item.product?.images === 'string' ? JSON.parse(item.product.images) : item.product?.images;
                    imgUrl = Array.isArray(parsed) ? parsed[0] : parsed;
                  } catch {
                    imgUrl = item.product?.image;
                  }
                  return (
                    <div key={idx} className="flex justify-between items-center py-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        {imgUrl ? (
                          <img src={imgUrl} alt={item.product?.name} className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
                        ) : (
                          <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 font-bold text-[10px]">SP</div>
                        )}
                        <div>
                          <p className="font-bold text-[#1b1c1b]">{item.product?.name || 'Sản phẩm không tên'}</p>
                          <p className="text-[10px] text-[#526069] font-medium mt-0.5">
                            Size: {item.size || 'DEFAULT'} • Đơn giá: {formatPrice(item.price || 0)}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-[#0e6877] bg-[#ecf6f7] border border-[#0e6877]/10 px-2.5 py-0.5 rounded-full">
                        x{item.quantity || 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
              <div className="flex gap-2">
                <button onClick={() => openDrawerForEdit(v)} className="p-1.5 bg-slate-50 hover:bg-[#ecf6f7] text-[#526069] hover:text-[#0e6877] border border-slate-200 rounded-lg transition-colors"><Edit3 size={12} /></button>
                <button onClick={() => handleDeleteRecord(v.id)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors"><Trash2 size={12} /></button>
              </div>
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
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={() => openDrawerForEdit(banner)} className="p-2 bg-white/90 hover:bg-white text-[#0e6877] rounded-xl transition-colors shadow-lg"><Edit3 size={13} /></button>
              <button onClick={() => handleDeleteRecord(banner.id)} className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors shadow-lg"><Trash2 size={13} /></button>
            </div>
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
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-[#1b1c1b] text-sm truncate">{user.name}</h4>
              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider ${user.role === 'admin' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-slate-600 bg-slate-50 border border-slate-200'
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

  const renderProductVariantView = () => {
    // Group variants by productId
    const groupedVariants = filteredRecords.reduce((acc, variant) => {
      const productId = variant.productId;
      if (!acc[productId]) {
        acc[productId] = [];
      }
      acc[productId].push(variant);
      return acc;
    }, {} as Record<number, any[]>);

    return (
      <div className="space-y-6">
        {Object.entries(groupedVariants).map(([productId, variants]) => {
          const variantArray = variants as any[];
          return (
            <div key={productId} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              {/* Product Header */}
              <div className="bg-[#fbf9f7] px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#ecf6f7] rounded-xl">
                    <PackageSearch size={18} className="text-[#0e6877]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1b1c1b]">Sản phẩm ID: {productId}</h3>
                    <p className="text-[10px] text-[#526069] font-medium">{variantArray.length} biến thể</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${variantArray.every((v: any) => (v.stock || 0) > 10) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      variantArray.some((v: any) => (v.stock || 0) > 0) ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                    Tổng tồn: {variantArray.reduce((sum: number, v: any) => sum + (v.stock || 0), 0)}
                  </span>
                </div>
              </div>

              {/* Variants Grid */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {variantArray.map((variant) => (
                    <div
                      key={variant.id}
                      className={`border rounded-2xl p-4 transition-all hover:shadow-md ${(variant.stock || 0) === 0 ? 'border-rose-200 bg-rose-50/30' :
                          (variant.stock || 0) < 10 ? 'border-amber-200 bg-amber-50/30' :
                            'border-slate-200 bg-white'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            ID: {variant.id}
                          </span>
                          {(variant.stock || 0) === 0 && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                              Hết hàng
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openDrawerForEdit(variant)}
                            className="p-1.5 bg-slate-50 hover:bg-[#ecf6f7] text-slate-500 hover:text-[#0e6877] rounded-lg transition-colors"
                            title="Sửa"
                          >
                            <Edit3 size={11} />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(variant.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Variant Details */}
                      <div className="space-y-2">
                        {variant.size && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-medium uppercase">Size:</span>
                            <span className="text-[11px] font-semibold text-[#1b1c1b] bg-slate-100 px-2 py-0.5 rounded">{variant.size}</span>
                          </div>
                        )}
                        {variant.color && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-medium uppercase">Màu:</span>
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-4 h-4 rounded-full border border-slate-300"
                                style={{ backgroundColor: variant.color }}
                              />
                              <span className="text-[11px] font-semibold text-[#1b1c1b]">{variant.color}</span>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                          <div>
                            <span className="text-[10px] text-slate-500 font-medium uppercase block">Tồn kho:</span>
                            <span className={`text-sm font-bold ${(variant.stock || 0) > 10 ? 'text-emerald-600' :
                                (variant.stock || 0) > 0 ? 'text-amber-600' :
                                  'text-rose-600'
                              }`}>
                              {variant.stock || 0}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 font-medium uppercase block">Giá:</span>
                            <span className="text-sm font-bold text-[#0e6877]">{formatPrice(variant.price || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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

  // Generic table for ProductVariant, Category, etc. - WITH edit button opening drawer
  const renderDefaultTableView = () => {
    const excludedColumns = ['description', 'images', 'link', 'createdAt', 'updatedAt', 'materialCare', 'shippingReturn', 'avatar'];
    const simpleColumns = columns.filter(col => !excludedColumns.includes(col));

    return (
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 whitespace-nowrap">
            <thead className="bg-[#fbf9f7] text-[#526069] text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 bg-[#fbf9f7] border-b border-slate-200 w-10">
                  <button
                    onClick={toggleSelectAll}
                    className="text-slate-500 hover:text-[#0e6877] transition-colors"
                  >
                    {selectedRecords.size === filteredRecords.length && filteredRecords.length > 0 ? (
                      <CheckSquare size={14} className="text-[#0e6877]" />
                    ) : (
                      <Square size={14} />
                    )}
                  </button>
                </th>
                {simpleColumns.map((col) => (
                  <th key={col} className="py-3.5 px-4 bg-[#fbf9f7] border-b border-slate-200">{col}</th>
                ))}
                <th className="py-3.5 px-4 bg-[#fbf9f7] border-b border-slate-200 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {filteredRecords.map((record) => {
                const recordId = record.id || record.zaloId || record.code;
                const isSelected = selectedRecords.has(recordId);
                return (
                  <tr
                    key={recordId}
                    className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-[#ecf6f7]/30' : ''}`}
                  >
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => toggleRecordSelection(recordId)}
                        className="text-slate-500 hover:text-[#0e6877] transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare size={14} className="text-[#0e6877]" />
                        ) : (
                          <Square size={14} />
                        )}
                      </button>
                    </td>
                    {simpleColumns.map((col) => {
                      const val = record[col];
                      let displayVal = String(val ?? 'NULL');
                      if (typeof val === 'boolean') displayVal = val ? 'TRUE' : 'FALSE';
                      return (
                        <td key={col} className="py-3.5 px-4 max-w-xs truncate text-[#1b1c1b] font-medium" title={displayVal}>
                          {displayVal}
                        </td>
                      );
                    })}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openDrawerForEdit(record)}
                          className="p-1.5 bg-slate-50 hover:bg-[#ecf6f7] text-[#526069] hover:text-[#0e6877] border border-slate-200 rounded-lg transition-colors"
                          title="Sửa"
                        >
                          <Edit3 size={11} />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(recordId)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
      case 'ProductVariant': return renderProductVariantView();
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
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-bold text-[#1b1c1b] tracking-tight">Bảng: {modelName}</h2>
              <span className="px-2.5 py-0.5 text-xs font-bold text-[#0e6877] bg-[#ecf6f7] border border-[#0e6877]/10 rounded-full">
                {records.length} bản ghi
              </span>
            </div>
            <p className="text-[#526069] text-sm mt-1">
              Quản lý và chỉnh sửa cơ sở dữ liệu trực tiếp
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => openDrawerForAdd()}
            className="bg-[#0e6877] hover:bg-[#0a4c57] text-white font-semibold py-2.5 px-5 rounded-xl text-sm flex items-center gap-2 transition-all duration-200 shadow-md shadow-[#0e6877]/10"
          >
            <Plus size={16} />
            <span>Thêm bản ghi mới</span>
          </button>
        </div>
      </div>


      {/* Filter and Search */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder={`Tìm kiếm trong bảng ${modelName}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#fbf9f7] border border-slate-200 focus:border-[#0e6877] focus:ring-1 focus:ring-[#0e6877] rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#1b1c1b] placeholder-slate-400 focus:outline-none transition-all"
            />
          </div>
          <button
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${isFilterPanelOpen || Object.keys(columnFilters).length > 0
                ? 'bg-[#0e6877] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
          >
            <Filter size={14} />
            Bộ lọc nâng cao
            {Object.keys(columnFilters).length > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
                {Object.keys(columnFilters).length}
              </span>
            )}
          </button>
        </div>

        {/* Advanced Filter Panel */}
        {isFilterPanelOpen && (
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-[#526069]">Lọc theo cột</p>
              {Object.keys(columnFilters).length > 0 && (
                <button
                  onClick={clearColumnFilters}
                  className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                >
                  <CloseIcon size={10} /> Xóa tất cả bộ lọc
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {columns.filter(col => col !== 'id' && col !== 'createdAt' && col !== 'updatedAt').slice(0, 8).map((col) => (
                <div key={col}>
                  <label className="text-[10px] font-semibold text-slate-500 mb-1 block">{col}</label>
                  <input
                    type="text"
                    placeholder={`Nhập ${col}...`}
                    value={columnFilters[col] || ''}
                    onChange={(e) => setColumnFilters(prev => ({ ...prev, [col]: e.target.value }))}
                    className="w-full bg-[#fbf9f7] border border-slate-200 rounded-lg py-2 px-3 text-xs text-[#1b1c1b] placeholder-slate-400 focus:outline-none focus:border-[#0e6877] transition-all"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedRecords.size > 0 && (
          <div className="bg-[#ecf6f7] border border-[#0e6877]/20 rounded-xl p-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-[#0e6877]">
              Đã chọn {selectedRecords.size} bản ghi
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedRecords(new Set())}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Bỏ chọn
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-semibold hover:bg-rose-600 transition-all flex items-center gap-1"
              >
                <Trash2 size={12} /> Xóa đã chọn
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Data Layout */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#526069] text-xs">Đang tải cấu trúc dữ liệu...</p>
        </div>
      ) : (
        getBespokeLayout()
      )}

      {/* ══════════════════════════════════════════════
          RIGHT-SIDE DRAWER PANEL
          ══════════════════════════════════════════════ */}
      {isDrawerOpen && (
        <>
          {/* Right-side Drawer Panel */}
          <div
            className="fixed z-50 right-0 top-0 h-full w-full max-w-md animate-slideInRight"
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Glass card */}
            <div
              className="rounded-3xl overflow-hidden flex flex-col"
              style={{
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.7)',
                boxShadow: '0 32px 80px rgba(14,104,119,0.18), 0 8px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
                maxHeight: '90vh',
              }}
            >
              {/* Gradient Header Bar */}
              <div
                className="px-6 pt-6 pb-5 shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #0e6877 0%, #0a9bb5 60%, #14b8a6 100%)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Decorative circles */}
                <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
                <div style={{ position: 'absolute', bottom: -30, right: 40, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

                <div className="flex items-start justify-between relative">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2.5 rounded-2xl"
                      style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}
                    >
                      {editingRecord ? <Edit3 size={18} color="white" /> : <Plus size={18} color="white" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white leading-tight">
                        {editingRecord ? 'Chỉnh sửa bản ghi' : 'Thêm bản ghi mới'}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Database size={10} color="rgba(255,255,255,0.6)" />
                        <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
                          {modelName}
                          {editingRecord && (
                            <>
                              <ChevronRight size={9} style={{ display: 'inline', marginInline: 2 }} />
                              <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>
                                {String(editingRecord.id || editingRecord.zaloId || editingRecord.code || '').slice(-8)}
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={closeDrawer}
                    className="p-2 rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                  >
                    <X size={16} color="white" />
                  </button>
                </div>
              </div>

              {/* Error banner */}
              {error && (
                <div className="mx-6 mt-4 shrink-0">
                  <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl flex items-start gap-2.5">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Form - scrollable */}
              <form onSubmit={handleSubmit} className="flex flex-col min-h-0" style={{ flex: 1, overflow: 'hidden' }}>
                <div className="overflow-y-auto px-6 py-5 space-y-4" style={{ flex: 1 }}>
                  {Object.keys(formData).map((key, idx) => {
                    const sampleVal = records[0]?.[key];
                    const isLongText = ['description', 'content', 'materialCare', 'shippingReturn'].includes(key);
                    const fieldErrorsList = fieldErrors[key] || [];
                    const apiOrigin = (import.meta.env.VITE_API_BASE_URL || 'https://zalo-mini-app-shopquiet.onrender.com/api/v1').replace('/api/v1', '');
                    
                    return (
                      <div key={key} className="space-y-1.5">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-[#526069] uppercase tracking-widest">
                          <span
                            className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-black text-white"
                            style={{ background: 'linear-gradient(135deg, #0e6877, #0a9bb5)', flexShrink: 0 }}
                          >
                            {idx + 1}
                          </span>
                          {key}
                          {fieldErrorsList.length > 0 && (
                            <span className="text-rose-500 text-[9px]">*</span>
                          )}
                        </label>

                        {['image', 'imageUrl', 'images'].includes(key) ? (
                          <div className="space-y-2 text-left">
                            <div className="flex flex-wrap gap-2">
                              {(() => {
                                let urls: string[] = [];
                                if (key === 'images') {
                                  try {
                                    const parsed = JSON.parse(formData[key] || '[]');
                                    if (Array.isArray(parsed)) urls = parsed;
                                  } catch {}
                                } else if (formData[key]) {
                                  urls = [formData[key]];
                                }
                                return urls.map((url, uIdx) => (
                                  <div key={uIdx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group">
                                    <img src={url.startsWith('/') ? `${apiOrigin}${url}` : url} className="w-full h-full object-cover" alt="Preview" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (key === 'images') {
                                          const filtered = urls.filter((_, idx) => idx !== uIdx);
                                          handleFieldChange(key, JSON.stringify(filtered));
                                        } else {
                                          handleFieldChange(key, '');
                                        }
                                      }}
                                      className="absolute inset-0 bg-black/45 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ));
                              })()}
                            </div>
                            
                            <label className="border-2 border-dashed border-slate-200 hover:border-[#0e6877]/40 rounded-2xl bg-[#f8fafc] p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors relative">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleFileUpload(key, e.target.files[0]);
                                  }
                                }}
                              />
                              {uploadingField === key ? (
                                <>
                                  <div className="w-5 h-5 border-2 border-[#0e6877] border-t-transparent rounded-full animate-spin"></div>
                                  <span className="text-[10px] text-slate-500 font-medium mt-1">Đang tải lên...</span>
                                </>
                              ) : (
                                <>
                                  <Plus size={16} className="text-[#0e6877]" />
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tải ảnh mới lên</span>
                                  <span className="text-[8px] text-slate-400">Hỗ trợ định dạng PNG, JPG, WEBP</span>
                                </>
                              )}
                            </label>
                            <input
                              type="text"
                              value={formData[key] || ''}
                              onChange={(e) => handleFieldChange(key, e.target.value)}
                              placeholder="Hoặc nhập URL hình ảnh trực tiếp..."
                              className="w-full rounded-2xl py-2.5 px-4 text-[10px] text-[#1b1c1b] placeholder-slate-350 focus:outline-none border border-slate-200 mt-2 bg-[#f8fafc]"
                            />
                          </div>
                        ) : typeof sampleVal === 'boolean' ? (
                          <div className="grid grid-cols-2 gap-2">
                            {['true', 'false'].map(v => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => handleFieldChange(key, v === 'true')}
                                className="py-2 rounded-xl text-xs font-bold transition-all border"
                                style={
                                  String(formData[key]) === v
                                    ? { background: 'linear-gradient(135deg, #0e6877, #0a9bb5)', color: 'white', borderColor: 'transparent', boxShadow: '0 4px 12px rgba(14,104,119,0.25)' }
                                    : { background: '#f8fafc', color: '#526069', borderColor: '#e2e8f0' }
                                }
                              >
                                {v === 'true' ? '✓ TRUE' : '✗ FALSE'}
                              </button>
                            ))}
                          </div>
                        ) : isLongText ? (
                          <textarea
                            rows={3}
                            value={formData[key]}
                            onChange={(e) => handleFieldChange(key, e.target.value)}
                            placeholder={`Nhập ${key}...`}
                            className={`w-full rounded-2xl py-3 px-4 text-xs text-[#1b1c1b] placeholder-slate-300 resize-none focus:outline-none transition-all ${fieldErrorsList.length > 0 ? 'border-rose-400' : ''
                              }`}
                            style={{
                              background: '#f8fafc',
                              border: '1.5px solid #e2e8f0',
                              transition: 'border-color 0.2s, box-shadow 0.2s',
                            }}
                            onFocus={e => {
                              e.target.style.borderColor = fieldErrorsList.length > 0 ? '#f87171' : '#0e6877';
                              e.target.style.boxShadow = fieldErrorsList.length > 0 ? '0 0 0 3px rgba(248,113,113,0.08)' : '0 0 0 3px rgba(14,104,119,0.08)';
                            }}
                            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                          />
                        ) : typeof sampleVal === 'number' ? (
                          <input
                            type="number"
                            required
                            value={formData[key]}
                            onChange={(e) => handleFieldChange(key, e.target.value)}
                            className={`w-full rounded-2xl py-3 px-4 text-xs text-[#1b1c1b] focus:outline-none transition-all ${fieldErrorsList.length > 0 ? 'border-rose-400' : ''
                              }`}
                            style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
                            onFocus={e => {
                              e.target.style.borderColor = fieldErrorsList.length > 0 ? '#f87171' : '#0e6877';
                              e.target.style.boxShadow = fieldErrorsList.length > 0 ? '0 0 0 3px rgba(248,113,113,0.08)' : '0 0 0 3px rgba(14,104,119,0.08)';
                            }}
                            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                          />
                        ) : (
                          <input
                            type="text"
                            value={formData[key]}
                            onChange={(e) => handleFieldChange(key, e.target.value)}
                            placeholder={`Nhập ${key}...`}
                            className={`w-full rounded-2xl py-3 px-4 text-xs text-[#1b1c1b] placeholder-slate-300 focus:outline-none transition-all ${fieldErrorsList.length > 0 ? 'border-rose-400' : ''
                              }`}
                            style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
                            onFocus={e => {
                              e.target.style.borderColor = fieldErrorsList.length > 0 ? '#f87171' : '#0e6877';
                              e.target.style.boxShadow = fieldErrorsList.length > 0 ? '0 0 0 3px rgba(248,113,113,0.08)' : '0 0 0 3px rgba(14,104,119,0.08)';
                            }}
                            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                          />
                        )}
                        {fieldErrorsList.length > 0 && (
                          <div className="flex items-start gap-1.5 mt-1">
                            <AlertCircle size={10} className="text-rose-500 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              {fieldErrorsList.map((error, errorIdx) => (
                                <p key={errorIdx} className="text-[10px] text-rose-600">{error}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer actions */}
                <div className="shrink-0 px-6 pb-6 pt-4 flex gap-3" style={{ borderTop: '1px solid rgba(14,104,119,0.08)' }}>
                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="flex-1 py-3 rounded-2xl text-xs font-bold text-[#526069] transition-all"
                    style={{ background: '#f1f5f9', border: '1.5px solid #e2e8f0' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#e2e8f0')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#f1f5f9')}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #0e6877 0%, #0a9bb5 100%)',
                      boxShadow: '0 8px 20px rgba(14,104,119,0.30)',
                      border: 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 12px 28px rgba(14,104,119,0.40)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 8px 20px rgba(14,104,119,0.30)')}
                  >
                    <Save size={14} />
                    {editingRecord ? 'Cập nhật' : 'Lưu mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

