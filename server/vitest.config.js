import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [],
  test: {
    environment: 'happy-dom', // Stream を利用するために定義
    coverage: {
      enabled: true,
      reporter: ['text']
    }
  }
})
