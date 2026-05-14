/**
 * Interface đại diện cho thông báo trong hệ thống.
 */
export interface Notification {
  id: number;
  user_id: number;
  type: 'song_approved' | 'song_rejected' | 'new_comment' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  song_id?: number | null;
  created_at: string;
}
