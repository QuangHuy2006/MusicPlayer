import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useState } from "react";
import { FaHeadphones, FaHome, FaList, FaMusic, FaUserShield, FaSignOutAlt, FaSearch, FaHeart, FaHistory } from "react-icons/fa";
import GlobalPlayer from "../components/GlobalPlayer";

export default function Layout({ children }: { children?: React.ReactNode }) {
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/dashboard?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate(`/dashboard`);
    }
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const navItems = [
    { path: "/dashboard", icon: <FaHome size={20} />, label: "Khám Phá" },
    { path: "/history", icon: <FaHistory size={20} />, label: "Nghe Gần Đây" },
    { path: "/liked-songs", icon: <FaHeart size={20} />, label: "Yêu Thích" },
    { path: "/playlist", icon: <FaList size={20} />, label: "Playlist" },
    { path: "/my-songs", icon: <FaMusic size={20} />, label: "Bài Hát Của Tôi" },
    { path: "/admin", icon: <FaUserShield size={20} />, label: "Admin" },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* ===== SIDEBAR (Desktop) ===== */}
      <aside className="hidden md:flex flex-col w-64 h-full bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 shadow-2xl z-40 relative">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <FaHeadphones className="text-white text-xl" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Q.Huy Music
          </span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Menu</p>
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${isActive
                    ? "bg-gradient-to-r from-cyan-500/10 to-purple-500/10 text-cyan-400 border border-cyan-500/20 shadow-[inset_0_0_20px_rgba(6,182,212,0.05)]"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                  }`}
              >
                <span className={`${isActive ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" : ""}`}>
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/60">
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 px-4 py-3 w-full rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
          >
            <FaSignOutAlt size={20} />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 h-full relative overflow-y-auto overflow-x-hidden bg-slate-950">
        {/* Decorative background blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none -z-10" />

        {/* Top Header with Search */}
        <header className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
           <form onSubmit={handleSearch} className="flex-1 max-w-xl relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm bài hát..." 
                className="w-full bg-slate-900/50 border border-slate-800 rounded-full py-2.5 pl-11 pr-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-500"
              />
           </form>
        </header>

        <div className="pb-24 md:pb-28 min-h-full flex flex-col">
          {children || <Outlet />}
        </div>
      </main>

      <GlobalPlayer />

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="md:hidden fixed bottom-0 w-full bg-slate-900/80 backdrop-blur-2xl border-t border-slate-800/60 z-50 px-2 py-2 safe-area-bottom">
        <ul className="flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <li key={item.path} className="flex-1">
                <Link
                  to={item.path}
                  className={`flex flex-col items-center justify-center py-2 gap-1 rounded-xl transition-colors ${isActive ? "text-cyan-400" : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <span className={`${isActive ? "drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" : ""}`}>
                    {item.icon}
                  </span>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

