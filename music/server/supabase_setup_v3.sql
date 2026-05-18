-- ============================================
-- PHASE 3: Private Songs (Nhạc Riêng Tư)
-- Chạy đoạn SQL này trong Supabase SQL Editor
-- ============================================

-- 1. Thêm cột visibility vào bảng songs
-- 'public' = nhạc công khai (mặc định, cần admin duyệt)
-- 'private' = nhạc riêng tư (chỉ chủ sở hữu xem được, không cần duyệt)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';

-- 2. Index để query nhanh hơn
CREATE INDEX IF NOT EXISTS idx_songs_visibility ON songs(visibility);
CREATE INDEX IF NOT EXISTS idx_songs_user_visibility ON songs(user_id, visibility);
