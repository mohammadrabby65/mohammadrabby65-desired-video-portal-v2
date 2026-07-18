import fetch from 'node-fetch';
const API_KEY = "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4"; // from src/lib/firebase.ts
async function verifyToken(idToken) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });
  const data = await res.json();
  console.log(data);
}
// We don't have a real token here, but we can see the error response
verifyToken('invalid-token');
