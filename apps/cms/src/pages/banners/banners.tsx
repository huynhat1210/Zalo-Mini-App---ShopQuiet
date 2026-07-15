import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Save, 
  X,
  AlertCircle
} from 'lucide-react';

interface Banner {
  id: number;
  imageUrl: string;
  title?: string;
  description?: string;
  link?: string;
  active: boolean;
}

import type { IBannersComponentProps } from './banners.type';

export const BannersComponent: React.FC<IBannersComponentProps> = (_props) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    imageUrl: '',
    title: '',
    description: '',
    link: '',
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
      imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1000&auto=format&fit=crop&q=80',
      title: '',
      description: '',
      link: '',
    });
    setIsModalOpen(true);
    setError('');
  };

  const handleDeleteBanner = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa banner này không?')) return;
    try {
      await apiRequest(`/banners/${id}`, 'DELETE');
      setBanners(banners.filter((b) => b.id !== id));
    } catch (err) {
      alert('Không thể xóa banner. Lỗi kết nối.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.imageUrl.trim()) {
      setError('Đường dẫn hình ảnh không được để trống');
      return;
    }

    try {
      await apiRequest('/banners', 'POST', formData);
      fetchBanners();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo banner mới.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Cấu hình Banners</h2>
          <p className="text-slate-400 text-sm mt-1">Quản lý các hình ảnh trình chiếu quảng cáo ở đầu trang chủ</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 px-5 rounded-xl text-sm flex items-center gap-2 transition-all duration-200 shadow-lg shadow-emerald-500/10"
        >
          <Plus size={16} />
          <span>Thêm Banner mới</span>
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-xs">Đang tải danh sách banners...</p>
        </div>
      ) : banners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {banners.map((banner) => (
            <div 
              key={banner.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-750 rounded-3xl overflow-hidden flex flex-col transition-all duration-200 group"
            >
              {/* Banner Image Preview */}
              <div className="h-44 bg-slate-950 relative overflow-hidden">
                <img 
                  src={banner.imageUrl} 
                  alt={banner.title || 'Slide Banner'} 
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
                <button
                  onClick={() => handleDeleteBanner(banner.id)}
                  className="absolute top-4 right-4 p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-colors shadow-lg"
                  title="Xóa banner"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Banner Details */}
              <div className="p-5 space-y-2 flex-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">ID: {banner.id}</span>
                <h4 className="font-bold text-white tracking-wide text-sm">
                  {banner.title || 'Không có tiêu đề'}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {banner.description || 'Không có mô tả chi tiết cho slide này.'}
                </p>
                {banner.link && (
                  <div className="pt-2 border-t border-slate-800 mt-2 text-[10px] text-emerald-400 font-medium">
                    Liên kết: {banner.link}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <ImageIcon size={32} className="text-slate-750" />
          <p className="text-xs">Chưa cài đặt bất kỳ banner quảng cáo nào.</p>
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-slideUp">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Thêm Banner quảng cáo mới</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="p-4 mx-6 mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-start gap-2.5">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-450 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                  Đường dẫn hình ảnh (URL)
                </label>
                <input
                  type="text"
                  required
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="Nhập link ảnh slide..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-700 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-450 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                  Tiêu đề quảng cáo
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nhập tiêu đề (nếu có)..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-700 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-450 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                  Mô tả ngắn
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Nhập mô tả ngắn cho banner..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-700 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-450 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                  Đường dẫn hành động (CTA Link)
                </label>
                <input
                  type="text"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="VD: /products/2"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-700 focus:outline-none transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/10"
                >
                  <Save size={14} />
                  Kích hoạt Slide
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

