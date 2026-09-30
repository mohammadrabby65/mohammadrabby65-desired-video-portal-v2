const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  'optimalDesc += " Discover more exciting videos and enjoy high-quality streaming on DesiredHub.";',
  'optimalDesc += " Discover more exciting videos and enjoy high-quality streaming on DesiredHub. We provide the best entertainment experience for everyone.";'
);

fs.writeFileSync('server.ts', code);
