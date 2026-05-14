import { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import {
  FaCrown, FaTrophy, FaPlay, FaFire, FaMedal,
  FaUserCircle, FaChartLine
} from 'react-icons/fa';
import { MdLeaderboard } from 'react-icons/md';
import { usePlayer } from '../context/PlayerContext';

const LeaderboardPage = () => {
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'songs' | 'users'>('songs');
  const { playSong, currentSong, isPlaying } = usePlayer();
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setTopSongs(data.topSongs || []);
          setTopUsers(data.topUsers || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [token]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <FaCrown className="text-[var(--accent-gold)] drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]" size={22} />;
    if (rank === 2) return <FaMedal className="text-slate-300 drop-shadow-[0_0_6px_rgba(200,200,200,0.5)]" size={20} />;
    if (rank === 3) return <FaMedal className="text-amber-700 drop-shadow-[0_0_6px_rgba(180,130,50,0.5)]" size={20} />;
    return <span className="text-slate-500 font-black text-sm">{String(rank).padStart(2, '0')}</span>;
  };

  const getRankGradient = (rank: number) => {
    if (rank === 1) return 'from-[var(--accent-gold)]/15 to-amber-500/5 border-[var(--accent-gold)]/20';
    if (rank === 2) return 'from-slate-300/10 to-slate-500/5 border-slate-300/15';
    if (rank === 3) return 'from-amber-700/10 to-amber-800/5 border-amber-700/15';
    return 'from-transparent to-transparent border-transparent';
  };

  if (loading) {
    return (
      <div className="p-6 md:p-10 space-y-10 animate-fade-in">
        <div className="h-48 w-full bg-white/5 rounded-[40px] animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-20 bg-white/5 rounded-[24px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 space-y-10 animate-fade-in custom-scrollbar">

      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-[40px] group">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600/30 via-red-600/10 to-violet-600/20 group-hover:scale-110 transition-transform duration-1000"></div>
        <div className="glass-panel-3d border-0 p-8 md:p-12 relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br from-amber-500 via-red-500 to-violet-600 flex items-center justify-center text-white shadow-2xl shadow-amber-500/20">
            <MdLeaderboard size={56} />
          </div>
          <div className="text-center md:text-left space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-[var(--accent-gold)] uppercase tracking-widest">
              <FaFire className="animate-bounce" /> Live Ranking
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white">
              Bảng Xếp <span className="text-gradient-premium">Hạng</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-xl">
              Khám phá những bài hát và thính giả thịnh hành nhất trên nền tảng.
            </p>
          </div>
        </div>
      </section>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-2xl w-fit mx-auto">
        <button
          onClick={() => setActiveTab('songs')}
          className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'songs' ? 'bg-[var(--accent-gold)] text-black shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <FaTrophy /> Top Bài Hát
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-[var(--accent-gold)] text-black shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <FaChartLine /> Top Thính Giả
        </button>
      </div>

      {/* Top Songs Tab */}
      {activeTab === 'songs' && (
        <section className="max-w-4xl mx-auto space-y-3">
          {/* Top 3 Podium */}
          {topSongs.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-10">
              {[topSongs[1], topSongs[0], topSongs[2]].map((song, i) => {
                const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
                const heights = ['h-40', 'h-52', 'h-36'];
                return (
                  <div
                    key={song.id}
                    onClick={() => playSong(song, topSongs)}
                    className={`flex flex-col items-center justify-end cursor-pointer group ${heights[i]}`}
                  >
                    <div className="relative mb-3">
                      <div className={`${rank === 1 ? 'w-24 h-24 md:w-28 md:h-28' : 'w-16 h-16 md:w-20 md:h-20'} rounded-full overflow-hidden border-4 ${rank === 1 ? 'border-[var(--accent-gold)] shadow-[0_0_30px_rgba(212,175,55,0.4)]' : rank === 2 ? 'border-slate-300 shadow-[0_0_20px_rgba(200,200,200,0.2)]' : 'border-amber-700 shadow-[0_0_20px_rgba(180,130,50,0.2)]'} group-hover:scale-110 transition-transform`}>
                        <img src={song.imageUrl || song.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center bg-black/80 border border-white/10">
                        {getRankIcon(rank)}
                      </div>
                    </div>
                    <p className="text-xs md:text-sm font-bold text-white text-center truncate w-full px-2">{song.name}</p>
                    <p className="text-[10px] text-slate-500 truncate w-full text-center">{song.author}</p>
                    <span className="text-[10px] font-black text-[var(--accent-gold)] bg-[var(--accent-gold)]/10 px-3 py-1 rounded-full mt-2">{song.playCount} plays</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Remaining songs list */}
          <div className="flex items-center px-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
            <div className="w-12">#</div>
            <div className="flex-1">Bài hát</div>
            <div className="hidden md:block w-40">Nghệ sĩ</div>
            <div className="w-24 text-right">Lượt nghe</div>
          </div>

          {topSongs.map((song, index) => {
            const isActive = currentSong?.id === song.id;
            return (
              <div
                key={song.id}
                onClick={() => playSong(song, topSongs)}
                className={`group flex items-center p-4 rounded-[24px] transition-all duration-300 cursor-pointer border bg-gradient-to-r ${getRankGradient(index + 1)} ${isActive ? 'ring-2 ring-[var(--accent-gold)]/30' : 'hover:bg-white/5'}`}
              >
                <div className="w-12 flex items-center justify-center">
                  {isActive && isPlaying ? (
                    <div className="flex items-end gap-0.5 h-3 justify-center">
                      <div className="w-1 bg-[var(--accent-gold)] animate-[bounce_0.8s_infinite] rounded-full" style={{ height: '60%' }}></div>
                      <div className="w-1 bg-[var(--accent-gold)] animate-[bounce_1.2s_infinite] rounded-full" style={{ height: '100%' }}></div>
                      <div className="w-1 bg-[var(--accent-gold)] animate-[bounce_1s_infinite] rounded-full" style={{ height: '40%' }}></div>
                    </div>
                  ) : (
                    getRankIcon(index + 1)
                  )}
                </div>
                <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg mx-4 shrink-0 group-hover:shadow-xl transition-shadow">
                  <img src={song.imageUrl || song.image_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-bold truncate ${isActive ? 'text-[var(--accent-gold)]' : 'text-white group-hover:text-[var(--accent-gold)]'} transition-colors`}>{song.name}</h4>
                  <p className="md:hidden text-xs text-slate-500 truncate">{song.author || 'Unknown'}</p>
                </div>
                <div className="hidden md:block w-40 text-sm font-medium text-slate-400 truncate">{song.author || 'Unknown'}</div>
                <div className="w-24 text-right">
                  <span className="text-sm font-black text-[var(--accent-gold)] bg-[var(--accent-gold)]/10 px-3 py-1.5 rounded-full inline-flex items-center gap-1">
                    <FaPlay size={8} /> {song.playCount}
                  </span>
                </div>
              </div>
            );
          })}

          {topSongs.length === 0 && (
            <div className="text-center py-32 glass-panel-3d rounded-[40px] border-0">
              <FaTrophy className="text-8xl text-[var(--accent-gold)] opacity-10 mx-auto mb-6" />
              <h3 className="text-2xl font-black text-white">Chưa có dữ liệu</h3>
              <p className="text-slate-500 mt-2">Hãy nghe nhạc để bảng xếp hạng hoạt động!</p>
            </div>
          )}
        </section>
      )}

      {/* Top Users Tab */}
      {activeTab === 'users' && (
        <section className="max-w-3xl mx-auto space-y-4">
          {topUsers.map((user, index) => {
            const maxCount = topUsers[0]?.playCount || 1;
            const percentage = Math.round((user.playCount / maxCount) * 100);
            return (
              <div key={user.id || index} className={`group p-5 rounded-[24px] transition-all duration-300 border bg-gradient-to-r ${getRankGradient(index + 1)} hover:bg-white/5`}>
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-10 flex items-center justify-center">
                    {getRankIcon(index + 1)}
                  </div>
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                        <FaUserCircle className="text-white/50" size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white truncate">{user.name || 'User'}</h4>
                    <p className="text-xs text-slate-500">{user.playCount} lượt nghe</p>
                  </div>
                  <span className="text-sm font-bold text-[var(--accent-gold)]">{percentage}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden ml-14">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${index === 0 ? 'bg-gradient-to-r from-[var(--accent-gold)] to-amber-500' : index === 1 ? 'bg-gradient-to-r from-slate-300 to-slate-400' : index === 2 ? 'bg-gradient-to-r from-amber-700 to-amber-600' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}

          {topUsers.length === 0 && (
            <div className="text-center py-32 glass-panel-3d rounded-[40px] border-0">
              <FaChartLine className="text-8xl text-pink-500 opacity-10 mx-auto mb-6" />
              <h3 className="text-2xl font-black text-white">Chưa có dữ liệu</h3>
              <p className="text-slate-500 mt-2">Bảng xếp hạng sẽ cập nhật khi có người nghe nhạc!</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default LeaderboardPage;
