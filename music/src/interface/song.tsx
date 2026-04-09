export default interface Song {
  id: number;
  name: string;
  url: string;
  image?: string;
  singer?: string;
  status?: 'pending' | 'approved' | 'rejected';
  user_id?: number;
  created_at?: string;
  rejection_reason?: string;
}