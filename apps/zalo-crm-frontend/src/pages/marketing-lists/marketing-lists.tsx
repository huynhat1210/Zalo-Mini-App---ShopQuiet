import React, { useEffect, useState } from 'react';
import { crmApiRequest } from '../../utils/api';
import {
  FolderOpen,
  Plus,
  Users,
  Search,
  Trash2,
  X,
  Compass,
  CheckCircle2,
  Clock,
  Link,
  Database,
  Smartphone,
  Check,
  AlertCircle
} from 'lucide-react';
import { useToast } from '../../contexts';

interface IMarketingList {
  id: number;
  name: string;
  description?: string | null;
  sourceType: string; // 'PASTE', 'GROUP_SCAN'
  sourceId?: string | null;
  createdAt: string;
  totalEntries: number;
  verifiedEntries: number;
  hasZaloEntries: number;
  status: string; // 'PROCESSING', 'COMPLETED'
}

interface IEntry {
  id: number;
  phone: string;
  name?: string | null;
  zaloUid?: string | null;
  hasZalo: boolean;
  status: string; // 'PENDING', 'VERIFIED'
}

export const MarketingLists: React.FC = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [lists, setLists] = useState<IMarketingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<any | null>(null);
  const [listEntries, setListEntries] = useState<IEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  // Forms
  const [listName, setListName] = useState('');
  const [listDesc, setListDesc] = useState('');
  const [phonesText, setPhonesText] = useState('');
  const [groupUrl, setGroupUrl] = useState('');
  const [scanListName, setScanListName] = useState('');

  // Scanning State Simulation
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStateText, setScanStateText] = useState('');

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      setLoading(true);
      const res = await crmApiRequest<IMarketingList[]>('/marketing-lists');
      setLists(res || []);
    } catch (e) {
      toastError('Lỗi', 'Không thể tải danh sách tệp khách hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listName.trim()) {
      toastError('Lỗi', 'Vui lòng nhập tên tệp khách hàng');
      return;
    }
    const phones = phonesText
      .split(/[\n,;]/)
      .map(p => p.trim())
      .filter(p => p !== '');

    if (phones.length === 0) {
      toastError('Lỗi', 'Vui lòng nhập ít nhất một số điện thoại');
      return;
    }

    try {
      const res = await crmApiRequest('/marketing-lists', 'POST', {
        name: listName,
        description: listDesc,
        phones,
      });
      if (res) {
        toastSuccess('Thành công', 'Đã tạo tệp khách hàng và bắt đầu tra cứu Zalo!');
        setIsCreateModalOpen(false);
        resetCreateForm();
        fetchLists();
      }
    } catch (e: any) {
      toastError('Thất bại', e.message || 'Không thể tạo tệp khách hàng');
    }
  };

  const resetCreateForm = () => {
    setListName('');
    setListDesc('');
    setPhonesText('');
  };

  const handleScanGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupUrl.trim()) {
      toastError('Lỗi', 'Vui lòng nhập Link/ID nhóm Zalo');
      return;
    }

    setIsScanning(true);
    setScanProgress(5);
    setScanStateText('Đang thiết lập kết nối đến Zalo Group...');

    // Simulate nice progress increments
    const intervals = [
      { progress: 20, text: 'Đang kết nối thành công Zalo Sandbox API...', delay: 800 },
      { progress: 45, text: 'Đang giải mã danh sách thành viên nhóm...', delay: 1500 },
      { progress: 70, text: 'Đang trích xuất UID Zalo và ảnh đại diện thành viên công khai...', delay: 2400 },
      { progress: 90, text: 'Đang đồng bộ SĐT liên kết...', delay: 3200 },
      { progress: 100, text: 'Hoàn thành nạp dữ liệu thành công!', delay: 4000 }
    ];

    intervals.forEach(step => {
      setTimeout(() => {
        setScanProgress(step.progress);
        setScanStateText(step.text);
        if (step.progress === 100) {
          executeScanRequest();
        }
      }, step.delay);
    });
  };

  const executeScanRequest = async () => {
    try {
      const res = await crmApiRequest('/marketing-lists/scan-group', 'POST', {
        groupUrl,
        listName: scanListName,
      });
      if (res) {
        toastSuccess('Quét thành công', `Đã tìm thấy và lưu ${res.totalEntries} thành viên nhóm vào tệp mới!`);
        setIsScanModalOpen(false);
        setGroupUrl('');
        setScanListName('');
        fetchLists();
      }
    } catch (e: any) {
      toastError('Thất bại', e.message || 'Không thể quét nhóm Zalo');
    } finally {
      setIsScanning(false);
      setScanProgress(0);
      setScanStateText('');
    }
  };

  const handleDeleteList = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa tệp khách hàng này?')) return;

    try {
      await crmApiRequest(`/marketing-lists/${id}`, 'DELETE');
      toastSuccess('Thành công', 'Đã xóa tệp khách hàng');
      fetchLists();
    } catch (e) {
      toastError('Lỗi', 'Không thể xóa tệp khách hàng');
    }
  };

  const handleOpenDetail = async (list: IMarketingList) => {
    setSelectedList(list);
    setIsDetailModalOpen(true);
    setLoadingEntries(true);
    try {
      const res = await crmApiRequest<any>(`/marketing-lists/${list.id}`);
      if (res?.entries) {
        setListEntries(res.entries);
      }
    } catch (e) {
      toastError('Lỗi', 'Không thể tải chi tiết danh sách số điện thoại');
    } finally {
      setLoadingEntries(false);
    }
  };

  const filteredLists = lists.filter(
    l => l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
         (l.description && l.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Summary Metrics
  const totalLists = lists.length;
  const totalPhones = lists.reduce((sum, l) => sum + l.totalEntries, 0);
  const totalZaloVerified = lists.reduce((sum, l) => sum + l.hasZaloEntries, 0);
  const totalGroupScans = lists.filter(l => l.sourceType === 'GROUP_SCAN').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="text-teal-600" size={24} />
            Tệp khách hàng & Quét nhóm
          </h2>
          <p className="text-xs text-slate-500">
            Tạo danh sách khách hàng mục tiêu để phục vụ chiến dịch tiếp thị và kịch bản tự động chăm sóc Zalo
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setIsScanModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border-none cursor-pointer active:scale-95"
          >
            <Compass size={15} />
            Quét nhóm Zalo
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border-none cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            Tạo tệp thủ công
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
            <FolderOpen size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng số tệp</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{totalLists}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Smartphone size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Số điện thoại</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{totalPhones.toLocaleString('vi-VN')}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SĐT có Zalo</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{totalZaloVerified.toLocaleString('vi-VN')}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Compass size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nhóm Zalo đã quét</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{totalGroupScans}</p>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm tệp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
            />
          </div>
          <button
            onClick={fetchLists}
            className="w-full md:w-auto px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold bg-white cursor-pointer"
          >
            Làm mới
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Đang tải dữ liệu tệp...</span>
          </div>
        ) : filteredLists.length === 0 ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center">
            <FolderOpen size={48} className="text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Chưa có tệp khách hàng nào</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Hãy tạo tệp thủ công bằng cách nhập danh sách SĐT hoặc quét thành viên từ các nhóm chat Zalo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Tên tệp</th>
                  <th className="py-4 px-6">Nguồn</th>
                  <th className="py-4 px-6 text-center">Tổng số khách</th>
                  <th className="py-4 px-6 text-center">Khớp có Zalo</th>
                  <th className="py-4 px-6">Trạng thái tra cứu</th>
                  <th className="py-4 px-6 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLists.map((list) => {
                  const hasZaloPct = list.totalEntries > 0 ? Math.round((list.hasZaloEntries / list.totalEntries) * 100) : 0;
                  
                  return (
                    <tr
                      key={list.id}
                      onClick={() => handleOpenDetail(list)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                          {list.name}
                        </div>
                        {list.description && (
                          <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                            {list.description}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {list.sourceType === 'GROUP_SCAN' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded font-black text-[9px] uppercase tracking-wider">
                            <Compass size={10} /> Quét nhóm
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-teal-50 border border-teal-100 text-[#0e6877] rounded font-black text-[9px] uppercase tracking-wider">
                            <Database size={10} /> Nhập SĐT
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-slate-900">
                        {list.totalEntries}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-black text-teal-600">{list.hasZaloEntries}</span>
                          <span className="text-[9px] text-slate-400 mt-0.5">({hasZaloPct}%)</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {list.status === 'PROCESSING' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100 animate-pulse">
                            <Clock size={12} /> Đang kiểm tra...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                            <CheckCircle2 size={12} /> Đã kiểm tra xong
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleDeleteList(list.id, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border-none cursor-pointer bg-transparent"
                          title="Xóa tệp"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CREATE MODAL ────────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-sm">Tạo tệp khách hàng thủ công</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateList} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Tên tệp khách hàng *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tệp VIP tháng 8, Khách hàng tiềm năng..."
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  className="w-full bg-[#fbf9f7] border border-slate-200 focus:border-teal-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Mô tả ngắn</label>
                <input
                  type="text"
                  placeholder="Tệp nhập tay để chạy chiến dịch chào mừng..."
                  value={listDesc}
                  onChange={(e) => setListDesc(e.target.value)}
                  className="w-full bg-[#fbf9f7] border border-slate-200 focus:border-teal-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Danh sách số điện thoại (SĐT) *</label>
                <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">
                  Ngăn cách các số điện thoại bằng dấu xuống dòng hoặc dấu phẩy. Hệ thống sẽ tự động loại bỏ ký tự lạ và lọc trùng lặp.
                </p>
                <textarea
                  required
                  rows={6}
                  placeholder="Ví dụ:&#10;0912345678&#10;0987654321, 0905559999"
                  value={phonesText}
                  onChange={(e) => setPhonesText(e.target.value)}
                  className="w-full bg-[#fbf9f7] border border-slate-200 focus:border-teal-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all resize-y"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold bg-white cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm border-none cursor-pointer"
                >
                  Tạo và Kiểm tra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SCAN MODAL ──────────────────────────────────────────────────── */}
      {isScanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Compass className="text-emerald-600" size={18} />
                Quét thành viên nhóm Zalo
              </h3>
              <button
                onClick={() => !isScanning && setIsScanModalOpen(false)}
                disabled={isScanning}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {isScanning ? (
              <div className="p-12 text-center space-y-5">
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center bg-emerald-50 rounded-2xl">
                  <Compass className="text-emerald-600 animate-spin" size={36} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800">Đang quét thành viên... {scanProgress}%</h4>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed">{scanStateText}</p>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 max-w-sm mx-auto overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <form onSubmit={handleScanGroup} className="p-6 space-y-4">
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-start gap-3">
                  <AlertCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-emerald-800 leading-relaxed">
                    Dán link nhóm Zalo của bạn hoặc ID nhóm Zalo cần tiếp thị. Hệ thống sẽ kết nối qua API Sandbox để giải mã thành viên nhóm và lưu toàn bộ danh bạ thành viên.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Link hoặc ID Nhóm Zalo *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Link size={15} />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="https://zalo.me/g/abc123xyz"
                      value={groupUrl}
                      onChange={(e) => setGroupUrl(e.target.value)}
                      className="w-full bg-[#fbf9f7] border border-slate-200 focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Đặt tên tệp khách hàng lưu trữ</label>
                  <input
                    type="text"
                    placeholder="Nhập tên tệp (để trống hệ thống sẽ tự sinh)"
                    value={scanListName}
                    onChange={(e) => setScanListName(e.target.value)}
                    className="w-full bg-[#fbf9f7] border border-slate-200 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsScanModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold bg-white cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm border-none cursor-pointer"
                  >
                    Bắt đầu quét nhóm
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ────────────────────────────────────────────────── */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scaleUp">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Chi tiết tệp: {selectedList?.name}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  Đã kiểm tra Zalo: {selectedList?.hasZaloEntries}/{selectedList?.totalEntries} số điện thoại có Zalo
                </p>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[450px] overflow-y-auto">
              {loadingEntries ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-6 h-6 border-3 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đang tải danh sách thành viên...</span>
                </div>
              ) : listEntries.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  Chưa có số điện thoại nào trong tệp này.
                </div>
              ) : (
                <div className="overflow-hidden border border-slate-100 rounded-xl">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-4">Thành viên</th>
                        <th className="py-2.5 px-4">Số điện thoại</th>
                        <th className="py-2.5 px-4">Zalo UID</th>
                        <th className="py-2.5 px-4 text-center">Trạng thái Zalo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {listEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-900">
                            {entry.name || <span className="text-slate-400 font-normal">Chưa xác định</span>}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 font-mono">
                            {entry.phone}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 font-mono text-[10px]">
                            {entry.zaloUid || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {entry.status === 'PENDING' ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                Đang kiểm tra
                              </span>
                            ) : entry.hasZalo ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                                <Check size={10} /> Có Zalo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                Không có Zalo
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold border-none cursor-pointer hover:bg-slate-700 transition-colors"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingLists;
