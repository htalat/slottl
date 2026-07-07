import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://htalat.github.io/slottl/ (GitHub Pages project site).
  // The router reads this back via import.meta.env.BASE_URL in main.tsx.
  base: '/slottl/',
  plugins: [react(), tailwindcss()],
})
