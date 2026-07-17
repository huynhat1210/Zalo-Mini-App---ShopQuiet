import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiRequest } from '../../utils/api';
import { Search, Send, Clock, User as UserIcon, HelpCircle, Package } from 'lucide-react';

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Get server base URL from environment or configuration
  // NestJS Backend runs on same host but port 3000 in dev
  const getBackendUrl = () => {
    // Standard dev fallback
    return window.location.origin.includes('localhost') ? 'http://localhost:3000' : 'https://zalo-mini-app-shopquiet.onrender.com';
  };
  const serverUrl = getBackendUrl();

  // 1. Fetch Chat Sessions list
  const fetchSessions = async () => {
    try {
      const res = await apiRequest<ChatSession[]>('/chat/sessions');
      if (Array.isArray(res)) {
        setSessions(res);
      }
    } catch (e) {
      console.error('Failed to fetch chat sessions:', e);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchShopStatus = async () => {
    try {
      const res = await apiRequest<{ status: 'ONLINE' | 'OFFLINE' }>('/cms/settings/shop-status');
      if (res && res.status) {
        setShopStatus(res.status);
      }
    } catch (e) {
      console.error('Failed to fetch shop status:', e);
    }
  };

  const toggleShopStatus = async () => {
    const nextStatus = shopStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    try {
      setShopStatus(nextStatus);
      await apiRequest('/cms/settings/shop-status', 'POST', { status: nextStatus });
    } catch (e) {
      console.error('Failed to toggle shop status:', e);
      setShopStatus(shopStatus); // revert
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchShopStatus();
  }, []);

  // 2. Connect Socket.IO
  useEffect(() => {
    const socket = io(serverUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO connected from CMS');
      // Join admin room to receive updates
      socket.emit('join', { roomId: 'admin' });
    });

    socket.on('sessions_list', (updatedSessions: ChatSession[]) => {
      setSessions(updatedSessions);
    });

    socket.on('message', (msg: Message) => {
      // If we are looking at the active chat room, push message real-time
      if (activeSession && msg.zaloUserId === activeSession.zaloUserId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Mark as read immediately on backend
        socket.emit('mark_read', { zaloUserId: activeSession.zaloUserId, sender: 'USER' });
      }
      // Re-fetch sessions list to update unread indicator or last message contents
      fetchSessions();
    });

    return () => {
      socket.disconnect();
    };
  }, [activeSession, serverUrl]);

  // 3. Fetch active room messages and context profile
  useEffect(() => {
    if (!activeSession) return;

    const fetchMessagesAndContext = async () => {
      setLoadingMessages(true);
      try {
        const [history, orders, users] = await Promise.all([
          apiRequest<Message[]>(`/chat/messages?zaloUserId=${activeSession.zaloUserId}`),
          apiRequest<Order[]>('/orders'),
          apiRequest<any[]>('/users'),
        ]);

        if (Array.isArray(history)) {
          setMessages(history);
        }

        // Filter user orders
        if (Array.isArray(orders)) {
          setUserOrders(orders.filter((o) => o.zaloUserId === activeSession.zaloUserId));
        }

        // Find user profile details
        if (Array.isArray(users)) {
          const profile = users.find((u) => u.zaloId === activeSession.zaloUserId);
          setUserProfile(profile || null);
        }

        // Mark user messages as read on gateway
        if (socketRef.current) {
          socketRef.current.emit('mark_read', { zaloUserId: activeSession.zaloUserId, sender: 'USER' });
        }
      } catch (e) {
        console.error('Failed to load chat thread context:', e);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessagesAndContext();
  }, [activeSession]);

  // Auto-scroll chat box to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || !activeSession) return;

    if (socketRef.current) {
      socketRef.current.emit('send_message', {
        zaloUserId: activeSession.zaloUserId,
        sender: 'ADMIN',
        content: inputValue.trim(),
      });
      setInputValue('');
    }
  };

  const filteredSessions = sessions.filter((s) =>
    s.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMessageContent = (content: string) => {
    if (content.startsWith('[PRODUCT_CONTEXT]')) {
      try {
        const payloadStr = content.substring('[PRODUCT_CONTEXT]'.length).trim();
        const prod = JSON.parse(payloadStr);

        let imgUrl = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=150&q=80';
        try {
          const parsedImgs = JSON.parse(prod.image);
          if (Array.isArray(parsedImgs) && parsedImgs.length > 0) {
            imgUrl = parsedImgs[0];
          }
        } catch (e) {
          if (typeof prod.image === 'string' && prod.image) {
            imgUrl = prod.image;
          }
        }

        const fullImg = imgUrl.startsWith('http') ? imgUrl : `${serverUrl}${imgUrl}`;

        return (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex gap-3 text-left max-w-sm">
            <img src={fullImg} alt={prod.name} className="w-12 h-12 object-cover rounded-xl border border-emerald-150 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[8px] bg-emerald-600 text-white px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Khách đang xem</span>
              <h4 className="text-xs font-bold text-emerald-950 truncate mt-1 leading-snug">{prod.name}</h4>
              <p className="text-[10px] text-emerald-800 font-extrabold mt-0.5">{prod.price?.toLocaleString('vi-VN')} đ</p>
            </div>
          </div>
        );
      } catch (e) {
        return <span className="italic text-xs text-slate-400">Không thể tải thông tin sản phẩm</span>;
      }
    }

    return <p className="text-xs leading-relaxed font-semibold break-words whitespace-pre-wrap">{content}</p>;
  };

  const STATUS_BG: Record<string, string> = {
    PROCESSING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    SHIPPED: 'bg-blue-50 text-blue-700 border-blue-200',
    DELIVERED: 'bg-green-50 text-green-700 border-green-200',
    CANCELLED: 'bg-red-50 text-red-700 border-red-200',
    PENDING_PAYMENT: 'bg-orange-50 text-orange-700 border-orange-200',
    RETURN_REQUESTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    RETURNED: 'bg-neutral-50 text-neutral-600 border-neutral-200',
  };

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-64px)] bg-[#fbf9f7]">
      {/* 1. Left Sessions list */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col h-full">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3 shrink-0">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-left">Hộp thư hỗ trợ</h2>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm khách hàng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-teal-500 font-semibold transition-colors"
            />
            <Search className="absolute left-3 top-3 text-slate-450" size={14} />
          </div>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
          {loadingSessions ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-slate-400">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Đang tải hộp thư...</span>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <HelpCircle className="mx-auto mb-2 text-slate-350" size={24} />
              Không có cuộc hội thoại nào
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = activeSession?.zaloUserId === session.zaloUserId;
              return (
                <button
                  key={session.zaloUserId}
                  onClick={() => setActiveSession(session)}
                  className={`w-full p-4 flex gap-3 text-left transition-colors border-none bg-transparent cursor-pointer ${
                    isActive ? 'bg-teal-50/40 hover:bg-teal-50/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <img
                    src={session.userAvatar}
                    alt={session.userName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-150 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{session.userName}</h4>
                      <span className="text-[9px] text-slate-450 flex items-center gap-1">
                        <Clock size={8} />
                        {new Date(session.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <p className={`text-[11px] mt-1 truncate ${
                      session.unreadCount > 0 ? 'text-slate-900 font-bold' : 'text-slate-455'
                    }`}>
                      {session.lastMessage.startsWith('[PRODUCT_CONTEXT]') ? '📷 [Sản phẩm quan tâm]' : session.lastMessage}
                    </p>
                  </div>

                  {session.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center shrink-0 self-center">
                      {session.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Middle Chat Thread */}
      <div className="flex-1 flex flex-col h-full bg-[#fbf9f7]">
        {!activeSession ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
            <div className="w-16 h-16 bg-white border border-slate-150 text-[#0e6877] rounded-3xl flex items-center justify-center text-2xl shadow-sm">💬</div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-700">Tư vấn khách hàng ShopQuiet</h3>
              <p className="text-xs text-slate-450 mt-1 max-w-sm">Chọn một cuộc hội thoại từ danh sách bên trái để bắt đầu chat và hỗ trợ khách hàng của bạn.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Active thread header */}
            <div className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
              <div className="flex items-center gap-3">
                <img
                  src={activeSession.userAvatar}
                  alt={activeSession.userName}
                  className="w-10 h-10 rounded-full object-cover border border-slate-150"
                />
                <div className="text-left">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">{activeSession.userName}</h3>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Trực tuyến
                  </span>
                </div>
              </div>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 scrollbar-thin">
              {loadingMessages ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                  <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Đang tải tin nhắn...</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isShop = msg.sender === 'ADMIN';
                  return (
                    <div key={msg.id} className={`flex ${isShop ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4.5 py-3 shadow-2xs ${
                        isShop 
                          ? 'bg-[#0e6877] text-white rounded-tr-none' 
                          : 'bg-white text-slate-800 border border-slate-150 rounded-tl-none'
                      }`}>
                        {renderMessageContent(msg.content)}
                        <span className={`block text-[7px] text-right mt-1.5 font-bold uppercase tracking-wider ${
                          isShop ? 'text-white/60' : 'text-slate-450/70'
                        }`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input send bar */}
            <div className="bg-white p-4 border-t border-slate-200 flex items-center gap-4 shrink-0">
              <input
                type="text"
                placeholder="Nhập phản hồi chăm sóc khách hàng..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-slate-50 text-xs px-4 py-3.5 rounded-2xl outline-none focus:bg-slate-100 border border-slate-200 focus:border-teal-500 font-semibold"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="w-11 h-11 bg-[#0e6877] hover:bg-[#0c5966] text-white rounded-2xl flex items-center justify-center transition-all cursor-pointer disabled:bg-slate-150 border-none active:scale-95 shadow-md shadow-teal-700/10"
              >
                <Send size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* 3. Right User details & order history context */}
      {activeSession && (
        <div className="w-80 border-l border-slate-200 bg-white flex flex-col h-full p-5 shrink-0 overflow-y-auto text-left scrollbar-thin">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-1.5">
            <UserIcon size={14} className="text-[#0e6877]" />
            Hồ sơ khách hàng
          </h3>

          {/* User details */}
          <div className="py-4 space-y-3.5 border-b border-slate-100">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-450 font-semibold">Thành viên:</span>
              <span className="px-2 py-0.5 bg-[#ecf6f7] text-[#0e6877] font-extrabold text-[10px] rounded-full uppercase">
                {userProfile?.membershipTier || 'Đồng'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-450 font-semibold">Đã tích lũy:</span>
              <span className="font-extrabold text-slate-700">
                {userProfile?.totalSpent?.toLocaleString('vi-VN') || 0} đ
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-450 font-semibold">Giới tính:</span>
              <span className="font-bold text-slate-600 uppercase text-[10px]">
                {userProfile?.gender === 'female' ? 'Nữ' : userProfile?.gender === 'male' ? 'Nam' : 'Chưa cập nhật'}
              </span>
            </div>
            {userProfile?.phone && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-450 font-semibold">Số điện thoại:</span>
                <span className="font-bold text-slate-700">{userProfile.phone}</span>
              </div>
            )}
          </div>

          {/* User recent orders */}
          <div className="py-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Package size={14} className="text-[#0e6877]" />
              Lịch sử mua hàng ({userOrders.length})
            </h3>
            
            <div className="space-y-3">
              {userOrders.length === 0 ? (
                <p className="text-[11px] text-slate-450 italic py-2">Khách hàng chưa có đơn hàng nào.</p>
              ) : (
                userOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="border border-slate-150 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-1.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-700">#{order.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${STATUS_BG[order.status]}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-450 font-medium">{new Date(order.createdAt).toLocaleDateString()}</span>
                      <span className="font-extrabold text-[#0e6877]">{order.totalAmount.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;
