const { execSync } = require('child_process');
const url = 'https://i.ibb.co.com/qYJWw9xy/Desired-Hub-Favicon.jpg';

try {
  execSync(`curl -sL "${url}" -o /tmp/base.jpg`);
  execSync(`convert /tmp/base.jpg -resize 16x16 public/favicon-16x16.png`);
  execSync(`convert /tmp/base.jpg -resize 32x32 public/favicon-32x32.png`);
  execSync(`convert /tmp/base.jpg -resize 180x180 public/apple-touch-icon.png`);
  execSync(`convert /tmp/base.jpg -resize 192x192 public/android-chrome-192x192.png`);
  execSync(`convert /tmp/base.jpg -resize 512x512 public/android-chrome-512x512.png`);
  console.log("Successfully created all PNGs.");
} catch (e) {
  console.error("Failed to create PNGs", e);
}
