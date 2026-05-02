import { useState, useEffect, useCallback } from "react";
import "../App.css";
import { API_BASE } from "../config";
import AddToPlaylistModal from "./addToPlaylistModal";
import {
  FaStepBackward,
  FaStepForward,
  FaPlay,
  FaPause,
  FaRandom,
  FaRedo,
  FaEllipsisH,
  FaHeart,
  FaRegHeart
} from "react-icons/fa";
import type Song from "../interface/song";
import { useSearchParams } from "react-router-dom";
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
  const playlistId = searchParams.get("playlist");
  const searchQuery = searchParams.get("q");

  const {
    currentSong,
    isPlaying,
    isRandom,
    isRepeat,
    togglePlay,
    playNext,
    playPrevious,
    toggleRandom,
    toggleRepeat,
    playSong,
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
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success) {
          songsData = data.playlist.songs.map((s: Song) => ({
            ...s,
            status: "approved",
          }));
        } else {
          throw new Error(data.msg || "Không thể tải playlist");
        }
      } else {
        const res = await fetch(`${API_BASE}/api/songs`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        songsData = data.songs.filter(
          (song: Song) => song.status === "approved",
        );
      }

      setSongs(songsData || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch songs:", err);
      setError("Không thể tải danh sách bài hát");
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    loadSongs();
  }, [playlistId, loadSongs]);

  // Handle playing a song from the list
  const handleSelectSong = (song: PlaylistSong) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song, songs);
    }
  };

  // Determine which song to show in the big vinyl card
  const displaySong = currentSong || songs[0];

  const displaySongs = songs.filter(song => {
    if (!searchQuery) return true;
    return song.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           (song.author && song.author.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-8 p-6 lg:p-10 h-full animate-[fade-in_0.5s_ease-out]">
        <div className="w-full lg:w-1/3 flex flex-col items-center shrink-0">
           <div className="w-full max-w-sm aspect-square rounded-3xl bg-slate-800/30 border border-slate-700/50 animate-pulse shadow-2xl" />
           <div className="w-full max-w-sm mt-8 bg-slate-900/40 rounded-3xl p-6 h-[200px] border border-slate-700/50 animate-pulse" />
        </div>
        <div className="flex-1 lg:pl-4 flex flex-col h-full overflow-hidden">
           <div className="flex items-center justify-between mb-6 px-2">
             <div className="h-7 bg-slate-800/50 rounded w-1/3 animate-pulse"></div>
           </div>
           <div className="space-y-2">
             {[1,2,3,4,5,6].map(i => <SkeletonSongItem key={i} />)}
           </div>
        </div>
      </div>
    );
  }

  if (error || displaySongs.length === 0) {
    return (
      <div className="flex justify-center items-center h-full text-slate-400">
        {error || (searchQuery ? "Không tìm thấy bài hát nào" : "Không có bài hát nào")}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-8 p-6 lg:p-10 h-full animate-[fade-in_0.5s_ease-out]">
      {/* ===== Left: Player Card ===== */}
      <div className="w-full lg:w-1/3 flex flex-col items-center shrink-0">
        <div className="relative w-full max-w-sm aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-cyan-900/20 group">
          <img
            src={
              displaySong?.imageUrl ||
              "https://tse3.mm.bing.net/th/id/OIP.lucx6lfHqnK0P6dzh6-t0wAAAA?w=180&h=180&rs=1&pid=ImgDetMain&o=7&rm=3"
            }
            alt={displaySong?.name || "Music"}
            className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying && currentSong?.id === displaySong?.id ? 'scale-105' : 'scale-100'}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
          
          <div className="absolute top-4 w-full flex justify-between px-6 items-center">
            <span className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-xs font-medium text-white/80 border border-white/10 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isPlaying && currentSong?.id === displaySong?.id ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
              {isPlaying && currentSong?.id === displaySong?.id ? 'Đang phát' : 'Đã dừng'}
            </span>
          </div>
        </div>

        {/* Player Controls Container */}
        <div className="w-full max-w-sm mt-8 bg-slate-900/40 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 shadow-xl">
          {/* Info */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white truncate px-2">{displaySong?.name.trim() || "Chưa có bài hát"}</h2>
            <p className="text-slate-400 text-sm mt-1 truncate px-2">{displaySong?.author || "Unknown Artist"}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between px-2 mt-4">
            <button
              onClick={toggleRepeat}
              className={`p-3 rounded-full transition-colors ${isRepeat ? "text-cyan-400 bg-cyan-400/10" : "text-slate-400 hover:text-white"}`}
            >
              <FaRedo size={16} />
            </button>
            <button
              onClick={playPrevious}
              className="p-3 text-slate-400 hover:text-white transition-colors"
            >
              <FaStepBackward size={20} />
            </button>
            <button
              onClick={() => {
                if (!currentSong && displaySong) {
                  playSong(displaySong, songs);
                } else {
                  togglePlay();
                }
              }}
              className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-cyan-400 to-purple-500 text-white shadow-lg shadow-cyan-500/30 hover:scale-105 transition-transform"
            >
              {isPlaying && currentSong?.id === displaySong?.id ? <FaPause size={24} /> : <FaPlay size={24} className="ml-1" />}
            </button>
            <button
              onClick={playNext}
              className="p-3 text-slate-400 hover:text-white transition-colors"
            >
              <FaStepForward size={20} />
            </button>
            <button
              onClick={toggleRandom}
              className={`p-3 rounded-full transition-colors ${isRandom ? "text-cyan-400 bg-cyan-400/10" : "text-slate-400 hover:text-white"}`}
            >
              <FaRandom size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ===== Right: Playlist ===== */}
      <div className="flex-1 lg:pl-4 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-6 px-2">
          <h3 className="text-xl font-bold text-white">Danh sách phát {searchQuery && `- Tìm kiếm: "${searchQuery}"`}</h3>
          <span className="text-sm font-medium text-slate-500">{displaySongs.length} bài</span>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-2 pb-24 lg:pb-0" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
          {displaySongs.map((song, index) => {
            const isActive = song.id === currentSong?.id;
            return (
              <div
                key={song.id}
                onClick={() => handleSelectSong(song)}
                className={`group flex items-center p-3 rounded-2xl cursor-pointer transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20"
                    : "hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <div className="w-8 flex justify-center text-slate-500 font-medium text-sm group-hover:text-cyan-400 transition-colors">
                  {isActive && isPlaying ? (
                    <div className="flex items-end gap-0.5 h-4">
                      <div className="w-1 bg-cyan-400 animate-[bounce_1s_infinite] rounded-full" style={{ height: '60%' }}></div>
                      <div className="w-1 bg-cyan-400 animate-[bounce_1.2s_infinite] rounded-full" style={{ height: '100%' }}></div>
                      <div className="w-1 bg-cyan-400 animate-[bounce_0.8s_infinite] rounded-full" style={{ height: '40%' }}></div>
                    </div>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                <img
                  src={song.imageUrl || "https://tse3.mm.bing.net/th/id/OIP.lucx6lfHqnK0P6dzh6-t0wAAAA?w=180&h=180"}
                  alt={song.name}
                  className="w-12 h-12 rounded-xl object-cover shadow-md mx-3"
                />
                
                <div className="flex-1 min-w-0">
                  <h4 className={`text-base font-semibold truncate ${isActive ? "text-cyan-400" : "text-slate-200 group-hover:text-white"}`}>
                    {song.name}
                  </h4>
                  <p className="text-sm text-slate-500 truncate">{song.author || "Unknown Artist"}</p>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(song.id);
                  }}
                  className="p-3 text-slate-500 hover:text-pink-500 transition-colors"
                >
                  {likedSongIds.has(song.id) ? <FaHeart className="text-pink-500" /> : <FaRegHeart />}
                </button>

                <button
                  className={`p-3 transition-all ${isActive ? "text-cyan-400" : "text-slate-500 opacity-0 group-hover:opacity-100 hover:text-white"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSongId(song.id);
                  }}
                >
                  <FaEllipsisH />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <AddToPlaylistModal
        isOpen={selectedSongId !== null}
        onClose={() => setSelectedSongId(null)}
        songId={selectedSongId!}
        onAdded={() => {
          if (playlistId) loadSongs();
        }}
      />
    </div>
  );
};

export default MusicPlayer;
