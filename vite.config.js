import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('firebase')) return 'vendor-firebase';
          if (id.includes('xlsx')) return 'vendor-xlsx';
          if (id.includes('vue') || id.includes('pinia')) return 'vendor-vue';
          return 'vendor';
        },
      },
    },
  },
})
