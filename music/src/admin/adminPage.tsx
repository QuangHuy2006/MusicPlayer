import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type Song from "../interface/song";
import { API_BASE } from '../config';
import { FaCheckCircle, FaCheck, FaTimes, FaUser, FaIdBadge, FaExclamationTriangle, FaChartBar, FaMusic, FaUsers, FaBan, FaUnlock } from "react-icons/fa";
import { useToast } from "../context/ToastContext";

interface Stats {
  totalUsers: number;
  totalSongs: number;
  pendingSongs: number;
  totalPlaylists: number;
}

import type User from "../interface/user";

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

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingSongs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/songs`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const pending = data.songs.filter((song: Song) => song.status === "pending");
      setPendingSongs(pending);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchPendingSongs(), fetchUsers()]).finally(() => setLoading(false));
  }, [token]);

  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/songs/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Duyệt thành công");
        fetchPendingSongs();
        fetchStats();
      } else {
        toast.error(data.msg || "Lỗi duyệt");
      }
    } catch (err) {
      toast.error("Lỗi kết nối");
    }
  };

  const handleRejectClick = (id: number) => {
    setSelectedSongId(id);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedSongId) return;
    try {
      const res = await fetch(`${API_BASE}/api/songs/${selectedSongId}/reject`, {
        method: "PUT",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã từ chối bài hát");
        fetchPendingSongs();
        fetchStats();
      } else {
        toast.error(data.msg || "Lỗi từ chối");
      }
    } catch (err) {
      toast.error("Lỗi kết nối");
    } finally {
      setShowRejectModal(false);
      setSelectedSongId(null);
    }
  };

  const toggleBanUser = async (userId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/ban`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.msg);
        setUsers(users.map(u => u.id === userId ? { ...u, is_banned: data.is_banned } : u));
      } else {
        toast.error(data.msg);
      }
    } catch (err) {
      toast.error("Lỗi server");
    }
  };

  if (loading) return <div className="p-4">Đang tải...</div>;

  return (
    <div className="p-6 md:p-10 animate-[fade-in_0.5s_ease-out]">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${activeTab === 'overview' ? 'premium-btn text-[var(--accent-blue)]' : 'premium-card text-slate-400 hover:text-[var(--accent-blue)] hover:scale-105'}`}
          >
            <FaChartBar /> Tổng quan
          </button>
          <button
            onClick={() => setActiveTab('songs')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${activeTab === 'songs' ? 'premium-btn text-[var(--accent-gold)]' : 'premium-card text-slate-400 hover:text-[var(--accent-gold)] hover:scale-105'}`}
          >
            <FaMusic /> Duyệt bài hát
            {stats && stats.pendingSongs > 0 && (
              <span className="bg-[#0a0a0a] shadow-[var(--shadow-3d-in)] text-[var(--accent-gold)] text-xs px-2 py-0.5 rounded-full ml-1">{stats.pendingSongs}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${activeTab === 'users' ? 'premium-btn text-emerald-400' : 'premium-card text-slate-400 hover:text-emerald-400 hover:scale-105'}`}
          >
            <FaUsers /> Người dùng
          </button>
        </div>

        {/* Tab Content: Overview */}
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-[fade-in_0.3s_ease-out]">
            <div className="glass-panel-3d p-6">
              <div className="flex items-center gap-4 text-[var(--accent-blue)] mb-4 drop-shadow-md">
                <FaUsers size={32} />
                <h3 className="text-xl font-semibold text-slate-300">Tổng Users</h3>
              </div>
              <p className="text-4xl font-bold text-white drop-shadow-lg">{stats.totalUsers}</p>
            </div>
            <div className="glass-panel-3d p-6">
              <div className="flex items-center gap-4 text-emerald-400 mb-4 drop-shadow-md">
                <FaMusic size={32} />
                <h3 className="text-xl font-semibold text-slate-300">Tổng Bài Hát</h3>
              </div>
              <p className="text-4xl font-bold text-white drop-shadow-lg">{stats.totalSongs}</p>
            </div>
            <div className="glass-panel-3d p-6">
              <div className="flex items-center gap-4 text-[var(--accent-gold)] mb-4 drop-shadow-md">
                <FaChartBar size={32} />
                <h3 className="text-xl font-semibold text-slate-300">Tổng Playlists</h3>
              </div>
              <p className="text-4xl font-bold text-white drop-shadow-lg">{stats.totalPlaylists}</p>
            </div>
            <div className="glass-panel-3d p-6">
              <div className="flex items-center gap-4 text-pink-400 mb-4 drop-shadow-md">
                <FaCheckCircle size={32} />
                <h3 className="text-xl font-semibold text-slate-300">Chờ Duyệt</h3>
              </div>
              <p className="text-4xl font-bold text-white drop-shadow-lg">{stats.pendingSongs}</p>
            </div>
          </div>
        )}

        {/* Tab Content: Users */}
        {activeTab === 'users' && (
          <div className="glass-panel-3d overflow-hidden animate-[fade-in_0.3s_ease-out]">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#0a0a0a] shadow-[var(--shadow-3d-in)] text-[var(--accent-gold)] border-b border-white/5">
                  <tr>
                    <th className="p-4 font-medium">ID</th>
                    <th className="p-4 font-medium">Tên</th>
                    <th className="p-4 font-medium">Email</th>
                    <th className="p-4 font-medium">Vai trò</th>
                    <th className="p-4 font-medium">Trạng thái</th>
                    <th className="p-4 font-medium">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-slate-400">{user.id}</td>
                      <td className="p-4 text-white font-medium">{user.name}</td>
                      <td className="p-4 text-slate-300">{user.email || 'N/A'}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold shadow-[var(--shadow-3d-in)] border ${user.role === 'ADMIN' ? 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] border-[var(--accent-blue)]/20' : 'bg-[#0a0a0a] text-slate-300 border-white/5'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4">
                        {user.is_banned ? (
                          <span className="flex items-center gap-1 text-red-400 text-sm"><FaBan /> Bị khóa</span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-400 text-sm"><FaCheckCircle /> Hoạt động</span>
                        )}
                      </td>
                      <td className="p-4">
                        {user.id !== 1 && (
                          <button
                            onClick={() => toggleBanUser(user.id)}
                            className={`p-2 rounded-xl transition-colors shadow-[var(--shadow-3d-out)] hover:scale-105 active:scale-95 ${user.is_banned ? 'bg-[#0a0a0a] text-emerald-400 hover:text-emerald-300' : 'bg-[#0a0a0a] text-red-400 hover:text-red-300'}`}
                            title={user.is_banned ? "Mở khóa" : "Khóa tài khoản"}
                          >
                            {user.is_banned ? <FaUnlock /> : <FaBan />}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Songs */}
        {activeTab === 'songs' && (
          <div className="animate-[fade-in_0.3s_ease-out]">
            {pendingSongs.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-500 py-20 glass-panel-3d border-dashed border-[var(--accent-gold)]">
                <FaCheckCircle size={48} className="mb-4 opacity-20 text-[var(--accent-gold)]" />
                <p className="text-lg">Không có bài hát nào chờ duyệt.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingSongs.map((song) => (
                  <div key={song.id} className="group premium-card p-5 hover:scale-[1.01] transition-all duration-300 flex flex-col sm:flex-row gap-6">
                    <div className="flex-shrink-0">
                      <img
                        src={song.imageUrl || "https://tse3.mm.bing.net/th/id/OIP.lucx6lfHqnK0P6dzh6-t0wAAAA?w=180&h=180"}
                        alt={song.name}
                        className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-2xl shadow-[var(--shadow-3d-out)] group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="font-bold text-xl text-slate-100 truncate group-hover:text-[var(--accent-gold)] drop-shadow-md transition-colors mb-1">{song.name}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--accent-blue)] mb-4">
                        <span className="flex items-center gap-1"><FaUser size={12} /> {song.author || "Không rõ"}</span>
                        <span className="flex items-center gap-1"><FaIdBadge size={12} /> User ID: {song.user_id}</span>
                      </div>
                      <audio controls src={song.url} className="w-full h-10 premium-input rounded-xl" />
                    </div>
                    <div className="flex sm:flex-col gap-3 justify-center sm:min-w-[120px]">
                      <button
                        onClick={() => handleApprove(song.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 premium-btn text-emerald-400 font-semibold px-4 py-3"
                      >
                        <span className="relative z-10 flex items-center gap-2"><FaCheck /> Duyệt</span>
                      </button>
                      <button
                        onClick={() => handleRejectClick(song.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 premium-btn text-red-400 font-semibold px-4 py-3"
                      >
                        <span className="relative z-10 flex items-center gap-2"><FaTimes /> Từ chối</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal nhập lý do từ chối */}
        {showRejectModal && createPortal(
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 animate-[fade-in_0.2s_ease-out]">
            <div className="glass-panel-3d p-6 md:p-8 w-full max-w-md scale-100 animate-[zoom-in_0.2s_ease-out]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow-md">
                  <FaExclamationTriangle className="text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]" /> Lý do từ chối
                </h2>
              </div>
              <textarea
                className="w-full p-4 premium-input resize-none"
                rows={3}
                placeholder="Nhập lý do từ chối bài hát..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmReject}
                  className="premium-btn text-red-400 px-5 py-2.5 text-sm font-bold flex justify-center"
                >
                  <span className="relative z-10">Xác nhận từ chối</span>
                </button>
              </div>
            </div>
          </div>,
          document.getElementById('portal')!
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
