import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // 1. Добавляем базу для GitHub Pages (обязательно в кавычках и со слэшами)
  base: '/polka-crm/',

  plugins: [
    // Плагины React и Tailwind необходимы для сборки
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      // Настройка @ для быстрого доступа к папке src
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Поддержка импорта SVG и CSV файлов
  assetsInclude: ['**/*.svg', '**/*.csv'],

  server: {
    proxy: {
      // Настройка прокси, чтобы обходить блокировки браузера при запросах к CloudShop
      '/api-cs': {
        target: 'https://web.cloudshop.ru',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-cs/, ''),
      },
    },
  },
})