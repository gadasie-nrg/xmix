import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      'react-native': path.resolve(__dirname, 'test/react-native.ts'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['./test/**/*.test.ts?(x)'],
    restoreMocks: true,
    clearMocks: true,
  },
});