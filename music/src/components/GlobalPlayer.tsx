import { useEffect, useRef, useState, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { FaPlay, FaPause, FaStepBackward, FaStepForward, FaVolumeUp, FaVolumeMute, FaHeart, FaRegHeart, FaSlidersH, FaTimes, FaMicrophoneAlt } from 'react-icons/fa';
import { useLike } from '../context/LikeContext';

export default function GlobalPlayer() {
  const { currentSong, isPlaying, togglePlay, setIsPlaying, playNext, playPrevious, volume, setVolume } = usePlayer();
  const { likedSongIds, toggleLike } = useLike();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const [showEQ, setShowEQ] = useState(false);
  const [showKaraoke, setShowKaraoke] = useState(false);
  const [quality, setQuality] = useState('lossless'); // normal, 320, lossless
  const [eqPreset, setEqPreset] = useState('flat'); // flat, bass, vocal, loudness, electronic
  const karaokeRef = useRef<HTMLDivElement>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);
  const qualityFilterRef = useRef<BiquadFilterNode | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    // Ngăn chặn kết nối nhiều lần trên cùng 1 DOM element (hoặc do Strict Mode)
    if ((audioRef.current as any)._isConnectedToWebAudio) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      let ctx = audioCtxRef.current;
      if (!ctx) {
        ctx = new AudioContextClass();
        audioCtxRef.current = ctx;
      }

      const source = ctx.createMediaElementSource(audioRef.current);
      sourceRef.current = source;

      const bass = ctx.createBiquadFilter();
      bass.type = 'lowshelf';
      bass.frequency.value = 200;
      bassFilterRef.current = bass;

      const treble = ctx.createBiquadFilter();
      treble.type = 'highshelf';
      treble.frequency.value = 3000;
      trebleFilterRef.current = treble;

      const qual = ctx.createBiquadFilter();
      qual.type = 'lowpass';
      qual.frequency.value = 22000;
      qualityFilterRef.current = qual;

      source.connect(bass);
      bass.connect(treble);
      treble.connect(qual);
      qual.connect(ctx.destination);

      // Đánh dấu element này đã được kết nối để tránh lỗi khi re-render
      (audioRef.current as any)._isConnectedToWebAudio = true;

      // Áp dụng ngay lại EQ preset hiện tại vì các filter node vừa được tạo lại
      setEqPreset(prev => {
        // Mẹo nhỏ: trigger re-render cho effect EQ bên dưới chạy lại
        return prev;
      });
    } catch (e) {
      console.error("Audio Context Init Error:", e);
    }
  }, [currentSong]); // Chạy lại khi có bài hát (có thể audio element bị mount lại)

  useEffect(() => {
    if (!audioCtxRef.current) return;
    const bass = bassFilterRef.current;
    const treble = trebleFilterRef.current;
    const qual = qualityFilterRef.current;
    if (!bass || !treble || !qual) return;

    switch (eqPreset) {
      case 'bass':
        bass.gain.value = 10;
        treble.gain.value = 0;
        break;
      case 'vocal':
        bass.gain.value = -3;
        treble.gain.value = 8;
        break;
      case 'loudness':
        bass.gain.value = 6;
        treble.gain.value = 6;
        break;
      case 'electronic':
        bass.gain.value = 8;
        treble.gain.value = 5;
        break;
      case 'flat':
      default:
        bass.gain.value = 0;
        treble.gain.value = 0;
        break;
    }

    if (quality === 'normal') {
      qual.frequency.value = 2000; // Cắt tần số cao rõ ràng hơn để thấy khác biệt
    } else {
      qual.frequency.value = 22000; // Nguyên bản
    }

    if (audioCtxRef.current.state === 'suspended' && isPlaying) {
      audioCtxRef.current.resume();
    }
  }, [eqPreset, quality, isPlaying, currentSong]);

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
        crossOrigin="anonymous"
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

        {/* Volume & Settings */}
        <div className="w-1/3 flex items-center justify-end gap-3 hidden md:flex">
          <button
            onClick={() => setShowKaraoke(true)}
            className={`transition-colors p-2 ${showKaraoke ? 'text-[var(--accent-gold)]' : 'text-slate-400 hover:text-[var(--accent-gold)]'}`}
            title="Karaoke Mode"
          >
            <FaMicrophoneAlt size={16} />
          </button>
          <button
            onClick={() => setShowEQ(true)}
            className="text-slate-400 hover:text-[var(--accent-gold)] transition-colors p-2"
            title="Chất lượng & Âm thanh"
          >
            <FaSlidersH size={16} />
          </button>
          <button
            onClick={() => setVolume(volume === 0 ? 1 : 0)}
            className="text-slate-400 hover:text-[var(--accent-gold)] transition-colors ml-2"
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

      {/* EQ Modal */}
      {showEQ && (
        <div className="fixed inset-0 z-[200] flex items-end justify-end pb-[80px] md:pb-[100px] px-4 md:pr-8" onClick={() => setShowEQ(false)}>
          <div className="glass-panel-3d p-6 md:p-8 rounded-3xl w-full max-w-sm relative shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 animate-[fade-in-up_0.2s_ease-out] bg-[#0a0a0a]/95 backdrop-blur-3xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowEQ(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><FaTimes /></button>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"> Chất lượng Âm thanh</h3>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {['normal', '320', 'lossless'].map(q => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`p-2 rounded-xl border text-[10px] md:text-xs font-bold uppercase transition-all ${quality === q ? 'bg-[var(--accent-gold)] text-black border-transparent shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}
                >
                  {q === 'normal' ? '128kbps' : q === '320' ? '320kbps' : 'Lossless'}
                </button>
              ))}
            </div>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FaSlidersH className="text-pink-500" /> Bộ chỉnh âm (EQ)</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'flat', name: 'Bình thường' },
                { id: 'bass', name: 'Bass Boost' },
                { id: 'vocal', name: 'Vocal Boost' },
                { id: 'loudness', name: 'Loudness' },
                { id: 'electronic', name: 'Electronic' }
              ].map(eq => (
                <button
                  key={eq.id}
                  onClick={() => setEqPreset(eq.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${eqPreset === eq.id ? 'bg-pink-500 text-white border-transparent shadow-[0_0_15px_rgba(236,72,153,0.5)]' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}
                >
                  {eq.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Karaoke Mode Overlay */}
      {showKaraoke && currentSong && (
        <KaraokeOverlay
          song={currentSong}
          progress={progress}
          duration={duration}
          isPlaying={isPlaying}
          onClose={() => setShowKaraoke(false)}
          onTogglePlay={togglePlay}
          onNext={playNext}
          onPrev={playPrevious}
          karaokeRef={karaokeRef}
        />
      )}

    </div>
  );
}

// ========== KARAOKE OVERLAY ==========
function KaraokeOverlay({ song, progress, duration, isPlaying, onClose, onTogglePlay, onNext, onPrev, karaokeRef }: {
  song: any;
  progress: number;
  duration: number;
  isPlaying: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  karaokeRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { lines, isLrc } = useMemo(() => {
    if (!song.lyrics) return { lines: [], isLrc: false };
    const rawLines = song.lyrics.split('\n').filter((l: string) => l.trim() !== '');

    const lrcRegex = /\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\](.*)/;
    let isLrc = false;

    const parsedLines = rawLines.map((line: string) => {
      const match = lrcRegex.exec(line);
      if (match) {
        isLrc = true;
        const minutes = parseInt(match[1], 10);
        const seconds = parseFloat(match[2]);
        const text = match[3].trim();
        return { time: minutes * 60 + seconds, text };
      }
      return { time: -1, text: line };
    });

    return { lines: parsedLines, isLrc };
  }, [song.lyrics]);

  const totalLines = lines.length;
  const currentLineIndex = useMemo(() => {
    if (totalLines === 0 || duration === 0) return 0;

    if (isLrc) {
      let activeIndex = 0;
      for (let i = 0; i < totalLines; i++) {
        if (progress >= lines[i].time) {
          activeIndex = i;
        } else {
          break;
        }
      }
      return activeIndex;
    } else {
      const ratio = progress / duration;
      return Math.min(Math.floor(ratio * totalLines), totalLines - 1);
    }
  }, [progress, duration, totalLines, lines, isLrc]);

  // Auto-scroll to current line
  useEffect(() => {
    if (karaokeRef.current) {
      const activeEl = karaokeRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentLineIndex, karaokeRef]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-3xl flex flex-col animate-[fade-in_0.3s_ease-out]">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--accent-gold)]/10 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/10 blur-[120px] rounded-full" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[var(--accent-gold)]/30 shadow-lg">
            <img src={song.imageUrl} alt="" className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{song.name}</h3>
            <p className="text-sm text-[var(--accent-gold)] font-medium">{song.author || 'Unknown'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 bg-white/5 px-3 py-1 rounded-full">🎤 KARAOKE</span>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <FaTimes size={18} />
          </button>
        </div>
      </div>

      {/* Lyrics Area */}
      <div className="flex-1 overflow-hidden relative z-10 flex items-center justify-center">
        {lines.length === 0 ? (
          <div className="text-center space-y-4">
            <FaMicrophoneAlt className="text-6xl text-[var(--accent-gold)] opacity-20 mx-auto" />
            <p className="text-2xl font-bold text-slate-500">Bài hát này chưa có lời</p>
            <p className="text-slate-600">Thêm lời bài hát khi upload để sử dụng Karaoke mode!</p>
          </div>
        ) : (
          <div
            ref={karaokeRef}
            className="max-w-3xl w-full h-[60vh] overflow-y-auto custom-scrollbar px-8 space-y-6"
          >
            {/* Spacer */}
            <div className="h-[25vh]"></div>
            {lines.map((lineObj: any, i: number) => {
              const isActive = i === currentLineIndex;
              const isPast = i < currentLineIndex;
              return (
                <p
                  key={i}
                  data-active={isActive ? 'true' : 'false'}
                  className={`text-center transition-all duration-500 cursor-default select-none ${
                    isActive
                      ? 'text-3xl md:text-4xl font-black text-white scale-105 drop-shadow-[0_0_30px_rgba(212,175,55,0.5)]'
                      : isPast
                        ? 'text-xl md:text-2xl font-bold text-slate-600'
                        : 'text-xl md:text-2xl font-bold text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {isActive && <span className="text-[var(--accent-gold)]">♪ </span>}
                  {lineObj.text}
                  {isActive && <span className="text-[var(--accent-gold)]"> ♪</span>}
                </p>
              );
            })}
            {/* Spacer */}
            <div className="h-[25vh]"></div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="relative z-10 px-6 md:px-10 pb-8 pt-4">
        {/* Progress Bar */}
        <div className="flex items-center gap-3 mb-6 max-w-2xl mx-auto">
          <span className="text-xs text-slate-400 w-10 text-right font-mono">{formatTime(progress)}</span>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--accent-gold)] to-amber-400 rounded-full shadow-[0_0_10px_rgba(212,175,55,0.5)] transition-all duration-200"
              style={{ width: `${(progress / (duration || 1)) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 w-10 font-mono">{formatTime(duration)}</span>
        </div>
        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-8">
          <button onClick={onPrev} className="text-slate-400 hover:text-white transition-colors">
            <FaStepBackward size={18} />
          </button>
          <button
            onClick={onTogglePlay}
            className="w-16 h-16 rounded-full bg-[var(--accent-gold)] text-black flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:scale-110 active:scale-95 transition-transform"
          >
            {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} className="ml-1" />}
          </button>
          <button onClick={onNext} className="text-slate-400 hover:text-white transition-colors">
            <FaStepForward size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
