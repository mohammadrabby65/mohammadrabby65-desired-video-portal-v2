import { app } from './src/lib/firebase.js';
import { getDatabase, ref, set, get } from 'firebase/database';

async function test() {
  const db = getDatabase(app);
  const r = ref(db, 'test');
  await set(r, { hello: 'world' });
  const snap = await get(r);
  console.log(snap.val());
}
test().catch(console.error);
