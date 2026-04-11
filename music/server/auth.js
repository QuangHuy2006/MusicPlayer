const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const crypto = require('crypto');

dotenv.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const app = express();

// Middleware
app.use(express.json());

// CORS config
const allowedOrigins = [
  "http://localhost:3002",
  "https://musicplayer-frontend-865e.onrender.com"
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true
}));

// ---------- Middleware Auth ----------
async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"
  if (!token) return res.status(401).json({ msg: "No token" });

  const { data: session, error } = await supabase
    .from('user_tokens')
    .select('user_id, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (error || !session) {
    return res.status(401).json({ msg: "Invalid token" });
  }

  if (new Date(session.expires_at) < new Date()) {
    await supabase.from('user_tokens').delete().eq('token', token);
    return res.status(401).json({ msg: "Token expired" });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, name, role, email')
    .eq('id', session.user_id)
    .single();

  if (!user) return res.status(401).json({ msg: "User not found" });
  req.user = user;
  next();
}

function adminOnly(req, res, next) {
  if (req.user.id !== 1 && req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, msg: "Requires admin role" });
  }
  next();
}

// ---------- Auth Routes ----------
app.get("/api/auth/verify", auth, (req, res) => {
  res.json({ valid: true, user: req.user });
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, msg: "Vui lòng nhập email và mật khẩu" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (!user) {
      return res.status(401).json({ success: false, msg: "Người dùng không tồn tại" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, msg: "Email hoặc mật khẩu không đúng" });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8);

    const { error: insertError } = await supabase
      .from('user_tokens')
      .insert([{ user_id: user.id, token, expires_at: expiresAt }])

    if (insertError) {
      console.error('Insert token error:', insertError);
      return res.status(500).json({ success: false, msg: "Lỗi lưu phiên đăng nhập" });
    }

    return res.status(200).json({
  success: true,
  msg: "Đăng nhập thành công",
  token: token,   // ← gửi token về client
  user: { id: user.id, name: user.name, role: user.role, email: user.email },
});
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, msg: "Lỗi máy chủ" });
  }
});

// app.post("/api/auth/register", async (req, res) => {
//   try {
//     const { name, password } = req.body;
//     if (!name || !password) {
//       return res.status(400).json({ success: false, msg: "Tên và mật khẩu bắt buộc" });
//     }
//     if (password.length < 6) {
//       return res.status(400).json({ success: false, msg: "Mật khẩu phải có ít nhất 6 ký tự" });
//     }

//     const { data: existingUser } = await supabase
//       .from("users")
//       .select("name")
//       .eq("name", name)
//       .maybeSingle();

//     if (existingUser) {
//       return res.status(409).json({ success: false, msg: "Tên người dùng đã tồn tại" });
//     }

//     const SALT_ROUNDS = 10;
//     const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

//     const { data, error } = await supabase
//       .from("users")
//       .insert([{ name, password: hashedPassword, role: 'user' }])
//       .select("id, name, role")
//       .single();

//     if (error) {
//       console.error("Supabase error:", error);
//       if (error.code === "23505") {
//         return res.status(409).json({ success: false, msg: "Tên người dùng đã tồn tại" });
//       }
//       return res.status(500).json({ success: false, msg: "Lỗi khi tạo tài khoản" });
//     }

//     return res.status(201).json({
//       success: true,
//       msg: "Đăng ký thành công!",
//       user: data,
//     });
//   } catch (err) {
//     console.error("Server error:", err);
//     return res.status(500).json({ success: false, msg: "Lỗi máy chủ nội bộ" });
//   }
// });

// Lấy tất cả bài hát của user hiện tại (kèm status)
app.get('/api/user/my-songs', auth, async (req, res) => {
  try {
    const { data: songs, error } = await supabase
      .from('songs')
      .select('id, name, url, status, author, image_url, rejection_reason, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, songs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi lấy danh sách bài hát của bạn' });
  }
});

// Xóa bài hát của user (chỉ xóa nếu status pending hoặc rejected)
app.delete('/api/user/my-songs/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: song, error: fetchError } = await supabase
      .from('songs')
      .select('user_id, status, url')
      .eq('id', id)
      .single();

    if (fetchError || !song) {
      return res.status(404).json({ success: false, msg: 'Bài hát không tồn tại' });
    }
    if (song.user_id !== req.user.id) {
      return res.status(403).json({ success: false, msg: 'Bạn không có quyền xóa bài hát này' });
    }
    // Chỉ cho phép xóa nếu chưa được duyệt (pending) hoặc bị từ chối (rejected)
    if (song.status === 'approved') {
      return res.status(400).json({ success: false, msg: 'Bài hát đã được duyệt, không thể xóa. Liên hệ admin nếu cần.' });
    }

    // Xóa file trên storage nếu có
    if (song.url) {
      const filePath = song.url.split('/Music/')[1];
      if (filePath) {
        await supabase.storage.from('Music').remove([filePath]);
      }
    }

    const { error: deleteError } = await supabase.from('songs').delete().eq('id', id);
    if (deleteError) throw deleteError;

    res.json({ success: true, msg: 'Xóa bài hát thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi xóa bài hát' });
  }
});

app.post("/api/auth/logout", auth, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      await supabase.from('user_tokens').delete().eq('token', token);
    }
    res.json({ success: true, msg: "Đăng xuất thành công" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ success: false, msg: "Lỗi máy chủ khi đăng xuất" });
  }
});

// ---------- Multer config ----------
const storage = multer.memoryStorage();
// Multer config: nhận tối đa 2 file: 'file' (mp3) và 'image' (ảnh bìa)
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // tổng kích thước tối đa 30MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'file') {
      // Chỉ chấp nhận MP3
      if (file.mimetype === 'audio/mpeg') cb(null, true);
      else cb(new Error('Only MP3 files are allowed for music'));
    } else if (file.fieldname === 'image') {
      // Chỉ chấp nhận ảnh JPEG/PNG/GIF
      if (['image/jpeg', 'image/png', 'image/gif'].includes(file.mimetype)) cb(null, true);
      else cb(new Error('Only JPEG, PNG, GIF images are allowed'));
    } else {
      cb(new Error('Unexpected field'));
    }
  }
});

// ---------- Songs Routes ----------
app.post('/api/songs', auth, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, author } = req.body;
    const musicFile = req.files?.['file']?.[0];
    const imageFile = req.files?.['image']?.[0];

    if (!name || !musicFile) {
      return res.status(400).json({ success: false, msg: 'Thiếu tên bài hát hoặc file MP3' });
    }

    // --- Upload file nhạc lên bucket 'Music' ---
    const musicExt = path.extname(musicFile.originalname);
    const musicFileName = `${uuidv4()}${musicExt}`;
    const musicFilePath = `songs/${musicFileName}`;

    const { error: musicUploadError } = await supabase.storage
      .from('Music')
      .upload(musicFilePath, musicFile.buffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
      });

    if (musicUploadError) {
      console.error('Music upload error:', musicUploadError);
      return res.status(500).json({ success: false, msg: 'Lỗi upload file nhạc' });
    }

    const { data: musicUrlData } = supabase.storage.from('Music').getPublicUrl(musicFilePath);
    const songUrl = musicUrlData.publicUrl;

    // --- Upload ảnh bìa lên bucket 'Image' (nếu có) ---
    let imageUrl = null;
    if (imageFile) {
      const imageExt = path.extname(imageFile.originalname);
      const imageFileName = `${uuidv4()}${imageExt}`;
      const imageFilePath = `images/${imageFileName}`;

      const { error: imageUploadError } = await supabase.storage
        .from('Image')
        .upload(imageFilePath, imageFile.buffer, {
          contentType: imageFile.mimetype,
          cacheControl: '3600',
        });

      if (imageUploadError) {
        console.error('Image upload error:', imageUploadError);
        // Nếu upload ảnh lỗi, có thể xóa file nhạc đã upload để tránh rác
        await supabase.storage.from('Music').remove([musicFilePath]);
        return res.status(500).json({ success: false, msg: 'Lỗi upload ảnh bìa' });
      }

      const { data: imageUrlData } = supabase.storage.from('Image').getPublicUrl(imageFilePath);
      imageUrl = imageUrlData.publicUrl;
    }

    // --- Lưu thông tin vào bảng songs ---
    const status = req.user.role === 'ADMIN' ? 'approved' : 'pending';

    const songData = {
      name,
      url: songUrl,
      user_id: req.user.id,
      status,
      author: author || null,           // lưu author (có thể rỗng)
      image_url: imageUrl,              // lưu URL ảnh (có thể null)
    };

    const { data: song, error: dbError } = await supabase
      .from('songs')
      .insert([songData])
      .select()
      .single();

    if (dbError) {
      console.error('DB insert error:', dbError);
      // Rollback: xóa cả file nhạc và ảnh nếu đã upload
      await supabase.storage.from('Music').remove([musicFilePath]);
      if (imageUrl) {
        const imagePath = imageUrl.split('/Image/')[1];
        if (imagePath) await supabase.storage.from('Image').remove([imagePath]);
      }
      return res.status(500).json({ success: false, msg: 'Lỗi lưu thông tin bài hát' });
    }

    const msg = status === 'approved'
      ? 'Thêm nhạc thành công'
      : 'Thêm nhạc thành công, chờ admin duyệt';

    res.json({ success: true, msg, song });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ success: false, msg: 'Lỗi server' });
  }
});

app.get('/api/songs', auth, async (req, res) => {
  try {
    // Lấy tất cả bài hát đã duyệt, kèm author và image_url
    const { data: songs, error } = await supabase
      .from('songs')
      .select('id, name, url, status, author, image_url')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('DB error:', error);
      return res.status(500).json({ success: false, msg: 'Lỗi lấy danh sách bài hát' });
    }

    res.json({
      success: true,
      songs: songs.map(song => ({
        id: song.id,
        name: song.name,
        url: song.url,
        status: song.status,
        author: song.author,
        imageUrl: song.image_url,  // đổi tên thành imageUrl cho dễ hiểu
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi server' });
  }
});

app.put('/api/songs/:id/approve', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: song, error } = await supabase
      .from('songs')
      .update({ status: 'approved', approved_by: req.user.id })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, msg: 'Bài hát đã được duyệt', song });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi duyệt bài hát' });
  }
});

app.put('/api/songs/:id/reject', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body; // lấy lý do từ body
    const updateData = { status: 'rejected' };
    if (reason && reason.trim()) {
      updateData.rejection_reason = reason.trim();
    }
    const { data: song, error } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, msg: 'Bài hát đã bị từ chối', song });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi từ chối bài hát' });
  }
});

app.delete('/api/songs/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: song } = await supabase.from('songs').select('url').eq('id', id).single();
    if (song && song.url) {
      const filePath = song.url.split('/Music/')[1];
      if (filePath) await supabase.storage.from('Music').remove([filePath]);
    }
    const { error } = await supabase.from('songs').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, msg: 'Xóa bài hát thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi xóa bài hát' });
  }
});

// ---------- Playlist Routes ----------

// Tạo playlist mới
app.post('/api/playlists', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, msg: 'Tên playlist không được để trống' });
    }

    const { data, error } = await supabase
      .from('playlists')
      .insert([{ user_id: req.user.id, name: name.trim() }])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, msg: 'Tạo playlist thành công', playlist: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi tạo playlist' });
  }
});

// Lấy danh sách playlist của user hiện tại
app.get('/api/playlists', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, playlists: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi lấy danh sách playlist' });
  }
});

// Lấy chi tiết playlist (kèm danh sách bài hát)
app.get('/api/playlists/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const playlistId = parseInt(id, 10);
    if (isNaN(playlistId)) {
      return res.status(400).json({ success: false, msg: 'ID playlist không hợp lệ' });
    }

    // Kiểm tra playlist tồn tại và thuộc về user
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      return res.status(404).json({ success: false, msg: 'Playlist không tồn tại' });
    }
    if (playlist.user_id !== req.user.id) {
      return res.status(403).json({ success: false, msg: 'Bạn không có quyền xem playlist này' });
    }

    // Lấy danh sách song_id từ playlist_songs
    const { data: playlistSongs, error: psError } = await supabase
      .from('playlist_songs')
      .select('song_id, added_at')
      .eq('playlist_id', playlistId);

    if (psError) throw psError;

    if (!playlistSongs.length) {
      return res.json({
        success: true,
        playlist: { ...playlist, songs: [] }
      });
    }

    const songIds = playlistSongs.map(ps => ps.song_id);
    // Lấy thông tin chi tiết các bài hát (chỉ approved)
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('id, name, url, author, image_url, status')
      .in('id', songIds)
      .eq('status', 'approved');

    if (songsError) throw songsError;

    // Ghép thêm added_at
    const songsWithAddedAt = songs.map(song => ({
      ...song,
      imageUrl: song.image_url,
      addedAt: playlistSongs.find(ps => ps.song_id === song.id)?.added_at
    }));

    res.json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        created_at: playlist.created_at,
        songs: songsWithAddedAt,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi lấy chi tiết playlist' });
  }
});

// Thêm bài hát vào playlist
app.post('/api/playlists/:id/songs', auth, async (req, res) => {
  try {
    const { id: playlistId } = req.params;
    const { songId } = req.body;

    if (!songId) {
      return res.status(400).json({ success: false, msg: 'Thiếu songId' });
    }

    // Kiểm tra playlist thuộc về user
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('user_id')
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      return res.status(404).json({ success: false, msg: 'Playlist không tồn tại' });
    }
    if (playlist.user_id !== req.user.id) {
      return res.status(403).json({ success: false, msg: 'Bạn không có quyền sửa playlist này' });
    }

    // Kiểm tra bài hát tồn tại và đã được duyệt (nên chỉ thêm bài approved)
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('id, status')
      .eq('id', songId)
      .single();

    if (songError || !song) {
      return res.status(404).json({ success: false, msg: 'Bài hát không tồn tại' });
    }
    if (song.status !== 'approved') {
      return res.status(400).json({ success: false, msg: 'Chỉ có thể thêm bài hát đã được duyệt vào playlist' });
    }

    // Thêm vào bảng playlist_songs (nếu đã có thì bỏ qua lỗi unique)
    const { error: insertError } = await supabase
      .from('playlist_songs')
      .insert([{ playlist_id: playlistId, song_id: songId }]);

    if (insertError) {
      if (insertError.code === '23505') { // unique violation
        return res.status(409).json({ success: false, msg: 'Bài hát đã có trong playlist' });
      }
      throw insertError;
    }

    res.json({ success: true, msg: 'Đã thêm bài hát vào playlist' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi thêm bài hát vào playlist' });
  }
});

// Xóa bài hát khỏi playlist
app.delete('/api/playlists/:id/songs/:songId', auth, async (req, res) => {
  try {
    const { id: playlistId, songId } = req.params;

    // Kiểm tra quyền sở hữu playlist
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('user_id')
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      return res.status(404).json({ success: false, msg: 'Playlist không tồn tại' });
    }
    if (playlist.user_id !== req.user.id) {
      return res.status(403).json({ success: false, msg: 'Bạn không có quyền sửa playlist này' });
    }

    const { error: deleteError } = await supabase
      .from('playlist_songs')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('song_id', songId);

    if (deleteError) throw deleteError;

    res.json({ success: true, msg: 'Đã xóa bài hát khỏi playlist' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi xóa bài hát khỏi playlist' });
  }
});

// Xóa toàn bộ playlist
app.delete('/api/playlists/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra quyền sở hữu
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('user_id')
      .eq('id', id)
      .single();

    if (playlistError || !playlist) {
      return res.status(404).json({ success: false, msg: 'Playlist không tồn tại' });
    }
    if (playlist.user_id !== req.user.id) {
      return res.status(403).json({ success: false, msg: 'Bạn không có quyền xóa playlist này' });
    }

    const { error: deleteError } = await supabase
      .from('playlists')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({ success: true, msg: 'Xóa playlist thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi xóa playlist' });
  }
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
