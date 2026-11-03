import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import type { Song } from '../interface/song';
import { API_BASE } from '../config.tsx';
import { FaHeart, FaPlay, FaPause, FaEllipsisH, FaDownload, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { MdFavorite } from 'react-icons/md';
import { usePlayer } from '../context/PlayerContext';
import { useLike } from '../context/LikeContext';
import { useOffline } from '../context/OfflineContext';
import { SkeletonSongItem } from '../components/Skeleton';
import AddToPlaylistModal from './addToPlaylistModal';

const LikedSongs = () => {
  const { t } = useTranslation();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
  const { currentSong, isPlaying, playSong } = usePlayer();
  const { toggleLike } = useLike();
  const { downloadSong, deleteOfflineSong, isDownloaded, isDownloading } = useOffline();
  const token = localStorage.getItem('token');

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchLikedSongs = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/likes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setSongs(data.songs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLikedSongs();
  }, [token]);

  const handleUnlike = async (e: React.MouseEvent, songId: number) => {
    e.stopPropagation();
    await toggleLike(songId);
    setSongs(songs.filter(s => s.id !== songId));
  };

  const filteredSongs = songs.filter(song =>
    song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (song.author && song.author.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredSongs.length / itemsPerPage);
  const paginatedSongs = filteredSongs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-10 space-y-10 animate-fade-in">
        <div className="h-40 w-full bg-white/5 rounded-[40px] animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonSongItem key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-8 animate-fade-in custom-scrollbar">
      {/* Header Section */}
      <section className="relative overflow-hidden rounded-[40px] group">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-600/20 to-rose-600/20 group-hover:scale-110 transition-transform duration-1000"></div>
        <div className="glass-panel-3d border-0 p-8 md:p-12 relative z-10 flex items-center gap-8">
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-2xl shadow-pink-500/20">
            <MdFavorite size={48} />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black text-white">{t("liked.title")}</h1>
            <p className="text-slate-400 font-medium">{t("liked.subtitle", { count: filteredSongs.length })}</p>
          </div>
        </div>
      </section>

      {/* Search Input */}
      {songs.length > 0 && (
        <div className="max-w-5xl mx-auto">
          <input
            type="text"
            placeholder={t("liked.search_placeholder")}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-pink-500/50 focus:ring-4 focus:ring-pink-500/5 transition-all text-sm font-semibold placeholder-slate-500"
          />
        </div>
      )}

      {/* List Section */}
      {songs.length === 0 ? (
        <div className="text-center py-32 glass-panel-3d rounded-[40px] border-0">
          <FaHeart className="text-8xl text-pink-500 opacity-10 mx-auto mb-6" />
          <h3 className="text-2xl font-black text-white">{t("liked.empty_title")}</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto font-medium">
            {t("liked.empty_desc")}
          </p>
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="text-center py-20 glass-panel-3d rounded-[40px] border-0 max-w-5xl mx-auto">
          <h3 className="text-xl font-bold text-white">{t("liked.not_found")}</h3>
          <p className="text-slate-500 mt-2 font-medium">{t('history.try_different_keyword')}</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-5xl mx-auto">
          <div className="flex items-center px-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
            <div className="w-12">#</div>
            <div className="flex-1">{t('table.song')}</div>
            <div className="hidden md:block w-48">{t('table.artist')}</div>
            <div className="w-20 text-right">{t('table.actions')}</div>
          </div>

          {paginatedSongs.map((song, index) => {
            const isActive = currentSong?.id === song.id;
            const globalIndex = (currentPage - 1) * itemsPerPage + index;
            return (
              <div
                key={song.id}
                onClick={() => playSong(song, filteredSongs)}
                className={`group flex items-center p-4 rounded-[24px] transition-all duration-300 cursor-pointer border ${isActive
                    ? 'bg-pink-500/10 border-pink-500/20'
                    : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/5'
                  }`}
              >
                <div className="w-12 text-xs font-black text-slate-600 group-hover:text-pink-500 transition-colors">
                  {isActive && isPlaying ? (
                    <div className="flex items-end gap-0.5 h-3 justify-center">
                      <div className="w-1 bg-pink-500 animate-[bounce_0.8s_infinite] rounded-full" style={{ height: '60%' }}></div>
                      <div className="w-1 bg-pink-500 animate-[bounce_1.2s_infinite] rounded-full" style={{ height: '100%' }}></div>
                      <div className="w-1 bg-pink-500 animate-[bounce_1s_infinite] rounded-full" style={{ height: '40%' }}></div>
                    </div>
                  ) : (
                    String(globalIndex + 1).padStart(2, '0')
                  )}
                </div>

                <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-lg mx-4 shrink-0">
                  <img
                    src={song.imageUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80'}
                    alt={song.name}
                    className="w-full h-full object-cover"
                  />
                  <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {isActive && isPlaying ? (
                      <FaPause className="text-pink-400 text-xl" />
                    ) : (
                      <FaPlay className="text-pink-400 text-xl ml-1" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className={`font-black truncate transition-colors ${isActive ? 'text-pink-400' : 'text-slate-100 group-hover:text-pink-300'}`}>
                    {song.name}
                  </h4>
                  <p className="md:hidden text-xs text-slate-500 font-bold uppercase tracking-wider mt-1 truncate">{song.author || 'Unknown'}</p>
                </div>

                <div className="hidden md:block w-48 text-sm font-bold text-slate-400 truncate">
                  {song.author || 'Unknown Artist'}
                </div>

                <div className="flex items-center gap-1 w-28 justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isDownloaded(song.id)) {
                        if (confirm(t('dashboard.confirm_remove_offline', { name: song.name }))) {
                          deleteOfflineSong(song.id);
                        }
                      } else if (!isDownloading(song.id)) {
                        downloadSong(song);
                      }
                    }}
                    className={`p-2 rounded-full transition-all ${
                      isDownloaded(song.id)
                        ? 'text-emerald-400 hover:text-red-400'
                        : isDownloading(song.id)
                        ? 'text-sky-400 animate-spin'
                        : 'text-slate-600 hover:text-sky-400 opacity-0 group-hover:opacity-100'
                    }`}
                    title={isDownloaded(song.id) ? t('dashboard.downloaded_tooltip') : isDownloading(song.id) ? t('dashboard.downloading_tooltip') : t('dashboard.download_tooltip')}
                  >
                    {isDownloaded(song.id) ? <FaCheckCircle size={14} /> : isDownloading(song.id) ? <FaSpinner size={14} /> : <FaDownload size={14} />}
                  </button>
                  <button
                    onClick={(e) => handleUnlike(e, song.id)}
                    className="p-2 text-pink-500 hover:scale-120 transition-transform"
                    title={t("liked.unlike_tooltip")}
                  >
                    <FaHeart size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedSongId(song.id); }}
                    className="p-2 text-slate-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <FaEllipsisH />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8 max-w-5xl mx-auto">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none rounded-xl border border-white/5 transition-all"
          >{t("table.prev")}</button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                currentPage === page
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/20'
                  : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none rounded-xl border border-white/5 transition-all"
          >
            Sau
          </button>
        </div>
      )}

      <AddToPlaylistModal
        isOpen={selectedSongId !== null}
        onClose={() => setSelectedSongId(null)}
        songId={selectedSongId!}
      />
    </div>
  );
};

export default LikedSongs;
