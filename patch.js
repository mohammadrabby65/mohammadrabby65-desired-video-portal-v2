const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "async function startServer() {\n  const app = express();",
  "export const app = express();\nasync function startServer() {"
);

code = code.replace(
  "app.listen(PORT, \"0.0.0.0\", () => {\n    console.log(`Server running on http://localhost:${PORT}`);\n  });",
  "if (!process.env.VERCEL) {\n    app.listen(PORT, \"0.0.0.0\", () => {\n      console.log(`Server running on http://localhost:${PORT}`);\n    });\n  }"
);

fs.writeFileSync('server.ts', code);
