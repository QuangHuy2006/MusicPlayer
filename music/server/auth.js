const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const ytDlpExec = require('yt-dlp-exec');
const contentDisposition = require('content-disposition');

dotenv.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const app = express();

// Middleware
app.use(express.json());

// CORS config
const allowedOrigins = [
  "http://localhost:5173",
  "https://musicplayer-frontend-865e.onrender.com",
  "https://music.werchat.io.vn"
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

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (userError || !user) return res.status(401).json({ msg: "User not found" });
    if (user.is_banned) return res.status(403).json({ msg: "Tài khoản của bạn đã bị khóa" });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: "Token expired" });
    }
    return res.status(401).json({ msg: "Invalid token" });
  }
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

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '15m' }
    );
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const { error: insertError } = await supabase
      .from('user_tokens')
      .insert([{ user_id: user.id, token: refreshToken, expires_at: expiresAt }])

    if (insertError) {
      console.error('Insert token error:', insertError);
      return res.status(500).json({ success: false, msg: "Lỗi lưu phiên đăng nhập" });
    }

    return res.status(200).json({
      success: true,
      msg: "Đăng nhập thành công",
      token: accessToken,
      refreshToken: refreshToken,
      user: { id: user.id, name: user.name, role: user.role, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, msg: "Lỗi máy chủ" });
  }
});

app.post("/api/auth/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, msg: "No refresh token" });

    const { data: session, error } = await supabase
      .from('user_tokens')
      .select('user_id, expires_at')
      .eq('token', refreshToken)
      .maybeSingle();

    if (error || !session) return res.status(401).json({ success: false, msg: "Invalid refresh token" });
    if (new Date(session.expires_at) < new Date()) {
      await supabase.from('user_tokens').delete().eq('token', refreshToken);
      return res.status(401).json({ success: false, msg: "Refresh token expired" });
    }

    const { data: user } = await supabase.from('users').select('*').eq('id', session.user_id).single();
    if (!user || user.is_banned) return res.status(403).json({ success: false, msg: "User unavailable" });

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '15m' }
    );

    res.json({ success: true, token: accessToken });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
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

// Nâng cấp tài khoản Premium
app.post('/api/user/upgrade', auth, async (req, res) => {
  try {
    if (req.user.role === 'ADMIN') {
      return res.status(400).json({ success: false, msg: 'Admin đã có toàn quyền!' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ role: 'PREMIUM' })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    // Sinh lại token với role mới
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '15m' }
    );

    res.json({ success: true, msg: 'Nâng cấp Premium thành công!', user, token: accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi nâng cấp tài khoản' });
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
    const { refreshToken } = req.body;
    if (refreshToken) {
      await supabase.from('user_tokens').delete().eq('token', refreshToken);
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
    const { name, author, lyrics } = req.body;
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
      lyrics: lyrics || null            // lưu lời bài hát
    };

    let { data: song, error: dbError } = await supabase
      .from('songs')
      .insert([songData])
      .select()
      .single();

    if (dbError && dbError.message && dbError.message.includes('lyrics')) {
      console.warn("Column 'lyrics' might be missing. Retrying without lyrics...");
      delete songData.lyrics;
      const retryResult = await supabase.from('songs').insert([songData]).select().single();
      song = retryResult.data;
      dbError = retryResult.error;
    }

    if (dbError) {
      console.error('DB insert error:', dbError);
      // Rollback: xóa cả file nhạc và ảnh nếu đã upload
      await supabase.storage.from('Music').remove([musicFilePath]);
      if (imageUrl) {
        const imagePath = imageUrl.split('/Image/')[1];
        if (imagePath) await supabase.storage.from('Image').remove([imagePath]);
      }
      return res.status(500).json({ success: false, msg: 'Lỗi lưu thông tin bài hát: ' + dbError.message });
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

app.get('/api/youtube/download', auth, async (req, res) => {
  const { url } = req.query;
  if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
    return res.status(400).json({ success: false, msg: 'Link YouTube không hợp lệ' });
  }

  try {
    // 1. Dùng yt-dlp để lấy thông tin (không cần ffmpeg)
    const info = await ytDlpExec(url, {
      dumpJson: true,
      noWarnings: true,
      noCallHome: true,
      youtubeSkipDashManifest: true,
    });

    const title = info.title ? info.title.replace(/[^\w\s-]/gi, '') : 'audio';
    const ext = info.ext || 'm4a';

    res.header('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.${ext}"`);
    res.header('Content-Type', ext === 'webm' ? 'audio/webm' : 'audio/mp4');

    // 2. Tải trực tiếp luồng audio gốc tốt nhất (m4a hoặc webm) mà KHÔNG cần convert sang mp3 (Tránh lỗi thiếu FFmpeg)
    const process = ytDlpExec.exec(url, {
      format: 'bestaudio',
      output: '-', // stream ra stdout
      noWarnings: true,
      noCallHome: true,
      youtubeSkipDashManifest: true,
    });

    process.stdout.pipe(res);

    process.on('error', (err) => {
      console.error('yt-dlp stream error:', err);
      if (!res.headersSent) res.status(500).json({ success: false, msg: 'Lỗi stream video' });
    });
  } catch (err) {
    console.error('Youtube download error:', err);
    if (!res.headersSent) res.status(500).json({ success: false, msg: 'Lỗi khi tải hoặc link bị chặn bởi YouTube' });
  }
});

app.get('/api/songs', auth, async (req, res) => {
  try {
    // Lấy tất cả bài hát đã duyệt, kèm author, image_url, lyrics
    const { data: songs, error } = await supabase
      .from('songs')
      .select('id, name, url, status, author, image_url, lyrics')
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
        imageUrl: song.image_url,
        lyrics: song.lyrics,
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
    // Send notification to song owner
    if (song && song.user_id) {
      createNotification(song.user_id, 'song_approved', 'Bài hát đã được duyệt! 🎉', `Bài hát "${song.name}" đã được admin duyệt và hiện có thể phát trên hệ thống.`, song.id);
    }
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
    // Send notification to song owner
    if (song && song.user_id) {
      const reasonText = reason ? ` Lý do: ${reason}` : '';
      createNotification(song.user_id, 'song_rejected', 'Bài hát bị từ chối ❌', `Bài hát "${song.name}" đã bị từ chối.${reasonText}`, song.id);
    }
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

// ========== PHASE 3: LIKED SONGS & HISTORY ==========

app.get('/api/likes', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('liked_songs')
      .select('song_id, created_at, songs (id, name, url, image_url, author, status)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    // Map to match song interface
    const songs = data.map(item => ({
      ...item.songs,
      liked_at: item.created_at
    })).filter(s => s.status === 'approved');

    res.json({ success: true, songs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi tải danh sách yêu thích' });
  }
});

app.post('/api/likes/:songId', auth, async (req, res) => {
  try {
    const { songId } = req.params;

    // Check if already liked
    const { data: existing } = await supabase
      .from('liked_songs')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('song_id', songId)
      .maybeSingle();

    if (existing) {
      // Unlike
      await supabase.from('liked_songs').delete().eq('user_id', req.user.id).eq('song_id', songId);
      res.json({ success: true, liked: false, msg: 'Đã bỏ thích' });
    } else {
      // Like
      await supabase.from('liked_songs').insert([{ user_id: req.user.id, song_id: songId }]);
      res.json({ success: true, liked: true, msg: 'Đã thích bài hát' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi server' });
  }
});

app.get('/api/history', auth, async (req, res) => {
  try {
    // get unique recently played songs (latest 50 raw)
    const { data, error } = await supabase
      .from('play_history')
      .select('song_id, played_at, songs (id, name, url, image_url, author, status)')
      .eq('user_id', req.user.id)
      .order('played_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Filter duplicates and unapproved
    const uniqueSongs = [];
    const seen = new Set();

    for (const item of data) {
      if (item.songs?.status === 'approved' && !seen.has(item.song_id)) {
        seen.add(item.song_id);
        uniqueSongs.push({
          ...item.songs,
          played_at: item.played_at
        });
        if (uniqueSongs.length >= 20) break;
      }
    }

    res.json({ success: true, songs: uniqueSongs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi tải lịch sử' });
  }
});

app.post('/api/history/:songId', auth, async (req, res) => {
  try {
    const { songId } = req.params;
    await supabase.from('play_history').insert([{ user_id: req.user.id, song_id: songId }]);
    res.json({ success: true });
  } catch (err) {
    console.error('History tracking error:', err);
    res.status(500).json({ success: false });
  }
});

// ========== RECOMMENDATIONS ==========
app.get('/api/recommendations', auth, async (req, res) => {
  try {
    const { data: history, error: historyError } = await supabase
      .from('play_history')
      .select('song_id, songs (id, author)')
      .eq('user_id', req.user.id);

    if (historyError) throw historyError;

    const authorCounts = {};
    const playedSongIds = new Set();

    if (history && history.length > 0) {
      history.forEach(item => {
        if (item.songs) {
          playedSongIds.add(item.song_id);
          const author = item.songs.author || 'Unknown';
          authorCounts[author] = (authorCounts[author] || 0) + 1;
        }
      });
    }

    const topAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);

    let recommendedSongs = [];
    if (topAuthors.length > 0) {
      const { data: relatedSongs, error: relatedError } = await supabase
        .from('songs')
        .select('id, name, url, image_url, author, status')
        .eq('status', 'approved')
        .in('author', topAuthors);

      if (!relatedError && relatedSongs) {
        recommendedSongs = relatedSongs
          .filter(song => !playedSongIds.has(song.id))
          .sort(() => 0.5 - Math.random())
          .slice(0, 10);

        if (recommendedSongs.length < 5) {
          const moreSongs = relatedSongs
            .filter(song => playedSongIds.has(song.id))
            .sort(() => 0.5 - Math.random())
            .slice(0, 10 - recommendedSongs.length);
          recommendedSongs = [...recommendedSongs, ...moreSongs];
        }
      }
    }

    if (recommendedSongs.length === 0) {
      const { data: randomSongs, error: randomError } = await supabase
        .from('songs')
        .select('id, name, url, image_url, author, status')
        .eq('status', 'approved')
        .limit(20);

      if (!randomError && randomSongs) {
        recommendedSongs = randomSongs.sort(() => 0.5 - Math.random()).slice(0, 10);
      }
    }

    res.json({
      success: true,
      songs: recommendedSongs.map(s => ({ ...s, imageUrl: s.image_url })),
      basedOn: topAuthors
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi tải gợi ý' });
  }
});

// ========== TRENDING ==========
app.get('/api/trending', auth, async (req, res) => {
  try {
    // Lấy 500 lượt nghe gần nhất
    const { data: history, error: historyError } = await supabase
      .from('play_history')
      .select('song_id, songs (id, name, url, image_url, author, status, lyrics)')
      .order('played_at', { ascending: false })
      .limit(500);

    if (historyError) throw historyError;

    const playCounts = {};
    const songData = {};

    history.forEach(item => {
      if (item.songs && item.songs.status === 'approved') {
        const sid = item.song_id;
        playCounts[sid] = (playCounts[sid] || 0) + 1;
        if (!songData[sid]) songData[sid] = item.songs;
      }
    });

    // Sắp xếp theo số lượt nghe giảm dần
    const sortedSongs = Object.entries(playCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => ({
        ...songData[entry[0]],
        imageUrl: songData[entry[0]].image_url,
        playCount: entry[1]
      }));

    res.json({ success: true, songs: sortedSongs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi tải bảng xếp hạng' });
  }
});

// ========== COMMENTS ==========
app.get('/api/songs/:id/comments', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: comments, error } = await supabase
      .from('comments')
      .select('id, content, created_at, users(id, name)')
      .eq('song_id', id)
      .order('created_at', { ascending: true });

    // Ignore error if table doesn't exist yet
    if (error && error.code === '42P01') {
      return res.json({ success: true, comments: [] });
    } else if (error) {
      throw error;
    }

    res.json({ success: true, comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi tải bình luận' });
  }
});

app.post('/api/songs/:id/comments', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, msg: 'Nội dung không được rỗng' });
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert([{ user_id: req.user.id, song_id: id, content: content.trim() }])
      .select('id, content, created_at, users(id, name)')
      .single();

    if (error) {
      if (error.code === '42P01') {
        return res.status(500).json({ success: false, msg: 'Bảng comments chưa được tạo trên Supabase' });
      }
      throw error;
    }

    // Notify song owner about new comment
    const { data: song } = await supabase.from('songs').select('user_id, name').eq('id', id).single();
    if (song && song.user_id && song.user_id !== req.user.id) {
      createNotification(song.user_id, 'new_comment', 'Bình luận mới 💬', `${req.user.name} đã bình luận về bài hát "${song.name}": "${content.trim().substring(0, 50)}..."`, parseInt(id));
    }

    res.json({ success: true, msg: 'Đã gửi bình luận', comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi gửi bình luận' });
  }
});

// ========== PHASE 4: ADMIN ANALYTICS ==========
app.get('/api/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: totalSongs } = await supabase.from('songs').select('*', { count: 'exact', head: true });
    const { count: pendingSongs } = await supabase.from('songs').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: totalPlaylists } = await supabase.from('playlists').select('*', { count: 'exact', head: true });

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        totalSongs: totalSongs || 0,
        pendingSongs: pendingSongs || 0,
        totalPlaylists: totalPlaylists || 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi server' });
  }
});

app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, is_banned, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi tải danh sách người dùng' });
  }
});

app.post('/api/admin/users/:id/ban', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (id == 1) return res.status(403).json({ success: false, msg: 'Không thể khóa Admin gốc' });

    const { data: user } = await supabase.from('users').select('is_banned').eq('id', id).single();
    if (!user) return res.status(404).json({ success: false, msg: 'User not found' });

    const { error } = await supabase.from('users').update({ is_banned: !user.is_banned }).eq('id', id);
    if (error) throw error;

    res.json({ success: true, is_banned: !user.is_banned, msg: !user.is_banned ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi server' });
  }
});

// ---------- Youtube Converter ----------
// app.get('/api/youtube/download', auth, async (req, res) => {
//   try {
//     const url = req.query.url;
//     if (!url || (!url.includes('youtube.com/') && !url.includes('youtu.be/'))) {
//       return res.status(400).json({ success: false, msg: 'URL không hợp lệ hoặc không được hỗ trợ' });
//     }

//     // Get video info to get the title
//     const info = await ytDlpExec(url, { dumpJson: true });
//     const title = info.title.replace(/[^\w\s\u00C0-\u1EF9]/gi, ''); // sanitize filename
//     const filename = `${title}.m4a`;

//     // Set headers
//     res.setHeader('Content-Disposition', contentDisposition(filename));
//     res.setHeader('Content-Type', 'audio/mp4');

//     // Stream the audio
//     const ytDlpProcess = ytDlpExec.exec(url, {
//       output: '-', // stdout
//       format: 'bestaudio',
//       limitRate: '5M',
//       rmCacheDir: true
//     });

//     ytDlpProcess.stdout.pipe(res);

//     ytDlpProcess.on('error', (err) => {
//       console.error('Youtube download stream error:', err);
//     });

//   } catch (err) {
//     console.error('Youtube download error:', err);
//     if (!res.headersSent) {
//       res.status(500).json({ success: false, msg: 'Đã xảy ra lỗi khi tải nhạc. Vui lòng thử lại sau.' });
//     }
//   }
// });

// ========== PROFILE ==========

// GET profile
app.get('/api/profile', auth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, avatar, bio, created_at')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi tải profile' });
  }
});

// PUT profile (update bio, name)
app.put('/api/profile', auth, async (req, res) => {
  try {
    const { name, bio } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (bio !== undefined) updateData.bio = bio.trim();

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.user.id)
      .select('id, name, email, role, avatar, bio, created_at')
      .single();

    if (error) throw error;
    res.json({ success: true, msg: 'Cập nhật profile thành công', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi cập nhật profile' });
  }
});

// Upload avatar
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, GIF, WebP images are allowed'));
  }
});

app.post('/api/profile/avatar', auth, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, msg: 'Thiếu file ảnh' });

    const ext = path.extname(req.file.originalname) || '.jpg';
    const fileName = `avatars/${req.user.id}_${uuidv4()}${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('Image')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('Image').getPublicUrl(fileName);
    const avatarUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar: avatarUrl })
      .eq('id', req.user.id);

    if (updateError) throw updateError;

    res.json({ success: true, msg: 'Cập nhật avatar thành công', avatar: avatarUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi upload avatar' });
  }
});

// ========== PERSONAL STATS ==========
app.get('/api/stats/me', auth, async (req, res) => {
  try {
    // Total play count
    const { count: totalPlays } = await supabase
      .from('play_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    // Liked count
    const { count: totalLikes } = await supabase
      .from('liked_songs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    // Playlists count
    const { count: totalPlaylists } = await supabase
      .from('playlists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    // Uploaded songs count
    const { count: totalUploaded } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    // Top 5 most played songs by this user
    const { data: historyData } = await supabase
      .from('play_history')
      .select('song_id, songs (id, name, url, image_url, author)')
      .eq('user_id', req.user.id);

    const songPlayCounts = {};
    const songMap = {};
    if (historyData) {
      historyData.forEach(item => {
        if (item.songs) {
          const sid = item.song_id;
          songPlayCounts[sid] = (songPlayCounts[sid] || 0) + 1;
          if (!songMap[sid]) songMap[sid] = item.songs;
        }
      });
    }

    const topSongs = Object.entries(songPlayCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        ...songMap[id],
        imageUrl: songMap[id]?.image_url,
        playCount: count
      }));

    // Top genres/authors
    const authorCounts = {};
    if (historyData) {
      historyData.forEach(item => {
        if (item.songs?.author) {
          authorCounts[item.songs.author] = (authorCounts[item.songs.author] || 0) + 1;
        }
      });
    }
    const topAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Estimated listening time (avg 3.5 min per song)
    const estimatedMinutes = (totalPlays || 0) * 3.5;

    res.json({
      success: true,
      stats: {
        totalPlays: totalPlays || 0,
        totalLikes: totalLikes || 0,
        totalPlaylists: totalPlaylists || 0,
        totalUploaded: totalUploaded || 0,
        estimatedMinutes: Math.round(estimatedMinutes),
        topSongs,
        topAuthors
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi tải thống kê' });
  }
});

// ========== LEADERBOARD ==========
app.get('/api/leaderboard', auth, async (req, res) => {
  try {
    // Top 20 songs by play count (all users)
    const { data: allHistory } = await supabase
      .from('play_history')
      .select('song_id, user_id, songs (id, name, url, image_url, author, status)');

    // -- Top Songs --
    const songCounts = {};
    const songData = {};
    const userCounts = {};

    if (allHistory) {
      allHistory.forEach(item => {
        if (item.songs && item.songs.status === 'approved') {
          const sid = item.song_id;
          songCounts[sid] = (songCounts[sid] || 0) + 1;
          if (!songData[sid]) songData[sid] = item.songs;
        }
        // User counts
        userCounts[item.user_id] = (userCounts[item.user_id] || 0) + 1;
      });
    }

    const topSongs = Object.entries(songCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id, count], index) => ({
        rank: index + 1,
        ...songData[id],
        imageUrl: songData[id]?.image_url,
        playCount: count
      }));

    // -- Top Users --
    const userIds = Object.keys(userCounts).map(Number);
    let topUsers = [];
    if (userIds.length > 0) {
      const { data: usersInfo } = await supabase
        .from('users')
        .select('id, name, avatar')
        .in('id', userIds);

      const usersMap = {};
      if (usersInfo) usersInfo.forEach(u => usersMap[u.id] = u);

      topUsers = Object.entries(userCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([userId, count], index) => ({
          rank: index + 1,
          ...usersMap[Number(userId)],
          playCount: count
        }));
    }

    res.json({ success: true, topSongs, topUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi tải bảng xếp hạng' });
  }
});

// ========== NOTIFICATIONS ==========

// GET notifications
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error && error.code === '42P01') {
      return res.json({ success: true, notifications: [], unreadCount: 0 });
    }
    if (error) throw error;

    const unreadCount = notifications.filter(n => !n.is_read).length;

    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi tải thông báo' });
  }
});

// Mark single notification as read
app.put('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi đánh dấu đã đọc' });
  }
});

// Mark all as read
app.put('/api/notifications/read-all', auth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi đánh dấu tất cả đã đọc' });
  }
});

// Helper: create notification
async function createNotification(userId, type, title, message, songId = null) {
  try {
    await supabase.from('notifications').insert([{
      user_id: userId,
      type,
      title,
      message,
      song_id: songId
    }]);
  } catch (err) {
    console.error('Notification create error:', err);
  }
}

// ---------- Start Server ----------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
