import { useState } from "react";
import { API_BASE } from '../config';

export default function Register() {
  const [name, setname] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!name || !password) {
      setMessage({ type: "error", text: "Vui lòng nhập đầy đủ thông tin" });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: "error", text: "Mật khẩu phải ít nhất 6 ký tự" });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, password }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Đăng ký thành công! Chuyển hướng đến đăng nhập..." });
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else {
        setMessage({ type: "error", text: data.msg || "Đăng ký thất bại" });
      }
    } catch (error) {
      console.error("Lỗi kết nối:", error);
      setMessage({ type: "error", text: "Không thể kết nối đến máy chủ" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden p-4">
      {/* 🌟 CHUYỂN ĐỘNG INFINITE - Vòng tròn 3D xoay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none opacity-50">
        <div
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500/30 border-r-purple-500/30 border-b-pink-500/30 border-l-blue-500/30"
          style={{ animation: "spin 15s linear infinite" }}
        />
        <div
          className="absolute inset-12 rounded-full border-4 border-transparent border-t-purple-500/20 border-r-pink-500/20 border-b-cyan-500/20 border-l-blue-500/20"
          style={{ animation: "spin 20s linear infinite reverse" }}
        />
        <div className="absolute inset-24 rounded-full bg-gradient-to-br from-cyan-500/5 to-purple-500/5 backdrop-blur-3xl" />
      </div>

      {/* ✨ FORM ĐĂNG KÝ */}
      <div className="relative z-10 w-full max-w-md p-1 rounded-[2rem] bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-transparent shadow-2xl animate-[pulse_4s_ease-in-out_infinite]">
        <form
          onSubmit={handleSubmit}
          className="relative w-full p-8 sm:p-10 rounded-[2rem] bg-slate-900/80 backdrop-blur-2xl border border-white/5 shadow-2xl transform transition-all duration-500 hover:scale-[1.02]"
        >
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          <h2 className="text-3xl font-bold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 drop-shadow-sm">
            Đăng Ký
          </h2>

          <div className="mb-6 group">
            <label className="block text-sm font-medium text-slate-400 mb-2 ml-1 transition-colors duration-300 group-focus-within:text-cyan-400">
              Tên người dùng
            </label>
            <input
              type="text"
              placeholder="nguyenvana"
              value={name}
              onChange={(e) => setname(e.target.value)}
              required
              className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
            />
          </div>

          <div className="mb-8 group">
            <label className="block text-sm font-medium text-slate-400 mb-2 ml-1 transition-colors duration-300 group-focus-within:text-purple-400">
              Mật khẩu
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
            />
          </div>

          {message.text && (
            <div
              className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center justify-center ${
                message.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="relative w-full py-4 px-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transform transition-all duration-300 hover:shadow-cyan-500/40 active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:hover:shadow-cyan-500/20 focus:outline-none overflow-hidden group"
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
            <span className="relative z-10">
              {loading ? "Đang xử lý..." : "Đăng Ký"}
            </span>
          </button>

          <div className="mt-8 text-center text-sm">
            <span className="text-slate-500">Đã có tài khoản? </span>
            <a
              href="/login"
              className="text-cyan-400 hover:text-cyan-300 transition-colors duration-300 font-semibold"
            >
              Đăng nhập ngay
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}