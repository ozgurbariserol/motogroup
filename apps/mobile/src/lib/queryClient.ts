import { QueryClient } from '@tanstack/react-query';

// Server state (kulüp/etkinlik/rota) için tek QueryClient (CLAUDE.md Bölüm 3).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});
