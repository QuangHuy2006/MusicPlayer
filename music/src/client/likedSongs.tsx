import { useState, useEffect } from 'react';
import type { Song } from '../interface/song';
import { API_BASE } from '../config';
import { FaHeart, FaPlay, FaPause, FaMusic, FaEllipsisH } from 'react-icons/fa';
import { MdFavorite } from 'react-icons/md';
import { usePlayer } from '../context/PlayerContext';
import { useLike } from '../context/LikeContext';
import { SkeletonSongItem } from '../components/Skeleton';
import AddToPlaylistModal from './addToPlaylistModal';

const LikedSongs = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
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
        console.error(err);
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
      <div className="p-6 md:p-10 space-y-10 animate-fade-in">
        <div className="h-40 w-full bg-white/5 rounded-[40px] animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonSongItem key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-12 animate-fade-in custom-scrollbar">
      {/* Header Section */}
      <section className="relative overflow-hidden rounded-[40px] group">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-600/20 to-rose-600/20 group-hover:scale-110 transition-transform duration-1000"></div>
        <div className="glass-panel-3d border-0 p-8 md:p-12 relative z-10 flex items-center gap-8">
           <div className="w-20 h-20 md:w-28 md:h-28 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-2xl shadow-pink-500/20">
              <MdFavorite size={48} />
           </div>
           <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black text-white">Yêu <span className="text-pink-500">Thích</span></h1>
              <p className="text-slate-400 font-medium">{songs.length} giai điệu bạn đang sở hữu</p>
           </div>
        </div>
      </section>

      {/* List Section */}
      {songs.length === 0 ? (
        <div className="text-center py-32 glass-panel-3d rounded-[40px] border-0">
          <FaHeart className="text-8xl text-pink-500 opacity-10 mx-auto mb-6" />
          <h3 className="text-2xl font-black text-white">Trống trải quá...</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto font-medium">
            Hãy thả tim những bài hát bạn yêu thích để chúng xuất hiện ở đây nhé.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-w-5xl mx-auto">
          <div className="flex items-center px-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
             <div className="w-12">#</div>
             <div className="flex-1">Bài hát</div>
             <div className="hidden md:block w-48">Nghệ sĩ</div>
             <div className="w-20 text-right">Thao tác</div>
          </div>

          {songs.map((song, index) => {
            const isActive = currentSong?.id === song.id;
            return (
              <div
                key={song.id}
                onClick={() => playSong(song, songs)}
                className={`group flex items-center p-4 rounded-[24px] transition-all duration-300 cursor-pointer border ${
                  isActive 
                    ? 'bg-pink-500/10 border-pink-500/20' 
                    : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/5'
                }`}
              >
                <div className="w-12 text-xs font-black text-slate-600 group-hover:text-pink-500 transition-colors">
                  {isActive && isPlaying ? (
                    <div className="flex items-end gap-0.5 h-3 justify-center">
                      <div className="w-1 bg-pink-500 animate-[bounce_0.8s_infinite] rounded-full" style={{height:'60%'}}></div>
                      <div className="w-1 bg-pink-500 animate-[bounce_1.2s_infinite] rounded-full" style={{height:'100%'}}></div>
                      <div className="w-1 bg-pink-500 animate-[bounce_1s_infinite] rounded-full" style={{height:'40%'}}></div>
                    </div>
                  ) : (
                    String(index + 1).padStart(2, '0')
                  )}
                </div>

                <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-lg mx-4 shrink-0">
                  <img
                    src={song.imageUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80'}
                    alt={song.name}
                    className="w-full h-full object-cover"
                  />
                  <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {isActive && isPlaying ? (
                      <FaPause className="text-pink-400 text-xl" />
                    ) : (
                      <FaPlay className="text-pink-400 text-xl ml-1" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className={`font-black truncate transition-colors ${isActive ? 'text-pink-400' : 'text-slate-100 group-hover:text-pink-300'}`}>
                    {song.name}
                  </h4>
                  <p className="md:hidden text-xs text-slate-500 font-bold uppercase tracking-wider mt-1 truncate">{song.author || 'Unknown'}</p>
                </div>

                <div className="hidden md:block w-48 text-sm font-bold text-slate-400 truncate">
                  {song.author || 'Unknown Artist'}
                </div>

                <div className="flex items-center gap-2 w-20 justify-end">
                   <button
                    onClick={(e) => handleUnlike(e, song.id)}
                    className="p-3 text-pink-500 hover:scale-120 transition-transform"
                    title="Bỏ thích"
                   >
                    <FaHeart size={20} />
                   </button>
                   <button
                    onClick={(e) => { e.stopPropagation(); setSelectedSongId(song.id); }}
                    className="p-3 text-slate-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                   >
                    <FaEllipsisH />
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddToPlaylistModal
        isOpen={selectedSongId !== null}
        onClose={() => setSelectedSongId(null)}
        songId={selectedSongId!}
      />
    </div>
  );
};

export default LikedSongs;
