import type Song from "./song";
// ========== DỮ LIỆU PLAYLIST ==========
export interface Playlist {
  id: number;           // bigint -> number trong JS
  name: string;
  user_id: number;
  created_at: string;   // ISO date string
  updated_at: string;
}

// ========== CHI TIẾT PLAYLIST (kèm danh sách bài hát) ==========
export interface PlaylistDetail extends Playlist {
  songs: (Song & { addedAt: string })[];
}

// ========== PROPS CHO COMPONENT (nếu cần) ==========
export interface PlaylistsPageProps {
  // Ví dụ: nếu bạn truyền token từ context xuống
  token?: string;
}