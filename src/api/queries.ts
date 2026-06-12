import { QueryClient, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPublicStore, placePublicOrder, type PublicStorePayload } from './storefront.api';

/**
 * TanStack Query data layer. The QueryClient owns server-state fetching, caching,
 * and invalidation; query keys are centralized here so mutations can invalidate the
 * right caches. Hooks are typed against the shared contract.
 *
 * Migration status: the public storefront read path uses this. Admin/platform
 * surfaces still hydrate the Zustand store from /bootstrap; moving those reads onto
 * these hooks (and shrinking the store to session+UI+cart) is the remaining
 * incremental work — the seam is established here.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        if (message.includes('not found')) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 4_000),
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  publicStore: (slug: string) => ['public-store', slug] as const,
};

/** Cached public storefront fetch (store + active products + discounts). */
export function usePublicStore(slug: string | undefined) {
  return useQuery<PublicStorePayload>({
    queryKey: queryKeys.publicStore(slug ?? ''),
    queryFn: () => getPublicStore(slug!),
    enabled: !!slug,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
}

/** Place an order, then invalidate the storefront so stock/availability refresh. */
export function usePlaceOrder(slug: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof placePublicOrder>[1]) => placePublicOrder(slug!, payload),
    onSuccess: () => {
      if (slug) client.invalidateQueries({ queryKey: queryKeys.publicStore(slug) });
    },
  });
}
