import React, { useState } from 'react';
import { apiRequest, tokenStorage } from '../../utils/api';
import logo from '../../assets/logo.png';
import { Lock, User, AlertCircle } from 'lucide-react';
import type { ILoginProps } from './login.type';

export const Login: React.FC<ILoginProps> = (props) => {
  const { onLoginSuccess } = props;
  const [zaloId, setZaloId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zaloId.trim()) {
      setError('Vui lòng nhập Zalo ID Quản trị viên');
      return;
    }
    if (!password.trim()) {
      setError('Vui lòng nhập Mật khẩu truy cập');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const authData: any = await apiRequest('/auth/login', 'POST', {
        zaloId: zaloId.trim(),
        name: 'Admin User',
        avatar: '',
        password: password.trim(),
      });

      if (authData.access_token) {
        if (authData.user.role !== 'admin') {
          setError('Tài khoản của bạn không có quyền truy cập trang quản trị!');
          return;
        }
        tokenStorage.setAccessToken(authData.access_token);
        // Save authData.user in localStorage to synchronize with dynamic header display
        localStorage.setItem('zalo_profile_custom', JSON.stringify(authData.user));
        onLoginSuccess();
      } else {
        setError('Đăng nhập thất bại. Không nhận được Access Token.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Mật khẩu hoặc tài khoản quản trị không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f7] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#0e6877]/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#0e6877]/5 rounded-full blur-3xl"></div>

        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 relative">
          <div className="w-16 h-16 overflow-hidden rounded-2xl border border-slate-200 flex items-center justify-center bg-white mb-4 shadow-sm">
            <img src={logo} alt="Logo" className="w-12 h-12 object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-[#1b1c1b] tracking-tight">ShopQuiet CMS</h2>
          <p className="text-[#526069] text-sm mt-1">Đăng nhập cổng quản trị cửa hàng</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-start gap-3">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative">
          <div>
            <label className="block text-[#526069] text-xs font-bold mb-2 uppercase tracking-wider">
              Zalo ID Quản trị viên
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <User size={16} />
              </span>
              <input
                type="text"
                value={zaloId}
                onChange={(e) => setZaloId(e.target.value)}
                placeholder="Nhập zalo ID (Ví dụ: admin)..."
                className="w-full bg-[#fbf9f7] border border-slate-200 focus:border-[#0e6877] focus:ring-1 focus:ring-[#0e6877] rounded-xl py-3 pl-10 pr-4 text-sm text-[#1b1c1b] placeholder-slate-400 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[#526069] text-xs font-bold mb-2 uppercase tracking-wider">
              Mật khẩu truy cập
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock size={16} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full bg-[#fbf9f7] border border-slate-200 focus:border-[#0e6877] focus:ring-1 focus:ring-[#0e6877] rounded-xl py-3 pl-10 pr-4 text-sm text-[#1b1c1b] placeholder-slate-400 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0e6877] hover:bg-[#0a4c57] text-white font-bold py-3 px-4 rounded-xl text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#0e6877]/10"
          >
            {loading ? 'Đang xác thực...' : 'Vào trang quản trị'}
          </button>
        </form>
      </div>
    </div>
  );
};

