const fs = require('fs');

const fixFile = (file) => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/animate-fade-in/g, '');
    fs.writeFileSync(file, content);
  }
};

fixFile('src/pages/Search.tsx');
fixFile('src/pages/admin/posts/UploadPost.tsx');
