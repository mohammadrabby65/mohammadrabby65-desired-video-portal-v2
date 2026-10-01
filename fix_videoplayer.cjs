const fs = require('fs');
let code = fs.readFileSync('src/components/video/VideoPlayer.tsx', 'utf8');

const target = `             fetch(\`/api/video/\${videoId}/view\`, { method: "POST" })
               .then(res => {
                   if (res.ok) {
                       localStorage.setItem(storageKey, now.toString());
                   }
               })
               .catch(err => console.error("View reporting failed", err));`;

const replacement = `             fetch(\`/api/video/\${videoId}/view\`, { method: "POST" })
               .then(res => {
                   if (res.ok) {
                       localStorage.setItem(storageKey, now.toString());
                   } else {
                       viewReported.current = false;
                   }
               })
               .catch(err => {
                   console.error("View reporting failed", err);
                   viewReported.current = false;
               });`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/video/VideoPlayer.tsx', code);
