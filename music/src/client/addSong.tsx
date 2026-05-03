import { useState } from 'react';
import { API_BASE } from '../config';

const AddSongPopup = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [author, setAuthor] = useState('');
  const [image, setImage] = useState<File | null>(null);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setName('');
    setFile(null);
    setAuthor('');
    setImage(null);
    setMessage('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!name || !file) {
    setMessage('Vui lòng nhập tên bài hát và chọn file MP3');
    return;
  }
  setLoading(true);
  const formData = new FormData();
  formData.append('name', name);
  formData.append('file', file);
  if (image) {
    formData.append('image', image);
  }
  formData.append('author', author);

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
      setMessage('Thêm nhạc thành công!');
      resetForm();
      onClose();
    } else {
      setMessage(data.msg || 'Lỗi khi thêm nhạc');
    }
  } catch (err) {
    console.error(err);
    setMessage('Lỗi kết nối server');
  } finally {
    setLoading(false);
  }
};
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-[fade-in_0.2s_ease-out]">
      <div className="glass-panel-3d p-6 md:p-8 w-full max-w-md scale-100 animate-[zoom-in_0.2s_ease-out] relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors bg-[#0a0a0a] shadow-[var(--shadow-3d-in)] rounded-full w-8 h-8 flex items-center justify-center"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold text-center mb-8 text-gradient-premium drop-shadow-md">Thêm bài hát mới</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Tên bài hát
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-3.5 premium-input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Tên tác giả
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-5 py-3.5 premium-input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              File MP3
            </label>
            <input
              type="file"
              accept="audio/mpeg"
              onChange={handleFileChange}
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:bg-[var(--accent-gold)]/20 file:text-[var(--accent-gold)] hover:file:bg-[var(--accent-gold)]/30 file:transition-colors file:font-semibold"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              File Ảnh
            </label>
            <input
              type="file"
              accept="image/png, image/jpeg, image/gif"
              onChange={handleImageChange}
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:bg-[var(--accent-blue)]/20 file:text-[var(--accent-blue)] hover:file:bg-[var(--accent-blue)]/30 file:transition-colors file:font-semibold"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 premium-btn text-[var(--accent-gold)] font-bold py-4 px-4 flex justify-center disabled:opacity-50"
          >
            <span className="relative z-10">{loading ? 'Đang xử lý...' : 'Thêm nhạc'}</span>
          </button>
        </form>
        {message && (
          <div className={`mt-6 p-4 rounded-xl text-sm font-medium flex items-center justify-center ${message.includes('thành công') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddSongPopup;
