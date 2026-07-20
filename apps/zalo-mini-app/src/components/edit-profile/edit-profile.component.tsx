import React, { useState, useEffect } from 'react';
import api from 'zmp-sdk';
import { apiRequest } from '../../utils/api';
import { IEditProfileProps } from './edit-profile.type';

export const EditProfile: React.FC<IEditProfileProps> = (props) => {
  const { isOpen, onClose, zaloUser, updateZaloUser, showToast } = props;

  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [editGender, setEditGender] = useState('');
  const [updating, setUpdating] = useState(false);

  // Birthday splits
  const parseBirthday = (val: string) => {
    if (!val) return { d: '', m: '', y: '' };
    const parts = val.split('-');
    if (parts.length === 3) return { d: parts[2], m: parts[1], y: parts[0] };
    return { d: '', m: '', y: '' };
  };

  const [bdDay, setBdDay] = useState('');
  const [bdMonth, setBdMonth] = useState('');
  const [bdYear, setBdYear] = useState('');

  useEffect(() => {
    if (zaloUser) {
      setEditName(zaloUser.name || '');
      setEditAvatar(zaloUser.avatar || '');
      setEditPhone(zaloUser.phone || '');
      setEditEmail(zaloUser.email || '');
      setEditBirthday(zaloUser.birthday || '');
      setEditGender(zaloUser.gender || '');

      const bday = parseBirthday(zaloUser.birthday || '');
      setBdDay(bday.d);
      setBdMonth(bday.m);
      setBdYear(bday.y);
    }
  }, [zaloUser, isOpen]);

  const handleBirthdayChange = (d: string, m: string, y: string) => {
    if (d && m && y) {
      setEditBirthday(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    } else {
      setEditBirthday('');
    }
  };

  // Decrypt phone from Zalo SDK Token
  const fetchZaloPhone = async () => {
    const apiAny = api as any;
    const handleDecrypt = async (token: string) => {
      const res = await apiRequest<{ success: boolean; phone?: string }>('/auth/decrypt-phone', 'POST', {
        zaloId: zaloUser?.id || 'guest',
        token,
      });
      if (res.success && res.phone) {
        setEditPhone(res.phone);
        return true;
      }
      return false;
    };

    if (apiAny && apiAny.getPhoneNumber) {
      apiAny.getPhoneNumber({
        success: async (data: any) => {
          if (data?.token) {
            try {
              await handleDecrypt(data.token);
            } catch (err) {
              console.error(err);
            }
          }
        },
        fail: (err: any) => {
          console.error('getPhoneNumber fail', err);
        },
      });
    }
  };

  useEffect(() => {
    if (isOpen && !editPhone && zaloUser) {
      fetchZaloPhone();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSave = async () => {
    if (!editName.trim()) {
      showToast('Họ tên không được để trống!', 'warning');
      return;
    }
    setUpdating(true);
    try {
      const res = await apiRequest<any>('/users/profile', 'PUT', {
        name: editName.trim(),
        avatar: editAvatar,
        phone: editPhone.trim(),
        email: editEmail.trim(),
        birthday: editBirthday,
        gender: editGender,
      });
      if (res) {
        updateZaloUser(res);
        showToast('Cập nhật thông tin thành công!', 'success');
        onClose();
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Cập nhật thất bại!', 'warning');
    } finally {
      setUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up">
        <h3 className="text-xs font-bold text-textColor uppercase tracking-wider text-left">Chỉnh sửa thông tin</h3>

        <div className="space-y-3 text-left">
          <div>
            <label className="text-[9px] font-extrabold text-textColor-variant uppercase tracking-wider block mb-1">Họ tên</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-textColor"
            />
          </div>

          <div>
            <label className="text-[9px] font-extrabold text-textColor-variant uppercase tracking-wider block mb-1">Số điện thoại</label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Chưa cập nhật SĐT"
                className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-textColor"
              />
              {!editPhone && (
                <button
                  type="button"
                  onClick={fetchZaloPhone}
                  className="px-3 bg-primary/10 text-primary border-none rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"
                >
                  Lấy SĐT Zalo
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-[9px] font-extrabold text-textColor-variant uppercase tracking-wider block mb-1">Email</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="Chưa cập nhật email"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-textColor"
            />
          </div>

          <div>
            <label className="text-[9px] font-extrabold text-textColor-variant uppercase tracking-wider block mb-2">Ngày sinh</label>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={bdDay}
                onChange={(e) => {
                  setBdDay(e.target.value);
                  handleBirthdayChange(e.target.value, bdMonth, bdYear);
                }}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-2.5 text-xs focus:outline-none focus:border-primary text-textColor"
              >
                <option value="">Ngày</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d).padStart(2, '0')}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                value={bdMonth}
                onChange={(e) => {
                  setBdMonth(e.target.value);
                  handleBirthdayChange(bdDay, e.target.value, bdYear);
                }}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-2.5 text-xs focus:outline-none focus:border-primary text-textColor"
              >
                <option value="">Tháng</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={String(m).padStart(2, '0')}>
                    Tháng {m}
                  </option>
                ))}
              </select>
              <select
                value={bdYear}
                onChange={(e) => {
                  setBdYear(e.target.value);
                  handleBirthdayChange(bdDay, bdMonth, e.target.value);
                }}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-2.5 text-xs focus:outline-none focus:border-primary text-textColor"
              >
                <option value="">Năm</option>
                {Array.from({ length: 60 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-extrabold text-textColor-variant uppercase tracking-wider block mb-1">Giới tính</label>
            <select
              value={editGender}
              onChange={(e) => setEditGender(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-textColor"
            >
              <option value="">Chọn giới tính</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            disabled={updating}
            onClick={handleSave}
            className="flex-1 h-10 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-primary-dark disabled:bg-slate-300"
          >
            {updating ? 'Đang lưu...' : 'Lưu lại'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
};
export default EditProfile;
