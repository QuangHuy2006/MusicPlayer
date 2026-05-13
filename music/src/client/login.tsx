import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from '../config';
import { useToast } from '../context/ToastContext';
import {
  FaHeadphones, FaEnvelope, FaLock, FaArrowRight,
  FaMusic, FaCompactDisc, FaMicrophoneAlt, FaGuitar,
  FaGoogle, FaFacebookF, FaGithub
} from "react-icons/fa";

// =============================================================================
// FLOATING ICON (CSS Animation)
// =============================================================================
const FloatingIcon = ({ icon: Icon, x = 0, y = 0, delay = 0 }: any) => {
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
// MAIN LOGIN PAGE
// =============================================================================
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Vui lòng điền đầy đủ thông tin");

    setIsLoading(true);
    fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
      .then(res => res.json())
      .then(data => {
        setIsLoading(false);
        if (data.success) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          toast.success("Đăng nhập thành công! Chào mừng trở lại!");
          navigate("/dashboard");
        } else {
          toast.error(data.msg || "Thông tin đăng nhập không hợp lệ");
        }
      })
      .catch((err) => {
        setIsLoading(false);
        console.error(err);
        toast.error("Lỗi kết nối tới máy chủ");
      });
  };

  return (
    <div className="relative min-h-screen bg-black text-slate-200 overflow-hidden flex items-center justify-center p-4 md:p-10 font-sans">
      {/* Background Visuals */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Aurora orbs */}
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/20 blur-[140px] animate-pulse"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/20 blur-[140px] animate-pulse" style={{ animationDelay: '2.5s' }}></div>

        {/* Subtle Grid */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(#ffffff_1px,transparent_1px),linear-gradient(90deg,#ffffff_1px,transparent_1px)] bg-[size:60px_60px]"></div>
      </div>

      {/* Floating Icons */}
      <FloatingIcon icon={FaMusic} delay={0} x={15} y={20} />
      <FloatingIcon icon={FaCompactDisc} delay={1} x={78} y={22} />
      <FloatingIcon icon={FaMicrophoneAlt} delay={2} x={15} y={72} />
      <FloatingIcon icon={FaGuitar} delay={3} x={82} y={68} />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 bg-white/5 backdrop-blur-3xl rounded-[48px] border border-white/10 shadow-2xl overflow-hidden">

        {/* LEFT SIDE - Branding */}
        <div className="hidden lg:flex flex-col justify-between p-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/15 via-transparent to-cyan-500/10" />

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-cyan-500/30 animate-bounce-slow">
                <FaHeadphones size={32} className="text-white" />
              </div>
              <h2 className="text-3xl font-black tracking-tighter">Q.HUY MUSIC</h2>
            </div>

            <h1 className="text-6xl font-black leading-none mb-6">
              Hệ Thống <br />
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Khai Phá Âm Nhạc</span>
            </h1>

            <p className="text-xl text-slate-400 max-w-md">
              Trải nghiệm nghe nhạc thông minh, tinh tế và không giới hạn.
            </p>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <img
                    key={i}
                    src={`https://i.pravatar.cc/48?img=${i + 10}`}
                    alt=""
                    className="w-9 h-9 rounded-full border-2 border-slate-900 object-cover"
                  />
                ))}
              </div>
              <p className="text-sm text-slate-500">
                Cùng <span className="text-white font-bold">+2,000</span> nghệ sĩ
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - Form */}
        <div className="p-8 md:p-20 bg-white/[0.02] border-l border-white/5 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full space-y-10">
            <div className="text-center lg:text-left">
              <h3 className="text-4xl font-black tracking-tight mb-2">Đăng Nhập</h3>
              <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">
                Truy cập hệ thống quản lý âm nhạc
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email</label>
                <div className="relative">
                  <FaEnvelope className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="email"
                    required
                    placeholder="admin@qhuy.music"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mật khẩu</label>
                  <a href="#" className="text-cyan-400 text-xs hover:text-white transition-colors">Quên mật khẩu?</a>
                </div>
                <div className="relative">
                  <FaLock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-5 rounded-3xl bg-gradient-to-r from-violet-600 to-cyan-600 font-black uppercase tracking-widest text-lg shadow-xl shadow-cyan-500/30 hover:brightness-110 active:scale-[0.97] transition-all disabled:opacity-60 flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Đăng Nhập
                    <FaArrowRight />
                  </>
                )}
              </button>
            </form>

            {/* Social Login */}
            <div>
              <div className="relative py-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-slate-600 font-bold uppercase tracking-widest">hoặc</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: FaGoogle, color: "hover:text-red-500 hover:bg-red-500/10" },
                  { icon: FaFacebookF, color: "hover:text-blue-600 hover:bg-blue-600/10" },
                  { icon: FaGithub, color: "hover:text-white hover:bg-white/10" },
                ].map((social, i) => (
                  <button
                    key={i}
                    className={`py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 transition-all ${social.color}`}
                  >
                    <social.icon size={24} />
                  </button>
                ))}
              </div>
            </div>

            <p className="text-center text-sm text-slate-500">
              Chưa có tài khoản?{" "}
              <button
                onClick={() => navigate('/register')}
                className="text-cyan-400 hover:text-white font-bold transition-colors"
              >
                Đăng ký ngay
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