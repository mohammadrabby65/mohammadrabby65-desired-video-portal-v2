const fs = require('fs');
const file = 'src/components/seo/SEO.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/Desired - Free Desi Porn & Hot Indian Sex Videos Online/g, 'DesiredHub - Free Desi Porn & Hot Indian Sex Videos Online');
content = content.replace(/content="DESIRED"/g, 'content="DesiredHub"');
content = content.replace(/https:\/\/i\.ibb\.co\.com\/WvbgTSjV\/Desired-icon\.png/g, 'https://i.ibb.co.com/qYJWw9xy/Desired-Hub-Favicon.jpg');

fs.writeFileSync(file, content);
console.log('Fixed SEO.tsx successfully');
