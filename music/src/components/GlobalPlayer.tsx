import { useEffect, useRef, useState, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { FaPlay, FaPause, FaStepBackward, FaStepForward, FaVolumeUp, FaVolumeMute, FaHeart, FaRegHeart, FaSlidersH, FaTimes, FaMicrophoneAlt, FaCrown, FaRandom, FaSync } from 'react-icons/fa';
import { useLike } from '../context/LikeContext';
import { API_BASE } from '../config.tsx';

export default function GlobalPlayer() {
  const { currentSong, isPlaying, togglePlay, setIsPlaying, playNext, playPrevious, volume, setVolume, isRandom, isRepeat, toggleRandom, toggleRepeat } = usePlayer();
  const { likedSongIds, toggleLike } = useLike();

  const audioRef = useRef<HTMLAudioElement>(null);
  const karaokeRef = useRef<HTMLDivElement>(null);

  const [progress, setProgress] = useState(0);
  const pendingPlayRef = useRef(false);
  const lastSongIdRef = useRef<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [showEQ, setShowEQ] = useState(false);
  const [showKaraoke, setShowKaraoke] = useState(false);
  const [quality, setQuality] = useState<'normal' | '320' | 'lossless'>('lossless');
  const [eqPreset, setEqPreset] = useState<'flat' | 'bass' | 'vocal' | 'loudness' | 'electronic'>('flat');
  const [is8D, setIs8D] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);
  const qualityFilterRef = useRef<BiquadFilterNode | null>(null);
  const pannerRef = useRef<StereoPannerNode | null>(null);
  const lfoGainRef = useRef<GainNode | null>(null);

  const [user, setUser] = useState<Record<string, unknown> | null>(() => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  });
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeStep, setUpgradeStep] = useState<'intro' | 'payment' | 'processing'>('intro');

  const isPremium = user?.role === 'PREMIUM' || user?.role === 'ADMIN';

  // Poll for Premium status if pending
  useEffect(() => {
    if (user?.role === 'PREMIUM_PENDING') {
      const interval = setInterval(async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_BASE}/api/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.valid && data.user.role === 'PREMIUM') {
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            clearInterval(interval);
          }
        } catch {
          // ignore
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [user?.role]);

  const handleUpgrade = async () => {
    setUpgradeStep('processing');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/user/request-premium`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setUpgradeStep('payment');
      } else {
        alert(data.msg);
        setUpgradeStep('intro');
      }
    } catch (e) {
      console.error(e);
      setUpgradeStep('intro');
    }
  };

  const requirePremium = (fn: () => void) => {
    if (!isPremium) {
      setUpgradeStep('intro');
      setShowUpgrade(true);
    } else {
      fn();
    }
  };

  // Resolve offline audio and cover image dynamically
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string>('');

  useEffect(() => {
    if (!currentSong) return;

    if (currentSong.url.startsWith('blob:') || currentSong.url.startsWith('data:')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAudioUrl(currentSong.url);
      setCoverUrl(currentSong.imageUrl || '');
      return;
    }

    let active = true;
    let localAudioUrl = '';
    let localCoverUrl = '';

    const checkOffline = async () => {
      try {
        const { getSong } = await import('../utils/offlineDb');
        const dbSong = await getSong(currentSong.id);
        if (dbSong && dbSong.audioBlob) {
          localAudioUrl = URL.createObjectURL(dbSong.audioBlob);
          if (dbSong.imageBlob) {
            localCoverUrl = URL.createObjectURL(dbSong.imageBlob);
          } else {
            localCoverUrl = currentSong.imageUrl || '';
          }
          if (active) {
            setAudioUrl(localAudioUrl);
            setCoverUrl(localCoverUrl);
          }
        } else {
          if (active) {
            setAudioUrl(currentSong.url);
            setCoverUrl(currentSong.imageUrl || '');
          }
        }
      } catch (e) {
        console.error('Error loading offline source:', e);
        if (active) {
          setAudioUrl(currentSong.url);
          setCoverUrl(currentSong.imageUrl || '');
        }
      }
    };

    checkOffline();

    return () => {
      active = false;
      if (localAudioUrl) URL.revokeObjectURL(localAudioUrl);
      if (localCoverUrl && localCoverUrl.startsWith('blob:')) URL.revokeObjectURL(localCoverUrl);
    };
  }, [currentSong]);

  // ====================== AUDIO ENGINE PRO (ULTIMATE UPGRADE) ======================
  const analyserRef = useRef<AnalyserNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const masterFadeRef = useRef<GainNode | null>(null);

  // Tạo Reverb (Hiệu ứng vang không gian 3D - Concert Hall)
  const createConcertHallReverb = (ctx: AudioContext) => {
    const length = ctx.sampleRate * 2.5; // Vang 2.5 giây
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-i / (ctx.sampleRate * 0.5));
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    return convolver;
  };

  useEffect(() => {
    if (!audioRef.current) return;
    if ((audioRef.current as Record<string, unknown>)._isConnectedToWebAudio) return;

    try {
      const AudioContextClass = window.AudioContext || (window as Record<string, unknown>).webkitAudioContext as typeof window.AudioContext;
      if (!AudioContextClass) return;

      let ctx = audioCtxRef.current;
      if (!ctx) {
        ctx = new AudioContextClass();
        audioCtxRef.current = ctx;
      }

      const source = ctx.createMediaElementSource(audioRef.current);
      sourceRef.current = source;

      // 1. Phân tích phổ âm thanh (Spectrum Analyzer)
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      // 2. Preamp (Chống vỡ âm dải tần số)
      const preamp = ctx.createGain();
      preamp.gain.value = 0.75;

      // 3. EQ đa băng tần
      const bass = ctx.createBiquadFilter();
      bass.type = 'lowshelf';
      bass.frequency.value = 150;
      bassFilterRef.current = bass;

      const treble = ctx.createBiquadFilter();
      treble.type = 'highshelf';
      treble.frequency.value = 4000;
      trebleFilterRef.current = treble;

      const qual = ctx.createBiquadFilter();
      qual.type = 'lowpass';
      qual.frequency.value = 22000;
      qualityFilterRef.current = qual;

      // 4. 8D Spatial Panner
      const panner = ctx.createStereoPanner();
      pannerRef.current = panner;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.1; // Tốc độ xoay não
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0;
      lfo.connect(lfoGain);
      lfoGain.connect(panner.pan);
      lfo.start();
      lfoGainRef.current = lfoGain;

      // 5. 3D Reverb / Không gian 3 chiều
      const convolver = createConcertHallReverb(ctx);
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = 0; // Tắt mặc định
      reverbGainRef.current = reverbGain;

      // 6. Master Fade (Tạo hiệu ứng Fade in/out mượt mà khi Play/Pause)
      const masterFade = ctx.createGain();
      masterFade.gain.value = 1;
      masterFadeRef.current = masterFade;

      // 7. Auto Mastering Compressor
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -3;
      compressor.knee.value = 15;
      compressor.ratio.value = 20;
      compressor.attack.value = 0.002;
      compressor.release.value = 0.1;

      // Định tuyến âm thanh (Routing Graph):
      source.connect(analyser);
      analyser.connect(preamp);
      preamp.connect(bass);
      bass.connect(treble);
      treble.connect(qual);

      // Tách nhánh: Một luồng trực tiếp (Dry), Một luồng qua Reverb (Wet)
      qual.connect(panner);

      // Nhánh Wet
      panner.connect(convolver);
      convolver.connect(reverbGain);
      reverbGain.connect(masterFade);

      // Nhánh Dry
      panner.connect(masterFade);

      // Xuất âm thanh
      masterFade.connect(compressor);
      compressor.connect(ctx.destination);

      (audioRef.current as Record<string, unknown>)._isConnectedToWebAudio = true;
    } catch {
      // Audio Engine Init Error ignored
    }
  }, [currentSong]);

  // Apply EQ & Effects
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
      default:
        bass.gain.value = 0;
        treble.gain.value = 0;
    }

    qual.frequency.value = quality === 'normal' ? 2000 : 22000;

    if (lfoGainRef.current && audioCtxRef.current && reverbGainRef.current) {
      const t = audioCtxRef.current.currentTime;
      if (is8D) {
        lfoGainRef.current.gain.setTargetAtTime(0.7, t, 0.5); // Xoay 70%
        reverbGainRef.current.gain.setTargetAtTime(0.3, t, 0.5); // Bật tiếng vang Concert Hall 30%
      } else {
        lfoGainRef.current.gain.setTargetAtTime(0, t, 0.5);
        reverbGainRef.current.gain.setTargetAtTime(0, t, 0.5);
      }
    }
    if (pannerRef.current && !is8D && audioCtxRef.current) {
      pannerRef.current.pan.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.5);
    }

    if (audioCtxRef.current.state === 'suspended' && isPlaying) {
      audioCtxRef.current.resume();
    }
  }, [eqPreset, quality, is8D, isPlaying, currentSong]);

  // Volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Play/Pause Smooth Fade (Chống giật/nổ bụp khi Stop)
  useEffect(() => {
    if (!audioRef.current) return;

    const songChanged = currentSong && lastSongIdRef.current !== currentSong.id;
    if (currentSong) lastSongIdRef.current = currentSong.id;

    if (isPlaying) {
      if (songChanged) {
        // Bài mới → chờ audio load xong rồi mới play (qua handleCanPlay)
        pendingPlayRef.current = true;
      } else {
        // Cùng bài → play ngay
        audioRef.current.play().catch(() => {
          // Nếu fail thì đánh dấu pendingPlay để thử lại khi canplay
          pendingPlayRef.current = true;
        });
      }
      if (masterFadeRef.current && audioCtxRef.current) {
        masterFadeRef.current.gain.setTargetAtTime(1, audioCtxRef.current.currentTime, 0.1);
      }
    } else {
      pendingPlayRef.current = false;
      if (masterFadeRef.current && audioCtxRef.current) {
        masterFadeRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.1);
        setTimeout(() => {
          if (audioRef.current) audioRef.current.pause();
        }, 150); // Đợi mờ dần rồi mới pause hẳn
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

  // Khi audio đã load xong source mới → auto play nếu đang chờ
  const handleCanPlay = () => {
    if (pendingPlayRef.current && isPlaying && audioRef.current) {
      pendingPlayRef.current = false;
      // Reset master fade gain để đảm bảo nghe được
      if (masterFadeRef.current && audioCtxRef.current) {
        masterFadeRef.current.gain.setTargetAtTime(1, audioCtxRef.current.currentTime, 0.05);
      }
      // Resume AudioContext nếu bị suspended
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      audioRef.current.play().catch(err => {
        console.error('Auto-play failed on canplay:', err);
      });
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (!currentSong) return null;

  return (
    <>
      {/* ==================== GLOBAL PLAYER BAR ==================== */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-6 left-0 md:left-6 md:right-6 right-0 z-[100] bg-black/60 backdrop-blur-2xl md:rounded-2xl border-t md:border border-white/10 shadow-2xl animate-[fade-in-up_0.3s_ease-out] overflow-visible before:absolute before:inset-0 before:bg-gradient-to-r before:from-emerald-500/5 before:to-teal-500/5 before:rounded-2xl before:pointer-events-none">
        <audio
          ref={audioRef}
          src={audioUrl || currentSong.url}
          crossOrigin="anonymous"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onCanPlay={handleCanPlay}
          onLoadedMetadata={handleTimeUpdate}
          loop={isRepeat}
        />

        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-24 flex items-center justify-between gap-4 relative z-10">
          {/* Song Info */}
          <div className="flex items-center gap-4 w-1/3 min-w-0">
            <div className="w-10 h-10 md:w-16 md:h-16 flex-shrink-0 rounded-xl overflow-hidden relative shadow-lg shadow-black/50 group">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={currentSong.name}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#111]">
                  <FaPlay className="text-white opacity-50" size={12} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 flex items-center justify-between">
              <div className="min-w-0">
                <h4 className="text-white font-bold text-xs md:text-[15px] truncate hover:underline cursor-pointer">
                  {currentSong.name}
                </h4>
                <p className="text-slate-400 font-medium text-[10px] md:text-xs truncate hover:underline cursor-pointer mt-0.5">
                  {currentSong.author || 'Unknown Artist'}
                </p>
              </div>
              <button
                onClick={() => toggleLike(currentSong.id)}
                className="ml-2 p-2 text-slate-400 hover:text-pink-500 transition-colors flex-shrink-0"
              >
                {likedSongIds.has(currentSong.id) ? <FaHeart className="text-pink-500" /> : <FaRegHeart />}
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center flex-1 max-w-2xl">
            <div className="flex items-center gap-4 md:gap-6 md:mb-1">
              <button
                onClick={toggleRandom}
                className={`transition-colors p-2 ${isRandom
                  ? 'text-white'
                  : 'text-gray-500 hover:text-white'
                  }`}
                title="Play Random (Shuffle)"
              >
                <FaRandom size={14} className="md:w-4 md:h-4" />
              </button>
              <button onClick={playPrevious} className="text-slate-400 hover:text-white transition-colors">
                <FaStepBackward size={14} className="md:w-4 md:h-4" />
              </button>
              <button
                onClick={togglePlay}
                className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)]"
              >
                {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} className="ml-1" />}
              </button>
              <button onClick={playNext} className="text-slate-400 hover:text-white transition-colors">
                <FaStepForward size={14} className="md:w-4 md:h-4" />
              </button>
              <button
                onClick={toggleRepeat}
                className={`transition-colors p-2 ${isRepeat
                  ? 'text-white'
                  : 'text-gray-500 hover:text-white'
                  }`}
                title="Play Loop (Repeat)"
              >
                <FaSync size={14} className="md:w-4 md:h-4" />
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
                className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer group-hover:h-1.5 transition-all hover:bg-white/20"
                style={{
                  background: `linear-gradient(to right, #10b981 ${(progress / (duration || 1)) * 100}%, rgba(255,255,255,0.1) ${(progress / (duration || 1)) * 100}%)`
                }}
              />
              <span className="text-xs text-slate-400 w-10">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume & Settings */}
          <div className="w-1/3 flex items-center justify-end gap-3 hidden md:flex">
            <button
              onClick={() => setShowKaraoke(true)}
              className={`transition-colors p-2 ${showKaraoke ? 'text-white' : 'text-gray-500 hover:text-white'}`}
              title="Karaoke Mode"
            >
              <FaMicrophoneAlt size={16} />
            </button>

            <button
              onClick={() => setShowEQ(true)}
              className="text-gray-500 hover:text-white transition-colors p-2 relative group"
              title="Studio Pro"
            >
              <FaSlidersH size={16} />
            </button>

            <button
              onClick={() => setVolume(volume === 0 ? 1 : 0)}
              className="text-gray-500 hover:text-white transition-colors ml-2"
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
              className="w-24 h-1 bg-white/10 rounded-full appearance-none cursor-pointer hover:h-1.5 transition-all"
              style={{
                background: `linear-gradient(to right, #10b981 ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%)`
              }}
            />
          </div>
        </div>

        {/* Mobile Progress */}
        <div className="md:hidden absolute top-0 left-0 right-0 h-[2px] bg-white/10 shadow-[var(--shadow-3d-in)]">
          <div
            className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
            style={{ width: `${(progress / (duration || 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* ==================== EQ MODAL ==================== */}
      {showEQ && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-8 md:pt-[10vh] p-4 bg-black/90 animate-[fade-in_0.2s_ease-out]" onClick={() => setShowEQ(false)}>
          <div className="bg-black border border-[#222] p-6 md:p-8 rounded-xl w-full max-w-md relative overflow-y-auto custom-scrollbar max-h-[80vh] animate-[fade-in-up_0.3s_ease-out]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowEQ(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-white transition-all"><FaTimes /></button>

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white tracking-tight">Studio Pro</h3>
              <p className="text-[10px] text-gray-500 font-bold tracking-[0.2em] uppercase">Audio Features</p>
            </div>

            {/* UPGRADE OVERLAY */}
            {!isPremium && showUpgrade && (
              <div className="absolute inset-0 z-[210] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center animate-[fade-in_0.2s_ease-out] rounded-3xl">
                {upgradeStep === 'intro' && (
                  <div className="animate-[fade-in-up_0.3s_ease-out] w-full">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-[var(--accent-gold)] flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.6)] mb-6 animate-bounce-slow">
                      <FaCrown className="text-black text-4xl" />
                    </div>
                    <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-[var(--accent-gold)] mb-3">Nâng cấp Studio Pro</h3>
                    <div className="space-y-3 text-sm text-slate-300 mb-8 bg-white/5 p-4 rounded-2xl border border-white/10 text-left">
                      <p className="flex items-center gap-3"><span className="text-cyan-400">✓</span> Mở khóa âm thanh xoay 8D Surround</p>
                      <p className="flex items-center gap-3"><span className="text-cyan-400">✓</span> Nghe nhạc Lossless / 320kbps sắc nét</p>
                      <p className="flex items-center gap-3"><span className="text-cyan-400">✓</span> Tùy chỉnh Preset EQ chuyên nghiệp</p>
                    </div>
                    <button
                      onClick={() => setUpgradeStep('payment')}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-[var(--accent-gold)] to-amber-600 text-black font-black text-lg shadow-[0_0_30px_rgba(212,175,55,0.5)] hover:scale-105 transition-all mb-4 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                      Chỉ 29.000đ / tháng
                    </button>
                    <button onClick={() => setShowUpgrade(false)} className="text-sm text-slate-500 hover:text-white transition-colors">Để sau</button>
                  </div>
                )}

                {upgradeStep === 'payment' && (
                  <div className="animate-[scale-in_0.3s_ease-out] w-full flex flex-col items-center">
                    <h3 className="text-xl font-bold text-white mb-2">Thanh toán Chuyển khoản</h3>
                    <p className="text-xs text-slate-400 mb-6 text-center">Quét mã QR bên dưới để nâng cấp Premium</p>

                    <div className="p-4 bg-white rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.2)] mb-6 relative">
                      <div className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">Auto Active</div>
                      <img
                        src={`https://img.vietqr.io/image/MB-0789088909-compact2.png?amount=29000&addInfo=MP${user?.id}`}
                        alt="QR Code"
                        className="w-48 h-48 rounded-xl object-contain"
                      />
                    </div>

                    <div className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 mb-6 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Ngân hàng:</span>
                        <span className="text-white font-bold">MB Bank</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Số tài khoản:</span>
                        <span className="text-[var(--accent-gold)] font-bold">0789088909</span>
                      </div>
                      <div className="flex justify-between text-xs pt-2 border-t border-white/5">
                        <span className="text-slate-400">Nội dung CK:</span>
                        <span className="text-[var(--accent-gold)] font-black text-lg">MP{user?.id}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Số tiền:</span>
                        <span className="text-white font-bold">29.000 VNĐ</span>
                      </div>
                    </div>

                    {user?.role === 'PREMIUM_PENDING' ? (
                      <div className="w-full py-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex flex-col items-center gap-2 animate-pulse">
                        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-bold text-sm uppercase tracking-widest">Đang chờ Admin duyệt...</span>
                        <p className="text-[10px] text-amber-500/70">Vui lòng đợi trong giây lát, Admin đang xác nhận giao dịch của bạn</p>
                      </div>
                    ) : (
                      <button
                        onClick={handleUpgrade}
                        className="w-full py-3 rounded-xl bg-[var(--accent-gold)] text-black font-black hover:scale-105 transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                      >
                        Xác nhận đã chuyển khoản
                      </button>
                    )}
                    <button onClick={() => setUpgradeStep('intro')} className="mt-4 text-sm text-slate-500 hover:text-white transition-colors">Quay lại</button>
                  </div>
                )}

                {upgradeStep === 'processing' && (
                  <div className="animate-[fade-in_0.3s_ease-out] flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-white/10 border-t-[var(--accent-gold)] rounded-full animate-spin mb-6"></div>
                    <h3 className="text-lg font-bold text-white">Đang xác thực giao dịch...</h3>
                    <p className="text-sm text-slate-400">Vui lòng không đóng cửa sổ này</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-6">
              {/* Quality */}
              <div>
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span> Chất lượng
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', '320', 'lossless'] as const).map(q => (
                    <button
                      key={q}
                      onClick={() => q === 'normal' ? setQuality(q) : requirePremium(() => setQuality(q))}
                      className={`relative p-2.5 rounded-xl border text-[10px] md:text-xs font-bold uppercase transition-all duration-300 ${quality === q ? 'bg-gradient-to-br from-[var(--accent-gold)] to-amber-600 text-black border-transparent shadow-[0_4px_15px_rgba(212,175,55,0.4)] transform scale-[1.02]' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'} overflow-hidden`}
                    >
                      {q === 'normal' ? '128kbps' : q === '320' ? '320kbps' : 'Lossless'}
                      {q !== 'normal' && !isPremium && <FaCrown className="absolute top-1 right-1 text-[var(--accent-gold)]/50 text-[8px]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* 8D Audio */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> Hiệu ứng Không gian
                  </h4>
                  <span className="text-[10px] font-black bg-cyan-400/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-400/30 animate-pulse">HOT</span>
                </div>
                <button
                  onClick={() => requirePremium(() => setIs8D(!is8D))}
                  className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all duration-500 overflow-hidden relative group ${is8D ? 'bg-cyan-500/10 border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.2)]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                >
                  {!isPremium && <FaCrown className="absolute top-2 right-2 text-[var(--accent-gold)]/50 text-xs z-20" />}
                  <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent translate-x-[-100%] ${is8D ? 'animate-[shimmer_2s_infinite]' : ''}`}></div>
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${is8D ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-slate-800 text-slate-400'}`}>
                      <span className="font-black text-[15px]">8D</span>
                    </div>
                    <div className="text-left">
                      <p className={`font-bold text-[15px] transition-colors ${is8D ? 'text-cyan-400' : 'text-slate-300'}`}>Âm thanh 8D Surround</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Trải nghiệm âm thanh xoay vòng 360 độ</p>
                    </div>
                  </div>
                  <div className={`relative z-10 w-12 h-6 rounded-full transition-colors ${is8D ? 'bg-cyan-400' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${is8D ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </div>
                </button>
              </div>

              {/* EQ */}
              <div>
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span> Bộ chỉnh âm (EQ)
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'flat', name: 'Bình thường' },
                      { id: 'bass', name: 'Super Bass' },
                      { id: 'vocal', name: 'Clear Vocal' },
                      { id: 'loudness', name: 'Cinematic' },
                      { id: 'electronic', name: 'EDM / Club' }
                    ] as const
                  ).map(eq => (
                    <button
                      key={eq.id}
                      onClick={() => eq.id === 'flat' ? setEqPreset(eq.id) : requirePremium(() => setEqPreset(eq.id))}
                      className={`relative p-3 rounded-xl border text-[13px] font-bold transition-all duration-300 ${eqPreset === eq.id ? 'bg-violet-500/20 text-violet-300 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-slate-200'} overflow-hidden`}
                    >
                      {eq.name}
                      {eq.id !== 'flat' && !isPremium && <FaCrown className="absolute top-1.5 right-1.5 text-[var(--accent-gold)]/50 text-[10px]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==================== KARAOKE OVERLAY ==================== */}
      {showKaraoke && currentSong && (
        <KaraokeOverlay
          song={{ ...currentSong, imageUrl: coverUrl, lyrics: currentSong.lyrics }}
          progress={progress}
          duration={duration}
          isPlaying={isPlaying}
          onClose={() => setShowKaraoke(false)}
          onTogglePlay={togglePlay}
          onNext={playNext}
          onPrev={playPrevious}
          karaokeRef={karaokeRef}
          isRandom={isRandom}
          isRepeat={isRepeat}
          toggleRandom={toggleRandom}
          toggleRepeat={toggleRepeat}
          analyserRef={analyserRef}
          isPremium={isPremium}
        />
      )}
    </>
  );
}

// ====================== KARAOKE COMPONENT ======================
function KaraokeOverlay({
  song,
  progress,
  duration,
  isPlaying,
  onClose,
  onTogglePlay,
  onNext,
  onPrev,
  karaokeRef,
  isRandom,
  isRepeat,
  toggleRandom,
  toggleRepeat,
  analyserRef,
  isPremium,
}: {
  song: Record<string, unknown>;
  progress: number;
  duration: number;
  isPlaying: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  karaokeRef: React.RefObject<HTMLDivElement | null>;
  isRandom: boolean;
  isRepeat: boolean;
  toggleRandom: () => void;
  toggleRepeat: () => void;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  isPremium: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Request Animation Frame for Visualizer
  useEffect(() => {
    if (!isPremium || !analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Define horizontal soundwave parameters
      const numBars = 64; // Low density, extremely lightweight!
      const barWidth = 5;
      const gap = 5;

      // Symmetrical Y center at 82% height of the screen (neatly below the lyrics)
      const waveY = height * 0.82;
      const totalWidth = numBars * (barWidth + gap) - gap;
      const startX = (width - totalWidth) / 2;

      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(245, 158, 11, 0.3)';

      // Draw horizontal symmetrical frequency bars
      for (let i = 0; i < numBars; i++) {
        // Map to frequency data
        const dataIndex = Math.floor((i / numBars) * (bufferLength * 0.6));
        const val = dataArray[dataIndex] || 0;

        // Short height: max 60px (very clean, doesn't block the screen)
        const barHeight = Math.max(4, (val / 255) * 60);

        const x = startX + i * (barWidth + gap);
        const y1 = waveY - barHeight / 2;
        const y2 = waveY + barHeight / 2;

        // Gold to Violet vertical neon gradient
        const grad = ctx.createLinearGradient(x, y1, x, y2);
        grad.addColorStop(0, 'rgba(139, 92, 246, 0.8)');  // Top Violet
        grad.addColorStop(0.5, 'rgba(236, 72, 153, 0.9)'); // Middle Pink
        grad.addColorStop(1, 'rgba(245, 158, 11, 0.8)');   // Bottom Gold

        ctx.strokeStyle = grad;
        ctx.lineWidth = barWidth;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();
      }
    };
    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, isPremium, analyserRef]);

 
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

const currentLineIndex = useMemo(() => {
  if (lines.length === 0 || duration === 0) return 0;
  if (isLrc) {
    let activeIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (progress >= lines[i].time) activeIndex = i;
      else break;
    }
    return activeIndex;
  } else {
    const ratio = progress / duration;
    return Math.min(Math.floor(ratio * lines.length), lines.length - 1);
  }
}, [progress, duration, lines, isLrc]);

useEffect(() => {
  if (karaokeRef.current) {
    const activeEl = karaokeRef.current.querySelector('[data-active="true"]');
    activeEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}, [currentLineIndex, karaokeRef]);

const formatTime = (time: number) => {
  if (isNaN(time)) return "0:00";
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

return (
  <div className="fixed inset-0 z-[500] bg-black flex flex-col animate-[fade-in_0.3s_ease-out]">

    {/* Dynamic 3D Circular Audio Visualizer (Premium Only) */}
    {isPremium && analyser && (
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-65 z-0"
      />
    )}

    {/* Header */}
    <div className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#111]">
          <img src={song.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">{song.name}</h3>
          <p className="text-xs text-gray-500 font-medium">{song.author || 'Unknown'}</p>
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
          <FaMicrophoneAlt className="text-6xl text-gray-800 mx-auto" />
          <p className="text-2xl font-bold text-gray-500">Bài hát này chưa có lời</p>
          <p className="text-slate-600">Thêm lời bài hát khi upload để sử dụng Karaoke mode!</p>
        </div>
      ) : (
        <div
          ref={karaokeRef}
          className="max-w-3xl w-full h-[60vh] overflow-y-auto custom-scrollbar px-8 space-y-6"
        >
          {/* Spacer */}
          <div className="h-[25vh]"></div>
          {lines.map((lineObj: { text: string; time: number }, i: number) => {
            const isActive = i === currentLineIndex;
            const isPast = i < currentLineIndex;
            return (
              <p
                key={i}
                data-active={isActive ? 'true' : 'false'}
                className={`text-center transition-all duration-500 cursor-default select-none ${isActive
                  ? 'text-3xl md:text-4xl font-bold text-white scale-105'
                  : isPast
                    ? 'text-xl md:text-2xl font-medium text-gray-700'
                    : 'text-xl md:text-2xl font-medium text-gray-500 hover:text-gray-400'
                  }`}
              >
                {lineObj.text}
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
        <div className="flex-1 h-1 bg-[#222] rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-200"
            style={{ width: `${(progress / (duration || 1)) * 100}%` }}
          />
        </div>
        <span className="text-xs text-slate-400 w-10 font-mono">{formatTime(duration)}</span>
      </div>
      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-8">
        <button
          onClick={toggleRandom}
          className={`transition-colors p-2 ${isRandom
            ? 'text-white'
            : 'text-gray-500 hover:text-white'
            }`}
          title="Play Random (Shuffle)"
        >
          <FaRandom size={18} />
        </button>
        <button onClick={onPrev} className="text-slate-400 hover:text-white transition-colors">
          <FaStepBackward size={18} />
        </button>
        <button
          onClick={onTogglePlay}
          className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} className="ml-1" />}
        </button>
        <button onClick={onNext} className="text-slate-400 hover:text-white transition-colors">
          <FaStepForward size={18} />
        </button>
        <button
          onClick={toggleRepeat}
          className={`transition-colors p-2 ${isRepeat
            ? 'text-white'
            : 'text-gray-500 hover:text-white'
            }`}
          title="Play Loop (Repeat)"
        >
          <FaSync size={18} />
        </button>
      </div>
    </div>
  </div>
);
}