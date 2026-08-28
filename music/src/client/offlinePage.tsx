import { useState, useEffect } from 'react';
import type { Song } from '../interface/song';
import { FaTrash, FaPlay, FaPause, FaDownload, FaWifi } from 'react-icons/fa';
import { MdOutlineOfflineBolt } from 'react-icons/md';
import { usePlayer } from '../context/PlayerContext';
import { useOffline } from '../context/OfflineContext';
import * as offlineDb from '../utils/offlineDb';

const OfflinePage = () => {
  const { currentSong, isPlaying, playSong } = usePlayer();
  const { offlineSongs, deleteOfflineSong } = useOffline();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const filteredSongs = offlineSongs.filter(song =>
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

  const handlePlaySong = async (song: Song) => {
    const dbSong = await offlineDb.getSong(song.id);
    if (dbSong && dbSong.audioBlob) {
      const objectUrl = URL.createObjectURL(dbSong.audioBlob);
      const playingSong: Song = {
        ...song,
        url: objectUrl,
      };
      if (dbSong.imageBlob) {
        playingSong.imageUrl = URL.createObjectURL(dbSong.imageBlob);
      }
      playSong(playingSong, filteredSongs);
    } else {
      playSong(song, filteredSongs);
    }
  };

  const handlePlayAll = async () => {
    if (filteredSongs.length === 0) return;
    handlePlaySong(filteredSongs[0]);
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // We can calculate approximate storage size based on blobs
  const [dbSize, setDbSize] = useState<string>('Calculating...');

  useEffect(() => {
    const calcSize = async () => {
      try {
        const songs = await offlineDb.getAllSongs();
        let total = 0;
        songs.forEach(s => {
          total += s.audioBlob.size;
          if (s.imageBlob) total += s.imageBlob.size;
        });
        setDbSize(formatBytes(total));
      } catch {
        setDbSize('Unknown');
      }
    };
    calcSize();
  }, [offlineSongs]);

  return (
    <div className="p-4 md:p-10 space-y-12 animate-fade-in custom-scrollbar">
      {/* Header Section */}
      <section className="relative overflow-hidden rounded-[40px] group">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-600/20 to-indigo-600/20 group-hover:scale-110 transition-transform duration-1000"></div>
        <div className="glass-panel-3d border-0 p-6 md:p-12 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-sky-500/20 animate-pulse">
              <MdOutlineOfflineBolt size={48} />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl md:text-5xl font-black text-white">Thư viện <span className="text-sky-400">Offline</span></h1>
              <p className="text-slate-400 font-medium">
                {offlineSongs.length} giai điệu chất lượng cao đã tải xuống • Dung lượng: {dbSize}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Status indicators */}
            <div className={`px-4 py-2 rounded-full border text-xs font-black flex items-center gap-2 ${isOnline
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
              {isOnline ? <FaWifi /> : <MdOutlineOfflineBolt />}
              {isOnline ? 'Đang Trực Tuyến' : 'Đang Ngoại Tuyến (Offline Mode)'}
            </div>

            {offlineSongs.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="px-6 py-3 bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-sky-500/20 transition-all transform hover:scale-105"
              >
                Phát Tất Cả
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Search Input */}
      {offlineSongs.length > 0 && (
        <div className="max-w-5xl mx-auto">
          <input
            type="text"
            placeholder="Tìm kiếm bài hát, nghệ sĩ trong thư viện offline..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-sky-500/50 focus:ring-4 focus:ring-sky-500/5 transition-all text-sm font-semibold placeholder-slate-500"
          />
        </div>
      )}

      {/* List Section */}
      {offlineSongs.length === 0 ? (
        <div className="text-center py-24 glass-panel-3d rounded-[40px] border-0 max-w-4xl mx-auto">
          <div className="w-20 h-20 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-6">
            <FaDownload className="text-4xl text-sky-400 opacity-40" />
          </div>
          <h3 className="text-2xl font-black text-white">Chưa có nhạc offline</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto font-medium text-sm leading-relaxed px-4">
            Nâng cấp PREMIUM ngay và click vào biểu tượng Tải xuống ở các bài hát để lưu nhạc offline. Nghe mọi lúc mọi nơi không cần Internet!
          </p>
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="text-center py-20 glass-panel-3d rounded-[40px] border-0 max-w-5xl mx-auto">
          <h3 className="text-xl font-bold text-white">Không tìm thấy bài hát nào</h3>
          <p className="text-slate-500 mt-2 font-medium">Thử nhập từ khóa khác xem sao nhé.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-5xl mx-auto">
          <div className="flex items-center px-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
            <div className="w-12">#</div>
            <div className="flex-1">Bài hát</div>
            <div className="hidden md:block w-48">Nghệ sĩ</div>
            <div className="w-24 text-right">Hành động</div>
          </div>

          {paginatedSongs.map((song, index) => {
            const isActive = currentSong?.id === song.id;
            const globalIndex = (currentPage - 1) * itemsPerPage + index;
            return (
              <div
                key={song.id}
                onClick={() => handlePlaySong(song)}
                className={`group flex items-center p-4 rounded-[24px] transition-all duration-300 cursor-pointer border ${isActive
                  ? 'bg-sky-500/10 border-sky-500/20'
                  : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/5'
                  }`}
              >
                {/* Number or Equalizer */}
                <div className="w-12 text-xs font-black text-slate-600 group-hover:text-sky-400 transition-colors">
                  {isActive && isPlaying ? (
                    <div className="flex items-end gap-0.5 h-3 justify-center">
                      <div className="w-1 bg-sky-400 animate-[bounce_0.8s_infinite] rounded-full" style={{ height: '60%' }}></div>
                      <div className="w-1 bg-sky-400 animate-[bounce_1.2s_infinite] rounded-full" style={{ height: '100%' }}></div>
                      <div className="w-1 bg-sky-400 animate-[bounce_1s_infinite] rounded-full" style={{ height: '40%' }}></div>
                    </div>
                  ) : (
                    String(globalIndex + 1).padStart(2, '0')
                  )}
                </div>

                {/* Cover Image */}
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-lg mx-4 shrink-0 bg-slate-800">
                  <img
                    src={song.imageUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80'}
                    alt={song.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80';
                    }}
                  />
                  <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {isActive && isPlaying ? (
                      <FaPause className="text-sky-400 text-xl" />
                    ) : (
                      <FaPlay className="text-sky-400 text-xl ml-1" />
                    )}
                  </div>
                </div>

                {/* Song title */}
                <div className="flex-1 min-w-0">
                  <h4 className={`font-black truncate transition-colors ${isActive ? 'text-sky-400' : 'text-slate-100 group-hover:text-sky-300'}`}>
                    {song.name}
                  </h4>
                  <p className="md:hidden text-xs text-slate-500 font-bold uppercase tracking-wider mt-1 truncate">{song.author || 'Unknown'}</p>
                </div>

                {/* Artist */}
                <div className="hidden md:block w-48 text-sm font-bold text-slate-400 truncate">
                  {song.author || 'Unknown Artist'}
                </div>

                {/* Delete button */}
                <div className="flex items-center gap-2 w-24 justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Bạn có chắc chắn muốn xóa bài hát offline "${song.name}"?`)) {
                        deleteOfflineSong(song.id);
                      }
                    }}
                    className="p-3 text-slate-600 hover:text-red-400 hover:scale-110 transition-all rounded-full hover:bg-red-500/10"
                    title="Xóa offline"
                  >
                    <FaTrash size={14} />
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
          >
            Trước
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all ${currentPage === page
                ? 'bg-gradient-to-r from-sky-400 to-indigo-500 text-white shadow-lg shadow-sky-500/20'
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
    </div>
  );
};

export default OfflinePage;
