import mod from '../dist/server.cjs';
const app = mod.default || mod.app;

export default function handler(req, res) {
  const matched = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.headers['x-invoke-path'];
  if (matched && typeof matched === 'string') {
    if (req.url === '/api/server' || req.url.startsWith('/api/server?')) {
      const qIdx = req.url.indexOf('?');
      const queryString = qIdx !== -1 ? req.url.slice(qIdx) : '';
      req.url = matched + (matched.includes('?') ? '' : queryString);
    }
  } else if (req.url === '/api/server' || req.url === '/api/server/') {
    req.url = '/';
  }
  return app(req, res);
}

