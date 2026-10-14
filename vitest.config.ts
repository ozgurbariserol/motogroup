import { defineConfig } from 'vitest/config';

// Birim testleri — hızlı, DB gerektirmez. İş mantığı + şema doğrulamaları.
export default defineConfig({
  test: {
    include: ['packages/shared/**/*.test.ts'],
    environment: 'node',
  },
});
