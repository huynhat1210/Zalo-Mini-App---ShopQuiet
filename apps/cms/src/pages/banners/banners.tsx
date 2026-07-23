import React, { useEffect, useState } from 'react';
import { apiRequest, apiUploadRequest } from '../../utils/api';
import { PaginationComponent } from '../../components';
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Save,
  X,
  Link as LinkIcon,
} from 'lucide-react';
import type { IBannersProps } from './banners.type';
import { useToast } from '../../contexts';

interface Banner {
  id: number;
  imageUrl: string;
  title?: string;
  description?: string;
  link?: string;
  active: boolean;
}

export const Banners: React.FC<IBannersProps> = (_props) => {
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    imageUrl: '',
    title: '',
    description: '',
    link: '',
    active: true,
  });

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/banners');
      setBanners(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load banners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      imageUrl: '',
      title: '',
      description: '',
      link: '',
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleDeleteBanner = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa banner này không?')) return;
    try {
      await apiRequest(`/banners/${id}`, 'DELETE');
      setBanners(banners.filter((b) => b.id !== id));
      toastSuccess('Đã xóa Banner', 'Banner quảng cáo đã được gỡ.');
    } catch (err: any) {
      console.error('Lỗi khi xóa banner:', err);
      toastError('Không thể xóa Banner', err.message || 'Lỗi khi xóa banner.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await apiUploadRequest(file);
      setFormData((prev) => ({ ...prev, imageUrl: url }));
      toastSuccess('Tải ảnh thành công', 'Ảnh banner đã được tải lên.');
    } catch (err: any) {
      toastError('Tải ảnh thất bại', err.message || 'Lỗi khi tải hình ảnh banner');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl.trim()) {
      toastWarning('Thiếu thông tin', 'Vui lòng cung cấp URL hình ảnh hoặc chọn file tải lên');
      return;
    }

    try {
      await apiRequest('/banners', 'POST', formData);
      toastSuccess('Thêm Banner thành công', 'Banner quảng cáo mới đã được đăng tải.');
      fetchBanners();
      setIsModalOpen(false);
    } catch (err: any) {
      toastError('Lưu thất bại', err.message || 'Lỗi khi tạo banner mới.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-[#1b1c1b]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Quản Lý Banner Quảng Cáo</h1>
          <p className="text-slate-500 text-xs mt-1">Cấu hình các hình ảnh trình chiếu Slider ở trang chủ Zalo Mini App</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-[#0e6877] text-white text-xs font-bold rounded-xl hover:bg-[#0b5460] transition-all flex items-center gap-2 border-none cursor-pointer shadow-xs active:scale-95"
        >
          <Plus size={16} /> Thêm Banner Mới
        </button>
      </div>

      {/* Grid Banner Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-10 h-10 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-xs">Đang tải danh sách banner...</p>
        </div>
      ) : banners.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banners.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((banner) => (
            <div
              key={banner.id}
              className="bg-white border border-slate-200 hover:border-[#0e6877]/30 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                <div className="h-44 bg-slate-100 relative overflow-hidden">
                  <img src={banner.imageUrl} alt={banner.title || 'Banner'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <span className={`absolute top-3 right-3 text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${banner.active ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-200 text-slate-500 border-slate-300'}`}>
                    {banner.active ? 'Đang hiển thị' : 'Đã khóa'}
                  </span>
                </div>

                <div className="p-4 space-y-2">
                  <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{banner.title || 'Banner Khuyến Mãi'}</h4>
                  {banner.description && <p className="text-xs text-slate-500 line-clamp-2">{banner.description}</p>}
                  {banner.link && (
                    <p className="text-[11px] text-[#0e6877] font-mono flex items-center gap-1 truncate">
                      <LinkIcon size={12} /> {banner.link}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 pt-0 border-t border-slate-100/80 mt-2 flex justify-end">
                <button
                  onClick={() => handleDeleteBanner(banner.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border-none cursor-pointer flex items-center gap-1 text-xs font-bold"
                >
                  <Trash2 size={15} /> Xóa banner
                </button>
              </div>
            </div>
          ))}
          </div>

          <PaginationComponent
            currentPage={currentPage}
            totalPages={Math.ceil(banners.length / itemsPerPage)}
            totalItems={banners.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newSize) => {
              setItemsPerPage(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      ) : (
        <div className="py-20 text-center text-slate-400 text-sm bg-white rounded-3xl border border-slate-200">
          Chưa có banner quảng cáo nào.
        </div>
      )}

      {/* Slide-Over Drawer: Add Banner */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Transparent Backdrop */}
          <div
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 bg-transparent transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-50 flex flex-col justify-between border-l border-slate-200 animate-slideLeft">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-[#0e6877] to-[#168a9e] text-white">
              <div>
                <h3 className="text-base font-black text-white">🖼️ Thêm Banner Quảng Cáo Mới</h3>
                <p className="text-[11px] text-white/80 font-medium mt-0.5">Tải ảnh và thiết lập liên kết khuyến mãi trang chủ</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center border-none cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="bannerForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-thin">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu Đề Banner</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Siêu Sale Mùa Hè 50%..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hình Ảnh Banner (URL hoặc Chọn File) *</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    placeholder="https://..."
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:outline-none"
                  />
                  <label className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 shrink-0">
                    <ImageIcon size={14} />
                    {uploading ? 'Tải...' : 'Chọn file'}
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Liên Kết Khi Nhấp (Deep Link / URL)</label>
                <input
                  type="text"
                  placeholder="https://... hoặc /products/123"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mô Tả Banner</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả chiến dịch banner..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:border-[#0e6877] focus:outline-none"
                />
              </div>
            </form>

            {/* Sticky Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 border-none cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="bannerForm"
                className="px-5 py-2.5 bg-[#0e6877] text-white text-xs font-bold rounded-xl hover:bg-[#0b5460] border-none cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
              >
                <Save size={15} /> Lưu Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Banners;
