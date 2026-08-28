import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import "../App.css";
import { API_BASE } from "../config.tsx";
import AddToPlaylistModal from "./addToPlaylistModal";
import {
  FaPlay,
  FaHeart,
  FaRegHeart,
  FaEllipsisH,
  FaFire,
  FaPlus,
  FaChevronRight,
  FaMusic,
  FaShareAlt,
  FaCommentAlt,
  FaClock,
  FaPalette,
  FaMicrophoneAlt,
  FaTimes,
  FaCheckCircle,
  FaPaperPlane,
  FaDownload,
  FaSpinner
} from "react-icons/fa";
import { MdOutlineExplore, MdQueueMusic } from "react-icons/md";
import type { Song } from "../interface/song";
import { useSearchParams, useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { useLike } from "../context/LikeContext";
import { useOffline } from "../context/OfflineContext";
import { SkeletonSongItem } from "../components/Skeleton";

interface PlaylistSong extends Song {
  addedAt?: string;
}

const MusicPlayer = () => {
  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [recommendedSongs, setRecommendedSongs] = useState<PlaylistSong[]>([]);
  const [basedOn, setBasedOn] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playlistId = searchParams.get("playlist");
  const searchQuery = searchParams.get("q");
  console.log(error);

  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlay,
    queue,
    sleepTimer,
    setSleepTimer,
    sleepTimeRemaining
  } = usePlayer();
  const { likedSongIds, toggleLike } = useLike();
  const { downloadSong, deleteOfflineSong, isDownloaded, isDownloading } = useOffline();

  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme) {
      document.documentElement.style.setProperty('--accent-gold', savedTheme);
    }
  }, []);

  const changeTheme = (color: string) => {
    document.documentElement.style.setProperty('--accent-gold', color);
    localStorage.setItem('app_theme', color);
    setShowThemeSelector(false);
  };

  const themes = [
    { name: 'Vàng Hoàng Gia', color: '#d4af37' },
    { name: 'Xanh Spotify', color: '#1db954' },
    { name: 'Hồng BlackPink', color: '#ff66c4' },
    { name: 'Xanh Biển', color: '#00d2ff' },
    { name: 'Tím Neon', color: '#b829ea' }
  ];

  const loadSongs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (playlistId) {
        const res = await fetch(`${API_BASE}/api/playlists/${playlistId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          const songsData = data.playlist.songs.map((s: Song) => ({ ...s, status: "approved" }));
          setSongs(songsData || []);
          
          const songIdFromUrl = searchParams.get("song");
          if (songIdFromUrl && songsData.length > 0) {
            const targetSong = songsData.find((s: Song) => s.id.toString() === songIdFromUrl);
            if (targetSong) playSong(targetSong, songsData);
          }
        }
      } else {
        // Fetch all in parallel
        const [songsRes, recRes, trendRes] = await Promise.all([
          fetch(`${API_BASE}/api/songs`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/recommendations`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
          fetch(`${API_BASE}/api/trending`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
        ]);

        const songsDataRaw = await songsRes.json();
        const songsData = (songsDataRaw.songs || []).filter((song: Song) => song.status === "approved");
        setSongs(songsData);

        if (recRes) {
          const recData = await recRes.json();
          if (recData.success) {
            setRecommendedSongs(recData.songs || []);
            setBasedOn(recData.basedOn || []);
          }
        }

        if (trendRes) {
          const trendData = await trendRes.json();
          if (trendData.success) {
            setTrendingSongs(trendData.songs || []);
          }
        }

        const songIdFromUrl = searchParams.get("song");
        if (songIdFromUrl && songsData.length > 0) {
          const targetSong = songsData.find((s: Song) => s.id.toString() === songIdFromUrl);
          if (targetSong) playSong(targetSong, songsData);
        }
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Không thể tải danh sách bài hát");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  const trendingToDisplay = useMemo(() => trendingSongs.length > 0 ? trendingSongs.slice(0, 5) : filteredSongs.slice(0, 5), [trendingSongs, filteredSongs]);
  const newReleases = useMemo(() => [...filteredSongs].reverse().slice(0, 4), [filteredSongs]);

  const handleShare = () => {
    if (!currentSong) return;
    const url = `${window.location.origin}${window.location.pathname}?song=${currentSong.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!currentSong) return;
    try {
      const response = await fetch(currentSong.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${currentSong.name} - ${currentSong.author || 'Unknown'}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download error:', e);
      alert('Không thể tải bài hát này. Có thể do lỗi kết nối hoặc phân quyền.');
    }
  };

  const fetchComments = useCallback(async () => {
    if (!currentSong) return;
    try {
      const res = await fetch(`${API_BASE}/api/songs/${currentSong.id}/comments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) setComments(data.comments);
    } catch (e) { console.error(e); }
  }, [currentSong]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (showComments && currentSong) fetchComments();
  }, [showComments, currentSong, fetchComments]);

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentSong) return;
    try {
      const res = await fetch(`${API_BASE}/api/songs/${currentSong.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ content: commentText })
      });
      const data = await res.json();
      if (data.success) {
        setComments([...comments, data.comment]);
        setCommentText('');
      } else {
        alert(data.msg);
      }
    } catch (e) { console.error(e); }
  };

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
        <div className="glass-panel-3d border-0 p-6 md:p-12 relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
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
                onClick={() => trendingToDisplay[0] && handleSelectSong(trendingToDisplay[0])}
                className="px-8 py-4 bg-[var(--accent-gold)] text-black font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-[var(--accent-gold)]/20 hover:scale-105 transition-transform flex items-center gap-3 cursor-pointer"
              >
                <FaPlay /> Nghe Ngay
              </button>
              <button
                onClick={() => navigate('/playlist')}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 transition-all flex items-center gap-3 cursor-pointer"
              >
                <FaPlus /> Thêm Playlist
              </button>
            </div>
          </div>

          {/* Featured Song Visual */}
          {trendingToDisplay[0] && (
            <div className="w-48 h-48 md:w-80 md:h-80 relative shrink-0">
              <div className="absolute inset-0 bg-[var(--accent-gold)]/20 blur-[100px] rounded-full animate-pulse"></div>
              <div className="relative w-full h-full rounded-[48px] overflow-hidden border-4 border-white/10 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
                <img
                  src={trendingToDisplay[0].imageUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80"}
                  className="w-full h-full object-cover"
                  alt="Featured"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleSelectSong(trendingToDisplay[0])}
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
        <div className="lg:col-span-8 space-y-8 md:space-y-12">

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

          {/* Horizontal Section: Recommendations */}
          {!searchQuery && recommendedSongs.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <FaFire className="text-pink-500" /> Gợi ý cho bạn
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Dựa trên sở thích nghe nhạc {basedOn.length > 0 ? `(${basedOn.join(', ')})` : ''}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {recommendedSongs.slice(0, 4).map(song => (
                  <div
                    key={`rec-${song.id}`}
                    onClick={() => handleSelectSong(song)}
                    className="immersive-card p-4 rounded-[32px] cursor-pointer group"
                  >
                    <div className="relative aspect-square rounded-[24px] overflow-hidden mb-4 border border-pink-500/20">
                      <img src={song.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-pink-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                          <FaPlay size={10} className="ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <h4 className="font-bold text-white truncate text-sm">{song.name}</h4>
                    <p className="text-[10px] text-pink-400 font-bold uppercase tracking-wider mt-1">{song.author || 'Unknown'}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDownloaded(song.id)) {
                            if (confirm(`Xóa "${song.name}" khỏi danh sách offline?`)) {
                              deleteOfflineSong(song.id);
                            }
                          } else if (!isDownloading(song.id)) {
                            downloadSong(song);
                          }
                        }}
                        className={`p-2 rounded-full transition-all ${
                          isDownloaded(song.id)
                            ? 'text-emerald-400 hover:text-red-400'
                            : isDownloading(song.id)
                            ? 'text-sky-400 animate-spin'
                            : 'text-slate-600 hover:text-sky-400 opacity-0 group-hover:opacity-100'
                        }`}
                        title={isDownloaded(song.id) ? 'Đã tải offline (Click để xóa)' : isDownloading(song.id) ? 'Đang tải...' : 'Tải offline'}
                      >
                        {isDownloaded(song.id) ? <FaCheckCircle size={14} /> : isDownloading(song.id) ? <FaSpinner size={14} /> : <FaDownload size={14} />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleLike(song.id); }}
                        className={`p-2 rounded-full transition-colors ${likedSongIds.has(song.id) ? 'text-pink-500' : 'text-slate-600 hover:text-white'}`}
                      >
                        {likedSongIds.has(song.id) ? <FaHeart /> : <FaRegHeart />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedSongId(song.id); }}
                        className="p-2 text-slate-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
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

            {/* Context Actions */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
              <button onClick={handleDownload} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white relative group tooltip-trigger">
                <FaDownload />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Tải nhạc
                </span>
              </button>
              <button onClick={handleShare} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white tooltip-trigger relative group">
                {copied ? <FaCheckCircle className="text-emerald-400" /> : <FaShareAlt />}
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {copied ? 'Đã copy!' : 'Chia sẻ'}
                </span>
              </button>
              <button onClick={() => setShowLyrics(!showLyrics)} className={`p-3 rounded-full text-white relative group ${showLyrics ? 'bg-[var(--accent-gold)] text-black' : 'bg-white/5 hover:bg-white/10'}`}>
                <FaMicrophoneAlt />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Lời bài hát
                </span>
              </button>
              <button onClick={() => setShowComments(!showComments)} className={`p-3 rounded-full text-white relative group ${showComments ? 'bg-[var(--accent-gold)] text-black' : 'bg-white/5 hover:bg-white/10'}`}>
                <FaCommentAlt />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Bình luận
                </span>
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
              <button onClick={() => setShowSleepTimer(!showSleepTimer)} className={`p-3 rounded-full text-white relative group ${sleepTimer ? 'bg-[var(--accent-gold)] text-black' : 'bg-white/5 hover:bg-white/10'}`}>
                <FaClock />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  {sleepTimeRemaining !== null
                    ? `${Math.floor(sleepTimeRemaining / 60)}:${String(sleepTimeRemaining % 60).padStart(2, '0')} còn lại`
                    : 'Hẹn giờ'}
                </span>
              </button>
              <button onClick={() => setShowThemeSelector(!showThemeSelector)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white relative group">
                <FaPalette />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Đổi Theme
                </span>
              </button>
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

      {/* Modals & Overlays */}
      {showThemeSelector && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="glass-panel-3d p-8 rounded-3xl w-full max-w-sm relative">
            <button onClick={() => setShowThemeSelector(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><FaTimes /></button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><FaPalette /> Chọn Theme</h3>
            <div className="space-y-3">
              {themes.map(t => (
                <button key={t.color} onClick={() => changeTheme(t.color)} className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer">
                  <span className="text-white font-medium">{t.name}</span>
                  <div className="w-6 h-6 rounded-full shadow-lg" style={{ backgroundColor: t.color }}></div>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.getElementById('portal')!
      )}

      {showSleepTimer && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="glass-panel-3d p-8 rounded-3xl w-full max-w-sm relative">
            <button onClick={() => setShowSleepTimer(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><FaTimes /></button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><FaClock /> Hẹn giờ tắt nhạc</h3>
            <div className="grid grid-cols-2 gap-3">
              {[15, 30, 45, 60].map(m => (
                <button key={m} onClick={() => { setSleepTimer(m); setShowSleepTimer(false); }} className={`p-4 rounded-xl border cursor-pointer ${sleepTimer === m ? 'bg-[var(--accent-gold)] text-black border-transparent' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}>
                  {m} phút
                </button>
              ))}
              <button onClick={() => { setSleepTimer(null); setShowSleepTimer(false); }} className="col-span-2 p-4 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 font-bold mt-2 cursor-pointer">
                Tắt hẹn giờ
              </button>
            </div>
          </div>
        </div>,
        document.getElementById('portal')!
      )}

      {showComments && currentSong && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="glass-panel-3d p-6 rounded-3xl w-full max-w-lg relative h-[600px] flex flex-col">
            <button onClick={() => setShowComments(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><FaTimes /></button>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><FaCommentAlt /> Bình luận</h3>
            <p className="text-xs text-[var(--accent-gold)] mb-6 truncate">{currentSong.name}</p>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-4 pr-2">
              {comments.length === 0 ? (
                <p className="text-slate-500 text-center text-sm py-10">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white text-sm">{c.users?.name || 'User'}</span>
                      <span className="text-[10px] text-slate-500">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={submitComment} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Nhập bình luận..."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[var(--accent-gold)]/50"
              />
              <button type="submit" disabled={!commentText.trim()} className="bg-[var(--accent-gold)] text-black px-4 rounded-xl disabled:opacity-50 flex items-center justify-center cursor-pointer">
                <FaPaperPlane />
              </button>
            </form>
          </div>
        </div>,
        document.getElementById('portal')!
      )}

      {showLyrics && currentSong && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 animate-[fade-in_0.3s_ease-out]">
          <button onClick={() => setShowLyrics(false)} className="absolute top-8 right-8 text-white hover:text-[var(--accent-gold)] bg-white/10 p-4 rounded-full transition-colors cursor-pointer z-50">
            <FaTimes size={24} />
          </button>
          <div className="max-w-2xl w-full text-center space-y-6 relative z-10">
            <img src={currentSong.imageUrl} className="w-32 h-32 rounded-3xl mx-auto shadow-2xl mb-8 object-cover" alt="" />
            <h2 className="text-4xl font-black text-white">{currentSong.name}</h2>
            <p className="text-xl text-[var(--accent-gold)] font-bold">{currentSong.author}</p>
            <div className="mt-12 h-[45vh] overflow-y-auto custom-scrollbar px-4 text-left md:text-center text-lg md:text-2xl font-bold leading-loose text-slate-300">
              {currentSong.lyrics ? (
                currentSong.lyrics.split('\n').map((line, i) => {
                  const cleanLine = line.replace(/\[\d{2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
                  return (
                    <p key={i} className="mb-4 hover:text-white hover:scale-105 transition-all cursor-default">
                      {cleanLine || '\u00A0'}
                    </p>
                  );
                })
              ) : (
                <p className="text-slate-500 italic mt-20">Bài hát này chưa có lời.</p>
              )}
            </div>
          </div>
        </div>,
        document.getElementById('portal')!
      )}

    </div>
  );
};

export default MusicPlayer;
