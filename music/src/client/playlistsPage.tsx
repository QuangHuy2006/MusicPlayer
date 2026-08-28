import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaPlus, FaTrash, FaMusic, FaList } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';
import { API_BASE } from '../config.tsx';
import type { Playlist, PlaylistDetail } from '../interface/playlist';
import type { Song } from '../interface/song';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { SkeletonPlaylistCard } from '../components/Skeleton';

const PlaylistsPage = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newPlaylistName, setNewPlaylistName] = useState<string>('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistDetail | null>(null);
  const [availableSongs, setAvailableSongs] = useState<Song[]>([]);
  const [loadingSongs, setLoadingSongs] = useState<boolean>(false);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  const filteredPlaylists = playlists.filter(pl =>
    pl.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredPlaylists.length / itemsPerPage);
  const paginatedPlaylists = filteredPlaylists.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/playlists`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Lỗi tải playlist');
      if (data.success) setPlaylists(data.playlists);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaylistClick = (playlistId: number) => {
    // Điều hướng về trang chủ (dashboard) kèm query param ?playlist=id
    navigate(`/dashboard/?playlist=${playlistId}`);
  };

  const fetchAvailableSongs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/songs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Lỗi tải bài hát');
      if (data.success) setAvailableSongs(data.songs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlaylists();
    fetchAvailableSongs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/playlists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newPlaylistName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Lỗi tạo playlist');
      if (data.success) {
        setPlaylists([data.playlist, ...playlists]);
        setShowCreateModal(false);
        setNewPlaylistName('');
        toast.success('Tạo playlist thành công');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi';
      toast.error('Lỗi tạo playlist: ' + message);
    }
  };

  const handleDeletePlaylist = async (playlistId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa playlist này?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Xóa thất bại');
      setPlaylists(playlists.filter(p => p.id !== playlistId));
      if (selectedPlaylist?.id === playlistId) setSelectedPlaylist(null);
      toast.success('Đã xóa playlist');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi';
      toast.error('Xóa thất bại: ' + message);
    }
  };

  const viewPlaylistDetail = async (playlist: Playlist) => {
    setLoadingSongs(true);
    try {
      const res = await fetch(`${API_BASE}/api/playlists/${playlist.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Không thể tải chi tiết');
      if (data.success) {
        setSelectedPlaylist(data.playlist);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi';
      toast.error('Không thể tải chi tiết playlist: ' + message);
    } finally {
      setLoadingSongs(false);
    }
  };

  const addSongToPlaylist = async (songId: number) => {
    if (!selectedPlaylist) return;
    try {
      const res = await fetch(`${API_BASE}/api/playlists/${selectedPlaylist.id}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ songId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Lỗi thêm bài hát');
      await viewPlaylistDetail(selectedPlaylist);
      toast.success('Đã thêm bài hát vào playlist');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi';
      toast.error(message || 'Lỗi thêm bài hát');
    }
  };

  const removeSongFromPlaylist = async (songId: number) => {
    if (!selectedPlaylist) return;
    try {
      const res = await fetch(`${API_BASE}/api/playlists/${selectedPlaylist.id}/songs/${songId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Xóa thất bại');
      await viewPlaylistDetail(selectedPlaylist);
      toast.success('Đã xóa bài hát khỏi playlist');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi';
      toast.error('Xóa bài hát khỏi playlist thất bại: ' + message);
    }
  };

  const songsNotInPlaylist = availableSongs.filter(
    song => !selectedPlaylist?.songs?.some(s => s.id === song.id)
  );

  if (loading) {
    return (
      <div className="p-6 md:p-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between mb-10">
            <div className="h-10 bg-[#111] shadow-[var(--shadow-3d-in)] rounded w-1/3 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <SkeletonPlaylistCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 animate-[fade-in_0.5s_ease-out]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Playlists của tôi
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-black px-6 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            <FaPlus /> Tạo playlist
          </button>
        </div>

        {/* Search Bar */}
        {playlists.length > 0 && (
          <div className="max-w-7xl mx-auto mb-8">
            <input
              type="text"
              placeholder="Tìm kiếm playlist theo tên..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-transparent border border-[#333] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white transition-all text-sm font-medium placeholder-gray-500"
            />
          </div>
        )}

        {/* Danh sách playlist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedPlaylists.map(pl => (
            <div key={pl.id} className="group border border-[#222] bg-[#0a0a0a] rounded-xl overflow-hidden cursor-pointer hover:border-[#444] transition-colors" onClick={() => handlePlaylistClick(pl.id)}>
              <div className="aspect-video bg-[#111] border-b border-[#222] relative">
                <div className="absolute inset-0 flex items-center justify-center text-gray-600 group-hover:text-white transition-colors">
                  <FaMusic className="text-3xl" />
                </div>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <h3 className="text-base font-medium text-white truncate pr-2">{pl.name}</h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(pl.id); }}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
                <p className="text-gray-400 text-xs mt-1">Tạo: {pl.created_at ? new Date(pl.created_at).toLocaleDateString() : 'N/A'}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); viewPlaylistDetail(pl); }}
                  className="mt-5 w-full bg-[#111] hover:bg-white hover:text-black border border-[#333] text-white text-xs font-medium py-2 rounded-lg flex justify-center transition-colors"
                >
                  Xem chi tiết
                </button>
              </div>
            </div>
          ))}
          {playlists.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center text-gray-500 py-20 border border-[#333] border-dashed rounded-xl">
              <FaList size={48} className="mb-4 opacity-20" />
              <p className="text-lg">Bạn chưa có playlist nào.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-white font-medium hover:underline"
              >
                Tạo playlist đầu tiên!
              </button>
            </div>
          ) : filteredPlaylists.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center text-gray-500 py-20 border border-[#333] rounded-xl">
              <p className="text-lg">Không tìm thấy playlist nào phù hợp.</p>
            </div>
          ) : null}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
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

        {/* Modal tạo playlist */}
        {showCreateModal && createPortal(
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4 animate-[fade-in_0.2s_ease-out]">
            <div className="bg-[#0a0a0a] border border-[#333] p-8 w-full max-w-md rounded-xl animate-[zoom-in_0.3s_ease-out]">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">Tạo Playlist</h2>
                    <p className="text-xs text-gray-400">Đặt tên cho bộ sưu tập của bạn</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-white transition-colors p-2"
                >
                  <MdClose size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 ml-1">Tên playlist mới</label>
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="Ví dụ: Nhạc chill cuối tuần..."
                    className="w-full bg-transparent border border-[#333] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white transition-all text-sm placeholder-gray-500"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-[#222] rounded-lg border border-transparent hover:border-[#333] transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleCreatePlaylist}
                    className="flex-[2] py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Tạo Ngay
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.getElementById('portal')!
        )}

        {/* Modal chi tiết playlist */}
        {selectedPlaylist && createPortal(
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4 animate-[fade-in_0.2s_ease-out]">
            <div className="bg-[#0a0a0a] border border-[#333] rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="bg-[#111] p-6 border-b border-[#222] flex justify-between items-center z-10 shrink-0">
                <h2 className="text-xl font-bold text-white truncate pr-4">{selectedPlaylist.name}</h2>
                <button onClick={() => setSelectedPlaylist(null)} className="text-gray-500 hover:text-white transition-colors p-2 shrink-0 border border-transparent hover:border-[#444] rounded">
                  <MdClose size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Cột trái: Bài hát trong playlist */}
                  <div>
                    <h3 className="text-base font-medium text-white mb-4">
                      Trong playlist
                    </h3>
                    {loadingSongs ? (
                      <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>
                    ) : selectedPlaylist.songs?.length === 0 ? (
                      <div className="text-center py-10 text-gray-500 border border-[#333] rounded-lg">
                        Chưa có bài hát nào.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedPlaylist.songs.map(song => (
                          <div key={song.id} className="group border border-[#222] bg-[#111] p-3 rounded-lg flex justify-between items-center hover:border-[#444]">
                            <div className="min-w-0 pr-4">
                              <p className="text-white text-sm font-medium truncate">{song.name}</p>
                              <p className="text-gray-500 text-xs truncate">{song.author || 'Không rõ'}</p>
                            </div>
                            <button
                              onClick={() => removeSongFromPlaylist(song.id)}
                              className="text-gray-600 hover:text-red-400 transition-colors p-2 shrink-0"
                              title="Xóa khỏi playlist"
                            >
                              <FaTrash size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cột phải: Thư viện bài hát */}
                  <div>
                    <h3 className="text-base font-medium text-white mb-4">
                      Thêm từ thư viện
                    </h3>
                    <div className="space-y-3">
                      {songsNotInPlaylist.length === 0 ? (
                        <p className="text-gray-500 text-center py-10 border border-[#333] rounded-lg">
                          Tất cả bài hát đã được thêm
                        </p>
                      ) : (
                        songsNotInPlaylist.map(song => (
                          <div key={song.id} className="group border border-[#222] bg-[#111] p-3 rounded-lg flex justify-between items-center hover:border-[#444]">
                            <div className="min-w-0 pr-4">
                              <p className="text-white text-sm font-medium truncate">{song.name}</p>
                              <p className="text-gray-500 text-xs truncate">{song.author || 'Không rõ'}</p>
                            </div>
                            <button
                              onClick={() => addSongToPlaylist(song.id)}
                              className="text-gray-500 hover:text-white border border-[#333] bg-black hover:border-white rounded px-3 py-1.5 shrink-0 transition-all"
                              title="Thêm vào playlist"
                            >
                              <FaPlus size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.getElementById('portal')!
        )}
      </div>
    </div>
  );
};

export default PlaylistsPage;