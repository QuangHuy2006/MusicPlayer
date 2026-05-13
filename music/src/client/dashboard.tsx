import { useState, useEffect, useCallback, useMemo } from "react";
import "../App.css";
import { API_BASE } from "../config";
import AddToPlaylistModal from "./addToPlaylistModal";
import {
  FaPlay,
  FaHeart,
  FaRegHeart,
  FaEllipsisH,
  FaFire,
  FaPlus,
  FaChevronRight,
  FaMusic
} from "react-icons/fa";
import { MdOutlineExplore, MdQueueMusic } from "react-icons/md";
import type { Song } from "../interface/song";
import { useSearchParams, useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { useLike } from "../context/LikeContext";
import { SkeletonSongItem } from "../components/Skeleton";

interface PlaylistSong extends Song {
  addedAt?: string;
}

const MusicPlayer = () => {
  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playlistId = searchParams.get("playlist");
  const searchQuery = searchParams.get("q");

  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlay,
    queue
  } = usePlayer();
  const { likedSongIds, toggleLike } = useLike();

  const loadSongs = useCallback(async () => {
    setLoading(true);
    try {
      let songsData: Song[] = [];
      if (playlistId) {
        const res = await fetch(`${API_BASE}/api/playlists/${playlistId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.success) {
          songsData = data.playlist.songs.map((s: Song) => ({ ...s, status: "approved" }));
        }
      } else {
        const res = await fetch(`${API_BASE}/api/songs`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        songsData = data.songs.filter((song: Song) => song.status === "approved");
      }
      setSongs(songsData || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Không thể tải danh sách bài hát");
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  const handleSelectSong = (song: PlaylistSong) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song, songs);
    }
  };

  const filteredSongs = useMemo(() => {
    if (!searchQuery) return songs;
    return songs.filter(song =>
      song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (song.author && song.author.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [songs, searchQuery]);

  // Categories for Scientific Layout
  const trendingSongs = useMemo(() => filteredSongs.slice(0, 5), [filteredSongs]);
  const newReleases = useMemo(() => [...filteredSongs].reverse().slice(0, 4), [filteredSongs]);

  if (loading) {
    return (
      <div className="p-6 md:p-10 space-y-10 animate-fade-in">
        <div className="h-64 w-full bg-white/5 rounded-[40px] animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <SkeletonSongItem key={i} />)}
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
            <div className="h-96 bg-white/5 rounded-[32px] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 space-y-12 animate-fade-in custom-scrollbar overflow-x-hidden">

      {/* 1. Immersive Hero / Greeting */}
      <section className="relative overflow-hidden rounded-[40px] group">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 group-hover:scale-110 transition-transform duration-1000"></div>
        <div className="glass-panel-3d border-0 p-8 md:p-12 relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-[var(--accent-gold)] uppercase tracking-widest">
              <FaFire className="animate-bounce" /> Trending Now
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
              Chào ngày mới, <br />
              <span className="text-gradient-aurora">Giai điệu của bạn đây!</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-xl">
              Khám phá những bản nhạc mới nhất và tạo nên playlist mang đậm phong cách cá nhân của riêng bạn.
            </p>
            <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start">
              <button
                onClick={() => trendingSongs[0] && handleSelectSong(trendingSongs[0])}
                className="px-8 py-4 bg-[var(--accent-gold)] text-black font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-[var(--accent-gold)]/20 hover:scale-105 transition-transform flex items-center gap-3"
              >
                <FaPlay /> Nghe Ngay
              </button>
              <button
                onClick={() => navigate('/playlist')}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 transition-all flex items-center gap-3"
              >
                <FaPlus /> Thêm Playlist
              </button>
            </div>
          </div>

          {/* Featured Song Visual */}
          {trendingSongs[0] && (
            <div className="w-64 h-64 md:w-80 md:h-80 relative shrink-0">
              <div className="absolute inset-0 bg-[var(--accent-gold)]/20 blur-[100px] rounded-full animate-pulse"></div>
              <div className="relative w-full h-full rounded-[48px] overflow-hidden border-4 border-white/10 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
                <img
                  src={trendingSongs[0].imageUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80"}
                  className="w-full h-full object-cover"
                  alt="Featured"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleSelectSong(trendingSongs[0])}
                    className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl scale-0 group-hover:scale-100 transition-transform delay-100"
                  >
                    <FaPlay size={24} className="ml-1" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* 2. Main Exploration Section (8 Cols) */}
        <div className="lg:col-span-8 space-y-12">

          {/* Horizontal Section: New Releases */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <MdOutlineExplore className="text-[var(--accent-blue)]" /> Mới cập nhật
              </h2>
              <button className="text-sm font-bold text-slate-500 hover:text-[var(--accent-gold)] transition-colors flex items-center gap-2">
                Tất cả <FaChevronRight size={10} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {newReleases.map(song => (
                <div
                  key={song.id}
                  onClick={() => handleSelectSong(song)}
                  className="immersive-card p-4 rounded-[32px] cursor-pointer group"
                >
                  <div className="relative aspect-square rounded-[24px] overflow-hidden mb-4">
                    <img src={song.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-[var(--accent-gold)] text-black flex items-center justify-center shadow-lg">
                        <FaPlay size={14} className="ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <h4 className="font-bold text-white truncate text-sm">{song.name}</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{song.author || 'Unknown'}</p>
                </div>
              ))}
            </div>
          </section>

          {/* List Section: All Songs / Search Results */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <FaMusic className="text-[var(--accent-gold)]" /> {searchQuery ? 'Kết quả tìm kiếm' : 'Dành cho bạn'}
              </h2>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{filteredSongs.length} bài hát</span>
            </div>
            <div className="space-y-3">
              {filteredSongs.map((song, index) => {
                const isActive = currentSong?.id === song.id;
                return (
                  <div
                    key={song.id}
                    onClick={() => handleSelectSong(song)}
                    className={`group flex items-center p-4 rounded-[24px] transition-all duration-300 cursor-pointer ${isActive ? 'bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/20' : 'hover:bg-white/5 border border-transparent'
                      }`}
                  >
                    <div className="w-10 text-xs font-black text-slate-600 group-hover:text-[var(--accent-gold)]">
                      {isActive && isPlaying ? (
                        <div className="flex items-end gap-0.5 h-3 justify-center">
                          <div className="w-1 bg-[var(--accent-gold)] animate-[bounce_0.8s_infinite] rounded-full" style={{ height: '60%' }}></div>
                          <div className="w-1 bg-[var(--accent-gold)] animate-[bounce_1.2s_infinite] rounded-full" style={{ height: '100%' }}></div>
                          <div className="w-1 bg-[var(--accent-gold)] animate-[bounce_1s_infinite] rounded-full" style={{ height: '40%' }}></div>
                        </div>
                      ) : (
                        String(index + 1).padStart(2, '0')
                      )}
                    </div>
                    <img src={song.imageUrl} className="w-14 h-14 rounded-2xl object-cover mx-4 shadow-lg" alt="" />
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-bold truncate ${isActive ? 'text-[var(--accent-gold)]' : 'text-white'}`}>{song.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{song.author || 'Unknown Artist'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleLike(song.id); }}
                        className={`p-3 rounded-full transition-colors ${likedSongIds.has(song.id) ? 'text-pink-500' : 'text-slate-600 hover:text-white'}`}
                      >
                        {likedSongIds.has(song.id) ? <FaHeart /> : <FaRegHeart />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedSongId(song.id); }}
                        className="p-3 text-slate-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <FaEllipsisH />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* 3. Right Sidebar: Queue & Context (4 Cols) */}
        <div className="lg:col-span-4 space-y-10 h-fit sticky top-28">

          {/* Mini Player / Now Playing */}
          <div className="glass-panel-3d border-0 p-8 rounded-[40px] flex flex-col items-center text-center">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Đang phát</h3>
            <div className={`w-48 h-48 rounded-full border-4 border-[var(--accent-gold)]/20 p-2 ${isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''}`}>
              <img
                src={currentSong?.imageUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80"}
                className="w-full h-full object-cover rounded-full shadow-2xl"
                alt="Now Playing"
              />
            </div>
            <div className="mt-8 space-y-2">
              <h4 className="text-xl font-black text-white truncate max-w-[200px]">{currentSong?.name || 'Chưa chọn bài'}</h4>
              <p className="text-sm font-bold text-[var(--accent-gold)] opacity-80 uppercase tracking-widest">{currentSong?.author || 'Hệ thống'}</p>
            </div>
          </div>

          {/* Quick Queue */}
          <div className="glass-panel-3d border-0 p-8 rounded-[40px] space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <MdQueueMusic size={18} className="text-[var(--accent-blue)]" /> Hàng chờ
              </h3>
              <span className="text-[10px] font-bold text-slate-500">{queue.length} bài</span>
            </div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {queue.slice(0, 10).map((song, i) => (
                <div key={`${song.id}-${i}`} className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                    <img src={song.imageUrl} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-200 truncate group-hover:text-[var(--accent-gold)] transition-colors">{song.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{song.author}</p>
                  </div>
                  {song.id === currentSong?.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-gold)] animate-pulse shadow-[0_0_8px_rgba(212,175,55,1)]"></div>
                  )}
                </div>
              ))}
              {queue.length > 10 && (
                <p className="text-[10px] text-slate-600 text-center font-bold italic">Và {queue.length - 10} bài hát khác...</p>
              )}
              {queue.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-4">Hàng chờ trống</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <AddToPlaylistModal
        isOpen={selectedSongId !== null}
        onClose={() => setSelectedSongId(null)}
        songId={selectedSongId!}
        onAdded={() => { if (playlistId) loadSongs(); }}
      />
    </div>
  );
};

export default MusicPlayer;
