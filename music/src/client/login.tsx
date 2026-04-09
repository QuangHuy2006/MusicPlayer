import { useState } from "react";


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden p-4" >
      {/* 🌟 CHUYỂN ĐỘNG INFINITE - Vòng tròn 3D xoay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 pointer-events-none">
        <div
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 border-r-purple-400 border-b-pink-400 border-l-blue-400"
          style={{ animation: "spin 8s linear infinite" }}
        />
        <div
          className="absolute inset-8 rounded-full border-4 border-transparent border-t-purple-400 border-r-pink-400 border-b-cyan-400 border-l-blue-400"
          style={{ animation: "spin-reverse 12s linear infinite" }}
        />
        <div className="absolute inset-16 rounded-full bg-linear-to-br from-cyan-500/10 to-purple-500/10 backdrop-blur-3xl" />
      </div>

      {/* 🌊 Sóng SVG uốn lượn dưới đáy */}
      <div className="absolute bottom-0 left-0 w-full h-32 pointer-events-none">
        <svg
          className="absolute bottom-0 w-full"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="url(#waveGradient)"
            fillOpacity="0.25"
            className="animate-wave"
            style={{ animation: "wave 20s ease-in-out infinite alternate" }}
          >
            <animate
              attributeName="d"
              dur="10s"
              repeatCount="indefinite"
              values="
              M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,133.3C672,117,768,139,864,154.7C960,171,1056,181,1152,170.7C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
              M0,128L48,144C96,160,192,192,288,181.3C384,171,480,117,576,122.7C672,128,768,192,864,192C960,192,1056,128,1152,117.3C1248,107,1344,149,1392,170.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
              M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,133.3C672,117,768,139,864,154.7C960,171,1056,181,1152,170.7C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z
            "
            />
          </path>
          <defs>
            <linearGradient id="waveGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ✨ FORM ĐĂNG NHẬP (giữ nguyên thiết kế 3D đẹp mắt) */}
      <div className="relative z-10 w-full max-w-md p-1 rounded-2xl bg-linear-to-br from-cyan-400/30 to-purple-500/30 animate-pulse-slow">
        <form className="relative w-full p-8 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl transform transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_20px_60px_rgba(139,92,246,0.3)]">
          <div className="absolute inset-0 rounded-2xl bg-linear-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          <h2 className="text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-linear-to-r from-cyan-300 to-purple-400 drop-shadow-lg animate-pulse">
            Đăng Nhập
          </h2>

          <div className="mb-6 group perspective-1000">
            <label className="block text-sm font-medium text-gray-300 mb-2 ml-1 transition-transform duration-300 group-focus-within:translate-y-0.5">
              👤 Tên người dùng
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="nguyenvana@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.5),inset_-2px_-2px_6px_rgba(255,255,255,0.05)] hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.03)]"
                style={{ transformStyle: "preserve-3d" }}
              />
            </div>
          </div>

          <div className="mb-8 group">
            <label className="block text-sm font-medium text-gray-300 mb-2 ml-1 transition-transform duration-300 group-focus-within:translate-y-0.5">
              🔒 Mật khẩu
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-5 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.5),inset_-2px_-2px_6px_rgba(255,255,255,0.05)] hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.03)]"
              />
            </div>
          </div>

          <button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              fetch(`/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json"},
                body: JSON.stringify({ email, password }),
              })
                .then((res) => res.json())
                .then((data) => {
                  if (data.success) {
                 localStorage.setItem("user", JSON.stringify(data.user));
                window.location.href = "/dashboard";
              } else {
                alert(data.msg);
              }
            })}}
            className="relative w-full py-3.5 px-4 bg-linear-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl shadow-xl transform transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/30 active:translate-y-0.5 active:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-400 overflow-hidden group"
          >
            <span className="absolute inset-0 w-full h-full bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            <span className="relative z-10">Đăng Nhập</span>
          </button>

          <div className="mt-6 flex justify-between text-sm">
            <a
              href="/register"
              className="text-gray-400 hover:text-purple-300 transition-colors duration-300 relative group"
            >
              Tạo tài khoản
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-linear-to-r from-purple-400 to-pink-500 group-hover:w-full transition-all duration-300" />
            </a>
          </div>
        </form>
      </div>

      {/* 🎨 CSS KEYFRAMES (Infinite animations) */}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }

        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes float-particle {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateY(-100vh) translateX(20px); opacity: 0; }
        }

        @keyframes wave {
          0% { transform: translateY(0) scaleX(1); }
          100% { transform: translateY(-20px) scaleX(1.05); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        .animate-reverse-spin {
          animation: spin-reverse 12s linear infinite;
        }
        .animate-wave {
          animation: wave 10s ease-in-out infinite alternate;
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        form {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
