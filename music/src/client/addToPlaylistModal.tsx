import { useState, useEffect } from "react";
import { MdClose } from "react-icons/md";
import { API_BASE } from "../config";
import { useToast } from "../context/ToastContext";
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
  const { toast } = useToast();

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
      toast.success("Đã thêm bài hát vào playlist");
      onAdded?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đã xảy ra lỗi";
      toast.error(message || "Lỗi thêm bài hát");
    } finally {
      setAdding(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-[fade-in_0.2s_ease-out]">
      <div className="glass-panel-3d p-6 md:p-8 w-full max-w-md scale-100 animate-[zoom-in_0.2s_ease-out]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white drop-shadow-md">Chọn playlist</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors bg-[#0a0a0a] shadow-[var(--shadow-3d-in)] rounded-full p-2">
            <MdClose size={20} />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin"></div></div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-10 text-[var(--accent-blue)] bg-[#0a0a0a] shadow-[var(--shadow-3d-in)] rounded-[16px]">
            Bạn chưa có playlist nào. Hãy tạo playlist trước.
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => addToPlaylist(pl.id)}
                disabled={adding === pl.id}
                className="w-full text-left px-5 py-4 premium-card flex items-center justify-between group hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 text-white"
              >
                <span className="font-medium group-hover:text-[var(--accent-gold)] drop-shadow-sm transition-colors">{adding === pl.id ? "Đang thêm..." : pl.name}</span>
                <span className="w-8 h-8 rounded-full bg-[#0a0a0a] shadow-[var(--shadow-3d-in)] flex items-center justify-center text-[var(--accent-gold)] opacity-0 group-hover:opacity-100 transition-opacity">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddToPlaylistModal;
