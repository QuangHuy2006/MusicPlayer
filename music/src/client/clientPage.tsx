import { useState, useEffect } from 'react';
import type { Song } from '../interface/song';
import { API_BASE } from '../config';
import AddSongPopup from './addSong';
import { FaPlus, FaMusic, FaPlay, FaPause } from "react-icons/fa";
import { usePlayer } from '../context/PlayerContext';
import { SkeletonSongCard } from '../components/Skeleton';

const MySongs = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();

  const fetchMySongs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/my-songs`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (data.success) setSongs(data.songs);
      else setMessage(data.msg || 'Lỗi tải danh sách');
    } catch (err) {
      setMessage(err as string || 'Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMySongs(); }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Xóa bài hát này?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/user/my-songs/${id}`, {
        method: 'DELETE', headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Xóa thành công');
        fetchMySongs();
      } else setMessage(data.msg || 'Xóa thất bại');
    } catch (err) {
      setMessage(err as string || 'Lỗi kết nối');
    }
  };

  const getStatusBadge = (status: Song['status']) => {
    switch (status) {
      case 'approved': return <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-[8px] text-xs font-semibold shadow-[var(--shadow-3d-in)] border border-emerald-500/20">Đã duyệt</span>;
      case 'pending': return <span className="bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] px-3 py-1 rounded-[8px] text-xs font-semibold shadow-[var(--shadow-3d-in)] border border-[var(--accent-gold)]/20">Chờ duyệt</span>;
      case 'rejected': return <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-[8px] text-xs font-semibold shadow-[var(--shadow-3d-in)] border border-red-500/20">Bị từ chối</span>;
      default: return <span className="bg-[#0a0a0a] shadow-[var(--shadow-3d-in)] text-slate-400 px-3 py-1 rounded-[8px] text-xs font-semibold">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between mb-10">
             <div className="h-10 bg-[#111] shadow-[var(--shadow-3d-in)] rounded w-1/3 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {[1,2,3,4].map(i => <SkeletonSongCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 animate-[fade-in_0.5s_ease-out]">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3 drop-shadow-md">
            <FaMusic className="text-[var(--accent-gold)]" /> Bài hát của tôi
          </h1>
          <button
            onClick={() => setIsPopupOpen(true)}
            className="premium-btn text-[var(--accent-gold)] px-6 py-3 rounded-full flex items-center gap-2 text-sm"
          >
            <span className="relative z-10 flex items-center gap-2">
              <FaPlus /> Thêm Nhạc
            </span>
          </button>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium ${message.includes('thành công') || message.includes('Xóa') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {message}
          </div>
        )}

        {songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-500 py-20 glass-panel-3d border-dashed">
            <FaMusic size={48} className="mb-4 opacity-20 text-[var(--accent-gold)]" />
            <p className="text-lg">Bạn chưa tải lên bài hát nào.</p>
            <button
              onClick={() => setIsPopupOpen(true)}
              className="mt-4 text-[var(--accent-blue)] font-bold hover:underline"
            >
              Tải lên ngay!
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {songs.map(song => (
              <div key={song.id} className="group premium-card p-5 flex flex-col justify-between hover:scale-[1.02]">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-slate-100 truncate group-hover:text-[var(--accent-gold)] transition-colors drop-shadow-sm">{song.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {getStatusBadge(song.status)}
                    </div>
                    {song.status === 'rejected' && song.rejection_reason && (
                      <p className="text-xs text-red-400 mt-2 bg-[#0a0a0a] shadow-[var(--shadow-3d-in)] px-3 py-2 rounded-lg border border-red-500/20">Lý do: {song.rejection_reason}</p>
                    )}
                  </div>

                  {(song.status === 'pending' || song.status === 'rejected') && (
                    <button
                      onClick={() => handleDelete(song.id)}
                      className="text-slate-500 hover:text-red-400 bg-[#0a0a0a] shadow-[var(--shadow-3d-in)] hover:bg-red-500/10 p-2.5 rounded-xl transition-colors shrink-0"
                      title="Xóa bài hát"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-white/5">
                  <button
                    onClick={() => {
                      if (currentSong?.id === song.id) {
                        togglePlay();
                      } else {
                        playSong(song, songs);
                      }
                    }}
                    className="w-full premium-btn text-[var(--accent-gold)] px-4 py-3 rounded-xl flex justify-center text-sm font-medium"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {currentSong?.id === song.id && isPlaying ? (
                        <>
                          <FaPause size={14} /> Tạm dừng
                        </>
                      ) : (
                        <>
                          <FaPlay size={14} /> Nghe thử
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddSongPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
      />
    </div>
  );
};

export default MySongs;
