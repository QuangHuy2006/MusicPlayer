import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config.tsx';
import { useToast } from '../context/ToastContext';
import {
  FaUserCircle, FaEdit, FaSave, FaTimes, FaCamera,
  FaPlay, FaHeart, FaList, FaMusic, FaClock, FaChartLine,
  FaFire, FaCrown, FaTrophy
} from 'react-icons/fa';
import { MdMusicNote } from 'react-icons/md';
import { usePlayer } from '../context/PlayerContext';

interface ProfileData {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  bio: string | null;
  created_at: string;
}

interface StatsData {
  totalPlays: number;
  totalLikes: number;
  totalPlaylists: number;
  totalUploaded: number;
  estimatedMinutes: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  topSongs: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  topAuthors: any[];
}

const ProfilePage = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { playSong } = usePlayer();
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/api/profile`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/stats/me`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const profileData = await profileRes.json();
        const statsData = await statsRes.json();
        if (profileData.success) {
          setProfile(profileData.user);
          setEditName(profileData.user.name || '');
          setEditBio(profileData.user.bio || '');
        }
        if (statsData.success) setStats(statsData.stats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleSaveProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: editName, bio: editBio })
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.user);
        setEditing(false);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success('Cập nhật profile thành công!');
      } else {
        toast.error(data.msg);
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi cập nhật profile');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch(`${API_BASE}/api/profile/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setProfile(prev => prev ? { ...prev, avatar: data.avatar } : prev);
        toast.success('Cập nhật avatar thành công!');
      } else {
        toast.error(data.msg);
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}p`;
    const days = Math.floor(hours / 24);
    return `${days} ngày ${hours % 24}h`;
  };

  if (loading) {
    return (
      <div className="p-6 md:p-10 space-y-10 animate-fade-in">
        <div className="h-80 w-full bg-white/5 rounded-[40px] animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/5 rounded-[24px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 space-y-10 animate-fade-in custom-scrollbar">

      {/* Profile Header */}
      <section className="relative overflow-hidden rounded-[40px] group">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 via-cyan-600/10 to-pink-600/20 group-hover:scale-110 transition-transform duration-1000"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZG90IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJ1cmwoI2RvdCkiLz48L3N2Zz4=')] opacity-50"></div>
        <div className="glass-panel-3d border-0 p-8 md:p-12 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Avatar */}
            <div className="relative group/avatar">
              <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-[var(--accent-gold)]/30 shadow-2xl shadow-[var(--accent-gold)]/10 ${uploading ? 'opacity-50' : ''}`}>
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                    <FaUserCircle className="text-white/50" size={64} />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 w-10 h-10 bg-[var(--accent-gold)] text-black rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform opacity-0 group-hover/avatar:opacity-100"
              >
                <FaCamera size={16} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left space-y-4">
              {editing ? (
                <div className="space-y-4 max-w-md">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xl font-bold focus:outline-none focus:border-[var(--accent-gold)]/50"
                    placeholder="Tên của bạn"
                  />
                  <textarea
                    value={editBio}
                    onChange={e => setEditBio(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[var(--accent-gold)]/50 resize-none h-24"
                    placeholder="Giới thiệu về bản thân..."
                  />
                  <div className="flex gap-3">
                    <button onClick={handleSaveProfile} className="px-6 py-2 bg-[var(--accent-gold)] text-black font-bold rounded-xl flex items-center gap-2 hover:scale-105 transition-transform">
                      <FaSave /> Lưu
                    </button>
                    <button onClick={() => setEditing(false)} className="px-6 py-2 bg-white/5 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-white/10">
                      <FaTimes /> Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 justify-center md:justify-start">
                    <h1 className="text-3xl md:text-5xl font-black text-white">{profile?.name || 'User'}</h1>
                    {profile?.role === 'ADMIN' && (
                      <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full">Admin</span>
                    )}
                    <button onClick={() => setEditing(true)} className="p-2 text-slate-400 hover:text-[var(--accent-gold)] transition-colors">
                      <FaEdit size={18} />
                    </button>
                  </div>
                  <p className="text-slate-400 text-sm max-w-xl">{profile?.bio || 'Chưa có giới thiệu. Nhấn nút chỉnh sửa để thêm bio!'}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 justify-center md:justify-start">
                    <span>{profile?.email}</span>
                    <span>•</span>
                    <span>Tham gia {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('vi-VN') : 'N/A'}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      {stats && (
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: <FaPlay className="text-cyan-400" />, label: 'Lượt nghe', value: stats.totalPlays, gradient: 'from-cyan-500/20 to-blue-500/20' },
            { icon: <FaClock className="text-amber-400" />, label: 'Thời gian nghe', value: formatTime(stats.estimatedMinutes), gradient: 'from-amber-500/20 to-orange-500/20' },
            { icon: <FaHeart className="text-pink-400" />, label: 'Yêu thích', value: stats.totalLikes, gradient: 'from-pink-500/20 to-rose-500/20' },
            { icon: <FaList className="text-emerald-400" />, label: 'Playlist', value: stats.totalPlaylists, gradient: 'from-emerald-500/20 to-teal-500/20' },
            { icon: <FaMusic className="text-violet-400" />, label: 'Đã tải lên', value: stats.totalUploaded, gradient: 'from-violet-500/20 to-purple-500/20' },
            { icon: <FaFire className="text-red-400" />, label: 'Top Artist', value: stats.topAuthors[0]?.name || 'N/A', gradient: 'from-red-500/20 to-orange-500/20' }
          ].map((stat, i) => (
            <div key={i} className={`glass-panel-3d border-0 p-5 rounded-[24px] bg-gradient-to-br ${stat.gradient} hover:scale-105 transition-transform group cursor-default`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-xl group-hover:scale-110 transition-transform">{stat.icon}</div>
              </div>
              <p className="text-2xl font-black text-white truncate">{stat.value}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          ))}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Top Songs */}
        {stats && stats.topSongs.length > 0 && (
          <section className="glass-panel-3d border-0 p-8 rounded-[40px] space-y-6">
            <h3 className="text-xl font-black text-white flex items-center gap-3">
              <FaTrophy className="text-[var(--accent-gold)]" /> Bài hát nghe nhiều nhất
            </h3>
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {stats.topSongs.map((song: any, i: number) => (
                <div
                  key={song.id || i}
                  onClick={() => playSong(song)}
                  className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-all group"
                >
                  <div className={`w-8 text-center font-black ${i === 0 ? 'text-[var(--accent-gold)]' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-700' : 'text-slate-500'}`}>
                    {i < 3 ? <FaCrown size={i === 0 ? 20 : 16} /> : String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                    <img src={song.imageUrl || song.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate group-hover:text-[var(--accent-gold)] transition-colors">{song.name}</p>
                    <p className="text-xs text-slate-500">{song.author || 'Unknown'}</p>
                  </div>
                  <div className="text-xs font-bold text-[var(--accent-gold)] bg-[var(--accent-gold)]/10 px-3 py-1 rounded-full">
                    {song.playCount}×
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top Artists */}
        {stats && stats.topAuthors.length > 0 && (
          <section className="glass-panel-3d border-0 p-8 rounded-[40px] space-y-6">
            <h3 className="text-xl font-black text-white flex items-center gap-3">
              <FaChartLine className="text-pink-500" /> Nghệ sĩ yêu thích
            </h3>
            <div className="space-y-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {stats.topAuthors.map((author: any, i: number) => {
                const percentage = stats.topAuthors.length > 0
                  ? Math.round((author.count / stats.topAuthors[0].count) * 100)
                  : 0;
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/30 to-violet-500/30 flex items-center justify-center text-white">
                          <MdMusicNote size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{author.name}</p>
                          <p className="text-[10px] text-slate-500">{author.count} lượt nghe</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-pink-400">{percentage}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full transition-all duration-1000"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
