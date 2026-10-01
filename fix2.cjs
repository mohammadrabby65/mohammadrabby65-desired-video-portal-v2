const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/CheckHistoryTab.tsx', 'utf8');

const lastBraceIndex = code.lastIndexOf('}');
code = code.substring(0, lastBraceIndex);

if (!code.endsWith('</>\n  );\n')) {
    code = code.replace(/}\s*$/, '');
    code = code.replace(/}\s*$/, ''); // clean up any extra closing braces
    code = code.replace(/<[/]>\s*[\)]\s*;\s*$/, '');
    code += `\n    </>\n  );\n}`;
}

fs.writeFileSync('src/pages/admin/CheckHistoryTab.tsx', code);
