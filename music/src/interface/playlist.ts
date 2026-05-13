import type Song from "./song";

/**
 * Interface cơ bản cho Playlist.
 */
export interface Playlist {
  id: number;
  name: string;
  description?: string;
  coverImage?: string;
  userId: number;
  createdAt: string;
  updatedAt: string;

  // Trường từ API (snake_case)
  user_id?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Chi tiết playlist bao gồm danh sách bài hát đã được thêm.
 */
export interface PlaylistDetail extends Playlist {
  songs: PlaylistSong[];
}

/**
 * Mở rộng Song với thông tin ngày thêm vào playlist.
 */
export interface PlaylistSong extends Song {
  addedAt?: string;
  added_at?: string;
}

export default Playlist;