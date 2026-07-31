import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import api from "zmp-sdk";
import { useCart } from "../../App";
import { useAppStore } from "../../store";
import { apiRequest, API_BASE_URL } from "../../utils/api";
import { useTranslation } from "../../utils/i18n/i18n.util";
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PhotoIcon,
  PaperAirplaneIcon,
  TruckIcon,
  TicketIcon,
  PhoneIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

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
  const { t } = useTranslation();
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
  const [shopStatus, setShopStatus] = useState<string>("ONLINE");
  const [latestOrder, setLatestOrder] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const pendingTempIds = useRef<Set<string>>(new Set());

  const userId = zaloUser?.id || "guest";
  const serverUrl = API_BASE_URL.replace("/api/v1", "");

  // 1. Fetch History, Shop Status, & Latest Order on open
  useEffect(() => {
    const fetchChatInitialData = async () => {
      try {
        const [history, statusRes, orderRes] = await Promise.all([
          apiRequest<Message[]>(`/chat/messages?zaloUserId=${userId}`).catch(() => []),
          apiRequest<{ status: string }>('/chat/shop-status').catch(() => ({ status: 'ONLINE' })),
          apiRequest<any>(`/chat/latest-order?zaloUserId=${userId}`).catch(() => null),
        ]);

        setMessages(Array.isArray(history) ? history : []);
        setShopStatus(statusRes?.status || "ONLINE");
        setLatestOrder(orderRes || null);

        // Mark ADMIN messages as read for this user
        await apiRequest('/chat/messages/read', 'POST', { zaloUserId: userId, sender: 'ADMIN' }).catch(() => {});
        useAppStore.getState().setUnreadChatCount(0);
      } catch (err) {
        console.error("Failed to load chat data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChatInitialData();
  }, [userId]);

  // 2. Connect WebSockets (Socket.IO)
  useEffect(() => {
    const socket = io(serverUrl);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join", { roomId: userId });
    });

    socket.on("message", (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;

        if (msg.sender === "USER" && pendingTempIds.current.size > 0) {
          const tempIdx = prev.findIndex(
            (m) =>
              typeof m.id === "string" &&
              m.id.startsWith("tmp-") &&
              m.content === msg.content,
          );
          if (tempIdx !== -1) {
            pendingTempIds.current.delete(prev[tempIdx].id as string);
            const updated = [...prev];
            updated[tempIdx] = msg;
            return updated;
          }
        }

        return [...prev, msg];
      });

      if (msg.sender === "ADMIN") {
        showToast(t("chat.online"));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, serverUrl, showToast, t]);

  // Auto Scroll to Bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue.trim();
    if (!text) return;
    setInputValue("");

    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    pendingTempIds.current.add(tempId);

    const newMsg: Message = {
      id: tempId,
      zaloUserId: userId,
      sender: "USER",
      content: text,
      read: true,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);

    if (socketRef.current?.connected) {
      socketRef.current.emit("send_message", {
        zaloUserId: userId,
        sender: "USER",
        content: text,
      });
      return;
    }

    try {
      const saved = await apiRequest<Message>("/chat/messages", "POST", {
        zaloUserId: userId,
        sender: "USER",
        content: text,
      });
      if (saved?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...saved } : m)),
        );
        pendingTempIds.current.delete(tempId);
      }
    } catch (err) {
      console.error("Failed to send message via REST:", err);
    }
  };

  // Feature 4: Pick image via Zalo SDK & Send
  const handleChooseImage = async () => {
    try {
      if (api.chooseImage) {
        api.chooseImage({
          count: 1,
          sourceType: ["album", "camera"],
          success: (res: any) => {
            if (res.filePaths && res.filePaths.length > 0) {
              const imgPath = res.filePaths[0];
              const text = `[IMAGE_ATTACHMENT] ${imgPath}`;
              handleSendMessage(text);
            }
          },
          fail: (err: any) => {
            console.log("chooseImage fail:", err);
          },
        });
      } else {
        showToast(t("chat.templates"), "info");
      }
    } catch (e) {
      console.error("Image pick error:", e);
    }
  };

  const renderMessageContent = (content: string) => {
    if (content.startsWith("[IMAGE_ATTACHMENT]")) {
      const url = content.substring("[IMAGE_ATTACHMENT]".length).trim();
      return (
        <div className="space-y-1">
          <span className="text-[10px] text-teal-800 font-bold block flex items-center gap-1">
            <PhotoIcon className="w-3.5 h-3.5" />
            {t("chat.attachImage")}:
          </span>
          <img src={url} alt="Attached" className="max-w-[200px] max-h-[200px] rounded-xl object-cover border border-slate-200" />
        </div>
      );
    }

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
            className="bg-teal-50/50 border border-teal-150 p-2.5 rounded-2xl flex gap-3 cursor-pointer hover:bg-teal-100 transition-colors text-left max-w-xs shadow-xs"
          >
            <img src={fullImg} alt={prod.name} className="w-12 h-12 object-cover rounded-xl border border-teal-200 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[8px] bg-[#0e6877] text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                {t("chat.contextProduct")}
              </span>
              <h4 className="text-xs font-bold text-teal-950 truncate mt-1 leading-snug">{prod.name}</h4>
              <p className="text-[10px] text-teal-800 font-extrabold mt-0.5">{prod.price?.toLocaleString("vi-VN")} đ</p>
            </div>
          </div>
        );
      } catch (e) {
        return <span className="italic text-xs">{t("chat.offline")}</span>;
      }
    }

    return <p className="text-xs leading-relaxed font-medium break-words whitespace-pre-wrap">{content}</p>;
  };

  // Quick Action Buttons
  const quickTemplates = [
    { label: t("chat.trackOrder"), icon: TruckIcon, key: "track" },
    { label: t("chat.getDiscount"), icon: TicketIcon, key: "discount" },
    { label: t("chat.requestCallback"), icon: PhoneIcon, key: "callback" },
    { label: t("chat.returnPolicy"), icon: ArrowPathIcon, key: "policy" },
  ];

  const handleQuickActionClick = (template: { label: string; key: string }) => {
    if (template.key === "track" && latestOrder) {
      const msg = `Kiểm tra đơn hàng #${latestOrder.id} (Trạng thái: ${latestOrder.status})`;
      handleSendMessage(msg);
      return;
    }
    handleSendMessage(template.label);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
      <div className="bg-white text-slate-900 rounded-t-3xl h-[88vh] flex flex-col overflow-hidden shadow-2xl border-t border-white/20">

        {/* Top Header with Online Status */}
        <div className="bg-gradient-to-r from-[#0e6877] to-[#168a9e] text-white p-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
                <ChatBubbleLeftRightIcon className="w-5.5 h-5.5 text-white" strokeWidth={2} />
              </div>
              <span
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-[#0e6877] rounded-full ${
                  shopStatus === "ONLINE" ? "bg-emerald-400 animate-pulse" : "bg-slate-400"
                }`}
              ></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm tracking-tight">{t("chat.title")}</h3>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                    shopStatus === "ONLINE"
                      ? "bg-emerald-500/30 text-emerald-100 border border-emerald-400/40"
                      : "bg-slate-500/40 text-slate-200"
                  }`}
                >
                  {shopStatus === "ONLINE" ? t("chat.online") : t("chat.offline")}
                </span>
              </div>
              <p className="text-[10px] text-teal-100/90 font-medium mt-0.5">
                {shopStatus === "ONLINE" ? t("chat.onlineSub") : t("chat.offlineSub")}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center border-none cursor-pointer active:scale-90 transition-transform"
          >
            <XMarkIcon className="w-5 h-5 text-white" strokeWidth={2.2} />
          </button>
        </div>

        {/* Order Attachment Context Banner */}
        {latestOrder && !chatContextProduct && (
          <div className="bg-amber-50 border-b border-amber-200 p-2.5 px-4 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[9px] bg-amber-600 text-white px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0">
                {t("chat.latestOrder")}
              </span>
              <p className="text-xs font-bold text-amber-950 truncate">
                #{latestOrder.id} - {latestOrder.totalAmount?.toLocaleString("vi-VN")} đ
              </p>
            </div>
            <button
              onClick={() => {
                const text = `Hỗ trợ đơn hàng #${latestOrder.id} (${latestOrder.totalAmount?.toLocaleString("vi-VN")} đ, trạng thái: ${latestOrder.status})`;
                handleSendMessage(text);
              }}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold border-none cursor-pointer active:scale-95 shrink-0 shadow-2xs"
            >
              {t("chat.askAboutOrder")}
            </button>
          </div>
        )}

        {/* Context Product Preview (if opened from product detail) */}
        {chatContextProduct && (
          <div className="bg-teal-50 border-b border-teal-150 p-2.5 flex items-center justify-between gap-2 px-4 animate-slide-down">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[9px] bg-[#0e6877] text-white px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0">
                {t("chat.askAboutProduct")}
              </span>
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
                {t("chat.send")}
              </button>
              <button
                onClick={() => setChatContextProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1 border-none bg-transparent cursor-pointer"
              >
                <XMarkIcon className="w-4 h-4" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        )}

        {/* Messages List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">{t("common.loading")}</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <p className="text-xs font-semibold">{t("chat.title")}</p>
              <p className="text-[10px] text-slate-400 px-6">{t("chat.emptyMsg")}</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === "USER";
              const isOptimistic = typeof msg.id === "string" && msg.id.startsWith("tmp-");
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1 animate-fadeIn`}>
                  <div className="flex items-end gap-1.5 max-w-[82%]">
                    {!isUser && (
                      <div className="w-7 h-7 rounded-full bg-[#0e6877] text-white flex items-center justify-center text-[11px] font-bold shrink-0 mb-1">
                        CS
                      </div>
                    )}

                    <div
                      className={`p-3 rounded-2xl ${
                        isUser
                          ? `bg-[#0e6877] text-white rounded-br-2xs shadow-xs${isOptimistic ? " opacity-70" : ""}`
                          : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-2xs shadow-2xs"
                      }`}
                    >
                      {renderMessageContent(msg.content)}
                    </div>
                  </div>

                  <span className="text-[9px] text-slate-400 px-1 font-medium">
                    {isOptimistic
                      ? t("chat.typing")
                      : new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Templates Bar */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex gap-2 overflow-x-auto scrollbar-none">
          {quickTemplates.map((template, i) => {
            const IconComp = template.icon;
            return (
              <button
                key={i}
                onClick={() => handleQuickActionClick(template)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-bold rounded-full whitespace-nowrap border-none cursor-pointer active:scale-95 transition-transform shrink-0 shadow-2xs flex items-center gap-1.5"
              >
                <IconComp className="w-3.5 h-3.5 text-[#0e6877]" strokeWidth={2} />
                <span>{template.label}</span>
              </button>
            );
          })}
        </div>

        {/* Message Input Bar + Camera / Image Button */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <button
            onClick={handleChooseImage}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold border-none cursor-pointer active:scale-90 transition-transform shrink-0"
            title={t("chat.attachImage")}
          >
            <PhotoIcon className="w-5 h-5 text-slate-600" strokeWidth={2} />
          </button>
          <input
            type="text"
            placeholder={t("chat.placeholder")}
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
            <PaperAirplaneIcon className="w-4 h-4 text-white" strokeWidth={2.2} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ChatOverlay;
