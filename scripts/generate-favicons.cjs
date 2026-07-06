const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');

const publicDir = path.join(__dirname, '..', 'public');

async function generate() {
  try {
    const icon16 = path.join(publicDir, 'favicon-16x16.png');
    const icon32 = path.join(publicDir, 'favicon-32x32.png');
    
    if (!fs.existsSync(icon16) || !fs.existsSync(icon32)) {
      console.error('Error: Please ensure favicon-16x16.png and favicon-32x32.png exist in the public/ folder.');
      process.exit(1);
    }

    const buf = await pngToIco([icon16, icon32]);
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), buf);
    console.log('Successfully generated favicon.ico from uploaded PNG files.');
  } catch (err) {
    console.error('Error generating assets:', err);
  }
}

generate();
