const fs = require('fs');
let content = fs.readFileSync('src/components/layout/LanguageSelector.tsx', 'utf8');

// Replace the hidden spans with a single visible span for both mobile and desktop
content = content.replace(
  /<span className="hidden sm:inline font-medium text-neutral-200">\{currentLang\.flag\} \{currentLang\.label\}<\/span>\s*<span className="sm:hidden font-medium text-neutral-200">\{currentLang\.flag\}<\/span>/,
  '<span className="font-medium text-neutral-200">{currentLang.flag} {currentLang.label}</span>'
);

fs.writeFileSync('src/components/layout/LanguageSelector.tsx', content);
console.log('Patched LanguageSelector.tsx for mobile visibility.');
