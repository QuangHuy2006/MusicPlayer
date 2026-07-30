import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Song } from '../interface/song';
import * as offlineDb from '../utils/offlineDb';
import { useToast } from './ToastContext';

interface OfflineContextType {
  offlineSongs: Song[];
  downloadingIds: number[];
  downloadSong: (song: Song) => Promise<void>;
  deleteOfflineSong: (songId: number) => Promise<void>;
  isDownloaded: (songId: number) => boolean;
  isDownloading: (songId: number) => boolean;
  refreshOfflineSongs: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider = ({ children }: { children: ReactNode }) => {
  const [offlineSongs, setOfflineSongs] = useState<Song[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<number[]>([]);
  const { toast } = useToast();

  const refreshOfflineSongs = useCallback(async () => {
    try {
      const dbSongs = await offlineDb.getAllSongs();
      const mappedSongs: Song[] = dbSongs.map(s => ({
        id: s.id,
        name: s.name,
        url: s.imageUrl || '', // not used directly for playing, but conforms to Song interface
        status: 'approved',
        author: s.author,
        imageUrl: s.imageUrl,
        lyrics: s.lyrics
      }));
      setOfflineSongs(mappedSongs);
    } catch (e) {
      console.error('Failed to load offline songs:', e);
    }
  }, []);

  useEffect(() => {
    refreshOfflineSongs();
  }, [refreshOfflineSongs]);

  const isDownloaded = useCallback((songId: number) => {
    return offlineSongs.some(s => s.id === Number(songId));
  }, [offlineSongs]);

  const isDownloading = useCallback((songId: number) => {
    return downloadingIds.includes(Number(songId));
  }, [downloadingIds]);

  const downloadSong = async (song: Song) => {
    const songId = Number(song.id);
    if (isDownloaded(songId)) {
      toast.info(`Bài hát "${song.name}" đã được tải xuống trước đó.`);
      return;
    }
    if (isDownloading(songId)) {
      return;
    }

    // Check Premium/Admin status
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isPremium = user?.role === 'PREMIUM' || user?.role === 'ADMIN';

    if (!isPremium) {
      toast.error('Tải nhạc offline là tính năng PREMIUM! Vui lòng nâng cấp tài khoản để sử dụng. 💎');
      return;
    }

    try {
      setDownloadingIds(prev => [...prev, songId]);
      toast.info(`Đang tải xuống bài hát "${song.name}"...`);

      // 1. Fetch audio blob
      const audioResponse = await fetch(song.url);
      if (!audioResponse.ok) {
        throw new Error('Failed to fetch audio file');
      }
      const audioBlob = await audioResponse.blob();

      // 2. Fetch cover image blob if available
      let imageBlob: Blob | null = null;
      if (song.imageUrl) {
        try {
          const imgResponse = await fetch(song.imageUrl);
          if (imgResponse.ok) {
            imageBlob = await imgResponse.blob();
          }
        } catch (e) {
          console.warn('Failed to fetch cover image, continuing download without cover', e);
        }
      }

      // 3. Save to IndexedDB
      await offlineDb.saveSong(song, audioBlob, imageBlob);

      toast.success(`Đã tải xong bài hát "${song.name}" thành công!`);
      await refreshOfflineSongs();
    } catch (err) {
      console.error('Download error for song:', song.name, err);
      toast.error(`Lỗi tải nhạc "${song.name}". Vui lòng thử lại sau.`);
    } finally {
      setDownloadingIds(prev => prev.filter(id => id !== songId));
    }
  };

  const deleteOfflineSong = async (songId: number) => {
    try {
      const songToDelete = offlineSongs.find(s => s.id === Number(songId));
      await offlineDb.deleteSong(songId);
      toast.success(`Đã xóa bài hát "${songToDelete?.name || ''}" khỏi danh sách offline.`);
      await refreshOfflineSongs();
    } catch (e) {
      console.error('Delete offline song error:', e);
      toast.error('Không thể xóa bài hát offline.');
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        offlineSongs,
        downloadingIds,
        downloadSong,
        deleteOfflineSong,
        isDownloaded,
        isDownloading,
        refreshOfflineSongs
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
