import { useState, useEffect } from 'react';
import type { Song } from '../interface/song';
import { API_BASE } from '../config.tsx';
import AddSongPopup from './addSong';
import EditSongPopup from './editSong';
import { FaPlus, FaMusic, FaPlay, FaPause, FaEdit, FaTrash } from "react-icons/fa";
import { usePlayer } from '../context/PlayerContext';
import { SkeletonSongCard } from '../components/Skeleton';

const MySongs = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bài hát "${name}"? Hành động này không thể hoàn tác.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/user/my-songs/${id}`, {
        method: 'DELETE', headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Xóa bài hát thành công');
        fetchMySongs();
      } else setMessage(data.msg || 'Xóa thất bại');
    } catch (err) {
      setMessage(err as string || 'Lỗi kết nối');
    }
  };

  const getStatusBadge = (status: Song['status']) => {
    switch (status) {
      case 'approved': return <span className="bg-green-900/50 text-green-400 px-2 py-1 rounded text-xs font-medium border border-green-800">Đã duyệt</span>;
      case 'pending': return <span className="bg-yellow-900/50 text-yellow-400 px-2 py-1 rounded text-xs font-medium border border-yellow-800">Chờ duyệt</span>;
      case 'rejected': return <span className="bg-red-900/50 text-red-400 px-2 py-1 rounded text-xs font-medium border border-red-800">Bị từ chối</span>;
      default: return <span className="bg-[#222] text-gray-400 px-2 py-1 rounded text-xs font-medium">{status}</span>;
    }
  };

  const filteredSongs = songs.filter(song =>
    song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (song.author && song.author.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredSongs.length / itemsPerPage);
  const paginatedSongs = filteredSongs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
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
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Bài hát của tôi
          </h1>
          <button
            onClick={() => setIsPopupOpen(true)}
            className="bg-white text-black px-6 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            <FaPlus /> Thêm Nhạc
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-medium ${message.includes('thành công') || message.includes('Xóa') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {message}
          </div>
        )}

        {/* Search Bar */}
        {songs.length > 0 && (
          <input
            type="text"
            placeholder="Tìm kiếm trong danh sách bài hát đã tải lên..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full bg-transparent border border-[#333] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white transition-all text-sm font-medium placeholder-gray-500"
          />
        )}

        {songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-500 py-20 border border-[#333] border-dashed rounded-xl">
            <FaMusic size={48} className="mb-4 opacity-20" />
            <p className="text-lg">Bạn chưa tải lên bài hát nào.</p>
            <button
              onClick={() => setIsPopupOpen(true)}
              className="mt-4 text-[var(--accent-blue)] font-bold hover:underline"
            >
              Tải lên ngay!
            </button>
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-500 py-20 border border-[#333] rounded-xl">
            <p className="text-lg">Không tìm thấy bài hát nào phù hợp.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedSongs.map(song => (
                <div key={song.id} className="group border border-[#222] bg-[#0a0a0a] rounded-xl p-5 flex flex-col justify-between hover:border-[#444] transition-colors">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-base text-white truncate">{song.name}</h3>
                      <p className="text-xs text-gray-400 truncate mt-1">{song.author || 'Chưa biết nghệ sĩ'}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {getStatusBadge(song.status)}
                        {song.visibility === 'private' ? (
                          <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs font-medium border border-[#444]">Riêng tư</span>
                        ) : (
                          <span className="bg-blue-900/30 text-blue-400 px-2 py-1 rounded text-xs font-medium border border-blue-800/50">Công khai</span>
                        )}
                      </div>
                      {song.status === 'rejected' && song.rejection_reason && (
                        <p className="text-xs text-red-400 mt-2 px-2 py-1 border border-red-900/50 rounded bg-red-900/10">Lý do: {song.rejection_reason}</p>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => { setSelectedSong(song); setIsEditOpen(true); }}
                        className="text-gray-500 hover:text-white p-2 rounded-md transition-colors border border-transparent hover:border-[#444] bg-[#111]"
                        title="Chỉnh sửa bài hát"
                      >
                        <FaEdit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(song.id, song.name)}
                        className="text-gray-500 hover:text-red-400 p-2 rounded-md transition-colors border border-transparent hover:border-red-900/50 bg-[#111]"
                        title="Xóa bài hát"
                      >
                        <FaTrash size={16} />
                      </button>
                    </div>
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
                      className="w-full bg-[#111] hover:bg-white hover:text-black border border-[#333] text-white px-4 py-2 rounded-lg flex justify-center items-center gap-2 text-xs font-medium transition-colors"
                    >
                        {currentSong?.id === song.id && isPlaying ? (
                          <>
                            <FaPause size={12} /> Tạm dừng
                          </>
                        ) : (
                          <>
                            <FaPlay size={12} /> Nghe thử
                          </>
                        )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-transparent hover:bg-[#222] disabled:opacity-30 disabled:pointer-events-none rounded border border-[#333] transition-all"
                >
                  Trước
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium transition-all ${
                      currentPage === page
                        ? 'bg-white text-black'
                        : 'text-gray-400 hover:text-white bg-transparent hover:bg-[#222] border border-[#333]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-transparent hover:bg-[#222] disabled:opacity-30 disabled:pointer-events-none rounded border border-[#333] transition-all"
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <AddSongPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
      />

      <EditSongPopup
        isOpen={isEditOpen}
        onClose={() => { setIsEditOpen(false); setSelectedSong(null); }}
        song={selectedSong}
        onSuccess={fetchMySongs}
      />
    </div>
  );
};

export default MySongs;
