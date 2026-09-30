fetch('http://localhost:3000/api/categories').then(r=>r.json()).then(d=>console.log("Categories length:", d.length)).catch(console.error)
