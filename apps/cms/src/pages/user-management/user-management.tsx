import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api';
import { useToast, usePermissions } from '../../contexts';
import type { Role } from '../../utils/permissions';
import { 
  User as UserIcon, 
  Trash2, 
  Search,
  CheckSquare,
  Square
} from 'lucide-react';

import type { IUserManagementProps } from './user-management.type';

export const UserManagement: React.FC<IUserManagementProps> = (_props) => {
  const { success, error: toastError } = useToast();
  const { userRole: currentUserRole, canEdit, canDelete } = usePermissions();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string | number>>(new Set());

  // Customer Details Drawer states
  const [selectedUserDetails, setSelectedUserDetails] = useState<any | null>(null);
  const [userFavorites, setUserFavorites] = useState<any[]>([]);
  const [userComments, setUserComments] = useState<any[]>([]);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [vouchersList, setVouchersList] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [voucherToGift, setVoucherToGift] = useState('');
  const [giftingVoucher, setGiftingVoucher] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/users');
      setUsers(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleViewUser = async (user: any) => {
    setSelectedUserDetails(user);
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
        title: 'Quà tặng Voucher riêng biệt 🎁',
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
    if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
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
      await apiRequest(`/users/${zaloId}`, 'PATCH', { role: newRole });
      setUsers(users.map(u => u.zaloId === zaloId ? { ...u, role: newRole } : u));
      success('Cập nhật thành công', `Vai trò người dùng đã được thay đổi thành ${newRole}`);
    } catch (err: any) {
      toastError('Lỗi cập nhật', err.message || 'Không thể thay đổi vai trò');
    }
  };

  const filteredUsers = users.filter(user => {
    return user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.phone?.includes(searchTerm) ||
           user.zaloId?.includes(searchTerm);
  });

  const toggleUserSelection = (zaloId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(zaloId)) {
        newSet.delete(zaloId);
      } else {
        newSet.add(zaloId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.zaloId)));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 border-4 border-[#0e6877] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#526069] text-sm font-medium">Đang tải danh sách người dùng...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-[#1b1c1b]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#1b1c1b] tracking-tight">Quản lý Người dùng</h2>
          <p className="text-[#526069] text-sm mt-1">
            Quản lý tài khoản và phân quyền người dùng
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#ecf6f7] border border-[#0e6877]/20 px-4 py-2 rounded-xl">
            <span className="text-[10px] text-[#526069] font-medium uppercase tracking-wider">Vai trò của bạn:</span>
            <span className="ml-2 text-xs font-bold text-[#0e6877]">{currentUserRole}</span>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm người dùng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#fbf9f7] border border-slate-200 focus:border-[#0e6877] focus:ring-1 focus:ring-[#0e6877] rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#1b1c1b] placeholder-slate-400 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <div className="bg-[#ecf6f7] border border-[#0e6877]/20 rounded-xl p-3 flex items-center justify-between mt-4">
            <p className="text-xs font-semibold text-[#0e6877]">
              Đã chọn {selectedUsers.size} người dùng
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedUsers(new Set())}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 whitespace-nowrap">
            <thead className="bg-[#fbf9f7] text-[#526069] text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 bg-[#fbf9f7] border-b border-slate-200 w-10">
                  <button
                    onClick={toggleSelectAll}
                    className="text-slate-500 hover:text-[#0e6877] transition-colors"
                  >
                    {selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 ? (
                      <CheckSquare size={14} className="text-[#0e6877]" />
                    ) : (
                      <Square size={14} />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4 bg-[#fbf9f7] border-b border-slate-200">Người dùng</th>
                <th className="py-3.5 px-4 bg-[#fbf9f7] border-b border-slate-200">Email</th>
                <th className="py-3.5 px-4 bg-[#fbf9f7] border-b border-slate-200">SĐT</th>
                <th className="py-3.5 px-4 bg-[#fbf9f7] border-b border-slate-200">Zalo ID</th>
                <th className="py-3.5 px-4 bg-[#fbf9f7] border-b border-slate-200">Vai trò</th>
                <th className="py-3.5 px-4 bg-[#fbf9f7] border-b border-slate-200 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const isSelected = selectedUsers.has(user.zaloId);
                return (
                  <tr
                    key={user.zaloId}
                    className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-[#ecf6f7]/30' : ''}`}
                  >
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => toggleUserSelection(user.zaloId)}
                        className="text-slate-500 hover:text-[#0e6877] transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare size={14} className="text-[#0e6877]" />
                        ) : (
                          <Square size={14} />
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 cursor-pointer hover:opacity-85" onClick={() => handleViewUser(user)}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#ecf6f7] flex items-center justify-center">
                          <UserIcon size={14} className="text-[#0e6877]" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#0e6877] hover:underline">{user.name || 'Không tên'}</p>
                          <p className="text-[10px] text-slate-500">ID: {user.zaloId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#1b1c1b]">{user.email || '-'}</td>
                    <td className="py-3.5 px-4 text-[#1b1c1b]">{user.phone || '-'}</td>
                    <td className="py-3.5 px-4 text-[#1b1c1b] font-mono text-[10px]">{user.zaloId || '-'}</td>
                    <td className="py-3.5 px-4">
                      {canEdit('users') ? (
                        <select
                          value={user.role || 'user'}
                          onChange={(e) => handleRoleChange(user.zaloId, e.target.value as Role)}
                          className="bg-transparent border-0 text-xs font-semibold cursor-pointer focus:outline-none"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          user.role === 'admin' 
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {user.role || 'user'}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        {canDelete('users') && (
                          <button
                            onClick={() => handleDeleteUser(user.zaloId)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Details Drawer */}
      {selectedUserDetails && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedUserDetails(null)}
          />
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-200">
              {/* Header */}
              <div className="px-6 py-5 bg-[#0e6877] text-white flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black tracking-wide">Chi tiết khách hàng</h3>
                  <p className="text-[10px] text-white/70 font-semibold mt-0.5">{selectedUserDetails.name || 'Không tên'}</p>
                </div>
                <button 
                  onClick={() => setSelectedUserDetails(null)}
                  className="p-1 bg-white/10 hover:bg-white/20 border-none text-white rounded-lg cursor-pointer transition-all"
                >
                  <span className="text-lg font-bold block leading-none px-1">×</span>
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                {loadingDetails ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <div className="w-8 h-8 border-3 border-[#0e6877] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[#526069] text-xs font-semibold">Đang tổng hợp thông tin...</p>
                  </div>
                ) : (
                  <>
                    {/* User Stats Profile Card */}
                    <div className="bg-[#f3f9fa] border border-[#0e6877]/10 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase">Hạng thành viên</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          selectedUserDetails.membershipTier === 'Kim cương' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          selectedUserDetails.membershipTier === 'Vàng' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          selectedUserDetails.membershipTier === 'Bạc' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {selectedUserDetails.membershipTier || 'Đồng'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase">Tổng chi tiêu</span>
                        <span className="text-xs font-bold text-slate-800">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedUserDetails.totalSpent || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase">Số điện thoại</span>
                        <span className="text-xs font-semibold text-slate-800">{selectedUserDetails.phone || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase">Email</span>
                        <span className="text-xs font-semibold text-slate-800">{selectedUserDetails.email || '-'}</span>
                      </div>
                    </div>

                    {/* Gift Voucher quick action */}
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
                      <h4 className="text-xs font-bold text-slate-800">Tặng Voucher khuyến mãi 🎁</h4>
                      <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Chọn mã giảm giá khả dụng để tặng trực tiếp qua hộp thông báo của khách hàng này.</p>
                      <div className="flex gap-2">
                        <select
                          value={voucherToGift}
                          onChange={(e) => setVoucherToGift(e.target.value)}
                          className="flex-1 text-xs border border-slate-200 focus:border-[#0e6877] rounded-xl px-3 py-2 bg-white focus:outline-none"
                        >
                          <option value="">-- Chọn mã --</option>
                          {vouchersList.map(v => (
                            <option key={v.code} value={v.code}>{v.code} ({v.type === 'PERCENT' ? `${v.value}%` : `${v.value.toLocaleString('vi-VN')}đ`})</option>
                          ))}
                        </select>
                        <button
                          disabled={!voucherToGift || giftingVoucher}
                          onClick={handleGiftVoucher}
                          className="px-4 py-2 bg-[#0e6877] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl border-none cursor-pointer hover:bg-[#0c5966] transition-all"
                        >
                          {giftingVoucher ? 'Đang gửi...' : 'Gửi tặng'}
                        </button>
                      </div>
                    </div>

                    {/* Favorites list */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Sản phẩm yêu thích</h4>
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-[#ecf6f7] text-[#0e6877] rounded-full">{userFavorites.length}</span>
                      </div>
                      {userFavorites.length === 0 ? (
                        <p className="text-[10px] text-slate-400 text-center py-4 font-semibold">Chưa yêu thích sản phẩm nào</p>
                      ) : (
                        <div className="space-y-2">
                          {userFavorites.map((fav: any) => (
                            <div key={fav.id} className="flex items-center gap-3 p-2 bg-slate-50 hover:bg-slate-100/70 rounded-xl transition-all">
                              <div className="w-9 h-9 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                                {fav.product?.images && (
                                  <img 
                                    src={fav.product.images.split(',')[0]} 
                                    alt="" 
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <span className="text-xs font-semibold text-slate-800 truncate">{fav.product?.name || `Sản phẩm #${fav.productId}`}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Comments list */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Đánh giá sản phẩm</h4>
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-[#ecf6f7] text-[#0e6877] rounded-full">{userComments.length}</span>
                      </div>
                      {userComments.length === 0 ? (
                        <p className="text-[10px] text-slate-400 text-center py-4 font-semibold">Chưa viết đánh giá nào</p>
                      ) : (
                        <div className="space-y-2.5">
                          {userComments.map((comm: any) => (
                            <div key={comm.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-[#0e6877]">Sản phẩm #{comm.productId}</span>
                                <span className="text-[10px] font-bold text-amber-500">⭐ {comm.rating}/5</span>
                              </div>
                              <p className="text-xs text-slate-700 italic">"{comm.content}"</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent Orders */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Lịch sử đơn hàng</h4>
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-[#ecf6f7] text-[#0e6877] rounded-full">{userOrders.length}</span>
                      </div>
                      {userOrders.length === 0 ? (
                        <p className="text-[10px] text-slate-400 text-center py-4 font-semibold">Chưa mua đơn hàng nào</p>
                      ) : (
                        <div className="space-y-2">
                          {userOrders.slice(0, 5).map((order: any) => (
                            <div key={order.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                              <div>
                                <p className="text-xs font-bold text-slate-800">#{order.id}</p>
                                <p className="text-[10px] text-slate-500 font-semibold">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                              </div>
                              <span className="text-xs font-bold text-slate-800">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount || 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


