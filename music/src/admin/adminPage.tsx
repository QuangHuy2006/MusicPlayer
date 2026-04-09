import { useState, useEffect } from "react";
import type Song from "../interface/song";
import { API_BASE } from '../config';

const AdminDashboard = () => {
  const [pendingSongs, setPendingSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");


  const fetchPendingSongs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/songs`, {
        headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
      });
      if (!res.ok) throw new Error("Không thể tải dữ liệu");
      const data = await res.json();
      const pending = data.songs.filter((song: Song) => song.status === "pending");
      setPendingSongs(pending);
    } catch (err) {
      console.error(err);
      setMessage("Lỗi tải danh sách");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingSongs();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/songs/${id}/approve`, {
        method: "PUT",
        headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
      });
      const data = await res.json();
      if (data.success) {
        setMessage("Duyệt thành công");
        fetchPendingSongs();
      } else {
        setMessage(data.msg || "Lỗi duyệt");
      }
    } catch (err) {
      console.error(err);
      setMessage("Lỗi kết nối");
    }
  };

  const handleRejectClick = (id: number) => {
    setSelectedSongId(id);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedSongId) return;
    try {
      const res = await fetch(`${API_BASE}/api/songs/${selectedSongId}/reject`, {
        method: "PUT",
        headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
        credentials: "include",
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("Đã từ chối bài hát");
        fetchPendingSongs();
      } else {
        setMessage(data.msg || "Lỗi từ chối");
      }
    } catch (err) {
      console.error(err);
      setMessage("Lỗi kết nối");
    } finally {
      setShowRejectModal(false);
      setSelectedSongId(null);
    }
  };

  if (loading) return <div className="p-4">Đang tải...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Quản lý duyệt bài hát</h1>
      {message && (
        <div className="mb-4 p-2 bg-blue-100 text-blue-800 rounded">
          {message}
        </div>
      )}
      {pendingSongs.length === 0 ? (
        <p>Không có bài hát nào chờ duyệt.</p>
      ) : (
        <div className="space-y-4">
          {pendingSongs.map((song) => (
            <div key={song.id} className="border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{song.name}</h3>
                  <p className="text-sm text-gray-600">
                    Người upload: {song.user_id} (ID)
                  </p>
                  <audio controls src={song.url} className="mt-2 h-10" />
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => handleApprove(song.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Duyệt
                  </button>
                  <button
                    onClick={() => handleRejectClick(song.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nhập lý do từ chối */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Lý do từ chối</h2>
            <textarea
              className="w-full p-2 border rounded mb-4"
              rows={3}
              placeholder="Nhập lý do từ chối bài hát..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Hủy
              </button>
              <button
                onClick={confirmReject}
                className="px-4 py-2 bg-red-500 text-white rounded"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
