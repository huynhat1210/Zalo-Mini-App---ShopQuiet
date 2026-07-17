import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useCart } from '../../App';
import { apiRequest, API_BASE_URL } from '../../utils/api';
import { IProduct } from '../../App.type';

interface Message {
  id: number;
  zaloUserId: string;
  sender: 'USER' | 'ADMIN';
  content: string;
  read: boolean;
  createdAt: string;
}

interface ChatOverlayProps {
  onClose: () => void;
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({ onClose }) => {
  const { zaloUser, chatContextProduct, setChatContextProduct, showToast, setSelectedProductDetail } = useCart();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const userId = zaloUser?.id || 'guest';
  const serverUrl = API_BASE_URL.replace('/api/v1', '');

  // 1. Fetch History on open
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await apiRequest<Message[]>(`/chat/messages?zaloUserId=${userId}`);
        setMessages(history);
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [userId]);

  // 2. Connect WebSockets (Socket.IO)
  useEffect(() => {
    // Connect socket
    const socket = io(serverUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO connected from Mini App');
      // Join specific room
      socket.emit('join', { roomId: userId });
    });

    socket.on('message', (msg: Message) => {
      setMessages((prev) => {
        // Prevent duplicate messages if already in list
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Mark as read if user is currently looking at it
      if (msg.sender === 'ADMIN') {
        socket.emit('mark_read', { zaloUserId: userId, sender: 'ADMIN' });
      }
    });

    // Mark all existing shop messages as read
    socket.emit('mark_read', { zaloUserId: userId, sender: 'ADMIN' });

    return () => {
      socket.disconnect();
    };
  }, [userId, serverUrl]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Auto-send product context if open from product-detail
  useEffect(() => {
    if (chatContextProduct && !loading) {
      const alreadySentContext = messages.some(
        (m) => m.sender === 'USER' && m.content.startsWith('[PRODUCT_CONTEXT]') && m.content.includes(`"id":${chatContextProduct.id}`)
      );

      if (!alreadySentContext) {
        // Auto send context message after small delay
        const timer = setTimeout(() => {
          handleSendMessage(
            `[PRODUCT_CONTEXT] ${JSON.stringify({
              id: chatContextProduct.id,
              name: chatContextProduct.name,
              price: chatContextProduct.price,
              image: chatContextProduct.images,
            })}`
          );
          // Clear context after sending so it doesn't duplicate
          setChatContextProduct(null);
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [chatContextProduct, loading, messages]);

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputValue.trim();
    if (!text) return;

    if (socketRef.current) {
      socketRef.current.emit('send_message', {
        zaloUserId: userId,
        sender: 'USER',
        content: text,
      });
    }

    if (!textToSend) {
      setInputValue('');
    }
  };

  const renderMessageContent = (content: string) => {
    if (content.startsWith('[PRODUCT_CONTEXT]')) {
      try {
        const payloadStr = content.substring('[PRODUCT_CONTEXT]'.length).trim();
        const prod = JSON.parse(payloadStr);

        let imgUrl = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=200&q=80';
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
          <div 
            onClick={() => {
              // Open product details modal
              onClose();
              setSelectedProductDetail(prod);
            }}
            className="bg-teal-50 border border-teal-150 p-2.5 rounded-2xl flex gap-3 cursor-pointer hover:bg-teal-100 transition-colors text-left max-w-xs shadow-xs"
          >
            <img src={fullImg} alt={prod.name} className="w-12 h-12 object-cover rounded-xl border border-teal-200 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[8px] bg-teal-600 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Đang xem</span>
              <h4 className="text-xs font-bold text-teal-950 truncate mt-1 leading-snug">{prod.name}</h4>
              <p className="text-[10px] text-teal-800 font-extrabold mt-0.5">{prod.price?.toLocaleString('vi-VN')} đ</p>
            </div>
          </div>
        );
      } catch (e) {
        return <span className="italic text-xs">Không thể xem sản phẩm</span>;
      }
    }

    return <p className="text-xs leading-relaxed font-medium break-words whitespace-pre-wrap">{content}</p>;
  };

  const quickTemplates = [
    'Sản phẩm này còn hàng không shop?',
    'Đơn hàng của mình khi nào giao?',
    'Shop có chính sách đổi trả như thế nào?',
  ];

  return (
    <div className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-xs flex flex-col justify-end animate-fade-in">
      <div className="w-full h-[85vh] bg-[#fbf9f7] rounded-t-[32px] flex flex-col overflow-hidden shadow-2xl border-t border-[#f0edeb] animate-slide-up">
        {/* Header */}
        <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-[#f0edeb] shadow-xs">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-1.5 -ml-1.5 hover:bg-neutral-100 rounded-full transition-colors active:scale-95 border-none bg-transparent cursor-pointer"
            >
              <svg className="w-5.5 h-5.5 text-textColor" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div className="text-left">
              <h3 className="text-xs font-black text-textColor uppercase tracking-wider flex items-center gap-1.5">
                ShopQuiet Support
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              </h3>
              <p className="text-[9px] text-textColor-variant font-medium mt-0.5">Thường phản hồi trong vài phút</p>
            </div>
          </div>
          <span className="text-[8px] font-extrabold text-[#526069]/65 bg-neutral-100 px-2.5 py-1 rounded-full uppercase tracking-wider border border-[#f0edeb]">Real-time</span>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4.5 scrollbar-thin">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-2.5 text-neutral-450">
              <div className="w-6 h-6 border-3 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Đang tải tin nhắn...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-neutral-400 space-y-3">
              <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center text-2xl mx-auto shadow-xs">💬</div>
              <div>
                <p className="text-xs font-bold text-textColor">Trò chuyện với ShopQuiet</p>
                <p className="text-[10px] text-textColor-variant mt-1 leading-relaxed max-w-[200px] mx-auto">Hãy gửi tin nhắn để được nhân viên hỗ trợ trực tiếp nhanh nhất.</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender === 'USER';
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-scale-up`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-xs ${
                    isMe 
                      ? 'bg-primary text-white rounded-tr-none' 
                      : 'bg-white text-textColor border border-[#f0edeb] rounded-tl-none'
                  }`}>
                    {renderMessageContent(msg.content)}
                    <span className={`block text-[7px] text-right mt-1.5 font-bold uppercase tracking-wider ${
                      isMe ? 'text-white/60' : 'text-textColor-variant/50'
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

        {/* Quick Help Templates */}
        <div className="px-6 py-2 bg-[#fdfcfb] border-t border-[#f0edeb] overflow-x-auto flex gap-2 scrollbar-none whitespace-nowrap">
          {quickTemplates.map((tpl, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(tpl)}
              className="inline-block px-3 py-1.5 bg-white border border-[#f0edeb] rounded-full text-[10px] font-bold text-[#526069] hover:bg-teal-50 hover:text-primary active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              {tpl}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="bg-white p-4 border-t border-[#f0edeb] flex items-center gap-3">
          <input
            type="text"
            placeholder="Nhập tin nhắn..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-[#fbf9f7] text-xs px-4 py-3 rounded-2xl outline-none focus:bg-[#f7f5f3] font-medium text-textColor border border-transparent focus:border-primary-light"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim()}
            className="w-10 h-10 bg-primary hover:bg-primary-dark text-white rounded-full flex items-center justify-center transition-all cursor-pointer disabled:bg-neutral-200 border-none active:scale-90"
          >
            <svg className="w-5 h-5 translate-x-[1px] -translate-y-[0.5px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
export default ChatOverlay;
