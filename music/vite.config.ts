import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    server: {
      port: 3001,
      // Chỉ dùng proxy khi đang chạy `npm run dev` (development)
      proxy: isDev ? {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          // Không cần rewrite vì backend đã có prefix /api
        }
      } : undefined,
    },
    plugins: [react(), tailwindcss()],
    // Để Vite có thể thay thế biến môi trường khi build
    define: {
      // Không cần thiết nếu bạn dùng import.meta.env
    },
    // Tùy chọn: chỉ rõ thư mục build (mặc định là 'dist')
    build: {
      outDir: 'dist',
    }
  }
});