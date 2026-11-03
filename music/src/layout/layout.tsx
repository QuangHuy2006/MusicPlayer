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
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useNotification } from "../context/NotificationContext";
import packageJson from "../../package.json";
import { useTranslation } from "react-i18next";

import { API_BASE } from "../config.tsx";
import type { User } from "../interface/user";

interface ReleaseAsset {
  name?: string;
  browser_download_url?: string;
}

export default function Layout({ children }: { children?: React.ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [userData] = useState<User | null>(() => {
    try {
      const userStr = localStorage.getItem("user");
      return userStr ? (JSON.parse(userStr) as User) : null;
    } catch {
      return null;
    }
  });

  const [isAdmin] = useState(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userStr = localStorage.getItem("user");
        const parsedUser = userStr ? JSON.parse(userStr) : {};
        return payload.role === 'ADMIN' || payload.user?.role === 'ADMIN' || parsedUser.role === 'ADMIN';
      } catch {
        return false;
      }
    }
    return false;
  });

  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotification();

  const isPremium = userData?.role === 'PREMIUM';

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [onlineVersion, setOnlineVersion] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'completed' | 'error'>('idle');
  const [downloadErrorMsg, setDownloadErrorMsg] = useState('');

  // Listen to in-app downloader events
  useEffect(() => {
    const ipc = window.ipcRenderer;

    if (!ipc) return;

    const handleProgress = (_: unknown, percent: number) => {
      setDownloadProgress(percent);
    };

    const handleComplete = () => {
      setDownloadStatus('completed');
    };

    const handleError = (_: unknown, msg: string) => {
      setDownloadStatus('error');
      setDownloadErrorMsg(msg);
    };

    ipc.on('download-progress', handleProgress as (...args: unknown[]) => void);
    ipc.on('download-complete', handleComplete);
    ipc.on('download-error', handleError as (...args: unknown[]) => void);

    return () => {
      ipc.off('download-progress', handleProgress as (...args: unknown[]) => void);
      ipc.off('download-complete', handleComplete);
      ipc.off('download-error', handleError as (...args: unknown[]) => void);
    };
  }, []);

  const startInAppUpdate = () => {
    const ipc = window.ipcRenderer;
    const finalUrl = downloadUrl || `https://github.com/QuangHuy2006/MusicPlayer/releases/download/v${onlineVersion}/MusicPlayer%20Setup%20${onlineVersion}.exe`;

    if (ipc) {
      setDownloadStatus('downloading');
      setDownloadProgress(0);
      ipc.send('download-update', finalUrl);
    } else {
      window.open(finalUrl, '_blank');
    }
  };

  // Automated System Update Checker
  useEffect(() => {
    const checkUpdates = async () => {
      try {
        // Fetch the raw package.json directly from their public GitHub repo
        const res = await fetch("https://raw.githubusercontent.com/QuangHuy2006/MusicPlayer/main/music/package.json");
        if (res.ok) {
          const data = await res.json();
          const online = data.version;
          const local = packageJson.version;

          // Compare versions (semver parts)
          const parse = (v: string) => v.replace(/[^0-9.]/g, '').split('.').map(Number);
          const localParts = parse(local);
          const onlineParts = parse(online);

          let hasUpdate = false;
          for (let i = 0; i < Math.max(localParts.length, onlineParts.length); i++) {
            const l = localParts[i] || 0;
            const o = onlineParts[i] || 0;
            if (o > l) {
              hasUpdate = true;
              break;
            }
            if (l > o) break;
          }

          if (hasUpdate) {
            setOnlineVersion(online);

            // Dynamically query actual download URL from GitHub API
            try {
              const relRes = await fetch("https://api.github.com/repos/QuangHuy2006/MusicPlayer/releases");
              if (relRes.ok) {
                const releases = await relRes.json();
                const latestRelease = releases[0];
                if (latestRelease && latestRelease.assets) {
                  const exeAsset = latestRelease.assets.find((asset: ReleaseAsset) => typeof asset.name === 'string' && asset.name.endsWith('.exe'));
                  if (exeAsset && typeof exeAsset.browser_download_url === 'string') {
                    setDownloadUrl(exeAsset.browser_download_url);
                  }
                }
              }
            } catch (e) {
              console.warn("Failed to dynamically resolve release download URL:", e);
            }

            setShowUpdateModal(true);
          }
        }
      } catch (err) {
        console.warn("Failed to check for system updates:", err);
      }
    };

    checkUpdates();
    const updateInterval = setInterval(checkUpdates, 15 * 60 * 1000);
    return () => clearInterval(updateInterval);
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
      const token = localStorage.getItem("token");
      const refreshToken = localStorage.getItem("refresh_token");
      if (token && refreshToken) {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ refreshToken })
        });
      }
    } catch { /* ignore */ }
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const navItems = [
    { path: "/dashboard", icon: <MdExplore size={24} />, label: t('nav.explore'), color: "from-blue-500 to-cyan-400" },
    { path: "/leaderboard", icon: <FaTrophy size={20} />, label: t('nav.leaderboard'), color: "from-amber-500 to-yellow-400" },
    { path: "/history", icon: <FaHistory size={20} />, label: t('nav.history'), color: "from-amber-500 to-orange-400" },
    { path: "/liked-songs", icon: <FaHeart size={20} />, label: t('nav.favorites'), color: "from-rose-500 to-pink-400" },
    { path: "/playlist", icon: <FaList size={20} />, label: t('nav.playlists'), color: "from-emerald-500 to-teal-400" },
    { path: "/my-songs", icon: <FaMusic size={20} />, label: t('nav.my_songs'), color: "from-indigo-500 to-violet-400" },
    { path: "/offline", icon: <FaDownload size={18} />, label: t('nav.offline_music'), color: "from-sky-500 to-indigo-400" },
    { path: "/profile", icon: <FaUserCircle size={20} />, label: t('nav.profile'), color: "from-cyan-500 to-blue-400" },
  ];

  if (isAdmin) {
    navItems.push({ path: "/admin", icon: <FaUserShield size={22} />, label: t('nav.admin'), color: "from-slate-700 to-slate-900" });
  }

  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`flex flex-col h-screen bg-[#080808] text-white overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-white`}>
      <TitleBar />
      <div className="flex flex-1 overflow-hidden relative">

        {/* ===== SIDEBAR (Desktop) ===== */}
        <aside className={`hidden lg:flex flex-col h-full bg-black/40 backdrop-blur-xl border-r border-white/5 z-50 transition-all duration-500 ease-in-out relative ${isCollapsed ? 'w-24' : 'w-72'}`}>
          {/* Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-24 w-6 h-6 bg-[#1a1a1a] text-white border border-white/10 rounded-full flex items-center justify-center hover:scale-110 hover:bg-[#2a2a2a] hover:border-emerald-500/50 transition-all z-50 shadow-lg cursor-pointer"
          >
            {isCollapsed ? <FaChevronRight size={10} /> : <FaChevronLeft size={10} />}
          </button>

          {/* Logo */}
          <div className={`p-8 transition-all duration-500 ${isCollapsed ? 'px-6' : 'p-8'}`}>
            <Link to="/dashboard" className="flex items-center gap-4 group">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-300`}>
                <FaHeadphones className="text-black text-2xl" />
              </div>
              {!isCollapsed && (
                <div className="animate-[fade-in_0.3s_ease-out]">
                  <span className={`text-xl font-black text-white tracking-tight block`}>
                    {isPremium ? 'Q.HUY PRO' : 'Q.HUY'}
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1.5 custom-scrollbar overflow-y-auto overflow-x-hidden pb-4">
            <p className={`px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 mt-2 transition-opacity duration-300 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
              {t('nav.explore')}
            </p>
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.label : ""}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${isActive
                    ? `bg-white/10 text-white shadow-sm`
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  {isActive && !isCollapsed && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-r-full"></div>
                  )}
                  <span className={`${isActive ? "text-emerald-400" : "text-gray-400 group-hover:text-emerald-400"} transition-colors shrink-0 z-10`}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="font-semibold text-sm tracking-wide z-10 truncate">
                      {item.label}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* ===== MAIN CONTENT AREA ===== */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#121212] via-[#080808] to-[#050505]">

          {/* Top Header / App Bar */}
          <header className="h-20 border-b border-white/5 flex items-center justify-between px-6 md:px-10 z-40 bg-[#080808]/40 backdrop-blur-md">

            {/* Global Search Bar */}
            <div className="flex-1 max-w-xl flex items-center gap-3">
              <form onSubmit={handleSearch} className="relative w-full max-w-md group">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('nav.search_placeholder')}
                  className="w-full bg-white/5 border border-white/5 rounded-full py-2.5 pl-12 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 hover:bg-white/10 hover:border-white/10 transition-all placeholder:text-gray-500 font-medium text-white shadow-inner"
                />
              </form>
            </div>

            {/* Right Action Controls: Language Switcher, Notifications, Profile */}
            <div className="flex items-center gap-3 md:gap-5">
              <LanguageSwitcher />

              {onlineVersion && (
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="relative p-2.5 text-amber-500 hover:text-amber-400 transition-colors animate-pulse flex items-center justify-center bg-amber-500/10 hover:bg-amber-500/20 rounded-xl border border-amber-500/20 shadow-lg shadow-amber-500/10 cursor-pointer"
                  title={`v${onlineVersion}`}
                >
                  <FaDownload size={14} />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping"></span>
                </button>
              )}

              {/* Notification Bell */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 cursor-pointer"
                title={t('nav.notifications')}
              >
                <FaBell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <div className="h-8 w-[1px] bg-white/10 hidden md:block"></div>

              {/* User Profile Area (Header) */}
              <div className="hidden md:flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-500/20 flex items-center justify-center overflow-hidden border border-emerald-500/20 shrink-0 shadow-inner">
                  {userData?.avatar ? <img src={userData.avatar} className="w-full h-full object-cover" alt="" /> : <FaUserCircle size={24} className="text-emerald-500/80" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate max-w-[120px]">{userData?.name || "User"}</p>
                    {isPremium && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#444] text-white uppercase tracking-widest shrink-0 font-bold">
                        PRO
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-slate-500 hover:text-rose-500 transition-colors p-2 ml-2 bg-white/5 rounded-full hover:bg-white/10 cursor-pointer"
                  title={t('nav.logout')}
                >
                  <FaSignOutAlt size={16} />
                </button>
              </div>

              {/* Mobile Menu Toggle (Simplified) */}
              <div className="lg:hidden flex items-center gap-3">
                <button onClick={handleLogout} className="text-slate-500 hover:text-rose-500 p-2 cursor-pointer" title={t('nav.logout')}>
                  <FaSignOutAlt size={18} />
                </button>
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  <FaHeadphones className="text-black" />
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

        {/* SYSTEM UPDATE DIALOG */}
        {showUpdateModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-[fade-in_0.3s_ease-out]">
            <div className="w-full max-w-md bg-slate-950/80 backdrop-blur-2xl border border-amber-500/20 rounded-3xl p-8 shadow-[0_0_80px_rgba(245,158,11,0.15)] relative overflow-hidden text-center">

              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>

              {downloadStatus === 'idle' ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 animate-[bounce-slow_4s_infinite_ease-in-out]">
                    <FaDownload className="text-white text-3xl" />
                  </div>

                  <h3 className="text-2xl font-black tracking-tight mb-2 uppercase text-white">
                    {t('nav.update_title')}
                  </h3>
                  <p className="text-slate-400 text-sm font-semibold tracking-wide mb-6">
                    {t('nav.update_desc', { version: onlineVersion, current: packageJson.version })}
                  </p>

                  <div className="flex items-center justify-center gap-6 bg-white/5 border border-white/5 rounded-2xl p-4 mb-6 font-semibold">
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black block mb-1">Current</span>
                      <span className="text-sm font-bold text-slate-400">v{packageJson.version}</span>
                    </div>
                    <div className="h-8 w-[1px] bg-white/10"></div>
                    <div className="text-center">
                      <span className="text-[10px] text-amber-500 uppercase tracking-widest font-black block mb-1">Latest</span>
                      <span className="text-sm font-black text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">v{onlineVersion}</span>
                    </div>
                  </div>

                  <div className="text-left bg-white/5 border border-white/5 rounded-2xl p-4 text-xs font-semibold text-slate-400 leading-relaxed mb-8 max-h-32 overflow-y-auto custom-scrollbar">
                    <p className="text-white font-bold mb-1">{t('nav.update_note')}</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={startInAppUpdate}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black uppercase text-xs tracking-widest transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-amber-500/20 cursor-pointer"
                    >
                      {t('nav.download_update')}
                    </button>
                    <button
                      onClick={() => setShowUpdateModal(false)}
                      className="w-full py-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      {t('nav.remind_later')}
                    </button>
                  </div>
                </>
              ) : downloadStatus === 'downloading' ? (
                <div className="py-6">
                  <div className="relative w-24 h-24 mx-auto mb-8 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
                    <div className="text-lg font-black text-amber-400">
                      {downloadProgress}%
                    </div>
                  </div>

                  <h3 className="text-xl font-black tracking-tight mb-2 uppercase text-white">
                    {t('nav.download_update')}
                  </h3>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-2 border border-white/5 max-w-xs mx-auto">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </div>
                </div>
              ) : downloadStatus === 'completed' ? (
                <div className="py-8">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl animate-bounce">
                    ✓
                  </div>
                  <h3 className="text-xl font-black tracking-tight mb-2 uppercase text-white">
                    OK
                  </h3>
                  <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : (
                <div className="py-6">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 text-3xl">
                    ⚠
                  </div>
                  <p className="text-rose-400/90 text-xs font-bold mb-6 px-4">
                    Error: {downloadErrorMsg}
                  </p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={startInAppUpdate}
                      className="w-full py-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest transition-all duration-300 cursor-pointer"
                    >
                      {t('nav.download_update')}
                    </button>
                    <button
                      onClick={() => {
                        setShowUpdateModal(false);
                        setDownloadStatus('idle');
                      }}
                      className="w-full py-3 rounded-2xl text-slate-500 hover:text-slate-400 text-xs font-bold transition-all cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* ===== MOBILE NAV ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-bottom))] bg-black border-t border-[#222] z-50 px-2 flex items-start pt-2 justify-around safe-bottom">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path} className={`flex flex-col items-center gap-1 p-2 transition-all ${isActive ? 'text-white' : 'text-gray-500'}`}>
              <span className={isActive ? 'scale-110' : ''}>{item.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
