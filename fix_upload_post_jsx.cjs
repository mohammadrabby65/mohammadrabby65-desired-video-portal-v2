const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/posts/UploadPost.tsx', 'utf-8');

const target = `        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">Description</label>
          <textarea
            required
            rows={5}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-red-500 resize-none"
          />
        </div>`;

const replacement = `        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">Description</label>
          <textarea
            required
            rows={5}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-red-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">Meta Description (SEO)</label>
          <textarea
            rows={2}
            maxLength={160}
            placeholder="120–160 character SEO description for search engines."
            value={formData.metaDescription}
            onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-red-500 resize-none"
          />
          <p className="text-xs text-neutral-500 mt-1.5">Leave empty to auto-generate from the description.</p>
        </div>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/pages/admin/posts/UploadPost.tsx', code);
