import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../utils/api';
import { useToast } from '../contexts';
import { 
  Bot, 
  X, 
  Send, 
  AlertTriangle, 
  Package, 
  ShoppingBag, 
  Crown, 
  Sparkles, 
  RefreshCw
} from 'lucide-react';

interface AiOpsAlert {
  id: string;
  type: 'LOW_STOCK' | 'STALE_ORDER' | 'RETURN_REQUEST' | 'DEMAND_SURGE' | 'VIP_MILESTONE';
  title: string;
  message: string;
  time: string;
  severity: 'high' | 'medium' | 'info';
  actionType: 'RESTOCK_ITEM' | 'VIEW_ORDERS' | 'VIEW_RETURNS' | 'FLASH_SALE' | 'GIFT_VIP_VOUCHER';
  actionPayload: any;
  isRead: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'BOT' | 'USER';
  text: string;
  time: string;
  alertData?: AiOpsAlert;
}

export const AiOpsChatbox: React.FC = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll live alerts from NestJS Gemini AI Ops API every 15s
  const fetchAlerts = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await apiRequest<{ alerts: AiOpsAlert[]; unreadCount: number }>('/cms/ai-ops/alerts');
      if (res) {
        setUnreadCount(res.unreadCount || 0);

        // Convert new alerts to chat messages if empty
        if (chatHistory.length === 0 && res.alerts.length > 0) {
          const initMsgs: ChatMessage[] = [
            {
              id: 'init-msg',
              sender: 'BOT',
              text: 'Xin chào Admin! 🤖 Tôi là Trợ Lý Gemini AI Vận Hành Doanh Nghiệp. Tôi vừa tự động quét hệ thống và phát hiện các vấn đề cần bạn xử lý:',
              time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            },
            ...res.alerts.map((a) => ({
              id: `alert-msg-${a.id}`,
              sender: 'BOT' as const,
              text: a.message,
              time: a.time,
              alertData: a,
            })),
          ];
          setChatHistory(initMsgs);
        }
      }
    } catch (e) {
      console.error('Failed to fetch AI ops alerts:', e);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => fetchAlerts(true), 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (unreadCount > 0) {
        apiRequest('/cms/ai-ops/mark-read', 'POST', {}).catch(() => {});
        setUnreadCount(0);
      }
    }
  }, [isOpen, chatHistory]);

  const handleExecuteAction = async (alert: AiOpsAlert) => {
    try {
      setExecutingId(alert.id);
      const res = await apiRequest<{ success: boolean; message: string }>('/cms/ai-ops/execute-action', 'POST', {
        actionType: alert.actionType,
        payload: alert.actionPayload,
      });

      if (res.success) {
        toastSuccess('Gemini AI Thực Thi Thành Công', res.message);
        
        // Append confirmation message in chat
        setChatHistory((prev) => [
          ...prev,
          {
            id: `done-${Date.now()}`,
            sender: 'BOT',
            text: `✅ ${res.message}`,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);

        // Re-fetch alerts
        fetchAlerts(true);
      } else {
        toastError('Lỗi thực thi', res.message);
      }
    } catch (err: any) {
      toastError('Lỗi thực thi', err.message || 'Lỗi kết nối.');
    } finally {
      setExecutingId(null);
    }
  };

  const handleSendPrompt = async () => {
    const text = inputValue.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'USER',
      text,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatHistory((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const res = await apiRequest<{ reply: string }>('/cms/ai-ops/ask-gemini', 'POST', { prompt: text });
      setChatHistory((prev) => [
        ...prev,
        {
          id: `bot-reply-${Date.now()}`,
          sender: 'BOT',
          text: res.reply || '🤖 Trợ lý Gemini AI đã xử lý xong yêu cầu.',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'BOT',
          text: '⚠️ Không thể kết nối với Gemini AI. Vui lòng kiểm tra lại.',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderActionButton = (alert: AiOpsAlert) => {
    const isExec = executingId === alert.id;
    switch (alert.actionType) {
      case 'RESTOCK_ITEM':
        return (
          <button
            onClick={() => handleExecuteAction(alert)}
            disabled={isExec}
            className="mt-2 px-3 py-1.5 bg-[#0e6877] hover:bg-[#0b5460] text-white text-[11px] font-bold rounded-xl transition-all flex items-center gap-1.5 border-none cursor-pointer active:scale-95 shadow-2xs"
          >
            {isExec ? <RefreshCw size={12} className="animate-spin" /> : <Package size={12} />}
            ➕ Nhập Thêm 25 Hàng Ngay
          </button>
        );
      case 'VIEW_ORDERS':
        return (
          <button
            onClick={() => (window.location.href = '/orders')}
            className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-xl transition-all flex items-center gap-1.5 border-none cursor-pointer active:scale-95 shadow-2xs"
          >
            <ShoppingBag size={12} />
            🛒 Đến Trang Đơn Hàng
          </button>
        );
      case 'VIEW_RETURNS':
        return (
          <button
            onClick={() => (window.location.href = '/orders')}
            className="mt-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-xl transition-all flex items-center gap-1.5 border-none cursor-pointer active:scale-95 shadow-2xs"
          >
            <AlertTriangle size={12} />
            👁️ Xem Yêu Cầu Đổi Trả
          </button>
        );
      case 'GIFT_VIP_VOUCHER':
        return (
          <button
            onClick={() => handleExecuteAction(alert)}
            disabled={isExec}
            className="mt-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl transition-all flex items-center gap-1.5 border-none cursor-pointer active:scale-95 shadow-2xs"
          >
            {isExec ? <RefreshCw size={12} className="animate-spin" /> : <Crown size={12} />}
            🎁 Tặng Voucher Tri Ân VIP
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* ── Floating Launcher Button with Red Badge ── */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-14 h-14 rounded-full bg-gradient-to-r from-[#0e6877] to-[#168a9e] text-white shadow-xl hover:shadow-2xl flex items-center justify-center border-2 border-white cursor-pointer active:scale-90 transition-all group"
          title="Mở Trợ Lý Gemini AI Vận Hành Doanh Nghiệp"
        >
          <Sparkles className="w-7 h-7 text-teal-100 group-hover:rotate-12 transition-transform" />
          
          {/* Pulsing Red Unread Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce">
              +{unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Drawer Slide-Over AI Alert Center ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl border-l border-slate-200 animate-slide-left">

            {/* Header */}
            <div className="bg-gradient-to-r from-[#0e6877] to-[#168a9e] text-white p-4 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center border border-white/30 text-white font-bold">
                  🤖
                </div>
                <div>
                  <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                    Gemini AI Operations Center
                    <span className="text-[9px] font-bold bg-teal-400/30 px-1.5 py-0.5 rounded text-teal-100 font-mono">1.5 Flash</span>
                  </h3>
                  <p className="text-[10px] text-teal-100/90 mt-0.5">Trợ lý giám sát & xử lý sự cố doanh nghiệp</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchAlerts()}
                  className="p-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg border-none cursor-pointer"
                  title="Quét lại hệ thống"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 bg-white/15 hover:bg-white/25 text-white rounded-full border-none cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body Alert Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50">
              {chatHistory.map((msg) => {
                const isUser = msg.sender === 'USER';
                const alert = msg.alertData;
                return (
                  <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1 animate-fadeIn`}>
                    <div className="flex items-start gap-2 max-w-[92%]">
                      {!isUser && (
                        <div className="w-7 h-7 rounded-xl bg-[#0e6877] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                          🤖
                        </div>
                      )}

                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isUser
                            ? 'bg-[#0e6877] text-white rounded-br-xs shadow-xs font-medium'
                            : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs shadow-2xs'
                        }`}
                      >
                        {alert && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                              {alert.title}
                            </span>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap font-medium">{msg.text}</p>

                        {/* 1-Click Action Button */}
                        {alert && renderActionButton(alert)}
                      </div>
                    </div>

                    <span className="text-[9px] text-slate-400 px-1 font-medium">{msg.time}</span>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium italic animate-pulse">
                  <Bot size={14} className="animate-spin text-[#0e6877]" />
                  <span>Gemini AI đang phân tích dữ liệu kho & đơn hàng...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                placeholder="Hỏi Gemini AI (VD: Tóm tắt doanh thu, kiểm tra kho...)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
                className="flex-1 bg-slate-100 border border-slate-200 focus:border-[#0e6877] focus:bg-white rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none transition-all shadow-2xs font-medium"
              />
              <button
                onClick={handleSendPrompt}
                disabled={!inputValue.trim()}
                className="w-10 h-10 rounded-2xl bg-[#0e6877] disabled:bg-slate-300 text-white flex items-center justify-center font-bold border-none cursor-pointer active:scale-95 transition-transform shadow-xs shrink-0"
              >
                <Send size={15} />
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default AiOpsChatbox;
