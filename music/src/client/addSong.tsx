import { useState } from 'react';
import { API_BASE } from '../config';

const AddSongPopup = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
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

    try {
      const res = await fetch(`${API_BASE}/api/songs`, {
        method: 'POST',
        credentials: 'include',
         headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
         },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Thêm nhạc thành công!');
        setName('');
        setFile(null);
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md relative shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>
        <h2 className="text-xl font-bold text-center mb-4">Thêm bài hát mới</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên bài hát
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File MP3
            </label>
            <input
              id="fileInputPopup"
              type="file"
              accept="audio/mpeg"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-500 file:mr-2 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : 'Thêm nhạc'}
          </button>
        </form>
        {message && (
          <p className={`mt-4 text-center text-sm ${message.includes('thành công') ? 'text-green-600' : 'text-red-500'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default AddSongPopup;
