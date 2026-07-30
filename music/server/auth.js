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
const contentDisposition = require('content-disposition');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

dotenv.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const app = express();

// Middleware
app.use(express.json());

// ---------- Multer config ----------
const storage = multer.memoryStorage();
// Multer config: nhận tối đa 2 file: 'file' (nhạc) và 'image' (ảnh bìa)
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // tổng kích thước tối đa 30MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'file') {
      // Chấp nhận các loại file audio phổ biến
      const allowedMimeTypes = [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/x-wav',
        'audio/m4a',
        'audio/x-m4a',
        'audio/mp4',
        'audio/flac',
        'audio/x-flac',
        'audio/ogg',
        'audio/webm',
        'audio/aac'
      ];
      if (allowedMimeTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|m4a|flac|ogg|webm|aac)$/i)) {
        cb(null, true);
      } else {
        cb(new Error('Chỉ chấp nhận các file âm thanh (MP3, WAV, M4A, FLAC, OGG, AAC)'));
      }
    } else if (file.fieldname === 'image') {
      // Chỉ chấp nhận ảnh JPEG/PNG/GIF
      if (['image/jpeg', 'image/png', 'image/gif'].includes(file.mimetype)) cb(null, true);
      else cb(new Error('Only JPEG, PNG, GIF images are allowed'));
    } else {
      cb(new Error('Unexpected field'));
    }
  }
});

// CORS config
const allowedOrigins = [
  "http://localhost:5173",
  "https://musicplayer-frontend-865e.onrender.com",
  "https://music.werchat.io.vn",
  "http://localhost",
  "https://localhost",
  "capacitor://localhost"
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
      .select('id, name, url, status, author, image_url, rejection_reason, created_at, visibility')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, songs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi lấy danh sách bài hát của bạn' });
  }
});

// Gửi yêu cầu nâng cấp Premium (Chờ xác nhận thanh toán)
app.post('/api/user/request-premium', auth, async (req, res) => {
  try {
    if (req.user.role === 'ADMIN' || req.user.role === 'PREMIUM') {
      return res.status(400).json({ success: false, msg: 'Tài khoản đã có quyền Premium!' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ role: 'PREMIUM_PENDING' })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, msg: 'Yêu cầu nâng cấp đã được gửi. Vui lòng thanh toán và chờ xác nhận!', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi gửi yêu cầu nâng cấp' });
  }
});

// Admin xác nhận thanh toán và nâng cấp Premium
app.post('/api/admin/verify-payment/:userId', auth, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .update({ role: 'PREMIUM' })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Send notification
    createNotification(userId, 'premium_activated', 'Kích hoạt Premium thành công! 💎', 'Tài khoản của bạn đã được nâng cấp lên Premium. Tận hưởng các tính năng cao cấp ngay!', null);

    res.json({ success: true, msg: 'Đã xác nhận thanh toán và nâng cấp Premium!', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi xác nhận thanh toán' });
  }
});

// Webhook nhận thông báo thanh toán tự động (Dành cho SePay, Casso, v.v.)
app.post('/api/payment/webhook', async (req, res) => {
  try {
    // 1. Kiểm tra API Key/Secret nếu có (Để bảo mật)
    // const apiKey = req.headers['x-api-key'];
    // if (apiKey !== process.env.PAYMENT_WEBHOOK_SECRET) return res.status(401).send('Unauthorized');

    const data = req.body;
    console.log('Payment Webhook received:', data);

    // Dữ liệu mẫu từ SePay/Casso thường có trường 'content' (Nội dung chuyển khoản)
    // Và 'amount' (Số tiền)
    const content = data.content || data.description || '';
    const amount = data.amount || 0;

    // Tìm mã QHUY hoặc MP + ID trong nội dung (Ví dụ: "QHUY 123" hoặc "MP123")
    const match = content.match(/(?:QHUY|MP)\s*(\d+)/i);
    if (match && match[1]) {
      const userId = match[1];

      // Chỉ nâng cấp nếu số tiền đủ (Ví dụ 19.000đ)
      if (amount >= 19000) {
        const { data: user, error } = await supabase
          .from('users')
          .update({ role: 'PREMIUM' })
          .eq('id', userId)
          .select()
          .single();

        if (error) {
          console.error('Webhook Upgrade Error:', error);
          return res.status(500).json({ success: false });
        }

        // Thông báo cho người dùng
        createNotification(userId, 'premium_activated', 'Premium đã được kích hoạt tự động! 💎', `Hệ thống đã nhận được ${amount.toLocaleString()}đ. Tài khoản của bạn đã được nâng cấp.`, null);

        console.log(`User ${userId} upgraded to PREMIUM via Webhook`);
        return res.json({ success: true, msg: 'Upgrade successful' });
      }
    }

    res.json({ success: false, msg: 'Invalid payment data' });
  } catch (err) {
    console.error('Webhook Error:', err);
    res.status(500).send('Server Error');
  }
});

// Lấy danh sách các yêu cầu thanh toán đang chờ
app.get('/api/admin/payments', auth, adminOnly, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('role', 'PREMIUM_PENDING');

    if (error) throw error;
    res.json({ success: true, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Lỗi lấy danh sách thanh toán' });
  }
});

// Cập nhật bài hát của user (Update)
app.put('/api/user/my-songs/:id', auth, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, author, lyrics, visibility } = req.body;
    const musicFile = req.files?.['file']?.[0];
    const imageFile = req.files?.['image']?.[0];

    // 1. Kiểm tra bài hát tồn tại và thuộc về user
    const { data: song, error: fetchError } = await supabase
      .from('songs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !song) {
      return res.status(404).json({ success: false, msg: 'Bài hát không tồn tại' });
    }
    if (String(song.user_id) !== String(req.user.id)) {
      return res.status(403).json({ success: false, msg: 'Bạn không có quyền sửa bài hát này' });
    }

    const updateData = {};
    if (name) {
      let normalizedName = name.trim();
      normalizedName = normalizedName.replace(/\.(mp3|wav|flac|m4a|ogg|aac|webm)$/i, '');
      updateData.name = normalizedName;
    }
    if (author !== undefined) {
      let normalizedAuthor = author ? author.trim() : 'Chưa biết';
      if (!normalizedAuthor || normalizedAuthor.toLowerCase() === 'unknown') {
        normalizedAuthor = 'Chưa biết';
      }
      updateData.author = normalizedAuthor;
    }
    if (lyrics !== undefined) {
      updateData.lyrics = lyrics || null;
    }
    if (visibility !== undefined) {
      updateData.visibility = visibility === 'private' ? 'private' : 'public';
      if (visibility === 'private') {
        updateData.status = 'approved';
      }
    }

    // 2. Nếu có upload file nhạc mới
    let newMusicUrl = null;
    let newMusicFilePath = null;
    if (musicFile) {
      let normalizedBuffer;
      try {
        normalizedBuffer = await normalizeAudio(musicFile.buffer);
      } catch (normalizeError) {
        console.error('Audio normalization error:', normalizeError);
        return res.status(400).json({
          success: false,
          msg: 'Không thể chuẩn hóa file nhạc mới. Vui lòng kiểm tra lại định dạng.'
        });
      }

      const musicFileName = `${uuidv4()}.mp3`;
      newMusicFilePath = `songs/${musicFileName}`;

      const { error: musicUploadError } = await supabase.storage
        .from('Music')
        .upload(newMusicFilePath, normalizedBuffer, {
          contentType: 'audio/mpeg',
          cacheControl: '3600',
        });

      if (musicUploadError) {
        console.error('Music upload error:', musicUploadError);
        return res.status(500).json({ success: false, msg: 'Lỗi upload file nhạc mới' });
      }

      const { data: musicUrlData } = supabase.storage.from('Music').getPublicUrl(newMusicFilePath);
      newMusicUrl = musicUrlData.publicUrl;
      updateData.url = newMusicUrl;
    }

    // 3. Nếu có upload ảnh bìa mới
    let newImageUrl = null;
    let newImageFilePath = null;
    if (imageFile) {
      const imageExt = path.extname(imageFile.originalname);
      const imageFileName = `${uuidv4()}${imageExt}`;
      newImageFilePath = `images/${imageFileName}`;

      const { error: imageUploadError } = await supabase.storage
        .from('Image')
        .upload(newImageFilePath, imageFile.buffer, {
          contentType: imageFile.mimetype,
          cacheControl: '3600',
        });

      if (imageUploadError) {
        console.error('Image upload error:', imageUploadError);
        if (newMusicFilePath) {
          await supabase.storage.from('Music').remove([newMusicFilePath]);
        }
        return res.status(500).json({ success: false, msg: 'Lỗi upload ảnh bìa mới' });
      }

      const { data: imageUrlData } = supabase.storage.from('Image').getPublicUrl(newImageFilePath);
      newImageUrl = imageUrlData.publicUrl;
      updateData.image_url = newImageUrl;
    }

    // Chuyển trạng thái về pending để admin duyệt lại nếu đổi file nhạc hoặc thông tin
    // Ngoại lệ: Nếu nhạc đang và vẫn là riêng tư thì không cần duyệt (approved)
    const nextVisibility = visibility || song.visibility;
    if (req.user.role !== 'ADMIN' && nextVisibility !== 'private') {
      updateData.status = 'pending';
    }

    const { data: updatedSong, error: dbError } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (dbError) {
      console.error('DB update error:', dbError);
      if (newMusicFilePath) await supabase.storage.from('Music').remove([newMusicFilePath]);
      if (newImageFilePath) await supabase.storage.from('Image').remove([newImageFilePath]);
      return res.status(500).json({ success: false, msg: 'Lỗi cập nhật bài hát' });
    }

    // Xóa file cũ nếu đã upload thành công file mới
    if (newMusicUrl && song.url) {
      const oldPath = song.url.split('/Music/')[1];
      if (oldPath) await supabase.storage.from('Music').remove([oldPath]);
    }
    if (newImageUrl && song.image_url) {
      const oldImagePath = song.image_url.split('/Image/')[1];
      if (oldImagePath) await supabase.storage.from('Image').remove([oldImagePath]);
    }

    res.json({
      success: true,
      msg: req.user.role === 'ADMIN' ? 'Cập nhật bài hát thành công' : 'Cập nhật thành công, chờ admin duyệt lại',
      song: updatedSong
    });

  } catch (err) {
    console.error('Update song error:', err);
    res.status(500).json({ success: false, msg: 'Lỗi máy chủ khi cập nhật bài hát' });
  }
});

// Xóa bài hát của user (cho phép xóa bất kỳ trạng thái nào của bài hát do họ tải lên)
app.delete('/api/user/my-songs/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: song, error: fetchError } = await supabase
      .from('songs')
      .select('user_id, status, url, image_url')
      .eq('id', id)
      .single();

    if (fetchError || !song) {
      return res.status(404).json({ success: false, msg: 'Bài hát không tồn tại' });
    }
    if (String(song.user_id) !== String(req.user.id)) {
      return res.status(403).json({ success: false, msg: 'Bạn không có quyền xóa bài hát này' });
    }

    // Xóa file nhạc trên storage nếu có
    if (song.url) {
      const filePath = song.url.split('/Music/')[1];
      if (filePath) {
        await supabase.storage.from('Music').remove([filePath]);
      }
    }

    // Xóa file ảnh trên storage nếu có
    if (song.image_url) {
      const imagePath = song.image_url.split('/Image/')[1];
      if (imagePath) {
        await supabase.storage.from('Image').remove([imagePath]);
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



// Helper to extract MP3 info (bitrate & sampleRate) from buffer (giữ lại để tương thích nếu cần)
function getMp3Info(buffer) {
  let offset = 0;
  if (buffer.length >= 10 && buffer.toString('ascii', 0, 3) === 'ID3') {
    const sizeBytes = buffer.slice(6, 10);
    const tagSize = (sizeBytes[0] << 21) | (sizeBytes[1] << 14) | (sizeBytes[2] << 7) | sizeBytes[3];
    offset = tagSize + 10;
  }
  while (offset < buffer.length - 4) {
    if (buffer[offset] === 0xFF && (buffer[offset + 1] & 0xE0) === 0xE0) {
      const byte1 = buffer[offset + 1];
      const byte2 = buffer[offset + 2];
      const mpegVersion = (byte1 & 0x18) >> 3;
      const layer = (byte1 & 0x06) >> 1;
      const bitrateIndex = (byte2 & 0xF0) >> 4;
      const sampleRateIndex = (byte2 & 0x0C) >> 2;
      if (mpegVersion === 3 && layer === 1) {
        const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
        const sampleRates = [44100, 48000, 32000, 0];
        const bitrate = bitrates[bitrateIndex];
        const sampleRate = sampleRates[sampleRateIndex];
        return { bitrate, sampleRate };
      }
    }
    offset++;
  }
  return null;
}

// Helper chuẩn hóa audio về MP3 128kbps 44.1kHz
function normalizeAudio(inputBuffer) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, [
      '-i', 'pipe:0',            // input from stdin
      '-codec:a', 'libmp3lame',   // convert to mp3
      '-b:a', '128k',            // transcode to 128kbps
      '-ar', '44100',            // 44.1kHz sample rate
      '-f', 'mp3',               // format mp3
      'pipe:1'                   // output to stdout
    ]);

    const chunks = [];
    const errorChunks = [];

    ffmpeg.stdout.on('data', (chunk) => {
      chunks.push(chunk);
    });

    ffmpeg.stderr.on('data', (chunk) => {
      errorChunks.push(chunk);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        const errorMsg = Buffer.concat(errorChunks).toString();
        reject(new Error(`FFmpeg exited with code ${code}: ${errorMsg}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });

    ffmpeg.stdin.on('error', (err) => {
      console.error('ffmpeg stdin error:', err);
    });

    try {
      ffmpeg.stdin.write(inputBuffer);
      ffmpeg.stdin.end();
    } catch (writeError) {
      reject(writeError);
    }
  });
}

// ---------- Songs Routes ----------
app.post('/api/songs', auth, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, author, lyrics, visibility } = req.body;
    const musicFile = req.files?.['file']?.[0];
    const imageFile = req.files?.['image']?.[0];

    if (!name || !musicFile) {
      return res.status(400).json({ success: false, msg: 'Thiếu tên bài hát hoặc file nhạc' });
    }

    // --- Chuẩn hóa tên bài hát và nghệ sĩ ---
    let normalizedName = name.trim();
    // Loại bỏ đuôi file trong tên bài hát nếu có
    normalizedName = normalizedName.replace(/\.(mp3|wav|flac|m4a|ogg|aac|webm)$/i, '');

    let normalizedAuthor = author ? author.trim() : 'Chưa biết';
    if (!normalizedAuthor || normalizedAuthor.toLowerCase() === 'unknown') {
      normalizedAuthor = 'Chưa biết';
    }

    // --- Chuẩn hóa nhạc về chuẩn MP3 128kbps ---
    let normalizedBuffer;
    try {
      normalizedBuffer = await normalizeAudio(musicFile.buffer);
    } catch (normalizeError) {
      console.error('Audio normalization error:', normalizeError);
      return res.status(400).json({
        success: false,
        msg: 'Không thể chuẩn hóa file nhạc này. Vui lòng kiểm tra lại định dạng file hoặc chọn file khác.'
      });
    }

    // --- Upload file nhạc đã chuẩn hóa lên bucket 'Music' ---
    const musicFileName = `${uuidv4()}.mp3`;
    const musicFilePath = `songs/${musicFileName}`;

    const { error: musicUploadError } = await supabase.storage
      .from('Music')
      .upload(musicFilePath, normalizedBuffer, {
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
    const status = (req.user.role === 'ADMIN' || visibility === 'private') ? 'approved' : 'pending';

    const songData = {
      name: normalizedName,
      url: songUrl,
      user_id: req.user.id,
      status,
      author: normalizedAuthor,         // lưu author đã chuẩn hóa
      image_url: imageUrl,              // lưu URL ảnh (có thể null)
      lyrics: lyrics || null,           // lưu lời bài hát
      visibility: visibility === 'private' ? 'private' : 'public'
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

app.get('/api/songs', auth, async (req, res) => {
  try {
    let query = supabase
      .from('songs')
      .select('id, name, url, status, author, image_url, lyrics, user_id, visibility');

    if (req.user.role !== 'ADMIN') {
      query = query.or(`and(status.eq.approved,visibility.eq.public),user_id.eq.${req.user.id}`);
    }

    const { data: songs, error } = await query.order('created_at', { ascending: false });

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
    if (String(playlist.user_id) !== String(req.user.id)) {
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
      .select('id, name, url, author, image_url, status, visibility, user_id')
      .in('id', songIds)
      .eq('status', 'approved');

    if (songsError) throw songsError;

    // Ghép thêm added_at
    const visibleSongs = songs.filter(s => s.visibility !== 'private' || String(s.user_id) === String(req.user.id));
    const songsWithAddedAt = visibleSongs.map(song => ({
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
    if (String(playlist.user_id) !== String(req.user.id)) {
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
    if (String(playlist.user_id) !== String(req.user.id)) {
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
    if (String(playlist.user_id) !== String(req.user.id)) {
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
      .select('song_id, created_at, songs (id, name, url, image_url, author, status, visibility, user_id)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    // Map to match song interface
    const songs = data.map(item => ({
      ...item.songs,
      liked_at: item.created_at
    })).filter(s => s.status === 'approved' && (s.visibility !== 'private' || String(s.user_id) === String(req.user.id)));

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
      .select('song_id, played_at, songs (id, name, url, image_url, author, status, visibility, user_id)')
      .eq('user_id', req.user.id)
      .order('played_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Filter duplicates and unapproved
    const uniqueSongs = [];
    const seen = new Set();

    for (const item of data) {
      if (item.songs?.status === 'approved' &&
        (item.songs.visibility !== 'private' || String(item.songs.user_id) === String(req.user.id)) &&
        !seen.has(item.song_id)) {
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
        .select('id, name, url, image_url, author, status, visibility')
        .eq('status', 'approved')
        .eq('visibility', 'public')
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
        .select('id, name, url, image_url, author, status, visibility')
        .eq('status', 'approved')
        .eq('visibility', 'public')
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
      .select('song_id, songs (id, name, url, image_url, author, status, lyrics, visibility)')
      .order('played_at', { ascending: false })
      .limit(500);

    if (historyError) throw historyError;

    const playCounts = {};
    const songData = {};

    history.forEach(item => {
      if (item.songs && item.songs.status === 'approved' && item.songs.visibility === 'public') {
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
    if (song && song.user_id && String(song.user_id) !== String(req.user.id)) {
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
    const { count: pendingPayments } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'PREMIUM_PENDING');

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        totalSongs: totalSongs || 0,
        pendingSongs: pendingSongs || 0,
        totalPlaylists: totalPlaylists || 0,
        pendingPayments: pendingPayments || 0
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

// Tạo người dùng mới (Admin)
app.post('/api/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, msg: "Vui lòng nhập đầy đủ thông tin" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from("users")
      .insert([{ name, email, password: hashedPassword, role: role || 'USER' }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, msg: "Tạo người dùng thành công", user: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Lỗi tạo người dùng" });
  }
});

// Cập nhật người dùng (Admin - Bao gồm đổi mật khẩu)
app.put('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, msg: "Cập nhật người dùng thành công", user: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Lỗi cập nhật người dùng" });
  }
});

// Xóa người dùng (Admin)
app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (id == 1) return res.status(403).json({ success: false, msg: "Không thể xóa Admin gốc" });

    const { error } = await supabase.from("users").delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, msg: "Xóa người dùng thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Lỗi xóa người dùng" });
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
