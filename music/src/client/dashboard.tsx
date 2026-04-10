import { useState, useRef, useEffect, useCallback } from "react";
import "../App.css";
import { API_BASE } from "../config";
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

const MusicPlayer = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRandom, setIsRandom] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [refresh, setRefresh] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLInputElement>(null);

  // Tải danh sách bài hát
  const loadSongs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/songs`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const approved = data.songs.filter((song: Song) => song.status === "approved");
      setSongs(approved || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch songs:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSongs();
  }, [refresh, loadSongs]);

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

  // Xử lý next/prev
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

  // Gắn sự kiện audio
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
        <div className="absolute bottom-0 left-0 w-[200%] h-25 bg-gradient-to-r from-[#7ed957] to-[#00bcd4] opacity-10 animate-wave animate-wave1" />
        <div className="absolute bottom-2.5 left-0 w-[200%] h-25 bg-gradient-to-r from-[#7ed957] to-[#00bcd4] opacity-10 animate-wave animate-wave2" />
        <div className="absolute bottom-5 left-0 w-[200%] h-25 bg-gradient-to-r from-[#7ed957] to-[#00bcd4] opacity-8 animate-wave animate-wave3" />
      </div>

      <div className="flex flex-col md:flex-row gap-5 md:gap-8">
        {/* Dashboard - Player */}
        <div className="w-full md:w-2/5 lg:w-1/3 bg-gradient-to-br from-[rgba(126,217,87,0.1)] to-[rgba(0,188,212,0.1)] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(126,217,87,0.3)] rounded-b-[30px] z-10 p-5 pt-6 pb-4">
          <header className="text-center mb-4">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#7ed957] to-[#00bcd4] py-2 px-5 rounded-full mb-3 shadow-[0_4px_15px_rgba(126,217,87,0.4)] animate-pulse-glow">
              <FaHeadphonesAlt className="text-[#1a1a2e] text-base" />
              <span className="font-semibold text-sm text-[#1a1a2e] tracking-wide">
                Quang Huy Music
              </span>
            </div>
            <h4 className="text-[#a8a8a8] text-xs uppercase tracking-[2px] mb-2">
              Now playing:
            </h4>
            <h2 className="text-white text-2xl font-semibold drop-shadow-lg animate-[fadeIn_0.5s_ease]">
              {currentSong.name}
            </h2>
            {currentSong.author && (
              <p className="text-[#a8a8a8] text-sm mt-1">{currentSong.author}</p>
            )}
          </header>

          {/* CD */}
          <div className="flex flex-col items-center my-5 w-full max-w-[250px] md:max-w-full mx-auto relative">
            <div
              className={`w-full pt-[100%] rounded-full bg-cover bg-center mx-auto shadow-[0_10px_40px_rgba(0,0,0,0.5),0_0_0_8px_rgba(126,217,87,0.2),0_0_0_12px_rgba(0,188,212,0.1)] relative transition-all hover:scale-105 hover:shadow-[0_15px_50px_rgba(0,0,0,0.6),0_0_0_10px_rgba(126,217,87,0.3),0_0_0_15px_rgba(0,188,212,0.2)] ${
                isPlaying ? "animate-[spin_3s_linear_infinite]" : ""
              }`}
              style={{
                backgroundImage: `url('${
                  currentSong.imageUrl ||
                  "https://tse3.mm.bing.net/th/id/OIP.lucx6lfHqnK0P6dzh6-t0wAAAA?w=180&h=180&rs=1&pid=ImgDetMain&o=7&rm=3"
                }')`,
              }}
            >
              <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-gradient-to-br from-white/40 to-transparent rounded-full pointer-events-none" />
            </div>
            <div
              className={`flex items-center justify-center gap-1 mt-5 h-10 ${
                isPlaying ? "playing" : ""
              } border-transparent bg-transparent`}
            >
              {[...Array(15)].map((_, i) => (
                <span
                  key={i}
                  className={`w-1 h-3 bg-gradient-to-t from-[#7ed957] to-[#00bcd4] rounded-sm ${
                    isPlaying ? "animate-wave-bar bar" + (i + 1) : ""
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-around py-5">
            <button
              onClick={toggleRepeat}
              className={`p-4 text-lg rounded-full transition-all hover:text-[#7ed957] hover:scale-110 hover:bg-[rgba(126,217,87,0.1)] ${
                isRepeat
                  ? "text-[#7ed957] bg-[rgba(126,217,87,0.2)]"
                  : "text-[#a8a8a8]"
              }`}
            >
              <FaRedo />
            </button>
            <button
              onClick={handlePrev}
              className="p-4 text-lg rounded-full text-[#a8a8a8] hover:text-[#7ed957] hover:scale-110 hover:bg-[rgba(126,217,87,0.1)] transition-all"
            >
              <FaStepBackward />
            </button>
            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full text-2xl text-[#1a1a2e] flex items-center justify-center bg-gradient-to-r from-[#7ed957] to-[#00bcd4] shadow-[0_8px_25px_rgba(126,217,87,0.5)] transition-all hover:scale-110 hover:shadow-[0_12px_35px_rgba(126,217,87,0.7)] active:scale-95"
            >
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            <button
              onClick={handleNext}
              className="p-4 text-lg rounded-full text-[#a8a8a8] hover:text-[#7ed957] hover:scale-110 hover:bg-[rgba(126,217,87,0.1)] transition-all"
            >
              <FaStepForward />
            </button>
            <button
              onClick={toggleRandom}
              className={`p-4 text-lg rounded-full transition-all hover:text-[#7ed957] hover:scale-110 hover:bg-[rgba(126,217,87,0.1)] ${
                isRandom
                  ? "text-[#7ed957] bg-[rgba(126,217,87,0.2)]"
                  : "text-[#a8a8a8]"
              }`}
            >
              <FaRandom />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 text-white text-xs px-1">
            <span>{formatTime((progress / 100) * duration)}</span>
            <input
              ref={progressRef}
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={handleProgressChange}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-[#7ed957] [&::-webkit-slider-thumb]:to-[#00bcd4] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(126,217,87,0.8)] [&::-webkit-slider-thumb]:transition-all hover:[&::-webkit-slider-thumb]:scale-125"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playlist */}
        <div className="w-full md:w-3/5 lg:w-2/3 p-3 pb-20 md:pb-3 max-h-[calc(100vh-2rem)] md:max-h-screen overflow-y-auto">
          {songs.map((song, index) => (
            <div
              key={song.id}
              onClick={() => handleSelectSong(index)}
              className={`flex items-center mb-3 p-3 rounded-xl cursor-pointer transition-all duration-300 bg-gradient-to-br from-[rgba(126,217,87,0.05)] to-[rgba(0,188,212,0.05)] backdrop-blur-sm border border-white/10 animate-slideInRight hover:bg-gradient-to-br hover:from-[rgba(126,217,87,0.15)] hover:to-[rgba(0,188,212,0.15)] hover:translate-x-2.5 hover:shadow-[0_8px_25px_rgba(126,217,87,0.3)] ${
                index === currentSongIndex
                  ? "!bg-gradient-to-r !from-[#7ed957] !to-[#00bcd4] shadow-[0_8px_30px_rgba(126,217,87,0.5)] translate-x-2.5 scale-[1.02]"
                  : ""
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                className="w-12 h-12 rounded-[10px] bg-cover bg-center mx-2 shadow-[0_4px_15px_rgba(0,0,0,0.3)] transition-all group-hover:scale-110 group-hover:rotate-6 flex-shrink-0"
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
                    index === currentSongIndex ? "text-[#1a1a2e]" : "text-[#a8a8a8]"
                  }`}
                >
                  {song.author || "Unknown Artist"}
                </div>
              </div>
              <button className="p-4 text-[#a8a8a8] text-lg transition-all hover:text-[#7ed957] hover:rotate-90">
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
    </div>
  );
};

export default MusicPlayer;
