import React, { useState, useEffect, useRef } from "react";
import { apiRequest } from "../../utils/api";
import { IProduct } from "../../App";
import { ILiveSearchOverlayProps } from "./live-search-overlay.type";
import { LazyImageComponent } from "../lazy-image";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ClockIcon,
  StarIcon as StarOutline,
  ArrowRightIcon,
  FireIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";

const HOT_TREND_TAGS = [
  "#Sale 50%",
  "#Áo Blazer",
  "#Jean Denim",
  "#Áo Polo",
  "#Voucher VIP",
  "#Quần Short",
];

const SEARCH_CATEGORIES = [
  { id: "all", label: "Tất cả" },
  { id: "ao", label: "Áo nam/nữ" },
  { id: "quan", label: "Quần" },
  { id: "vay", label: "Váy đầm" },
  { id: "phukien", label: "Phụ kiện" },
];

export const LiveSearchOverlay: React.FC<ILiveSearchOverlayProps> = (props) => {
  const { isOpen, onClose, onSelectProduct } = props;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc">("newest");
  const [results, setResults] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load Search History from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("live_search_history");
      if (stored) setSearchHistory(JSON.parse(stored));
    } catch (e) {}
  }, []);

  const saveToHistory = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setSearchHistory((prev) => {
      const updated = [clean, ...prev.filter((item) => item !== clean)].slice(0, 8);
      localStorage.setItem("live_search_history", JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("live_search_history");
  };

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
    if (!term && selectedCat === "all") {
      setResults([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const queryParams = new URLSearchParams();
        if (term) queryParams.append("search", term);
        if (selectedCat !== "all") queryParams.append("categoryId", selectedCat);
        queryParams.append("limit", "15");

        const res = await apiRequest<any>(`/products?${queryParams.toString()}`);
        let productList: IProduct[] = Array.isArray(res) ? res : res?.products || [];

        // Apply client sorting
        if (sortBy === "price-asc") {
          productList.sort((a, b) => a.price - b.price);
        } else if (sortBy === "price-desc") {
          productList.sort((a, b) => b.price - a.price);
        }

        setResults(productList);
        if (term) saveToHistory(term);
      } catch (e) {
        console.error("Live search failed:", e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedCat, sortBy]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-white flex flex-col h-full overflow-hidden animate-fade-in text-left">
      {/* Header Search Bar */}
      <div className="bg-white px-5 py-3.5 flex items-center gap-3 border-b border-[#f0edeb] shadow-2xs shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-[#f6f4f2] px-3.5 py-2.5 rounded-2xl border border-[#ece9e6] focus-within:border-[#0e6877] transition-all">
          <MagnifyingGlassIcon className="w-4 h-4 text-[#0e6877] shrink-0" strokeWidth={2.5} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Tìm áo khoác, quần jean, sale 50%..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-textColor focus:outline-none font-medium placeholder:text-[#526069]/50"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="p-1 text-neutral-400 hover:text-neutral-600 bg-transparent border-none cursor-pointer"
            >
              <XMarkIcon className="w-4 h-4" />
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

      {/* Filter Bar */}
      <div className="bg-[#faf9f8] px-5 py-2 flex items-center justify-between gap-2 overflow-x-auto border-b border-[#f0edeb] scrollbar-none shrink-0">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 shrink-0">
          {SEARCH_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`px-3 py-1 rounded-full text-[10px] font-extrabold transition-all border-none cursor-pointer ${
                selectedCat === cat.id
                  ? "bg-[#0e6877] text-white shadow-2xs"
                  : "bg-white text-[#526069] border border-[#eeebe8]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort Filter */}
        <select
          value={sortBy}
          onChange={(e: any) => setSortBy(e.target.value)}
          className="text-[10px] font-extrabold bg-white text-[#0e6877] border border-[#0e6877]/30 rounded-full px-2.5 py-1 outline-none cursor-pointer shrink-0"
        >
          <option value="newest">⚡ Mới nhất</option>
          <option value="price-asc">💵 Giá ⬆</option>
          <option value="price-desc">💵 Giá ⬇</option>
        </select>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Search History */}
        {!searchTerm && searchHistory.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-[#526069]/80 uppercase tracking-widest flex items-center gap-1">
                <ClockIcon className="w-3.5 h-3.5 text-[#0e6877]" /> Lịch sử tìm kiếm
              </span>
              <button
                onClick={clearHistory}
                className="text-[9.5px] font-bold text-red-500 hover:underline bg-transparent border-none cursor-pointer"
              >
                Xóa lịch sử
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((item) => (
                <button
                  key={item}
                  onClick={() => setSearchTerm(item)}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-textColor text-xs font-semibold rounded-xl border-none cursor-pointer transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hot Trend Hashtag Badges */}
        {!searchTerm && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-[#526069]/80 uppercase tracking-widest flex items-center gap-1">
                <FireIcon className="w-3.5 h-3.5 text-amber-500" /> Xu hướng tìm kiếm HOT
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
        ) : (searchTerm || selectedCat !== "all") && results.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <MagnifyingGlassIcon className="w-8 h-8 text-neutral-300 mx-auto" />
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
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-extrabold text-[#0e6877] uppercase tracking-wider">
                            {product.category?.name || "Sản phẩm"}
                          </span>
                          <span className="text-[9px] font-bold text-amber-500 flex items-center gap-0.5">
                            <StarSolid className="w-3 h-3 text-amber-400 inline" /> 4.9
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-textColor truncate group-hover:text-[#0e6877] transition-colors mt-0.5">
                          {product.name}
                        </h4>
                        <p className="text-xs font-black text-[#0e6877] mt-0.5">
                          {product.price?.toLocaleString("vi-VN")} đ
                        </p>
                      </div>
                      <span className="text-[11px] font-extrabold text-[#0e6877] bg-[#0e6877]/10 px-3 py-1 rounded-full shrink-0 group-hover:bg-[#0e6877] group-hover:text-white transition-all flex items-center gap-1">
                        Xem <ArrowRightIcon className="w-3 h-3" />
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
