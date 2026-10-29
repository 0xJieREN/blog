// Screenshot a local page once it sets window.done:  node tools/shot.cjs <page> <out.png> [w] [h]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [page, out, w = 2160, h = 1620] = process.argv.slice(2);
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('pageerror', (e) => console.error('pageerror', e.message)); p.on('console', (m) => console.log(m.text()));
  await p.goto('file://' + path.resolve(page)); await p.waitForFunction(() => window.done, null, { timeout: 120000 });
  await p.screenshot({ path: out }); await b.close();
})();
