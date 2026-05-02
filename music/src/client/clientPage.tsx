import { useState, useEffect } from 'react';
import type Song from '../interface/song';
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
      case 'approved': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Đã duyệt</span>;
      case 'pending': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Chờ duyệt</span>;
      case 'rejected': return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Bị từ chối</span>;
      default: return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between mb-10">
             <div className="h-10 bg-slate-800/50 rounded w-1/3 animate-pulse"></div>
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
          <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
            <FaMusic className="text-purple-400" /> Bài hát của tôi
          </h1>
          <button
            onClick={() => setIsPopupOpen(true)}
            className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/50 px-5 py-2.5 rounded-full flex items-center gap-2 transition-all hover:scale-105 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
          >
            <FaPlus /> Thêm Nhạc
          </button>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium ${message.includes('thành công') || message.includes('Xóa') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {message}
          </div>
        )}

        {songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-500 py-20 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl">
            <FaMusic size={48} className="mb-4 opacity-20" />
            <p className="text-lg">Bạn chưa tải lên bài hát nào.</p>
            <button
              onClick={() => setIsPopupOpen(true)}
              className="mt-4 text-purple-400 hover:underline"
            >
              Tải lên ngay!
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {songs.map(song => (
              <div key={song.id} className="group bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 hover:bg-slate-800/60 transition-all duration-300 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-900/10 flex flex-col justify-between">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-slate-100 truncate group-hover:text-purple-400 transition-colors">{song.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {getStatusBadge(song.status)}
                    </div>
                    {song.status === 'rejected' && song.rejection_reason && (
                      <p className="text-xs text-red-400 mt-2 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">Lý do: {song.rejection_reason}</p>
                    )}
                  </div>

                  {(song.status === 'pending' || song.status === 'rejected') && (
                    <button
                      onClick={() => handleDelete(song.id)}
                      className="text-slate-500 hover:text-red-400 bg-slate-800/50 hover:bg-red-500/10 p-2.5 rounded-xl transition-colors shrink-0"
                      title="Xóa bài hát"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-slate-800/50">
                  <button
                    onClick={() => {
                      if (currentSong?.id === song.id) {
                        togglePlay();
                      } else {
                        playSong(song, songs);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 px-4 py-2.5 rounded-xl transition-all font-medium hover:scale-[1.02]"
                  >
                    {currentSong?.id === song.id && isPlaying ? (
                      <>
                        <FaPause size={14} /> Tạm dừng
                      </>
                    ) : (
                      <>
                        <FaPlay size={14} /> Nghe thử
                      </>
                    )}
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
