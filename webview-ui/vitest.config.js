import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react()
    //nodeboxFsFiles({
    //  from: '../boxSrc',
    //  insertTo: 'src/files.ts'
    //})
  ],
  test: {
    environment: 'jsdom',
    includeSource: ['src/**/*.{js,ts}'],
    setupFiles: './src/test/setup.ts',
    coverage: {
      enabled: true,
      reporter: ['text']
    }
  }
})
