const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Layout.tsx', 'utf8');

content = content.replace(
  '<Dices className={`w-5 h-5',
  '<Dices className={`w-4 h-4 sm:w-5 sm:h-5'
);

fs.writeFileSync('src/components/layout/Layout.tsx', content);
