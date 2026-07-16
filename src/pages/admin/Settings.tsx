import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Save, Loader2, Database } from 'lucide-react';

interface SnapshotStatus {
  status: 'Success' | 'Failed' | 'Never Generated';
  lastUpdated: number;
  postsCount: number;
  categoriesCount: number;
  sizeKb: number;
}

function SnapshotManagement() {
  const [status, setStatus] = useState<SnapshotStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/snapshot/status');
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleGenerate = async () => {
    setIsConfirming(false);
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/snapshot/generate', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Snapshot generated successfully.');
        await fetchStatus();
      } else {
        const err = data.error || 'Failed to generate snapshot';
        setErrorMsg(err);
        alert(`Failed to generate snapshot: ${err}`);
        await fetchStatus();
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error generating snapshot');
      alert(`Error generating snapshot: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
        <Database className="w-5 h-5 text-neutral-400" />
        <h2 className="text-lg font-semibold text-white">Snapshot Management</h2>
      </div>

      {status ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800">
            <div className="text-neutral-400 mb-1">Status</div>
            <div className={`font-medium ${status.status === 'Success' ? 'text-green-500' : status.status === 'Failed' ? 'text-red-500' : 'text-yellow-500'}`}>{status.status}</div>
          </div>
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800">
            <div className="text-neutral-400 mb-1">Last Generated</div>
            <div className="text-white font-medium">{status.lastUpdated > 0 ? new Date(status.lastUpdated).toLocaleString() : 'Never'}</div>
          </div>
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800">
            <div className="text-neutral-400 mb-1">Total Posts</div>
            <div className="text-white font-medium">{status.postsCount}</div>
          </div>
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800">
            <div className="text-neutral-400 mb-1">Total Categories</div>
            <div className="text-white font-medium">{status.categoriesCount}</div>
          </div>
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800">
            <div className="text-neutral-400 mb-1">File Size</div>
            <div className="text-white font-medium">{status.sizeKb > 1024 ? (status.sizeKb / 1024).toFixed(2) + ' MB' : status.sizeKb + ' KB'}</div>
          </div>
        </div>
      ) : (
        <div className="text-neutral-400 text-sm">Loading snapshot status...</div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-blue-400 text-sm">
        <div className="font-medium mb-1">Automatic Snapshot Refresh: Every 1 hour</div>
        <p>The system automatically rebuilds the snapshot in the background every hour.</p>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
          <div className="font-medium">Error Generating Snapshot</div>
          <p className="mt-1 font-mono text-xs break-all">{errorMsg}</p>
        </div>
      )}

      <div>
        {!isConfirming ? (
          <button
            type="button"
            onClick={() => setIsConfirming(true)}
            disabled={loading}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {loading ? 'Generating snapshot...' : 'Generate Snapshot Now'}
          </button>
        ) : (
          <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-lg max-w-lg">
            <p className="text-white mb-4">Generate a new public snapshot?<br/>All visitors will immediately receive the updated data.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium"
              >
                Generate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Settings() {
  const [formData, setFormData] = useState({
    siteName: 'DesiredHub',
    logoUrl: 'https://i.ibb.co.com/fV4JS3LH/20260701-143429.png',
    heroBannerUrl: '',
    seoTitle: 'DesiredHub - Free Desi Porn & Hot Indian Sex Videos Online',
    seoDescription: 'Premium Viral sex Video Streaming Platform built with React, Firebase and Vercel.'
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setFormData(snap.data() as any);
        }
      } catch (err) {
        console.error("Error fetching settings", err);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: import('react').FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), formData);
      alert('Settings saved successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="p-8 text-neutral-400">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white tracking-tight">Site Settings</h1>

      <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-8">
        
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-neutral-800 pb-2">General</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Site Name</label>
              <input
                type="text"
                required
                value={formData.siteName}
                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Logo URL</label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-neutral-800 pb-2">SEO & Meta</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Default SEO Title</label>
              <input
                type="text"
                value={formData.seoTitle}
                onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-red-500"
                placeholder="DesiredHub - Free Desi Porn & Hot Indian Sex Videos Online"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Default SEO Description</label>
              <textarea
                rows={3}
                value={formData.seoDescription}
                onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-red-500 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-800 flex justify-end gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Settings
          </button>
        </div>
      </form>

      <SnapshotManagement />
    </div>
  );
}
