import { useTranslation } from 'react-i18next';
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from '../config.tsx';
import { useToast } from '../context/ToastContext';
import {
  FaHeadphones, FaEnvelope, FaLock, FaUser, FaArrowRight,
  FaMusic, FaCompactDisc, FaMicrophoneAlt, FaGuitar
} from "react-icons/fa";

// =============================================================================
// FLOATING ICON (CSS Animation)
// =============================================================================
const FloatingIcon = ({ icon: Icon, x = 0, y = 0, delay = 0 }: { icon: React.ElementType; x?: number; y?: number; delay?: number }) => {
  return (
    <div
      className="absolute text-slate-700 opacity-20 pointer-events-none hidden lg:block animate-float"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${delay * 0.8}s`
      }}
    >
      <Icon size={68} />
    </div>
  );
};

// =============================================================================
// MAIN REGISTER PAGE
// =============================================================================
export default function Register() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      return toast.error(t("toasts.password_mismatch"));
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      setIsLoading(false);
      if (data.success) {
        toast.success(t("toasts.register_success"));
        navigate("/login");
      } else {
        toast.error(data.msg || "Đăng ký thất bại");
      }
    } catch {
      setIsLoading(false);
      toast.error(t("toasts.system_connect_error"));
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-slate-200 overflow-hidden flex items-center justify-center p-4 md:p-10 font-sans">
      {/* Background Visuals */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/20 blur-[140px] animate-pulse"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/20 blur-[140px] animate-pulse" style={{ animationDelay: '2.5s' }}></div>
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(#ffffff_1px,transparent_1px),linear-gradient(90deg,#ffffff_1px,transparent_1px)] bg-[size:60px_60px]"></div>
      </div>

      {/* Floating Icons */}
      <FloatingIcon icon={FaMusic} delay={0} x={12} y={18} />
      <FloatingIcon icon={FaCompactDisc} delay={1} x={80} y={20} />
      <FloatingIcon icon={FaMicrophoneAlt} delay={2} x={15} y={70} />
      <FloatingIcon icon={FaGuitar} delay={3} x={85} y={65} />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 bg-white/5 backdrop-blur-3xl rounded-[48px] border border-white/10 shadow-2xl overflow-hidden">

        {/* LEFT SIDE - Branding */}
        <div className="hidden lg:flex flex-col justify-center p-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/15 via-transparent to-violet-600/10" />

          <div className="relative z-10 space-y-8">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/30 animate-bounce-slow">
              <FaHeadphones size={32} className="text-white" />
            </div>

            <h1 className="text-6xl font-black leading-none">
              Gia Nhập <br />
              <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">Cộng Đồng Âm Nhạc</span>
            </h1>

            <p className="text-xl text-slate-400 max-w-md">
              {t("auth.register_subtitle")} và bắt đầu hành trình sáng tạo những giai điệu mới.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE - Register Form */}
        <div className="p-8 md:p-20 bg-white/[0.02] border-l border-white/5 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full space-y-10">
            <div>
              <h3 className="text-4xl font-black tracking-tight mb-2">{t("auth.register_title")}</h3>
              <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">
                {t('auth.new_account_setup')}
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('auth.fullname_label')}</label>
                  <div className="relative">
                    <FaUser className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type="text"
                      required
                      placeholder={t("auth.fullname_placeholder")}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="vanna_01"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 px-6 text-white focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email</label>
                <div className="relative">
                  <FaEnvelope className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="email"
                    required
                    placeholder="example@qhuy.music"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('auth.password_label')}</label>
                <div className="relative">
                  <FaLock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('auth.confirm_password_label')}</label>
                <div className="relative">
                  <FaLock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-5 rounded-3xl bg-gradient-to-r from-cyan-600 to-blue-600 font-black uppercase tracking-widest text-lg shadow-xl shadow-cyan-500/30 hover:brightness-110 active:scale-[0.97] transition-all disabled:opacity-60 flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {t('auth.register_now_btn')}
                    <FaArrowRight />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500">
              {t("auth.already_account")}{" "}
              <button
                onClick={() => navigate('/login')}
                className="text-cyan-400 hover:text-white font-bold transition-colors"
              >
                {t("auth.back_to_login")}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Decorative Orbs */}
      <div className="fixed -bottom-20 -left-20 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed -top-20 -right-20 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none"></div>
    </div>
  );
}
