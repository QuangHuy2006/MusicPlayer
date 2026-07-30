import { useState, useEffect } from 'react';
import { API_BASE } from '../config.tsx';
import {
  FaCrown, FaTrophy, FaPlay, FaFire, FaMedal,
  FaUserCircle, FaChartLine
} from 'react-icons/fa';
import { MdLeaderboard } from 'react-icons/md';
import { usePlayer } from '../context/PlayerContext';

const LeaderboardPage = () => {
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'songs' | 'users'>('songs');
  const { playSong, currentSong, isPlaying } = usePlayer();
  const token = localStorage.getItem('token');

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setTopSongs(data.topSongs || []);
          setTopUsers(data.topUsers || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [token]);

  const handleTabChange = (tab: 'songs' | 'users') => {
    setActiveTab(tab);
    setSearchQuery('');
    setCurrentPage(1);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <FaCrown className="text-white" size={20} />;
    if (rank === 2) return <FaMedal className="text-gray-300" size={18} />;
    if (rank === 3) return <FaMedal className="text-gray-500" size={18} />;
    return <span className="text-gray-500 font-bold text-sm">{String(rank).padStart(2, '0')}</span>;
  };

  const getRankGradient = (rank: number) => {
    if (rank === 1) return 'border-white';
    if (rank === 2) return 'border-gray-300';
    if (rank === 3) return 'border-gray-500';
    return 'border-transparent';
  };

  // Filter & Paginate Songs
  const filteredSongs = topSongs.filter(song =>
    song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (song.author && song.author.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const totalPagesSongs = Math.ceil(filteredSongs.length / itemsPerPage);
  const paginatedSongs = filteredSongs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Filter & Paginate Users
  const filteredUsers = topUsers.filter(user =>
    (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const totalPagesUsers = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    const maxPage = activeTab === 'songs' ? totalPagesSongs : totalPagesUsers;
    if (page >= 1 && page <= maxPage) {
      setCurrentPage(page);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-10 space-y-10 animate-fade-in">
        <div className="h-48 w-full bg-white/5 rounded-[40px] animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-20 bg-white/5 rounded-[24px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 space-y-8 animate-fade-in custom-scrollbar">

      {/* Hero Header */}
      <section className="border-b border-[#333] pb-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white flex items-center justify-center text-black">
            <MdLeaderboard size={40} />
          </div>
          <div className="text-center md:text-left space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#333] text-xs font-medium text-white uppercase tracking-wider">
              <FaFire /> Live Ranking
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white">
              Bảng Xếp Hạng
            </h1>
            <p className="text-gray-400 text-sm max-w-xl">
              Khám phá những bài hát và thính giả thịnh hành nhất trên nền tảng.
            </p>
          </div>
        </div>
      </section>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-[#333] w-full max-w-4xl mx-auto">
        <button
          onClick={() => handleTabChange('songs')}
          className={`px-6 py-3 font-medium text-sm transition-all flex items-center gap-2 border-b-2 ${activeTab === 'songs' ? 'border-white text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          <FaTrophy /> Top Bài Hát
        </button>
        <button
          onClick={() => handleTabChange('users')}
          className={`px-6 py-3 font-medium text-sm transition-all flex items-center gap-2 border-b-2 ${activeTab === 'users' ? 'border-white text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          <FaChartLine /> Top Thính Giả
        </button>
      </div>

      {/* Search Input */}
      {((activeTab === 'songs' && topSongs.length > 0) || (activeTab === 'users' && topUsers.length > 0)) && (
        <div className="max-w-4xl mx-auto mt-4">
          <input
            type="text"
            placeholder={activeTab === 'songs' ? 'Tìm kiếm bài hát, nghệ sĩ xếp hạng...' : 'Tìm kiếm thính giả...'}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full bg-transparent border border-[#333] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white transition-all text-sm font-medium placeholder-gray-500"
          />
        </div>
      )}

      {/* Top Songs Tab */}
      {activeTab === 'songs' && (
        <section className="max-w-4xl mx-auto space-y-3">
          {/* Top 3 Podium (Only show when there is no active search query for better UX) */}
          {searchQuery === '' && topSongs.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-10">
              {[topSongs[1], topSongs[0], topSongs[2]].map((song, i) => {
                const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
                return (
                  <div
                    key={song.id}
                    onClick={() => playSong(song, topSongs)}
                    className="flex flex-col items-center justify-end cursor-pointer group h-52"
                  >
                    <div className="relative mb-3">
                      <div className={`${rank === 1 ? 'w-20 h-20 md:w-24 md:h-24' : 'w-16 h-16 md:w-20 md:h-20'} rounded-full overflow-hidden border-2 ${getRankGradient(rank)} group-hover:scale-105 transition-transform`}>
                        <img src={song.imageUrl || song.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center bg-[#111] border border-[#333]">
                        {getRankIcon(rank)}
                      </div>
                    </div>
                    <p className="text-xs md:text-sm font-medium text-white text-center truncate w-full px-2">{song.name}</p>
                    <p className="text-[10px] text-gray-500 truncate w-full text-center">{song.author}</p>
                    <span className="text-[10px] font-medium text-gray-400 bg-[#222] px-2 py-1 rounded mt-2">{song.playCount} plays</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* List header */}
          {filteredSongs.length > 0 && (
            <div className="flex items-center px-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
              <div className="w-12">#</div>
              <div className="flex-1">Bài hát</div>
              <div className="hidden md:block w-40">Nghệ sĩ</div>
              <div className="w-24 text-right">Lượt nghe</div>
            </div>
          )}

          {paginatedSongs.map((song) => {
            const isActive = currentSong?.id === song.id;
            // Find rank in original unsorted array if we searched, otherwise it's just globalIndex + 1
            const rank = topSongs.findIndex(s => s.id === song.id) + 1;

            return (
              <div
                key={song.id}
                onClick={() => playSong(song, filteredSongs)}
                className={`group flex items-center p-4 rounded-xl transition-all duration-300 cursor-pointer border-b border-[#222] bg-transparent ${isActive ? 'bg-[#111]' : 'hover:bg-[#111]'}`}
              >
                <div className="w-12 flex items-center justify-center">
                  {isActive && isPlaying ? (
                    <div className="flex items-end gap-0.5 h-3 justify-center">
                      <div className="w-1 bg-white animate-[bounce_0.8s_infinite] rounded-full" style={{ height: '60%' }}></div>
                      <div className="w-1 bg-white animate-[bounce_1.2s_infinite] rounded-full" style={{ height: '100%' }}></div>
                      <div className="w-1 bg-white animate-[bounce_1s_infinite] rounded-full" style={{ height: '40%' }}></div>
                    </div>
                  ) : (
                    getRankIcon(rank)
                  )}
                </div>
                <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg mx-4 shrink-0 group-hover:shadow-xl transition-shadow">
                  <img src={song.imageUrl || song.image_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium text-sm truncate ${isActive ? 'text-white' : 'text-white'}`}>{song.name}</h4>
                  <p className="md:hidden text-xs text-slate-500 truncate">{song.author || 'Unknown'}</p>
                </div>
                <div className="hidden md:block w-40 text-sm font-medium text-slate-400 truncate">{song.author || 'Unknown'}</div>
                <div className="w-24 text-right">
                  <span className="text-xs font-medium text-gray-400 inline-flex items-center gap-1">
                    <FaPlay size={8} /> {song.playCount}
                  </span>
                </div>
              </div>
            );
          })}

          {topSongs.length === 0 ? (
            <div className="text-center py-20 border border-[#333] rounded-xl border-dashed">
              <FaTrophy className="text-6xl text-gray-800 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-500">Chưa có dữ liệu</h3>
              <p className="text-gray-600 mt-2">Hãy nghe nhạc để bảng xếp hạng hoạt động!</p>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="text-center py-20 border border-[#333] rounded-xl">
              <h3 className="text-lg font-medium text-gray-500">Không tìm thấy kết quả nào</h3>
            </div>
          ) : null}

          {/* Pagination for Songs */}
          {totalPagesSongs > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-transparent hover:bg-[#222] disabled:opacity-30 disabled:pointer-events-none rounded border border-[#333] transition-all"
              >
                Trước
              </button>
              {Array.from({ length: totalPagesSongs }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                    currentPage === page
                      ? 'bg-gradient-to-r from-[var(--accent-gold)] to-amber-500 text-black shadow-lg shadow-[var(--accent-gold)]/20'
                      : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPagesSongs}
                className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-transparent hover:bg-[#222] disabled:opacity-30 disabled:pointer-events-none rounded border border-[#333] transition-all"
              >
                Sau
              </button>
            </div>
          )}
        </section>
      )}

      {/* Top Users Tab */}
      {activeTab === 'users' && (
        <section className="max-w-3xl mx-auto space-y-4">
          {paginatedUsers.map((user, index) => {
            const maxCount = topUsers[0]?.playCount || 1;
            const percentage = Math.round((user.playCount / maxCount) * 100);
            const globalIndex = (currentPage - 1) * itemsPerPage + index;
            // Find rank in original unsorted array if we searched, otherwise it's just globalIndex + 1
            const rank = topUsers.findIndex(u => u.id === user.id) + 1;

            return (
              <div key={user.id || globalIndex} className="group p-5 rounded-xl transition-all duration-300 border-b border-[#222] bg-transparent hover:bg-[#111]">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-10 flex items-center justify-center">
                    {getRankIcon(rank)}
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-[#222]">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FaUserCircle className="text-gray-500" size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-white truncate">{user.name || 'User'}</h4>
                    <p className="text-xs text-gray-500">{user.playCount} lượt nghe</p>
                  </div>
                  <span className="text-xs font-medium text-gray-400">{percentage}%</span>
                </div>
                <div className="h-1 bg-[#222] rounded-full overflow-hidden ml-14">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-1000"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}

          {topUsers.length === 0 ? (
            <div className="text-center py-20 border border-[#333] border-dashed rounded-xl">
              <FaChartLine className="text-6xl text-gray-800 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-500">Chưa có dữ liệu</h3>
              <p className="text-gray-600 mt-2">Bảng xếp hạng sẽ cập nhật khi có người nghe nhạc!</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20 border border-[#333] rounded-xl">
              <h3 className="text-lg font-medium text-gray-500">Không tìm thấy thính giả nào</h3>
            </div>
          ) : null}

          {/* Pagination for Users */}
          {totalPagesUsers > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-transparent hover:bg-[#222] disabled:opacity-30 disabled:pointer-events-none rounded border border-[#333] transition-all"
              >
                Trước
              </button>
              {Array.from({ length: totalPagesUsers }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium transition-all ${
                    currentPage === page
                      ? 'bg-white text-black'
                      : 'text-gray-400 hover:text-white bg-transparent hover:bg-[#222] border border-[#333]'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPagesUsers}
                className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-transparent hover:bg-[#222] disabled:opacity-30 disabled:pointer-events-none rounded border border-[#333] transition-all"
              >
                Sau
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default LeaderboardPage;
