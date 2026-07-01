import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { VideoPost } from '../../types';
import { BarChart3, TrendingUp, Eye, FileText } from 'lucide-react';
import { formatViews } from '../../lib/utils';
import { useAdminStats } from '../../hooks/useAdmin';

export function Analytics() {
  const [generate, setGenerate] = useState(false);
  const { data: stats, isLoading: statsLoading } = useAdminStats(generate);

  const { data: popularPosts, isLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'popular'],
    queryFn: async () => {
      const q = query(collection(db, 'posts'), orderBy('views', 'desc'), limit(10));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoPost));
    },
    enabled: generate
  });

  if (!generate) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight text-center">Analytics & Reports</h1>
        <p className="text-neutral-400 text-center max-w-md">
          To minimize database reads and optimize performance, analytics reports are generated on-demand.
        </p>
        <button
          onClick={() => setGenerate(true)}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Generate Report
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-tight">Analytics Report</h1>
        <span className="text-xs bg-green-500/10 text-green-500 px-3 py-1.5 rounded-full font-medium">
          Report Generated
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-neutral-400 text-sm font-medium">Total Platform Views</p>
            <h3 className="text-3xl font-bold text-white mt-1">
              {statsLoading ? '...' : stats?.totalViews || '---'}
            </h3>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className="text-neutral-400 text-sm font-medium">Total Posts</p>
            <h3 className="text-3xl font-bold text-white mt-1">
              {statsLoading ? '...' : stats?.totalPosts || '---'}
            </h3>
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-neutral-800">
          <h2 className="text-lg font-bold text-white">Most Popular Posts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-950/50 text-neutral-400">
              <tr>
                <th className="px-5 py-3 font-medium">Rank</th>
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium text-right">Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-neutral-300">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-neutral-500">Loading data...</td>
                </tr>
              ) : popularPosts?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-neutral-500">No data available</td>
                </tr>
              ) : (
                popularPosts?.map((post, idx) => (
                  <tr key={post.id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-neutral-500">#{idx + 1}</td>
                    <td className="px-5 py-3 font-medium text-white truncate max-w-[200px] lg:max-w-[400px]">{post.title}</td>
                    <td className="px-5 py-3">{(post.categories || []).join(', ') || (post as any).category}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-medium text-emerald-400">
                        <Eye className="w-4 h-4" />
                        {formatViews(post.views)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
