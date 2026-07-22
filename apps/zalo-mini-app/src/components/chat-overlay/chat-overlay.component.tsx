import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useCart } from "../../App";
import { apiRequest, API_BASE_URL } from "../../utils/api";
import { IProduct } from "../../App.type";

interface Message {
  id: number | string;
  zaloUserId: string;
  sender: "USER" | "ADMIN" | "BOT";
  content: string;
  read: boolean;
  createdAt: string;
  recommendedProducts?: IProduct[];
}

interface ChatOverlayProps {
  onClose: () => void;
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({ onClose }) => {
  const {
    zaloUser,
    chatContextProduct,
    setChatContextProduct,
    showToast,
    setSelectedProductDetail,
    recommendations,
  } = useCart();

  const [activeTab, setActiveTab] = useState<"LIVE_CSKH" | "AI_BOT">("AI_BOT");
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiMessages, setAiMessages] = useState<Message[]>([
    {
      id: "bot-init",
      zaloUserId: "ai-bot",
      sender: "BOT",
      content: "Xin chào! 🤖 Tôi là Trợ Lý Phối Đồ AI ShopQuiet. Bạn cần tìm trang phục đi chơi, dự tiệc hay tư vấn chọn Size phù hợp?",
      read: true,
      createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAiThinking, setIsAiThinking] = useState(false);

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
  }, [messages, aiMessages, activeTab, isAiThinking]);

  // Handle AI Bot Smart Responses
  const handleAiBotSend = (userText: string) => {
    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      zaloUserId: userId,
      sender: "USER",
      content: userText,
      read: true,
      createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    setAiMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsAiThinking(true);

    setTimeout(() => {
      let botResponse = "";
      let matchedProds: IProduct[] = [];

      const query = userText.toLowerCase();

      if (query.includes("phối đồ") || query.includes("đi tiệc") || query.includes("đi chơi") || query.includes("outfit")) {
        botResponse = "✨ Dựa trên xu hướng thời trang mới nhất, tôi gợi ý bộ Outfit Thanh Lịch & Hiện Đại dành cho bạn:\n\n• Áo Blazer dáng rủ kết hợp Quần Jean Denim bản cao cấp.\n• Phong cách tối giản nhưng cực kỳ nổi bật trong các buổi tiệc!";
        matchedProds = (recommendations || []).slice(0, 2);
      } else if (query.includes("size") || query.includes("kích thước") || query.includes("đo")) {
        botResponse = "📏 BẢNG TƯ VẤN CHỌN SIZE QUẦN ÁO SHOPQUIET:\n\n• Size S: 45kg - 55kg (Cao 1m55 - 1m65)\n• Size M: 55kg - 65kg (Cao 1m65 - 1m72)\n• Size L: 65kg - 75kg (Cao 1m70 - 1m78)\n• Size XL: 75kg - 85kg (Cao 1m75 - 1m85)\n\nNếu bạn nằm giữa 2 size, nên chọn nhỉnh hơn 1 Size để mặc thoải mái nhé!";
      } else if (query.includes("bán chạy") || query.includes("hot") || query.includes("gợi ý")) {
        botResponse = "🔥 Đây là những sản phẩm HOT nhất tuần qua được nhiều khách hàng yêu thích và lựa chọn:";
        matchedProds = (recommendations || []).slice(0, 3);
      } else if (query.includes("giao hàng") || query.includes("ship") || query.includes("phí")) {
        botResponse = "🚚 CHÍNH SÁCH VẬN CHUYỂN & GIAO HÀNG:\n\n• Miễn phí giao hàng cho đơn từ 500.000 đ toàn quốc.\n• Thời gian giao: NỘI THÀNH (1-2 ngày), TỈNH THÀNH (2-4 ngày).\n• Bạn được phép kiểm tra hàng trước khi thanh toán COD!";
      } else {
        botResponse = `Cảm ơn bạn đã hỏi! ShopQuiet có rất nhiều mẫu thời trang thiết kế mới nhất. Bạn có thể tham khảo các mẫu gợi ý dành riêng cho bạn bên dưới:`;
        matchedProds = (recommendations || []).slice(0, 2);
      }

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        zaloUserId: "ai-bot",
        sender: "BOT",
        content: botResponse,
        read: true,
        createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        recommendedProducts: matchedProds,
      };

      setAiMessages((prev) => [...prev, botMsg]);
      setIsAiThinking(false);
    }, 800);
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputValue.trim();
    if (!text) return;

    if (activeTab === "AI_BOT") {
      handleAiBotSend(text);
      return;
    }

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
              <span className="text-[8px] bg-teal-600 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Đang xem</span>
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

  const currentMessages = activeTab === "AI_BOT" ? aiMessages : messages;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
      <div className="bg-white rounded-t-3xl h-[88vh] flex flex-col overflow-hidden shadow-2xl border-t border-white/20">

        {/* ── Top Header ── */}
        <div className="bg-gradient-to-r from-[#0e6877] to-[#168a9e] text-white p-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-black border border-white/30">
                {activeTab === "AI_BOT" ? "🤖" : "💬"}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-teal-800 rounded-full animate-pulse"></span>
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                {activeTab === "AI_BOT" ? "Trợ Lý Phối Đồ AI ShopQuiet" : "Chát Trực Tiếp Với CSKH"}
              </h3>
              <p className="text-[10px] text-teal-100/90 font-medium">
                {activeTab === "AI_BOT" ? "Trợ lý thông minh hỗ trợ 24/7" : "Sẵn sàng hỗ trợ trực tuyến"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center border-none cursor-pointer active:scale-90 transition-transform"
          >
            ✕
          </button>
        </div>

        {/* ── Mode Selector Switcher ── */}
        <div className="bg-slate-100 p-1.5 flex gap-1 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("AI_BOT")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "AI_BOT" ? "bg-[#0e6877] text-white shadow-2xs" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>🤖 Trợ Lý AI</span>
          </button>

          <button
            onClick={() => setActiveTab("LIVE_CSKH")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "LIVE_CSKH" ? "bg-[#0e6877] text-white shadow-2xs" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>💬 Nhân Viên CSKH</span>
          </button>
        </div>

        {/* ── Context Product Preview (if opened from product page) ── */}
        {chatContextProduct && activeTab === "LIVE_CSKH" && (
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
          {loading && activeTab === "LIVE_CSKH" ? (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">Đang tải lịch sử trò chuyện...</div>
          ) : currentMessages.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <p className="text-xs font-semibold">Chưa có tin nhắn nào.</p>
              <p className="text-[10px] text-slate-400">Hãy gửi câu hỏi để bắt đầu cuộc trò chuyện!</p>
            </div>
          ) : (
            currentMessages.map((msg) => {
              const isUser = msg.sender === "USER";
              const isBot = msg.sender === "BOT";
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1 animate-fadeIn`}>
                  <div className="flex items-end gap-1.5 max-w-[82%]">
                    {!isUser && (
                      <div className="w-7 h-7 rounded-full bg-[#0e6877] text-white flex items-center justify-center text-xs font-bold shrink-0 mb-1">
                        {isBot ? "🤖" : "CS"}
                      </div>
                    )}

                    <div
                      className={`p-3 rounded-2xl ${
                        isUser
                          ? "bg-[#0e6877] text-white rounded-br-2xs shadow-xs"
                          : isBot
                          ? "bg-white text-slate-800 border border-slate-200/90 rounded-bl-2xs shadow-2xs"
                          : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-2xs shadow-2xs"
                      }`}
                    >
                      {renderMessageContent(msg.content)}

                      {/* Product Recommendation Cards inside AI Response */}
                      {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                          <p className="text-[10px] font-extrabold text-[#0e6877] uppercase tracking-wider">Sản phẩm gợi ý:</p>
                          <div className="space-y-2">
                            {msg.recommendedProducts.map((p: any) => {
                              let img = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=60";
                              try {
                                const parsed = JSON.parse(p.images);
                                if (parsed && parsed.length > 0) img = parsed[0];
                              } catch (e) {}

                              return (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    onClose();
                                    setSelectedProductDetail(p);
                                  }}
                                  className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex items-center gap-2.5 cursor-pointer hover:bg-teal-50 transition-colors"
                                >
                                  <img src={img} alt={p.name} className="w-10 h-10 object-cover rounded-lg shrink-0 border border-slate-200" />
                                  <div className="flex-1 min-w-0">
                                    <h5 className="text-[11px] font-bold text-slate-800 truncate">{p.name}</h5>
                                    <p className="text-[10px] font-extrabold text-[#0e6877]">{p.price?.toLocaleString("vi-VN")} đ</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[9px] text-slate-400 px-1 font-medium">{msg.createdAt}</span>
                </div>
              );
            })
          )}

          {isAiThinking && (
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium italic animate-pulse">
              <span>🤖 Trợ Lý AI đang suy nghĩ...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Quick Prompts Bar for AI Bot ── */}
        {activeTab === "AI_BOT" && (
          <div className="px-4 py-2 bg-white border-t border-slate-100 flex gap-2 overflow-x-auto scrollbar-none">
            {[
              "👔 Gợi ý phối đồ đi chơi",
              "📏 Hướng dẫn chọn Size",
              "🔥 Sản phẩm bán chạy",
              "🚚 Chính sách giao hàng",
            ].map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-[#0e6877] text-[10.5px] font-bold rounded-full whitespace-nowrap border-none cursor-pointer active:scale-95 transition-transform shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* ── Message Input Bar ── */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            placeholder={activeTab === "AI_BOT" ? "Hỏi Trợ Lý AI (VD: Tư vấn size M, phối đồ tiệc...)" : "Nhập nội dung nhắn với CSKH..."}
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
