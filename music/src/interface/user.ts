/**
 * Interface đại diện cho người dùng trong hệ thống.
 */
export default interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'USER' | 'ADMIN';
  isBanned: boolean;
  bio?: string;
  website?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;

  // Thống kê người dùng
  stats?: {
    followersCount: number;
    followingCount: number;
    songsCount: number;
    playlistsCount: number;
  };

  // Trường từ API (snake_case)
  is_banned?: boolean;
  created_at?: string;
  updated_at?: string;
}
