import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { FaHeadphones, FaHome, FaList, FaMusic, FaUserShield, FaSignOutAlt, FaSearch, FaHeart, FaHistory } from "react-icons/fa";
import GlobalPlayer from "../components/GlobalPlayer";

export default function Layout({ children }: { children?: React.ReactNode }) {
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Decode JWT token to check role
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payloadStr = atob(token.split('.')[1]);
        const payload = JSON.parse(payloadStr);
        if (payload.role === 'ADMIN' || payload.user?.role === 'ADMIN') {
          setIsAdmin(true);
        } else {
           const userStr = localStorage.getItem("user");
           if (userStr) {
             const user = JSON.parse(userStr);
             if (user.role === 'ADMIN') setIsAdmin(true);
           }
        }
      } catch (e) {
        console.error("Failed to decode token", e);
        try {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            const user = JSON.parse(userStr);
            if (user.role === 'ADMIN') setIsAdmin(true);
          }
        } catch (e2) {}
      }
    }
  }, []);

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
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {}
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const navItems = [
    { path: "/dashboard", icon: <FaHome size={20} />, label: "Khám Phá" },
    { path: "/history", icon: <FaHistory size={20} />, label: "Gần Đây" },
    { path: "/liked-songs", icon: <FaHeart size={20} />, label: "Yêu Thích" },
    { path: "/playlist", icon: <FaList size={20} />, label: "Playlist" },
    { path: "/my-songs", icon: <FaMusic size={20} />, label: "Của Tôi" },
  ];

  if (isAdmin) {
    navItems.push({ path: "/admin", icon: <FaUserShield size={20} />, label: "Admin" });
  }

  return (
    <div className="flex flex-col h-screen bg-ambient text-slate-200 overflow-hidden font-sans selection:bg-violet-500/30">
      
      {/* ===== TOP NAVBAR (Desktop) ===== */}
      <header className="fixed top-0 left-0 right-0 z-40 h-20 frosted-glass border-b border-white/5 shadow-lg flex items-center justify-between px-4 md:px-8">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-3 mr-4 lg:mr-8 group shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
            <FaHeadphones className="text-white text-xl" />
          </div>
          <span className="text-xl font-bold text-gradient-aurora tracking-tight hidden lg:block">
            Q.Huy Music
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-2 flex-1 justify-center max-w-3xl">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-white/10 text-cyan-400 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <span className={`${isActive ? "text-cyan-400" : ""}`}>
                  {item.icon}
                </span>
                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Search & Logout */}
        <div className="flex items-center gap-4 shrink-0">
          <form onSubmit={handleSearch} className="relative w-40 sm:w-56 lg:w-64">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm..." 
              className="w-full frosted-input py-2 pl-10 pr-4 text-sm focus:outline-none placeholder:text-slate-500"
            />
          </form>

          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="hidden md:flex items-center justify-center w-10 h-10 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-300"
          >
            <FaSignOutAlt size={18} />
          </button>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 h-full relative overflow-y-auto overflow-x-hidden pt-20 pb-28 md:pb-24">
        <div className="px-4 md:px-8 py-8 min-h-full flex flex-col max-w-[1600px] mx-auto animate-fade-in">
          {children || <Outlet />}
        </div>
      </main>

      <GlobalPlayer />

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="md:hidden fixed bottom-0 w-full frosted-glass border-t border-white/5 z-50 px-2 py-2 pb-safe-area shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <ul className="flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <li key={item.path} className="flex-1">
                <Link
                  to={item.path}
                  className={`flex flex-col items-center justify-center py-2 gap-1 rounded-2xl transition-all duration-300 ${
                    isActive ? "text-cyan-400" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className={`${isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" : "scale-100"} transition-transform`}>
                    {item.icon}
                  </span>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
          {/* Mobile Logout */}
          <li className="flex-1">
            <button
              onClick={handleLogout}
              className="w-full flex flex-col items-center justify-center py-2 gap-1 rounded-2xl transition-all duration-300 text-slate-400 hover:text-rose-400"
            >
              <FaSignOutAlt size={20} />
              <span className="text-[10px] font-medium">Thoát</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
