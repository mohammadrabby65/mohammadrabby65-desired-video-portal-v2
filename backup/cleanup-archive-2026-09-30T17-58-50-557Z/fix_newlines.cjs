const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix missing newlines between imports
      content = content.replace(/';import/g, "';\nimport");
      content = content.replace(/";import/g, '";\nimport');
      content = content.replace(/}import/g, '}\nimport');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir('src');
console.log('Done!');
