import { useNotification } from '../context/NotificationContext';
import {
  FaBell, FaCheckCircle, FaTimesCircle, FaCommentAlt,
  FaCog, FaTimes, FaCheckDouble
} from 'react-icons/fa';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'song_approved': return <FaCheckCircle className="text-emerald-400" size={18} />;
      case 'song_rejected': return <FaTimesCircle className="text-red-400" size={18} />;
      case 'new_comment': return <FaCommentAlt className="text-cyan-400" size={18} />;
      default: return <FaCog className="text-slate-400" size={18} />;
    }
  };

  const getTimeDiff = (dateStr: string) => {
    // eslint-disable-next-line react-hooks/purity
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  return (
    <div className="fixed inset-0 z-[300]" onClick={onClose}>
      <div
        className="absolute top-16 right-4 md:right-10 w-[380px] max-h-[70vh] glass-panel-3d rounded-3xl overflow-hidden shadow-2xl animate-[fade-in_0.2s_ease-out] border border-white/10 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <FaBell className="text-[var(--accent-gold)]" />
            <h3 className="text-lg font-black text-white">Thông báo</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[var(--accent-gold)] hover:text-white font-bold flex items-center gap-1 transition-colors"
              >
                <FaCheckDouble size={12} /> Đọc tất cả
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white transition-colors">
              <FaTimes size={16} />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="py-16 text-center">
              <FaBell className="text-4xl text-slate-600 mx-auto mb-4 opacity-30" />
              <p className="text-slate-500 text-sm">Không có thông báo nào</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                  className={`p-4 rounded-2xl transition-all cursor-pointer ${notification.is_read
                    ? 'bg-transparent hover:bg-white/5'
                    : 'bg-white/5 hover:bg-white/8 border-l-2 border-[var(--accent-gold)]'
                    }`}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5 shrink-0">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className={`text-sm font-bold ${notification.is_read ? 'text-slate-300' : 'text-white'}`}>
                        {notification.title}
                      </p>
                      <p className={`text-xs ${notification.is_read ? 'text-slate-500' : 'text-slate-400'} line-clamp-2`}>
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-slate-600 font-medium">
                        {getTimeDiff(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 rounded-full bg-[var(--accent-gold)] mt-2 shrink-0 animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.6)]"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
