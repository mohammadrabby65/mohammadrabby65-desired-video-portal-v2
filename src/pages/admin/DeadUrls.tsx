import { useState, useRef } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { VideoPost } from '../../types';
import { Link } from 'react-router-dom';
import { Play, Pause, Square, ExternalLink, Copy, CheckCircle, AlertTriangle, XCircle, Download, Activity, Edit, RotateCw } from 'lucide-react';
import { SEO } from '../../components/seo/SEO';

type UrlStatus = 'pending' | 'scanning' | 'working' | 'redirect' | 'dead' | 'timeout' | 'error';

interface ScanResult {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
  videoUrl: string;
  status: UrlStatus;
  statusCode?: number;
  responseTime?: number;
  errorMessage?: string;
}

export function DeadUrls() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  
  const [editingResult, setEditingResult] = useState<ScanResult | null>(null);
  const [editedUrl, setEditedUrl] = useState('');
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [testResult, setTestResult] = useState<ScanResult | null>(null);
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  
  const resultsRef = useRef<ScanResult[]>([]);
  const isScanningRef = useRef(false);
  const isPausedRef = useRef(false);
  const activeRequestsRef = useRef(0);
  const MAX_CONCURRENT = 5;
  const BATCH_SIZE = 10;
  
  const setResultsState = (newResults: ScanResult[]) => {
    resultsRef.current = newResults;
    setResults([...newResults]);
  };

  const loadVideos = async () => {
    try {
      const snap = await getDocs(collection(db, 'posts'));
      const videos = snap.docs.map(doc => {
        const data = doc.data() as VideoPost;
        return {
          id: doc.id,
          title: data.title,
          slug: data.slug,
          thumbnailUrl: data.thumbnailUrl,
          videoUrl: data.videoUrl,
          status: 'pending' as UrlStatus
        };
      });
      setResultsState(videos);
      setHasLoaded(true);
      return videos;
    } catch (err) {
      console.error('Failed to load videos:', err);
      return [];
    }
  };

  const checkUrl = async (video: ScanResult): Promise<ScanResult> => {
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      const response = await fetch(video.videoUrl, { 
        method: 'HEAD',
        signal: controller.signal,
        // no-cors will return status 0, we can't reliably get 404/200, but we have to try cors first
        // If it fails with Type Error due to CORS, we will catch it.
      }).catch(err => {
        if (err.name === 'AbortError') throw err;
        // Fallback to GET if HEAD is rejected
        return fetch(video.videoUrl, { method: 'GET', signal: controller.signal });
      });

      clearTimeout(timeoutId);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      const statusCode = response.status;

      let status: UrlStatus = 'error';
      if (statusCode >= 200 && statusCode < 300) status = 'working';
      else if (statusCode >= 300 && statusCode < 400) status = 'redirect';
      else if (statusCode === 404 || statusCode === 410) status = 'dead';
      else status = 'error';

      return { ...video, status, statusCode, responseTime };
    } catch (err: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      if (err.name === 'AbortError') {
        return { ...video, status: 'timeout', responseTime, errorMessage: 'Timeout after 15s' };
      }
      
      return { ...video, status: 'error', responseTime, errorMessage: err.message || 'Network Error' };
    }
  };

  const processBatch = async () => {
    if (!isScanningRef.current || isPausedRef.current) return;

    const pending = resultsRef.current.filter(r => r.status === 'pending');
    if (pending.length === 0) {
      setIsScanning(false);
      isScanningRef.current = false;
      return;
    }

    // Process up to BATCH_SIZE items in this cycle, but maintain MAX_CONCURRENT
    const batch = pending.slice(0, BATCH_SIZE);
    
    // Mark as scanning
    const newResults = resultsRef.current.map(r => 
      batch.find(b => b.id === r.id) ? { ...r, status: 'scanning' as UrlStatus } : r
    );
    setResultsState(newResults);

    let index = 0;
    
    const worker = async () => {
      while (index < batch.length && isScanningRef.current && !isPausedRef.current) {
        const itemIndex = index++;
        const item = batch[itemIndex];
        
        activeRequestsRef.current++;
        const result = await checkUrl(item);
        activeRequestsRef.current--;

        // Update this specific item in results
        setResultsState(resultsRef.current.map(r => r.id === result.id ? result : r));
      }
    };

    const workers = [];
    for (let i = 0; i < Math.min(MAX_CONCURRENT, batch.length); i++) {
      workers.push(worker());
    }

    await Promise.all(workers);

    // If still scanning and not paused, process next batch
    if (isScanningRef.current && !isPausedRef.current) {
      setTimeout(processBatch, 100); // small delay to prevent blocking main thread
    }
  };

  const handleStart = async () => {
    if (!hasLoaded) {
      await loadVideos();
    }
    setIsScanning(true);
    setIsPaused(false);
    isScanningRef.current = true;
    isPausedRef.current = false;
    processBatch();
  };

  const handlePause = () => {
    setIsPaused(true);
    isPausedRef.current = true;
  };

  const handleResume = () => {
    setIsPaused(false);
    isPausedRef.current = false;
    processBatch();
  };

  const handleStop = () => {
    setIsScanning(false);
    setIsPaused(false);
    isScanningRef.current = false;
    isPausedRef.current = false;
    
    // Reset all scanning to pending
    const newResults = resultsRef.current.map(r => 
      r.status === 'scanning' ? { ...r, status: 'pending' as UrlStatus } : r
    );
    setResultsState(newResults);
  };

  const handleReset = () => {
    handleStop();
    const newResults = resultsRef.current.map(r => ({ ...r, status: 'pending' as UrlStatus, statusCode: undefined, responseTime: undefined, errorMessage: undefined }));
    setResultsState(newResults);
  };

  const exportCSV = () => {
    const deadUrls = resultsRef.current.filter(r => ['dead', 'timeout', 'error'].includes(r.status));
    if (deadUrls.length === 0) return alert('No dead URLs found to export.');

    const headers = ['ID', 'Title', 'Slug', 'URL', 'Status', 'HTTP Code', 'Error Message', 'Response Time (ms)'];
    const rows = deadUrls.map(r => [
      r.id,
      `"${r.title.replace(/"/g, '""')}"`,
      r.slug,
      `"${r.videoUrl}"`,
      r.status,
      r.statusCode || '',
      `"${(r.errorMessage || '').replace(/"/g, '""')}"`,
      r.responseTime || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dead_urls_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const checkedCount = results.filter(r => r.status !== 'pending' && r.status !== 'scanning').length;
  const totalCount = results.length;
  const deadCount = results.filter(r => ['dead', 'timeout', 'error'].includes(r.status)).length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const getStatusIcon = (status: UrlStatus) => {
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
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <SEO 
        title="Dead URL Checker - Admin"
        description="Check for dead video URLs"
        exactTitle={true}
        noIndex={true}
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dead URL Checker</h1>
          <p className="text-neutral-400 text-sm mt-1">Scan your video database for broken or dead external links.</p>
        </div>
        
        <div className="flex items-center gap-2">
          {!isScanning && !isPaused && (
            <button 
              onClick={handleStart}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              <Play className="w-4 h-4" />
              {hasLoaded ? 'Start Scan' : 'Load & Scan'}
            </button>
          )}
          
          {isScanning && !isPaused && (
            <button 
              onClick={handlePause}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          )}

          {isPaused && (
            <button 
              onClick={handleResume}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Play className="w-4 h-4" />
              Resume
            </button>
          )}

          {(isScanning || isPaused) && (
            <button 
              onClick={handleStop}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-medium transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          )}

          {hasLoaded && !isScanning && !isPaused && (
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {hasLoaded && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-400">Progress: {checkedCount} / {totalCount}</span>
            <span className="text-white font-medium">{progressPercent}%</span>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-2.5">
            <div className="bg-red-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
          </div>
          
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="px-4 py-2 bg-neutral-800 rounded-lg">
              <div className="text-xs text-neutral-400">Working</div>
              <div className="text-lg font-semibold text-green-500">{results.filter(r => r.status === 'working').length}</div>
            </div>
            <div className="px-4 py-2 bg-neutral-800 rounded-lg">
              <div className="text-xs text-neutral-400">Dead / Error</div>
              <div className="text-lg font-semibold text-red-500">{deadCount}</div>
            </div>
            <div className="px-4 py-2 bg-neutral-800 rounded-lg">
              <div className="text-xs text-neutral-400">Timeouts</div>
              <div className="text-lg font-semibold text-orange-500">{results.filter(r => r.status === 'timeout').length}</div>
            </div>
          </div>
        </div>
      )}

      {deadCount > 0 && !isScanning && (
        <div className="flex items-center gap-2">
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Dead URLs
          </button>
        </div>
      )}

      {hasLoaded && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-neutral-950/50 text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Video</th>
                  <th className="px-4 py-3 font-medium">URL</th>
                  <th className="px-4 py-3 font-medium">HTTP Code</th>
                  <th className="px-4 py-3 font-medium">Response Time</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {results.filter(r => r.status !== 'pending' || isScanning || isPaused).slice(0, 100).map((result) => (
                  <tr key={result.id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <span className="capitalize">{result.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={result.thumbnailUrl} 
                          alt="" 
                          className="w-12 h-8 object-cover rounded bg-neutral-800"
                          referrerPolicy="no-referrer"
                        />
                        <span className="max-w-[200px] truncate">{result.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="max-w-[200px] truncate inline-block text-neutral-400">
                        {result.videoUrl}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-400">
                      {result.statusCode || '-'}
                    </td>
                    <td className="px-4 py-3 text-neutral-400">
                      {result.responseTime ? `${result.responseTime}ms` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => navigator.clipboard.writeText(result.videoUrl)}
                          className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded transition-colors"
                          title="Copy URL"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <a 
                          href={result.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded transition-colors"
                          title="Open URL"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={async () => {
                             setResultsState(resultsRef.current.map(r => r.id === result.id ? { ...r, status: 'scanning' } : r));
                             const newRes = await checkUrl(result);
                             setResultsState(resultsRef.current.map(r => r.id === result.id ? newRes : r));
                          }}
                          className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded transition-colors"
                          title="Recheck URL"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                             setEditingResult(result);
                             setEditedUrl(result.videoUrl);
                             setTestResult(null);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded transition-colors"
                          title="Edit URL"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {results.filter(r => r.status !== 'pending').length > 100 && (
            <div className="p-4 text-center text-sm text-neutral-500 border-t border-neutral-800">
              Showing first 100 scanned results to conserve memory in view.
            </div>
          )}
        </div>
      )}

      {editingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-xl font-bold text-white">Edit Video URL</h3>
            <div className="flex gap-4">
              <img src={editingResult.thumbnailUrl} alt="" className="w-24 h-16 object-cover rounded bg-neutral-800" referrerPolicy="no-referrer" />
              <div>
                <p className="text-white font-medium line-clamp-2">{editingResult.title}</p>
                <p className="text-neutral-400 text-sm mt-1">Current URL status: <span className="capitalize">{editingResult.status}</span></p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-neutral-400">Video URL</label>
              <input 
                type="url" 
                value={editedUrl} 
                onChange={e => {
                  setEditedUrl(e.target.value);
                  setTestResult(null); // Reset test on change
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
                  setEditingResult(null);
                  setTestResult(null);
                }}
                className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                   setIsTestingUrl(true);
                   const result = await checkUrl({ ...editingResult, videoUrl: editedUrl });
                   setTestResult(result);
                   setIsTestingUrl(false);
                }}
                disabled={!editedUrl || editedUrl === editingResult.videoUrl || isTestingUrl}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg disabled:opacity-50"
              >
                {isTestingUrl ? 'Testing...' : 'Test URL'}
              </button>
              <button
                onClick={async () => {
                   if (!testResult || !['working', 'redirect'].includes(testResult.status)) return;
                   setIsSavingUrl(true);
                   try {
                      const ref = doc(db, 'posts', editingResult.id);
                      await updateDoc(ref, { videoUrl: editedUrl });
                      // Update in memory array
                      setResultsState(resultsRef.current.map(r => r.id === editingResult.id ? testResult : r));
                      setEditingResult(null);
                      setTestResult(null);
                   } catch (err) {
                      console.error(err);
                      alert("Failed to save URL.");
                   }
                   setIsSavingUrl(false);
                }}
                disabled={!testResult || !['working', 'redirect'].includes(testResult.status) || isSavingUrl}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {isSavingUrl ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
