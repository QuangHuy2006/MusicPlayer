// @refresh reset
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Song } from '../interface/song';
import { API_BASE } from '../config.tsx';

interface PlayerContextType {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  isRandom: boolean;
  isRepeat: boolean;
  playSong: (song: Song, queue?: Song[]) => void;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleRandom: () => void;
  toggleRepeat: () => void;
  setVolume: (vol: number) => void;
  volume: number;
  sleepTimer: number | null;
  setSleepTimer: (minutes: number | null) => void;
  sleepTimeRemaining: number | null; // seconds remaining
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  // Khôi phục bài hát cuối cùng từ localStorage khi mở app (giống Spotify)
  const [currentSong, setCurrentSong] = useState<Song | null>(() => {
    try {
      const saved = localStorage.getItem('lastPlayedSong');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [queue, setQueue] = useState<Song[]>(() => {
    try {
      const saved = localStorage.getItem('lastQueue');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isPlaying, setIsPlaying] = useState(false); // Không tự play khi mở lại app
  const [isRandom, setIsRandom] = useState(() => {
    return localStorage.getItem('playerRandom') === 'true';
  });
  const [isRepeat, setIsRepeat] = useState(() => {
    return localStorage.getItem('playerRepeat') === 'true';
  });
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('playerVolume');
    return saved ? parseFloat(saved) : 1;
  });
  const [sleepTimer, setSleepTimerState] = useState<number | null>(null);
  const [sleepTimerEnd, setSleepTimerEnd] = useState<number | null>(null);
  const [sleepTimeRemaining, setSleepTimeRemaining] = useState<number | null>(null);
  console.log(sleepTimerEnd);

  // Lưu bài hát hiện tại vào localStorage mỗi khi thay đổi
  useEffect(() => {
    if (currentSong) {
      try {
        // Lưu bài hát (bỏ blob URL vì không thể serialize)
        const songToSave = { ...currentSong };
        if (songToSave.url?.startsWith('blob:')) {
          songToSave.url = '';
        }
        localStorage.setItem('lastPlayedSong', JSON.stringify(songToSave));
      } catch (e) { console.error('Error saving last song:', e); }
    }
  }, [currentSong]);

  // Lưu queue vào localStorage (giới hạn 50 bài để tránh tràn bộ nhớ)
  useEffect(() => {
    try {
      const queueToSave = queue.slice(0, 50).map(s => {
        const copy = { ...s };
        if (copy.url?.startsWith('blob:')) copy.url = '';
        return copy;
      });
      localStorage.setItem('lastQueue', JSON.stringify(queueToSave));
    } catch (e) { console.error('Error saving queue:', e); }
  }, [queue]);


  // Sleep Timer logic
  useEffect(() => {
    if (sleepTimer !== null) {
      const targetTime = Date.now() + sleepTimer * 60000;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSleepTimerEnd(targetTime);

      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
        setSleepTimeRemaining(remaining);

        if (Date.now() >= targetTime) {
          setIsPlaying(false);
          setSleepTimerState(null);
          setSleepTimerEnd(null);
          setSleepTimeRemaining(null);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setSleepTimerEnd(null);
      setSleepTimeRemaining(null);
    }
  }, [sleepTimer]);

  const setSleepTimer = (minutes: number | null) => {
    setSleepTimerState(minutes);
  };

  // Track xem bài hát hiện tại có phải đang được khôi phục từ localStorage không
  // Nếu là restore thì KHÔNG gọi API history (tránh lỗi 401 redirect xóa data)
  const isRestoredRef = useRef(true); // true = vừa khôi phục từ localStorage

  useEffect(() => {
    if (currentSong) {
      // Bỏ qua nếu đang restore từ localStorage
      if (isRestoredRef.current) {
        isRestoredRef.current = false;
        return;
      }
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`${API_BASE}/api/history/${currentSong.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => console.error("History error:", err));
      }
    }
  }, [currentSong]);

  const playSong = (song: Song, newQueue?: Song[]) => {
    isRestoredRef.current = false; // User chủ động play → không phải restore
    setCurrentSong(song);
    setIsPlaying(true);
    if (newQueue) {
      setQueue(newQueue);
    }
  };

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleRandom = () => {
    const next = !isRandom;
    setIsRandom(next);
    localStorage.setItem('playerRandom', String(next));
  };
  const toggleRepeat = () => {
    const next = !isRepeat;
    setIsRepeat(next);
    localStorage.setItem('playerRepeat', String(next));
  };

  const playNext = () => {
    if (queue.length === 0 || !currentSong) return;

    if (isRepeat) {
      // Repeat is handled by audio element looping or just re-playing current song
      // But if user clicks "next", we should still go to next song even if repeat is on
    }

    if (isRandom) {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * queue.length);
      } while (nextIndex === queue.findIndex(s => s.id === currentSong.id) && queue.length > 1);
      setCurrentSong(queue[nextIndex]);
      setIsPlaying(true);
      return;
    }

    const currentIndex = queue.findIndex(s => s.id === currentSong.id);
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      setCurrentSong(queue[currentIndex + 1]);
      setIsPlaying(true);
    } else {
      // Loop back to start
      setCurrentSong(queue[0]);
      setIsPlaying(true);
    }
  };

  const playPrevious = () => {
    if (queue.length === 0 || !currentSong) return;

    if (isRandom) {
      let prevIndex;
      do {
        prevIndex = Math.floor(Math.random() * queue.length);
      } while (prevIndex === queue.findIndex(s => s.id === currentSong.id) && queue.length > 1);
      setCurrentSong(queue[prevIndex]);
      setIsPlaying(true);
      return;
    }

    const currentIndex = queue.findIndex(s => s.id === currentSong.id);
    if (currentIndex > 0) {
      setCurrentSong(queue[currentIndex - 1]);
      setIsPlaying(true);
    } else {
      // Loop to end
      setCurrentSong(queue[queue.length - 1]);
      setIsPlaying(true);
    }
  };

  const setVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    localStorage.setItem('playerVolume', String(clamped));
  };

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        queue,
        isPlaying,
        isRandom,
        isRepeat,
        playSong,
        togglePlay,
        setIsPlaying,
        playNext,
        playPrevious,
        toggleRandom,
        toggleRepeat,
        volume,
        setVolume,
        sleepTimer,
        setSleepTimer,
        sleepTimeRemaining
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
