import { useState, useEffect } from "react";
import { MdClose } from "react-icons/md";
import { API_BASE } from "../config";
import type { Playlist } from "../interface/playlist";

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  songId: number;
  onAdded?: () => void;
}

const AddToPlaylistModal = ({
  isOpen,
  onClose,
  songId,
  onAdded,
}: AddToPlaylistModalProps) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (isOpen) {
      fetchPlaylists();
    }
  }, [isOpen]);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/playlists`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setPlaylists(data.playlists);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToPlaylist = async (playlistId: number) => {
    setAdding(playlistId);
    try {
      const res = await fetch(`${API_BASE}/api/playlists/${playlistId}/songs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ songId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
      alert("Đã thêm bài hát vào playlist");
      onAdded?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đã xảy ra lỗi";
      alert(message || "Lỗi thêm bài hát");
    } finally {
      setAdding(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-6 w-96 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Chọn playlist</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <MdClose size={24} />
          </button>
        </div>
        {loading ? (
          <div className="text-center py-4 text-gray-400">Đang tải...</div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-4 text-gray-400">
            Bạn chưa có playlist nào. Hãy tạo playlist trước.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => addToPlaylist(pl.id)}
                disabled={adding === pl.id}
                className="w-full text-left px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition disabled:opacity-50"
              >
                {adding === pl.id ? "Đang thêm..." : pl.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddToPlaylistModal;
