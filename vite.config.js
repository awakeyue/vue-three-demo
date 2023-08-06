import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import fs from 'fs'
// import path from 'path'
// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    // https: {
    //   cert: fs.readFileSync(path.join(__dirname, 'keys/cert.crt')),
    //   key: fs.readFileSync(path.join(__dirname, 'keys/cert.key'))
    // },
    hmr: true,
    proxy: {
      '/api': {
        target: 'http://music.163.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
  },
  plugins: [vue()]
})
