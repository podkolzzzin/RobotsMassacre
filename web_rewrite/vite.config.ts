import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => ({
  plugins: mode === 'webrtc' ? [basicSsl()] : [],
  server: {
    port: 3003,
    strictPort: false,
  },
}));
