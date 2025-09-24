const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

const perfDir = path.join(__dirname, '../perf');

// Ensure perf directory exists
if (!fs.existsSync(perfDir)) {
  fs.mkdirSync(perfDir, { recursive: true });
}

const urls = [
  { name: 'home', url: 'http://localhost:3000' },
  { name: 'sell', url: 'http://localhost:3000/sell' },
  { name: 'listing', url: 'http://localhost:3000/listings/test-listing' }
];

async function runLighthouse(url, name) {
  console.log(`Running Lighthouse for ${name}...`);
  
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info',
    output: ['json', 'html'],
    onlyCategories: ['performance'],
    port: chrome.port,
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4
    }
  };

  try {
    const runnerResult = await lighthouse(url, options);
    
    // Save JSON report
    const jsonReport = JSON.stringify(runnerResult.lhr, null, 2);
    fs.writeFileSync(path.join(perfDir, `lighthouse-${name}.json`), jsonReport);
    
    // Save HTML report
    const htmlReport = runnerResult.report[1];
    fs.writeFileSync(path.join(perfDir, `lighthouse-${name}.html`), htmlReport);
    
    // Extract key metrics
    const metrics = runnerResult.lhr.audits;
    console.log(`\n${name.toUpperCase()} Results:`);
    console.log(`LCP: ${metrics['largest-contentful-paint'].displayValue}`);
    console.log(`TTI: ${metrics['interactive'].displayValue}`);
    console.log(`CLS: ${metrics['cumulative-layout-shift'].displayValue}`);
    console.log(`FCP: ${metrics['first-contentful-paint'].displayValue}`);
    
  } catch (error) {
    console.error(`Error running Lighthouse for ${name}:`, error);
  } finally {
    await chrome.kill();
  }
}

async function runAllAudits() {
  console.log('Starting Lighthouse audits...');
  console.log('Make sure the dev server is running on localhost:3000\n');
  
  for (const { url, name } of urls) {
    await runLighthouse(url, name);
    console.log(''); // Empty line for readability
  }
  
  console.log('All Lighthouse audits completed!');
  console.log(`Reports saved to: ${perfDir}`);
}

runAllAudits().catch(console.error);
