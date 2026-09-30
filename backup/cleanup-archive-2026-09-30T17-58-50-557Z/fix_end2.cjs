const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/CheckHistoryTab.tsx', 'utf8');

code = code.replace(/}\s*\)\s*;\s*<\/>\s*\)\s*;\s*}\s*$/, '}\n    </>\n  );\n}');
fs.writeFileSync('src/pages/admin/CheckHistoryTab.tsx', code);
