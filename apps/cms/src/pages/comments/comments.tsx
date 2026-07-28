import React, { useState, useEffect } from 'react';
import {
  Star as StarIcon,
  Trash2 as TrashIcon,
  Search as SearchIcon,
  X as XIcon,
  MessageSquare as MessageSquareIcon,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ImageIcon,
} from 'lucide-react';
import { apiRequest, API_BASE_URL } from '../../utils/api';

interface CustomerComment {
  id: number;
  productId: number;
  zaloUserId: string;
  content: string;
  rating: number;
  orderId?: string;
  images?: string;
  createdAt: string;
  user?: {
    zaloId: string;
    name: string;
    avatar?: string;
  };
  product?: {
    id: number;
    name: string;
    images?: string;
  };
}

export const CommentsPage: React.FC = () => {
  const [comments, setComments] = useState<CustomerComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | 'ALL'>('ALL');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const serverUrl = API_BASE_URL.replace('/api/v1', '');

  const fetchComments = async () => {
    setLoading(true);
    try {
      let url = '/cms/comments';
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedRatingFilter !== 'ALL') params.append('rating', String(selectedRatingFilter));
      if (params.toString()) url += `?${params.toString()}`;

      const res = await apiRequest<CustomerComment[]>(url);
      if (Array.isArray(res)) {
        setComments(res);
      }
    } catch (e) {
      console.error('Failed to fetch comments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [selectedRatingFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComments();
  };

  const handleDeleteComment = async () => {
    if (!deletingId) return;
    try {
      await apiRequest(`/cms/comments/${deletingId}`, 'DELETE');
      setComments((prev) => prev.filter((c) => c.id !== deletingId));
    } catch (e) {
      console.error('Failed to delete comment:', e);
    } finally {
      setDeletingId(null);
    }
  };

  // KPI calculations
  const totalCount = comments.length;
  const avgRating = totalCount > 0 ? (comments.reduce((sum, c) => sum + (c.rating || 5), 0) / totalCount).toFixed(1) : '5.0';
  const count5Star = comments.filter((c) => c.rating === 5).length;
  const countLowStar = comments.filter((c) => c.rating <= 2).length;

  const parseImages = (imgsInput?: any): string[] => {
    if (!imgsInput) return [];
    if (Array.isArray(imgsInput)) return imgsInput;
    if (typeof imgsInput === 'string') {
      const trimmed = imgsInput.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
        if (typeof parsed === 'string') {
          try {
            const doubleParsed = JSON.parse(parsed);
            if (Array.isArray(doubleParsed)) return doubleParsed;
          } catch {}
          return [parsed];
        }
      } catch (e) {
        if (trimmed.startsWith('http') || trimmed.startsWith('/')) {
          return [trimmed];
        }
      }
    }
    return [];
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-100'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-extrabold uppercase tracking-wider rounded-full border border-amber-200">
              Quản lý Phản hồi
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
            Bảng Đánh giá & Bình luận Khách hàng
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Danh sách chi tiết theo dạng bảng để dễ theo dõi, kiểm duyệt và quản lý bình luận
          </p>
        </div>

        <button
          onClick={fetchComments}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {/* ── KPI Stats Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Đánh giá</span>
            <div className="p-2.5 bg-teal-50 text-[#0e6877] rounded-2xl">
              <MessageSquareIcon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{totalCount}</p>
          <p className="text-[11px] font-medium text-slate-400">Phản hồi từ khách hàng</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Điểm Trung bình</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
              <StarIcon className="w-5 h-5 fill-amber-500" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-black text-slate-900">{avgRating}</p>
            <span className="text-xs font-bold text-slate-400">/ 5.0</span>
          </div>
          <p className="text-[11px] font-medium text-amber-600">Chất lượng phục vụ</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đánh giá 5 sao</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600">{count5Star}</p>
          <p className="text-[11px] font-medium text-emerald-600/80">Khách hàng tuyệt đối hài lòng</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đánh giá Thấp (1-2★)</span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600">{countLowStar}</p>
          <p className="text-[11px] font-medium text-rose-500">Cần chú ý chăm sóc khách hàng</p>
        </div>
      </div>

      {/* ── Search & Rating Filter Controls ── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <SearchIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên khách hàng, tên sản phẩm hoặc nội dung bình luận..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0e6877] focus:bg-white transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-1.5 bg-[#0e6877] hover:bg-[#0b5461] text-white text-xs font-bold rounded-xl transition-all"
            >
              Tìm kiếm
            </button>
          </form>

          {/* Rating Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { label: 'Tất cả', value: 'ALL' },
              { label: '5 ★', value: 5 },
              { label: '4 ★', value: 4 },
              { label: '3 ★', value: 3 },
              { label: '2 ★', value: 2 },
              { label: '1 ★', value: 1 },
            ].map((tab) => (
              <button
                key={String(tab.value)}
                onClick={() => setSelectedRatingFilter(tab.value as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedRatingFilter === tab.value
                    ? 'bg-[#0e6877] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Data Table View ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-slate-500">Đang tải dữ liệu bảng đánh giá...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="p-4 bg-slate-50 text-slate-400 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <MessageSquareIcon className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Không tìm thấy bình luận nào</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Chưa có đánh giá nào phù hợp với bộ lọc tìm kiếm của bạn.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-5">Khách hàng</th>
                  <th className="py-4 px-5">Sản phẩm & Đơn hàng</th>
                  <th className="py-4 px-5">Đánh giá</th>
                  <th className="py-4 px-5">Nội dung & Hình ảnh</th>
                  <th className="py-4 px-5">Thời gian</th>
                  <th className="py-4 px-5 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {comments.map((item) => {
                  const reviewImgs = parseImages(item.images);
                  let productImg = '';
                  try {
                    if (item.product?.images) {
                      const parsed = JSON.parse(item.product.images);
                      if (Array.isArray(parsed) && parsed.length > 0) productImg = parsed[0];
                    }
                  } catch (e) {
                    if (typeof item.product?.images === 'string') productImg = item.product.images;
                  }
                  const fullProdImg = productImg.startsWith('http') ? productImg : `${serverUrl}${productImg}`;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* 1. Customer */}
                      <td className="py-4 px-5 align-top min-w-[180px]">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              item.user?.avatar ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
                            }
                            alt={item.user?.name || 'Khách hàng'}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900 leading-snug">
                              {item.user?.name || 'Khách hàng Zalo'}
                            </p>
                            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                              ID: {item.zaloUserId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Product & Order */}
                      <td className="py-4 px-5 align-top min-w-[220px]">
                        {item.product ? (
                          <div className="flex items-start gap-3">
                            {fullProdImg && (
                              <img
                                src={fullProdImg}
                                alt={item.product.name}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 mt-0.5"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 line-clamp-2 leading-snug">
                                {item.product.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                                  SP #{item.product.id}
                                </span>
                                {item.orderId && (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold border border-emerald-200">
                                    Đơn #{item.orderId}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sản phẩm #{item.productId}</span>
                        )}
                      </td>

                      {/* 3. Rating */}
                      <td className="py-4 px-5 align-top min-w-[130px]">
                        <div className="space-y-1">
                          {renderStars(item.rating)}
                          <span className="text-[11px] font-extrabold text-amber-600 block">
                            {item.rating}/5 sao
                          </span>
                        </div>
                      </td>

                      {/* 4. Content & Images */}
                      <td className="py-4 px-5 align-top max-w-xs space-y-2">
                        <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap break-words">
                          {item.content}
                        </p>

                        {/* Review Photos Grid */}
                        {reviewImgs.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <ImageIcon className="w-3 h-3 text-[#0e6877]" /> Ảnh đính kèm ({reviewImgs.length}):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {reviewImgs.map((img, idx) => {
                                const fullImg = img.startsWith('http') ? img : `${serverUrl}${img}`;
                                return (
                                  <img
                                    key={idx}
                                    src={fullImg}
                                    alt={`Review img ${idx}`}
                                    onClick={() => setPreviewImage(fullImg)}
                                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 cursor-pointer hover:opacity-85 hover:scale-105 transition-all shadow-2xs"
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 5. Date */}
                      <td className="py-4 px-5 align-top text-slate-500 font-medium whitespace-nowrap min-w-[130px]">
                        {new Date(item.createdAt).toLocaleString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* 6. Action */}
                      <td className="py-4 px-5 align-top text-center">
                        <button
                          onClick={() => setDeletingId(item.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all inline-flex items-center justify-center"
                          title="Xóa bình luận"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Image Lightbox Modal ── */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden p-2 shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/70 text-white rounded-full hover:bg-slate-900 transition-all z-10"
            >
              <XIcon className="w-5 h-5" />
            </button>
            <img src={previewImage} alt="Preview" className="w-full h-auto max-h-[80vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl animate-fade-in">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <TrashIcon className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">Xóa bình luận này?</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Hành động này sẽ xóa vĩnh viễn bình luận khỏi hệ thống và không thể khôi phục.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteComment}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-2xl transition-all shadow-xs"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentsPage;
