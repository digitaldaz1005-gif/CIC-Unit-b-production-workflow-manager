import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    watch: {
      ignored: ['**/src/dist/**', '**/dist/**']
    }
  },
  build: {
    outDir: 'dist'
  }
})
