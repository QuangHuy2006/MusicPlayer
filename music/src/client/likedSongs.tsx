import { useState, useEffect } from 'react';
import type Song from '../interface/song';
import { API_BASE } from '../config';
import { FaHeart, FaPlay, FaPause } from 'react-icons/fa';
import { usePlayer } from '../context/PlayerContext';
import { useLike } from '../context/LikeContext';
import { SkeletonSongCard } from '../components/Skeleton';

const LikedSongs = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { toggleLike } = useLike();
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchLikedSongs = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/likes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setSongs(data.songs);
        }
      } catch (err) {
        console.error("Failed to fetch liked songs", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLikedSongs();
  }, [token]);

  const handleUnlike = async (e: React.MouseEvent, songId: number) => {
    e.stopPropagation();
    await toggleLike(songId);
    setSongs(songs.filter(s => s.id !== songId));
  };

  if (loading) {
    return (
      <div className="p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          <div className="h-10 bg-[#111] shadow-[var(--shadow-3d-in)] rounded w-1/3 animate-pulse mb-10"></div>
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
          <div className="w-16 h-16 rounded-2xl premium-card flex items-center justify-center shadow-[var(--shadow-3d-out)]">
            <FaHeart className="text-pink-500 text-3xl drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">Bài hát yêu thích</h2>
            <p className="text-pink-400 font-medium mt-1">{songs.length} bài hát</p>
          </div>
        </div>

        {songs.length === 0 ? (
          <div className="text-center py-20 glass-panel-3d">
            <FaHeart className="text-6xl text-pink-500 opacity-50 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]" />
            <h3 className="text-xl font-bold text-white">Chưa có bài hát yêu thích</h3>
            <p className="text-slate-400 mt-2 max-w-md mx-auto">
              Hãy thả tim những bài hát bạn yêu thích để dễ dàng nghe lại nhé.
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
                  className={`group relative flex items-center gap-4 p-4 rounded-[16px] transition-all duration-300 cursor-pointer ${isActive
                    ? 'premium-card border-pink-500/30'
                    : 'premium-card hover:scale-[1.02]'
                    }`}
                >
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-lg group-hover:shadow-[var(--shadow-3d-out)] transition-shadow">
                    <img
                      src={song.imageUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80'}
                      alt={song.name}
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isActive && isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`}
                    />
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {isActive && isPlaying ? (
                        <FaPause className="text-pink-400 text-lg drop-shadow-md" onClick={(e) => { e.stopPropagation(); togglePlay(); }} />
                      ) : (
                        <FaPlay className="text-pink-400 text-lg drop-shadow-md ml-1" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className={`text-base font-bold truncate transition-colors drop-shadow-sm ${isActive ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]' : 'text-slate-200 group-hover:text-pink-300'}`}>
                      {song.name}
                    </h3>
                    <p className="text-sm text-slate-500 truncate mt-0.5 group-hover:text-slate-400 transition-colors">
                      {song.author || 'Unknown Artist'}
                    </p>
                  </div>

                  <button
                    onClick={(e) => handleUnlike(e, song.id)}
                    className="p-3 text-pink-500 hover:scale-110 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)] transition-transform flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    title="Bỏ thích"
                  >
                    <FaHeart size={20} />
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

export default LikedSongs;
