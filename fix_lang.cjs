const fs = require('fs');
let content = fs.readFileSync('src/components/layout/LanguageSelector.tsx', 'utf8');

content = content.replace(
  'gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full bg-neutral-900/80 backdrop-blur-md border border-neutral-800 hover:border-primary/50 transition-colors duration-300 text-sm sm:text-base group',
  'gap-1 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-2 rounded-full bg-neutral-900/80 backdrop-blur-md border border-neutral-800 hover:border-primary/50 transition-colors duration-300 text-[11px] sm:text-base group whitespace-nowrap'
);

content = content.replace(
  '<Globe className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400 group-hover:text-primary transition-colors" />',
  '<Globe className="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 text-neutral-400 group-hover:text-primary transition-colors" />'
);

content = content.replace(
  '<span className="font-medium text-neutral-200">{currentLang.flag} {currentLang.label}</span>',
  '<span className="font-medium text-neutral-200 tracking-tight whitespace-nowrap">{currentLang.flag} {currentLang.label}</span>'
);

content = content.replace(
  '<ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 text-neutral-400 transition-transform duration-200 ${isOpen ? \'rotate-180\' : \'\'}`} />',
  '<ChevronDown className={`w-2.5 h-2.5 sm:w-4 sm:h-4 text-neutral-400 transition-transform duration-200 ${isOpen ? \'rotate-180\' : \'\'}`} />'
);

fs.writeFileSync('src/components/layout/LanguageSelector.tsx', content);
console.log("Patched LanguageSelector.tsx");
