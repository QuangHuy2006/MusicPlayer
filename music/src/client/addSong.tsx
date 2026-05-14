import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE } from '../config';
import { FaMusic, FaUser, FaImage, FaCloudUploadAlt, FaTimes, FaCheckCircle } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';

const AddSongPopup = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [name, setName] = useState('');
  const [author, setAuthor] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (image) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(image);
    } else {
      setImagePreview(null);
    }
  }, [image]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setName('');
    setAuthor('');
    setLyrics('');
    setFile(null);
    setImage(null);
    setImagePreview(null);
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name || !file) {
      setMessage({ text: 'Vui lòng nhập tên bài hát và chọn file MP3', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('file', file);
    if (image) {
      formData.append('image', image);
    }
    formData.append('author', author);
    formData.append('lyrics', lyrics);

    try {
      const res = await fetch(`${API_BASE}/api/songs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: 'Thêm nhạc thành công! Đang chờ quản trị viên duyệt.', type: 'success' });
        setTimeout(() => {
          resetForm();
          onClose();
        }, 2000);
      } else {
        setMessage({ text: data.msg || 'Lỗi khi thêm nhạc', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Lỗi kết nối server', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 animate-[fade-in_0.2s_ease-out]">
      <div className="glass-panel-3d w-full max-w-2xl overflow-hidden flex flex-col md:flex-row rounded-[32px] border border-white/10 shadow-2xl scale-100 animate-[zoom-in_0.3s_ease-out] relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full w-10 h-10 flex items-center justify-center z-10 border border-white/5"
        >
          <MdClose size={24} />
        </button>

        {/* Left Side: Preview & Visual */}
        <div className="w-full md:w-5/12 bg-gradient-to-br from-slate-900 to-black p-8 flex flex-col items-center justify-center border-r border-white/5">
          <div className="relative group">
            <div className={`w-48 h-48 rounded-[24px] overflow-hidden shadow-2xl border-2 ${imagePreview ? 'border-[var(--accent-gold)]/50' : 'border-dashed border-slate-700'} flex items-center justify-center transition-all duration-500 group-hover:scale-105`}>
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-slate-500">
                  <FaImage size={48} className="mb-3 opacity-20" />
                  <p className="text-xs font-medium uppercase tracking-wider">No Image</p>
                </div>
              )}
            </div>
            {imagePreview && (
              <div className="absolute -bottom-2 -right-2 bg-[var(--accent-gold)] text-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <FaCheckCircle size={16} />
              </div>
            )}
          </div>
          
          <div className="mt-8 text-center">
            <h3 className="text-xl font-bold text-white mb-2 truncate max-w-[200px]">{name || 'Tên bài hát'}</h3>
            <p className="text-[var(--accent-gold)] text-sm font-medium opacity-80 truncate max-w-[200px]">{author || 'Nghệ sĩ'}</p>
          </div>

          <div className="mt-auto w-full pt-8">
             <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-2 font-bold">File Information</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <FaMusic size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate font-medium">{file ? file.name : 'Chưa chọn file...'}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'MP3 Format'}</p>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 p-8 md:p-10 bg-[#0a0a0a]/40 backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
             <span className="w-8 h-1 bg-[var(--accent-gold)] rounded-full"></span>
             Thêm Nhạc Mới
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <FaMusic className="text-[var(--accent-gold)]" /> Tên bài hát
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập tên bài hát..."
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[var(--accent-gold)]/50 focus:ring-4 focus:ring-[var(--accent-gold)]/5 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <FaUser className="text-[var(--accent-gold)]" /> Nghệ sĩ / Tác giả
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Nhập tên nghệ sĩ..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[var(--accent-gold)]/50 focus:ring-4 focus:ring-[var(--accent-gold)]/5 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                Lời bài hát (Tùy chọn)
              </label>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="Nhập lời bài hát (nếu có)..."
                rows={3}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[var(--accent-gold)]/50 focus:ring-4 focus:ring-[var(--accent-gold)]/5 transition-all resize-none custom-scrollbar"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">File Nhạc (MP3)</label>
                <label className={`flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 hover:border-slate-600 bg-black/20'}`}>
                  <FaCloudUploadAlt size={20} className={file ? 'text-emerald-400' : 'text-slate-500'} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{file ? 'Đã chọn' : 'Chọn file'}</span>
                  <input type="file" accept="audio/mpeg" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ảnh Bìa</label>
                <label className={`flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${image ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-800 hover:border-slate-600 bg-black/20'}`}>
                  <FaImage size={20} className={image ? 'text-blue-400' : 'text-slate-500'} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{image ? 'Đã chọn' : 'Chọn ảnh'}</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
            </div>

            {message && (
              <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-[fade-in_0.3s_ease-out] ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {message.type === 'success' ? <FaCheckCircle /> : <FaTimes />}
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-[var(--accent-gold)] to-[#ffd700] hover:from-[#ffd700] hover:to-[var(--accent-gold)] text-black font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-[var(--accent-gold)]/20 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-3 overflow-hidden relative group"
            >
              <span className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[-20deg]"></span>
              <span className="relative z-10">{loading ? 'Đang xử lý...' : 'Thêm Nhạc Ngay'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.getElementById('portal')!);
};

export default AddSongPopup;
