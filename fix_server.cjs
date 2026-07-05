const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/ - Desired/g, ' - DesiredHub');
content = content.replace(/content="DESIRED"/g, 'content="DesiredHub"');
content = content.replace(/<title>DESIRED<\/title>/g, '<title>DesiredHub</title>');

fs.writeFileSync(file, content);
console.log('Fixed server.ts successfully');
