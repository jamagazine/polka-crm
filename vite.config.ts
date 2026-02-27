import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // ЭТО САМАЯ ВАЖНАЯ СТРОКА ДЛЯ GITHUB PAGES:
  base: '/polka-crm/',

  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  server: {
    proxy: {
      '/api-cs': {
        target: 'https://web.cloudshop.ru',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-cs/, ''),
      },
    },
  },
})