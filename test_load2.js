import fetch from "node-fetch";

async function run() {
  const res = await fetch('http://localhost:3000/api/admin/snapshot/status');
  console.log(await res.json());
}
run();
