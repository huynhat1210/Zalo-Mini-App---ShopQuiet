import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { useToast } from '../../contexts';
import { PaginationComponent } from '../../components';
import { 
  Send, 
  Bell, 
  History, 
  User, 
  Users, 
  CheckCircle2, 
  Tag, 
  AlertCircle,
  Megaphone,
  Smartphone,
  ChevronRight
} from 'lucide-react';
import type { INotificationsProps } from './notifications.type';

interface NotificationHistory {
  id: number;
  title: string;
  
  content: string;
  type: string;
  zaloUserId: string | null;
  date: string;
  read: boolean;
}

export const Notifications: React.FC<INotificationsProps> = (_props) => {
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Pagination State for History List
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);


  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('system');
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all');
  const [specificUserId, setSpecificUserId] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/notifications/admin/all');
      setHistory(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to fetch notifications history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toastWarning('Thiếu thông tin', 'Vui lòng điền tiêu đề và nội dung thông báo!');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: title.trim(),
        content: content.trim(),
        type,
        zaloUserId: targetType === 'specific' ? specificUserId.trim() : null
      };

      await apiRequest('/notifications', 'POST', payload);
      
      setSuccessMsg('Đã phát hành thông báo thành công!');
      toastSuccess('Đã gửi thông báo', `Thông báo "${title}" đã được gửi tới khách hàng.`);
      setTitle('');
      setContent('');
      setSpecificUserId('');
      
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchHistory();
    } catch (err: any) {
      console.error('Failed to send notification:', err);
      toastError('Gửi thất bại', err.message || 'Lỗi khi gửi thông báo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn text-[#1b1c1b] max-w-7xl mx-auto px-2">
      {/* Premium Glass Header */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0e6877] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#0e6877] animate-pulse"></span>
            Hệ thống đẩy tin tức
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gửi thông báo đẩy (Push Engine)</h2>
          <p className="text-slate-500 text-xs font-medium">Soạn thảo và phát hành thông báo thời gian thực đến ứng dụng Zalo Mini App của khách hàng</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl border border-emerald-100 flex items-center gap-2 text-xs font-bold">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
            Đang hoạt động
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50/80 backdrop-blur-md border border-emerald-100 text-emerald-800 rounded-2xl p-4 flex items-center gap-3 shadow-xs animate-slideDown">
          <div className="p-1.5 bg-emerald-500 text-white rounded-lg">
            <CheckCircle2 size={16} />
          </div>
          <span className="text-xs font-bold">{successMsg}</span>
        </div>
      )}

      {/* Main Container Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Form: Composer */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-6.5 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-[#ecf6f7] text-[#0e6877] rounded-2xl">
              <Megaphone size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Soạn thông báo</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Tạo nội dung phát hành</p>
            </div>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Tiêu đề thông báo</label>
              <input 
                type="text" 
                placeholder="Nhập tiêu đề thu hút sự chú ý..." 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] focus:bg-white focus:ring-4 focus:ring-[#0e6877]/5 transition-all text-slate-800 font-medium"
                required
              />
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Nội dung tin nhắn</label>
              <textarea 
                placeholder="Nội dung thông điệp chi tiết..." 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] focus:bg-white focus:ring-4 focus:ring-[#0e6877]/5 transition-all text-slate-800 font-medium resize-none leading-relaxed"
                required
              />
            </div>

            {/* Segmented Control: Loại thông báo */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Loại thông báo</label>
              <div className="bg-slate-100/80 p-1 rounded-xl flex gap-1 border border-slate-200/20">
                <button
                  type="button"
                  onClick={() => setType('system')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border-none cursor-pointer ${
                    type === 'system'
                      ? 'bg-white text-[#0e6877] shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 bg-transparent'
                  }`}
                >
                  <Tag size={13} />
                  Hệ thống / Sự kiện
                </button>
                <button
                  type="button"
                  onClick={() => setType('order')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border-none cursor-pointer ${
                    type === 'order'
                      ? 'bg-white text-[#0e6877] shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 bg-transparent'
                  }`}
                >
                  <AlertCircle size={13} />
                  Giao dịch / Đơn hàng
                </button>
              </div>
            </div>

            {/* Segmented Control: Đối tượng nhận tin */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Đối tượng nhận tin</label>
              <div className="bg-slate-100/80 p-1 rounded-xl flex gap-1 border border-slate-200/20">
                <button
                  type="button"
                  onClick={() => setTargetType('all')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border-none cursor-pointer ${
                    targetType === 'all'
                      ? 'bg-white text-[#0e6877] shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 bg-transparent'
                  }`}
                >
                  <Users size={13} />
                  Gửi tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('specific')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border-none cursor-pointer ${
                    targetType === 'specific'
                      ? 'bg-white text-[#0e6877] shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 bg-transparent'
                  }`}
                >
                  <User size={13} />
                  1 người dùng
                </button>
              </div>
            </div>

            {/* Specific Zalo User ID Input */}
            {targetType === 'specific' && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Zalo User ID nhận tin</label>
                <input 
                  type="text" 
                  placeholder="Nhập ID người nhận (ví dụ: zalo-id-x)..." 
                  value={specificUserId}
                  onChange={(e) => setSpecificUserId(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] focus:bg-white focus:ring-4 focus:ring-[#0e6877]/5 transition-all text-slate-800 font-medium"
                  required
                />
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#0e6877] hover:bg-[#0c5966] text-white text-xs font-bold uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] duration-200 shadow-sm hover:shadow-md disabled:opacity-50 border-none cursor-pointer"
              >
                <Send size={13} />
                {submitting ? 'Đang gửi...' : 'Gửi thông báo ngay'}
              </button>
            </div>
          </form>
        </div>

        {/* Right List: History */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6.5 shadow-sm space-y-6 flex flex-col justify-between min-h-[550px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#ecf6f7] text-[#0e6877] rounded-2xl">
                <History size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Lịch sử thông báo đã gửi</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Theo dõi tiến độ phát hành tin tức</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#0e6877] bg-[#ecf6f7] px-3 py-1 rounded-full border border-[#0e6877]/10 flex items-center gap-1">
              <Smartphone size={10} />
              Đã gửi: {history.length}
            </span>
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-[#0e6877] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 text-xs font-semibold">Đang tải nhật ký...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs py-20">
              <Bell size={28} className="text-slate-300 mb-2 animate-bounce" />
              Chưa gửi thông báo nào.
            </div>
          ) : (
            <div className="flex-1 space-y-4 pt-2">
              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                {history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => (
                <div 
                  key={item.id} 
                  className="bg-white border border-slate-150 rounded-2xl p-4 hover:shadow-xs hover:border-[#0e6877]/20 transition-all duration-300 flex items-start gap-4 relative group"
                >
                  {/* Left Icon Category */}
                  <div className={`p-2 rounded-xl flex-shrink-0 ${
                    item.type === 'order' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600'
                  }`}>
                    {item.type === 'order' ? <AlertCircle size={16} /> : <Tag size={16} />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-xs font-bold text-slate-800 truncate pr-4">{item.title}</h4>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                        {item.date}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-550 leading-relaxed pr-2 font-medium">{item.content}</p>
                    
                    {/* Bottom Metadata Tags */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 text-[9px] font-extrabold text-slate-450 uppercase tracking-wider">
                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                        {item.zaloUserId ? <User size={10} /> : <Users size={10} />}
                        {item.zaloUserId ? `Cá nhân: ${item.zaloUserId}` : 'Tất cả người dùng (Broadcast)'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md border ${
                        item.type === 'order' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-[#ecf6f7] text-[#0e6877] border-[#0e6877]/10'
                      }`}>
                        {item.type === 'order' ? 'Giao dịch' : 'Hệ thống'}
                      </span>
                    </div>
                  </div>

                  <ChevronRight size={14} className="text-slate-300 absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
                </div>
              ))}
              </div>

              <PaginationComponent
                currentPage={currentPage}
                totalPages={Math.ceil(history.length / itemsPerPage)}
                totalItems={history.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(newSize) => {
                  setItemsPerPage(newSize);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
export default Notifications;
