import { useState } from "react";

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
      const response = await fetch("http://localhost:3001/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, password }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Đăng ký thành công! Chuyển hướng đến đăng nhập..." });
        // Có thể chuyển hướng sau 2 giây
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md p-8 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl transform transition-all duration-500 hover:scale-[1.02]"
      >
        <h2 className="text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400 drop-shadow-lg">
          Đăng Ký
        </h2>

        <div className="mb-6 group">
          <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">
            👤 Tên người dùng
          </label>
          <input
            type="text"
            placeholder="nguyenvana"
            value={name}
            onChange={(e) => setname(e.target.value)}
            required
            className="w-full px-5 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all duration-300"
          />
        </div>

        <div className="mb-8 group">
          <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">
            🔒 Mật khẩu
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-5 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all duration-300"
          />
        </div>

        {message.text && (
          <div
            className={`mb-4 p-3 rounded-lg text-center ${
              message.type === "success"
                ? "bg-green-500/20 text-green-300 border border-green-500/50"
                : "bg-red-500/20 text-red-300 border border-red-500/50"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="relative w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl shadow-xl transform transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/30 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
        >
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
          <span className="relative z-10">
            {loading ? "Đang xử lý..." : "Đăng Ký"}
          </span>
        </button>

        <div className="mt-6 text-center text-sm">
          <a
            href="/login"
            className="text-gray-400 hover:text-cyan-300 transition-colors relative group"
          >
            Đã có tài khoản? Đăng nhập
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:w-full transition-all duration-300" />
          </a>
        </div>
      </form>
    </div>
  );
}