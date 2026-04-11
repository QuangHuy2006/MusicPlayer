import { useState, useEffect } from 'react';
import type Song from '../interface/song';
import { API_BASE } from '../config';

const MySongs = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);


  const fetchMySongs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/my-songs`, { headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  } });
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
      const res = await fetch(`${API_BASE}/api/user/my-songs/${id}`, { method: 'DELETE', headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  } });
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
    switch(status) {
      case 'approved': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Đã duyệt</span>;
      case 'pending': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Chờ duyệt</span>;
      case 'rejected': return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Bị từ chối</span>;
      default: return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">{status}</span>;
    }
  };

  if (loading) return <div className="p-4">Đang tải...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
  <h1 className="text-2xl font-bold">Bài hát của tôi</h1>
  <button
    onClick={() => setIsPopupOpen(true)}
    className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-md transition flex items-center gap-2"
  >
    <FaPlus /> Tạo playlist
  </button>
</div>
      {message && <div className="mb-4 p-2 bg-blue-100 text-blue-800 rounded">{message}</div>}
      {songs.length === 0 ? (
        <p>Bạn chưa gửi bài hát nào.</p>
      ) : (
        <div className="space-y-4">
          {songs.map(song => (
            <div key={song.id} className="border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-green-400">{song.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(song.status)}
                    {song.status === 'rejected' && song.rejection_reason && (
                      <span className="text-sm text-red-600">Lý do: {song.rejection_reason}</span>
                    )}
                  </div>
                  <audio controls src={song.url} className="mt-2 h-10" />
                </div>
                {(song.status === 'pending' || song.status === 'rejected') && (
                  <button onClick={() => handleDelete(song.id)} className="bg-red-500 text-white px-3 py-1 rounded">Xóa</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <AddSongPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
      />
    </div>
  );
};

export default MySongs;
