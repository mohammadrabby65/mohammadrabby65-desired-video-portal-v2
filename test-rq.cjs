const { QueryClient } = require('@tanstack/react-query');
const qc = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
    }
  }
});
qc.prefetchQuery({ queryKey: ['test'], queryFn: () => 'data' }).then(() => {
  console.log(qc.getQueryData(['test']));
});
