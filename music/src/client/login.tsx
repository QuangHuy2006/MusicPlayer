import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from '../config';
import { useToast } from '../context/ToastContext';
import { FaHeadphones, FaEnvelope, FaLock, FaArrowRight } from "react-icons/fa";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
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
          toast.success("Đăng nhập thành công!");
          navigate("/dashboard");
        } else {
          toast.error(data.msg || "Đăng nhập thất bại");
        }
      })
      .catch(() => {
        setIsLoading(false);
        toast.error("Lỗi kết nối");
      });
  };

  return (
    <div className="flex min-h-screen bg-ambient-login text-slate-200 selection:bg-violet-500/30 font-sans">

      {/* ===== LEFT SIDE: IMMERSIVE VISUAL ===== */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center p-12 max-w-2xl animate-fade-in">
          <div className="w-24 h-24 mb-8 rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.4)]">
            <FaHeadphones className="text-white text-5xl" />
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            Trải nghiệm âm nhạc <br /><span className="text-gradient-aurora">đỉnh cao</span>
          </h1>
          <p className="text-xl text-slate-400 font-light leading-relaxed">
            Hàng triệu bài hát, podcast và nội dung âm thanh độc quyền đang chờ bạn khám phá. Bắt đầu hành trình âm nhạc của bạn ngay hôm nay.
          </p>
        </div>
      </div>

      {/* ===== RIGHT SIDE: LOGIN FORM ===== */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 z-10 relative">
        <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: '0.1s' }}>

          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <FaHeadphones className="text-white text-3xl" />
            </div>
          </div>

          <div className="frosted-glass-card p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            {/* Subtle top glare */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-bold mb-2 text-white">Đăng Nhập</h2>
              <p className="text-slate-400">Chào mừng trở lại! Vui lòng nhập thông tin.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                    <FaEnvelope />
                  </div>
                  <input
                    type="email"
                    placeholder="nguyenvana@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full frosted-input py-3.5 pl-11 pr-4"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Mật khẩu</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                    <FaLock />
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full frosted-input py-3.5 pl-11 pr-4"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-4 frosted-btn-primary flex items-center justify-center gap-2 mt-4 group disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="text-lg">Đăng Nhập</span>
                    <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/5 text-center">
              <span className="text-slate-400">Chưa có tài khoản? </span>
              <a
                href="/register"
                className="text-cyan-400 hover:text-cyan-300 transition-colors duration-300 font-semibold"
              >
                Đăng ký ngay
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
