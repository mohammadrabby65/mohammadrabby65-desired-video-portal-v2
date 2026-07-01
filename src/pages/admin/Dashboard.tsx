import { Link } from 'react-router-dom';
import { useAdminStats, useAdminPosts } from '../../hooks/useAdmin';
import { FileVideo, ListVideo, Eye, Plus, FolderKanban } from 'lucide-react';
import { formatTimeAgo, formatViews } from '../../lib/utils';

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: postsData, isLoading: postsLoading } = useAdminPosts(5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Overview</h1>
        <Link 
          to="/admin/posts/new"
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Post
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Stat Cards */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <ListVideo className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-neutral-400 text-sm font-medium">Total Posts</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {statsLoading ? '...' : stats?.totalPosts}
            </h3>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
            <FolderKanban className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-neutral-400 text-sm font-medium">Categories</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {statsLoading ? '...' : stats?.totalCategories}
            </h3>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
            <Eye className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className="text-neutral-400 text-sm font-medium">Total Views</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {statsLoading ? '...' : stats?.totalViews}
            </h3>
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Recent Posts</h2>
          <Link to="/admin/posts" className="text-sm text-red-500 hover:text-red-400 font-medium">
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-950/50 text-neutral-400">
              <tr>
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Views</th>
                <th className="px-5 py-3 font-medium">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-neutral-300">
              {postsLoading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-neutral-500">Loading recent posts...</td>
                </tr>
              ) : postsData?.posts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-neutral-500">No posts found</td>
                </tr>
              ) : (
                postsData?.posts.map((post) => (
                  <tr key={post.id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="px-5 py-3 flex items-center gap-3">
                      <img src={post.thumbnailUrl} alt={post.title} loading="lazy" className="w-12 h-8 rounded object-cover bg-neutral-800" />
                      <span className="font-medium truncate max-w-[200px] md:max-w-[300px]">{post.title}</span>
                    </td>
                    <td className="px-5 py-3">{(post.categories || []).join(', ') || (post as any).category}</td>
                    <td className="px-5 py-3">{formatViews(post.views)}</td>
                    <td className="px-5 py-3 text-neutral-400">{formatTimeAgo(post.publishedAt)}</td>
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
