import React, { useState } from 'react';
import { apiRequest, API_BASE_URL } from '../../utils/api';
import { IReviewModalProps } from './review-modal.type';

export const ReviewModal: React.FC<IReviewModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    zaloUser,
    orderId,
    productId,
    productName,
    productSize,
    productQuantity,
    showToast,
    onReviewSuccess,
  } = props;

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImageUrls, setReviewImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !productId) return;
    setUploadingImage(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_BASE_URL}/products/${productId}/comments/upload-image`, {
          method: 'POST',
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'x-zalo-user-id': zaloUser?.id || 'cust-zalo-id-1',
          },
          body: formData,
        });
        if (res.ok) {
          const resJson = await res.json();
          const actualData = resJson.data || resJson;
          if (actualData.success && actualData.url) {
            urls.push(actualData.url);
          }
        }
      }
      if (urls.length > 0) {
        setReviewImageUrls((prev) => [...prev, ...urls]);
        showToast('Tải ảnh lên thành công!', 'success');
      } else {
        showToast('Tải ảnh lên thất bại. Vui lòng kiểm tra lại!', 'warning');
      }
    } catch (err) {
      console.error(err);
      showToast('Không thể tải ảnh lên!', 'warning');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!productId || !reviewComment.trim()) {
      showToast('Vui lòng nhập bình luận nhận xét!', 'warning');
      return;
    }
    setSubmittingReview(true);
    try {
      const sizeText = productSize && productSize !== 'DEFAULT' ? ` - Size: ${productSize}` : '';
      const formattedComment = `[Đã mua: ${productName} x${productQuantity}${sizeText}] ${reviewComment}`;

      const res = await apiRequest<any>(`/products/${productId}/comments`, 'POST', {
        content: formattedComment,
        rating: reviewRating,
        orderId: orderId,
        images: JSON.stringify(reviewImageUrls),
      });

      if (res) {
        onReviewSuccess(orderId, productId);
        showToast('Đánh giá sản phẩm thành công!', 'success');
        onClose();
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Gửi đánh giá thất bại!', 'warning');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!isOpen || !productId) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6 text-left animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-5 animate-scale-up">
        <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
          <h3 className="text-xs font-black text-textColor uppercase tracking-wider">Đánh giá sản phẩm</h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-textColor border-none bg-transparent cursor-pointer font-bold text-xs p-1"
          >
            ×
          </button>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] bg-primary-light text-primary px-2 py-0.5 rounded font-bold uppercase tracking-wider">
            {productSize !== 'DEFAULT' ? `Size: ${productSize}` : 'Free Size'}
          </span>
          <h4 className="text-xs font-bold text-textColor leading-snug line-clamp-2 mt-1">{productName}</h4>
          <p className="text-[10px] text-textColor-variant">
            Số lượng mua: <span className="font-semibold text-textColor">x{productQuantity}</span>
          </p>
        </div>

        {/* Rating Stars Select */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-extrabold text-[#526069]/70 uppercase tracking-widest block">Độ hài lòng (Chọn sao)</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setReviewRating(star)}
                className="p-0 border-none bg-transparent cursor-pointer text-xl text-amber-500 hover:scale-110 active:scale-95 transition-transform"
              >
                {star <= reviewRating ? '★' : '☆'}
              </button>
            ))}
          </div>
        </div>

        {/* Comment Area */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-extrabold text-[#526069]/70 uppercase tracking-widest block">Nhận xét của bạn</label>
          <textarea
            rows={3}
            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            className="w-full text-xs p-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:border-primary outline-none resize-none font-medium text-textColor leading-relaxed"
            required
          />
        </div>

        {/* Image Upload Area */}
        <div className="space-y-2">
          <label className="text-[9px] font-extrabold text-[#526069]/70 uppercase tracking-widest block">Hình ảnh thực tế</label>
          <div className="flex flex-wrap gap-2.5">
            {reviewImageUrls.map((url, idx) => (
              <div key={idx} className="w-16 h-16 rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50 relative">
                <img
                  src={url.startsWith('http') ? url : `${API_BASE_URL.replace('/api/v1', '')}${url}`}
                  alt="Review image"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setReviewImageUrls((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-xs border border-white active:scale-90"
                >
                  ×
                </button>
              </div>
            ))}

            {reviewImageUrls.length < 5 && (
              <label className="w-16 h-16 rounded-xl border-2 border-dashed border-neutral-350 hover:border-primary flex flex-col items-center justify-center cursor-pointer bg-neutral-50 transition-colors">
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                {uploadingImage ? (
                  <div className="w-4.5 h-4.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="text-lg font-bold text-neutral-450">+</span>
                    <span className="text-[8px] text-neutral-450 font-bold uppercase mt-0.5">Ảnh</span>
                  </>
                )}
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            disabled={submittingReview || !reviewComment.trim()}
            onClick={handleSubmitReview}
            className="flex-1 h-10 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-primary-dark disabled:bg-neutral-300 active:scale-98 transition-all"
          >
            {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>
          <button
            onClick={onClose}
            className="h-10 px-4 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
};
export default ReviewModal;
