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
    <div className="space-y-8 animate-fadeIn text-[#1b1c1b] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gửi thông báo đẩy</h2>
          <p className="text-slate-500 text-sm mt-1">Soạn thảo và gửi thông báo khuyến mãi, tin tức hệ thống tới người dùng Zalo</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100/80 px-4 py-2 rounded-2xl border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-[#0e6877] animate-pulse"></span>
          Push Engine Online
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center gap-3 shadow-xs animate-slideDown">
          <CheckCircle2 className="text-emerald-600 flex-shrink-0" size={20} />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Side: Form Composer */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6.5 shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2 bg-[#ecf6f7] text-[#0e6877] rounded-xl">
                <Bell size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Soạn thông báo mới</h3>
                <p className="text-[11px] text-slate-400 font-medium">Tạo nội dung gửi trực tiếp đến Zalo Mini App</p>
              </div>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-5">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-650 tracking-wide uppercase">Tiêu đề thông báo</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Ưu đãi chào bạn mới - Giảm ngay 50K" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] focus:bg-white transition-all text-slate-800"
                  required
                />
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-650 tracking-wide uppercase">Nội dung tin nhắn</label>
                <textarea 
                  placeholder="Nhập nội dung thông báo gửi đến khách hàng..." 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0e6877] focus:bg-white transition-all text-slate-800 resize-none leading-relaxed"
                  required
                />
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-650 tracking-wide uppercase">Loại thông báo</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType('system')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      type === 'system'
                        ? 'bg-[#ecf6f7] text-[#0e6877] border-[#0e6877] shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Tag size={13} />
                    Hệ thống / Sự kiện
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('order')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      type === 'order'
                        ? 'bg-[#ecf6f7] text-[#0e6877] border-[#0e6877] shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <AlertCircle size={13} />
                    Giao dịch / Đơn hàng
                  </button>
                </div>
              </div>

              {/* Target Audience */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-650 tracking-wide uppercase">Đối tượng nhận tin</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetType('all')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      targetType === 'all'
                        ? 'bg-[#ecf6f7] text-[#0e6877] border-[#0e6877] shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Users size={13} />
                    Tất cả (Broadcast)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('specific')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      targetType === 'specific'
                        ? 'bg-[#ecf6f7] text-[#0e6877] border-[#0e6877] shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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
                  <label className="text-[11px] font-bold text-slate-650 tracking-wide uppercase">Zalo User ID nhận tin</label>
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
            </form>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6">
            <button
              onClick={handleSendNotification}
              disabled={submitting}
              className="w-full py-3 bg-[#0e6877] hover:bg-[#0c5966] text-white text-xs font-bold uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] duration-200 shadow-sm disabled:opacity-50 border-none cursor-pointer"
            >
              <Send size={13} />
              {submitting ? 'Đang gửi...' : 'Gửi thông báo ngay'}
            </button>
          </div>
        </div>

        {/* Right Side: History List */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6.5 shadow-sm flex flex-col min-h-[550px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#ecf6f7] text-[#0e6877] rounded-xl">
                <History size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Lịch sử gửi thông báo</h3>
                <p className="text-[11px] text-slate-400 font-medium">Nhật ký tin nhắn được ghi nhận</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-[#0e6877] bg-[#ecf6f7] px-2.5 py-1 rounded-full border border-[#0e6877]/10">
              Tổng số: {history.length}
            </span>
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-[#0e6877] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 text-xs">Đang tải nhật ký...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs py-16">
              <Bell size={24} className="text-slate-350 mb-2" />
              Chưa có thông báo nào được gửi trước đây.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin max-h-[480px] pt-4">
              {history.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-white border border-slate-150 rounded-2xl p-4 hover:shadow-xs hover:border-[#0e6877]/15 transition-all duration-200 flex gap-4 relative overflow-hidden group"
                >
                  {/* Left status color strip */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    item.type === 'order' ? 'bg-indigo-500' : 'bg-[#0e6877]'
                  }`} />
                  
                  <div className="flex-1 space-y-1.5 pl-1.5">
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="text-xs font-bold text-slate-850 flex items-center gap-2 leading-snug">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
                        {item.date}
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-slate-550 leading-relaxed pr-6">{item.content}</p>
                    
                    <div className="flex items-center gap-4 pt-1.5 border-t border-slate-50/50 mt-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-slate-450 font-bold bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                        {item.type === 'order' ? (
                          <AlertCircle size={10} className="text-indigo-500" />
                        ) : (
                          <Tag size={10} className="text-[#0e6877]" />
                        )}
                        {item.type === 'order' ? 'Giao dịch' : 'Hệ thống'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                        {item.zaloUserId ? <User size={10} /> : <Users size={10} />}
                        {item.zaloUserId ? `Cá nhân (Zalo ID: ${item.zaloUserId.substring(0, 10)}...)` : 'Gửi Broadcast'}
                      </span>
                    </div>
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
