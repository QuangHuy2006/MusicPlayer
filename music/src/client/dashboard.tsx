import { useState, useRef, useEffect, useCallback } from "react";
import useSound from "use-sound";
import tingSound from "../assets/notifications/iphone-sent-message.mp3";
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
  FaBell,
  FaHeadphones,
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
  const [isThisSongPlayed, setIsThisSongPlayed] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true); // 🔔 Bật/tắt thông báo
  const playlistId = searchParams.get("playlist");
  const [playTing] = useSound(tingSound, { volume: 1 });
  const currentSong = songs[currentSongIndex];

  // Toast state
  let toastTimeout: ReturnType<typeof setTimeout>;
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    exiting: boolean;
  }>({
    visible: false,
    message: "",
    exiting: false,
  });

  // Auto-next timer
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLInputElement>(null);

  // ========== LOAD SONGS ==========
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
  }, [refresh, playlistId, loadSongs]);

  const onSongAdded = useCallback(() => {
    setRefresh((prev) => prev + 1);
  }, []);

  useEffect(() => {
    window.addEventListener("songAdded", onSongAdded);
    return () => window.removeEventListener("songAdded", onSongAdded);
  }, [onSongAdded]);

  // ========== TOAST UTILS ==========
  const showToast = (msg: string, durationMs = 3000) => {
    if (!notificationsEnabled) return; // 🔔 Chỉ hiển thị nếu bật thông báo
    if (toastTimeout) clearTimeout(toastTimeout);
    setToast({ visible: true, message: msg, exiting: false });
    toastTimeout = setTimeout(() => {
      setToast((prev) => ({ ...prev, exiting: true }));
    }, durationMs);
    playTing();
  };

  const handleAnimationEnd = () => {
    if (toast.exiting) {
      setToast({ visible: false, message: "", exiting: false });
    }
  };

  // ========== AUTO-NEXT TIMER CONTROL ==========
  const clearAutoNextTimer = () => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
  };

  // Hàm chuyển bài thực tế (không kèm toast)
  const jumpToSong = (newIndex: number, autoPlay = true) => {
    if (newIndex === currentSongIndex) return;
    setCurrentSongIndex(newIndex);
    if (autoPlay) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  // Xử lý khi bài hát kết thúc
  const handleEnded = useCallback(() => {
    if (isRepeat) {
      // Lặp lại bài hiện tại: tua về 0 và phát tiếp
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((e) => console.error(e));
      }
      return;
    }

    // Tính bài tiếp theo
    let nextIndex: number;
    if (isRandom) {
      do {
        nextIndex = Math.floor(Math.random() * songs.length);
      } while (nextIndex === currentSongIndex && songs.length > 1);
    } else {
      nextIndex =
        currentSongIndex === songs.length - 1 ? 0 : currentSongIndex + 1;
    }

    const nextSong = songs[nextIndex];
    if (!nextSong) return;

    // Hủy timer cũ
    clearAutoNextTimer();

    if (notificationsEnabled) {
      // 🔔 Bật thông báo: đợi 800ms -> hiện toast -> đợi 3300ms -> chuyển bài
      setTimeout(() => {
        showToast(`Tiếp theo: ${nextSong.name}`, 3300);
      }, 800);
      autoNextTimerRef.current = setTimeout(() => {
        jumpToSong(nextIndex, true);
        autoNextTimerRef.current = null;
      }, 3300);
    } else {
      // 🔕 Tắt thông báo: chuyển bài ngay lập tức
      jumpToSong(nextIndex, true);
    }
  }, [isRepeat, isRandom, songs, currentSongIndex, notificationsEnabled]);

  // ========== HANDLE NEXT/PREV ==========
  const handleNext = useCallback(() => {
    clearAutoNextTimer();
    if (songs.length === 0) return;
    let newIndex: number;
    if (isRandom) {
      do {
        newIndex = Math.floor(Math.random() * songs.length);
      } while (newIndex === currentSongIndex && songs.length > 1);
    } else {
      newIndex =
        currentSongIndex === songs.length - 1 ? 0 : currentSongIndex + 1;
    }
    jumpToSong(newIndex, true);
  }, [songs, isRandom, currentSongIndex]);

  const handlePrev = useCallback(() => {
    clearAutoNextTimer();
    if (songs.length === 0) return;
    let newIndex: number;
    if (isRandom) {
      do {
        newIndex = Math.floor(Math.random() * songs.length);
      } while (newIndex === currentSongIndex && songs.length > 1);
    } else {
      newIndex =
        currentSongIndex === 0 ? songs.length - 1 : currentSongIndex - 1;
    }
    jumpToSong(newIndex, true);
  }, [songs, isRandom, currentSongIndex]);

  // ========== TOGGLE RANDOM/REPEAT ==========
  const toggleRandom = () => {
    clearAutoNextTimer();
    setIsRandom((prev) => !prev);
  };
  const toggleRepeat = () => {
    clearAutoNextTimer();
    setIsRepeat((prev) => !prev);
  };

  // ========== TOGGLE NOTIFICATIONS ==========
  const toggleNotifications = () => {
    setNotificationsEnabled((prev) => !prev);
  };

  // ========== CHỌN BÀI TỪ PLAYLIST ==========
  const handleSelectSong = (index: number) => {
    if (index === currentSongIndex) return;
    clearAutoNextTimer();
    setCurrentSongIndex(index);
    setIsPlaying(false);
  };

  // ========== PROGRESS & AUDIO SYNC ==========
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearAutoNextTimer();
    const value = parseFloat(e.target.value);
    const newTime = (value / 100) * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setProgress(value);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // ========== EFFECTS ==========
  useEffect(() => {
    setProgress(0);
    setDuration(0);
  }, [currentSongIndex]);

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
    setIsThisSongPlayed(false);
  }, [currentSongIndex]);

  useEffect(() => {
    if (!currentSong) return;
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      const value = (audio.currentTime / audio.duration) * 100 || 0;
      setProgress(value);
    };
    const setAudioDuration = () => setDuration(audio.duration);

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", setAudioDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", setAudioDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentSong, handleEnded]);

  useEffect(() => {
    return () => {
      clearAutoNextTimer();
    };
  }, []);

  // ========== TOGGLE PLAY ==========
  const togglePlay = () => {
    if (!isPlaying) {
      if (!isThisSongPlayed) {
        if (notificationsEnabled) {
          showToast(`${currentSong.name}`);
          setTimeout(() => setIsThisSongPlayed(true), 2000);
          setTimeout(() => setIsPlaying(true), 3300);
        }else{
          setIsPlaying(true);
        }
      } else {
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(false);
    }
  };

  // ========== RENDER ==========
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

      {/* Layout 2 cột */}
      <div className="flex flex-col md:flex-row gap-5 md:gap-8">
        {/* Dashboard - Player iPhone 17 Style */}
        <div className="relative w-fit lg:w-1/3 bg-black/40 backdrop-blur-2xl border border-white/20 rounded-4xl shadow-2xl z-10 p-5 pt-8 pb-6 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(126,217,87,0.4)] overflow-hidden">
          {toast.visible && (
            <div
              onAnimationEnd={handleAnimationEnd}
              className={`absolute top-0 left-1/2 transform bg-white/80 backdrop-blur-md rounded-b-3xl px-4 py-2 shadow-lg z-50 w-full h-[20%] ${
                toast.exiting ? "animate-slideUpForMsg" : "animate-slideDown"
              }`}
            >
              <div>
                <span className="text-ml font-medium whitespace-nowrap flex items-center gap-2">
                  <FaHeadphones /> Quang Huy Music
                </span>
              </div>
              <div className="text-ml font-medium whitespace-nowrap mt-3">
                1 Thông báo mới !
              </div>
              <p className="text-ml font-medium text-center whitespace-nowrap mt-3 shimmer-text">
                Đang phát: {toast.message}
              </p>
              <div className="flex justify-between mt-5">
                <button>Chi tiết</button>
                <button>Đóng</button>
              </div>
            </div>
          )}
          <div className="absolute top-2.5 left-1/2 transform -translate-x-1/2 h-7 flex items-center justify-between px-7 z-20 w-full mt-2">
            {/* Nội dung bên trái: thời gian + nút setting + bell */}
            <div className="flex items-center gap-1">
              <span className="text-[15px] font-semibold text-white/90 tabular-nums">
                {new Date().toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </span>
              {/* Nút Setting - bật/tắt thông báo */}
              <button
                onClick={toggleNotifications}
                className="focus:outline-none hover:rotate-90 transition-transform duration-300"
                title={notificationsEnabled ? "Tắt thông báo" : "Bật thông báo"}
              >
                <svg
                  className={`w-4 h-4 ${notificationsEnabled ? "text-white/80" : "text-white/30"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
              <div className="text-white/70">
                {isThisSongPlayed ? <FaBell size={14} /> : ""}
              </div>
            </div>
            {/* Dynamic Island */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-45 h-9 bg-black rounded-full flex items-center justify-between px-3 shadow-md z-20 backdrop-blur-md border border-white/10">
              <span className="w-3.5 h-3.5 rounded-full overflow-hidden bg-white/10">
                {isPlaying ? (
                  <img
                    src={
                      currentSong.imageUrl ||
                      "https://tse3.mm.bing.net/th/id/OIP.lucx6lfHqnK0P6dzh6-t0wAAAA?w=180&h=180&rs=1&pid=ImgDetMain&o=7&rm=3"
                    }
                    alt="album"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  ""
                )}
              </span>
              <div className="flex gap-1">
                <div
                  className={`flex items-center justify-center gap-1 h-8 ${isPlaying ? "playing" : ""}`}
                >
                  {[...Array(6)].map((_, i) => (
                    <span
                      key={i}
                      className={`w-0.5 h-2.5 bg-linear-to-t from-gray-600 to-gray-800 rounded-full transition-all ${
                        isPlaying
                          ? "animate-wave-bar barAtDynamic" + (i + 1)
                          : "opacity-30"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            {/* Nội dung bên phải: sóng, wifi, pin */}
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5 items-end h-2.5">
                <div className="w-[2.5px] h-1 bg-white/80 rounded-px"></div>
                <div className="w-[2.5px] h-1.5 bg-white/80 rounded-px"></div>
                <div className="w-[2.5px] h-2 bg-white/80 rounded-px"></div>
                <div className="w-[2.5px] h-2.5 bg-white/80 rounded-px"></div>
              </div>
              <svg
                width="18"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-white/80"
              >
                <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                <path
                  d="M7 12.5C8.5 10.5 10 9.5 12 9.5C14 9.5 15.5 10.5 17 12.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M3.5 8.5C5.5 5.5 8.5 3.5 12 3.5C15.5 3.5 18.5 5.5 20.5 8.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M12 16.5C12.5 16.5 13 17 13 17.5C13 18 12.5 18.5 12 18.5C11.5 18.5 11 18 11 17.5C11 17 11.5 16.5 12 16.5Z"
                  fill="currentColor"
                />
              </svg>
              <div className="flex items-center gap-px">
                <div className="relative w-5 h-2.5 rounded-xs border border-white/40 bg-white/10">
                  <div className="absolute left-px top-px h-[calc(100%-2px)] w-[70%] bg-white/80 rounded-px"></div>
                </div>
                <div className="w-0.5 h-1.5 bg-white/40 rounded-r-px"></div>
              </div>
            </div>
          </div>

          {/* Header */}
          <header className="text-center mt-13 flex flex-col gap-2">
            <h4 className="text-white/50 text-1xl uppercase tracking-[3px] mb-1 shimmer-text">
              Now playing
            </h4>
            <h2 className="text-white text-4xl font-semibold drop-shadow-lg animate-[fadeIn_0.5s_ease] marquee-container">
              <span className="marquee">{currentSong.name.trim()}</span>
            </h2>
            {currentSong.author && (
              <p className="text-white/60 text-sm mt-4">{currentSong.author}</p>
            )}
          </header>

          {/* CD */}
          <div className="flex flex-col items-center my-6 w-full max-w-64 mx-auto relative gap-15 mt-15">
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
              <div className="absolute inset-0 rounded-full bg-linear-to-tr from-white/20 to-transparent pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[15%] h-[15%] bg-black/60 rounded-full backdrop-blur-sm border border-white/30" />
            </div>
            <div
              className={`flex items-center justify-center gap-1 mt-6 h-8 ${isPlaying ? "playing" : ""}`}
            >
              {[...Array(12)].map((_, i) => (
                <span
                  key={i}
                  className={`w-1 h-3 bg-linear-to-t from-[#7ed957] to-[#00bcd4] rounded-full transition-all ${
                    isPlaying ? "animate-wave-bar bar" + (i + 1) : "opacity-30"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-around px-2 py-4">
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
              className="w-14 h-14 rounded-full text-xl text-[#1a1a2e] flex items-center justify-center bg-linear-to-r from-[#7ed957] to-[#00bcd4] shadow-[0_10px_25px_rgba(126,217,87,0.5)] transition-all duration-200 active:scale-95 hover:shadow-[0_15px_35px_rgba(126,217,87,0.8)]"
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

          {/* Progress Bar */}
          <div className="flex items-center gap-2 text-white/70 text-xs px-2 mt-5">
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

          <div className="absolute -z-10 top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#7ed957] opacity-20 rounded-full blur-3xl" />
        </div>

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
              className={`flex items-center mb-3 p-3 rounded-xl cursor-pointer transition-all duration-300 bg-linear-to-br from-[rgba(126,217,87,0.05)] to-[rgba(0,188,212,0.05)] backdrop-blur-sm border border-white/10 animate-slideInRight hover:from-[rgba(126,217,87,0.15)] hover:to-[rgba(0,188,212,0.15)] hover:translate-x-2.5 hover:shadow-[0_8px_25px_rgba(126,217,87,0.3)] ${
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

      {/* Hidden Audio Element */}
      {currentSong && (
        <audio ref={audioRef} src={currentSong.url} preload="metadata" />
      )}
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
