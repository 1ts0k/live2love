import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: '/live2love/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        contacts: fileURLToPath(new URL('./contacts.html', import.meta.url)),
        messages: fileURLToPath(new URL('./messages.html', import.meta.url)),
        worldbook: fileURLToPath(new URL('./worldbook.html', import.meta.url)),
      },
    },
  },
});
