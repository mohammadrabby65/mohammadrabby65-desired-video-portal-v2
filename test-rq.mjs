import { QueryClient, QueryObserver } from '@tanstack/react-query';
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnMount: false, staleTime: 3600000 } },
});
const obs1 = new QueryObserver(queryClient, { queryKey: ['test'], queryFn: async () => 'data', enabled: false });
obs1.subscribe(() => {});
console.log('Obs1 created. State:', queryClient.getQueryState(['test']));
const obs2 = new QueryObserver(queryClient, { queryKey: ['test'], queryFn: async () => 'data', enabled: true });
obs2.subscribe(() => {});
console.log('Obs2 created. State:', queryClient.getQueryState(['test']));
