import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ projectId: "gen-lang-client-0637384010" });
const db = getFirestore("ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");
db.collection('public_snapshot').doc('test').set({ hello: 'world' }).then(() => console.log('success')).catch(console.error);
