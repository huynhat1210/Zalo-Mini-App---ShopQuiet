import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiRequest } from '../../utils/api';
import { PaginationComponent } from '../../components';
import {
  Search, Send, HelpCircle, Package, Zap,
  ShoppingBag, Star, Phone, Crown, MessageSquare,
  Wifi, WifiOff, ChevronRight
} from 'lucide-react';

interface ChatSession {
  zaloUserId: string;
  userName: string;
  userAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface Message {
  id: number;
  zaloUserId: string;
  sender: 'USER' | 'ADMIN';
  content: string;
  read: boolean;
  createdAt: string;
}

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  zaloUserId: string;
}

const CANNED_RESPONSES = [
  { label: 'Chào hỏi', text: 'Xin chào! ShopQuiet rất vui được hỗ trợ bạn 😊 Bạn cần tư vấn về sản phẩm nào ạ?' },
  { label: 'Đặt hàng', text: 'Bạn có thể đặt hàng ngay trong ứng dụng Zalo Mini App của chúng tôi. Cần hỗ trợ thêm không ạ?' },
  { label: 'Giao hàng', text: 'Đơn hàng thường được giao trong 2-3 ngày làm việc. Bạn sẽ nhận được thông báo khi đơn được xử lý!' },
  { label: 'Đổi/trả', text: 'Sản phẩm có thể đổi/trả trong 7 ngày kể từ ngày nhận hàng. Bạn vui lòng giữ lại hóa đơn và bao bì nhé!' },
  { label: 'Thanh toán', text: 'Chúng tôi hỗ trợ thanh toán qua ZaloPay và COD (tiền mặt khi nhận hàng). Bạn muốn dùng phương thức nào ạ?' },
  { label: 'Cảm ơn', text: 'Cảm ơn bạn đã tin tưởng ShopQuiet! Chúc bạn có trải nghiệm mua sắm tuyệt vời 🎉' },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ TT', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  PROCESSING: { label: 'Xử lý', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  SHIPPED: { label: 'Đang giao', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  DELIVERED: { label: 'Đã giao', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  COMPLETED: { label: 'Hoàn thành', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Đã hủy', color: 'bg-red-50 text-red-700 border-red-200' },
  RETURN_REQUESTED: { label: 'Trả hàng', color: 'bg-purple-50 text-purple-700 border-purple-200' },
};

export const Support: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [shopStatus, setShopStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [showCanned, setShowCanned] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Pagination State for Chat Sessions
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getBackendUrl = () =>
    window.location.origin.includes('localhost')
      ? 'http://localhost:3000'
      : 'https://zalo-mini-app-shopquiet.onrender.com';
  const serverUrl = getBackendUrl();

  const fetchSessions = async () => {
    try {
      const res = await apiRequest<ChatSession[]>('/chat/sessions');
      if (Array.isArray(res)) setSessions(res);
    } catch (e) {
      console.error('Failed to fetch chat sessions:', e);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchShopStatus = async () => {
    try {
      const res = await apiRequest<{ status: 'ONLINE' | 'OFFLINE' }>('/cms/settings/shop-status');
      if (res?.status) setShopStatus(res.status);
    } catch (e) {
      console.error('Failed to fetch shop status:', e);
    }
  };

  const toggleShopStatus = async () => {
    const nextStatus = shopStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    setTogglingStatus(true);
    try {
      setShopStatus(nextStatus);
      await apiRequest('/cms/settings/shop-status', 'POST', { status: nextStatus });
    } catch (e) {
      console.error('Failed to toggle shop status:', e);
      setShopStatus(shopStatus);
    } finally {
      setTogglingStatus(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchShopStatus();
  }, []);

  useEffect(() => {
    const socket = io(serverUrl);
    socketRef.current = socket;
    socket.on('connect', () => {
      socket.emit('join', { roomId: 'admin' });
    });
    socket.on('sessions_list', (updatedSessions: ChatSession[]) => {
      setSessions(updatedSessions);
    });
    socket.on('message', (msg: Message) => {
      if (activeSession && msg.zaloUserId === activeSession.zaloUserId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        socket.emit('mark_read', { zaloUserId: activeSession.zaloUserId, sender: 'USER' });
      }
      fetchSessions();
    });
    return () => { socket.disconnect(); };
  }, [activeSession, serverUrl]);

  useEffect(() => {
    if (!activeSession) return;
    const fetchThread = async () => {
      setLoadingMessages(true);
      try {
        const [history, orders, users] = await Promise.all([
          apiRequest<Message[]>(`/chat/messages?zaloUserId=${activeSession.zaloUserId}`),
          apiRequest<Order[]>('/orders/admin/all'),
          apiRequest<any[]>('/users'),
        ]);
        if (Array.isArray(history)) setMessages(history);
        if (Array.isArray(orders)) setUserOrders(orders.filter((o) => o.zaloUserId === activeSession.zaloUserId));
        if (Array.isArray(users)) {
          const profile = users.find((u) => u.zaloId === activeSession.zaloUserId);
          setUserProfile(profile || null);
        }
        socketRef.current?.emit('mark_read', { zaloUserId: activeSession.zaloUserId, sender: 'USER' });
      } catch (e) {
        console.error('Failed to load chat thread:', e);
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchThread();
  }, [activeSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || !activeSession) return;
    socketRef.current?.emit('send_message', {
      zaloUserId: activeSession.zaloUserId,
      sender: 'ADMIN',
      content: inputValue.trim(),
    });
    setInputValue('');
    setShowCanned(false);
    inputRef.current?.focus();
  };

  const handleCannedResponse = (text: string) => {
    setInputValue(text);
    setShowCanned(false);
    inputRef.current?.focus();
  };

  const filteredSessions = sessions.filter((s) =>
    s.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMessageContent = (content: string, isShop: boolean) => {
    if (content.startsWith('[PRODUCT_CONTEXT]')) {
      try {
        const payloadStr = content.substring('[PRODUCT_CONTEXT]'.length).trim();
        const prod = JSON.parse(payloadStr);
        let imgUrl = '';
        try {
          const parsedImgs = JSON.parse(prod.image);
          if (Array.isArray(parsedImgs) && parsedImgs.length > 0) imgUrl = parsedImgs[0];
        } catch {
          if (typeof prod.image === 'string') imgUrl = prod.image;
        }
        const fullImg = imgUrl.startsWith('http') ? imgUrl : `${serverUrl}${imgUrl}`;
        return (
          <div
            className={`flex gap-3 items-start rounded-2xl p-3 max-w-xs ${
              isShop ? 'bg-white/20 backdrop-blur-xs text-white' : 'bg-slate-50 border border-slate-200 text-slate-800'
            }`}
          >
            {fullImg && (
              <img src={fullImg} alt={prod.name} className="w-14 h-14 object-cover rounded-xl shrink-0 border border-slate-200" />
            )}
            <div className="flex-1 min-w-0">
              <span
                className={`inline-block text-[8px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider mb-1 ${
                  isShop ? 'bg-white/30 text-white' : 'bg-teal-50 text-[#0e6877] border border-teal-200'
                }`}
              >
                📦 Đang hỏi sản phẩm
              </span>
              <h4 className={`text-xs font-bold truncate leading-snug ${isShop ? 'text-white' : 'text-slate-800'}`}>
                {prod.name}
              </h4>
              <p className={`text-[11px] font-black mt-0.5 ${isShop ? 'text-white/90' : 'text-[#0e6877]'}`}>
                {Number(prod.price)?.toLocaleString('vi-VN')} đ
              </p>
            </div>
          </div>
        );
      } catch {
        return <p className="text-xs italic opacity-70">Xem sản phẩm</p>;
      }
    }
    return <p className="text-xs leading-relaxed font-medium break-words whitespace-pre-wrap">{content}</p>;
  };

  const getTierBadge = (tier?: string) => {
    if (!tier) return { label: 'Đồng', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
    if (tier.toLowerCase().includes('kim') || tier.toLowerCase().includes('diamond'))
      return { label: tier, bg: 'bg-purple-50 text-purple-700 border-purple-200' };
    if (tier.toLowerCase().includes('vàng') || tier.toLowerCase().includes('gold'))
      return { label: tier, bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (tier.toLowerCase().includes('bạc') || tier.toLowerCase().includes('silver'))
      return { label: tier, bg: 'bg-slate-100 text-slate-600 border-slate-200' };
    return { label: tier, bg: 'bg-orange-50 text-orange-700 border-orange-200' };
  };

  const tier = getTierBadge(userProfile?.membershipTier);
  const totalMessages = sessions.reduce((acc, s) => acc + s.unreadCount, 0);

  return (
    <div className="flex-1 flex overflow-hidden h-full" style={{ background: '#f4f6f9' }}>

      {/* ═══ LEFT: Sessions Panel ═══ */}
      <div className="w-72 flex flex-col h-full bg-white border-r border-slate-200/80 shrink-0">
        
        {/* Panel Header */}
        <div className="px-4 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-black text-slate-800 tracking-tight">Hỗ trợ khách hàng</h2>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                {totalMessages > 0 ? `${totalMessages} tin nhắn chưa đọc` : 'Tất cả đã đọc'}
              </p>
            </div>
            {/* Online/Offline Toggle */}
            <button
              onClick={toggleShopStatus}
              disabled={togglingStatus}
              title={shopStatus === 'ONLINE' ? 'Shop đang mở — Nhấn để tắt' : 'Shop đang tắt — Nhấn để mở'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border-none cursor-pointer transition-all duration-300 ${
                shopStatus === 'ONLINE'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-400/30 hover:bg-emerald-600'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              {shopStatus === 'ONLINE' ? <Wifi size={10} /> : <WifiOff size={10} />}
              {shopStatus === 'ONLINE' ? 'ONLINE' : 'OFFLINE'}
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="text"
              placeholder="Tìm khách hàng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-2.5 outline-none focus:border-[#0e6877] font-semibold transition-all placeholder-slate-400"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-3">
          {loadingSessions ? (
            <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
              <div className="w-7 h-7 border-[3px] border-[#0e6877] border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Đang tải...</span>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <HelpCircle className="mx-auto text-slate-300" size={28} />
              <p className="text-xs text-slate-400 font-semibold">Không có hội thoại nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((session) => {
              const isActive = activeSession?.zaloUserId === session.zaloUserId;
              const hasUnread = session.unreadCount > 0;
              return (
                <button
                  key={session.zaloUserId}
                  onClick={() => setActiveSession(session)}
                  className={`w-full p-3 rounded-2xl flex gap-3 text-left transition-all duration-200 border-none cursor-pointer mb-1 ${
                    isActive
                      ? 'bg-[#0e6877] shadow-md shadow-[#0e6877]/20'
                      : hasUnread
                      ? 'bg-[#ecf6f7] hover:bg-[#ddf0f2]'
                      : 'bg-transparent hover:bg-slate-50'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={session.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.userName)}&background=0e6877&color=fff`}
                      alt={session.userName}
                      className={`w-10 h-10 rounded-full object-cover border-2 ${isActive ? 'border-white/40' : 'border-slate-200'}`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(session.userName)}&background=0e6877&color=fff`;
                      }}
                    />
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[8px] flex items-center justify-center border border-white">
                        {session.unreadCount > 9 ? '9+' : session.unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h4 className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
                        {session.userName}
                      </h4>
                      <span className={`text-[9px] font-semibold shrink-0 ml-1 ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                        {new Date(session.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`text-[10px] mt-0.5 truncate ${
                      isActive ? 'text-white/80' : hasUnread ? 'text-slate-800 font-bold' : 'text-slate-500 font-medium'
                    }`}>
                      {session.lastMessage.startsWith('[PRODUCT_CONTEXT]') ? '📦 Hỏi về sản phẩm' : session.lastMessage}
                    </p>
                  </div>
                  
                  {isActive && <ChevronRight size={12} className="text-white/60 shrink-0 self-center" />}
                </button>
              );
            })}
            
            <PaginationComponent
              currentPage={currentPage}
              totalPages={Math.ceil(filteredSessions.length / itemsPerPage)}
              totalItems={filteredSessions.length}
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

      {/* ═══ MIDDLE: Chat Thread ═══ */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {!activeSession ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-5">
            <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-[#0e6877] to-[#1a9eb5] flex items-center justify-center shadow-xl shadow-[#0e6877]/20">
              <MessageSquare size={32} className="text-white" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-black text-slate-700">Tư vấn khách hàng</h3>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-medium">
                Chọn một cuộc hội thoại từ danh sách bên trái để bắt đầu hỗ trợ.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black ${
                shopStatus === 'ONLINE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${shopStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                Shop đang {shopStatus === 'ONLINE' ? 'hoạt động' : 'tạm nghỉ'}
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 px-5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={activeSession.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeSession.userName)}&background=0e6877&color=fff`}
                    alt={activeSession.userName}
                    className="w-9 h-9 rounded-full object-cover border-2 border-slate-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeSession.userName)}&background=0e6877&color=fff`;
                    }}
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800">{activeSession.userName}</h3>
                  <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Đang hoạt động</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-500 font-semibold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                  {userOrders.length} đơn hàng
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 scrollbar-thin" style={{ background: '#f4f6f9' }}>
              {loadingMessages ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="w-7 h-7 border-[3px] border-[#0e6877] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Đang tải tin nhắn...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                  <MessageSquare size={32} className="text-slate-300" />
                  <p className="text-xs font-semibold">Chưa có tin nhắn nào</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isShop = msg.sender === 'ADMIN';
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isShop ? 'justify-end' : 'justify-start'}`}>
                      {!isShop && (
                        <img
                          src={activeSession.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeSession.userName)}&background=0e6877&color=fff`}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0 mb-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeSession.userName)}&background=0e6877&color=fff`;
                          }}
                        />
                      )}
                      <div className={`max-w-[65%] ${isShop ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                          isShop
                            ? 'bg-gradient-to-br from-[#0e6877] to-[#1a9eb5] text-white rounded-br-md'
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-md'
                        }`}>
                          {renderMessageContent(msg.content, isShop)}
                        </div>
                        <span className={`text-[8px] font-bold uppercase tracking-wider px-1 ${isShop ? 'text-right text-slate-400' : 'text-slate-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Canned Responses Panel */}
            {showCanned && (
              <div className="bg-white border-t border-slate-200 px-4 py-3 flex flex-wrap gap-2 shrink-0">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider w-full mb-1 flex items-center gap-1.5">
                  <Zap size={10} className="text-amber-500" /> Phản hồi nhanh
                </span>
                {CANNED_RESPONSES.map((cr) => (
                  <button
                    key={cr.label}
                    onClick={() => handleCannedResponse(cr.text)}
                    className="px-3 py-1.5 bg-[#ecf6f7] hover:bg-[#0e6877] text-[#0e6877] hover:text-white text-[10px] font-bold rounded-xl border-none cursor-pointer transition-all duration-200 shrink-0"
                  >
                    {cr.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="bg-white border-t border-slate-200 p-3 flex items-center gap-2 shrink-0">
              {/* Canned toggle */}
              <button
                onClick={() => setShowCanned(!showCanned)}
                title="Phản hồi nhanh"
                className={`w-9 h-9 rounded-xl flex items-center justify-center border-none cursor-pointer transition-all shrink-0 ${
                  showCanned ? 'bg-[#0e6877] text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Zap size={14} />
              </button>

              <input
                ref={inputRef}
                type="text"
                placeholder="Nhập phản hồi khách hàng..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-slate-50 text-xs px-4 py-3 rounded-2xl outline-none focus:bg-white border border-slate-200 focus:border-[#0e6877] font-semibold transition-all placeholder-slate-400"
              />

              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="w-9 h-9 bg-[#0e6877] hover:bg-[#0c5966] text-white rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-none active:scale-95 shadow-md shadow-[#0e6877]/20 shrink-0"
              >
                <Send size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* ═══ RIGHT: Customer Context Panel ═══ */}
      {activeSession && (
        <div className="w-72 border-l border-slate-200 bg-white flex flex-col h-full shrink-0 overflow-hidden">
          
          {/* Customer Profile Hero */}
          <div className="bg-gradient-to-br from-[#0e6877] to-[#1a9eb5] p-5 shrink-0">
            <div className="flex items-center gap-3">
              <img
                src={activeSession.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeSession.userName)}&background=ffffff&color=0e6877`}
                alt={activeSession.userName}
                className="w-12 h-12 rounded-full border-2 border-white/40 object-cover shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeSession.userName)}&background=ffffff&color=0e6877`;
                }}
              />
              <div className="min-w-0">
                <h3 className="text-sm font-black text-white truncate">{activeSession.userName}</h3>
                <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-black border ${tier.bg}`}>
                  <Crown size={8} />
                  {tier.label}
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-white/15 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-white/70 font-semibold">Chi tiêu</p>
                <p className="text-xs font-black text-white mt-0.5">
                  {userProfile?.totalSpent
                    ? `${(userProfile.totalSpent / 1000).toFixed(0)}K`
                    : '—'}đ
                </p>
              </div>
              <div className="bg-white/15 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-white/70 font-semibold">Đơn hàng</p>
                <p className="text-xs font-black text-white mt-0.5">{userOrders.length}</p>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="p-4 border-b border-slate-100 space-y-2.5 shrink-0">
            {userProfile?.phone && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-6 h-6 rounded-lg bg-[#ecf6f7] flex items-center justify-center shrink-0">
                  <Phone size={10} className="text-[#0e6877]" />
                </div>
                <span className="text-slate-700 font-semibold">{userProfile.phone}</span>
              </div>
            )}
            {userProfile?.email && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-6 h-6 rounded-lg bg-[#ecf6f7] flex items-center justify-center shrink-0">
                  <Star size={10} className="text-[#0e6877]" />
                </div>
                <span className="text-slate-700 font-semibold truncate">{userProfile.email}</span>
              </div>
            )}
            {!userProfile?.phone && !userProfile?.email && (
              <p className="text-[10px] text-slate-400 font-semibold italic">Chưa cập nhật thông tin liên hệ</p>
            )}
          </div>

          {/* Order History */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5 mb-3">
              <ShoppingBag size={11} className="text-[#0e6877]" />
              Lịch sử đơn hàng
              <span className="ml-auto bg-[#ecf6f7] text-[#0e6877] px-1.5 py-0.5 rounded-full font-black text-[9px]">
                {userOrders.length}
              </span>
            </h4>

            {userOrders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-slate-400">
                <Package size={24} className="text-slate-300" />
                <p className="text-[10px] font-semibold text-center">Khách hàng chưa có đơn hàng nào.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {userOrders.slice(0, 6).map((order) => {
                  const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: 'bg-slate-50 text-slate-600 border-slate-200' };
                  return (
                    <div key={order.id} className="bg-slate-50 hover:bg-[#f3f9fa] border border-slate-200 rounded-xl p-3 transition-all space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-700">#{String(order.id).slice(-6)}</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 font-semibold">
                          {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                        <span className="text-[10px] font-black text-[#0e6877]">
                          {order.totalAmount.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;
