export default interface User {
  id: number;
  name: string;
  role: 'USER' | 'ADMIN';
}