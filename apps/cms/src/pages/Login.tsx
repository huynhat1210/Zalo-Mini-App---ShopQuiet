import React, { useState } from 'react';
import { apiRequest, tokenStorage } from '../utils/api';
import { Lock, User, AlertCircle, Store } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [zaloId, setZaloId] = useState('admin-zalo-id-1'); // Default fallback/mock admin ID from seeds
  const [name, setName] = useState('Administrator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zaloId.trim()) {
      setError('Vui lòng nhập Zalo ID Quản trị viên');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Call auth/login API
      const authData: any = await apiRequest('/auth/login', 'POST', {
        zaloId: zaloId.trim(),
        name: name.trim() || 'Admin User',
        avatar: '',
      });

      if (authData.access_token) {
        tokenStorage.setAccessToken(authData.access_token);
        onLoginSuccess();
      } else {
        setError('Đăng nhập thất bại. Không nhận được Access Token.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Kết nối đến Backend thất bại. Vui lòng kiểm tra lại server backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>

        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 relative">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20">
            <Store size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">ShopQuiet CMS</h2>
          <p className="text-slate-400 text-sm mt-1">Đăng nhập cổng quản trị cửa hàng</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-start gap-3">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative">
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">
              Zalo ID Quản trị viên
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock size={16} />
              </span>
              <input
                type="text"
                value={zaloId}
                onChange={(e) => setZaloId(e.target.value)}
                placeholder="Nhập zalo ID (ví dụ: admin-zalo-id-1)"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                required
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
              Mặc định dùng tài khoản hạt giống: <code className="bg-slate-950 px-1 py-0.5 rounded text-emerald-400">admin-zalo-id-1</code>
            </p>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">
              Tên hiển thị
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <User size={16} />
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên của bạn"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
          >
            {loading ? 'Đang xác thực...' : 'Vào trang quản trị'}
          </button>
        </form>
      </div>
    </div>
  );
};
export default Login;
