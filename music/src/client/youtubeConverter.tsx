import React, { useState } from 'react';
import { FaYoutube, FaDownload, FaMusic, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config.tsx';

export default function YoutubeConverter() {
  const [url, setUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('Vui lòng nhập link YouTube!');
      return;
    }

    try {
      setIsDownloading(true);
      setProgress(10);

      // We'll simulate some progress before the actual stream begins
      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 80 ? prev + Math.random() * 15 : prev));
      }, 500);

      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/api/youtube/download?url=${encodeURIComponent(url)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      clearInterval(progressInterval);
      setProgress(90);

      if (!response.ok) {
        let errorMsg = 'Lỗi khi tải nhạc. Vui lòng kiểm tra lại link.';
        try {
          const errData = await response.json();
          if (errData.msg) errorMsg = errData.msg;
        } catch {
          // ignore parsing error if it's not JSON
        }
        throw new Error(errorMsg);
      }

      // Check filename from Content-Disposition if available
      let filename = 'audio.m4a';
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Blob processing
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = decodeURIComponent(filename); // decode URI component in case it's encoded
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setProgress(100);
      toast.success('Tải thành công! File đã được lưu.');

      setTimeout(() => {
        setIsDownloading(false);
        setProgress(0);
        setUrl('');
      }, 1000);

    } catch (error) {
      console.error(error);
      setIsDownloading(false);
      setProgress(0);
      toast.error((error as Error).message || 'Lỗi khi kết nối đến máy chủ.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] px-4">
      <div className="max-w-xl w-full">
        {/* Header Title */}
        <div className="text-center mb-10 animate-[fade-in_0.5s_ease-out]">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 mb-6 shadow-[0_0_30px_rgba(239,68,68,0.15)] relative">
            <FaYoutube className="text-red-500 text-4xl" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-900">
              <FaMusic className="text-white text-xs" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-red-400 drop-shadow-sm mb-4 tracking-tight">
            Tải Nhạc YouTube
          </h1>
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            Chuyển đổi video YouTube yêu thích của bạn thành tệp âm thanh chỉ với một cú nhấp chuột.
          </p>
        </div>

        {/* Converter Card */}
        <div className="glass-panel p-8 rounded-3xl relative overflow-hidden animate-[slide-up_0.5s_ease-out_0.1s_both]">
          {/* Decorative background glow */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent"></div>

          <form onSubmit={handleDownload} className="relative z-10 space-y-6">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-slate-300 mb-2 ml-1">
                Đường dẫn Video YouTube
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaYoutube className="text-slate-400 group-focus-within:text-red-400 transition-colors" />
                </div>
                <input
                  id="url"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isDownloading}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl py-4 pl-12 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isDownloading || !url.trim()}
              className="w-full relative group overflow-hidden rounded-2xl p-[1px] disabled:opacity-50 transition-all duration-300"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-red-500 via-rose-500 to-red-500 rounded-2xl opacity-70 group-hover:opacity-100 blur-sm transition-opacity"></span>
              <span className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl"></span>
              <div className="relative flex items-center justify-center gap-3 bg-slate-900/40 px-8 py-4 rounded-2xl backdrop-blur-sm transition-all group-hover:bg-transparent">
                {isDownloading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="font-semibold text-white tracking-wide">Đang xử lý & Tải về...</span>
                  </>
                ) : (
                  <>
                    <FaDownload className="text-white" />
                    <span className="font-semibold text-white tracking-wide">Tải Nhạc Ngay</span>
                  </>
                )}
              </div>
            </button>
          </form>

          {/* Progress Bar (Visible during download) */}
          <div className={`mt-6 transition-all duration-500 ${isDownloading ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'}`}>
            <div className="flex justify-between text-xs text-slate-400 mb-2 font-medium">
              <span>Đang trích xuất âm thanh...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-rose-400 rounded-full transition-all duration-300 relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Info badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8 text-sm text-slate-400 animate-[fade-in_0.5s_ease-out_0.2s_both]">
          <div className="flex items-center gap-2 bg-slate-800/30 px-4 py-2 rounded-full border border-white/5">
            <FaCheckCircle className="text-green-400" /> Tốc độ cao
          </div>
          <div className="flex items-center gap-2 bg-slate-800/30 px-4 py-2 rounded-full border border-white/5">
            <FaCheckCircle className="text-green-400" /> Âm thanh tốt nhất
          </div>
          <div className="flex items-center gap-2 bg-slate-800/30 px-4 py-2 rounded-full border border-white/5">
            <FaExclamationCircle className="text-amber-400" /> Chỉ sử dụng cá nhân
          </div>
        </div>
      </div>
    </div>
  );
}
