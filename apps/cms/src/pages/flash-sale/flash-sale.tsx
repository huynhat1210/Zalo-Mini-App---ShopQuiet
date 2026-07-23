import React, { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '../../utils/api';
import { useToast } from '../../contexts';
import {
  Zap,
  Save,
  Search,
  Package,
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<any[]>([]);

  // Selected products for flash sale: Record<productId, { isFlashSale: boolean, flashSalePrice: number | null, flashSaleDiscount: number }>
  const [flashSaleMap, setFlashSaleMap] = useState<
    Record<number, { isFlashSale: boolean; flashSalePrice: number | null; flashSaleDiscount: number }>
  >({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configRes, prodsRes, catsRes] = await Promise.all([
        apiRequest<any>('/products/flash-sale/config').catch(() => null),
        apiRequest<any[]>('/products?limit=100').catch(() => []),
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

  const handleToggleProduct = (productId: number) => {
    setFlashSaleMap((prev) => {
      const current = prev[productId] || { isFlashSale: false, flashSalePrice: null, flashSaleDiscount: 20 };
      return {
        ...prev,
        [productId]: {
          ...current,
          isFlashSale: !current.isFlashSale,
        },
      };
    });
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

      const productSales = Object.entries(flashSaleMap).map(([idStr, val]) => ({
        productId: parseInt(idStr, 10),
        isFlashSale: val.isFlashSale,
        flashSalePrice: val.flashSalePrice,
        flashSaleDiscount: val.flashSaleDiscount,
      }));

      await apiRequest('/products/flash-sale/admin', 'POST', {
        active: isActive,
        startTime: startTime ? new Date(startTime).toISOString() : null,
        endTime: endTime ? new Date(endTime).toISOString() : null,
        productSales,
      });

      success('Lưu chiến dịch Flash Sale thành công', 'Cấu hình thời gian và sản phẩm sale đã được đồng bộ trực tiếp.');
      fetchData();
    } catch (err: any) {
      toastError('Lưu thất bại', err.message || 'Lỗi khi lưu cấu hình Flash Sale');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = useMemo(() => {
    return Object.values(flashSaleMap).filter((v) => v.isFlashSale).length;
  }, [flashSaleMap]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toString().includes(searchTerm);
      const matchCat = selectedCategory === 'all' || p.categoryId.toString() === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, selectedCategory]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 bg-slate-50">
        <div className="w-10 h-10 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-xs font-semibold">Đang tải cấu hình Flash Sale...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800 pb-16">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-500/20">
              <Zap size={22} className="fill-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quản Lý Chiến Dịch Flash Sale</h1>
              <p className="text-slate-500 text-xs mt-0.5">Cài đặt thời gian đếm ngược, chọn sản phẩm và mức giảm giá riêng biệt</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveCampaign}
          disabled={saving}
          className="px-6 py-3 bg-[#0e6877] hover:bg-[#0c5966] disabled:bg-slate-300 text-white text-xs font-black rounded-2xl transition-all flex items-center gap-2 border-none cursor-pointer shadow-md shadow-teal-900/20 active:scale-95"
        >
          <Save size={16} className={saving ? 'animate-spin' : ''} />
          <span>{saving ? 'Đang Lưu...' : 'Lưu Cấu Hình Flash Sale'}</span>
        </button>
      </div>

      {/* Campaign Controls Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Trạng Thái Chiến Dịch</h3>
            <p className="text-slate-500 text-xs mt-1">Bật để kích hoạt Flash Sale hiển thị trên Zalo Mini App</p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
            <span className="ml-3 text-xs font-black uppercase tracking-wider text-slate-900">
              {isActive ? '⚡ ĐANG BẬT (ACTIVE)' : '⚪ TẮT (INACTIVE)'}
            </span>
          </label>
        </div>

        {/* Time Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 block">Thời gian BẮT ĐẦU</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-[#0e6877] focus:outline-none transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 block">Thời gian KẾT THÚC (Đếm ngược)</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-[#0e6877] focus:outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Product Selection Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Package size={16} className="text-[#0e6877]" />
              <span>Danh Sách Sản Phẩm Tham Gia Flash Sale</span>
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Đã chọn <strong className="text-amber-600 font-black">{selectedCount}</strong> sản phẩm tham gia sale
            </p>
          </div>

          {/* Filters */}
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0e6877]"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id.toString()}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700 whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">Bật Sale</th>
                <th className="py-3.5 px-4">Sản phẩm</th>
                <th className="py-3.5 px-4 text-right">Giá gốc</th>
                <th className="py-3.5 px-4 text-center">% Giảm Giá</th>
                <th className="py-3.5 px-4 text-right">Giá Flash Sale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const itemConfig = flashSaleMap[p.id] || { isFlashSale: false, flashSalePrice: null, flashSaleDiscount: 20 };
                const calcSalePrice = itemConfig.flashSalePrice || Math.round(p.price * (1 - itemConfig.flashSaleDiscount / 100));

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      itemConfig.isFlashSale ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={itemConfig.isFlashSale}
                        onChange={() => handleToggleProduct(p.id)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                        {p.images && (
                          <img
                            src={typeof p.images === 'string' && p.images.startsWith('[') ? JSON.parse(p.images)[0] : p.images}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-900">{p.name}</p>
                        <span className="text-[10px] text-slate-400 font-semibold">{p.category?.name || 'Khác'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-600">
                      {p.price.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {itemConfig.isFlashSale ? (
                        <div className="inline-flex items-center gap-1 border border-slate-200 rounded-xl px-2 py-1 bg-white">
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={itemConfig.flashSaleDiscount}
                            onChange={(e) => handleUpdateDiscount(p.id, parseInt(e.target.value, 10) || 0)}
                            className="w-12 text-center text-xs font-black text-amber-600 focus:outline-none"
                          />
                          <span className="text-xs font-bold text-slate-400">%</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {itemConfig.isFlashSale ? (
                        <div className="inline-flex items-center gap-1 border border-amber-300 rounded-xl px-2.5 py-1 bg-white shadow-2xs">
                          <input
                            type="number"
                            step="1000"
                            value={itemConfig.flashSalePrice || calcSalePrice}
                            onChange={(e) => handleUpdatePrice(p.id, parseInt(e.target.value, 10) || 0)}
                            className="w-24 text-right text-xs font-black text-emerald-600 focus:outline-none"
                          />
                          <span className="text-xs font-extrabold text-slate-500">đ</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FlashSaleManagement;
