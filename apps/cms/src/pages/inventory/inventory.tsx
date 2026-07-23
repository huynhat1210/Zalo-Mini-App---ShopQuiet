import React, { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '../../utils/api';
import { useToast } from '../../contexts';
import {
  Package,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Search,
  RefreshCw,
  Save,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface ProductVariant {
  id: number;
  productId: number;
  color: string;
  size: string;
  stock: number;
  product?: {
    id: number;
    name: string;
    images: string;
    category?: { name: string };
  };
}

interface Product {
  id: number;
  name: string;
  images: string;
  categoryId: number;
  category?: { id: number; name: string };
  variants: ProductVariant[];
}

export const Inventory: React.FC = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [stockInputs, setStockInputs] = useState<Record<number, number>>({});

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Limit rows per page

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<any>('/products?page=1&limit=200');
      const productList: Product[] = Array.isArray(res) ? res : res?.data || [];
      setProducts(productList);

      // Initialize local stock inputs
      const map: Record<number, number> = {};
      productList.forEach((p) => {
        p.variants?.forEach((v) => {
          map[v.id] = v.stock;
        });
      });
      setStockInputs(map);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const allVariants = useMemo(() => {
    const list: (ProductVariant & { productName: string; categoryName: string; image: string })[] = [];
    products.forEach((p) => {
      let image = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200';
      try {
        const parsed = JSON.parse(p.images);
        if (Array.isArray(parsed) && parsed[0]) image = parsed[0];
      } catch (e) {
        if (typeof p.images === 'string' && p.images.startsWith('http')) image = p.images;
      }

      if (p.variants && p.variants.length > 0) {
        p.variants.forEach((v) => {
          list.push({
            ...v,
            productName: p.name,
            categoryName: p.category?.name || 'Mặc định',
            image,
          });
        });
      } else {
        list.push({
          id: p.id * 1000,
          productId: p.id,
          color: 'DEFAULT',
          size: 'DEFAULT',
          stock: 10,
          productName: p.name,
          categoryName: p.category?.name || 'Mặc định',
          image,
        });
      }
    });
    return list;
  }, [products]);

  const filteredVariants = useMemo(() => {
    return allVariants.filter((v) => {
      const matchSearch =
        v.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.size.toLowerCase().includes(searchTerm.toLowerCase());

      const currentStock = stockInputs[v.id] ?? v.stock;

      let matchStatus = true;
      if (filterStatus === 'LOW') matchStatus = currentStock > 0 && currentStock < 5;
      if (filterStatus === 'OUT') matchStatus = currentStock === 0;

      return matchSearch && matchStatus;
    });
  }, [allVariants, searchTerm, filterStatus, stockInputs]);

  // Pagination Calculation
  const totalPages = Math.max(1, Math.ceil(filteredVariants.length / itemsPerPage));
  const paginatedVariants = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredVariants.slice(start, start + itemsPerPage);
  }, [filteredVariants, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const stats = useMemo(() => {
    let totalStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    allVariants.forEach((v) => {
      const current = stockInputs[v.id] ?? v.stock;
      totalStock += current;
      if (current === 0) outOfStock++;
      else if (current < 5) lowStock++;
    });

    return { totalStock, lowStock, outOfStock, totalVariants: allVariants.length };
  }, [allVariants, stockInputs]);

  const handleStockChange = (variantId: number, val: number) => {
    setStockInputs((prev) => ({ ...prev, [variantId]: Math.max(0, val) }));
  };

  const handleSaveStock = async (variantId: number) => {
    const newStock = stockInputs[variantId];
    if (newStock === undefined) return;

    try {
      setUpdatingId(variantId);
      await apiRequest(`/products/variants/${variantId}`, 'PATCH', { stock: newStock });
      toastSuccess('Cập nhật thành công', `Tồn kho mới: ${newStock} sản phẩm.`);
      fetchInventory();
    } catch (err: any) {
      toastError('Cập nhật thất bại', err.message || 'Lỗi khi lưu kho.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Save All Changes Button
  const modifiedVariantIds = useMemo(() => {
    return allVariants
      .filter((v) => stockInputs[v.id] !== undefined && stockInputs[v.id] !== v.stock)
      .map((v) => v.id);
  }, [allVariants, stockInputs]);

  const handleSaveAllInventory = async () => {
    if (modifiedVariantIds.length === 0) {
      toastSuccess('Thông báo', 'Không có thay đổi tồn kho nào cần lưu.');
      return;
    }

    try {
      setSavingAll(true);
      const updatePromises = modifiedVariantIds.map((vId) =>
        apiRequest(`/products/variants/${vId}`, 'PATCH', { stock: stockInputs[vId] }).catch((e) =>
          console.error(`Failed variant #${vId}:`, e),
        ),
      );
      await Promise.all(updatePromises);
      await fetchInventory();
      toastSuccess('Lưu thành công', `Đã cập nhật tồn kho cho tất cả ${modifiedVariantIds.length} phân loại!`);
    } catch (err: any) {
      toastError('Lỗi cập nhật', err.message || 'Không thể lưu tồn kho.');
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-[#1b1c1b] pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">📊 Quản Lý Tồn Kho & Sản Phẩm</h1>
          <p className="text-slate-500 text-xs mt-1">Cập nhật số lượng tồn kho từng màu sắc/size và lưu tất cả trong 1 click</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveAllInventory}
            disabled={savingAll || modifiedVariantIds.length === 0}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border-none cursor-pointer shadow-xs active:scale-95 ${
              modifiedVariantIds.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save size={15} className={savingAll ? 'animate-spin' : ''} />
            {savingAll ? 'Đang lưu...' : '💾 Lưu Tất Cả Tồn Kho'}
            {modifiedVariantIds.length > 0 && (
              <span className="bg-white text-emerald-700 px-1.5 py-0.5 rounded-full text-[10px] font-black">
                {modifiedVariantIds.length}
              </span>
            )}
          </button>

          <button
            onClick={fetchInventory}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border-none cursor-pointer"
            title="Làm mới ma trận"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
          <div className="bg-teal-50 text-[#0e6877] p-2.5 rounded-xl"><Package size={20} /></div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase">Tổng Số Phân Loại</p>
            <p className="text-lg font-black text-slate-800">{stats.totalVariants}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
          <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl"><CheckCircle size={20} /></div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase">Tổng Tồn Kho</p>
            <p className="text-lg font-black text-emerald-600">{stats.totalStock}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
          <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl"><AlertTriangle size={20} /></div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase">Sắp Hết Hàng (&lt; 5)</p>
            <p className="text-lg font-black text-amber-600">{stats.lowStock}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
          <div className="bg-rose-50 text-rose-600 p-2.5 rounded-xl"><XCircle size={20} /></div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase">Đã Hết Hàng (0)</p>
            <p className="text-lg font-black text-rose-600">{stats.outOfStock}</p>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên sản phẩm, màu sắc, size..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#0e6877] rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            {(['ALL', 'LOW', 'OUT'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border-none cursor-pointer ${
                  filterStatus === st ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st === 'ALL' ? 'Tất cả' : st === 'LOW' ? '⚠️ Sắp hết (< 5)' : '❌ Đã hết (0)'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-xs">Đang tải ma trận kho hàng...</p>
          </div>
        ) : paginatedVariants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 min-w-[650px]">
              <thead className="bg-[#fbf9f7] text-[#526069] text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 rounded-l-xl">Sản phẩm</th>
                  <th className="py-3.5 px-4">Phân loại</th>
                  <th className="py-3.5 px-4">Kích thước (Size)</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái kho</th>
                  <th className="py-3.5 px-4 text-center">Số lượng tồn kho</th>
                  <th className="py-3.5 px-4 text-right rounded-r-xl">Cập nhật</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedVariants.map((v) => {
                  const currentStock = stockInputs[v.id] ?? v.stock;
                  const isModified = currentStock !== v.stock;
                  const isLow = currentStock > 0 && currentStock < 5;
                  const isOut = currentStock === 0;

                  return (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold">
                        <div className="flex items-center gap-3">
                          <img src={v.image} alt={v.productName} className="w-9 h-9 object-cover rounded-lg border border-slate-200" />
                          <div>
                            <p className="text-xs font-bold text-slate-800">{v.productName}</p>
                            <span className="text-[10px] text-slate-400 font-normal">{v.categoryName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                        {v.color === 'DEFAULT' ? 'Mặc định' : v.color}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-[#0e6877]">
                        {v.size === 'DEFAULT' ? 'Mặc định' : v.size}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isOut ? (
                          <span className="px-2.5 py-1 text-[10px] font-extrabold text-rose-600 bg-rose-50 rounded-full border border-rose-200">
                            Hết hàng
                          </span>
                        ) : isLow ? (
                          <span className="px-2.5 py-1 text-[10px] font-extrabold text-amber-600 bg-amber-50 rounded-full border border-amber-200">
                            Sắp hết ({currentStock})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 rounded-full border border-emerald-200">
                            Sẵn hàng
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="number"
                          min={0}
                          value={currentStock}
                          onChange={(e) => handleStockChange(v.id, parseInt(e.target.value) || 0)}
                          className={`w-20 text-center font-bold text-xs py-1.5 px-2 rounded-xl border transition-all ${
                            isModified
                              ? 'border-amber-400 bg-amber-50 text-amber-900 font-black ring-2 ring-amber-200'
                              : 'border-slate-200 bg-slate-50 text-slate-800'
                          }`}
                        />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleSaveStock(v.id)}
                          disabled={!isModified || updatingId === v.id}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border-none cursor-pointer flex items-center gap-1 ml-auto ${
                            isModified
                              ? 'bg-[#0e6877] text-white hover:bg-[#0b5460] shadow-xs active:scale-95'
                              : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          <Save size={13} />
                          {updatingId === v.id ? 'Lưu...' : 'Lưu kho'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400 text-sm">Không có biến thể tồn kho phù hợp với bộ lọc.</div>
        )}

        {/* Pagination Bar */}
        {!loading && filteredVariants.length > 0 && (
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
            <span className="text-slate-500 font-medium">
              Hiển thị <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> -{' '}
              <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredVariants.length)}</strong> trên tổng số{' '}
              <strong className="text-[#0e6877]">{filteredVariants.length}</strong> phân loại
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={14} /> Trước
              </button>

              <span className="px-3 py-1.5 bg-[#0e6877] text-white font-extrabold rounded-xl shadow-2xs">
                Trang {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                Sau <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
