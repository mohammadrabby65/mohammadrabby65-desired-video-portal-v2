const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/CheckHistoryTab.tsx', 'utf8');

// Add thumbnailUrl to interface
content = content.replace(
  /videoUrl: string;/g,
  "videoUrl: string;\n  thumbnailUrl?: string;"
);

// Add table header
content = content.replace(
  /<th className="px-4 py-3 font-medium">Video Title<\/th>/g,
  '<th className="px-4 py-3 font-medium">Thumbnail</th>\n                <th className="px-4 py-3 font-medium">Video Title</th>'
);

// Add table cell
const tableCell = `<td className="px-4 py-3">
                    <div className="w-16 h-10 rounded overflow-hidden bg-neutral-800 flex-shrink-0 relative border border-neutral-700/50">
                      {record.thumbnailUrl ? (
                        <img 
                          src={record.thumbnailUrl} 
                          alt={record.title} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                            (e.target as HTMLImageElement).className = "w-full h-full object-contain p-2 opacity-30";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-30">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">`;

content = content.replace(
  /<td className="px-4 py-3">\s*<span className="max-w-\[200px\] truncate inline-block">\{record\.title\}<\/span>\s*<\/td>/g,
  tableCell + '\n                    <span className="max-w-[200px] truncate inline-block" title={record.title}>{record.title}</span>\n                  </td>'
);

fs.writeFileSync('src/pages/admin/CheckHistoryTab.tsx', content);
