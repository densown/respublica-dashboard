import puppeteer from 'puppeteer-core'
const CHROME = '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome'
const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'],
})
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 810, deviceScaleFactor: 2 })
await p.goto('https://app.respublica.media/', { waitUntil: 'networkidle0', timeout: 60000 })
await new Promise(r => setTimeout(r, 2500))
await p.screenshot({ path: '/tmp/claude-0/-root-respublica-dashboard/7e0f9325-22f2-40d9-84a0-6de47af52510/scratchpad/test.png' })
console.log('  ok, Titel:', await p.title())
await b.close()
