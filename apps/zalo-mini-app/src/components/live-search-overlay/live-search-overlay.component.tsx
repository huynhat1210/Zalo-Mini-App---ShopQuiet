import React, { useState, useEffect, useRef } from "react";
import { apiRequest } from "../../utils/api";
import { IProduct } from "../../App";
import { ILiveSearchOverlayProps } from "./live-search-overlay.type";
import { LazyImageComponent } from "../lazy-image";

const HOT_TREND_TAGS = [
  "#Sale 50%",
  "#Áo Blazer",
  "#Jean Denim",
  "#Áo Polo",
  "#Voucher VIP",
  "#Quần Short",
];

export const LiveSearchOverlay: React.FC<ILiveSearchOverlayProps> = (props) => {
  const { isOpen, onClose, onSelectProduct, showToast } = props;
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setSearchTerm("");
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search API fetch
  useEffect(() => {
    const term = searchTerm.trim();
    if (!term) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest<any>(
          `/products?search=${encodeURIComponent(term)}&limit=10`,
        );
        const productList = Array.isArray(res) ? res : res?.products || [];
        setResults(productList);
      } catch (e) {
        console.error("Live search failed:", e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-white flex flex-col h-full overflow-hidden animate-fade-in">
      {/* Header Search Bar */}
      <div className="bg-white px-5 py-3.5 flex items-center gap-3 border-b border-[#f0edeb] shadow-2xs shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-[#f6f4f2] px-3.5 py-2.5 rounded-2xl border border-[#ece9e6] focus-within:border-[#0e6877] transition-all">
          <svg
            className="w-4 h-4 text-[#0e6877] shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Tìm áo, quần, túi xách, khuyến mãi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-textColor focus:outline-none font-medium placeholder:text-[#526069]/50"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="p-1 text-neutral-400 hover:text-neutral-600 bg-transparent border-none cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-xs font-extrabold text-[#0e6877] hover:underline bg-transparent border-none cursor-pointer shrink-0"
        >
          Đóng
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Hot Trend Hashtag Badges */}
        {!searchTerm && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-[#526069]/80 uppercase tracking-widest flex items-center gap-1">
                🔥 Xu hướng tìm kiếm HOT
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {HOT_TREND_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchTerm(tag.replace("#", ""))}
                  className="px-3.5 py-2 bg-[#f8f6f4] hover:bg-[#0e6877]/10 text-textColor hover:text-[#0e6877] text-xs font-bold rounded-2xl border border-[#eeebe8] transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live Search Product Results */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-xs text-[#526069]/60 font-medium">
            <div className="w-5 h-5 border-2 border-[#0e6877] border-t-transparent rounded-full animate-spin mr-2" />
            Đang tìm kiếm sản phẩm...
          </div>
        ) : searchTerm && results.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <span className="text-3xl">🔍</span>
            <p className="text-xs font-bold text-textColor">
              Không tìm thấy sản phẩm cho từ khóa "{searchTerm}"
            </p>
            <p className="text-[10px] text-[#526069]/70">
              Hãy thử lại với từ khóa khác như "Áo", "Quần", "Voucher"
            </p>
          </div>
        ) : (
          results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-[#526069]/80 uppercase tracking-widest">
                  Kết quả phù hợp ({results.length})
                </span>
              </div>
              <div className="divide-y divide-[#f5f3f0]">
                {results.map((product) => {
                  let img =
                    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80";
                  try {
                    const parsed = JSON.parse(product.images);
                    if (parsed && parsed.length > 0) img = parsed[0];
                  } catch (e) {}

                  return (
                    <div
                      key={product.id}
                      onClick={() => {
                        onSelectProduct(product);
                        onClose();
                      }}
                      className="py-3 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 rounded-2xl px-2 transition-colors group"
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 border border-[#f0edeb] shrink-0">
                        <LazyImageComponent
                          src={img}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <span className="text-[9px] font-extrabold text-[#0e6877] uppercase tracking-wider">
                          {product.category?.name || "Sản phẩm"}
                        </span>
                        <h4 className="text-xs font-bold text-textColor truncate group-hover:text-[#0e6877] transition-colors">
                          {product.name}
                        </h4>
                        <p className="text-xs font-black text-[#0e6877] mt-0.5">
                          {product.price?.toLocaleString("vi-VN")} đ
                        </p>
                      </div>
                      <span className="text-[11px] font-extrabold text-[#0e6877] bg-[#0e6877]/10 px-3 py-1 rounded-full shrink-0 group-hover:bg-[#0e6877] group-hover:text-white transition-all">
                        Xem
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default LiveSearchOverlay;
