import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE } from '../config.tsx';
import {
  FaMusic, FaUser, FaImage, FaCloudUploadAlt, FaTimes, FaCheckCircle,
  FaLayerGroup, FaSpinner, FaTrashAlt
} from 'react-icons/fa';
import { MdClose } from 'react-icons/md';

interface BatchItem {
  id: string;
  file: File;
  name: string;
  author: string;
  lyrics: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMsg?: string;
}

const AddSongPopup = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [tab, setTab] = useState<'single' | 'batch'>('single');

  // Single Mode State
  const [name, setName] = useState('');
  const [author, setAuthor] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);

  // Batch Mode State
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchImage, setBatchImage] = useState<File | null>(null);
  const [batchAuthor, setBatchAuthor] = useState('');
  const [isBatchPrivate, setIsBatchPrivate] = useState(false);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [batchSummary, setBatchSummary] = useState<string | null>(null);

  const imagePreview = useMemo(() => {
    return image ? URL.createObjectURL(image) : null;
  }, [image]);

  const batchImagePreview = useMemo(() => {
    return batchImage ? URL.createObjectURL(batchImage) : null;
  }, [batchImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!name) {
        const autoName = selected.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        setName(autoName);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleBatchFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newItems: BatchItem[] = Array.from(e.target.files).map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file: f,
        name: f.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
        author: batchAuthor || '',
        lyrics: '',
        status: 'pending'
      }));
      setBatchItems(prev => [...prev, ...newItems]);
      e.target.value = '';
    }
  };

  const handleRemoveBatchItem = (id: string) => {
    if (isBatchUploading) return;
    setBatchItems(prev => prev.filter(item => item.id !== id));
  };

  const resetForm = () => {
    setName('');
    setAuthor('');
    setLyrics('');
    setFile(null);
    setImage(null);
    setMessage(null);
    setIsPrivate(false);
    setBatchItems([]);
    setBatchImage(null);
    setBatchAuthor('');
    setBatchSummary(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name || !file) {
      setMessage({ text: 'Vui lòng nhập tên bài hát và chọn file nhạc', type: 'error' });
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
    formData.append('visibility', isPrivate ? 'private' : 'public');

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
        setMessage({
          text: isPrivate
            ? 'Thêm nhạc riêng tư thành công!'
            : 'Thêm nhạc thành công! Đang chờ quản trị viên duyệt.',
          type: 'success'
        });
        setTimeout(() => {
          resetForm();
          onClose();
        }, 1500);
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

  // ====================== ĐA LUỒNG (WORKER POOL UPLOAD) ======================
  const handleStartBatchUpload = async () => {
    if (batchItems.length === 0 || isBatchUploading) return;

    setIsBatchUploading(true);
    setBatchSummary(null);

    const token = localStorage.getItem('token');
    const CONCURRENCY_LIMIT = 4; // Chạy 4 luồng upload song song cùng lúc

    const queue = [...batchItems];
    let completedCount = 0;
    let failedCount = 0;

    const uploadSingleItem = async (item: BatchItem) => {
      setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i));

      const formData = new FormData();
      formData.append('name', item.name || item.file.name.replace(/\.[^/.]+$/, ''));
      formData.append('file', item.file);
      formData.append('author', item.author || batchAuthor || 'Chưa biết');
      if (item.lyrics) formData.append('lyrics', item.lyrics);
      if (batchImage) formData.append('image', batchImage);
      formData.append('visibility', isBatchPrivate ? 'private' : 'public');

      try {
        const res = await fetch(`${API_BASE}/api/songs`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          completedCount++;
          setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'success' } : i));
        } else {
          failedCount++;
          setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', errorMsg: data.msg || 'Lỗi tải lên' } : i));
        }
      } catch (err) {
        failedCount++;
        setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', errorMsg: 'Lỗi kết nối' } : i));
        console.error(err);
      }
    };

    // Worker Pool loop
    const workers = Array.from({ length: Math.min(CONCURRENCY_LIMIT, queue.length) }).map(async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) {
          await uploadSingleItem(item);
        }
      }
    });

    await Promise.all(workers);
    setIsBatchUploading(false);
    setBatchSummary(`Hoàn tất đa luồng: ${completedCount} bài thành công, ${failedCount} bài thất bại.`);
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-[fade-in_0.2s_ease-out]">
      <div className="glass-panel-3d w-full max-w-3xl overflow-hidden flex flex-col rounded-[32px] border border-white/10 shadow-2xl scale-100 animate-[zoom-in_0.3s_ease-out] relative max-h-[90vh]">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => !isBatchUploading && setTab('single')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${tab === 'single' ? 'bg-[var(--accent-gold)] text-black shadow-lg shadow-[var(--accent-gold)]/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
            >
              <FaMusic /> Tải 1 bài
            </button>
            <button
              onClick={() => !loading && setTab('batch')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${tab === 'batch' ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-lg shadow-cyan-400/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
            >
              <FaLayerGroup /> Đa luồng (Nhiều bài)
              {batchItems.length > 0 && (
                <span className="bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full">{batchItems.length}</span>
              )}
            </button>
          </div>

          <button
            onClick={() => {
              if (loading || isBatchUploading) return;
              onClose();
            }}
            className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full w-9 h-9 flex items-center justify-center cursor-pointer border border-white/5"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Modal Body */}
        {tab === 'single' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col md:flex-row">
            {/* Left Preview */}
            <div className="w-full md:w-5/12 bg-gradient-to-br from-slate-900 to-black p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5">
              <div className="relative group">
                <div className={`w-44 h-44 rounded-[24px] overflow-hidden shadow-2xl border-2 ${imagePreview ? 'border-[var(--accent-gold)]/50' : 'border-dashed border-slate-700'} flex items-center justify-center transition-all duration-500 group-hover:scale-105`}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-500">
                      <FaImage size={40} className="mb-2 opacity-20" />
                      <p className="text-[10px] font-medium uppercase tracking-wider">Chưa có ảnh</p>
                    </div>
                  )}
                </div>
                {imagePreview && (
                  <div className="absolute -bottom-2 -right-2 bg-[var(--accent-gold)] text-black w-7 h-7 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    <FaCheckCircle size={14} />
                  </div>
                )}
              </div>

              <div className="mt-6 text-center">
                <h3 className="text-lg font-bold text-white mb-1 truncate max-w-[180px]">{name || 'Tên bài hát'}</h3>
                <p className="text-[var(--accent-gold)] text-xs font-medium opacity-80 truncate max-w-[180px]">{author || 'Nghệ sĩ'}</p>
              </div>

              <div className="mt-auto w-full pt-6">
                <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                  <p className="text-[9px] text-slate-500 uppercase tracking-[0.2em] mb-1.5 font-bold">File Information</p>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                      <FaMusic size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate font-medium">{file ? file.name : 'Chưa chọn file...'}</p>
                      <p className="text-[9px] text-slate-500 uppercase">{file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'Audio Format'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Form */}
            <div className="flex-1 p-6 md:p-8 bg-[#0a0a0a]/40 backdrop-blur-xl">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FaMusic className="text-[var(--accent-gold)]" /> Tên bài hát
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nhập tên bài hát..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--accent-gold)]/50 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FaUser className="text-[var(--accent-gold)]" /> Nghệ sĩ / Tác giả
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Nhập tên nghệ sĩ..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--accent-gold)]/50 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Lời bài hát (Tùy chọn)
                  </label>
                  <textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder="Nhập lời bài hát (nếu có)..."
                    rows={2}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--accent-gold)]/50 transition-all resize-none custom-scrollbar"
                  />
                </div>

                <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                  <div>
                    <label className="text-xs font-bold text-slate-300">Chế độ riêng tư</label>
                    <p className="text-[10px] text-slate-500">Chỉ bạn nghe được & không cần duyệt</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none cursor-pointer ${isPrivate ? 'bg-[var(--accent-gold)]' : 'bg-slate-700'}`}
                  >
                    <div className={`bg-black w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${isPrivate ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-xl border-2 border-dashed transition-all cursor-pointer ${file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 hover:border-slate-600 bg-black/20'}`}>
                    <FaCloudUploadAlt size={18} className={file ? 'text-emerald-400' : 'text-slate-500'} />
                    <span className="text-[10px] font-bold text-slate-300 uppercase">{file ? 'Đã chọn nhạc' : 'Chọn file nhạc'}</span>
                    <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
                  </label>

                  <label className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-xl border-2 border-dashed transition-all cursor-pointer ${image ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-800 hover:border-slate-600 bg-black/20'}`}>
                    <FaImage size={18} className={image ? 'text-blue-400' : 'text-slate-500'} />
                    <span className="text-[10px] font-bold text-slate-300 uppercase">{image ? 'Đã chọn ảnh' : 'Chọn ảnh bìa'}</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>

                {message && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-[fade-in_0.3s_ease-out] ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {message.type === 'success' ? <FaCheckCircle /> : <FaTimes />}
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-gradient-to-r from-[var(--accent-gold)] to-[#ffd700] hover:from-[#ffd700] hover:to-[var(--accent-gold)] text-black font-black uppercase tracking-wider py-4 rounded-xl shadow-lg shadow-[var(--accent-gold)]/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin" /> Đang tải lên song song...
                    </>
                  ) : (
                    'Thêm Nhạc Ngay'
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Batch Multi-Thread Mode */
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Batch Defaults */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FaUser className="text-cyan-400" /> Tác giả mặc định
                </h4>
                <input
                  type="text"
                  value={batchAuthor}
                  onChange={(e) => setBatchAuthor(e.target.value)}
                  placeholder="Áp dụng cho tất cả file..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-xs text-slate-300 font-medium">Nhạc riêng tư</span>
                  <button
                    type="button"
                    onClick={() => setIsBatchPrivate(!isBatchPrivate)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${isBatchPrivate ? 'bg-cyan-400' : 'bg-slate-700'}`}
                  >
                    <div className={`bg-black w-4 h-4 rounded-full shadow transform transition-transform ${isBatchPrivate ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Shared Cover Image */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 flex items-center justify-center">
                  {batchImagePreview ? (
                    <img src={batchImagePreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FaImage className="text-slate-600 text-xl" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-bold mb-1">Ảnh bìa chung</p>
                  <label className="inline-block px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-cyan-300 uppercase cursor-pointer transition-colors">
                    Chọn ảnh
                    <input type="file" accept="image/*" onChange={(e) => e.target.files && setBatchImage(e.target.files[0])} className="hidden" />
                  </label>
                  {batchImage && (
                    <button onClick={() => setBatchImage(null)} className="ml-2 text-[10px] text-rose-400 hover:underline">Xóa</button>
                  )}
                </div>
              </div>

              {/* Add Files Dropzone */}
              <label className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-dashed border-cyan-400/30 hover:border-cyan-400/60 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all">
                <FaCloudUploadAlt size={28} className="text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider text-center">Chọn nhiều file nhạc</span>
                <span className="text-[10px] text-slate-400">Hỗ trợ MP3, WAV, FLAC, M4A...</span>
                <input type="file" accept="audio/*" multiple onChange={handleBatchFilesChange} className="hidden" />
              </label>
            </div>

            {/* Batch Item List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider px-2">
                <span>Hàng đợi upload ({batchItems.length} bài)</span>
                {batchItems.length > 0 && !isBatchUploading && (
                  <button onClick={() => setBatchItems([])} className="text-rose-400 hover:text-rose-300 text-[10px] flex items-center gap-1 cursor-pointer">
                    <FaTrashAlt /> Xóa danh sách
                  </button>
                )}
              </div>

              {batchItems.length === 0 ? (
                <div className="text-center py-12 border border-white/5 border-dashed rounded-2xl bg-black/20">
                  <FaMusic className="mx-auto text-3xl text-slate-700 mb-2" />
                  <p className="text-xs text-slate-500">Chưa có bài hát nào được chọn vào hàng đợi</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  {batchItems.map((item, index) => (
                    <div key={item.id} className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-500 w-6 text-center">{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={item.name}
                          disabled={isBatchUploading}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, name: val } : i));
                          }}
                          className="w-full bg-transparent text-xs font-bold text-white focus:outline-none focus:border-b border-cyan-400 truncate"
                          placeholder="Tên bài hát"
                        />
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.file.name} • {(item.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>

                      {/* Status indicator */}
                      <div className="shrink-0 flex items-center gap-2">
                        {item.status === 'pending' && <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">Chờ</span>}
                        {item.status === 'uploading' && <span className="text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full flex items-center gap-1"><FaSpinner className="animate-spin" /> Đang up</span>}
                        {item.status === 'success' && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full flex items-center gap-1"><FaCheckCircle /> Xong</span>}
                        {item.status === 'error' && <span className="text-[10px] font-bold text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-full" title={item.errorMsg}>Lỗi</span>}

                        {!isBatchUploading && (
                          <button onClick={() => handleRemoveBatchItem(item.id)} className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer">
                            <FaTimes size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {batchSummary && (
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-bold rounded-xl flex items-center gap-2">
                <FaCheckCircle /> {batchSummary}
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleStartBatchUpload}
              disabled={isBatchUploading || batchItems.length === 0}
              className="w-full bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 text-black font-black uppercase tracking-wider py-4 rounded-xl shadow-lg shadow-cyan-400/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isBatchUploading ? (
                <>
                  <FaSpinner className="animate-spin" /> Đang tải đa luồng (4 luồng song song)...
                </>
              ) : (
                `Bắt đầu tải lên đa luồng (${batchItems.length} bài)`
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );

  return createPortal(modalContent, document.getElementById('portal')!);
};

export default AddSongPopup;
