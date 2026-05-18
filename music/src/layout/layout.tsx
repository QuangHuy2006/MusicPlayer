import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  FaHeadphones, FaList, FaMusic, FaUserShield,
  FaSignOutAlt, FaSearch, FaHeart, FaHistory,
  FaChevronLeft, FaChevronRight, FaUserCircle, FaBell, FaTrophy,
  FaDownload
} from "react-icons/fa";
import { MdExplore } from "react-icons/md";
import GlobalPlayer from "../components/GlobalPlayer";
import NotificationPanel from "../components/NotificationPanel";
import TitleBar from "../components/TitleBar";
import { useNotification } from "../context/NotificationContext";

import { API_BASE } from "../config";

export default function Layout({ children }: { children?: React.ReactNode }) {

  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotification();
  
  const isPremium = userData?.role === 'PREMIUM';

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (userStr) setUserData(JSON.parse(userStr));

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'ADMIN' || payload.user?.role === 'ADMIN' || (userStr && JSON.parse(userStr).role === 'ADMIN')) {
          setIsAdmin(true);
        }
      } catch (e) {
        console.error(e);
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
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ refreshToken: localStorage.getItem("refresh_token") }) 
      });
    } catch (e) { }
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const navItems = [
    { path: "/dashboard", icon: <MdExplore size={24} />, label: "Khám Phá", color: "from-blue-500 to-cyan-400" },
    { path: "/leaderboard", icon: <FaTrophy size={20} />, label: "Xếp Hạng", color: "from-amber-500 to-yellow-400" },
    { path: "/history", icon: <FaHistory size={20} />, label: "Gần Đây", color: "from-amber-500 to-orange-400" },
    { path: "/liked-songs", icon: <FaHeart size={20} />, label: "Yêu Thích", color: "from-rose-500 to-pink-400" },
    { path: "/playlist", icon: <FaList size={20} />, label: "Playlist", color: "from-emerald-500 to-teal-400" },
    { path: "/my-songs", icon: <FaMusic size={20} />, label: "Của Tôi", color: "from-indigo-500 to-violet-400" },
    { path: "/offline", icon: <FaDownload size={18} />, label: "Nhạc Offline", color: "from-sky-500 to-indigo-400" },
    { path: "/profile", icon: <FaUserCircle size={20} />, label: "Profile", color: "from-cyan-500 to-blue-400" },
  ];

  if (isAdmin) {
    navItems.push({ path: "/admin", icon: <FaUserShield size={22} />, label: "Quản Trị", color: "from-slate-700 to-slate-900" });
  }

  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`flex flex-col h-screen ${isPremium ? 'bg-premium-ambient' : 'bg-ambient'} text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30`}>
      <TitleBar />
      <div className="flex flex-1 overflow-hidden relative">

      {/* ===== SIDEBAR (Desktop) ===== */}
      <aside className={`hidden lg:flex flex-col h-full ${isPremium ? 'premium-sidebar' : 'bg-black/20 border-r border-white/5 backdrop-blur-3xl'} z-50 transition-all duration-500 ease-in-out relative ${isCollapsed ? 'w-24' : 'w-72'}`}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-24 w-6 h-6 bg-[var(--accent-gold)] text-black rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50"
        >
          {isCollapsed ? <FaChevronRight size={10} /> : <FaChevronLeft size={10} />}
        </button>

        {/* Logo */}
        <div className={`p-8 transition-all duration-500 ${isCollapsed ? 'px-6' : 'p-8'}`}>
          <Link to="/dashboard" className="flex items-center gap-4 group">
            <div className={`w-12 h-12 rounded-[18px] ${isPremium ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-amber-500/30' : 'bg-gradient-to-br from-violet-500 via-cyan-500 to-blue-600 shadow-cyan-500/20'} flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500 shrink-0`}>
              <FaHeadphones className="text-white text-2xl" />
            </div>
            {!isCollapsed && (
              <div className="animate-[fade-in_0.3s_ease-out]">
                <span className={`text-xl font-black ${isPremium ? 'shimmer-gold-text' : 'text-white'} tracking-tighter block`}>
                  {isPremium ? 'Q.HUY VIP' : 'Q.HUY'}
                </span>
                <span className={`text-[10px] font-black ${isPremium ? 'text-amber-500' : 'text-cyan-400'} tracking-[0.3em] uppercase opacity-70`}>
                  {isPremium ? 'GOLD MEMBER' : 'Scientific'}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 custom-scrollbar overflow-y-auto overflow-x-hidden">
          <p className={`px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 transition-opacity duration-300 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
            Menu Chính
          </p>
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : ""}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${isActive
                    ? `bg-gradient-to-r ${item.color} text-white shadow-xl shadow-cyan-900/20`
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <span className={`${isActive ? "text-white" : "text-slate-500 group-hover:text-white"} transition-colors shrink-0`}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className="text-sm font-bold tracking-wide animate-[fade-in_0.3s_ease-out] whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>


      </aside>

      {/* ===== MAIN CONTENT AREA ===== */}
      <div className="flex-1 flex flex-col h-full relative">

        {/* Top Header */}
        <header className={`h-20 flex items-center justify-between px-6 md:px-10 z-40 backdrop-blur-md ${isPremium ? 'bg-amber-950/5 border-b border-amber-500/10' : 'bg-black/10'} safe-top`}>
          {/* Navigation Arrows & Search */}
          <div className="flex items-center gap-6 flex-1">
            <div className="hidden md:flex items-center gap-2">
              <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-slate-400 transition-all border border-white/5">
                <FaChevronLeft />
              </button>
              <button onClick={() => navigate(1)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-slate-400 transition-all border border-white/5">
                <FaChevronRight />
              </button>
            </div>

            <form onSubmit={handleSearch} className="relative w-full max-w-md group">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[var(--accent-blue)] transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm bài hát, nghệ sĩ..."
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-[var(--accent-blue)]/50 focus:bg-white/10 transition-all placeholder:text-slate-600 font-medium"
              />
            </form>
          </div>

          {/* Notification Bell & Profile */}
          <div className="flex items-center gap-4 md:gap-6">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 text-slate-400 hover:text-[var(--accent-gold)] transition-colors"
            >
              <FaBell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <div className="h-8 w-[1px] bg-white/10 hidden md:block"></div>

            {/* User Profile Area (Header) */}
            <div className="hidden md:flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                {userData?.avatar ? <img src={userData.avatar} className="w-full h-full object-cover" alt="" /> : <FaUserCircle size={24} className="text-slate-500" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-white truncate max-w-[120px]">{userData?.name || "Người dùng"}</p>
                  {isPremium && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-md vip-badge-glow font-black uppercase tracking-widest shrink-0">
                      VIP
                    </span>
                  )}
                </div>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isPremium ? 'text-amber-500' : 'text-slate-500'}`}>{userData?.role || "Member"}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-500 hover:text-rose-500 transition-colors p-2 ml-2 bg-white/5 rounded-full hover:bg-white/10"
                title="Đăng xuất"
              >
                <FaSignOutAlt size={16} />
              </button>
            </div>

            {/* Mobile Menu Toggle (Simplified) */}
            <div className="lg:hidden flex items-center gap-3">
              <button onClick={handleLogout} className="text-slate-500 hover:text-rose-500 p-2" title="Đăng xuất">
                 <FaSignOutAlt size={18} />
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <FaHeadphones className="text-white" />
              </div>
            </div>
          </div>
        </header>

        {/* Notification Panel */}
        <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar pb-32">
          {children || <Outlet />}
        </main>

        <GlobalPlayer />
      </div>

      </div>
      {/* ===== MOBILE NAV ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-bottom))] bg-black/80 backdrop-blur-xl border-t border-white/5 z-50 px-2 flex items-start pt-2 justify-around safe-bottom">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>
              <span className={isActive ? 'scale-110' : ''}>{item.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
