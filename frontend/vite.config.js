import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Base path for deployment (default "/" works for most cases)
  base: '/',
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Generate sourcemap for better debugging in production
    sourcemap: false,
    // Optimize build
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  },
  
  // Dev server configuration
  server: {
    port: 5174,
    open: true,
    // Enable history API fallback for SPA routing in dev
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  
  // Preview server (for testing build locally)
  preview: {
    port: 4173,
    // Enable history API fallback for SPA routing in preview
    historyApiFallback: true
  }
})
