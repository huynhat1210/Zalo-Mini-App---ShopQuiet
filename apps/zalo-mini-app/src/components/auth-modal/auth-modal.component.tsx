import React, { useState } from "react";
import { useAppStore } from "../../store/app-store/app-store.util";
import { apiRequest } from "../../utils/api";
import type { IAuthModalProps } from "./auth-modal.type";
import {
  XMarkIcon,
  ShoppingBagIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
  LockClosedIcon,
  UserIcon,
  KeyIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";

export const AuthModal: React.FC<IAuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = "login",
}) => {
  const [activeTab, setActiveTab] = useState<"login" | "register">(
    initialTab === "register" ? "register" : "login",
  );
  const [isForgotView, setIsForgotView] = useState(false);

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

  const { loginWithPassword, registerWithPassword, requestZaloLogin, showToast } = useAppStore();

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
    setIsForgotView(false);
  };

  const handleSwitchTab = (tab: "login" | "register") => {
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
        setIsForgotView(false);
        setActiveTab("login");
      }
    } catch (e: any) {
      showToast(e?.message || "Mã OTP không hợp lệ hoặc đã hết hạn", "warning");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bright & Light Header */}
        <div className="relative bg-[#f4fbfb] dark:bg-slate-800/80 p-6 text-center border-b border-teal-50 dark:border-slate-800">
          <button
            onClick={() => {
              handleResetForm();
              onClose();
            }}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-300 transition-all cursor-pointer border-none active:scale-90"
          >
            <XMarkIcon className="w-5 h-5" strokeWidth={2.2} />
          </button>
          
          <div className="w-12 h-12 rounded-2xl bg-teal-100/70 dark:bg-teal-900/50 text-[#0e6877] dark:text-teal-300 flex items-center justify-center mx-auto mb-2 shadow-inner">
            <ShoppingBagIcon className="w-6 h-6" strokeWidth={2} />
          </div>
          <h3 className="text-lg font-extrabold text-[#0e6877] dark:text-teal-300 tracking-tight">
            {isForgotView
              ? "Khôi Phục Mật Khẩu"
              : activeTab === "login"
              ? "Đăng Nhập Tài Khoản"
              : "Đăng Ký Thành Viên"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {isForgotView
              ? "Nhập thông tin nhận mã xác minh OTP"
              : activeTab === "login"
              ? "Chào mừng bạn quay trở lại với ShopQuiet"
              : "Tạo tài khoản mới để nhận nhiều ưu đãi mua sắm"}
          </p>

          {/* Clean 2-Tab Switcher */}
          {!isForgotView && (
            <div className="flex bg-slate-200/60 dark:bg-slate-700/60 p-1 rounded-2xl mt-4 gap-1">
              <button
                onClick={() => handleSwitchTab("login")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all border-none cursor-pointer ${
                  activeTab === "login"
                    ? "bg-white dark:bg-slate-800 text-[#0e6877] dark:text-teal-300 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Đăng nhập
              </button>
              <button
                onClick={() => handleSwitchTab("register")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all border-none cursor-pointer ${
                  activeTab === "register"
                    ? "bg-white dark:bg-slate-800 text-[#0e6877] dark:text-teal-300 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Đăng ký
              </button>
            </div>
          )}
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* User-initiated Zalo Login Button (Compliant with Zalo Policy 6.1) */}
          {!isForgotView && (
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  const success = await requestZaloLogin(true);
                  setLoading(false);
                  if (success) onClose();
                }}
                disabled={loading}
                className="w-full py-3 px-4 rounded-2xl bg-[#0068ff] hover:bg-[#0052cc] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all border-none cursor-pointer disabled:opacity-50"
              >
                <span className="w-5 h-5 bg-white text-[#0068ff] rounded-full flex items-center justify-center font-black text-[10px]">
                  Z
                </span>
                <span>Đăng nhập nhanh bằng Tài khoản Zalo</span>
              </button>
            </div>
          )}

          {/* FORGOT PASSWORD VIEW */}
          {isForgotView ? (
            <div>
              <button
                type="button"
                onClick={() => setIsForgotView(false)}
                className="mb-4 text-xs font-bold text-[#0e6877] dark:text-teal-300 flex items-center gap-1.5 border-none bg-transparent cursor-pointer hover:underline"
              >
                <ArrowLeftIcon className="w-4 h-4" strokeWidth={2.5} />
                Quay lại Đăng nhập
              </button>

              {forgotStep === "request" ? (
                <form onSubmit={handleForgotRequestSubmit} className="space-y-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Nhập Email hoặc Số điện thoại đã đăng ký. Hệ thống sẽ gửi cho bạn mã xác minh OTP để đặt lại mật khẩu.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <EnvelopeIcon className="w-4 h-4 text-slate-400" />
                      Email hoặc Số điện thoại
                    </label>
                    <input
                      type="text"
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      placeholder="Ví dụ: 0987654321 hoặc user@gmail.com"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#0e6877] focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-100"
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
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl text-xs text-amber-800 dark:text-amber-300 font-medium flex items-start gap-2">
                      <LightBulbIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{demoOtpNotice}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <KeyIcon className="w-4 h-4 text-slate-400" />
                      Mã xác minh OTP (6 chữ số)
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Nhập 6 chữ số OTP..."
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-center font-mono font-bold tracking-widest focus:outline-none focus:border-[#0e6877] focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <LockClosedIcon className="w-4 h-4 text-slate-400" />
                      Mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tạo mật khẩu mới..."
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#0e6877] focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-100"
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
          ) : activeTab === "login" ? (
            /* TAB 1: LOGIN */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <EnvelopeIcon className="w-4 h-4 text-slate-400" />
                  Email hoặc Số điện thoại
                </label>
                <input
                  type="text"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="Ví dụ: 0987654321 hoặc user@gmail.com"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#0e6877] focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <LockClosedIcon className="w-4 h-4 text-slate-400" />
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotView(true)}
                    className="text-[11px] font-bold text-[#0e6877] dark:text-teal-300 hover:underline border-none bg-transparent cursor-pointer"
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
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#0e6877] focus:bg-white dark:focus:bg-slate-800 transition-all pr-10 text-slate-800 dark:text-slate-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 border-none bg-transparent cursor-pointer p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-4 h-4 text-slate-400" />
                    ) : (
                      <EyeIcon className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-[#0e6877] text-white font-bold text-sm shadow-md hover:bg-[#0f766e] active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50 mt-2"
              >
                {loading ? "Đang xử lý..." : "Đăng Nhập"}
              </button>
            </form>
          ) : (
            /* TAB 2: REGISTER */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#0e6877] focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <EnvelopeIcon className="w-4 h-4 text-slate-400" />
                  Email hoặc Số điện thoại
                </label>
                <input
                  type="text"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="Nhập Email hoặc SĐT đăng ký..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#0e6877] focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <LockClosedIcon className="w-4 h-4 text-slate-400" />
                  Mật khẩu (tối thiểu 6 ký tự)
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tạo mật khẩu..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#0e6877] focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <LockClosedIcon className="w-4 h-4 text-slate-400" />
                  Xác nhận mật khẩu
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-[#0e6877] focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-100"
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
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
