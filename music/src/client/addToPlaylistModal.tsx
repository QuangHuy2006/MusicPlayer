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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fade-in_0.2s_ease-out]">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl scale-100 animate-[zoom-in_0.2s_ease-out]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Chọn playlist</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors bg-slate-800 rounded-full p-2">
            <MdClose size={20} />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-10 text-slate-500 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
            Bạn chưa có playlist nào. Hãy tạo playlist trước.
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => addToPlaylist(pl.id)}
                disabled={adding === pl.id}
                className="w-full text-left px-5 py-4 rounded-xl bg-slate-800/50 hover:bg-slate-700/80 text-white transition-all duration-300 disabled:opacity-50 disabled:scale-100 border border-slate-700 hover:border-cyan-500/30 flex items-center justify-between group"
              >
                <span className="font-medium group-hover:text-cyan-400 transition-colors">{adding === pl.id ? "Đang thêm..." : pl.name}</span>
                <span className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
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
