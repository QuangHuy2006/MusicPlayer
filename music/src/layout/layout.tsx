import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  FaHeadphones, FaHome, FaList, FaMusic, FaUserShield, 
  FaSignOutAlt, FaSearch, FaHeart, FaHistory, FaYoutube,
  FaChevronLeft, FaChevronRight, FaUserCircle
} from "react-icons/fa";
import { MdExplore, MdLibraryMusic, MdQueueMusic } from "react-icons/md";
import GlobalPlayer from "../components/GlobalPlayer";

export default function Layout({ children }: { children?: React.ReactNode }) {
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userData, setUserData] = useState<any>(null);

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
      await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch (e) {}
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const navItems = [
    { path: "/dashboard", icon: <MdExplore size={24} />, label: "Khám Phá", color: "from-blue-500 to-cyan-400" },
    { path: "/history", icon: <FaHistory size={20} />, label: "Gần Đây", color: "from-amber-500 to-orange-400" },
    { path: "/liked-songs", icon: <FaHeart size={20} />, label: "Yêu Thích", color: "from-rose-500 to-pink-400" },
    { path: "/playlist", icon: <FaList size={20} />, label: "Playlist", color: "from-emerald-500 to-teal-400" },
    { path: "/youtube-converter", icon: <FaYoutube size={20} />, label: "Tải YouTube", color: "from-red-600 to-rose-500" },
    { path: "/my-songs", icon: <FaMusic size={20} />, label: "Của Tôi", color: "from-indigo-500 to-violet-400" },
  ];

  if (isAdmin) {
    navItems.push({ path: "/admin", icon: <FaUserShield size={22} />, label: "Quản Trị", color: "from-slate-700 to-slate-900" });
  }

  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-ambient text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30">
      
      {/* ===== SIDEBAR (Desktop) ===== */}
      <aside className={`hidden lg:flex flex-col h-full bg-black/20 border-r border-white/5 backdrop-blur-3xl z-50 transition-all duration-500 ease-in-out relative ${isCollapsed ? 'w-24' : 'w-72'}`}>
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
              <div className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-violet-500 via-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/20 group-hover:scale-110 transition-transform duration-500 shrink-0">
                <FaHeadphones className="text-white text-2xl" />
              </div>
              {!isCollapsed && (
                <div className="animate-[fade-in_0.3s_ease-out]">
                  <span className="text-xl font-black text-white tracking-tighter block">Q.HUY</span>
                  <span className="text-[10px] font-black text-cyan-400 tracking-[0.3em] uppercase opacity-70">Scientific</span>
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
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
                  isActive
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

        {/* User Profile Area */}
        <div className={`border-t border-white/5 bg-white/5 transition-all duration-500 ${isCollapsed ? 'p-4' : 'p-6'}`}>
           <div className={`flex items-center gap-4 group cursor-pointer ${isCollapsed ? 'flex-col justify-center' : ''}`}>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                 {userData?.avatar ? <img src={userData.avatar} className="w-full h-full object-cover" alt="" /> : <FaUserCircle size={24} className="text-slate-500" />}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1 animate-[fade-in_0.3s_ease-out]">
                   <p className="text-sm font-bold text-white truncate">{userData?.name || "Người dùng"}</p>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{userData?.role || "Member"}</p>
                </div>
              )}
              <button 
                onClick={handleLogout} 
                className={`text-slate-500 hover:text-rose-500 transition-colors p-2 ${isCollapsed ? 'mt-2' : ''}`} 
                title="Đăng xuất"
              >
                 <FaSignOutAlt size={18} />
              </button>
           </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT AREA ===== */}
      <div className="flex-1 flex flex-col h-full relative">
        
        {/* Top Header */}
        <header className="h-20 flex items-center justify-between px-6 md:px-10 z-40 backdrop-blur-md bg-black/10">
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

           {/* Mobile Menu Toggle (Simplified) */}
           <div className="lg:hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                 <FaHeadphones className="text-white" />
              </div>
           </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar pb-32">
           {children || <Outlet />}
        </main>

        <GlobalPlayer />
      </div>

      {/* ===== MOBILE NAV ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-xl border-t border-white/5 z-50 px-2 flex items-center justify-around">
          {navItems.slice(0, 5).map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>
                <span className={isActive ? 'scale-110' : ''}>{item.icon}</span>
                <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
              </Link>
            );
          })}
      </nav>
    </div>
  );
}
