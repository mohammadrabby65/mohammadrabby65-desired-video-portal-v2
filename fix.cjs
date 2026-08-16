const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/CheckHistoryTab.tsx', 'utf8');

code = code.replace(
  'return (\n    <div className="space-y-4">',
  'return (\n    <>\n    <div className="space-y-4">'
);

code = code.replace(
  '      )}\n  );\n}',
  '      )}\n    </>\n  );\n}'
);

fs.writeFileSync('src/pages/admin/CheckHistoryTab.tsx', code);
