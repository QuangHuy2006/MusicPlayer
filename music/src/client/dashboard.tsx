import { useState, useRef, useEffect, useCallback } from "react";
import "../App.css";
import { API_BASE } from "../config";
import AddToPlaylistModal from "./addToPlaylistModal";
import {
  FaHeadphonesAlt,
  FaStepBackward,
  FaStepForward,
  FaPlay,
  FaPause,
  FaRandom,
  FaRedo,
  FaEllipsisH,
} from "react-icons/fa";
import type Song from "../interface/song";
import { useSearchParams } from "react-router-dom";

interface PlaylistSong extends Song {
  addedAt?: string;
}

const MusicPlayer = () => {
  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRandom, setIsRandom] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
  const [searchParams] = useSearchParams();
  const playlistId = searchParams.get("playlist");
  const [playlistName, setPlaylistName] = useState("");

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLInputElement>(null);

  // Tải danh sách bài hát dựa trên playlistId
  const loadSongs = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${API_BASE}/api/songs`;
      let songsData: Song[] = [];

      if (playlistId) {
        // Gọi API lấy chi tiết playlist
        const res = await fetch(`${API_BASE}/api/playlists/${playlistId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success) {
          setPlaylistName(data.playlist.name);
          songsData = data.playlist.songs.map((s: Song) => ({
            ...s,
            status: "approved", // đảm bảo
          }));
        } else {
          throw new Error(data.msg || "Không thể tải playlist");
        }
      } else {
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        songsData = data.songs.filter(
          (song: Song) => song.status === "approved",
        );
        setPlaylistName("");
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
  }, [refresh, playlistId, loadSongs]);

  const onSongAdded = useCallback(() => {
    setRefresh((prev) => prev + 1);
  }, []);

  useEffect(() => {
    window.addEventListener("songAdded", onSongAdded);
    return () => window.removeEventListener("songAdded", onSongAdded);
  }, [onSongAdded]);

  const currentSong = songs[currentSongIndex];

  // Reset progress khi chuyển bài
  useEffect(() => {
    setProgress(0);
    setDuration(0);
  }, [currentSongIndex]);

  const handleNext = useCallback(() => {
    if (songs.length === 0) return;
    if (isRandom) {
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * songs.length);
      } while (newIndex === currentSongIndex && songs.length > 1);
      setCurrentSongIndex(newIndex);
    } else {
      setCurrentSongIndex((prev) => (prev === songs.length - 1 ? 0 : prev + 1));
    }
  }, [songs, isRandom, currentSongIndex]);

  const handlePrev = useCallback(() => {
    if (songs.length === 0) return;
    if (isRandom) {
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * songs.length);
      } while (newIndex === currentSongIndex && songs.length > 1);
      setCurrentSongIndex(newIndex);
    } else {
      setCurrentSongIndex((prev) => (prev === 0 ? songs.length - 1 : prev - 1));
    }
  }, [songs, isRandom, currentSongIndex]);

  // Phát / tạm dừng
  useEffect(() => {
    if (!currentSong) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      if (audio.readyState >= 2) {
        audio.play().catch((e) => console.error("Play error:", e));
      } else {
        const onCanPlay = () => {
          audio.play().catch((e) => console.error("Play error:", e));
          audio.removeEventListener("canplay", onCanPlay);
        };
        audio.addEventListener("canplay", onCanPlay);
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, currentSong]);

  useEffect(() => {
    if (!currentSong) return;
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      const value = (audio.currentTime / audio.duration) * 100 || 0;
      setProgress(value);
    };
    const setAudioDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play().catch((e) => console.log(e));
      } else {
        handleNext();
      }
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", setAudioDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", setAudioDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentSong, isRepeat, handleNext]);

  const togglePlay = () => setIsPlaying((prev) => !prev);
  const toggleRandom = () => setIsRandom((prev) => !prev);
  const toggleRepeat = () => setIsRepeat((prev) => !prev);

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const newTime = (value / 100) * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setProgress(value);
    }
  };

  const handleSelectSong = (index: number) => {
    if (index === currentSongIndex) return;
    setCurrentSongIndex(index);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-white">
        Đang tải danh sách nhạc...
      </div>
    );
  }

  if (error || songs.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen text-white">
        {error || "Không có bài hát nào"}
      </div>
    );
  }

  return (
    <div className="relative max-w-7xl mx-auto p-4 animate-slideUp">
      {/* Background animation */}
      <div className="top-0 left-0 w-full h-full overflow-hidden fixed inset-0 -z-10">
        <div className="absolute bottom-0 left-0 w-[200%] h-25 bg-linear-to-r from-[#7ed957] to-[#00bcd4] opacity-10 animate-wave animate-wave1" />
        <div className="absolute bottom-2.5 left-0 w-[200%] h-25 bg-linear-to-r from-[#7ed957] to-[#00bcd4] opacity-10 animate-wave animate-wave2" />
        <div className="absolute bottom-5 left-0 w-[200%] h-25 bg-linear-to-r from-[#7ed957] to-[#00bcd4] opacity-8 animate-wave animate-wave3" />
      </div>

      {/* Dashboard - Player iPhone 17 Style */}
      <div className="relative w-full md:w-2/5 lg:w-1/3 bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[3rem] shadow-2xl z-10 p-5 pt-8 pb-6 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(126,217,87,0.4)]">
        {/* Dynamic Island giả lập */}
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-28 h-7 bg-black rounded-full flex items-center justify-between px-3 shadow-md z-20 backdrop-blur-md border border-white/10">
          <span className="text-[10px] font-mono text-white/70">9:41</span>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <div className="w-3 h-1.5 rounded-sm bg-white/50" />
          </div>
        </div>

        {/* Header */}
        <header className="text-center mt-2">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#7ed957] to-[#00bcd4] py-2 px-5 rounded-full mb-3 shadow-[0_4px_15px_rgba(126,217,87,0.4)] animate-pulse-glow">
            <FaHeadphonesAlt className="text-[#1a1a2e] text-sm" />
            <span className="font-semibold text-xs text-[#1a1a2e] tracking-wide">
              {playlistName ? playlistName : "Quang Huy Music"}
            </span>
          </div>
          <h4 className="text-white/50 text-[11px] uppercase tracking-[3px] mb-1">
            Now playing
          </h4>
          <h2 className="text-white text-2xl font-semibold drop-shadow-lg animate-[fadeIn_0.5s_ease]">
            {currentSong.name}
          </h2>
          {currentSong.author && (
            <p className="text-white/60 text-sm mt-1">{currentSong.author}</p>
          )}
        </header>

        {/* CD - với hiệu ứng quay và viền sáng */}
        <div className="flex flex-col items-center my-6 w-full max-w-64 mx-auto relative">
          <div
            className={`w-full pt-[100%] rounded-full bg-cover bg-center mx-auto shadow-[0_20px_40px_rgba(0,0,0,0.6),0_0_0_6px_rgba(126,217,87,0.2),0_0_0_10px_rgba(0,188,212,0.15)] relative transition-all duration-500 hover:scale-105 ${
              isPlaying ? "animate-spin-slow" : ""
            }`}
            style={{
              backgroundImage: `url('${
                currentSong.imageUrl ||
                "https://tse3.mm.bing.net/th/id/OIP.lucx6lfHqnK0P6dzh6-t0wAAAA?w=180&h=180&rs=1&pid=ImgDetMain&o=7&rm=3"
              }')`,
            }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[15%] h-[15%] bg-black/60 rounded-full backdrop-blur-sm border border-white/30" />
          </div>

          {/* Thanh sóng âm thanh */}
          <div
            className={`flex items-center justify-center gap-1 mt-6 h-8 ${isPlaying ? "playing" : ""}`}
          >
            {[...Array(12)].map((_, i) => (
              <span
                key={i}
                className={`w-1 h-3 bg-gradient-to-t from-[#7ed957] to-[#00bcd4] rounded-full transition-all ${
                  isPlaying ? "animate-wave-bar bar" + (i + 1) : "opacity-30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Controls - bo tròn, hiệu ứng lực 3D */}
        <div className="flex items-center justify-around py-4 px-2">
          <button
            onClick={toggleRepeat}
            className={`p-3 text-base rounded-full transition-all duration-200 backdrop-blur-sm ${
              isRepeat
                ? "text-[#7ed957] bg-white/10 shadow-[0_0_8px_#7ed957]"
                : "text-white/60 hover:text-[#7ed957] hover:bg-white/5"
            }`}
          >
            <FaRedo />
          </button>
          <button
            onClick={handlePrev}
            className="p-3 text-base rounded-full text-white/70 hover:text-[#7ed957] hover:bg-white/10 transition-all duration-200"
          >
            <FaStepBackward />
          </button>
          <button
            onClick={togglePlay}
            className="w-14 h-14 rounded-full text-xl text-[#1a1a2e] flex items-center justify-center bg-gradient-to-r from-[#7ed957] to-[#00bcd4] shadow-[0_10px_25px_rgba(126,217,87,0.5)] transition-all duration-200 active:scale-95 hover:shadow-[0_15px_35px_rgba(126,217,87,0.8)]"
          >
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>
          <button
            onClick={handleNext}
            className="p-3 text-base rounded-full text-white/70 hover:text-[#7ed957] hover:bg-white/10 transition-all duration-200"
          >
            <FaStepForward />
          </button>
          <button
            onClick={toggleRandom}
            className={`p-3 text-base rounded-full transition-all duration-200 ${
              isRandom
                ? "text-[#7ed957] bg-white/10 shadow-[0_0_8px_#7ed957]"
                : "text-white/60 hover:text-[#7ed957] hover:bg-white/5"
            }`}
          >
            <FaRandom />
          </button>
        </div>

        {/* Progress Bar - thanh trượt kiểu iOS */}
        <div className="flex items-center gap-2 text-white/70 text-xs px-2 mt-2">
          <span className="font-mono">
            {formatTime((progress / 100) * duration)}
          </span>
          <input
            ref={progressRef}
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleProgressChange}
            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#7ed957] [&::-webkit-slider-thumb]:shadow-[0_0_10px_#7ed957] [&::-webkit-slider-thumb]:transition-all hover:[&::-webkit-slider-thumb]:scale-125"
          />
          <span className="font-mono">{formatTime(duration)}</span>
        </div>

        {/* Hiệu ứng ánh sáng nền (tùy chọn) */}
        <div className="absolute -z-10 top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#7ed957] opacity-20 rounded-full blur-3xl" />

        {/* Playlist */}
        <div
          className="w-full md:w-3/5 lg:w-2/3 p-3 pb-20 md:pb-3 max-h-[calc(100vh-2rem)] md:max-h-screen overflow-y-auto"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {songs.map((song, index) => (
            <div
              key={song.id}
              onClick={() => handleSelectSong(index)}
              className={`flex items-center mb-3 p-3 rounded-xl cursor-pointer transition-all duration-300 bg-linear-to-br from-[rgba(126,217,87,0.05)] to-[rgba(0,188,212,0.05)] backdrop-blur-sm border border-white/10 animate-slideInRight hover:bg-linear-to-br hover:from-[rgba(126,217,87,0.15)] hover:to-[rgba(0,188,212,0.15)] hover:translate-x-2.5 hover:shadow-[0_8px_25px_rgba(126,217,87,0.3)] ${
                index === currentSongIndex
                  ? "bg-linear-to-r! from-[#7ed957]! to-[#00bcd4]! shadow-[0_8px_30px_rgba(126,217,87,0.5)] translate-x-2.5 scale-[1.02]"
                  : ""
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                className="w-12 h-12 rounded-[10px] bg-cover bg-center mx-2 shadow-[0_4px_15px_rgba(0,0,0,0.3)] transition-all group-hover:scale-110 group-hover:rotate-6 shrink-0"
                style={{
                  backgroundImage: `url('${
                    song.imageUrl || "https://via.placeholder.com/50?text=Song"
                  }')`,
                }}
              />
              <div className="flex-1 px-4 min-w-0">
                <div
                  className={`text-base font-semibold mb-1 truncate ${
                    index === currentSongIndex ? "text-[#1a1a2e]" : "text-white"
                  }`}
                >
                  {song.name}
                </div>
                <div
                  className={`text-xs truncate ${
                    index === currentSongIndex
                      ? "text-[#1a1a2e]"
                      : "text-[#a8a8a8]"
                  }`}
                >
                  {song.author || "Unknown Artist"}
                </div>
              </div>
              <button
                className="p-4 text-[#a8a8a8] text-lg transition-all hover:text-[#7ed957] hover:rotate-90"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSongId(song.id);
                }}
              >
                <FaEllipsisH />
              </button>
            </div>
          ))}
        </div>
      </div>

      {currentSong && (
        <audio ref={audioRef} src={currentSong.url} preload="metadata" />
      )}
      <AddToPlaylistModal
        isOpen={selectedSongId !== null}
        onClose={() => setSelectedSongId(null)}
        songId={selectedSongId!}
        onAdded={() => {
          // Nếu đang ở playlist view, có thể cần refresh danh sách bài hát trong playlist
          if (playlistId) {
            loadSongs();
          }
        }}
      />
    </div>
  );
};

export default MusicPlayer;
