import React, { useState } from "react";
import { useAppStore } from "../../store/app-store/app-store.util";
import { apiRequest } from "../../utils/api";
import type { IAuthModalProps } from "./auth-modal.type";

export const AuthModal: React.FC<IAuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = "login",
}) => {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot">(
    initialTab,
  );

  // Form states
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password OTP states
  const [forgotStep, setForgotStep] = useState<"request" | "reset">("request");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [demoOtpNotice, setDemoOtpNotice] = useState("");

  const { loginWithPassword, registerWithPassword, showToast, syncUserFromStorage } =
    useAppStore();

  if (!isOpen) return null;

  const handleResetForm = () => {
    setEmailOrPhone("");
    setName("");
    setPassword("");
    setConfirmPassword("");
    setOtp("");
    setNewPassword("");
    setForgotStep("request");
    setDemoOtpNotice("");
  };

  const handleSwitchTab = (tab: "login" | "register" | "forgot") => {
    setActiveTab(tab);
    handleResetForm();
  };

  // 1. Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim() || !password) {
      showToast("Vui lòng nhập đầy đủ Email/SĐT và Mật khẩu", "warning");
      return;
    }
    setLoading(true);
    const success = await loginWithPassword(emailOrPhone.trim(), password);
    setLoading(false);
    if (success) {
      handleResetForm();
      onClose();
    }
  };

  // 2. Handle Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim() || !name.trim() || !password) {
      showToast("Vui lòng nhập đầy đủ thông tin", "warning");
      return;
    }
    if (password.length < 6) {
      showToast("Mật khẩu phải có ít nhất 6 ký tự", "warning");
      return;
    }
    if (password !== confirmPassword) {
      showToast("Mật khẩu xác nhận không khớp", "warning");
      return;
    }
    setLoading(true);
    const success = await registerWithPassword(
      emailOrPhone.trim(),
      name.trim(),
      password,
    );
    setLoading(false);
    if (success) {
      handleResetForm();
      onClose();
    }
  };

  // 3. Handle Forgot Password Request OTP
  const handleForgotRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) {
      showToast("Vui lòng nhập Email hoặc Số điện thoại", "warning");
      return;
    }
    setLoading(true);
    try {
      const res: any = await apiRequest("/auth/forgot-password", "POST", {
        emailOrPhone: emailOrPhone.trim(),
      });
      if (res && res.success) {
        showToast(res.message, "success");
        if (res.otp) {
          setDemoOtpNotice(`Mã OTP thử nghiệm của bạn là: ${res.otp}`);
          setOtp(res.otp);
        }
        setForgotStep("reset");
      }
    } catch (e: any) {
      showToast(e?.message || "Lỗi gửi yêu cầu khôi phục", "warning");
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Reset Password with OTP
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || !newPassword) {
      showToast("Vui lòng nhập mã OTP và Mật khẩu mới", "warning");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Mật khẩu mới phải có ít nhất 6 ký tự", "warning");
      return;
    }
    setLoading(true);
    try {
      const res: any = await apiRequest("/auth/reset-password", "POST", {
        emailOrPhone: emailOrPhone.trim(),
        otp: otp.trim(),
        newPassword,
      });
      if (res && res.success) {
        showToast("Đổi mật khẩu thành công! Vui lòng đăng nhập lại", "success");
        handleSwitchTab("login");
      }
    } catch (e: any) {
      showToast(e?.message || "Mã OTP không hợp lệ hoặc đã hết hạn", "warning");
    } finally {
      setLoading(false);
    }
  };

  // 5. Handle Zalo 1-touch Quick Login
  const handleZaloQuickLogin = async () => {
    setLoading(true);
    try {
      await syncUserFromStorage(true);
      showToast("Đăng nhập nhanh qua Zalo thành công!", "success");
      onClose();
    } catch (e) {
      showToast("Không thể đăng nhập qua Zalo SDK", "warning");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Header */}
        <div className="relative bg-gradient-to-r from-[#0e6877] to-[#115e59] p-6 text-white text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer border-none"
          >
            ✕
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-2 text-2xl shadow-inner">
            🛍️
          </div>
          <h3 className="text-xl font-extrabold tracking-tight">ShopQuiet Auth</h3>
          <p className="text-xs text-white/80 mt-1 font-medium">
            {activeTab === "login" && "Đăng nhập tài khoản của bạn"}
            {activeTab === "register" && "Tạo tài khoản thành viên mới"}
            {activeTab === "forgot" && "Khôi phục mật khẩu tài khoản"}
          </p>

          {/* Navigation Tabs */}
          <div className="flex bg-white/10 p-1 rounded-2xl mt-5 gap-1 backdrop-blur-md">
            <button
              onClick={() => handleSwitchTab("login")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all border-none cursor-pointer ${
                activeTab === "login"
                  ? "bg-white text-[#0e6877] shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => handleSwitchTab("register")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all border-none cursor-pointer ${
                activeTab === "register"
                  ? "bg-white text-[#0e6877] shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Đăng ký
            </button>
            <button
              onClick={() => handleSwitchTab("forgot")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all border-none cursor-pointer ${
                activeTab === "forgot"
                  ? "bg-white text-[#0e6877] shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Quên MK
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: LOGIN */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email hoặc Số điện thoại
                </label>
                <input
                  type="text"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="Ví dụ: 0987654321 hoặc user@email.com"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#0e6877] transition-all"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSwitchTab("forgot")}
                    className="text-[11px] font-bold text-[#0e6877] hover:underline border-none bg-transparent cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#0e6877] transition-all pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 border-none bg-transparent cursor-pointer"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-[#0e6877] text-white font-bold text-sm shadow-md hover:bg-[#0f766e] active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50"
              >
                {loading ? "Đang xử lý..." : "Đăng Nhập"}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="shrink-0 mx-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Hoặc đăng nhập nhanh
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              <button
                type="button"
                onClick={handleZaloQuickLogin}
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-[#0068ff] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-[#0052cc] active:scale-95 transition-all cursor-pointer border-none"
              >
                <span>⚡</span> Đăng nhập 1-Touch bằng Zalo SDK
              </button>
            </form>
          )}

          {/* TAB 2: REGISTER */}
          {activeTab === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#0e6877] transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email hoặc Số điện thoại
                </label>
                <input
                  type="text"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="Nhập Email hoặc SĐT đăng ký..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#0e6877] transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mật khẩu (tối thiểu 6 ký tự)
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tạo mật khẩu..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#0e6877] transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Xác nhận mật khẩu
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#0e6877] transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-[#0e6877] text-white font-bold text-sm shadow-md hover:bg-[#0f766e] active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50 mt-2"
              >
                {loading ? "Đang tạo tài khoản..." : "Đăng Ký Ngay"}
              </button>
            </form>
          )}

          {/* TAB 3: FORGOT PASSWORD */}
          {activeTab === "forgot" && (
            <div>
              {forgotStep === "request" ? (
                <form onSubmit={handleForgotRequestSubmit} className="space-y-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Nhập Email hoặc Số điện thoại đã đăng ký tài khoản. Hệ thống sẽ gửi cho bạn mã xác minh OTP để đặt lại mật khẩu.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Email hoặc Số điện thoại
                    </label>
                    <input
                      type="text"
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      placeholder="Nhập Email hoặc SĐT..."
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#0e6877] transition-all"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-2xl bg-[#0e6877] text-white font-bold text-sm shadow-md hover:bg-[#0f766e] active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50"
                  >
                    {loading ? "Đang gửi OTP..." : "Gửi Mã Xác Minh OTP"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  {demoOtpNotice && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-800 dark:text-amber-300 font-medium">
                      💡 {demoOtpNotice}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Mã xác minh OTP (6 chữ số)
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Nhập 6 chữ số OTP..."
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-center font-mono font-bold tracking-widest focus:outline-none focus:border-[#0e6877] transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tạo mật khẩu mới..."
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#0e6877] transition-all"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-2xl bg-[#0e6877] text-white font-bold text-sm shadow-md hover:bg-[#0f766e] active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50"
                  >
                    {loading ? "Đang đổi mật khẩu..." : "Xác Nhận Đổi Mật Khẩu"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
