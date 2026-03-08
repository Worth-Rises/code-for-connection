import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@openconnect/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@openconnect/ui': path.resolve(__dirname, 'packages/ui/src/index.ts'),
    },
  },
});
