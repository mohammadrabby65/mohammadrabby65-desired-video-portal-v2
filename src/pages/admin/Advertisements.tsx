import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Save, Loader2 } from 'lucide-react';

export function Advertisements() {
  const [formData, setFormData] = useState({
    socialBarEnabled: false,
    popunderEnabled: false
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'advertisements');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setFormData(snap.data() as any);
        }
      } catch (err) {
        console.error("Error fetching ads settings", err);
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
      await setDoc(doc(db, 'settings', 'advertisements'), formData);
      alert('Advertisement settings saved successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="p-8 text-neutral-400">Loading advertisement settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white tracking-tight">Advertisement Settings</h1>

      <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-8">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-neutral-800 pb-2">Ad Networks</h2>
          
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Social Bar</h3>
                <p className="text-neutral-400 text-sm">Enable or disable Social Bar script.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.socialBarEnabled}
                  onChange={(e) => setFormData({ ...formData, socialBarEnabled: e.target.checked })}
                />
                <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Popunder</h3>
                <p className="text-neutral-400 text-sm">Enable or disable Popunder script.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.popunderEnabled}
                  onChange={(e) => setFormData({ ...formData, popunderEnabled: e.target.checked })}
                />
                <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
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
    </div>
  );
}
