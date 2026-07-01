import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, doc, setDoc, getDoc, serverTimestamp, updateDoc, query, where, getDocs, limit, addDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { VideoPost } from '../../../types';
import { ArrowLeft, Save, Loader2, Image as ImageIcon } from 'lucide-react';

export function UploadPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    categories: [] as string[],
    tags: '',
    duration: '',
    featured: false,
    trending: false,
    quality: 'HD' as "HD" | "4K" | "SD" | "Full HD" | "2K",
    badges: [] as string[]
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [error, setError] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [isCategoryFocused, setIsCategoryFocused] = useState(false);
  const queryClient = useQueryClient();

  const { data: cachedCategories = [] } = useQuery({
    queryKey: ['admin-categories-suggestions'],
    queryFn: async () => {
      const q = query(
        collection(db, 'categories'),
        where('isActive', '!=', false),
        limit(20)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as any).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    },
    staleTime: 1000 * 60 * 30
  });

  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  useEffect(() => {
    setCategoriesList(cachedCategories);
  }, [cachedCategories]);
  
  const availableBadges = ['HD', 'SD', 'NEW', 'TRENDING', 'HOT', 'PREMIUM'];

  const handleAddManualCategory = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    
    if (!formData.categories.includes(slug)) {
      setFormData(prev => ({ ...prev, categories: [...prev.categories, slug] }));
    }
    
    setCategoryInput('');
    setIsCategoryFocused(false);

    // Create in Firestore if it doesn't exist
    const catExists = categoriesList.some(c => c.slug === slug);
    if (!catExists) {
      try {
        const newCat = {
          name: trimmedName,
          slug,
          isActive: true,
          videoCount: 0,
          displayOrder: 999
        };
        const docRef = await addDoc(collection(db, 'categories'), {
          ...newCat,
          createdAt: serverTimestamp()
        });
        const addedCat = { id: docRef.id, ...newCat };
        setCategoriesList(prev => [...prev, addedCat]);
        queryClient.setQueryData(['admin-categories-suggestions'], (old: any) => {
          return old ? [...old, addedCat] : [addedCat];
        });
      } catch (e) {
        console.error("Error creating manual category", e);
      }
    }
  };

  const handleCategoryKeyDown = (e: import('react').KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      if (categoryInput.trim()) {
        handleAddManualCategory(categoryInput);
      }
    }
  };

  useEffect(() => {
    if (isEditMode && id) {
      const fetchPost = async () => {
        try {
          const docRef = doc(db, 'posts', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as VideoPost;
            setFormData({
              title: data.title,
              slug: data.slug,
              description: data.description,
              videoUrl: data.videoUrl,
              thumbnailUrl: data.thumbnailUrl,
              categories: data.categories ? data.categories : ((data as any).category ? [(data as any).category] : []),
              tags: data.tags.join(', '),
              duration: data.duration,
              featured: data.featured,
              trending: data.trending,
              quality: data.quality || 'HD',
              badges: data.badges || []
            });
          } else {
            navigate('/admin/posts');
          }
        } catch (error) {
          console.error("Error fetching post", error);
        } finally {
          setInitialLoading(false);
        }
      };
      fetchPost();
    }
  }, [id, isEditMode, navigate]);

  const handleTitleChange = (e: import('react').ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    if (!isEditMode) {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      setFormData({ ...formData, title, slug });
    } else {
      setFormData({ ...formData, title });
    }
  };

  const checkSlugUnique = async (slug: string) => {
    const q = query(collection(db, 'posts'), where('slug', '==', slug), limit(1));
    const snap = await getDocs(q);
    if (isEditMode) {
      return snap.empty || (snap.docs.length === 1 && snap.docs[0].id === id);
    }
    return snap.empty;
  };

  const handleSubmit = async (e: import('react').FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const isUnique = await checkSlugUnique(formData.slug);
      if (!isUnique) {
        setError('Slug already exists. Please choose a different title or manually change the slug.');
        setLoading(false);
        return;
      }

      if (formData.categories.length === 0) {
        setError('Please select at least one category.');
        setLoading(false);
        return;
      }

      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);

      const postData = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        videoUrl: formData.videoUrl,
        thumbnailUrl: formData.thumbnailUrl,
        categories: formData.categories,
        tags: tagsArray,
        duration: formData.duration,
        featured: formData.featured,
        trending: formData.trending,
        quality: formData.quality,
        badges: formData.badges
      };

      if (isEditMode && id) {
        await updateDoc(doc(db, 'posts', id), postData);
      } else {
        const newDocRef = doc(collection(db, 'posts'));
        await setDoc(newDocRef, {
          ...postData,
          views: 0,
          publishedAt: serverTimestamp()
        });
      }
      navigate('/admin/posts');
    } catch (err: any) {
      console.error("Error saving post", err);
      setError(err.message || 'Error saving post. Check console.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="p-8 text-neutral-400">Loading post data...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/admin/posts')}
          className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {isEditMode ? 'Edit Post' : 'Upload New Post'}
        </h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={handleTitleChange}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Slug *</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-red-500"
              />
            </div>
            
            <div className="relative">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Categories *</label>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.categories.map(catSlug => {
                  const catName = categoriesList.find(c => c.slug === catSlug)?.name || catSlug;
                  return (
                    <span
                      key={catSlug}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-500 border border-red-500/30 rounded-full text-sm font-medium"
                    >
                      {catName}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, categories: formData.categories.filter(c => c !== catSlug) });
                        }}
                        className="hover:text-red-400 focus:outline-none flex items-center justify-center h-4 w-4 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors"
                      >
                        <span className="text-xs leading-none">&times;</span>
                      </button>
                    </span>
                  );
                })}
              </div>

              <input
                type="text"
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                onKeyDown={handleCategoryKeyDown}
                onFocus={() => setIsCategoryFocused(true)}
                onBlur={() => setTimeout(() => setIsCategoryFocused(false), 200)}
                placeholder="Type to search or add new category..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-red-500"
              />

              {isCategoryFocused && (categoryInput.trim() !== '' || categoriesList.length > 0) && (
                <div className="absolute z-10 w-full mt-1 bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                  {categoriesList
                    .filter(cat => cat.name.toLowerCase().includes(categoryInput.toLowerCase()) && !formData.categories.includes(cat.slug))
                    .map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onMouseDown={(e) => {
                          // use onMouseDown instead of onClick to prevent onBlur firing first
                          e.preventDefault(); 
                          if (!formData.categories.includes(cat.slug)) {
                            setFormData({ ...formData, categories: [...formData.categories, cat.slug] });
                          }
                          setCategoryInput('');
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
                      >
                        {cat.name}
                      </button>
                    ))}
                  
                  {categoryInput.trim() !== '' && !categoriesList.some(c => c.name.toLowerCase() === categoryInput.trim().toLowerCase()) && (
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleAddManualCategory(categoryInput);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-neutral-800 text-red-400 hover:text-red-300 transition-colors font-medium"
                    >
                      + Add "{categoryInput.trim()}"
                    </button>
                  )}
                  {categoriesList.length === 0 && categoryInput.trim() === '' && (
                    <div className="px-4 py-2 text-sm text-neutral-500">Loading categories...</div>
                  )}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Duration (e.g. 10:24) *</label>
              <input
                type="text"
                required
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-red-500"
                placeholder="MM:SS"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Thumbnail URL *</label>
              <input
                type="url"
                required
                value={formData.thumbnailUrl}
                onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-red-500"
                placeholder="https://..."
              />
              {formData.thumbnailUrl && (
                <div className="mt-3 relative w-full aspect-video rounded-lg overflow-hidden bg-neutral-950 border border-neutral-800">
                  <img 
                    src={formData.thumbnailUrl} 
                    alt="Thumbnail preview"
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="%23333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                    }}
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-lg pointer-events-none" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Video URL *</label>
              <input
                type="url"
                required
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-red-500"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Tags (comma separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-red-500"
                placeholder="action, comedy, drama"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Quality</label>
              <select
                value={formData.quality}
                onChange={(e) => setFormData({ ...formData, quality: e.target.value as any })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-red-500"
              >
                <option value="SD">SD</option>
                <option value="HD">HD</option>
                <option value="Full HD">Full HD</option>
                <option value="2K">2K</option>
                <option value="4K">4K</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Badges</label>
              <div className="flex flex-wrap gap-2">
                {availableBadges.map(badge => (
                  <button
                    type="button"
                    key={badge}
                    onClick={() => {
                      const newBadges = formData.badges.includes(badge)
                        ? formData.badges.filter(b => b !== badge)
                        : [...formData.badges, badge];
                      setFormData({ ...formData, badges: newBadges });
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      formData.badges.includes(badge)
                        ? 'bg-red-500/20 border-red-500/50 text-red-500'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    {badge}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">Description</label>
          <textarea
            required
            rows={5}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-red-500 resize-none"
          />
        </div>

        <div className="flex gap-6 pt-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="peer sr-only"
              />
              <div className="w-5 h-5 border-2 border-neutral-600 rounded bg-neutral-950 peer-checked:bg-red-500 peer-checked:border-red-500 transition-colors"></div>
              <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors">Featured Post</span>
          </label>
          
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={formData.trending}
                onChange={(e) => setFormData({ ...formData, trending: e.target.checked })}
                className="peer sr-only"
              />
              <div className="w-5 h-5 border-2 border-neutral-600 rounded bg-neutral-950 peer-checked:bg-red-500 peer-checked:border-red-500 transition-colors"></div>
              <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors">Trending Post</span>
          </label>
        </div>

        <div className="pt-4 border-t border-neutral-800 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isEditMode ? 'Update Post' : 'Publish Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
