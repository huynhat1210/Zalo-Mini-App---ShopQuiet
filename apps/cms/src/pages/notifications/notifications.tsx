import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { 
  Send, 
  Bell, 
  History, 
  User, 
  Users, 
  CheckCircle2, 
  Tag, 
  AlertCircle 
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
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
      alert('Vui lòng điền tiêu đề và nội dung thông báo!');
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
      
      setSuccessMsg('Đã gửi thông báo thành công đến người dùng!');
      setTitle('');
      setContent('');
      setSpecificUserId('');
      
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchHistory();
    } catch (err: any) {
      console.error('Failed to send notification:', err);
      alert(err.message || 'Gửi thông báo thất bại!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn text-[#1b1c1b]">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Gửi thông báo (Push Engine)</h2>
        <p className="text-[#526069] text-sm mt-1">Soạn thảo và gửi thông báo hệ thống / khuyến mãi đến người dùng Zalo Mini App</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-3xl p-4.5 flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-bold">{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Form Left, History Right */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Form Composer Left */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6.5 space-y-6 shadow-sm">
          <div className="flex items-center gap-2.5 pb-4.5 border-b border-slate-100">
            <Bell className="text-[#0e6877]" size={20} />
            <h3 className="text-lg font-bold">Soạn thông báo mới</h3>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-5.5">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-[#526069] uppercase tracking-wider block">Tiêu đề thông báo</label>
              <input 
                type="text" 
                placeholder="Ví dụ: Voucher 50K chào bạn mới!" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] focus:bg-white transition-all text-slate-800"
                required
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-[#526069] uppercase tracking-wider block">Nội dung tin nhắn</label>
              <textarea 
                placeholder="Nhập chi tiết nội dung thông báo gửi đến điện thoại khách hàng..." 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] focus:bg-white transition-all text-slate-800 resize-none"
                required
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-[#526069] uppercase tracking-wider block">Loại thông báo</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType('system')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    type === 'system'
                      ? 'bg-[#0e6877] text-white border-[#0e6877]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Tag size={14} />
                  Hệ thống / Sự kiện
                </button>
                <button
                  type="button"
                  onClick={() => setType('order')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    type === 'order'
                      ? 'bg-[#0e6877] text-white border-[#0e6877]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <AlertCircle size={14} />
                  Giao dịch / Đơn hàng
                </button>
              </div>
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-[#526069] uppercase tracking-wider block">Đối tượng nhận tin</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTargetType('all')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    targetType === 'all'
                      ? 'bg-[#0e6877] text-white border-[#0e6877]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Users size={14} />
                  Gửi cho tất cả (Broadcast)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('specific')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    targetType === 'specific'
                      ? 'bg-[#0e6877] text-white border-[#0e6877]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <User size={14} />
                  Gửi cho 1 người dùng
                </button>
              </div>
            </div>

            {/* Specific Zalo User ID Input */}
            {targetType === 'specific' && (
              <div className="space-y-2 animate-fadeIn">
                <label className="text-xs font-extrabold text-[#526069] uppercase tracking-wider block">Zalo User ID nhận tin</label>
                <input 
                  type="text" 
                  placeholder="Nhập ID Zalo của người dùng..." 
                  value={specificUserId}
                  onChange={(e) => setSpecificUserId(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] focus:bg-white transition-all text-slate-800"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#0e6877] hover:bg-[#0c5966] text-white text-xs font-bold uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] duration-200 shadow-sm disabled:opacity-50"
            >
              <Send size={14} />
              {submitting ? 'Đang gửi...' : 'Gửi thông báo ngay'}
            </button>
          </form>
        </div>

        {/* History List Right */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-6.5 space-y-6 shadow-sm">
          <div className="flex items-center gap-2.5 pb-4.5 border-b border-slate-100">
            <History className="text-[#0e6877]" size={20} />
            <h3 className="text-lg font-bold">Nhật ký thông báo đẩy</h3>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-3 border-[#0e6877] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 text-xs">Đang tải nhật ký...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">Chưa có thông báo nào được gửi trước đây.</div>
          ) : (
            <div className="overflow-y-auto max-h-[500px] pr-2 space-y-4 scrollbar-thin">
              {history.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 flex justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-850 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.type === 'order' ? 'bg-indigo-500' : 'bg-[#0e6877]'}`} />
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-[#526069] leading-relaxed pr-6">{item.content}</p>
                    <div className="flex items-center gap-3 pt-2 text-[10px] text-[#526069]/70 font-semibold">
                      <span className="flex items-center gap-1">
                        {item.zaloUserId ? <User size={10} /> : <Users size={10} />}
                        {item.zaloUserId ? `Gửi riêng lẻ (Zalo ID: ${item.zaloUserId.substring(0, 10)}...)` : 'Gửi toàn bộ người dùng'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 text-[10px] text-[#526069]/60 font-semibold mt-0.5">
                    {item.date}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
export default Notifications;
