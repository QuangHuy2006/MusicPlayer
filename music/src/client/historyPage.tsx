import { useState, useEffect } from 'react';
import type Song from '../interface/song';
import { API_BASE } from '../config';
import { FaHistory, FaPlay, FaPause, FaHeart, FaRegHeart } from 'react-icons/fa';
import { usePlayer } from '../context/PlayerContext';
import { useLike } from '../context/LikeContext';
import { SkeletonSongCard } from '../components/Skeleton';

const HistoryPage = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { likedSongIds, toggleLike } = useLike();
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setSongs(data.songs);
        }
      } catch (err) {
        console.error("Failed to fetch history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  if (loading) {
    return (
      <div className="p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          <div className="h-10 bg-slate-800/50 rounded w-1/3 animate-pulse mb-10"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <SkeletonSongCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 animate-[fade-in_0.5s_ease-out]">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <FaHistory className="text-white text-3xl" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Nghe gần đây</h2>
            <p className="text-slate-400 mt-1">{songs.length} bài hát đã nghe</p>
          </div>
        </div>

        {songs.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800/50 backdrop-blur-sm">
            <FaHistory className="text-6xl text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-300">Chưa có lịch sử nghe</h3>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">
              Hãy thưởng thức một số bài hát và chúng sẽ xuất hiện ở đây.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {songs.map((song) => {
              const isActive = currentSong?.id === song.id;

              return (
                <div
                  key={song.id}
                  onClick={() => playSong(song, songs)}
                  className={`group relative flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 cursor-pointer ${isActive
                    ? 'bg-gradient-to-r from-cyan-500/10 to-transparent border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                    : 'bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/50 hover:border-slate-700'
                    }`}
                >
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-lg group-hover:shadow-cyan-500/10 transition-shadow">
                    <img
                      src={song.imageUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80'}
                      alt={song.name}
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isActive && isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`}
                    />
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {isActive && isPlaying ? (
                        <FaPause className="text-white text-lg drop-shadow-md" onClick={(e) => { e.stopPropagation(); togglePlay(); }} />
                      ) : (
                        <FaPlay className="text-white text-lg drop-shadow-md ml-1" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className={`text-base font-bold truncate transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-200 group-hover:text-white'}`}>
                      {song.name}
                    </h3>
                    <p className="text-sm text-slate-500 truncate mt-0.5 group-hover:text-slate-400 transition-colors">
                      {song.author || 'Unknown Artist'}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(song.id);
                    }}
                    className="p-3 text-slate-500 hover:text-pink-500 transition-colors flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  >
                    {likedSongIds.has(song.id) ? <FaHeart className="text-pink-500" /> : <FaRegHeart />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
