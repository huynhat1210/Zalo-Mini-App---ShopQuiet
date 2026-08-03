import { useState, useEffect } from "react";
import { Page } from "zmp-ui";
import { useCart } from "../../App";
import { useDebounce, trackAnalyticsEvent, useTranslation, safeParseImages } from "../../utils";
import { useAllProducts, useCategories } from "../../hooks";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { ISearchProps } from "./search.type";
import { LazyImageComponent, PriceSlider } from "../../components";

const PageCast = Page as any;

export const Search: React.FC<ISearchProps> = (_props) => {
  const { t, lang } = useTranslation();
  const {
    setSelectedProductDetail,
    addToCart,
    showToast,
    addToViewedProducts,
    viewedProducts,
    zaloUser,
  } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Advanced filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000000]);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<
    "newest" | "price-asc" | "price-desc" | "popularity" | "best-selling"
  >("newest");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  useEffect(() => {
    if (debouncedSearchQuery.trim() && zaloUser?.id) {
      trackAnalyticsEvent(zaloUser.id, "search", undefined, undefined, {
        query: debouncedSearchQuery.trim(),
      });
    }
  }, [debouncedSearchQuery, zaloUser?.id]);

  const handleAddToCart = (product: any) => {
    // Check if product has variants (size or color)
    const hasVariants = product.variants && product.variants.length > 0;
    const hasColors =
      hasVariants &&
      product.variants.some((v: any) => v.color && v.color !== "DEFAULT");
    const hasSizes =
      hasVariants &&
      product.variants.some((v: any) => v.size && v.size !== "DEFAULT");

    if (hasColors || hasSizes) {
      // Product has variants - open product detail to select
      setSelectedProductDetail(product);
      showToast("Please select product variant!", "info");
    } else {
      // Product has no variants - add directly
      addToCart(product);
      showToast(`Added ${product.name} to cart!`, "success");

      // Track add_to_cart event
      if (zaloUser?.id) {
        trackAnalyticsEvent(
          zaloUser.id,
          "add_to_cart",
          product.id,
          product.categoryId,
        );
      }
    }
  };

  const handleProductClick = (product: any) => {
    addToViewedProducts(product);
    setSelectedProductDetail(product);

    // Track click event
    if (zaloUser?.id) {
      trackAnalyticsEvent(zaloUser.id, "click", product.id, product.categoryId);
    }
  };

  // Dynamic API state via React Query
  const { data: productsData } = useAllProducts();
  const { data: categoriesData } = useCategories();

  const products = productsData || [];
  const categories = (categoriesData || []) as any[];

  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("search_history");
      if (cached) return JSON.parse(cached);
    }
    return ["Linen", "Boots", "Jackets", "Walnut wood"];
  });

  const saveSearchToHistory = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setHistory((prev) => {
      const filtered = prev.filter((x) => x !== clean);
      const updated = [clean, ...filtered].slice(0, 6);
      localStorage.setItem("search_history", JSON.stringify(updated));
      return updated;
    });
  };

  const filterTags = [
    t("search.under1m"),
    t("search.appliances"),
    t("search.inStock"),
  ];

  // Calculate product stock status
  const getProductStock = (product: any) => {
    if (!product.variants || product.variants.length === 0) return true;
    const totalStock = product.variants.reduce(
      (sum: number, v: any) => sum + (v.stock || 0),
      0,
    );
    return totalStock > 0;
  };

  // Calculate product average rating
  const getProductRating = (product: any) => {
    if (!product.comments || product.comments.length === 0) return 0;
    const totalRating = product.comments.reduce(
      (sum: number, c: any) => sum + (c.rating || 0),
      0,
    );
    return totalRating / product.comments.length;
  };

  // Filtering
  const filteredProducts = (Array.isArray(products) ? products : []).filter(
    (p) => {
      const query = debouncedSearchQuery.toLowerCase().trim();
      const matchesSearch =
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        (p.category &&
          (p.category.name.toLowerCase().includes(query) ||
            p.category.slug.toLowerCase().includes(query)));

      // Price range filter
      const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];

      // Rating filter
      const productRating = getProductRating(p);
      const matchesRating =
        selectedRating === 0 || productRating >= selectedRating;

      // Category filter
      const matchesCategory =
        selectedCategories.length === 0 ||
        (p.category && selectedCategories.includes(p.category.slug));

      // Availability filter
      const matchesAvailability = !inStockOnly || getProductStock(p);

      // Legacy quick filters
      if (activeFilter === t("search.inStock")) {
        return matchesSearch && matchesAvailability;
      }
      if (activeFilter === t("search.under1m")) {
        return matchesSearch && p.price < 1000000;
      }
      if (activeFilter === t("search.appliances")) {
        return matchesSearch && p.category?.slug === "home";
      }

      return (
        matchesSearch &&
        matchesPrice &&
        matchesRating &&
        matchesCategory &&
        matchesAvailability
      );
    },
  );

  // Sorting
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "popularity":
        return (b.likeCount || 0) - (a.likeCount || 0);
      case "best-selling":
        return (b.soldCount || 0) - (a.soldCount || 0);
      case "newest":
      default:
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
    }
  });

  return (
    <PageCast className="bg-surface  text-slate-900  relative flex flex-col w-full h-full overscroll-none scrollbar-none animate-fade-in">
      {/* Header Search Input */}
      <div className="bg-white/95 /95 backdrop-blur-md px-6 py-4 flex items-center gap-3 border-b border-[#f0edeb]  sticky top-0 z-30 shadow-xs">
        <div className="flex-1 relative flex items-center bg-neutral-50  border border-[#eae8e6]  rounded-full px-5 py-2.5 transition-all focus-within:border-primary focus-within:bg-white :bg-slate-800 focus-within:shadow-xs">
          <MagnifyingGlassIcon className="w-4.5 h-4.5 text-textColor-variant mr-3 flex-shrink-0" strokeWidth={2.5} />
          <input
            type="text"
            placeholder={t("search.placeholder")}
            className="bg-transparent w-full text-xs outline-none text-textColor  placeholder-[#747873] "
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery) {
                saveSearchToHistory(searchQuery);
              }
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-[#747873] hover:text-textColor transition-colors ml-2 border-none bg-transparent cursor-pointer"
            >
              <XMarkIcon className="w-4.5 h-4.5" strokeWidth={2.5} />
            </button>
          )}

          {/* Autocomplete suggestions dropdown */}
          {searchQuery &&
            (Array.isArray(products)
              ? products.filter((p) =>
                  p.name.toLowerCase().includes(searchQuery.toLowerCase()),
                )
              : []
            ).length > 0 && (
              <div className="absolute top-[48px] left-0 right-0 bg-white border border-[#f0edeb] rounded-2xl shadow-xl z-50 divide-y divide-neutral-100 overflow-hidden text-left max-h-56 overflow-y-auto">
                {(Array.isArray(products)
                  ? products.filter((p) =>
                      p.name.toLowerCase().includes(searchQuery.toLowerCase()),
                    )
                  : []
                )
                  .slice(0, 5)
                  .map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSearchQuery(p.name);
                        saveSearchToHistory(p.name);
                        setSelectedProductDetail(p);
                      }}
                      className="px-4.5 py-3.5 text-xs text-textColor hover:bg-[#f2f8f8] cursor-pointer flex justify-between items-center transition-colors"
                    >
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-[9px] text-[#526069]/60 font-bold uppercase tracking-wider bg-neutral-50 px-2 py-0.5 rounded-md border border-[#f0edeb]">
                        {p.category?.name || "Home"}
                      </span>
                    </div>
                  ))}
              </div>
            )}
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs font-semibold text-textColor-variant hover:text-textColor active:scale-95 transition-all"
          >
            {t("search.cancel")}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5.5 space-y-6 pb-28">
        {/* Filters Grid */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none pl-6 pr-6 -mx-6">
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[#eae8e6] bg-white text-xs font-bold text-textColor-variant active:scale-95 transition-all whitespace-nowrap shrink-0"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" strokeWidth={2.2} />
            <span>{t("search.advanced")}</span>
          </button>

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2.5 rounded-full border border-[#eae8e6] bg-white text-xs font-semibold text-textColor-variant outline-none cursor-pointer"
          >
            <option value="newest">
              {lang === "vi" ? "Mới nhất" : "Newest"}
            </option>
            <option value="price-asc">
              {lang === "vi" ? "Giá: Thấp → Cao" : "Price: Low → High"}
            </option>
            <option value="price-desc">
              {lang === "vi" ? "Giá: Cao → Thấp" : "Price: High → Low"}
            </option>
            <option value="popularity">
              {lang === "vi" ? "Phổ biến" : "Popular"}
            </option>
            <option value="best-selling">
              {lang === "vi" ? "Bán chạy" : "Best Selling"}
            </option>
          </select>

          {filterTags.map((tag) => {
            const isActive = activeFilter === tag;
            return (
              <button
                key={tag}
                onClick={() => setActiveFilter(isActive ? null : tag)}
                className={`px-4.5 py-2.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                  isActive
                    ? "border-primary bg-primary-light text-primary font-bold shadow-xs"
                    : "border-[#eae8e6] bg-white text-textColor-variant hover:bg-neutral-50"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {/* Dynamic content rendering based on query */}
        {!debouncedSearchQuery ? (
          <>
            {/* Recent Searches */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-extrabold text-[#526069]/60 uppercase tracking-widest">
                  {t("search.recent")}
                </h3>
                {history.length > 0 && (
                  <button
                    onClick={() => {
                      setHistory([]);
                      localStorage.setItem(
                        "search_history",
                        JSON.stringify([]),
                      );
                    }}
                    className="text-[9px] font-bold text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer"
                  >
                    {t("search.clearHistory")}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2.5 text-left">
                {history.map((term) => (
                  <button
                    key={term}
                    onClick={() => setSearchQuery(term)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#f0edeb] bg-white text-xs text-textColor-variant hover:text-textColor hover:bg-neutral-50 active:scale-95 transition-all shadow-xs border-none cursor-pointer"
                  >
                    <ClockIcon className="w-4 h-4 text-textColor/35" strokeWidth={2.2} />
                    {term}
                  </button>
                ))}
                {history.length === 0 && (
                  <span className="text-[11px] text-textColor-variant/60 italic pl-1">
                    No recent searches
                  </span>
                )}
              </div>
            </div>

            {/* Viewed Products */}
            {viewedProducts.length > 0 && (
              <div className="space-y-3.5">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-[10px] font-extrabold text-[#526069]/60 uppercase tracking-widest">
                    You Viewed
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-x-5 gap-y-7">
                  {viewedProducts.slice(0, 6).map((prod) => {
                    const img = safeParseImages(prod.images)[0];

                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleProductClick(prod)}
                        className="bg-white rounded-2xl overflow-hidden flex flex-col relative border border-[#f0edeb] shadow-xs cursor-pointer group hover:shadow-md transition-all duration-300"
                      >
                        <div className="h-[135px] w-full overflow-hidden bg-neutral-50 border-b border-[#f0edeb]">
                          <LazyImageComponent
                            src={img}
                            alt={prod.name}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="p-3.5 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] text-[#526069]/60 uppercase font-bold tracking-wider">
                              {prod.category?.name}
                            </span>
                            <h3 className="text-xs font-semibold text-textColor mt-0.5 line-clamp-1 group-hover:text-primary transition-colors">
                              {prod.name}
                            </h3>
                          </div>
                          <div className="flex justify-between items-center mt-3.5">
                            <span className="text-xs font-bold text-textColor">
                              {prod.price.toLocaleString("vi-VN")} đ
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(prod);
                              }}
                              className="w-7.5 h-7.5 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-sm active:scale-90 transition-transform"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Categories */}
            <div className="space-y-3.5">
              <h3 className="text-[10px] font-extrabold text-[#526069]/60 uppercase tracking-widest px-1">
                Categories
              </h3>
              <div className="grid grid-cols-2 gap-3.5">
                {categories.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => setSearchQuery(cat.name)}
                    className="p-4 rounded-2xl border border-[#f0edeb] bg-white text-left font-bold text-xs uppercase tracking-wider text-textColor hover:bg-[#f2f8f8] hover:border-primary/20 transition-all shadow-xs"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Suggested Products */}
            <div className="space-y-3.5">
              <h3 className="text-[10px] font-extrabold text-[#526069]/60 uppercase tracking-widest px-1">
                Gợi ý sản phẩm
              </h3>
              <div className="grid grid-cols-2 gap-x-5 gap-y-7">
                {(Array.isArray(products) ? products : [])
                  .slice(0, 10)
                  .map((prod) => {
                    const img = safeParseImages(prod.images)[0];

                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleProductClick(prod)}
                        className="bg-white rounded-2xl overflow-hidden flex flex-col relative border border-[#f0edeb] shadow-xs cursor-pointer group hover:shadow-md transition-all duration-300"
                      >
                        <div className="h-[135px] w-full overflow-hidden bg-neutral-50 border-b border-[#f0edeb]">
                          <LazyImageComponent
                            src={img}
                            alt={prod.name}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="p-3.5 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] text-[#526069]/60 uppercase font-bold tracking-wider">
                              {prod.category?.name}
                            </span>
                            <h3 className="text-xs font-semibold text-textColor mt-0.5 line-clamp-1 group-hover:text-primary transition-colors">
                              {prod.name}
                            </h3>
                          </div>
                          <div className="flex justify-between items-center mt-3.5">
                            <span className="text-xs font-bold text-textColor">
                              {prod.price.toLocaleString("vi-VN")} đ
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(prod);
                              }}
                              className="w-7.5 h-7.5 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-sm active:scale-90 transition-transform"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </>
        ) : (
          /* Search Results Grid */
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-[10px] font-extrabold text-[#526069]/60 uppercase tracking-widest">
                {lang === "vi" ? "Kết quả tìm kiếm" : "Search Results"}
              </h3>
              <span className="text-[10px] text-textColor/45 font-medium">
                {lang === "vi"
                  ? `Tìm thấy ${sortedProducts.length} sản phẩm`
                  : `Found ${sortedProducts.length} products`}
              </span>
            </div>

            {sortedProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[#f0edeb] text-xs text-textColor-variant shadow-xs">
                {t("search.noResults")} "{debouncedSearchQuery}"
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-5 gap-y-7">
                {sortedProducts.map((prod) => {
                  const img = safeParseImages(prod.images)[0];

                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleProductClick(prod)}
                      className="bg-white rounded-2xl overflow-hidden flex flex-col relative border border-[#f0edeb] shadow-xs cursor-pointer group hover:shadow-md transition-all duration-300"
                    >
                      <div className="h-[135px] w-full overflow-hidden bg-neutral-50 border-b border-[#f0edeb]">
                        <LazyImageComponent
                          src={img}
                          alt={prod.name}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] text-[#526069]/60 uppercase font-bold tracking-wider">
                            {prod.category?.name}
                          </span>
                          <h3 className="text-xs font-semibold text-textColor mt-0.5 line-clamp-1 group-hover:text-primary transition-colors">
                            {prod.name}
                          </h3>
                        </div>
                        <div className="flex justify-between items-center mt-3.5">
                          <span className="text-xs font-bold text-textColor">
                            {prod.price.toLocaleString("vi-VN")} đ
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(prod);
                            }}
                            className="w-7.5 h-7.5 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-sm active:scale-90 transition-transform"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advanced Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-textColor">
                Bộ lọc nâng cao
              </h3>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="text-textColor-variant hover:text-textColor border-none bg-transparent cursor-pointer"
              >
                <XMarkIcon className="w-6 h-6" strokeWidth={2} />
              </button>
            </div>

            {/* Price Range */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-textColor mb-3">
                Khoảng giá
              </h4>
              <div className="space-y-4">
                <PriceSlider
                  min={0}
                  max={10000000}
                  value={priceRange}
                  onChange={setPriceRange}
                />
                <div className="flex justify-between text-xs text-textColor-variant font-medium">
                  <span>{priceRange[0].toLocaleString("vi-VN")} đ</span>
                  <span>{priceRange[1].toLocaleString("vi-VN")} đ</span>
                </div>
              </div>
            </div>

            {/* Rating Filter */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-textColor mb-3">
                Đánh giá
              </h4>
              <div className="flex gap-2">
                {[0, 4, 3, 2, 1].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setSelectedRating(rating)}
                    className={`px-4 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      selectedRating === rating
                        ? "border-primary bg-primary-light text-primary"
                        : "border-[#eae8e6] bg-white text-textColor-variant"
                    }`}
                  >
                    {rating === 0 ? "Tất cả" : `${rating}+ sao`}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-textColor mb-3">
                Danh mục
              </h4>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => {
                      setSelectedCategories((prev) =>
                        prev.includes(cat.slug)
                          ? prev.filter((c) => c !== cat.slug)
                          : [...prev, cat.slug],
                      );
                    }}
                    className={`px-4 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      selectedCategories.includes(cat.slug)
                        ? "border-primary bg-primary-light text-primary"
                        : "border-[#eae8e6] bg-white text-textColor-variant"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability Filter */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-5 h-5 text-primary accent-primary"
                />
                <span className="text-sm font-semibold text-textColor">
                  Chỉ hiện sản phẩm còn hàng
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-[#f0edeb]">
              <button
                onClick={() => {
                  setPriceRange([0, 10000000]);
                  setSelectedRating(0);
                  setSelectedCategories([]);
                  setInStockOnly(false);
                }}
                className="flex-1 py-3 rounded-xl border border-[#eae8e6] text-sm font-semibold text-textColor-variant active:scale-95 transition-all"
              >
                Đặt lại
              </button>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold active:scale-95 transition-all"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </PageCast>
  );
};
