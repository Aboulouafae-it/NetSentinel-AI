import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = process.cwd();
const src = path.join(root, 'docs/NetSentinel-AI_Project-Foundation-Dossier_v0.1.md');
const workDir = path.join(root, 'docs/pdf/build');
const preparedMd = path.join(workDir, 'NetSentinel-AI_Project-Foundation-Dossier_v0.1-polished-source.md');
const htmlOut = path.join(workDir, 'NetSentinel-AI_Project-Foundation-Dossier_v0.1-polished.html');
const pdfOut = path.join(root, 'docs/NetSentinel-AI_Project-Foundation-Dossier_v0.1-polished.pdf');
const template = path.join(root, 'docs/pdf/netsentinel-polished-template.html');
const mermaidScript = pathToFileURL(path.join(root, 'docs/pdf/node_modules/mermaid/dist/mermaid.min.js')).href;

fs.mkdirSync(workDir, { recursive: true });

let md = fs.readFileSync(src, 'utf8');

// Remove YAML metadata and the first manually authored cover block.
md = md.replace(/^---[\s\S]*?---\s*/, '');
md = md.replace(/^# NetSentinel AI[\s\S]*?\\newpage\s*/, '');

// Keep the project founder consistent in generated outputs.
md = md.replaceAll('Author / Founder: [Name Placeholder]', 'Founder: Aboulouafae IT');
md = md.replaceAll('Author / Founder:** [Name Placeholder]', 'Founder:** Aboulouafae IT');
md = md.replaceAll('[Name Placeholder]', 'Aboulouafae IT');

// Remove raw LaTeX page-break commands from the HTML path.
md = md.replace(/^\\newpage\s*$/gm, '');

fs.writeFileSync(preparedMd, md);

execFileSync('pandoc', [
  preparedMd,
  '--from', 'markdown+yaml_metadata_block+raw_tex',
  '--to', 'html5',
  '--standalone',
  '--toc',
  '--toc-depth=3',
  '--metadata', 'title=NetSentinel AI — Project Foundation Dossier',
  '--template', template,
  '-V', `mermaid_script=${mermaidScript}`,
  '-o', htmlOut,
], { stdio: 'inherit' });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 1500 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(htmlOut).href, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__netsentinelReady === true, null, { timeout: 30000 });

const mermaidStats = await page.evaluate(() => {
  const diagrams = [...document.querySelectorAll('.mermaid-wrap')];
  const rendered = diagrams.filter((d) => d.querySelector('svg')).length;
  return { total: diagrams.length, rendered };
});

await page.pdf({
  path: pdfOut,
  format: 'Letter',
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  margin: {
    top: '0.58in',
    right: '0.54in',
    bottom: '0.62in',
    left: '0.54in',
  },
  headerTemplate: `
    <div style="width:100%;font-family:Arial,sans-serif;font-size:8px;color:#536173;padding:0 0.54in;border-bottom:1px solid #d6e0ea;">
      <span>NetSentinel AI — Project Foundation Dossier</span>
      <span style="float:right;">MVP / Work in Progress</span>
    </div>
  `,
  footerTemplate: `
    <div style="width:100%;font-family:Arial,sans-serif;font-size:8px;color:#536173;padding:0 0.54in;border-top:1px solid #d6e0ea;">
      <span>Confidential</span>
      <span style="float:right;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>
  `,
});

await browser.close();

const pdfInfo = execFileSync('pdfinfo', [pdfOut], { encoding: 'utf8' });
const pageMatch = pdfInfo.match(/^Pages:\s+(\d+)/m);

console.log(JSON.stringify({
  pdf: pdfOut,
  html: htmlOut,
  preparedMarkdown: preparedMd,
  pages: pageMatch ? Number(pageMatch[1]) : null,
  mermaid: mermaidStats,
}, null, 2));
