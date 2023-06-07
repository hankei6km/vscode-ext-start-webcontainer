import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodeboxFsFiles } from '@hankei6km/rollup-plugin-nodebox-fs-files'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    nodeboxFsFiles({
      from: '../server',
      insertTo: 'src/files.*'
    }),
    react()
  ],
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
})
