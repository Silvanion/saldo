import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Intercept console messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:5173');
  
  // Wait for the app to load
  await page.waitForSelector('#btn-add-tx-view', { timeout: 5000 }).catch(e => console.log("Timeout waiting for btn-add-tx-view"));
  
  // If we are on a landing page or something, we need to click "Przejdź do aplikacji"
  // Wait, let's see if we are on Dashboard
  const html = await page.content();
  if (html.includes('Utwórz nowy profil')) {
    console.log("Needs to create profile");
  } else {
    console.log("App loaded");
  }
  
  await browser.close();
})();
