const fs = require('fs');
const file = 'index.html';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/<title>DESIRED<\/title>/g, '<title>DesiredHub</title>');
content = content.replace(/https:\/\/i\.ibb\.co\.com\/WvbgTSjV\/Desired-icon\.png/g, 'https://i.ibb.co.com/qYJWw9xy/Desired-Hub-Favicon.jpg');
content = content.replace(/type="image\/png"/g, 'type="image/jpeg"');

fs.writeFileSync(file, content);
console.log('Fixed index.html successfully');
