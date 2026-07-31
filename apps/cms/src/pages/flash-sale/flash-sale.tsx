import React, { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '../../utils/api';
import { useToast } from '../../contexts';
import { PaginationComponent } from '../../components';
import {
  Zap,
  Save,
  Search,
  Package,
  Plus,
  X,
  Clock,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  AlertOctagon,
  XCircle,
} from 'lucide-react';

export const FlashSaleManagement: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Campaign State
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Products & Sales State
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Selected products map for flash sale: Record<productId, { isFlashSale: boolean, flashSalePrice: number | null, flashSaleDiscount: number }>
  const [flashSaleMap, setFlashSaleMap] = useState<
    Record<number, { isFlashSale: boolean; flashSalePrice: number | null; flashSaleDiscount: number }>
  >({});

  // LEFT COLUMN (Non-Sale Products) States
  const [leftSearch, setLeftSearch] = useState('');
  const [leftCategory, setLeftCategory] = useState('all');
  const [leftCurrentPage, setLeftCurrentPage] = useState(1);
  const [leftItemsPerPage, setLeftItemsPerPage] = useState(8);

  // RIGHT COLUMN (Flash Sale Products) States
  const [rightSearch, setRightSearch] = useState('');
  const [rightCurrentPage, setRightCurrentPage] = useState(1);
  const [rightItemsPerPage, setRightItemsPerPage] = useState(8);

  // Check if current set endTime is past current time
  const isExpired = useMemo(() => {
    if (!endTime) return false;
    const endMs = new Date(endTime).getTime();
    return !isNaN(endMs) && endMs <= Date.now();
  }, [endTime]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configRes, prodsRes, catsRes] = await Promise.all([
        apiRequest<any>('/products/flash-sale/config').catch(() => null),
        apiRequest<any[]>('/products?limit=200&include_flash_sale=true').catch(() => []),
        apiRequest<any[]>('/categories').catch(() => []),
      ]);

      if (configRes) {
        setIsActive(!!configRes.active);
        setStartTime(configRes.startTime ? new Date(configRes.startTime).toISOString().slice(0, 16) : '');
        setEndTime(configRes.endTime ? new Date(configRes.endTime).toISOString().slice(0, 16) : '');
      }

      const prodList = Array.isArray(prodsRes) ? prodsRes : (prodsRes as any)?.data || [];
      setProducts(prodList);
      setCategories(Array.isArray(catsRes) ? catsRes : []);

      // Build initial map from products
      const map: Record<number, { isFlashSale: boolean; flashSalePrice: number | null; flashSaleDiscount: number }> = {};
      prodList.forEach((p: any) => {
        map[p.id] = {
          isFlashSale: !!p.isFlashSale,
          flashSalePrice: p.flashSalePrice || null,
          flashSaleDiscount: p.flashSaleDiscount || 20,
        };
      });
      setFlashSaleMap(map);
    } catch (err) {
      console.error('Failed to load flash sale data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddToFlashSale = (productId: number) => {
    setFlashSaleMap((prev) => {
      const current = prev[productId] || { isFlashSale: false, flashSalePrice: null, flashSaleDiscount: 20 };
      const product = products.find((p) => p.id === productId);
      const calcPrice = product ? Math.round(product.price * (1 - (current.flashSaleDiscount || 20) / 100)) : null;
      return {
        ...prev,
        [productId]: {
          ...current,
          isFlashSale: true,
          flashSalePrice: current.flashSalePrice || calcPrice,
        },
      };
    });
  };

  const handleRemoveFromFlashSale = (productId: number) => {
    setFlashSaleMap((prev) => {
      const current = prev[productId] || { isFlashSale: true, flashSalePrice: null, flashSaleDiscount: 20 };
      return {
        ...prev,
        [productId]: {
          ...current,
          isFlashSale: false,
        },
      };
    });
  };

  const handleClearExpiredSales = () => {
    setFlashSaleMap((prev) => {
      const updated: Record<number, { isFlashSale: boolean; flashSalePrice: number | null; flashSaleDiscount: number }> = {};
      Object.keys(prev).forEach((idStr) => {
        const id = parseInt(idStr, 10);
        updated[id] = {
          ...prev[id],
          isFlashSale: false,
        };
      });
      return updated;
    });
    setIsActive(false);
    success('Đã gỡ sản phẩm hết hạn', 'Tất cả sản phẩm Flash Sale cũ đã được chuyển lại kho chưa sale.');
  };

  const handleUpdateDiscount = (productId: number, discount: number) => {
    const validDiscount = Math.min(99, Math.max(1, discount));
    setFlashSaleMap((prev) => {
      const current = prev[productId] || { isFlashSale: true, flashSalePrice: null, flashSaleDiscount: 20 };
      const product = products.find((p) => p.id === productId);
      const calcPrice = product ? Math.round(product.price * (1 - validDiscount / 100)) : null;
      return {
        ...prev,
        [productId]: {
          ...current,
          flashSaleDiscount: validDiscount,
          flashSalePrice: calcPrice,
        },
      };
    });
  };

  const handleUpdatePrice = (productId: number, salePrice: number) => {
    setFlashSaleMap((prev) => {
      const current = prev[productId] || { isFlashSale: true, flashSalePrice: null, flashSaleDiscount: 20 };
      const product = products.find((p) => p.id === productId);
      let calcDiscount = current.flashSaleDiscount;
      if (product && product.price > salePrice && salePrice > 0) {
        calcDiscount = Math.round(((product.price - salePrice) / product.price) * 100);
      }
      return {
        ...prev,
        [productId]: {
          ...current,
          flashSalePrice: salePrice > 0 ? salePrice : null,
          flashSaleDiscount: calcDiscount,
        },
      };
    });
  };

  const handleSaveCampaign = async () => {
    try {
      setSaving(true);

      // If expired, active will be automatically false unless user updated endTime
      const activeState = isExpired ? false : isActive;

      const productSales = Object.entries(flashSaleMap).map(([idStr, val]) => ({
        productId: parseInt(idStr, 10),
        // If expired, clear isFlashSale for all items
        isFlashSale: isExpired ? false : val.isFlashSale,
        flashSalePrice: val.flashSalePrice,
        flashSaleDiscount: val.flashSaleDiscount,
      }));

      await apiRequest('/products/flash-sale/admin', 'POST', {
        active: activeState,
        startTime: startTime ? new Date(startTime).toISOString() : null,
        endTime: endTime ? new Date(endTime).toISOString() : null,
        productSales,
      });

      success('Lưu chiến dịch Flash Sale thành công', 'Cấu hình thời gian và danh sách sản phẩm sale đã được đồng bộ trực tiếp.');
      fetchData();
    } catch (err: any) {
      toastError('Lưu thất bại', err.message || 'Lỗi khi lưu cấu hình Flash Sale');
    } finally {
      setSaving(false);
    }
  };

  // Filter Left Table: ONLY products where isFlashSale === false (or all products if expired)
  const leftFilteredProducts = useMemo(() => {
    return products.filter((p) => {
      const isSale = isExpired ? false : !!flashSaleMap[p.id]?.isFlashSale;
      if (isSale) return false;

      const matchSearch =
        p.name.toLowerCase().includes(leftSearch.toLowerCase()) ||
        p.id.toString().includes(leftSearch);
      const matchCat =
        leftCategory === 'all' || p.categoryId.toString() === leftCategory;
      return matchSearch && matchCat;
    });
  }, [products, flashSaleMap, leftSearch, leftCategory, isExpired]);

  // Filter Right Table: ONLY products where isFlashSale === true (if campaign is NOT expired)
  const rightFilteredProducts = useMemo(() => {
    if (isExpired) return []; // Products automatically disappear from Flash Sale table when campaign expires!
    return products.filter((p) => {
      const isSale = !!flashSaleMap[p.id]?.isFlashSale;
      if (!isSale) return false;

      const matchSearch =
        p.name.toLowerCase().includes(rightSearch.toLowerCase()) ||
        p.id.toString().includes(rightSearch);
      return matchSearch;
    });
  }, [products, flashSaleMap, rightSearch, isExpired]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 bg-slate-50">
        <div className="w-10 h-10 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-xs font-semibold">Đang tải cấu hình Flash Sale...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800 pb-16 max-w-[1600px] mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#0e6877] text-white rounded-2xl shadow-md shadow-teal-900/20">
              <Zap size={22} className="fill-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quản Lý Chiến Dịch Flash Sale</h1>
              <p className="text-slate-500 text-xs mt-0.5">Chọn sản phẩm tham gia sale từ kho bên trái sang bảng Flash Sale bên phải</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isExpired && (
            <button
              onClick={handleClearExpiredSales}
              className="px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-2xl transition-all flex items-center gap-1.5 border border-amber-200 cursor-pointer active:scale-95"
            >
              <RotateCcw size={15} />
              <span>Gỡ SP Hết Hạn</span>
            </button>
          )}
          <button
            onClick={handleSaveCampaign}
            disabled={saving}
            className="px-6 py-3 bg-[#0e6877] hover:bg-[#0c5966] disabled:bg-slate-300 text-white text-xs font-black rounded-2xl transition-all flex items-center gap-2 border-none cursor-pointer shadow-md shadow-teal-900/20 active:scale-95"
          >
            <Save size={16} className={saving ? 'animate-spin' : ''} />
            <span>{saving ? 'Đang Lưu...' : 'Lưu Cấu Hình Flash Sale'}</span>
          </button>
        </div>
      </div>

      {/* EXPIRED BANNER ALERT */}
      {isExpired && (
        <div className="bg-amber-50 border border-amber-200/80 p-4.5 rounded-3xl flex items-center gap-3.5 shadow-2xs">
          <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 text-xs">
            <h4 className="font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={15} className="text-amber-700" />
              <span>Chiến Dịch Flash Sale Đã Hết Thời Gian Đếm Ngược</span>
            </h4>
            <p className="text-amber-800/90 font-medium mt-0.5">
              Đã hết hạn lúc {endTime ? new Date(endTime).toLocaleString('vi-VN') : 'Đã qua'}. Sản phẩm đã chọn tự động quay về kho chưa sale.
            </p>
          </div>
        </div>
      )}

      {/* Campaign Settings Controls */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-[#0e6877]" /> Trạng Thái Chiến Dịch
            </h3>
            <p className="text-slate-500 text-xs mt-1">Bật để kích hoạt đếm ngược & giá ưu đãi Flash Sale trên Zalo Mini App</p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive && !isExpired}
              disabled={isExpired}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#0e6877]"></div>
            <span className="ml-3 text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              {isExpired ? (
                <>
                  <AlertOctagon size={15} className="text-amber-600" />
                  <span>HẾT HẠN (EXPIRED)</span>
                </>
              ) : isActive ? (
                <>
                  <Zap size={15} className="text-[#0e6877] fill-[#0e6877]" />
                  <span>ĐANG BẬT (ACTIVE)</span>
                </>
              ) : (
                <>
                  <XCircle size={15} className="text-slate-400" />
                  <span>TẮT (INACTIVE)</span>
                </>
              )}
            </span>
          </label>
        </div>

        {/* Time Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
              <Clock size={14} className="text-slate-400" /> Thời gian BẮT ĐẦU
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-[#0e6877] focus:outline-none transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
              <Clock size={14} className="text-[#0e6877]" /> Thời gian KẾT THÚC (Đếm ngược)
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none transition-all ${
                isExpired ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200 focus:border-[#0e6877]'
              }`}
            />
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN DUAL-TABLE SIDE-BY-SIDE LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* ── LEFT COLUMN: KHO SẢN PHẨM CHƯA SALE ── */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 flex flex-col min-h-[600px] justify-between">
          <div className="space-y-4">
            {/* Header & Filter */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Package size={16} className="text-[#0e6877]" />
                  <span>Kho Sản Phẩm Chưa Sale ({leftFilteredProducts.length})</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Bấm "Thêm vào Sale" để chuyển sản phẩm sang danh sách Flash Sale bên phải</p>
              </div>
            </div>

            {/* Controls: Search & Category */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm sản phẩm chưa sale..."
                  value={leftSearch}
                  onChange={(e) => { setLeftSearch(e.target.value); setLeftCurrentPage(1); }}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0e6877]"
                />
              </div>

              <select
                value={leftCategory}
                onChange={(e) => { setLeftCategory(e.target.value); setLeftCurrentPage(1); }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer shrink-0"
              >
                <option value="all">Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id.toString()}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-150">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Sản phẩm</th>
                    <th className="py-3 px-3 text-right">Giá niêm yết</th>
                    <th className="py-3 px-3 text-center w-28">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {leftFilteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-slate-400 text-xs font-medium">
                        Không có sản phẩm nào chưa tham gia Flash Sale.
                      </td>
                    </tr>
                  ) : (
                    leftFilteredProducts
                      .slice((leftCurrentPage - 1) * leftItemsPerPage, leftCurrentPage * leftItemsPerPage)
                      .map((p) => {
                        let imgUrl = '';
                        try {
                          if (p.images) {
                            const parsed = JSON.parse(p.images);
                            if (Array.isArray(parsed) && parsed.length > 0) imgUrl = parsed[0];
                          }
                        } catch {
                          if (typeof p.images === 'string') imgUrl = p.images;
                        }

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={imgUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30'}
                                  alt=""
                                  className="w-9 h-9 object-cover rounded-lg border border-slate-200 shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="font-bold text-xs text-slate-900 truncate max-w-[160px]" title={p.name}>{p.name}</p>
                                  <span className="text-[10px] text-slate-400 font-semibold block">{p.category?.name || 'Khác'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-extrabold text-slate-700 whitespace-nowrap">
                              {p.price.toLocaleString('vi-VN')} đ
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => handleAddToFlashSale(p.id)}
                                disabled={isExpired}
                                title={isExpired ? "Vui lòng chỉnh thời gian kết thúc trước khi thêm" : "Thêm vào Flash Sale"}
                                className={`px-3 py-1.5 text-white text-[11px] font-black rounded-xl transition-all border-none cursor-pointer flex items-center justify-center gap-1 mx-auto shadow-2xs active:scale-95 ${
                                  isExpired ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#0e6877] hover:bg-[#0c5966]'
                                }`}
                              >
                                <span>Thêm</span>
                                <Plus size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Left */}
          {leftFilteredProducts.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <PaginationComponent
                currentPage={leftCurrentPage}
                totalPages={Math.max(1, Math.ceil(leftFilteredProducts.length / leftItemsPerPage))}
                totalItems={leftFilteredProducts.length}
                itemsPerPage={leftItemsPerPage}
                onPageChange={setLeftCurrentPage}
                onItemsPerPageChange={(newSize) => {
                  setLeftItemsPerPage(newSize);
                  setLeftCurrentPage(1);
                }}
              />
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: DANH SÁCH SẢN PHẨM ĐANG FLASH SALE (Chủ đạo Teal Palette) ── */}
        <div className="bg-teal-50/50 p-5 rounded-3xl border border-teal-200/80 shadow-xs space-y-4 flex flex-col min-h-[600px] justify-between">
          <div className="space-y-4">
            {/* Header & Filter */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-teal-200/60">
              <div>
                <h3 className="text-xs font-black text-teal-950 uppercase tracking-wider flex items-center gap-2">
                  <Zap size={16} className="text-[#0e6877] fill-[#0e6877]" />
                  <span>Đang Chọn Flash Sale ({rightFilteredProducts.length})</span>
                </h3>
                <p className="text-[11px] text-teal-800/80 font-medium mt-0.5">
                  {isExpired
                    ? 'Chiến dịch đã hết hạn - tất cả sản phẩm đã tự động gỡ khỏi bảng sale'
                    : 'Tùy chỉnh mức giảm giá % hoặc gõ trực tiếp giá Sale cho từng sản phẩm'}
                </p>
              </div>

              <span className="text-[11px] font-black bg-[#0e6877] text-white px-2.5 py-1 rounded-full shadow-2xs flex items-center gap-1">
                <Zap size={13} className="fill-white" />
                <span>{rightFilteredProducts.length} SP</span>
              </span>
            </div>

            {/* Search Right */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-[#0e6877]/70" />
              <input
                type="text"
                placeholder="Tìm sản phẩm trong danh sách Flash Sale..."
                value={rightSearch}
                onChange={(e) => { setRightSearch(e.target.value); setRightCurrentPage(1); }}
                className="w-full pl-8 pr-3 py-2 bg-white border border-teal-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0e6877]"
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-teal-200/80 bg-white">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead className="bg-teal-100/60 text-[10px] font-extrabold uppercase text-teal-950 border-b border-teal-200">
                  <tr>
                    <th className="py-3 px-3">Sản phẩm Sale</th>
                    <th className="py-3 px-3 text-center w-24">% Giảm</th>
                    <th className="py-3 px-3 text-right">Giá Flash Sale</th>
                    <th className="py-3 px-3 text-center w-16">Bỏ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-100 text-xs">
                  {rightFilteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-teal-900/60 text-xs font-medium">
                        {isExpired
                          ? '⏰ Chiến dịch Flash Sale đã hết hạn. Các sản phẩm chọn trước đó đã tự động gỡ khỏi bảng này.'
                          : 'Chưa chọn sản phẩm nào vào Flash Sale. Hãy chọn sản phẩm từ kho bên trái!'}
                      </td>
                    </tr>
                  ) : (
                    rightFilteredProducts
                      .slice((rightCurrentPage - 1) * rightItemsPerPage, rightCurrentPage * rightItemsPerPage)
                      .map((p) => {
                        const cfg = flashSaleMap[p.id] || { isFlashSale: true, flashSalePrice: null, flashSaleDiscount: 20 };
                        const calcSalePrice = cfg.flashSalePrice || Math.round(p.price * (1 - cfg.flashSaleDiscount / 100));

                        let imgUrl = '';
                        try {
                          if (p.images) {
                            const parsed = JSON.parse(p.images);
                            if (Array.isArray(parsed) && parsed.length > 0) imgUrl = parsed[0];
                          }
                        } catch {
                          if (typeof p.images === 'string') imgUrl = p.images;
                        }

                        return (
                          <tr key={p.id} className="hover:bg-teal-50/50 transition-colors">
                            {/* Product Info */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="relative shrink-0">
                                  <img
                                    src={imgUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30'}
                                    alt=""
                                    className="w-9 h-9 object-cover rounded-lg border border-teal-200"
                                  />
                                  <span className="absolute -top-1 -right-1 bg-[#0e6877] text-white text-[7.5px] font-black px-1 rounded-full">
                                    -{cfg.flashSaleDiscount}%
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-xs text-slate-900 truncate max-w-[130px]" title={p.name}>{p.name}</p>
                                  <span className="text-[10px] text-slate-400 line-through block">
                                    {p.price.toLocaleString('vi-VN')} đ
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Discount Input */}
                            <td className="py-2.5 px-2 text-center">
                              <div className="inline-flex items-center gap-0.5 border border-teal-300 rounded-xl px-1.5 py-1 bg-white shadow-2xs">
                                <input
                                  type="number"
                                  min="1"
                                  max="99"
                                  value={cfg.flashSaleDiscount}
                                  onChange={(e) => handleUpdateDiscount(p.id, parseInt(e.target.value, 10) || 0)}
                                  className="w-8 text-center text-xs font-black text-[#0e6877] focus:outline-none"
                                />
                                <span className="text-[11px] font-bold text-slate-400">%</span>
                              </div>
                            </td>

                            {/* Sale Price Input */}
                            <td className="py-2.5 px-2 text-right">
                              <div className="inline-flex items-center gap-0.5 border border-teal-300 rounded-xl px-2 py-1 bg-white shadow-2xs">
                                <input
                                  type="number"
                                  step="1000"
                                  value={cfg.flashSalePrice || calcSalePrice}
                                  onChange={(e) => handleUpdatePrice(p.id, parseInt(e.target.value, 10) || 0)}
                                  className="w-20 text-right text-xs font-black text-emerald-600 focus:outline-none"
                                />
                                <span className="text-[10px] font-bold text-slate-400">đ</span>
                              </div>
                            </td>

                            {/* Remove Action */}
                            <td className="py-2.5 px-2 text-center">
                              <button
                                onClick={() => handleRemoveFromFlashSale(p.id)}
                                title="Bỏ chọn khỏi Flash Sale"
                                className="p-1.5 text-rose-500 hover:bg-rose-100/80 rounded-xl transition-all border-none cursor-pointer inline-flex items-center justify-center"
                              >
                                <X size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Right */}
          {rightFilteredProducts.length > 0 && (
            <div className="pt-2 border-t border-teal-200/60">
              <PaginationComponent
                currentPage={rightCurrentPage}
                totalPages={Math.max(1, Math.ceil(rightFilteredProducts.length / rightItemsPerPage))}
                totalItems={rightFilteredProducts.length}
                itemsPerPage={rightItemsPerPage}
                onPageChange={setRightCurrentPage}
                onItemsPerPageChange={(newSize) => {
                  setRightItemsPerPage(newSize);
                  setRightCurrentPage(1);
                }}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default FlashSaleManagement;
