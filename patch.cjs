const fs = require('fs');
let content = fs.readFileSync('src/components/layout/LanguageSelector.tsx', 'utf8');
content = content.replace("label: 'English'", "label: 'EN'");
content = content.replace("label: 'বাংলা'", "label: 'BN'");
content = content.replace("label: 'हिन्दी'", "label: 'HI'");
content = content.replace("label: 'العربية'", "label: 'AR'");
fs.writeFileSync('src/components/layout/LanguageSelector.tsx', content);
