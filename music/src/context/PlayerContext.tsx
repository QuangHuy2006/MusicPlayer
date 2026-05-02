import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type Song from '../interface/song';
import { API_BASE } from '../config';

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
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRandom, setIsRandom] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [volume, setVolumeState] = useState(1); // 0 to 1

  useEffect(() => {
    if (currentSong) {
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
    setCurrentSong(song);
    setIsPlaying(true);
    if (newQueue) {
      setQueue(newQueue);
    }
  };

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleRandom = () => setIsRandom(!isRandom);
  const toggleRepeat = () => setIsRepeat(!isRepeat);

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
    setVolumeState(Math.max(0, Math.min(1, vol)));
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
        setVolume
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
