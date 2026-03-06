import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    {
      name: 'customer-rewrite',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url.split('?')[0];

          // /xxx/win → win.html (ưu tiên trước)
          if (/^\/[^/]+\/win$/.test(url)) {
            req.url = '/win.html'; return next();
          }
          // /xxx/lose → lose.html (ưu tiên trước)
          if (/^\/[^/]+\/lose$/.test(url)) {
            req.url = '/lose.html'; return next();
          }
          // /xxx → index.html (chỉ khi không phải file tĩnh)
          if (
            /^\/[^/]+$/.test(url) &&
            !url.startsWith('/assets') &&
            !url.startsWith('/customers') &&
            !url.startsWith('/@') &&
            !url.startsWith('/node_modules') &&
            !url.match(/\.[a-z0-9]+$/i)
          ) {
            req.url = '/index.html'; return next();
          }

          next();
        });
      }
    }
  ],
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
