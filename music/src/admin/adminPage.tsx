import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Song } from "../interface/song";
import { API_BASE } from '../config';
import {
  FaCheckCircle, FaCheck, FaTimes, FaUser,
  FaExclamationTriangle, FaChartBar, FaMusic, FaUsers,
  FaBan, FaUnlock, FaArrowUp, FaArrowDown,
} from "react-icons/fa";
import { MdDashboard, MdLibraryMusic, MdPeopleAlt } from "react-icons/md";
import { useToast } from "../context/ToastContext";
import type { User } from "../interface/user";

interface Stats {
  totalUsers: number;
  totalSongs: number;
  pendingSongs: number;
  totalPlaylists: number;
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'songs' | 'users'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingSongs, setPendingSongs] = useState<Song[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { toast } = useToast();
  const token = localStorage.getItem('token');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, songsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/songs`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const statsData = await statsRes.json();
      const songsData = await songsRes.json();
      const usersData = await usersRes.json();

      if (statsData.success) setStats(statsData.stats);
      if (songsData.songs) setPendingSongs(songsData.songs.filter((s: Song) => s.status === 'pending'));
      if (usersData.success) setUsers(usersData.users);
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi tải dữ liệu admin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/songs/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã duyệt bài hát!");
        fetchData();
      }
    } catch (err) {
      toast.error("Lỗi khi duyệt bài hát");
    }
  };

  const handleRejectClick = (id: number) => {
    setSelectedSongId(id);
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) return toast.error("Vui lòng nhập lý do");
    try {
      const res = await fetch(`${API_BASE}/api/admin/songs/${selectedSongId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: rejectReason })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã từ chối bài hát");
        setShowRejectModal(false);
        setRejectReason("");
        fetchData();
      }
    } catch (err) {
      toast.error("Lỗi khi từ chối bài hát");
    }
  };

  const handleBanUser = async (id: number, isBanned: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${id}/ban`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${isBanned ? 'Gỡ chặn' : 'Chặn'} người dùng thành công`);
        fetchData();
      }
    } catch (err) {
      toast.error("Lỗi thao tác người dùng");
    }
  };

  if (loading && !stats) {
    return (
      <div className="p-8 space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 glass-panel-3d animate-pulse" />)}
        </div>
        <div className="h-96 glass-panel-3d animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-10 animate-fade-in max-w-[1600px] mx-auto custom-scrollbar">

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white flex items-center gap-4">
            <span className="p-3 bg-[var(--accent-gold)]/10 rounded-2xl text-[var(--accent-gold)]">
              <FaUserShield size={32} />
            </span>
            Trung Tâm <span className="text-gradient-premium">Điều Khiển</span>
          </h1>
          <p className="text-slate-500 font-medium ml-1">Quản lý hệ thống, bài hát và người dùng của Q.Huy Music</p>
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5 shadow-inner">
          {[
            { id: 'overview', icon: <MdDashboard />, label: 'Tổng quan' },
            { id: 'songs', icon: <MdLibraryMusic />, label: 'Duyệt nhạc' },
            { id: 'users', icon: <MdPeopleAlt />, label: 'Người dùng' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id
                ? 'bg-white/10 text-white shadow-lg border border-white/10'
                : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Người dùng', val: stats?.totalUsers || 0, icon: <FaUsers />, color: 'from-blue-500 to-indigo-600', sub: '+12% tháng này', up: true },
              { label: 'Bài hát', val: stats?.totalSongs || 0, icon: <FaMusic />, color: 'from-[var(--accent-gold)] to-orange-500', sub: '+5 bài mới', up: true },
              { label: 'Chờ duyệt', val: stats?.pendingSongs || 0, icon: <FaExclamationTriangle />, color: 'from-rose-500 to-red-600', sub: 'Cần xử lý gấp', up: false },
              { label: 'Playlist', val: stats?.totalPlaylists || 0, icon: <FaChartBar />, color: 'from-emerald-500 to-teal-600', sub: 'Tăng trưởng đều', up: true }
            ].map((item, i) => (
              <div key={i} className="immersive-card p-6 rounded-[32px] group relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${item.color} opacity-5 blur-2xl group-hover:opacity-20 transition-opacity`}></div>
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-4">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{item.label}</p>
                    <h3 className="text-4xl font-black text-white">{item.val}</h3>
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${item.up ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.up ? <FaArrowUp /> : <FaArrowDown />} {item.sub}
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-lg`}>
                    {item.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pending Songs Quick View */}
          <div className="glass-panel-3d border-0 p-8 rounded-[40px] space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="w-2 h-8 bg-rose-500 rounded-full"></span>
                Bài hát chờ duyệt gần đây
              </h2>
              <button onClick={() => setActiveTab('songs')} className="text-sm font-bold text-[var(--accent-blue)] hover:underline">Xem tất cả</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingSongs.slice(0, 4).map(song => (
                <div key={song.id} className="premium-card p-4 flex items-center gap-4">
                  <img src={song.imageUrl} className="w-14 h-14 rounded-xl object-cover" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{song.name}</p>
                    <p className="text-xs text-slate-500">{song.author}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(song.id)} className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center shadow-lg"><FaCheck /></button>
                    <button onClick={() => handleRejectClick(song.id)} className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shadow-lg"><FaTimes /></button>
                  </div>
                </div>
              ))}
              {pendingSongs.length === 0 && <p className="col-span-full text-center py-10 text-slate-500 font-medium">🎉 Tất cả đã được xử lý xong!</p>}
            </div>
          </div>
        </div>
      )}

      {/* Songs Tab */}
      {activeTab === 'songs' && (
        <div className="glass-panel-3d border-0 p-8 rounded-[40px] space-y-8 animate-[fade-in_0.3s_ease-out]">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white">Danh sách bài hát cần duyệt</h2>
            <span className="px-4 py-1 bg-rose-500/10 text-rose-400 rounded-full text-xs font-bold border border-rose-500/20">{pendingSongs.length} bài đang chờ</span>
          </div>
          <div className="space-y-4">
            {pendingSongs.map(song => (
              <div key={song.id} className="premium-card p-6 flex flex-col lg:flex-row gap-6 items-center">
                <div className="relative w-32 h-32 rounded-2xl overflow-hidden shrink-0 shadow-2xl">
                  <img src={song.imageUrl} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 space-y-4 text-center lg:text-left min-w-0">
                  <div>
                    <h3 className="text-2xl font-black text-white truncate">{song.name}</h3>
                    <p className="text-[var(--accent-gold)] font-bold flex items-center justify-center lg:justify-start gap-2">
                      <FaUser size={14} /> {song.author || "Nghệ sĩ ẩn danh"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                    <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-white/5">
                      ID: #{song.id}
                    </span>
                    <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-white/5">
                      Uploader ID: {song.user_id}
                    </span>
                  </div>
                  <audio controls src={song.url} className="w-full h-10 premium-input rounded-xl" />
                </div>
                <div className="flex flex-row lg:flex-col gap-3 w-full lg:w-48">
                  <button onClick={() => handleApprove(song.id)} className="flex-1 py-4 bg-emerald-500/10 text-emerald-500 font-black rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-xl shadow-emerald-500/5 flex items-center justify-center gap-2"><FaCheck /> DUYỆT</button>
                  <button onClick={() => handleRejectClick(song.id)} className="flex-1 py-4 bg-rose-500/10 text-rose-500 font-black rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-xl shadow-rose-500/5 flex items-center justify-center gap-2"><FaTimes /> TỪ CHỐI</button>
                </div>
              </div>
            ))}
            {pendingSongs.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <FaCheckCircle size={64} className="text-emerald-500 opacity-20 mx-auto" />
                <p className="text-slate-500 font-bold text-xl uppercase tracking-widest">Tuyệt vời! Không có bài hát nào chờ duyệt</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="glass-panel-3d border-0 p-8 rounded-[40px] animate-[fade-in_0.3s_ease-out]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-white">Quản lý người dùng</h2>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
              <FaUsers className="text-slate-500" />
              <span className="text-sm font-bold text-white">{users.length} thành viên</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map(user => (
              <div key={user.id} className="immersive-card p-6 rounded-[32px] group">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-white/5 group-hover:border-[var(--accent-gold)]/50 transition-colors">
                    <img src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80'} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white truncate group-hover:text-[var(--accent-gold)] transition-colors">{user.name}</h4>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest ${user.role === 'ADMIN' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-500/20 text-slate-400'}`}>
                      {user.role}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ID</p>
                    <p className="text-sm font-bold text-slate-200">#{user.id}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Username</p>
                    <p className="text-sm font-bold text-slate-200 truncate">{user.username}</p>
                  </div>
                </div>
                <div className="mt-6">
                  {user.role !== 'ADMIN' && (
                    <button
                      onClick={() => handleBanUser(user.id, user.isBanned ?? user.is_banned ?? false)}
                      className={`w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${user.isBanned || user.is_banned
                        ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                        : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white'
                        }`}
                    >
                      {user.isBanned || user.is_banned ? <><FaUnlock /> Gỡ Chặn</> : <><FaBan /> Chặn User</>}
                    </button>
                  )}
                  {user.role === 'ADMIN' && (
                    <div className="w-full py-3 bg-white/5 rounded-2xl text-[10px] text-slate-500 font-black text-center uppercase tracking-widest">
                      Quản Trị Viên Hệ Thống
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showRejectModal && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 animate-[fade-in_0.2s_ease-out]">
          <div className="glass-panel-3d p-8 w-full max-w-md rounded-[40px] scale-100 animate-[zoom-in_0.3s_ease-out]">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center shadow-lg">
                  <FaExclamationTriangle size={20} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Lý Do Từ Chối</h2>
                  <p className="text-xs text-slate-500 font-medium">Giải thích tại sao bài hát này không hợp lệ</p>
                </div>
              </div>
            </div>
            <textarea
              className="w-full p-6 premium-input resize-none h-40"
              placeholder="Nhập lý do chi tiết..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 py-4 text-sm font-bold text-slate-400 hover:text-white transition-colors">Hủy</button>
              <button onClick={confirmReject} className="flex-[2] py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow-xl shadow-rose-500/20 transition-all">Xác Nhận Từ Chối</button>
            </div>
          </div>
        </div>,
        document.getElementById('portal')!
      )}
    </div>
  );
};

import { FaUserShield } from "react-icons/fa";
export default AdminDashboard;
