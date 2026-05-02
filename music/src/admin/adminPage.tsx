import { useState, useEffect } from "react";
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

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_banned: boolean;
  created_at: string;
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
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${activeTab === 'overview' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <FaChartBar /> Tổng quan
          </button>
          <button 
            onClick={() => setActiveTab('songs')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${activeTab === 'songs' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <FaMusic /> Duyệt bài hát 
            {stats && stats.pendingSongs > 0 && (
              <span className="bg-white text-purple-600 text-xs px-2 py-0.5 rounded-full ml-1">{stats.pendingSongs}</span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${activeTab === 'users' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <FaUsers /> Người dùng
          </button>
        </div>

        {/* Tab Content: Overview */}
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-[fade-in_0.3s_ease-out]">
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
              <div className="flex items-center gap-4 text-cyan-400 mb-4">
                <FaUsers size={32} />
                <h3 className="text-xl font-semibold text-slate-300">Tổng Users</h3>
              </div>
              <p className="text-4xl font-bold text-white">{stats.totalUsers}</p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
              <div className="flex items-center gap-4 text-emerald-400 mb-4">
                <FaMusic size={32} />
                <h3 className="text-xl font-semibold text-slate-300">Tổng Bài Hát</h3>
              </div>
              <p className="text-4xl font-bold text-white">{stats.totalSongs}</p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
              <div className="flex items-center gap-4 text-purple-400 mb-4">
                <FaChartBar size={32} />
                <h3 className="text-xl font-semibold text-slate-300">Tổng Playlists</h3>
              </div>
              <p className="text-4xl font-bold text-white">{stats.totalPlaylists}</p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
              <div className="flex items-center gap-4 text-pink-400 mb-4">
                <FaCheckCircle size={32} />
                <h3 className="text-xl font-semibold text-slate-300">Chờ Duyệt</h3>
              </div>
              <p className="text-4xl font-bold text-white">{stats.pendingSongs}</p>
            </div>
          </div>
        )}

        {/* Tab Content: Users */}
        {activeTab === 'users' && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden animate-[fade-in_0.3s_ease-out]">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-4 font-medium">ID</th>
                    <th className="p-4 font-medium">Tên</th>
                    <th className="p-4 font-medium">Email</th>
                    <th className="p-4 font-medium">Vai trò</th>
                    <th className="p-4 font-medium">Trạng thái</th>
                    <th className="p-4 font-medium">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4 text-slate-400">{user.id}</td>
                      <td className="p-4 text-white font-medium">{user.name}</td>
                      <td className="p-4 text-slate-300">{user.email || 'N/A'}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${user.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-300'}`}>
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
                            className={`p-2 rounded-xl transition-colors ${user.is_banned ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
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
              <div className="flex flex-col items-center justify-center text-slate-500 py-20 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl">
                <FaCheckCircle size={48} className="mb-4 opacity-20" />
                <p className="text-lg">Không có bài hát nào chờ duyệt.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingSongs.map((song) => (
                  <div key={song.id} className="group bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 hover:bg-slate-800/60 transition-all duration-300 flex flex-col sm:flex-row gap-6">
                    <div className="flex-shrink-0">
                      <img
                        src={song.imageUrl || "https://tse3.mm.bing.net/th/id/OIP.lucx6lfHqnK0P6dzh6-t0wAAAA?w=180&h=180"}
                        alt={song.name}
                        className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-2xl shadow-md group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="font-bold text-xl text-slate-100 truncate group-hover:text-cyan-400 transition-colors mb-1">{song.name}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-4">
                        <span className="flex items-center gap-1"><FaUser size={12} /> {song.author || "Không rõ"}</span>
                        <span className="flex items-center gap-1"><FaIdBadge size={12} /> User ID: {song.user_id}</span>
                      </div>
                      <audio controls src={song.url} className="w-full h-10 [&::-webkit-media-controls-panel]:bg-slate-800 [&::-webkit-media-controls-current-time-display]:text-slate-300 [&::-webkit-media-controls-time-remaining-display]:text-slate-300 rounded-xl" />
                    </div>
                    <div className="flex sm:flex-col gap-3 justify-center sm:min-w-[120px]">
                      <button
                        onClick={() => handleApprove(song.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white px-4 py-3 rounded-xl font-semibold transition-all border border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/25"
                      >
                        <FaCheck /> Duyệt
                      </button>
                      <button
                        onClick={() => handleRejectClick(song.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-4 py-3 rounded-xl font-semibold transition-all border border-red-500/20 hover:shadow-lg hover:shadow-red-500/25"
                      >
                        <FaTimes /> Từ chối
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal nhập lý do từ chối */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fade-in_0.2s_ease-out]">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl scale-100 animate-[zoom-in_0.2s_ease-out]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <FaExclamationTriangle className="text-red-400" /> Lý do từ chối
                </h2>
              </div>
              <textarea
                className="w-full p-4 rounded-xl bg-slate-950 text-white border border-slate-700 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder-slate-600 resize-none"
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
                  className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-400 hover:to-pink-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/25 transition-all active:scale-95"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
