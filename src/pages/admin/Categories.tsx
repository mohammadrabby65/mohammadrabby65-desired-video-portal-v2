import { useState, FormEvent } from 'react';
import { useCategories } from '../../hooks/useAdmin';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2, Plus, X, Save } from 'lucide-react';
import { Category } from '../../types';

export function Categories() {
  const { data: categories, isLoading } = useCategories();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<Category>>({
    name: '',
    slug: '',
    thumbnailUrl: '',
    displayOrder: 0,
    seoTitle: '',
    seoDescription: '',
    isActive: true,
  });

  const handleEdit = (cat: Category) => {
    setFormData(cat);
    setIsEditing(true);
  };

  const handleAdd = () => {
    setFormData({
      name: '',
      slug: '',
      thumbnailUrl: '',
      displayOrder: 0,
      seoTitle: '',
      seoDescription: '',
      isActive: true,
    });
    setIsEditing(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      const slug = formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const dataToSave = { ...formData, slug };
      
      if (formData.id) {
        await updateDoc(doc(db, 'categories', formData.id), dataToSave);
      } else {
        const newRef = doc(collection(db, 'categories'));
        await setDoc(newRef, dataToSave);
      }
      
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete category?')) {
      try {
        await deleteDoc(doc(db, 'categories', id));
        queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (isEditing) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {formData.id ? 'Edit Category' : 'New Category'}
          </h1>
          <button onClick={() => setIsEditing(false)} className="text-neutral-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-400">Name</label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-red-500"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-400">Slug (optional)</label>
              <input
                type="text"
                value={formData.slug || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="Auto-generated if empty"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-neutral-400">Thumbnail URL</label>
              <input
                type="url"
                value={formData.thumbnailUrl || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-400">Display Order</label>
              <input
                type="number"
                value={formData.displayOrder || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="space-y-2 flex flex-col justify-center">
              <label className="flex items-center gap-3 cursor-pointer mt-6">
                <input
                  type="checkbox"
                  checked={formData.isActive !== false}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-5 h-5 rounded border-neutral-800 bg-neutral-950 text-red-500 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-neutral-300">Active</span>
              </label>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-neutral-400">SEO Title</label>
              <input
                type="text"
                value={formData.seoTitle || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, seoTitle: e.target.value }))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-neutral-400">SEO Description</label>
              <textarea
                rows={3}
                value={formData.seoDescription || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-6 py-2 text-neutral-400 font-medium hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              <Save className="w-5 h-5" />
              Save Category
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-tight">Manage Categories</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-neutral-950/50 text-neutral-400 border-b border-neutral-800">
            <tr>
              <th className="px-5 py-4 font-medium">Order</th>
              <th className="px-5 py-4 font-medium">Category Name</th>
              <th className="px-5 py-4 font-medium">Slug</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 text-neutral-300">
            {isLoading ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-neutral-500">Loading...</td></tr>
            ) : categories?.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-neutral-500">No categories found</td></tr>
            ) : (
              categories?.map(cat => (
                <tr key={cat.id} className="hover:bg-neutral-800/30 transition-colors">
                  <td className="px-5 py-3 text-neutral-500">{cat.displayOrder || 0}</td>
                  <td className="px-5 py-3 font-medium text-white">
                    <div className="flex items-center gap-3">
                      {cat.thumbnailUrl && (
                        <img src={cat.thumbnailUrl} alt={cat.name} className="w-8 h-8 rounded object-cover" />
                      )}
                      {cat.name}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-neutral-500">{cat.slug}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cat.isActive !== false ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {cat.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(cat)}
                        className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                      ><Edit className="w-4 h-4" /></button>
                      <button 
                        onClick={() => handleDelete(cat.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                      ><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
