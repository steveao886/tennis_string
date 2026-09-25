/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { bagFilePlugin } from './vite/bagFile';

export default defineConfig({
  plugins: [react(), bagFilePlugin()],
  base: '/tennis_string/',
  test: { environment: 'node', include: ['src/**/*.test.ts', 'vite/**/*.test.ts'] },
});
