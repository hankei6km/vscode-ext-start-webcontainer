import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [],
  test: {
    //environment: 'jsdom',
    includeSource: ['src/**/*.{js,ts}'],
    exclude: [
      '**server/**/*',
      '**/webview-ui/**/*',
      '**/out/**/*',
      '**/node_modules/**/*',
      '**/dist/**/*'
    ],
    //setupFiles: './src/test/setup.ts',
    coverage: {
      enabled: true,
      reporter: ['text']
    }
  }
})
