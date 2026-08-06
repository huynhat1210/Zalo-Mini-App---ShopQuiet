import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../../utils/api';
import { useToast, usePermissions } from '../../contexts';
import type { Role } from '../../utils/permissions';
import { 
  User as UserIcon, 
  Trash2, 
  Search,
  CheckSquare,
  Square,
  Gift,
  Ruler,
  Phone,
  Download,
  X,
  Star,
  Gem,
  Crown,
  Shield,
  Medal,
  Package,
} from 'lucide-react';

import type { IUserManagementProps } from './user-management.type';
import { exportToExcel } from '../../utils/excel-export.util';
import { PaginationComponent } from '../../components';

const canRenderAvatar = (avatar?: string) => Boolean(avatar && !avatar.includes('zalo-api.zdn.vn'));

export const UserManagement: React.FC<IUserManagementProps> = (_props) => {
  const { success, error: toastError, confirm } = useToast();
  const { canEdit, canDelete } = usePermissions();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [selectedUsers, setSelectedUsers] = useState<Set<string | number>>(new Set());

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Customer Details Modal states
  const [selectedUserDetails, setSelectedUserDetails] = useState<any | null>(null);
  const [userFavorites, setUserFavorites] = useState<any[]>([]);
  const [userComments, setUserComments] = useState<any[]>([]);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [vouchersList, setVouchersList] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [voucherToGift, setVoucherToGift] = useState('');
  const [giftingVoucher, setGiftingVoucher] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'favorites' | 'comments'>('profile');

  const fetchUsers = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await apiRequest('/users');
      setUsers(Array.isArray(res) ? res.map((user) => ({ ...user, role: String(user.role || 'USER').toLowerCase() })) : []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(() => {
      fetchUsers(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleViewUser = async (user: any) => {
    setSelectedUserDetails(user);
    setActiveTab('profile');
    setLoadingDetails(true);
    try {
      const [favs, comms, ords, vchs] = await Promise.all([
        apiRequest('/cms/database/models/Favorite').catch(() => []),
        apiRequest('/cms/database/models/Comment').catch(() => []),
        apiRequest('/cms/database/models/Order').catch(() => []),
        apiRequest('/cms/database/models/Voucher').catch(() => []),
      ]);
      
      setUserFavorites((favs || []).filter((f: any) => f.zaloUserId === user.zaloId));
      setUserComments((comms || []).filter((c: any) => c.zaloUserId === user.zaloId));
      setUserOrders((ords || []).filter((o: any) => o.zaloUserId === user.zaloId));
      setVouchersList(vchs || []);
    } catch (e) {
      console.error('Failed to load user details:', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleGiftVoucher = async () => {
    if (!selectedUserDetails || !voucherToGift) return;
    setGiftingVoucher(true);
    try {
      const voucher = vouchersList.find(v => v.code === voucherToGift);
      if (!voucher) return;
      
      const discountStr = voucher.type === 'PERCENT' ? `${voucher.value}%` : `${voucher.value.toLocaleString('vi-VN')}đ`;
      const content = `ShopQuiet gửi tặng riêng bạn mã giảm giá ${voucher.code} giảm ${discountStr} cho đơn từ ${voucher.minOrderVal.toLocaleString('vi-VN')}đ. Hãy mua sắm ngay nhé!`;
      
      await apiRequest('/cms/database/models/Notification', 'POST', {
        zaloUserId: selectedUserDetails.zaloId,
        title: 'Quà tặng Voucher riêng biệt',
        content,
        type: 'PROMOTION',
        date: new Date().toLocaleDateString('vi-VN'),
        read: false
      });
      
      success('Tặng Voucher thành công', `Mã ${voucher.code} đã được gửi trực tiếp qua thông báo cho khách hàng này.`);
      setVoucherToGift('');
    } catch (err: any) {
      toastError('Tặng Voucher thất bại', err.message || 'Lỗi khi tặng voucher');
    } finally {
      setGiftingVoucher(false);
    }
  };

  const handleDeleteUser = async (zaloId: string) => {
    if (!(await confirm('Xóa người dùng?', 'Dữ liệu người dùng này sẽ bị xóa khỏi hệ thống.'))) return;
    try {
      await apiRequest(`/users/${zaloId}`, 'DELETE');
      setUsers(users.filter(u => u.zaloId !== zaloId));
      success('Đã xóa', 'Người dùng đã được xóa thành công');
    } catch (err: any) {
      toastError('Lỗi xóa', err.message || 'Không thể xóa người dùng');
    }
  };

  const handleRoleChange = async (zaloId: string, newRole: Role) => {
    try {
      await apiRequest(`/users/${zaloId}/role`, 'PATCH', { role: newRole });
      setUsers(users.map(u => u.zaloId === zaloId ? { ...u, role: newRole } : u));
      if (selectedUserDetails && selectedUserDetails.zaloId === zaloId) {
        setSelectedUserDetails({ ...selectedUserDetails, role: newRole });
      }
      success('Cập nhật quyền thành công', `Đã đổi vai trò sang ${newRole}`);
    } catch (err: any) {
      toastError('Lỗi cập nhật', err.message || 'Không thể đổi vai trò');
    }
  };

  const toggleSelectUser = (id: string | number) => {
    const next = new Set(selectedUsers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedUsers(next);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map((u) => u.zaloId || u.id)));
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.phone || '').includes(searchTerm) ||
        (u.zaloId || '').includes(searchTerm);
      
      const matchRole = roleFilter === 'ALL' || (u.role || 'user') === roleFilter;
      const matchTier = tierFilter === 'ALL' || (u.membershipTier || 'Đồng') === tierFilter;

      return matchSearch && matchRole && matchTier;
    });
  }, [users, searchTerm, roleFilter, tierFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const handleExportExcel = () => {
    const columns = [
      { key: 'zaloId', label: 'Mã Zalo ID' },
      { key: 'name', label: 'Họ tên' },
      { key: 'phone', label: 'Số điện thoại' },
      { key: 'email', label: 'Email' },
      { key: 'membershipTier', label: 'Hạng thành viên' },
      { key: 'totalSpent', label: 'Tổng chi tiêu' },
      { key: 'height', label: 'Chiều cao (cm)' },
      { key: 'weight', label: 'Cân nặng (kg)' },
      { key: 'clothingSize', label: 'Size trang phục' },
      { key: 'role', label: 'Vai trò' },
    ];
    exportToExcel(filteredUsers, `Danh_sach_Khach_hang_ShopQuiet_${new Date().toISOString().slice(0, 10)}`, columns);
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'Kim cương':
        return <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300"><Gem size={11} /> Kim cương</span>;
      case 'Vàng':
        return <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300"><Crown size={11} /> Vàng</span>;
      case 'Bạc':
        return <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-700 border border-slate-300"><Shield size={11} /> Bạc</span>;
      default:
        return <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#f0edeb] text-amber-900 border border-amber-200"><Medal size={11} /> Đồng</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-teal-50 text-[#0e6877] text-xs font-black uppercase tracking-wider rounded-full border border-teal-200 flex items-center gap-1.5">
              <UserIcon size={13} /> Customers Hub
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
            Quản Lý Khách Hàng & Thành Viên
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Tổng hợp thông tin cá nhân, hồ sơ size chuẩn, chi tiêu & gửi voucher ưu đãi cho từng khách Zalo
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl transition-all border-none cursor-pointer shadow-sm active:scale-95"
          >
            <Download size={15} /> Xuất dữ liệu Excel
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search size={16} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo Tên, SĐT, Email, Zalo ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0e6877] rounded-2xl text-xs font-medium text-slate-800 focus:outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <select
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Tất cả Hạng Thành Viên</option>
            <option value="Đồng">Hạng Đồng</option>
            <option value="Bạc">Hạng Bạc</option>
            <option value="Vàng">Hạng Vàng</option>
            <option value="Kim cương">Hạng Kim Cương</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Tất cả Vai trò</option>
            <option value="user">User (Khách hàng)</option>
            <option value="admin">Admin (Quản trị viên)</option>
          </select>
        </div>
      </div>

      {/* Main Customers Table Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4 w-10 text-center">
                  <button onClick={toggleSelectAll} className="border-none bg-transparent cursor-pointer p-0 text-slate-400 hover:text-[#0e6877]">
                    {selectedUsers.size === paginatedUsers.length && paginatedUsers.length > 0 ? (
                      <CheckSquare size={16} className="text-[#0e6877]" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4">Khách hàng Zalo</th>
                <th className="py-3.5 px-4">Số điện thoại / Email</th>
                <th className="py-3.5 px-4">Hạng thành viên</th>
                <th className="py-3.5 px-4 text-right">Tổng chi tiêu</th>
                <th className="py-3.5 px-4">Size chuẩn</th>
                <th className="py-3.5 px-4 text-center">Vai trò</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-medium">
                    <div className="w-8 h-8 border-3 border-[#0e6877] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Đang tải danh sách khách hàng...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-medium">
                    Không tìm thấy khách hàng nào khớp với điều kiện lọc.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const isSelected = selectedUsers.has(user.zaloId || user.id);
                  return (
                    <tr
                      key={user.id || user.zaloId}
                      className={`hover:bg-teal-50/30 transition-colors group ${isSelected ? 'bg-teal-50/50' : ''}`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => toggleSelectUser(user.zaloId || user.id)}
                          className="border-none bg-transparent cursor-pointer p-0 text-slate-400 hover:text-[#0e6877]"
                        >
                          {isSelected ? <CheckSquare size={16} className="text-[#0e6877]" /> : <Square size={16} />}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <div
                          className="flex items-center gap-3 cursor-pointer group-hover:translate-x-0.5 transition-transform"
                          onClick={() => handleViewUser(user)}
                        >
                          <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center font-black text-xs text-[#0e6877] shrink-0 shadow-2xs">
                            {canRenderAvatar(user.avatar) ? (
                              <img loading="lazy" decoding="async" src={user.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
                            ) : (
                              (user.name || 'Z')[0].toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 text-xs group-hover:text-[#0e6877] transition-colors truncate">
                              {user.name || 'Khách hàng Zalo'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">ID: {user.zaloId || user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 text-xs">{user.phone || 'Chưa cập nhật SĐT'}</div>
                        <div className="text-[10px] text-slate-400 font-medium truncate max-w-[180px]">{user.email || '-'}</div>
                      </td>
                      <td className="py-3.5 px-4">{getTierBadge(user.membershipTier || 'Đồng')}</td>
                      <td className="py-3.5 px-4 text-right font-black text-[#0e6877]">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(user.totalSpent || 0)}
                      </td>
                      <td className="py-3.5 px-4">
                        {user.clothingSize || user.height || user.weight ? (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-800 bg-teal-50/80 px-2.5 py-1 rounded-xl border border-teal-100 w-fit">
                            <Ruler size={12} />
                            <span>
                              {user.clothingSize ? `Size ${user.clothingSize}` : ''}
                              {user.height ? ` (${user.height}cm)` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium italic">Chưa nhập</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {canEdit('users') ? (
                          <select
                            value={user.role || 'user'}
                            onChange={(e) => handleRoleChange(user.zaloId, e.target.value as Role)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold cursor-pointer focus:outline-none border border-slate-200 ${
                              user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-700'
                            }`}
                          >
                            <option value="user">USER</option>
                            <option value="admin">ADMIN</option>
                          </select>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-slate-100 text-slate-700">
                            {user.role || 'user'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#0e6877] font-bold text-[11px] rounded-xl transition-all border border-teal-200 cursor-pointer shadow-2xs"
                          >
                            Chi tiết
                          </button>
                          {canDelete('users') && (
                            <button
                              onClick={() => handleDeleteUser(user.zaloId)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-200 cursor-pointer"
                              title="Xóa khách hàng"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 pb-4">
          <PaginationComponent
            currentPage={currentPage}
            totalPages={Math.ceil(filteredUsers.length / itemsPerPage)}
            totalItems={filteredUsers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newSize) => {
              setItemsPerPage(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* ── PREMIUM ENTERPRISE CUSTOMER DETAIL MODAL ── */}
      {selectedUserDetails && (
        <div className="fixed inset-0 z-[999] overflow-hidden flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
            onClick={() => setSelectedUserDetails(null)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/90 z-10 flex flex-col max-h-[90vh] animate-popIn">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0e6877] to-[#168a9e] text-white p-6 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center text-xl font-black shrink-0 overflow-hidden shadow-inner">
                  {canRenderAvatar(selectedUserDetails.avatar) ? (
                    <img src={selectedUserDetails.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (selectedUserDetails.name || 'Z')[0].toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black tracking-tight">{selectedUserDetails.name || 'Khách hàng Zalo'}</h3>
                    {getTierBadge(selectedUserDetails.membershipTier || 'Đồng')}
                  </div>
                  <p className="text-xs text-teal-100/90 font-mono mt-0.5">Zalo ID: {selectedUserDetails.zaloId || selectedUserDetails.id}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserDetails(null)}
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center border-none cursor-pointer transition-transform active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="bg-slate-50 px-6 py-2 border-b border-slate-200 flex gap-2 overflow-x-auto shrink-0">
              {[
                { id: 'profile', label: 'Hồ sơ & vóc dáng', count: null },
                { id: 'orders', label: 'Đơn hàng mua', count: userOrders.length },
                { id: 'favorites', label: 'Sản phẩm yêu thích', count: userFavorites.length },
                { id: 'comments', label: 'Đánh giá đã viết', count: userComments.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-none cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#0e6877] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span className={`px-2 py-0.2 text-[10px] rounded-full font-extrabold ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Modal Body Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {loadingDetails ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-10 h-10 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-500 text-xs font-bold">Đang tổng hợp thông tin khách hàng từ hệ thống...</p>
                </div>
              ) : (
                <>
                  {/* TAB 1: PROFILE & FIT PROFILE */}
                  {activeTab === 'profile' && (
                    <div className="space-y-6 animate-fadeIn">
                      {/* Overview Metric Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hạng Thành Viên</span>
                          <div className="mt-1">{getTierBadge(selectedUserDetails.membershipTier || 'Đồng')}</div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tổng Tích Lũy Chi Tiêu</span>
                          <p className="text-lg font-black text-[#0e6877] mt-0.5">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedUserDetails.totalSpent || 0)}
                          </p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Vai Trò Hệ Thống</span>
                          <div className="mt-1">
                            <span className="px-3 py-1 rounded-xl text-xs font-black bg-slate-100 text-slate-800 border border-slate-200">
                              {(selectedUserDetails.role || 'USER').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* User Contact & Size Profile */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Contact Information */}
                        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Phone size={15} className="text-[#0e6877]" /> Thông Tin Liên Hệ
                          </h4>
                          <div className="space-y-3 text-xs">
                            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                              <span className="text-slate-500 font-bold">Số điện thoại:</span>
                              <span className="font-black text-slate-900">{selectedUserDetails.phone || 'Chưa cập nhật'}</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                              <span className="text-slate-500 font-bold">Email:</span>
                              <span className="font-black text-slate-900">{selectedUserDetails.email || 'Chưa cập nhật'}</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                              <span className="text-slate-500 font-bold">Zalo ID:</span>
                              <span className="font-mono font-bold text-slate-700">{selectedUserDetails.zaloId || selectedUserDetails.id}</span>
                            </div>
                          </div>
                        </div>

                        {/* Customer Size Profile */}
                        <div className="bg-teal-50/40 p-5 rounded-3xl border border-teal-200/80 shadow-2xs space-y-4">
                          <div className="flex justify-between items-center border-b border-teal-200/60 pb-3">
                            <h4 className="text-xs font-black text-[#0e6877] uppercase tracking-wider flex items-center gap-2">
                              <Ruler size={15} /> Hồ Sơ Size Chuẩn Vóc Dáng
                            </h4>
                            <span className="text-[9px] font-black text-[#0e6877] bg-white px-2 py-0.5 rounded-full border border-teal-200">Mini App Sync</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white p-3 rounded-2xl border border-teal-100">
                              <p className="text-[9.5px] text-slate-400 font-extrabold uppercase">Chiều cao</p>
                              <p className="font-black text-slate-900 text-sm mt-0.5">{selectedUserDetails.height ? `${selectedUserDetails.height} cm` : 'Chưa có'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-2xl border border-teal-100">
                              <p className="text-[9.5px] text-slate-400 font-extrabold uppercase">Cân nặng</p>
                              <p className="font-black text-slate-900 text-sm mt-0.5">{selectedUserDetails.weight ? `${selectedUserDetails.weight} kg` : 'Chưa có'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-2xl border border-teal-100 col-span-2">
                              <p className="text-[9.5px] text-slate-400 font-extrabold uppercase">Size Khuyên Dùng</p>
                              <p className="font-black text-[#0e6877] text-sm mt-0.5">
                                {selectedUserDetails.clothingSize || selectedUserDetails.shoeSize
                                  ? `Quần Áo: Size ${selectedUserDetails.clothingSize || 'F'} ${selectedUserDetails.shoeSize ? `• Giày: Size ${selectedUserDetails.shoeSize}` : ''}`
                                  : 'Chưa đủ dữ liệu tính size'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Gift Voucher Action Card */}
                      <div className="bg-gradient-to-r from-amber-500/10 via-white to-amber-500/10 p-5 rounded-3xl border border-amber-200 shadow-2xs space-y-3">
                        <div className="flex items-center gap-2">
                          <Gift size={18} className="text-amber-600" />
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Tặng Voucher Tri Ẩn Riêng Khách Hàng</h4>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">Chọn mã giảm giá khả dụng để gửi quà tặng thẳng vào ứng dụng Zalo của người dùng này:</p>
                        <div className="flex gap-2">
                          <select
                            value={voucherToGift}
                            onChange={(e) => setVoucherToGift(e.target.value)}
                            className="flex-1 text-xs border border-amber-300 focus:border-amber-500 rounded-2xl px-4 py-2.5 bg-white font-bold text-slate-800 focus:outline-none shadow-2xs"
                          >
                            <option value="">-- Chọn mã Voucher tri ân --</option>
                            {vouchersList.map((v) => (
                              <option key={v.code} value={v.code}>
                                Mã {v.code} ({v.type === 'PERCENT' ? `Giảm ${v.value}%` : `Giảm ${v.value.toLocaleString('vi-VN')}đ`})
                              </option>
                            ))}
                          </select>
                          <button
                            disabled={!voucherToGift || giftingVoucher}
                            onClick={handleGiftVoucher}
                            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-black text-xs rounded-2xl border-none cursor-pointer transition-all shadow-xs active:scale-95 shrink-0"
                          >
                            {giftingVoucher ? 'Đang gửi...' : 'Gửi quà tặng ngay'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: USER ORDERS */}
                  {activeTab === 'orders' && (
                    <div className="space-y-3 animate-fadeIn">
                      {userOrders.length === 0 ? (
                        <div className="bg-white p-12 text-center text-slate-400 rounded-3xl border border-slate-200/80 font-medium text-xs">
                          Khách hàng này chưa phát sinh đơn hàng nào.
                        </div>
                      ) : (
                        userOrders.map((order: any) => (
                          <div key={order.id} className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0e6877] font-black flex items-center justify-center text-sm border border-teal-100 shrink-0">
                                <Package size={17} />
                              </div>
                              <div>
                                <p className="font-mono font-black text-slate-900 text-xs">#{order.id}</p>
                                <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                                  Ngày đặt: {new Date(order.createdAt).toLocaleString('vi-VN')}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black text-[#0e6877]">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount || 0)}
                              </span>
                              <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">{order.status}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 3: FAVORITES */}
                  {activeTab === 'favorites' && (
                    <div className="space-y-3 animate-fadeIn">
                      {userFavorites.length === 0 ? (
                        <div className="bg-white p-12 text-center text-slate-400 rounded-3xl border border-slate-200/80 font-medium text-xs">
                          Khách hàng chưa lưu sản phẩm yêu thích nào.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {userFavorites.map((fav: any) => (
                            <div key={fav.id} className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                {fav.product?.images && (
                                  <img loading="lazy" decoding="async" src={fav.product.images.split(',')[0]} alt="" className="w-full h-full object-cover" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h5 className="font-bold text-xs text-slate-900 truncate">{fav.product?.name || `Sản phẩm #${fav.productId}`}</h5>
                                <p className="text-[10.5px] text-[#0e6877] font-black mt-0.5">
                                  {fav.product?.price?.toLocaleString('vi-VN')} đ
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: COMMENTS */}
                  {activeTab === 'comments' && (
                    <div className="space-y-3 animate-fadeIn">
                      {userComments.length === 0 ? (
                        <div className="bg-white p-12 text-center text-slate-400 rounded-3xl border border-slate-200/80 font-medium text-xs">
                          Khách hàng chưa để lại đánh giá nào.
                        </div>
                      ) : (
                        userComments.map((comm: any) => (
                          <div key={comm.id} className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                              <span className="text-xs font-black text-[#0e6877]">Đánh giá cho Sản phẩm #{comm.productId}</span>
                              <span className="flex items-center gap-1 text-xs font-black text-amber-500"><Star size={12} /> {comm.rating}/5</span>
                            </div>
                            <p className="text-xs text-slate-700 italic leading-relaxed">"{comm.content}"</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-white px-6 py-4 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedUserDetails(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-2xl border-none cursor-pointer transition-all active:scale-95"
              >
                Đóng chi tiết
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
export default UserManagement;
