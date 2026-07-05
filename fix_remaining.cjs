const fs = require('fs');

const filesToUpdate = [
  'src/pages/DMCA.tsx',
  'src/pages/Search.tsx',
  'src/pages/Tag.tsx',
  'src/pages/admin/Login.tsx',
  'src/pages/admin/Settings.tsx',
  'src/pages/Category.tsx',
  'src/pages/Compliance2257.tsx',
  'src/pages/PrivacyPolicy.tsx',
  'src/pages/Video.tsx',
  'src/pages/Home.tsx',
  'src/contexts/AuthContext.tsx'
];

filesToUpdate.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace standalone or hyphenated uses in Titles/Descriptions
    content = content.replace(/ - Desired"/g, ' - DesiredHub"');
    content = content.replace(/ - Desired\}/g, ' - DesiredHub}');
    content = content.replace(/on Desired\./g, 'on DesiredHub.');
    
    // The exact specific caps text
    content = content.replace(/DESIRED/g, 'DesiredHub');
    
    fs.writeFileSync(file, content);
  }
});
console.log('Fixed remaining references successfully');
