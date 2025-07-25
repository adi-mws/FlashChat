import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  server: {},
  plugins: [
    react(),
    tailwindcss(),
  ],
})

// proxy: {
    //   '/api': {
    //     target: 'http://234.235.232.356:5000', // Your backend server URL
    //     changeOrigin: true,
    //     secure: false,
    //   },
    // }