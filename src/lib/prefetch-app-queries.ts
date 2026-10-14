import type { QueryClient } from '@tanstack/react-query';
import { TRADES_PAGE_SIZE } from '@/shared/trades-pagination';
import { api } from '../services/api';
import { defaultPeriodFilter, periodToQuery } from './period-filter';
import { dashboardStatsKey, tradesListKey } from './trades-query-keys';

export function prefetchDashboardAndHistory(queryClient: QueryClient) {
  const period = defaultPeriodFilter();
  const periodQuery = periodToQuery(period);

  void queryClient.prefetchQuery({
    queryKey: dashboardStatsKey(period),
    queryFn: ({ signal }) => api.getDashboardStats(periodQuery, signal),
    staleTime: 60_000,
  });

  void queryClient.prefetchInfiniteQuery({
    queryKey: tradesListKey(period),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api.getTrades(
        {
          ...periodQuery,
          limit: TRADES_PAGE_SIZE,
          ...(pageParam ? { cursor: pageParam as string } : {}),
        },
        signal,
      ),
    getNextPageParam: (lastPage: Awaited<
      ReturnType<typeof api.getTrades>
    >) =>
      lastPage.hasMore && lastPage.nextCursor
        ? lastPage.nextCursor
        : undefined,
    staleTime: 60_000,
  });
}
