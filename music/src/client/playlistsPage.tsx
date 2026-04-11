import { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaMusic } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';
import { API_BASE } from '../config';
import type { Playlist, PlaylistDetail } from '../interface/playlist';
import type Song from '../interface/song';
import { useNavigate } from 'react-router-dom';

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
      }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi';
      alert('Lỗi tạo playlist: ' + message);
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
    } catch (err) {
    const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi';
      alert('Xóa thất bại: ' + message);
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
      alert('Không thể tải chi tiết playlist: ' + message);
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
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi';
      alert(message || 'Lỗi thêm bài hát');
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
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi';
      alert('Xóa bài hát khỏi playlist thất bại: ' + message);
    }
  };

  const songsNotInPlaylist = availableSongs.filter(
    song => !selectedPlaylist?.songs?.some(s => s.id === song.id)
  );

  if (loading) return <div className="flex justify-center items-center h-64">Đang tải...</div>;

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-900 via-indigo-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white flex items-center gap-3">
            <FaMusic className="text-pink-400" /> Playlists của tôi
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-pink-500 hover:bg-pink-600 text-white px-5 py-2 rounded-full flex items-center gap-2 transition"
          >
            <FaPlus /> Tạo playlist
          </button>
        </div>

        {/* Danh sách playlist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map(pl => (
            <div key={pl.id} className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/20 transition hover:scale-105" onClick={() => handlePlaylistClick(pl.id)}>
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-semibold text-white truncate">{pl.name}</h3>
                  <button
                    onClick={() => handleDeletePlaylist(pl.id)}
                    className="text-gray-300 hover:text-red-400 transition"
                  >
                    <FaTrash />
                  </button>
                </div>
                <p className="text-gray-300 text-sm mt-1">Tạo: {new Date(pl.created_at).toLocaleDateString()}</p>
                <button
                  onClick={(e) => {viewPlaylistDetail(pl); e.stopPropagation();}}
                  className="mt-4 w-full bg-white/20 hover:bg-white/30 text-white py-2 rounded-lg transition"
                >
                  Xem chi tiết
                </button>
              </div>
            </div>
          ))}
          {playlists.length === 0 && (
            <div className="col-span-full text-center text-white/70 py-12">
              Bạn chưa có playlist nào. Hãy tạo playlist đầu tiên!
            </div>
          )}
        </div>

        {/* Modal tạo playlist */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-2xl p-6 w-96 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Tạo playlist mới</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                  <MdClose size={24} />
                </button>
              </div>
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Tên playlist..."
                className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-pink-500"
                autoFocus
              />
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-300">Hủy</button>
                <button onClick={handleCreatePlaylist} className="px-4 py-2 bg-pink-500 text-white rounded-lg">Tạo</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal chi tiết playlist */}
        {selectedPlaylist && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-700">
              <div className="sticky top-0 bg-gray-900 p-5 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">{selectedPlaylist.name}</h2>
                <button onClick={() => setSelectedPlaylist(null)} className="text-gray-400 hover:text-white">
                  <MdClose size={28} />
                </button>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-white mb-3">Bài hát trong playlist</h3>
                {loadingSongs ? (
                  <div className="text-center py-8 text-gray-400">Đang tải...</div>
                ) : selectedPlaylist.songs?.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">Chưa có bài hát nào. Hãy thêm từ danh sách bên dưới.</div>
                ) : (
                  <div className="space-y-2 mb-8">
                    {selectedPlaylist.songs.map(song => (
                      <div key={song.id} className="bg-gray-800 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium">{song.name}</p>
                          <p className="text-gray-400 text-sm">{song.author || 'Không rõ'}</p>
                        </div>
                        <button
                          onClick={() => removeSongFromPlaylist(song.id)}
                          className="text-red-400 hover:text-red-300 transition"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <h3 className="text-lg font-semibold text-white mb-3">Thêm bài hát từ thư viện</h3>
                <div className="max-h-64 overflow-y-auto space-y-2 border-t border-gray-700 pt-3">
                  {songsNotInPlaylist.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">Tất cả bài hát đã có trong playlist này</p>
                  ) : (
                    songsNotInPlaylist.map(song => (
                      <div key={song.id} className="bg-gray-800 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium">{song.name}</p>
                          <p className="text-gray-400 text-sm">{song.author || 'Không rõ'}</p>
                        </div>
                        <button
                          onClick={() => addSongToPlaylist(song.id)}
                          className="text-green-400 hover:text-green-300 transition"
                        >
                          <FaPlus />
                        </button>
                      </div>
                    ))
                  )}
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