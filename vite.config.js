import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        win:  resolve(__dirname, 'win.html'),
        lose: resolve(__dirname, 'lose.html'),
      }
    }
  }
})
