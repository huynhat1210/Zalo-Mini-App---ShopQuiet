import React, { useEffect, useState } from 'react';
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
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    price: 150000,
    originalPrice: 200000,
    description: '',
    images: '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60"]',
    categoryId: 1,
    tags: 'NEW',
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
    if (!imgStr) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60';
    try {
      const parsed = JSON.parse(imgStr);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch (e) {
      if (imgStr.startsWith('http')) return imgStr;
    }
    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60';
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
      tags: 'HOT,NEW',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice || product.price,
      description: product.description || '',
      images: product.images,
      categoryId: product.categoryId || categories[0]?.id || 1,
      tags: 'NORMAL',
    });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này không?')) return;
    try {
      await apiRequest(`/products/${id}`, 'DELETE');
      setProducts(products.filter((p) => p.id !== id));
      toastSuccess('Đã xóa sản phẩm', 'Sản phẩm đã được gỡ khỏi danh sách.');
    } catch (err: any) {
      console.error('Lỗi khi xóa sản phẩm:', err);
      toastError('Không thể xóa sản phẩm', err.message || 'Lỗi server.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await apiUploadRequest(file);
      setFormData((prev) => ({ ...prev, images: JSON.stringify([url]) }));
      toastSuccess('Tải ảnh thành công', 'Hình ảnh sản phẩm đã được cập nhật.');
    } catch (err: any) {
      toastError('Tải ảnh thất bại', err.message || 'Lỗi khi tải hình ảnh.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toastWarning('Thiếu thông tin', 'Vui lòng nhập tên sản phẩm.');
      return;
    }

    try {
      if (editingProduct) {
        await apiRequest(`/products/${editingProduct.id}`, 'PATCH', formData);
        toastSuccess('Cập nhật sản phẩm', `Sản phẩm "${formData.name}" đã được lưu.`);
      } else {
        await apiRequest('/products', 'POST', formData);
        toastSuccess('Thêm sản phẩm', `Sản phẩm "${formData.name}" đã tạo thành công.`);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      toastError('Lưu thất bại', err.message || 'Lỗi khi lưu sản phẩm.');
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedCategoryFilter !== 'ALL' && p.categoryId !== selectedCategoryFilter) return false;
    return true;
  });

  const previewImage = getFirstImage(formData.images);

  return (
    <div className="space-y-6 text-[#1b1c1b]">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            🏷️ Danh Sách Sản Phẩm
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Hiển thị tất cả {filteredProducts.length} mặt hàng kinh doanh trên Zalo Mini App
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-5 py-2.5 bg-[#0e6877] hover:bg-[#0b5460] text-white text-xs font-bold rounded-2xl transition-all flex items-center gap-2 border-none cursor-pointer shadow-md active:scale-95"
        >
          <Plus size={16} /> Thêm Sản Phẩm Mới
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 flex flex-col sm:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm theo tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#0e6877] rounded-2xl py-2.5 pl-10 pr-4 text-xs text-slate-800 focus:outline-none transition-all"
          />
        </div>

        <select
          value={selectedCategoryFilter}
          onChange={(e) => setSelectedCategoryFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
          className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-2xl py-2.5 px-4 focus:outline-none focus:border-[#0e6877] cursor-pointer"
        >
          <option value="ALL">Tất cả danh mục ({products.length})</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Grid List - Full Responsive Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-10 h-10 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-xs font-semibold">Đang tải danh sách sản phẩm...</p>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
          {filteredProducts.map((product) => {
            const img = getFirstImage(product.images);
            const hasDiscount = product.originalPrice && product.originalPrice > product.price;
            const discountPct = hasDiscount
              ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
              : 0;

            return (
              <div
                key={product.id}
                className="bg-white border border-slate-200/90 hover:border-[#0e6877]/50 rounded-3xl overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-xl transition-all duration-300 group"
              >
                <div>
                  {/* Product Image Container */}
                  <div className="h-52 overflow-hidden bg-slate-50 relative border-b border-slate-100">
                    <img
                      src={img}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-black text-slate-700 rounded-full border border-slate-200 shadow-xs">
                      #{product.id}
                    </span>
                    {product.category && (
                      <span className="absolute top-3 right-3 bg-[#0e6877] text-white px-2.5 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wider shadow-xs">
                        {product.category.name}
                      </span>
                    )}
                    {hasDiscount && (
                      <span className="absolute bottom-3 left-3 bg-rose-500 text-white px-2 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wider shadow-xs">
                        -{discountPct}%
                      </span>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="p-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-[#0e6877] transition-colors">
                      {product.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {product.description || 'Không có mô tả chi tiết sản phẩm.'}
                    </p>
                  </div>
                </div>

                {/* Footer Price & Action Buttons */}
                <div className="p-4 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-[#0e6877]">{formatPrice(product.price)}</p>
                    {hasDiscount && (
                      <p className="text-[10px] text-slate-400 line-through">{formatPrice(product.originalPrice!)}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(product)}
                      className="p-2 text-slate-600 hover:text-[#0e6877] hover:bg-teal-50 rounded-xl transition-all border-none cursor-pointer"
                      title="Chỉnh sửa sản phẩm"
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
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center text-slate-400 text-sm bg-white rounded-3xl border border-slate-200 shadow-xs">
          Không tìm thấy sản phẩm nào phù hợp với bộ lọc.
        </div>
      )}

      {/* Slide-Over Drawer: Rendered via Portal directly to document.body */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-hidden flex justify-end">
            {/* Light Glass Backdrop Overlay */}
            <div
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-[#0e6877]/10 backdrop-blur-[2px] transition-opacity animate-fadeIn"
            />

            {/* Drawer Container */}
            <div className="relative w-full max-w-md h-full bg-white shadow-2xl z-[10000] flex flex-col justify-between border-l border-slate-200 animate-slideLeft">
              {/* Header Bar */}
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-[#0e6877] to-[#168a9e] text-white shrink-0 shadow-sm">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    {editingProduct ? '✏️ Chỉnh Sửa Sản Phẩm' : '✨ Thêm Sản Phẩm Mới'}
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

              {/* Scrollable Form Body */}
              <form id="productForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#fbf9f7] scrollbar-thin">
                {/* Section 1: Thông tin cơ bản */}
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

                {/* Section 2: Phân loại & Mô tả */}
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
                            className={`px-3 py-1 text-[10px] font-black rounded-full border border-none cursor-pointer transition-all ${
                              isActive
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
                      rows={3}
                      placeholder="Nhập mô tả chi tiết chất liệu, kích thước..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Section 3: Hình ảnh */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-black text-[#0e6877] uppercase tracking-wider pb-2 border-b border-slate-100">
                    <ImageIcon size={14} />
                    <span>Hình Ảnh Sản Phẩm</span>
                  </div>

                  {/* Live Image Preview */}
                  {previewImage && (
                    <div className="relative w-full h-36 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 group">
                      <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full font-mono">
                        1000 x 1000 px
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">URL Ảnh hoặc Chọn File Tải Lên</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder='["https://..."]'
                        value={formData.images}
                        onChange={(e) => setFormData({ ...formData, images: e.target.value })}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:bg-white focus:outline-none font-mono"
                      />
                      <label className="px-3.5 py-2.5 bg-slate-100 hover:bg-[#0e6877] hover:text-white text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shrink-0 border border-slate-200">
                        <ImageIcon size={14} />
                        {uploading ? 'Đang tải...' : 'Chọn file'}
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              </form>

              {/* Sticky Bottom Footer */}
              <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end gap-3 shrink-0 shadow-lg">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors border-none cursor-pointer"
                >
                  Hủy Chỉnh Sửa
                </button>
                <button
                  type="submit"
                  form="productForm"
                  className="px-6 py-2.5 bg-[#0e6877] hover:bg-[#0b5460] text-white text-xs font-black rounded-xl transition-all flex items-center gap-2 border-none cursor-pointer shadow-md active:scale-95"
                >
                  <Save size={16} /> Lưu Sản Phẩm
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
