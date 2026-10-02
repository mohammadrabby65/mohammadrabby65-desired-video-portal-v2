const fs = require('fs');
const glob = require('glob'); // Not available? Use child_process
const { execSync } = require('child_process');

const files = execSync('find src -type f -name "*.tsx" -o -name "*.ts"').toString().split('\n').filter(Boolean);

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes(';import') || content.includes('}import')) {
    content = content.replace(/;import/g, ';\nimport');
    content = content.replace(/}import/g, '}\nimport');
    fs.writeFileSync(f, content);
  }
});
