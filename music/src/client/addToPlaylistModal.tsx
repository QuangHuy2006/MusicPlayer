import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MdClose } from "react-icons/md";
import { FaListUl, FaPlus, FaMusic } from "react-icons/fa";
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

  const colors = [
    'from-pink-500 to-rose-500',
    'from-violet-500 to-purple-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-indigo-500 to-blue-500'
  ];

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4 animate-[fade-in_0.2s_ease-out]">
      <div className="glass-panel-3d w-full max-w-md rounded-[32px] overflow-hidden border border-white/10 shadow-2xl scale-100 animate-[zoom-in_0.3s_ease-out] relative">
        
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-[var(--accent-gold)]/20 flex items-center justify-center text-[var(--accent-gold)]">
                <FaListUl size={20} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white drop-shadow-md">Thêm vào Playlist</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Chọn một danh sách để lưu bài hát</p>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition-colors bg-black/40 hover:bg-black/60 rounded-full p-2 border border-white/5"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
               <div className="w-12 h-12 border-4 border-[var(--accent-gold)]/20 border-t-[var(--accent-gold)] rounded-full animate-spin"></div>
               <p className="text-sm font-medium text-slate-500 animate-pulse">Đang tải danh sách...</p>
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-12 px-6 bg-black/20 rounded-[24px] border border-dashed border-white/10">
              <FaMusic size={40} className="mx-auto mb-4 opacity-10 text-[var(--accent-gold)]" />
              <p className="text-slate-400 font-medium">Bạn chưa có playlist nào.</p>
              <button 
                onClick={onClose}
                className="mt-4 text-[var(--accent-blue)] text-sm font-bold hover:underline"
              >
                Tạo playlist mới ngay!
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {playlists.map((pl, index) => {
                const colorClass = colors[index % colors.length];
                const isAdding = adding === pl.id;
                
                return (
                  <button
                    key={pl.id}
                    onClick={() => addToPlaylist(pl.id)}
                    disabled={adding !== null}
                    className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[var(--accent-gold)]/30 transition-all duration-300 group flex items-center justify-between disabled:opacity-50"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                        <FaMusic className="text-white text-lg drop-shadow-md" />
                      </div>
                      <div className="min-w-0">
                        <span className="block font-bold text-slate-100 group-hover:text-[var(--accent-gold)] truncate transition-colors">
                          {pl.name}
                        </span>
                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">
                          {isAdding ? 'Đang xử lý...' : 'Nhấn để thêm'}
                        </span>
                      </div>
                    </div>
                    
                    <div className={`w-10 h-10 rounded-full bg-black/40 border border-white/5 flex items-center justify-center transition-all duration-300 ${isAdding ? 'animate-spin' : 'group-hover:bg-[var(--accent-gold)] group-hover:text-black group-hover:scale-110'}`}>
                      {isAdding ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></div>
                      ) : (
                        <FaPlus size={14} className="group-hover:scale-110 transition-transform" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-white/5 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Gợi ý: Anh có thể tạo thêm playlist ở trang quản lý</p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.getElementById('portal')!);
};

export default AddToPlaylistModal;
