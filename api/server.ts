import app from '../server.js';

export default async function handler(req: any, res: any) {
  return app(req, res);
}
