export const SkeletonSongItem = () => {
  return (
    <div className="flex items-center p-3 rounded-2xl animate-pulse bg-slate-800/30 border border-slate-700/50">
      <div className="w-8 h-8 rounded bg-slate-700/50"></div>
      <div className="w-12 h-12 rounded-xl bg-slate-700/50 mx-3"></div>
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 bg-slate-700/50 rounded w-3/4"></div>
        <div className="h-3 bg-slate-700/50 rounded w-1/2"></div>
      </div>
      <div className="w-8 h-8 rounded bg-slate-700/50 ml-2"></div>
    </div>
  );
};

export const SkeletonPlaylistCard = () => {
  return (
    <div className="bg-slate-900/40 rounded-3xl overflow-hidden border border-slate-800 animate-pulse">
      <div className="aspect-video bg-slate-800/50"></div>
      <div className="p-5">
        <div className="h-5 bg-slate-700/50 rounded w-3/4 mb-3"></div>
        <div className="h-3 bg-slate-700/50 rounded w-1/2 mb-5"></div>
        <div className="h-10 bg-slate-800/80 rounded-xl w-full"></div>
      </div>
    </div>
  );
};

export const SkeletonSongCard = () => {
  return (
    <div className="bg-slate-900/40 rounded-3xl p-5 border border-slate-800 animate-pulse flex flex-col justify-between h-[180px]">
      <div>
        <div className="h-6 bg-slate-700/50 rounded w-3/4 mb-4"></div>
        <div className="h-5 bg-slate-700/50 rounded w-1/4"></div>
      </div>
      <div className="h-10 bg-slate-800/80 rounded-xl w-full mt-4"></div>
    </div>
  );
};
