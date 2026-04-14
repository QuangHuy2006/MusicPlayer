import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// https://vitejs.dev/config/
export default defineConfig({
    server: {
      allowedHosts: true, // Cho phép tất cả host (dùng khi dev qua tunnel)
    },
    plugins: [react(), tailwindcss()],
    // Để Vite có thể thay thế biến môi trường khi build
    define: {
      // Không cần thiết nếu bạn dùng import.meta.env
    },
    // Tùy chọn: chỉ rõ thư mục build (mặc định là 'dist')
    build: {
      outDir: "dist",
    },
});
