import { defineConfig } from 'vite'
import { createServer } from './ws/server.js'

createServer(4000)

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    // Nodebox では挙動がちょっと違うので、とりあえずコメントアウト
    //proxy: {
    //  '/socket.io': {
    //    target: 'ws://localhost:4000',
    //    ws: true
    //  }
    //},
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  }
})
