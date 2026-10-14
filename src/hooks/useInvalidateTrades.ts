import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/** Mark dashboard/history queries stale without refetch (e.g. after save on calculator). */
export function useMarkTradesStale() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['dashboard'],
      refetchType: 'none',
    });
    queryClient.invalidateQueries({
      queryKey: ['trades'],
      refetchType: 'none',
    });
  }, [queryClient]);
}

/** Refetch dashboard/history (use when the user is on those screens). */
export function useInvalidateTrades() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['trades'] });
  }, [queryClient]);
}
