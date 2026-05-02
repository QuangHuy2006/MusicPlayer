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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fade-in_0.2s_ease-out]">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl scale-100 animate-[zoom-in_0.2s_ease-out]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors bg-slate-800 rounded-full w-8 h-8 flex items-center justify-center"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Thêm bài hát mới</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Tên bài hát
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
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
              className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
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
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:bg-cyan-500/20 file:text-cyan-400 hover:file:bg-cyan-500/30 file:transition-colors file:font-semibold"
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
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:bg-purple-500/20 file:text-purple-400 hover:file:bg-purple-500/30 file:transition-colors file:font-semibold"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : 'Thêm nhạc'}
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
