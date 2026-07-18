import { app } from './src/lib/firebase.js';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';

async function test() {
  const storage = getStorage(app);
  const r = ref(storage, 'test.json');
  await uploadString(r, JSON.stringify({ hello: 'world' }));
  const url = await getDownloadURL(r);
  console.log(url);
}
test().catch(console.error);
