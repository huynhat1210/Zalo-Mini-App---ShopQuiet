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

import type { IUserManagementComponentProps } from './user-management.type';

export const UserManagementComponent: React.FC<IUserManagementComponentProps> = (_props) => {
  const { success, error: toastError } = useToast();
  const { userRole: currentUserRole, canEdit, canDelete } = usePermissions();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string | number>>(new Set());

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
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#ecf6f7] flex items-center justify-center">
                          <UserIcon size={14} className="text-[#0e6877]" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#1b1c1b]">{user.name || 'Không tên'}</p>
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
    </div>
  );
};


