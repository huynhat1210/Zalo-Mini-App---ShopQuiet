import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest, apiUploadRequest } from '../../utils/api';
import { useToast } from '../../contexts';
import {
  FolderPlus,
  Edit3,
  Trash2,
  Search,
  X,
  Save,
  Package,
  Image as ImageIcon,
} from 'lucide-react';

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  _count?: {
    products: number;
  };
}

export const Categories: React.FC = () => {
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<Category[]>('/categories');
      setCategories(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      imageUrl: cat.imageUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteCategory = async (cat: Category) => {
    const count = cat._count?.products || 0;
    if (count > 0) {
      toastWarning('Không thể xóa', `Danh mục "${cat.name}" đang chứa ${count} sản phẩm.`);
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${cat.name}"?`)) return;

    try {
      await apiRequest(`/categories/${cat.id}`, 'DELETE');
      setCategories(categories.filter((c) => c.id !== cat.id));
      toastSuccess('Đã xóa danh mục', `Danh mục "${cat.name}" đã được xóa.`);
    } catch (err: any) {
      toastError('Không thể xóa danh mục', err.message || 'Lỗi server.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await apiUploadRequest(file);
      setFormData((prev) => ({ ...prev, imageUrl: url }));
      toastSuccess('Tải ảnh thành công', 'Ảnh danh mục đã được tải lên.');
    } catch (err: any) {
      toastError('Tải ảnh thất bại', err.message || 'Lỗi khi tải ảnh danh mục.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toastWarning('Thiếu thông tin', 'Vui lòng nhập tên danh mục.');
      return;
    }

    try {
      if (editingCategory) {
        const updated = await apiRequest<Category>(`/categories/${editingCategory.id}`, 'PUT', formData);
        setCategories(categories.map((c) => (c.id === editingCategory.id ? { ...c, ...updated } : c)));
        toastSuccess('Cập nhật thành công', `Danh mục "${formData.name}" đã được lưu.`);
      } else {
        const created = await apiRequest<Category>('/categories', 'POST', formData);
        setCategories([...categories, created]);
        toastSuccess('Tạo danh mục mới', `Danh mục "${formData.name}" đã tạo thành công.`);
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      toastError('Lưu thất bại', err.message || 'Thao tác thất bại.');
    }
  };

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-fadeIn text-[#1b1c1b]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Quản Lý Danh Mục Sản Phẩm</h1>
          <p className="text-slate-500 text-xs mt-1">Phân loại sản phẩm hiển thị trên Zalo Mini App</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-[#0e6877] text-white text-xs font-bold rounded-xl hover:bg-[#0b5460] transition-all flex items-center gap-2 border-none cursor-pointer shadow-xs active:scale-95"
        >
          <FolderPlus size={16} /> Thêm Danh Mục Mới
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm danh mục theo tên hoặc slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#0e6877] rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-xs">Đang tải danh sách danh mục...</p>
          </div>
        ) : filteredCategories.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-[#fbf9f7] text-[#526069] text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 rounded-l-xl">ID</th>
                  <th className="py-3.5 px-4">Ảnh / Tên danh mục</th>
                  <th className="py-3.5 px-4">Slug (Đường dẫn)</th>
                  <th className="py-3.5 px-4 text-center">Số sản phẩm</th>
                  <th className="py-3.5 px-4 text-right rounded-r-xl">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-500 text-xs">#{cat.id}</td>
                    <td className="py-4 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-3">
                        {cat.imageUrl ? (
                          <img src={cat.imageUrl} alt={cat.name} className="w-10 h-10 object-cover rounded-xl border border-slate-200" />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                            <Package size={18} />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-slate-800">{cat.name}</p>
                          {cat.description && <p className="text-[11px] text-slate-400 font-normal line-clamp-1">{cat.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs font-mono text-teal-700 bg-teal-50/50 rounded-lg w-fit">{cat.slug}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-600">
                        {cat._count?.products || 0} sản phẩm
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(cat)}
                          className="p-2 text-slate-600 hover:text-[#0e6877] hover:bg-slate-100 rounded-xl transition-all border-none cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border-none cursor-pointer"
                          title="Xóa danh mục"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400 text-sm">Chưa có danh mục nào được tìm thấy.</div>
        )}
      </div>

      {/* Slide-Over Drawer: Add / Edit Category */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-hidden flex justify-end">
            {/* Transparent Backdrop */}
            <div
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-[#0e6877]/10 backdrop-blur-[2px] transition-opacity animate-fadeIn"
            />

            <div className="relative w-full max-w-md h-full bg-white shadow-2xl z-[10000] flex flex-col justify-between border-l border-slate-200 animate-slideLeft">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-[#0e6877] to-[#168a9e] text-white shrink-0 shadow-sm">
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingCategory ? '✏️ Chỉnh Sửa Danh Mục' : '✨ Thêm Danh Mục Mới'}
                  </h3>
                  <p className="text-[11px] text-white/80 font-medium mt-0.5">Cấu hình nhóm phân loại mặt hàng hiển thị trên Mini App</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center border-none cursor-pointer transition-colors shadow-2xs"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form id="categoryForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#fbf9f7] scrollbar-thin">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tên Danh Mục *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Áo Nam, Quần Jeans..."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Slug (Đường dẫn tùy chọn)</label>
                    <input
                      type="text"
                      placeholder="Tự động tạo từ tên nếu để trống"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:bg-white focus:outline-none font-mono transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mô Tả Danh Mục</label>
                    <textarea
                      rows={3}
                      placeholder="Mô tả ngắn cho danh mục..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ảnh Đại Diện Danh Mục</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="https://..."
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:bg-white focus:outline-none font-mono"
                      />
                      <label className="px-3.5 py-2.5 bg-slate-100 hover:bg-[#0e6877] hover:text-white text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shrink-0 border border-slate-200">
                        <ImageIcon size={14} />
                        {uploading ? 'Tải...' : 'Chọn file'}
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              </form>

              {/* Sticky Footer */}
              <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0 shadow-lg">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors border-none cursor-pointer"
                >
                  Hủy Chỉnh Sửa
                </button>
                <button
                  type="submit"
                  form="categoryForm"
                  className="px-6 py-2.5 bg-[#0e6877] hover:bg-[#0b5460] text-white text-xs font-black rounded-xl transition-all flex items-center gap-2 border-none cursor-pointer shadow-md active:scale-95"
                >
                  <Save size={16} /> Lưu Danh Mục
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default Categories;
