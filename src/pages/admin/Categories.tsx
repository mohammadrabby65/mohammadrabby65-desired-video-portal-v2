import { useState } from 'react';
import { useCategories } from '../../hooks/useAdmin';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2, Plus, X, Check } from 'lucide-react';
import { Category } from '../../types';

import { Link } from 'react-router-dom';

export function Categories() {
  const { data: categories, isLoading } = useCategories();
  const queryClient = useQueryClient();

  const [newCat, setNewCat] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAdd = async (e: import('react').FormEvent) => {
    e.preventDefault();
    if (!newCat.trim()) return;

    try {
      const slug = newCat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const newRef = doc(collection(db, 'categories'));
      await setDoc(newRef, { name: newCat, slug });
      setNewCat('');
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

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const slug = editName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      await updateDoc(doc(db, 'categories', id), { name: editName, slug });
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white tracking-tight">Manage Categories</h1>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="text"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="New Category Name"
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-red-500"
          />
          <button
            type="submit"
            disabled={!newCat.trim()}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            Add
          </button>
        </form>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-neutral-950/50 text-neutral-400 border-b border-neutral-800">
            <tr>
              <th className="px-5 py-4 font-medium">Category Name</th>
              <th className="px-5 py-4 font-medium">Slug</th>
              <th className="px-5 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 text-neutral-300">
            {isLoading ? (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-neutral-500">Loading...</td></tr>
            ) : categories?.length === 0 ? (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-neutral-500">No categories found</td></tr>
            ) : (
              categories?.map(cat => (
                <tr key={cat.id} className="hover:bg-neutral-800/30 transition-colors">
                  <td className="px-5 py-3">
                    {editingId === cat.id ? (
                      <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white w-full max-w-[200px]"
                        autoFocus
                      />
                    ) : (
                      <Link to={`/category/${cat.slug}`} className="font-medium text-white hover:text-red-500 transition-colors">
                        {cat.name}
                      </Link>
                    )}
                  </td>
                  <td className="px-5 py-3 text-neutral-500">{cat.slug}</td>
                  <td className="px-5 py-3 text-right">
                    {editingId === cat.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleSaveEdit(cat.id)} className="p-1.5 text-green-500 hover:bg-green-500/10 rounded transition-colors"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-neutral-400 hover:bg-neutral-800 rounded transition-colors"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                          className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                        ><Edit className="w-4 h-4" /></button>
                        <button 
                          onClick={() => handleDelete(cat.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        ><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
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
