const fs = require('fs');

let code = fs.readFileSync('src/pages/admin/posts/UploadPost.tsx', 'utf-8');

// 1. Add metaDescription to formData initial state
code = code.replace(
  "description: '',\n    videoUrl: '',",
  "description: '',\n    metaDescription: '',\n    videoUrl: '',"
);

// 2. Add metaDescription to formData when setting from fetched data
code = code.replace(
  "description: data.description,\n              videoUrl: data.videoUrl,",
  "description: data.description,\n              metaDescription: data.metaDescription || '',\n              videoUrl: data.videoUrl,"
);

// 3. Add metaDescription to saving data
code = code.replace(
  "description: formData.description,\n        videoUrl: formData.videoUrl,",
  "description: formData.description,\n        metaDescription: formData.metaDescription || deleteField(),\n        videoUrl: formData.videoUrl,"
);

// 4. Add the input field in the JSX
const descriptionInputHtml = `        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-300">
            Description
          </label>
          <textarea
            required
            rows={5}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-red-500 resize-none"
          />
        </div>`;

const modifiedDescriptionInputHtml = `        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-300">
            Description
          </label>
          <textarea
            required
            rows={5}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-red-500 resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-300">
            Meta Description (SEO)
          </label>
          <textarea
            rows={2}
            maxLength={160}
            placeholder="120–160 character SEO description for search engines."
            value={formData.metaDescription}
            onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-red-500 resize-none"
          />
          <p className="text-xs text-neutral-500">Leave empty to auto-generate from the description.</p>
        </div>`;

code = code.replace(descriptionInputHtml, modifiedDescriptionInputHtml);

fs.writeFileSync('src/pages/admin/posts/UploadPost.tsx', code);
