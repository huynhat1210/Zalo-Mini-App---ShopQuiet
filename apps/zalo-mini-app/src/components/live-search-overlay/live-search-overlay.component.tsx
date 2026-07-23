import React, { useState, useEffect, useRef } from "react";
import { apiRequest } from "../../utils/api";
import { trackAnalyticsEvent } from "../../utils/analytics/analytics.util";
import { IProduct, useCart } from "../../App";

import { ILiveSearchOverlayProps } from "./live-search-overlay.type";
import { LazyImageComponent } from "../lazy-image";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ClockIcon,
  ArrowRightIcon,
  FireIcon,
  SparklesIcon,
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
  const { zaloUser } = useCart();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc">("newest");
  const [results, setResults] = useState<IProduct[]>([]);
  const [suggestedProducts, setSuggestedProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load Search History from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("live_search_history");
      if (stored) setSearchHistory(JSON.parse(stored));
    } catch (e) {}
  }, []);

  // Fetch initial suggested products on open
  useEffect(() => {
    async function loadSuggested() {
      try {
        const res = await apiRequest<any>("/products?limit=6");
        const list = Array.isArray(res)
          ? res
          : res?.data || res?.products || [];
        setSuggestedProducts(list);
      } catch (e) {
        console.error("Failed to load search suggested products:", e);
      }
    }
    if (isOpen) {
      loadSuggested();
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setSearchTerm("");
      setResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  const saveToHistory = (term: string) => {
    const clean = term.trim().replace(/^#/, "");
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

  // Perform search ONLY when triggered by Enter / Form Submit / Filter click
  const performSearch = async (queryTerm?: string, cat?: string, sort?: string) => {
    const term = (queryTerm !== undefined ? queryTerm : searchTerm).trim();
    const category = cat !== undefined ? cat : selectedCat;
    const sorting = sort !== undefined ? sort : sortBy;

    if (!term && category === "all") {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const queryParams = new URLSearchParams();
      if (term) queryParams.append("search", term);
      if (category !== "all") queryParams.append("categoryId", category);
      queryParams.append("limit", "20");

      const res = await apiRequest<any>(`/products?${queryParams.toString()}`);
      let productList: IProduct[] = [];
      if (Array.isArray(res)) {
        productList = res;
      } else if (res && Array.isArray(res.data)) {
        productList = res.data;
      } else if (res && Array.isArray(res.products)) {
        productList = res.products;
      }

      // Sort results
      if (sorting === "price-asc") {
        productList.sort((a, b) => a.price - b.price);
      } else if (sorting === "price-desc") {
        productList.sort((a, b) => b.price - a.price);
      }

      setResults(productList);
      if (term) {
        saveToHistory(term);
        // Track search analytics event to backend API
        trackAnalyticsEvent(zaloUser?.id || "guest", "search", undefined, undefined, {
          keyword: term,
          category,
          resultsCount: productList.length,
        });
      }
    } catch (e) {
      console.error("Search failed:", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  const handleTagClick = (tag: string) => {
    const cleanTag = tag.replace("#", "");
    setSearchTerm(cleanTag);
    performSearch(cleanTag);
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCat(catId);
    performSearch(undefined, catId);
  };

  const handleSortChange = (newSort: "newest" | "price-asc" | "price-desc") => {
    setSortBy(newSort);
    performSearch(undefined, undefined, newSort);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-white flex flex-col h-full overflow-hidden animate-fade-in text-left">
      {/* Header Search Form */}
      <form
        onSubmit={handleFormSubmit}
        className="bg-white px-5 py-3.5 flex items-center gap-3 border-b border-[#f0edeb] shadow-2xs shrink-0"
      >
        <div className="flex-1 flex items-center gap-2 bg-[#f6f4f2] px-3.5 py-2.5 rounded-2xl border border-[#ece9e6] focus-within:border-[#0e6877] transition-all">
          <button type="submit" className="bg-transparent border-none p-0 cursor-pointer flex items-center">
            <MagnifyingGlassIcon className="w-4 h-4 text-[#0e6877] shrink-0" strokeWidth={2.5} />
          </button>
          <input
            ref={inputRef}
            type="text"
            placeholder="Nhập từ khóa và nhấn Enter để tìm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-textColor focus:outline-none font-medium placeholder:text-[#526069]/50"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setHasSearched(false);
                setResults([]);
              }}
              className="p-1 text-neutral-400 hover:text-neutral-600 bg-transparent border-none cursor-pointer"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-extrabold text-[#0e6877] hover:underline bg-transparent border-none cursor-pointer shrink-0"
        >
          Đóng
        </button>
      </form>

      {/* Filter Bar */}
      <div className="bg-[#faf9f8] px-5 py-2 flex items-center justify-between gap-2 overflow-x-auto border-b border-[#f0edeb] scrollbar-none shrink-0">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 shrink-0">
          {SEARCH_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.id)}
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
          onChange={(e: any) => handleSortChange(e.target.value)}
          className="text-[10px] font-extrabold bg-white text-[#0e6877] border border-[#0e6877]/30 rounded-full px-2.5 py-1 outline-none cursor-pointer shrink-0"
        >
          <option value="newest">⚡ Mới nhất</option>
          <option value="price-asc">💵 Giá ⬆</option>
          <option value="price-desc">💵 Giá ⬇</option>
        </select>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Search History */}
        {!hasSearched && searchHistory.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-[#526069]/80 uppercase tracking-widest flex items-center gap-1">
                <ClockIcon className="w-3.5 h-3.5 text-[#0e6877]" /> Lịch sử tìm kiếm (Nhấn Enter để lưu)
              </span>
              <button
                type="button"
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
                  type="button"
                  onClick={() => handleTagClick(item)}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-textColor text-xs font-semibold rounded-xl border-none cursor-pointer transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hot Trend Hashtag Badges */}
        {!hasSearched && (
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
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className="px-3.5 py-2 bg-[#f8f6f4] hover:bg-[#0e6877]/10 text-textColor hover:text-[#0e6877] text-xs font-bold rounded-2xl border border-[#eeebe8] transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Products Section - Shown before search */}
        {!hasSearched && suggestedProducts.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-[#f5f3f0]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-[#0e6877] uppercase tracking-widest flex items-center gap-1">
                <SparklesIcon className="w-3.5 h-3.5 text-[#0e6877]" /> Gợi ý sản phẩm dành cho bạn
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {suggestedProducts.map((prod) => {
                let img =
                  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80";
                try {
                  const parsed = JSON.parse(prod.images);
                  if (parsed && parsed.length > 0) img = parsed[0];
                } catch (e) {}

                return (
                  <div
                    key={prod.id}
                    onClick={() => {
                      onSelectProduct(prod);
                      onClose();
                    }}
                    className="bg-[#fcfbfa] border border-[#f0edeb] rounded-2xl p-2.5 flex flex-col cursor-pointer group hover:border-[#0e6877]/40 transition-all shadow-2xs"
                  >
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-neutral-100 mb-2">
                      <LazyImageComponent
                        src={img}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <span className="text-[8.5px] font-extrabold text-[#0e6877] uppercase tracking-wider">
                      {prod.category?.name || "Nổi bật"}
                    </span>
                    <h4 className="text-[11px] font-bold text-textColor truncate mt-0.5 group-hover:text-[#0e6877] transition-colors">
                      {prod.name}
                    </h4>
                    <p className="text-[11px] font-black text-[#0e6877] mt-1">
                      {prod.price?.toLocaleString("vi-VN")} đ
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Results (Visible after pressing Enter / Form Submit) */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-xs text-[#526069]/60 font-medium">
            <div className="w-5 h-5 border-2 border-[#0e6877] border-t-transparent rounded-full animate-spin mr-2" />
            Đang tìm kiếm sản phẩm...
          </div>
        ) : hasSearched && results.length === 0 ? (
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
          hasSearched && results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-[#526069]/80 uppercase tracking-widest">
                  Kết quả tìm kiếm cho "{searchTerm || "tất cả"}" ({results.length})
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
