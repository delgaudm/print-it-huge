import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    server: {
      // HMR can be disabled via DISABLE_HMR=true (used by AI Studio to prevent
      // flickering during agent edits).
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
