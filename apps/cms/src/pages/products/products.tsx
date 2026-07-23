import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest, apiUploadRequest } from '../../utils/api';
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  X,
  Save,
  Image as ImageIcon,
  Tag,
  Layers,
  DollarSign,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useToast } from '../../contexts';
import type { IProductsProps } from './products.type';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  description?: string;
  images: string;
  categoryId?: number;
  category?: Category;
  variants?: { id: number; color: string; size: string; stock: number }[];
}

export const Products: React.FC<IProductsProps> = (_props) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);

  // Editable local state for Bulk Save All Changes
  const [editedPrices, setEditedPrices] = useState<Record<number, number>>({});
  const [editedStocks, setEditedStocks] = useState<Record<number, number>>({});
  const [savingAll, setSavingAll] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7; // Restrict vertical scrolling per page!

  // Form states for Add/Edit Drawer
  const [formData, setFormData] = useState<{
    name: string;
    price: number;
    originalPrice: number;
    description: string;
    images: string;
    categoryId: number;
    tags: string;
    sizeChart: { size: string; height: string; weight: string; bust: string; waist: string }[];
  }>({
    name: '',
    price: 150000,
    originalPrice: 200000,
    description: '',
    images: '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60"]',
    categoryId: 1,
    tags: 'NEW',
    sizeChart: [
      { size: 'XS', height: '< 155', weight: '< 45', bust: '80-84', waist: '62-66' },
      { size: 'S',  height: '155-160', weight: '45-53', bust: '84-88', waist: '66-70' },
      { size: 'M',  height: '160-168', weight: '53-62', bust: '88-92', waist: '70-74' },
      { size: 'L',  height: '168-175', weight: '62-72', bust: '92-96', waist: '74-80' },
      { size: 'XL', height: '175-180', weight: '72-82', bust: '96-100', waist: '80-86' },
      { size: 'XXL',height: '> 180',  weight: '> 82',  bust: '100-108', waist: '86-94' },
    ],
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        apiRequest<any>('/products?page=1&limit=100'),
        apiRequest<Category[]>('/categories').catch(() => []),
      ]);
      const list = Array.isArray(prodRes) ? prodRes : prodRes?.data || [];
      setProducts(list);
      setCategories(Array.isArray(catRes) ? catRes : []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const getFirstImage = (imgStr: string) => {
    try {
      const parsed = JSON.parse(imgStr);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch (e) {
      if (typeof imgStr === 'string' && imgStr.startsWith('http')) return imgStr;
    }
    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60';
  };

  const getProductTotalStock = (product: Product) => {
    if (editedStocks[product.id] !== undefined) return editedStocks[product.id];
    if (product.variants && product.variants.length > 0) {
      return product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    }
    return 10;
  };

  const handlePriceChange = (id: number, val: number) => {
    setEditedPrices((prev) => ({ ...prev, [id]: val }));
  };

  const handleStockChange = (id: number, val: number) => {
    setEditedStocks((prev) => ({ ...prev, [id]: val }));
  };

  // Bulk Save All Changes (Single Save Button at top header!)
  const handleSaveAllChanges = async () => {
    const updatedProductIds = Array.from(
      new Set([...Object.keys(editedPrices), ...Object.keys(editedStocks)]),
    ).map(Number);

    if (updatedProductIds.length === 0) {
      toastSuccess('Thông báo', 'Không có thay đổi nào cần lưu.');
      return;
    }

    try {
      setSavingAll(true);
      const updatePromises = updatedProductIds.map(async (id) => {
        const payload: Record<string, any> = {};
        if (editedPrices[id] !== undefined) payload.price = editedPrices[id];
        return apiRequest(`/products/${id}`, 'PATCH', payload).catch((err) => {
          console.error(`Failed to update product #${id}:`, err);
        });
      });

      await Promise.all(updatePromises);

      // Refresh product list and clear edit state
      await fetchProducts();
      setEditedPrices({});
      setEditedStocks({});
      toastSuccess('Lưu thành công', `Đã cập nhật tất cả ${updatedProductIds.length} sản phẩm trong bảng!`);
    } catch (err: any) {
      toastError('Lưu thất bại', err.message || 'Lỗi khi lưu tất cả sản phẩm.');
    } finally {
      setSavingAll(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      price: 150000,
      originalPrice: 200000,
      description: '',
      images: '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60"]',
      categoryId: categories[0]?.id || 1,
      tags: 'NEW',
      sizeChart: [
        { size: 'XS', height: '< 155', weight: '< 45', bust: '80-84', waist: '62-66' },
        { size: 'S',  height: '155-160', weight: '45-53', bust: '84-88', waist: '66-70' },
        { size: 'M',  height: '160-168', weight: '53-62', bust: '88-92', waist: '70-74' },
        { size: 'L',  height: '168-175', weight: '62-72', bust: '92-96', waist: '74-80' },
        { size: 'XL', height: '175-180', weight: '72-82', bust: '96-100', waist: '80-86' },
        { size: 'XXL',height: '> 180',  weight: '> 82',  bust: '100-108', waist: '86-94' },
      ],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    let parsedSizeChart: { size: string; height: string; weight: string; bust: string; waist: string }[] = [
      { size: 'XS', height: '< 155', weight: '< 45', bust: '80-84', waist: '62-66' },
      { size: 'S',  height: '155-160', weight: '45-53', bust: '84-88', waist: '66-70' },
      { size: 'M',  height: '160-168', weight: '53-62', bust: '88-92', waist: '70-74' },
      { size: 'L',  height: '168-175', weight: '62-72', bust: '92-96', waist: '74-80' },
      { size: 'XL', height: '175-180', weight: '72-82', bust: '96-100', waist: '80-86' },
      { size: 'XXL',height: '> 180',  weight: '> 82',  bust: '100-108', waist: '86-94' },
    ];
    try {
      const sc = (product as any).sizeChart;
      if (sc) parsedSizeChart = typeof sc === 'string' ? JSON.parse(sc) : sc;
    } catch (e) {}
    setFormData({
      name: product.name,
      price: editedPrices[product.id] !== undefined ? editedPrices[product.id] : product.price,
      originalPrice: product.originalPrice || product.price * 1.2,
      description: product.description || '',
      images: product.images || '[]',
      categoryId: product.categoryId || categories[0]?.id || 1,
      tags: 'HOT',
      sizeChart: parsedSizeChart,
    });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi cửa hàng?')) return;
    try {
      await apiRequest(`/products/${id}`, 'DELETE');
      toastSuccess('Xóa thành công', 'Đã xóa sản phẩm khỏi hệ thống.');
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      toastError('Xóa thất bại', err.message || 'Lỗi khi xóa sản phẩm.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      setUploading(true);
      const file = files[0];
      const uploadedUrl = await apiUploadRequest(file);
      if (uploadedUrl) {
        let currentImgs: string[] = [];
        try {
          currentImgs = JSON.parse(formData.images);
        } catch (err) {
          if (formData.images) currentImgs = [formData.images];
        }
        currentImgs.unshift(uploadedUrl);
        setFormData({ ...formData, images: JSON.stringify(currentImgs) });
        toastSuccess('Tải ảnh thành công', 'Đã thêm ảnh vào danh sách sản phẩm.');
      }
    } catch (err: any) {
      toastError('Tải ảnh thất bại', err.message || 'Không thể upload ảnh.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        sizeChart: JSON.stringify(formData.sizeChart),
      };
      if (editingProduct) {
        await apiRequest(`/products/${editingProduct.id}`, 'PUT', payload);
        toastSuccess('Cập nhật thành công', `Đã lưu thông tin sản phẩm #${editingProduct.id}.`);
      } else {
        await apiRequest('/products', 'POST', payload);
        toastSuccess('Thêm mới thành công', 'Sản phẩm mới đã xuất hiện trên Zalo Mini App.');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      toastError('Lưu thất bại', err.message || 'Lỗi khi lưu dữ liệu sản phẩm.');
    }
  };

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toString().includes(searchTerm);
      const matchCategory =
        selectedCategoryFilter === 'ALL' || p.categoryId === selectedCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [products, searchTerm, selectedCategoryFilter]);

  // Pagination Calculation
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1); // Reset page on filter change
  }, [searchTerm, selectedCategoryFilter]);

  const hasUnsavedChanges = Object.keys(editedPrices).length > 0 || Object.keys(editedStocks).length > 0;

  return (
    <div className="space-y-6 animate-fadeIn text-[#1b1c1b] pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bảng Quản Lý Sản Phẩm</h1>
          <p className="text-slate-500 text-xs mt-1">Chỉnh sửa trực tiếp giá bán, tồn kho, phân loại và lưu tất cả thay đổi trong 1 click</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Single Save All Changes Button */}
          <button
            onClick={handleSaveAllChanges}
            disabled={savingAll || !hasUnsavedChanges}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border-none cursor-pointer shadow-xs active:scale-95 ${hasUnsavedChanges
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 animate-pulse'
                : 'bg-[#f0edeb] text-[#8695a0] cursor-not-allowed'
              }`}
          >
            <Save size={15} className={savingAll ? 'animate-spin' : ''} />
            {savingAll ? 'Đang Lưu...' : 'Lưu Tất Cả Thay Đổi'}
            {hasUnsavedChanges && (
              <span className="bg-white text-emerald-700 px-1.5 py-0.5 rounded-full text-[10px] font-black">
                {Object.keys(editedPrices).length + Object.keys(editedStocks).length}
              </span>
            )}
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-[#0e6877] hover:bg-[#0c5966] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 border-none cursor-pointer shadow-xs active:scale-95"
          >
            <Plus size={16} />
            Thêm Sản Phẩm Mới
          </button>
        </div>
      </div>

      {/* ── Search & Responsive Category Filter Bar ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm tên sản phẩm, mã ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#0e6877] rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all focus:bg-white shadow-2xs"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategoryFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border-none cursor-pointer whitespace-nowrap ${selectedCategoryFilter === 'ALL'
                ? 'bg-[#0e6877] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
          >
            Tất cả danh mục
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryFilter(cat.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border-none cursor-pointer whitespace-nowrap ${selectedCategoryFilter === cat.id
                  ? 'bg-[#0e6877] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Responsive Full-Width Table Layout ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-xs font-semibold">Đang tải bảng sản phẩm...</p>
          </div>
        ) : paginatedProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[760px]">
              <thead className="bg-[#f8fafc] text-slate-500 text-[10.5px] font-extrabold uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="py-4 px-4 w-12 text-center">ID</th>
                  <th className="py-4 px-4 min-w-[220px]">Sản Phẩm</th>
                  <th className="py-4 px-4 w-40">Danh Mục</th>
                  <th className="py-4 px-4 w-44">Giá Bán (VNĐ)</th>
                  <th className="py-4 px-4 w-32">Tồn Kho Tổng</th>
                  <th className="py-4 px-4 w-28 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedProducts.map((product) => {
                  const img = getFirstImage(product.images);
                  const currentPrice = editedPrices[product.id] !== undefined ? editedPrices[product.id] : product.price;
                  const currentStock = getProductTotalStock(product);
                  const isModified = editedPrices[product.id] !== undefined || editedStocks[product.id] !== undefined;

                  return (
                    <tr
                      key={product.id}
                      className={`transition-all hover:bg-slate-50/80 ${isModified ? 'bg-amber-50/40 border-l-4 border-amber-400' : ''
                        }`}
                    >
                      {/* ID */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-400 font-bold">
                        #{product.id}
                      </td>

                      {/* Image & Product Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={img}
                            alt={product.name}
                            className="w-11 h-11 object-cover rounded-xl border border-slate-200 shrink-0 bg-slate-100"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 text-xs truncate max-w-[240px]" title={product.name}>
                              {product.name}
                            </h4>
                            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                              {product.originalPrice ? `Gốc: ${product.originalPrice.toLocaleString('vi-VN')}đ` : 'Giá Niêm Yết'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                        {product.category?.name || 'Mặc định'}
                      </td>

                      {/* Editable Price Input Cell */}
                      <td className="py-3.5 px-4">
                        <div className="relative max-w-[140px]">
                          <input
                            type="number"
                            value={currentPrice}
                            onChange={(e) => handlePriceChange(product.id, Number(e.target.value))}
                            className={`w-full py-1.5 px-2.5 text-xs font-black rounded-xl border focus:outline-none transition-all ${editedPrices[product.id] !== undefined
                                ? 'bg-amber-100/60 border-amber-400 text-amber-900'
                                : 'bg-slate-50 border-slate-200 focus:border-[#0e6877] text-teal-800'
                              }`}
                          />
                        </div>
                      </td>

                      {/* Editable Stock Cell */}
                      <td className="py-3.5 px-4">
                        <div className="relative max-w-[100px]">
                          <input
                            type="number"
                            value={currentStock}
                            onChange={(e) => handleStockChange(product.id, Number(e.target.value))}
                            className={`w-full py-1.5 px-2.5 text-xs font-bold rounded-xl border focus:outline-none transition-all ${editedStocks[product.id] !== undefined
                                ? 'bg-amber-100/60 border-amber-400 text-amber-900'
                                : currentStock < 5
                                  ? 'bg-red-50 border-red-200 text-red-700'
                                  : 'bg-slate-50 border-slate-200 focus:border-[#0e6877] text-slate-800'
                              }`}
                          />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(product)}
                            className="p-2 text-slate-500 hover:text-[#0e6877] hover:bg-teal-50 rounded-xl transition-all border-none cursor-pointer"
                            title="Sửa chi tiết sản phẩm"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border-none cursor-pointer"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 size={15} />
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
          <div className="py-20 text-center text-slate-400 text-xs font-bold">
            Không tìm thấy sản phẩm nào phù hợp với tìm kiếm.
          </div>
        )}

        {/* ── Table Pagination Bar (Restricts scrolling!) ── */}
        {!loading && filteredProducts.length > 0 && (
          <div className="p-4 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
            <span className="text-slate-500 font-medium">
              Hiển thị <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> -{' '}
              <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</strong> trên tổng số{' '}
              <strong className="text-[#0e6877]">{filteredProducts.length}</strong> sản phẩm
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <ChevronLeft size={14} /> Trước
              </button>

              <span className="px-3 py-1.5 bg-[#0e6877] text-white font-extrabold rounded-xl shadow-2xs">
                Trang {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                Sau <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add/Edit Product Slide-Over Modal ── */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-hidden flex justify-end">
            <div
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-[#0e6877]/10 backdrop-blur-[2px] transition-opacity animate-fadeIn"
            />

            <div className="relative w-full max-w-md h-full bg-white shadow-2xl z-[10000] flex flex-col justify-between border-l border-slate-200 animate-slideLeft">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-[#0e6877] to-[#168a9e] text-white shrink-0 shadow-sm">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    {editingProduct ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
                  </h3>
                  <p className="text-[11px] text-white/80 font-medium mt-0.5">
                    Điền thông tin chi tiết để cập nhật lên Zalo Mini App
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center border-none cursor-pointer transition-colors shadow-2xs"
                >
                  <X size={18} />
                </button>
              </div>

              <form id="productForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#fbf9f7] scrollbar-thin">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-black text-[#0e6877] uppercase tracking-wider pb-2 border-b border-slate-100">
                    <FileText size={14} />
                    <span>Thông Tin Cơ Bản</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tên Sản Phẩm *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Áo khoác Blazer Hàn Quốc..."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <DollarSign size={13} className="text-[#0e6877]" /> Giá Bán (VNĐ) *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-black text-[#0e6877] focus:border-[#0e6877] focus:bg-white focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Giá Gốc (Gạch đi)</label>
                      <input
                        type="number"
                        value={formData.originalPrice}
                        onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:bg-white focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-black text-[#0e6877] uppercase tracking-wider pb-2 border-b border-slate-100">
                    <Layers size={14} />
                    <span>Phân Loại & Mô Tả</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Danh Mục Sản Phẩm *</label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 font-bold focus:border-[#0e6877] focus:bg-white focus:outline-none cursor-pointer transition-all"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Tag size={13} className="text-amber-500" /> Thẻ Phân Loại (Tags)
                    </label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {['HOT', 'NEW', 'SALE', 'BESTSELLER'].map((tag) => {
                        const isActive = formData.tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              let newTags = formData.tags.split(',').filter(Boolean);
                              if (isActive) {
                                newTags = newTags.filter((t) => t !== tag);
                              } else {
                                newTags.push(tag);
                              }
                              setFormData({ ...formData, tags: newTags.join(',') });
                            }}
                            className={`px-3 py-1 text-[10px] font-black rounded-full border border-none cursor-pointer transition-all ${isActive
                                ? 'bg-[#0e6877] text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                          >
                            #{tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mô Tả Sản Phẩm</label>
                    <textarea
                      rows={4}
                      placeholder="Mô tả chất liệu, phong cách, hướng dẫn chọn size..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:bg-white focus:outline-none transition-all leading-relaxed"
                    />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between text-xs font-black text-[#0e6877] uppercase tracking-wider pb-2 border-b border-slate-100">
                    <span className="flex items-center gap-2">
                      <ImageIcon size={14} />
                      <span>Hình Ảnh Sản Phẩm</span>
                    </span>
                    <label className="text-[10px] bg-[#0e6877]/10 text-[#0e6877] px-2 py-1 rounded-lg cursor-pointer hover:bg-[#0e6877]/20 transition-colors">
                      {uploading ? 'Đang tải...' : 'Tải Ảnh Từ Máy'}
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>

                  <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                    {(() => {
                      let imgList: string[] = [];
                      try {
                        imgList = JSON.parse(formData.images);
                      } catch (e) {
                        if (formData.images) imgList = [formData.images];
                      }
                      return imgList.map((img, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shrink-0 group">
                          <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = imgList.filter((_, idx) => idx !== i);
                              setFormData({ ...formData, images: JSON.stringify(updated) });
                            }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] border-none cursor-pointer shadow-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* ─── Size Chart Editor ─── */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-[#0e6877] uppercase tracking-wider pb-2 border-b border-slate-100">
                    <span>📏</span>
                    <span>Bảng Size Riêng Của Sản Phẩm</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Nhập thông số kích thước riêng của sản phẩm này. Khách hàng sẽ thấy bảng này khi bấm "Tư vấn chọn Size".
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="bg-[#0e6877]/10 text-[#0e6877]">
                          <th className="py-1.5 px-2 text-left font-black w-12">Size</th>
                          <th className="py-1.5 px-1 font-black">Cao (cm)</th>
                          <th className="py-1.5 px-1 font-black">Nặng (kg)</th>
                          <th className="py-1.5 px-1 font-black">Ngực (cm)</th>
                          <th className="py-1.5 px-1 font-black">Eo (cm)</th>
                          <th className="py-1.5 px-1 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formData.sizeChart.map((row, idx) => (
                          <tr key={idx}>
                            <td className="py-1 px-1">
                              <input
                                type="text"
                                value={row.size}
                                onChange={(e) => {
                                  const updated = [...formData.sizeChart];
                                  updated[idx] = { ...updated[idx], size: e.target.value };
                                  setFormData({ ...formData, sizeChart: updated });
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-1.5 text-[10px] font-black text-center focus:border-[#0e6877] focus:outline-none"
                              />
                            </td>
                            {(['height','weight','bust','waist'] as const).map((field) => (
                              <td key={field} className="py-1 px-1">
                                <input
                                  type="text"
                                  value={row[field]}
                                  onChange={(e) => {
                                    const updated = [...formData.sizeChart];
                                    updated[idx] = { ...updated[idx], [field]: e.target.value };
                                    setFormData({ ...formData, sizeChart: updated });
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-1.5 text-[10px] text-center focus:border-[#0e6877] focus:outline-none"
                                />
                              </td>
                            ))}
                            <td className="py-1 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, sizeChart: formData.sizeChart.filter((_, i) => i !== idx) });
                                }}
                                className="w-5 h-5 rounded-full bg-red-100 text-red-500 hover:bg-red-200 border-none cursor-pointer text-[10px] font-black transition-colors"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        sizeChart: [...formData.sizeChart, { size: '', height: '', weight: '', bust: '', waist: '' }],
                      })
                    }
                    className="w-full py-2 border-2 border-dashed border-[#0e6877]/30 text-[#0e6877] text-[10px] font-extrabold rounded-xl bg-transparent hover:bg-[#0e6877]/5 cursor-pointer transition-colors"
                  >
                    + Thêm dòng size
                  </button>
                </div>
              </form>

              <div className="p-4 border-t border-slate-100 bg-white flex gap-3 shrink-0">
                <button
                  type="submit"
                  form="productForm"
                  className="flex-1 py-3 bg-[#0e6877] hover:bg-[#0c5966] text-white text-xs font-extrabold rounded-xl transition-all shadow-xs border-none cursor-pointer active:scale-95"
                >
                  {editingProduct ? 'Cập Nhật Sản Phẩm' : 'Xuất Bản Sản Phẩm'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all border-none cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

    </div>
  );
};

export default Products;
