// @motogroup/shared — mobil ve web tarafından paylaşılan Zod şemaları, tipler ve sabitler.
// Tek doğruluk kaynağı: bu şemalar DB (Bölüm 4) CHECK constraint'leri ile uyumlu
// tutulur. Tüm dış girdi (form, API, webhook) buradaki şemalarla valide edilmeli.

export const SHARED_PACKAGE_NAME = '@motogroup/shared';

// Supabase generated DB tipleri (CLAUDE.md Bölüm 7). Yeniden üretmek için:
//   supabase gen types typescript --local > packages/shared/src/database.types.ts
export type { Database, Json } from './database.types';

export * from './enums';
export * from './constants';
export * from './primitives';

export * from './schemas/profile';
export * from './schemas/motorcycle';
export * from './schemas/club';
export * from './schemas/club-member';
export * from './schemas/event';
export * from './schemas/route';
export * from './schemas/route-favorite';
export * from './schemas/comment';
export * from './schemas/message';
export * from './schemas/subscription';
