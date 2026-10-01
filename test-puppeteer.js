import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  await page.goto('http://127.0.0.1:3000/');
  await page.waitForTimeout(3000);
  const content = await page.content();
  if (content.includes('No videos found')) {
    console.log('Found "No videos found" in DOM');
  } else if (content.includes('Error loading')) {
    console.log('Found "Error loading" in DOM');
  } else {
    console.log('Found something else');
  }
  await browser.close();
})();
