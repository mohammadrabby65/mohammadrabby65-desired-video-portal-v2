import { useState, useEffect } from 'react';
import { collection, getDocs, query, limit, orderBy, startAfter, DocumentSnapshot, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CheckCircle, AlertTriangle, XCircle, Activity, ExternalLink, Edit, Trash2 } from 'lucide-react';

interface HistoryRecord {
  id: string;
  postId: string;
  title: string;
  videoUrl: string;
  status: string;
  statusCode: number;
  errorMessage?: string;
  checkedAt: any;
  responseTime?: number;
  _deletedLocally?: boolean;
}

export function CheckHistoryTab() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [editingRecord, setEditingRecord] = useState<HistoryRecord | null>(null);
  const [editedUrl, setEditedUrl] = useState('');
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);


  const loadHistory = async (append = false) => {
    try {
      setLoading(true);
      let q = query(
        collection(db, 'deadUrlCheckHistory'),
        orderBy('checkedAt', 'desc'),
        limit(20)
      );

      if (append && lastDoc) {
        q = query(
          collection(db, 'deadUrlCheckHistory'),
          orderBy('checkedAt', 'desc'),
          startAfter(lastDoc),
          limit(20)
        );
      }

      const snap = await getDocs(q);
      
      if (snap.empty) {
        setHasMore(false);
        if (!append) setHistory([]);
        return;
      }

      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === 20);

      const records = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HistoryRecord[];

      if (append) {
        setHistory(prev => [...prev, ...records]);
      } else {
        setHistory(records);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  
  const handleEditClick = async (record: HistoryRecord) => {
    setEditingRecord(record);
    setEditedUrl('');
    setTestResult(null);
    setFetchLoading(true);
    
    try {
      const docRef = doc(db, 'posts', record.postId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const currentUrl = docSnap.data().videoUrl;
        setEditedUrl(currentUrl);
      } else {
        setHistory(prev => prev.map(r => r.postId === record.postId ? { ...r, _deletedLocally: true } : r));
        setEditingRecord(null);
        alert('This video has already been deleted.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to fetch current video details.');
      setEditingRecord(null);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleTestUrl = async () => {
    setIsTestingUrl(true);
    setTestResult(null);
    const startTime = performance.now();
    try {
      const response = await fetch('/api/admin/check-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: editedUrl })
      });
      const data = await response.json();
      const endTime = performance.now();
      setTestResult({
        status: data.status || 'error',
        statusCode: data.statusCode || 0,
        responseTime: Math.round(endTime - startTime)
      });
    } catch (err: any) {
      setTestResult({
        status: 'error',
        statusCode: 0,
        errorMessage: err.message
      });
    }
    setIsTestingUrl(false);
  };

  const handleSaveUrl = async () => {
    if (!editingRecord || !testResult || !['working', 'redirect'].includes(testResult.status)) return;
    setIsSavingUrl(true);
    try {
      const ref = doc(db, 'posts', editingRecord.postId);
      await updateDoc(ref, { videoUrl: editedUrl });
      alert('URL updated successfully in the original video post!');
      setEditingRecord(null);
      setTestResult(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save URL.");
    }
    setIsSavingUrl(false);
  };

  const handleDeleteVideo = async (record: HistoryRecord) => {
    if (confirm("Are you sure you want to delete the original video post? This will NOT delete the history record.")) {
      try {
        await deleteDoc(doc(db, "posts", record.postId));
        setHistory(prev => prev.map(r => r.postId === record.postId ? { ...r, _deletedLocally: true } : r));
        alert("Video deleted successfully.");
      } catch (err) {
        console.error(err);
        alert("Failed to delete video.");
      }
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'redirect': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'dead': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'timeout': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'scanning': return <Activity className="w-5 h-5 text-blue-500 animate-pulse" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-neutral-700" />;
    }
  };

  return (
    <>
    <div className="space-y-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-950/50 text-neutral-400 border-b border-neutral-800">
              <tr>
                <th className="px-4 py-3 font-medium">Checked Time</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Video Title</th>
                <th className="px-4 py-3 font-medium">Checked URL</th>
                <th className="px-4 py-3 font-medium">HTTP Code</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {history.map((record) => (
                <tr key={record.id} className="hover:bg-neutral-800/50 transition-colors">
                  <td className="px-4 py-3 text-neutral-400">
                    {record.checkedAt?.toDate ? record.checkedAt.toDate().toLocaleString() : 'Just now'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(record.status)}
                      <span className="capitalize">{record.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="max-w-[200px] truncate inline-block">{record.title}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="max-w-[200px] truncate inline-block text-neutral-400">
                        {record.videoUrl}
                      </span>
                      <a 
                        href={record.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-500 hover:text-white"
                        title="Open URL"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-neutral-400">
                    {record.statusCode || '-'}
                  </td>
                  <td className="px-4 py-3 text-neutral-400 max-w-[200px] truncate">
                    {record.errorMessage || (record.responseTime ? `${record.responseTime}ms` : '-')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {record._deletedLocally ? (
                        <span className="text-xs text-red-500 bg-red-500/10 px-2 py-1 rounded">Deleted</span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditClick(record)}
                            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded transition-colors"
                            title="Edit Current Video URL"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteVideo(record)}
                            className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                            title="Delete Original Video"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>

                </tr>
              ))}
              {history.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                    No history records found. Run the scanner to generate history.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => loadHistory(true)}
            disabled={loading}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {loading ? 'Loading...' : 'Load More History'}
          </button>
        </div>
      )}
    </div>

      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-xl font-bold text-white">Edit Video URL</h3>
            <div className="flex flex-col gap-1 mb-4">
              <p className="text-white font-medium line-clamp-2">{editingRecord.title}</p>
              <p className="text-neutral-400 text-sm">Historical check status: <span className="capitalize">{editingRecord.status}</span></p>
            </div>
            
            {fetchLoading ? (
               <div className="py-4 text-center text-neutral-400">Loading current URL...</div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-400">Current Video URL</label>
                  <input 
                    type="url" 
                    value={editedUrl} 
                    onChange={e => {
                      setEditedUrl(e.target.value);
                      setTestResult(null);
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                {testResult && (
                  <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-sm flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(testResult.status)}
                      <span className="capitalize font-medium text-white">{testResult.status}</span>
                      {testResult.statusCode && <span className="text-neutral-400">({testResult.statusCode})</span>}
                    </div>
                    {testResult.responseTime && <div className="text-neutral-400">Response time: {testResult.responseTime}ms</div>}
                    {testResult.errorMessage && <div className="text-red-400">{testResult.errorMessage}</div>}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    onClick={() => {
                      setEditingRecord(null);
                      setTestResult(null);
                    }}
                    className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTestUrl}
                    disabled={!editedUrl || isTestingUrl}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg disabled:opacity-50"
                  >
                    {isTestingUrl ? 'Testing...' : 'Test URL'}
                  </button>
                  <button
                    onClick={handleSaveUrl}
                    disabled={!testResult || !['working', 'redirect'].includes(testResult.status) || isSavingUrl}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
                  >
                    {isSavingUrl ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}