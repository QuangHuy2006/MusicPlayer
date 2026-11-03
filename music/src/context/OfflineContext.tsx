import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Song } from '../interface/song';
import * as offlineDb from '../utils/offlineDb';
import { useToast } from './ToastContext';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  const refreshOfflineSongs = useCallback(async () => {
    try {
      const dbSongs = await offlineDb.getAllSongs();
      const mappedSongs: Song[] = dbSongs.map(s => ({
        id: s.id,
        name: s.name,
        url: s.imageUrl || '',
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      toast.info(t('toasts.song_already_offline', { name: song.name }));
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
      toast.error(t('toasts.premium_offline_required'));
      return;
    }

    try {
      setDownloadingIds(prev => [...prev, songId]);
      toast.info(t('toasts.downloading_song', { name: song.name }));

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

      toast.success(t('toasts.download_song_success', { name: song.name }));
      await refreshOfflineSongs();
    } catch (err) {
      console.error('Download error for song:', song.name, err);
      toast.error(t('toasts.download_song_error', { name: song.name }));
    } finally {
      setDownloadingIds(prev => prev.filter(id => id !== songId));
    }
  };

  const deleteOfflineSong = async (songId: number) => {
    try {
      const songToDelete = offlineSongs.find(s => s.id === Number(songId));
      await offlineDb.deleteSong(songId);
      toast.success(t('toasts.removed_offline_song', { name: songToDelete?.name || '' }));
      await refreshOfflineSongs();
    } catch (e) {
      console.error('Delete offline song error:', e);
      toast.error(t('toasts.cannot_delete_offline'));
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

// eslint-disable-next-line react-refresh/only-export-components
export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
