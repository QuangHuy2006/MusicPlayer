import { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaMusic, FaList } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';
import { API_BASE } from '../config';
import type { Playlist, PlaylistDetail } from '../interface/playlist';
import type Song from '../interface/song';
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
    fetchPlaylists();
    fetchAvailableSongs();
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
             <div className="h-10 bg-slate-800/50 rounded w-1/3 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {[1,2,3,4].map(i => <SkeletonPlaylistCard key={i} />)}
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
          <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
            <FaMusic className="text-cyan-400" /> Playlists của tôi
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50 px-5 py-2.5 rounded-full flex items-center gap-2 transition-all hover:scale-105 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            <FaPlus /> Tạo playlist
          </button>
        </div>

        {/* Danh sách playlist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {playlists.map(pl => (
            <div key={pl.id} className="group relative bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden border border-slate-800 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-900/20 hover:border-cyan-500/30 cursor-pointer" onClick={() => handlePlaylistClick(pl.id)}>
              <div className="aspect-video bg-gradient-to-br from-cyan-900/40 to-purple-900/40 relative">
                <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-100 transition-opacity">
                  <FaMusic className="text-4xl text-cyan-400" />
                </div>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold text-slate-100 group-hover:text-cyan-400 transition-colors truncate pr-2">{pl.name}</h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(pl.id); }}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
                <p className="text-slate-500 text-xs mt-1 font-medium">Tạo: {new Date(pl.created_at).toLocaleDateString()}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); viewPlaylistDetail(pl); }}
                  className="mt-5 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Xem chi tiết
                </button>
              </div>
            </div>
          ))}
          {playlists.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center text-slate-500 py-20 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl">
              <FaList size={48} className="mb-4 opacity-20" />
              <p className="text-lg">Bạn chưa có playlist nào.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-cyan-400 hover:underline"
              >
                Tạo playlist đầu tiên!
              </button>
            </div>
          )}
        </div>

        {/* Modal tạo playlist */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fade-in_0.2s_ease-out]">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl scale-100 animate-[zoom-in_0.2s_ease-out]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Tạo playlist mới</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white transition-colors bg-slate-800 rounded-full p-2">
                  <MdClose size={20} />
                </button>
              </div>
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Nhập tên playlist..."
                className="w-full px-5 py-3 rounded-xl bg-slate-950 text-white border border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder-slate-600"
                autoFocus
              />
              <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors">Hủy</button>
                <button onClick={handleCreatePlaylist} className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition-all active:scale-95">Tạo ngay</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal chi tiết playlist */}
        {selectedPlaylist && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-[fade-in_0.2s_ease-out]">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="bg-slate-900/80 backdrop-blur-md p-6 border-b border-slate-800 flex justify-between items-center z-10 shrink-0">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 truncate pr-4">{selectedPlaylist.name}</h2>
                <button onClick={() => setSelectedPlaylist(null)} className="text-slate-500 hover:text-white transition-colors bg-slate-800 rounded-full p-2 shrink-0">
                  <MdClose size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Cột trái: Bài hát trong playlist */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Trong playlist
                    </h3>
                    {loadingSongs ? (
                      <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>
                    ) : selectedPlaylist.songs?.length === 0 ? (
                      <div className="text-center py-10 text-slate-500 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
                        Chưa có bài hát nào.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedPlaylist.songs.map(song => (
                          <div key={song.id} className="group bg-slate-950/50 hover:bg-slate-800 rounded-xl p-3 flex justify-between items-center transition-colors border border-slate-800/50">
                            <div className="min-w-0 pr-4">
                              <p className="text-slate-200 font-medium truncate">{song.name}</p>
                              <p className="text-slate-500 text-xs truncate">{song.author || 'Không rõ'}</p>
                            </div>
                            <button
                              onClick={() => removeSongFromPlaylist(song.id)}
                              className="text-slate-600 hover:text-red-400 transition-colors p-2 shrink-0"
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
                    <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400"></span> Thêm từ thư viện
                    </h3>
                    <div className="space-y-2">
                      {songsNotInPlaylist.length === 0 ? (
                        <p className="text-slate-500 text-center py-10 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
                          Tất cả bài hát đã được thêm
                        </p>
                      ) : (
                        songsNotInPlaylist.map(song => (
                          <div key={song.id} className="group bg-slate-950/50 hover:bg-slate-800 rounded-xl p-3 flex justify-between items-center transition-colors border border-slate-800/50">
                            <div className="min-w-0 pr-4">
                              <p className="text-slate-200 font-medium truncate">{song.name}</p>
                              <p className="text-slate-500 text-xs truncate">{song.author || 'Không rõ'}</p>
                            </div>
                            <button
                              onClick={() => addSongToPlaylist(song.id)}
                              className="text-cyan-600 hover:text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-full p-2 shrink-0 transition-all"
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
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistsPage;