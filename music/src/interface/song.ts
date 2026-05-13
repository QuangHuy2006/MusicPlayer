/**
 * Interface đại diện cho Nghệ sĩ/Ca sĩ
 */
export interface Artist {
  id: number;
  name: string;
  avatar?: string;
  bio?: string;
}

/**
 * Interface đại diện cho Album
 */
export interface Album {
  id: number;
  name: string;
  coverImage?: string;
  artistId: number;
  releaseDate?: string;
}

/**
 * Interface đại diện cho thông tin bài hát trong hệ thống.
 */
export default interface Song {
  id: number;
  name: string;
  url: string;
  imageUrl?: string;
  author?: string; // Tên ca sĩ hoặc tác giả (legacy)
  artist?: Artist; // Thông tin nghệ sĩ chi tiết
  album?: Album | string; // Thông tin album
  duration?: number; // Thời lượng bài hát (giây)
  genre?: string; // Thể loại nhạc
  status?: 'pending' | 'approved' | 'rejected';
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
  rejectionReason?: string;

  // Trường từ API (snake_case) - hỗ trợ tương thích
  user_id?: number;
  created_at?: string;
  rejection_reason?: string;
}

