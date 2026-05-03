import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { FaPlay, FaPause, FaStepBackward, FaStepForward, FaVolumeUp, FaVolumeMute, FaHeart, FaRegHeart } from 'react-icons/fa';
import { useLike } from '../context/LikeContext';

export default function GlobalPlayer() {
  const { currentSong, isPlaying, togglePlay, setIsPlaying, playNext, playPrevious, volume, setVolume } = usePlayer();
  const { likedSongIds, toggleLike } = useLike();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSong, setIsPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const handleEnded = () => {
    playNext();
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-[60px] md:bottom-0 left-0 right-0 z-[100] glass-panel-3d rounded-none md:rounded-t-[24px] rounded-b-none border-x-0 border-b-0 animate-[fade-in-up_0.3s_ease-out]">
      <audio
        ref={audioRef}
        src={currentSong.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleTimeUpdate}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-24 flex items-center justify-between gap-4">
        {/* Song Info */}
        <div className="flex items-center gap-3 w-1/3 min-w-0">
          <div className="w-10 h-10 md:w-14 md:h-14 flex-shrink-0 rounded-[12px] overflow-hidden relative group premium-card p-0 shadow-[var(--shadow-3d-out)] border-0">
            {currentSong.imageUrl ? (
              <img src={currentSong.imageUrl} alt={currentSong.name} className={`w-full h-full object-cover rounded-[12px] ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`} />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-blue)] flex items-center justify-center rounded-[12px] ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`}>
                <FaPlay className="text-white opacity-50" size={12} />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[12px]">
              <div className="w-3 h-3 md:w-4 md:h-4 bg-white/50 rounded-full backdrop-blur-sm shadow-[inset_1px_1px_3px_rgba(255,255,255,0.2)]" />
            </div>
          </div>
          <div className="min-w-0 flex-1 flex items-center justify-between">
            <div className="min-w-0">
              <h4 className="text-[var(--accent-gold)] font-semibold text-xs md:text-base truncate drop-shadow-md">{currentSong.name}</h4>
              <p className="text-slate-400 text-[10px] md:text-sm truncate font-medium">{currentSong.author || 'Unknown Artist'}</p>
            </div>
            <button 
              onClick={() => toggleLike(currentSong.id)}
              className="ml-2 p-2 text-slate-400 hover:text-pink-500 transition-colors flex-shrink-0"
            >
              {likedSongIds.has(currentSong.id) ? <FaHeart className="text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" /> : <FaRegHeart />}
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center flex-1 max-w-2xl">
          <div className="flex items-center gap-4 md:gap-6 md:mb-1">
            <button onClick={playPrevious} className="text-slate-400 hover:text-white transition-colors">
              <FaStepBackward size={14} className="md:w-4 md:h-4" />
            </button>
            <button 
              onClick={togglePlay} 
              className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center premium-btn text-[var(--accent-gold)] rounded-full hover:scale-105 active:scale-95 transition-all"
            >
              <span className="relative z-10 flex items-center justify-center">
                 {isPlaying ? <FaPause size={14} className="md:w-5 md:h-5" /> : <FaPlay size={14} className="md:w-5 md:h-5 ml-1" />}
              </span>
            </button>
            <button onClick={playNext} className="text-slate-400 hover:text-white transition-colors">
              <FaStepForward size={14} className="md:w-4 md:h-4" />
            </button>
          </div>
          <div className="w-full flex items-center gap-3 hidden md:flex">
            <span className="text-xs text-slate-400 w-10 text-right">{formatTime(progress)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={progress}
              onChange={handleSeek}
              className="flex-1 h-2 bg-[#0a0a0a] rounded-lg appearance-none cursor-pointer shadow-[var(--shadow-3d-in)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:scale-125 [&::-webkit-slider-thumb]:transition-transform"
              style={{
                background: `linear-gradient(to right, #d4af37 ${(progress / (duration || 1)) * 100}%, #0a0a0a ${(progress / (duration || 1)) * 100}%)`
              }}
            />
            <span className="text-xs text-slate-400 w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="w-1/3 flex items-center justify-end gap-3 hidden md:flex">
          <button 
            onClick={() => setVolume(volume === 0 ? 1 : 0)} 
            className="text-slate-400 hover:text-[var(--accent-gold)] transition-colors"
          >
            {volume === 0 ? <FaVolumeMute size={18} /> : <FaVolumeUp size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-24 h-2 bg-[#0a0a0a] shadow-[var(--shadow-3d-in)] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[var(--accent-gold)] [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 [&::-webkit-slider-thumb]:transition-transform"
            style={{
              background: `linear-gradient(to right, #d4af37 ${volume * 100}%, #0a0a0a ${volume * 100}%)`
            }}
          />
        </div>
      </div>
      {/* Mobile Progress Bar (Absolute Top) */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-[3px] bg-[#0a0a0a] shadow-[var(--shadow-3d-in)]">
        <div 
          className="h-full bg-[var(--accent-gold)] shadow-[0_0_10px_rgba(212,175,55,0.8)]" 
          style={{ width: `${(progress / (duration || 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
