import { useState, useEffect } from 'react';
import { Page } from 'zmp-ui';
import { useCart, IProduct } from '../../App';
import { useDebounce } from '../../utils';
import { useAllProducts, useCategories } from '../../hooks/queries';
import { ISearchComponentProps } from './search.type';

const PageCast = Page as any;

export const SearchComponent: React.FC<ISearchComponentProps> = (_props) => {
  const { setSelectedProductDetail, addToCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Dynamic API state via React Query
  const { data: productsData } = useAllProducts();
  const { data: categoriesData } = useCategories();

  const products = productsData || [];
  const categories = (categoriesData || []) as any[];

  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('search_history');
      if (cached) return JSON.parse(cached);
    }
    return ['Linen', 'Boots', 'Coat', 'Walnut'];
  });

  const saveSearchToHistory = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setHistory(prev => {
      const filtered = prev.filter(x => x !== clean);
      const updated = [clean, ...filtered].slice(0, 6);
      localStorage.setItem('search_history', JSON.stringify(updated));
      return updated;
    });
  };

  const filterTags = ['Price < $50', 'Home Goods', 'In Stock'];

  // Filtering
  const filteredProducts = (Array.isArray(products) ? products : []).filter(p => {
    const query = debouncedSearchQuery.toLowerCase().trim();
    const matchesSearch = 
      p.name.toLowerCase().includes(query) || 
      p.description.toLowerCase().includes(query) ||
      (p.category && (
        p.category.name.toLowerCase().includes(query) ||
        p.category.slug.toLowerCase().includes(query)
      ));
    
    if (activeFilter === 'In Stock') {
      return matchesSearch;
    }
    if (activeFilter === 'Price < $50') {
      return matchesSearch && p.price < 50;
    }
    if (activeFilter === 'Home Goods') {
      return matchesSearch && p.category?.slug === 'home';
    }
    return matchesSearch;
  });

  return (
    <PageCast className="bg-surface relative flex flex-col w-full h-full overscroll-none scrollbar-none animate-fade-in">
      {/* Header Search Input */}
      <div className="bg-white/95 backdrop-blur-md px-6 py-4 flex items-center gap-3 border-b border-[#f0edeb] sticky top-0 z-30 shadow-xs">
        <div className="flex-1 relative flex items-center bg-neutral-50 border border-[#eae8e6] rounded-full px-5 py-2.5 transition-all focus-within:border-primary focus-within:bg-white focus-within:shadow-xs">
          <svg className="w-4.5 h-4.5 text-textColor-variant mr-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search for minimal goods..."
            className="bg-transparent w-full text-xs outline-none text-textColor placeholder-[#747873]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery) {
                saveSearchToHistory(searchQuery);
              }
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[#747873] hover:text-textColor transition-colors ml-2 border-none bg-transparent cursor-pointer">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Autocomplete suggestions dropdown */}
          {searchQuery && (Array.isArray(products) ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())) : []).length > 0 && (
            <div className="absolute top-[48px] left-0 right-0 bg-white border border-[#f0edeb] rounded-2xl shadow-xl z-50 divide-y divide-neutral-100 overflow-hidden text-left max-h-56 overflow-y-auto">
              {(Array.isArray(products) ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())) : [])
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
                    <span className="text-[9px] text-[#526069]/60 font-bold uppercase tracking-wider bg-neutral-50 px-2 py-0.5 rounded-md border border-[#f0edeb]">{p.category?.name || 'Home'}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-xs font-semibold text-textColor-variant hover:text-textColor active:scale-95 transition-all">
            Cancel
          </button>
        )}
      </div>

      <div className="flex-1 px-6 py-5.5 space-y-6 pb-28">
        {/* Filters Grid */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none pl-6 pr-6 -mx-6">
          <button 
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[#eae8e6] bg-white text-xs font-bold text-textColor-variant active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.59l-5.432 5.432a2.25 2.25 0 00-.659 1.59v3.414a2.25 2.25 0 01-.659 1.59l-1.87 1.87a.75.75 0 01-1.28-.53v-6.344a2.25 2.25 0 00-.659-1.59L3.659 7.408A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A50.06 50.06 0 0112 3z" />
            </svg>
            <span>Filter</span>
          </button>

          {filterTags.map(tag => {
            const isActive = activeFilter === tag;
            return (
              <button
                key={tag}
                onClick={() => setActiveFilter(isActive ? null : tag)}
                className={`px-4.5 py-2.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                  isActive 
                    ? 'border-primary bg-primary-light text-primary font-bold shadow-xs' 
                    : 'border-[#eae8e6] bg-white text-textColor-variant hover:bg-neutral-50'
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
                <h3 className="text-[10px] font-extrabold text-[#526069]/60 uppercase tracking-widest">Recent Searches</h3>
                {history.length > 0 && (
                  <button
                    onClick={() => {
                      setHistory([]);
                      localStorage.setItem('search_history', JSON.stringify([]));
                    }}
                    className="text-[9px] font-bold text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer"
                  >
                    Xóa lịch sử
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2.5 text-left">
                {history.map(term => (
                  <button
                    key={term}
                    onClick={() => setSearchQuery(term)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#f0edeb] bg-white text-xs text-textColor-variant hover:text-textColor hover:bg-neutral-50 active:scale-95 transition-all shadow-xs border-none cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-textColor/35" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {term}
                  </button>
                ))}
                {history.length === 0 && (
                  <span className="text-[11px] text-textColor-variant/60 italic pl-1">Không có tìm kiếm gần đây</span>
                )}
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-3.5">
              <h3 className="text-[10px] font-extrabold text-[#526069]/60 uppercase tracking-widest px-1">Categories</h3>
              <div className="grid grid-cols-2 gap-3.5">
                {categories.map(cat => (
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
          </>
        ) : (
          /* Search Results Grid */
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-[10px] font-extrabold text-[#526069]/60 uppercase tracking-widest">Search Results</h3>
              <span className="text-[10px] text-textColor/45 font-medium">{filteredProducts.length} Goods Found</span>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[#f0edeb] text-xs text-textColor-variant shadow-xs">
                No products found matching "{debouncedSearchQuery}"
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-5 gap-y-7">
                {filteredProducts.map(prod => {
                  let img = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80';
                  try {
                    const parsed = JSON.parse(prod.images);
                    if (parsed && parsed.length > 0) img = parsed[0];
                  } catch (e) {}

                  return (
                    <div
                      key={prod.id}
                      onClick={() => setSelectedProductDetail(prod)}
                      className="bg-white rounded-2xl overflow-hidden flex flex-col relative border border-[#f0edeb] shadow-xs cursor-pointer group hover:shadow-md transition-all duration-300"
                    >
                      <div className="h-[135px] w-full overflow-hidden bg-neutral-50 border-b border-[#f0edeb]">
                        <img src={img} alt={prod.name} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" />
                      </div>
                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] text-[#526069]/60 uppercase font-bold tracking-wider">{prod.category?.name}</span>
                          <h3 className="text-xs font-semibold text-textColor mt-0.5 line-clamp-1 group-hover:text-primary transition-colors">{prod.name}</h3>
                        </div>
                        <div className="flex justify-between items-center mt-3.5">
                          <span className="text-xs font-bold text-textColor">${prod.price.toFixed(2)}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); addToCart(prod); }}
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
    </PageCast>
  );
}
