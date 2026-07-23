import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useCart } from "../../App";
import { apiRequest, API_BASE_URL } from "../../utils/api";

interface Message {
  id: number | string;
  zaloUserId: string;
  sender: "USER" | "ADMIN";
  content: string;
  read: boolean;
  createdAt: string;
}

interface ChatOverlayProps {
  onClose: () => void;
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({ onClose }: ChatOverlayProps) => {
  const {
    zaloUser,
    chatContextProduct,
    setChatContextProduct,
    showToast,
    setSelectedProductDetail,
  } = useCart();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const userId = zaloUser?.id || "guest";
  const serverUrl = API_BASE_URL.replace("/api/v1", "");

  // 1. Fetch History on open
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await apiRequest<Message[]>(
          `/chat/messages?zaloUserId=${userId}`,
        );
        setMessages(history);
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [userId]);

  // 2. Connect WebSockets (Socket.IO)
  useEffect(() => {
    const socket = io(serverUrl);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_room", { zaloUserId: userId });
    });

    socket.on("receive_message", (msg: Message) => {
      if (msg.sender === "ADMIN") {
        setMessages((prev) => [...prev, msg]);
        showToast("💬 Tin nhắn mới từ CSKH ShopQuiet!");
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, serverUrl, showToast]);

  // Auto Scroll to Bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputValue.trim();
    if (!text) return;

    if (socketRef.current) {
      socketRef.current.emit("send_message", {
        zaloUserId: userId,
        sender: "USER",
        content: text,
      });
    }

    const newMsg: Message = {
      id: Date.now(),
      zaloUserId: userId,
      sender: "USER",
      content: text,
      read: true,
      createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputValue("");
  };

  const renderMessageContent = (content: string) => {
    if (content.startsWith("[PRODUCT_CONTEXT]")) {
      try {
        const payloadStr = content.substring("[PRODUCT_CONTEXT]".length).trim();
        const prod = JSON.parse(payloadStr);

        let imgUrl = "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=200&q=80";
        try {
          const parsedImgs = JSON.parse(prod.image);
          if (Array.isArray(parsedImgs) && parsedImgs.length > 0) imgUrl = parsedImgs[0];
        } catch (e) {
          if (typeof prod.image === "string" && prod.image) imgUrl = prod.image;
        }

        const fullImg = imgUrl.startsWith("http") ? imgUrl : `${serverUrl}${imgUrl}`;

        return (
          <div
            onClick={() => {
              onClose();
              setSelectedProductDetail(prod);
            }}
            className="bg-teal-50 border border-teal-150 p-2.5 rounded-2xl flex gap-3 cursor-pointer hover:bg-teal-100 transition-colors text-left max-w-xs shadow-xs"
          >
            <img src={fullImg} alt={prod.name} className="w-12 h-12 object-cover rounded-xl border border-teal-200 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[8px] bg-[#0e6877] text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Đang xem</span>
              <h4 className="text-xs font-bold text-teal-950 truncate mt-1 leading-snug">{prod.name}</h4>
              <p className="text-[10px] text-teal-800 font-extrabold mt-0.5">{prod.price?.toLocaleString("vi-VN")} đ</p>
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
    "Sản phẩm này còn hàng không shop?",
    "Đơn hàng của mình khi nào giao?",
    "Shop có chính sách đổi trả như thế nào?",
    "Có mã giảm giá nào cho đơn đầu tiên không ạ?",
  ];

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
      <div className="bg-white rounded-t-3xl h-[85vh] flex flex-col overflow-hidden shadow-2xl border-t border-white/20">

        {/* ── Top Header ── */}
        <div className="bg-gradient-to-r from-[#0e6877] to-[#168a9e] text-white p-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-black border border-white/30">
                💬
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-teal-800 rounded-full animate-pulse"></span>
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">Chát Trực Tiếp Với CSKH</h3>
              <p className="text-[10px] text-teal-100/90 font-medium">ShopQuiet CSKH sẵn sàng hỗ trợ bạn</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center border-none cursor-pointer active:scale-90 transition-transform"
          >
            ✕
          </button>
        </div>

        {/* ── Context Product Preview (if opened from product page) ── */}
        {chatContextProduct && (
          <div className="bg-teal-50 border-b border-teal-150 p-2.5 flex items-center justify-between gap-2 px-4 animate-slide-down">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[9px] bg-[#0e6877] text-white px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0">Hỏi về</span>
              <p className="text-xs font-bold text-teal-950 truncate">{chatContextProduct.name}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  const text = `[PRODUCT_CONTEXT] ${JSON.stringify({
                    id: chatContextProduct.id,
                    name: chatContextProduct.name,
                    price: chatContextProduct.price,
                    image: chatContextProduct.images,
                  })}`;
                  handleSendMessage(text);
                  setChatContextProduct(null);
                }}
                className="px-2.5 py-1 bg-[#0e6877] text-white rounded-lg text-[10px] font-bold border-none cursor-pointer active:scale-95 shadow-2xs"
              >
                Gửi ngay
              </button>
              <button
                onClick={() => setChatContextProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1 border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ── Messages List ── */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">Đang tải lịch sử trò chuyện...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <p className="text-xs font-semibold">Chưa có tin nhắn nào với tư vấn viên.</p>
              <p className="text-[10px] text-slate-400">Hãy gửi câu hỏi bên dưới để được nhân viên hỗ trợ ngay!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === "USER";
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1 animate-fadeIn`}>
                  <div className="flex items-end gap-1.5 max-w-[82%]">
                    {!isUser && (
                      <div className="w-7 h-7 rounded-full bg-[#0e6877] text-white flex items-center justify-center text-xs font-bold shrink-0 mb-1">
                        CS
                      </div>
                    )}

                    <div
                      className={`p-3 rounded-2xl ${
                        isUser
                          ? "bg-[#0e6877] text-white rounded-br-2xs shadow-xs"
                          : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-2xs shadow-2xs"
                      }`}
                    >
                      {renderMessageContent(msg.content)}
                    </div>
                  </div>

                  <span className="text-[9px] text-slate-400 px-1 font-medium">{msg.createdAt}</span>
                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Quick Templates Bar ── */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex gap-2 overflow-x-auto scrollbar-none">
          {quickTemplates.map((template, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(template)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-bold rounded-full whitespace-nowrap border-none cursor-pointer active:scale-95 transition-transform shrink-0"
            >
              {template}
            </button>
          ))}
        </div>

        {/* ── Message Input Bar ── */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            placeholder="Nhập tin nhắn tư vấn..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1 bg-slate-100 border border-slate-200 focus:border-[#0e6877] focus:bg-white rounded-2xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all shadow-2xs font-medium"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim()}
            className="w-10 h-10 rounded-2xl bg-[#0e6877] disabled:bg-slate-300 text-white flex items-center justify-center font-bold border-none cursor-pointer active:scale-90 transition-transform shadow-xs shrink-0"
          >
            ➔
          </button>
        </div>

      </div>
    </div>
  );
};

export default ChatOverlay;
