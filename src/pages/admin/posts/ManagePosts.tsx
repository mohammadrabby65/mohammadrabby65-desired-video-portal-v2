import { useState } from "react";
import { Link } from "react-router-dom";
import { DocumentSnapshot } from "firebase/firestore";
import { useAdminPosts } from "../../../hooks/useAdmin";
import { useQueryClient } from "@tanstack/react-query";
import { Edit, Trash2, Search, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatTimeAgo, formatViews } from "../../../lib/utils";
import { useAuth } from "../../../contexts/AuthContext";

export function ManagePosts() {
  const [pageParam, setPageParam] = useState<DocumentSnapshot | null>(null);
  const [history, setHistory] = useState<DocumentSnapshot[]>([]);
  const { data, isLoading } = useAdminPosts(10, pageParam);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsDeletingId(id);

    try {
      if (!user) {
        const msg = "Unauthorized: You must be signed in as an administrator to delete posts.";
        setErrorMessage(msg);
        alert(msg);
        setIsDeletingId(null);
        return;
      }

      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        let msg = "Failed to delete post.";
        if (res.status === 401) {
          msg = "Unauthorized: Invalid or expired admin credentials. Please re-login.";
        } else if (res.status === 403) {
          msg = "Permission denied: Your account is not authorized to delete posts.";
        } else if (res.status === 404) {
          msg = `Not found: Video document with ID "${id}" does not exist in Firestore or the production snapshot.`;
        } else {
          msg = `Server error (${res.status}): ${body.message || body.error || "An internal error occurred."}`;
        }
        setErrorMessage(msg);
        alert(msg);
        setIsDeletingId(null);
        return;
      }

      setSuccessMessage(`Post "${id}" was deleted successfully.`);
      queryClient.invalidateQueries({ queryKey: ["admin", "posts"] });
    } catch (e: any) {
      const msg = `Client / Network error: ${e.message || "Failed to communicate with deletion API."}`;
      console.error("Error deleting post:", e);
      setErrorMessage(msg);
      alert(msg);
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleNext = () => {
    if (data?.lastDoc) {
      setHistory((prev) => [...prev, pageParam!]);
      setPageParam(data.lastDoc);
    }
  };

  const handlePrev = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(history.slice(0, -1));
      setPageParam(prev);
    } else {
      setPageParam(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Manage Posts
        </h1>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search posts (dummy)..."
              className="pl-9 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white focus:ring-1 focus:ring-red-500 w-full sm:w-64"
            />
          </div>
          <Link
            to="/admin/posts/new"
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Post</span>
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 bg-red-950/50 border border-red-800/80 rounded-xl text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <div className="flex-1">{errorMessage}</div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-200 text-xs font-semibold px-2 py-1 rounded"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 p-4 bg-green-950/50 border border-green-800/80 rounded-xl text-green-300 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-400" />
          <div className="flex-1">{successMessage}</div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-400 hover:text-green-200 text-xs font-semibold px-2 py-1 rounded"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-950/50 text-neutral-400 border-b border-neutral-800">
              <tr>
                <th className="px-5 py-4 font-medium">Video</th>
                <th className="px-5 py-4 font-medium">Category</th>
                <th className="px-5 py-4 font-medium">Stats</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-neutral-300">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-neutral-500"
                  >
                    Loading posts...
                  </td>
                </tr>
              ) : data?.posts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-neutral-500"
                  >
                    No posts found
                  </td>
                </tr>
              ) : (
                data?.posts.map((post) => (
                  <tr
                    key={post.id}
                    className="hover:bg-neutral-800/30 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-4">
                        <img
                          src={post.thumbnailUrl}
                          alt={post.title}
                          loading="lazy"
                          className="w-16 h-10 rounded object-cover bg-neutral-800 border border-neutral-700"
                        />
                        <div className="flex flex-col">
                          <span className="font-medium text-white truncate max-w-[200px] lg:max-w-[300px]">
                            {post.title}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {post.duration}
                            {post.quality ? ` • ${post.quality}` : ""}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set(post.categories
                          ? post.categories
                          : (post as any).category
                            ? [(post as any).category]
                            : []
                        )).map((cat: any) => (
                          <Link
                            key={cat}
                            to={`/category/${cat
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/(^-|-$)+/g, "")}`}
                          >
                            <span className="bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors">
                              {cat}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col">
                        <span className="text-white">
                          {formatViews(post.views)} views
                        </span>
                        <span className="text-xs text-neutral-500">
                          {formatTimeAgo(post.publishedAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        {post.featured && (
                          <span
                            className="w-2 h-2 rounded-full bg-blue-500"
                            title="Featured"
                          ></span>
                        )}
                        {post.trending && (
                          <span
                            className="w-2 h-2 rounded-full bg-red-500"
                            title="Trending"
                          ></span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/posts/edit/${post.id}`}
                          className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-neutral-800 flex items-center justify-between">
          <span className="text-sm text-neutral-400">
            Showing 10 posts per page
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={!pageParam && history.length === 0}
              className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-md text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={!data?.lastDoc || data.posts.length < 10}
              className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-md text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
