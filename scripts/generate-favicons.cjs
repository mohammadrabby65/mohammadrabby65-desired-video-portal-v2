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
      console.error('Because chat attachments are not accessible to the code environment, you must manually upload the files using the file explorer.');
      process.exit(1);
    }

    const buf = await pngToIco([icon16, icon32]);
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), buf);
    console.log('Successfully generated favicon.ico from uploaded PNG files.');

    const manifest = {
      "name": "DesiredHub - Free Desi Porn & Hot Indian Sex Videos Online",
      "short_name": "DesiredHub",
      "icons": [
        {
          "src": "/android-chrome-192x192.png",
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": "/android-chrome-512x512.png",
          "sizes": "512x512",
          "type": "image/png"
        }
      ],
      "theme_color": "#000000",
      "background_color": "#000000",
      "display": "standalone",
      "start_url": "/"
    };
    
    fs.writeFileSync(path.join(publicDir, 'site.webmanifest'), JSON.stringify(manifest, null, 2));
    console.log('Successfully generated site.webmanifest.');
    
    // Remove old manifest.json if exists
    if (fs.existsSync(path.join(publicDir, 'manifest.json'))) {
      fs.unlinkSync(path.join(publicDir, 'manifest.json'));
      console.log('Removed old manifest.json');
    }
  } catch (err) {
    console.error('Error generating assets:', err);
  }
}

generate();
