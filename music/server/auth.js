const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require("cookie-parser");

dotenv.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS config
const allowedOrigins = [
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3002",
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
  const token = req.cookies.access_token;
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
  if (req.user.role !== 'ADMIN') {
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
      .insert([{ user_id: user.id, token, expires_at: expiresAt }]);

    if (insertError) {
      console.error('Insert token error:', insertError);
      return res.status(500).json({ success: false, msg: "Lỗi lưu phiên đăng nhập" });
    }

    res.cookie("access_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 8 * 60 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      msg: "Đăng nhập thành công",
      user: { id: user.id, name: user.name, role: user.role, email: user.email, token },
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
      .select('*')
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

app.post("/api/auth/logout", async (req, res) => {
  const token = req.cookies.access_token;
  if (token) {
    await supabase.from('user_tokens').delete().eq('token', token);
  }
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });
  res.json({ success: true, msg: "Đã đăng xuất" });
});

// ---------- Multer config ----------
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg') cb(null, true);
    else cb(new Error('Only MP3 files are allowed'), false);
  }
});

// ---------- Songs Routes ----------
app.post('/api/songs', auth, upload.single('file'), async (req, res) => {
  try {
    const { name } = req.body;
    const file = req.file;
    if (!name || !file) {
      return res.status(400).json({ success: false, msg: 'Thiếu tên bài hát hoặc file MP3' });
    }

    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = `songs/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('Music')
      .upload(filePath, file.buffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ success: false, msg: 'Lỗi upload file' });
    }

    const { data: urlData } = supabase.storage.from('Music').getPublicUrl(filePath);
    const songUrl = urlData.publicUrl;

    // 👇 Kiểm tra role: admin -> approved, user -> pending
    const status = req.user.role === 'ADMIN' ? 'approved' : 'pending';

    const { data: song, error: dbError } = await supabase
      .from('songs')
      .insert([{ name, url: songUrl, user_id: req.user.id, status}])
      .select()
      .single();

    if (dbError) {
      console.error('DB error:', dbError);
      await supabase.storage.from('Music').remove([filePath]);
      return res.status(500).json({ success: false, msg: 'Lỗi lưu thông tin bài hát' });
    }

    const msg = status === 'approved' 
      ? 'Thêm nhạc thành công' 
      : 'Thêm nhạc thành công, chờ admin duyệt';

    res.json({ success: true, msg, song });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi server' });
  }
});

app.get('/api/songs', auth, async (req, res) => {
  try {
    let query = supabase.from('songs').select('id, name, url').eq('status', 'approved');
    const { data: songs, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('DB error:', error);
      return res.status(500).json({ success: false, msg: 'Lỗi lấy danh sách bài hát' });
    }
    res.json({ success: true, songs: songs.map(song => ({ name: song.name, url: song.url, id: song.id })) });
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

// ---------- Start Server ----------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
