import { defineConfig } from 'vitest/config';

// Entegrasyon testleri — çalışan bir yerel Supabase'e (supabase start) ihtiyaç duyar.
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY env'den okunur
// (yoksa yerel varsayılanlar). RLS, trigger'lar, RPC'ler ve uçtan uca akışları doğrular.
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
