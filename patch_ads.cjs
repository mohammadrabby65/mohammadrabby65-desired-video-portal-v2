const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/Advertisements.tsx', 'utf8');

const newToggle = `            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Native Banner</h3>
                <p className="text-neutral-400 text-sm">Enable or disable Native Banner ads.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.nativeBannerEnabled}
                  onChange={(e) => setFormData({ ...formData, nativeBannerEnabled: e.target.checked })}
                />
                <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>`;

if (!content.includes('Native Banner')) {
  // Find where popunder toggle ends and insert right after
  const splitStr = 'Popunder script.</p>\n              </div>\n              <label className="relative inline-flex items-center cursor-pointer">\n                <input\n                  type="checkbox"\n                  className="sr-only peer"\n                  checked={formData.popunderEnabled}\n                  onChange={(e) => setFormData({ ...formData, popunderEnabled: e.target.checked })}\n                />\n                <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>\n              </label>\n            </div>';
  
  if (content.includes(splitStr)) {
    content = content.replace(splitStr, splitStr + '\\n' + newToggle);
  } else {
    // regex fallback
    content = content.replace(/(<h3 className="text-white font-medium">Popunder<\/h3>[\s\S]*?<\/label>\s*<\/div>)/, '$1\n' + newToggle);
  }
  fs.writeFileSync('src/pages/admin/Advertisements.tsx', content);
}
