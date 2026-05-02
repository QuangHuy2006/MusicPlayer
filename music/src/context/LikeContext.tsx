import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { API_BASE } from '../config';

interface LikeContextType {
  likedSongIds: Set<number>;
  toggleLike: (songId: number) => Promise<void>;
  loading: boolean;
}

const LikeContext = createContext<LikeContextType | undefined>(undefined);

export const LikeProvider = ({ children }: { children: ReactNode }) => {
  const [likedSongIds, setLikedSongIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLikes = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/likes`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (data.success) {
          setLikedSongIds(new Set(data.songs.map((s: any) => s.id)));
        }
      } catch (err) {
        console.error("Failed to fetch likes", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLikes();
  }, []);

  const toggleLike = async (songId: number) => {
    try {
      // Optimistic update
      setLikedSongIds(prev => {
        const next = new Set(prev);
        if (next.has(songId)) next.delete(songId);
        else next.add(songId);
        return next;
      });

      const res = await fetch(`${API_BASE}/api/likes/${songId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!data.success) {
        // Revert on error
        setLikedSongIds(prev => {
          const next = new Set(prev);
          if (next.has(songId)) next.delete(songId);
          else next.add(songId);
          return next;
        });
      }
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  return (
    <LikeContext.Provider value={{ likedSongIds, toggleLike, loading }}>
      {children}
    </LikeContext.Provider>
  );
};

export const useLike = () => {
  const context = useContext(LikeContext);
  if (context === undefined) {
    throw new Error('useLike must be used within a LikeProvider');
  }
  return context;
};
