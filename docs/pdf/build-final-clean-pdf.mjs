import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { JSDOM } from 'jsdom';

const root = process.cwd();
const src = path.join(root, 'docs/NetSentinel-AI_Project-Foundation-Dossier_v0.1.md');
const workDir = path.join(root, 'docs/pdf/build-final-clean');
const preparedMd = path.join(workDir, 'NetSentinel-AI_Project-Foundation-Dossier_v0.1-final-clean-source.md');
const htmlOut = path.join(workDir, 'NetSentinel-AI_Project-Foundation-Dossier_v0.1-final-clean.html');
const pdfOut = path.join(root, 'docs/NetSentinel-AI_Project-Foundation-Dossier_v0.1-final-clean.pdf');
const firstPassPdf = path.join(workDir, 'NetSentinel-AI_Project-Foundation-Dossier_v0.1-final-clean-first-pass.pdf');
const template = path.join(root, 'docs/pdf/netsentinel-polished-template.html');
const assetsDir = path.join(root, 'docs/pdf/assets');
const mermaidScript = pathToFileURL(path.join(root, 'docs/pdf/node_modules/mermaid/dist/mermaid.min.js')).href;

fs.mkdirSync(workDir, { recursive: true });
fs.mkdirSync(path.join(workDir, 'assets'), { recursive: true });
for (const name of ['operations-center-dashboard.png', 'wireless-field-measurements.png']) {
  const from = path.join(assetsDir, name);
  const to = path.join(workDir, 'assets', name);
  if (fs.existsSync(from)) fs.copyFileSync(from, to);
}

let md = fs.readFileSync(src, 'utf8');

md = md.replace(/^---[\s\S]*?---\s*/, '');
md = md.replace(/^# NetSentinel AI[\s\S]*?\\newpage\s*/, '');
md = md.replace(/\\newpage\s*\n\s*# 25\. PDF Export Instructions[\s\S]*$/m, '');
md = md.replace(/^# 25\. PDF Export Instructions[\s\S]*$/m, '');

md = md.replaceAll('Author / Founder: [Name Placeholder]', 'Founder: Aboulouafae IT');
md = md.replaceAll('Author / Founder:** [Name Placeholder]', 'Founder:** Aboulouafae IT');
md = md.replaceAll('[Name Placeholder]', 'Aboulouafae IT');
md = md.replaceAll('NetSentinelAI', 'NetSentinel AI');
md = md.replaceAll('docker compose up -build -d', 'docker compose up --build -d');
md = md.replaceAll('http: /localhost:3000', 'http://localhost:3000');
md = md.replaceAll('http: /localhost:8000', 'http://localhost:8000');
md = md.replaceAll('http: /localhost:8000/docs', 'http://localhost:8000/docs');
md = md.replaceAll('http: /localhost:8000/redoc', 'http://localhost:8000/redoc');
md = md.replace(/\/api\/v1\/([a-z-]+)\s+\*/g, '/api/v1/$1/*');
md = md.replaceAll('postgresql+asyncpg: / .', 'postgresql+asyncpg://netsentinel:netsentinel_dev_password@postgres:5432/netsentinel');
md = md.replaceAll('redis: /redis:6379/0', 'redis://redis:6379/0');
md = md.replaceAll('http: /localhost:8000/api/v1', 'http://localhost:8000/api/v1');
md = md.replace(/^\\newpage\s*$/gm, '');

const preview = `
# Product Interface Preview

The following interface captures show the current MVP visual direction. They demonstrate the desktop-style operations experience and the field workflow surface for wireless measurements. These screens should be understood as MVP / work-in-progress views, not final production claims.

![Operations Center dashboard showing the dark NOC-style navigation, operational cards, alert counters, discovery entry points, and module shortcuts.](assets/operations-center-dashboard.png){.interface-shot}

**Figure: Operations Center Dashboard.** This screen demonstrates the unified operations landing page, including navigation to discovery, assets, radio devices, field measurements, alerts, incidents, security, logs, and automation.

![Wireless Field Measurements page showing the expanded field measurement form with RF and technician fields.](assets/wireless-field-measurements.png){.interface-shot}

**Figure: Wireless Field Measurements.** This screen demonstrates the field data entry workflow for real wireless link readings, including RSSI, SNR, noise floor, CCQ, latency, packet loss, TX/RX capacity, technician name, and field notes.
`;

md = md.replace(/(# 1\. Executive Summary[\s\S]*?)(?=\n# 2\. Project Vision)/, `$1\n${preview}\n`);

const topHeadingRe = /^#\s+(?:(\d+)\.\s*)?(.+)$/gm;
let section = 0;
md = md.replace(topHeadingRe, (_match, _num, title) => {
  section += 1;
  const clean = title.replace(/^\d+\.\s*/, '').trim();
  return `# ${section}. ${clean}`;
});

// Keep route examples syntactically clean before HTML conversion.
md = md.replace(/`\/api\/v1\/([a-z-]+)\s+\*`/g, '`/api/v1/$1/*`');

function replaceMermaidUnderHeading(markdown, heading, diagram) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(## ${escapedHeading}\\n\\n)\\\`\\\`\\\`mermaid\\n[\\s\\S]*?\\n\\\`\\\`\\\``, 'm');
  return markdown.replace(pattern, `$1\`\`\`mermaid\n${diagram.trim()}\n\`\`\``);
}

md = replaceMermaidUnderHeading(md, 'Wireless Measurement Flow', `
flowchart LR
    Tech[Field Technician]
    Form[Measurement Form]
    API[Measurements API]
    DB[(PostgreSQL)]
    Dx[Wireless Diagnostics]
    Report[Diagnostic Report]
    Tech --> Form --> API --> DB --> Dx --> Report
`);

md = replaceMermaidUnderHeading(md, 'Alert Generation Flow', `
flowchart LR
    Metric[Telemetry / Log / RF Metric]
    Rule[Rule or Threshold]
    Alert[Alert Record]
    Incident[Incident Candidate]
    Playbook[Automation Playbook]
    Metric --> Rule --> Alert
    Alert --> Incident
    Alert --> Playbook
`);

md = replaceMermaidUnderHeading(md, 'AI Assistant Flow', `
flowchart LR
    Operator[Operator]
    UI[Frontend UI]
    AI[AI Assistant API]
    Data[(Internal Evidence)]
    Model[Optional LLM Provider]
    Answer[Evidence-Based Response]
    Operator --> UI --> AI
    AI --> Data
    AI --> Model
    Data --> Answer
    Model --> Answer
    Answer --> UI --> Operator
`);

md = replaceMermaidUnderHeading(md, 'Conceptual Entity Relationship Diagram', `
flowchart TB
    Org[Organization]
    User[Users]
    Site[Sites]
    Asset[Assets]
    Alert[Alerts]
    Incident[Incidents]
    Link[Wireless Links]
    Metric[Wireless Metrics]
    Diagnostic[Diagnostics]
    Security[Rules & IOCs]
    Automation[Playbooks & Actions]
    Org --> User
    Org --> Site
    Site --> Asset
    Asset --> Alert
    Alert --> Incident
    Site --> Link
    Link --> Metric
    Link --> Diagnostic
    Org --> Security
    Org --> Automation
`);

md = replaceMermaidUnderHeading(md, 'Incident Workflow Diagram', `
flowchart LR
    Open[Open]
    Investigating[Investigating]
    Escalated[Escalated]
    Mitigating[Mitigating]
    Resolved[Resolved]
    Closed[Closed]
    FalsePositive[False Positive]
    Open --> Investigating --> Mitigating --> Resolved --> Closed
    Investigating --> Escalated --> Mitigating
    Open --> FalsePositive --> Closed
`);

fs.writeFileSync(preparedMd, md);

execFileSync('pandoc', [
  preparedMd,
  '--from', 'markdown+yaml_metadata_block+raw_tex+link_attributes',
  '--to', 'html5',
  '--standalone',
  '--metadata', 'title=NetSentinel AI — Project Foundation Dossier',
  '--template', template,
  '-V', `mermaid_script=${mermaidScript}`,
  '-o', htmlOut,
], { stdio: 'inherit' });

function protectCriticalLiterals() {
  const html = fs.readFileSync(htmlOut, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const literals = [
    'docker compose up --build -d',
    'http://localhost:3000',
    'http://localhost:8000',
    'http://localhost:8000/docs',
    'http://localhost:8000/redoc',
    'http://localhost:8000/api/v1',
    '/api/v1/auth/*',
    '/api/v1/assets/*',
    '/api/v1/wireless/*',
    'postgresql+asyncpg://netsentinel:netsentinel_dev_password@postgres:5432/netsentinel',
    'postgresql+asyncpg://...',
    'redis://redis:6379/0',
  ];

  const walker = doc.createTreeWalker(doc.body, dom.window.NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parentName = node.parentElement?.tagName?.toLowerCase();
    if (['script', 'style', 'pre', 'code', 'svg'].includes(parentName)) continue;
    if (literals.some((literal) => node.nodeValue.includes(literal))) textNodes.push(node);
  }

  for (const node of textNodes) {
    const frag = doc.createDocumentFragment();
    let text = node.nodeValue;
    while (text.length) {
      let next = null;
      let index = -1;
      for (const literal of literals) {
        const found = text.indexOf(literal);
        if (found !== -1 && (index === -1 || found < index)) {
          next = literal;
          index = found;
        }
      }
      if (!next) {
        frag.appendChild(doc.createTextNode(text));
        break;
      }
      if (index > 0) frag.appendChild(doc.createTextNode(text.slice(0, index)));
      const span = doc.createElement('span');
      span.className = 'nowrap literal';
      span.textContent = next;
      frag.appendChild(span);
      text = text.slice(index + next.length);
    }
    node.parentNode.replaceChild(frag, node);
  }

  fs.writeFileSync(htmlOut, dom.serialize());
}

protectCriticalLiterals();

const browser = await chromium.launch({ headless: true });
async function renderPdf(target) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1500 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlOut).href, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__netsentinelReady === true, null, { timeout: 30000 });

  const stats = await page.evaluate(() => {
    const diagrams = [...document.querySelectorAll('.mermaid-wrap')];
    const rendered = diagrams.filter((d) => d.querySelector('svg')).length;
    return { total: diagrams.length, rendered };
  });

  await page.pdf({
    path: target,
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
  await page.close();
  return stats;
}

function htmlText(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function extractSectionPages(pdfPath, headings) {
  const text = execFileSync('pdftotext', [pdfPath, '-'], { encoding: 'utf8' });
  const pages = text.split('\f').map((page) => page.replace(/\s+/g, ' '));
  const map = new Map();
  for (const heading of headings) {
    const normalizedHeading = heading.replace(/\s+/g, ' ');
    for (let i = 2; i < pages.length; i += 1) {
      if (pages[i].includes(normalizedHeading)) {
        map.set(heading, i + 1);
        break;
      }
    }
  }
  return map;
}

function injectStaticToc(pageMap) {
  const html = fs.readFileSync(htmlOut, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const toc = doc.querySelector('#generated-toc');
  const headings = [...doc.querySelectorAll('main > h1')].map((h) => h.textContent.replace(/\s+/g, ' ').trim());
  toc.dataset.static = 'true';
  toc.innerHTML = headings.map((heading) => {
    const pageNumber = pageMap.get(heading) ?? '';
    return `
      <div class="toc-group">
        <div class="toc-row level-1">
          <span class="toc-title">${htmlText(heading)}</span>
          <span class="toc-dots"></span>
          <span class="toc-page-num">${pageNumber}</span>
        </div>
      </div>
    `;
  }).join('\n');
  fs.writeFileSync(htmlOut, dom.serialize());
  return headings;
}

const firstStats = await renderPdf(firstPassPdf);
let html = fs.readFileSync(htmlOut, 'utf8');
let dom = new JSDOM(html);
let h1Headings = [...dom.window.document.querySelectorAll('main > h1')].map((h) => h.textContent.replace(/\s+/g, ' ').trim());
let pageMap = extractSectionPages(firstPassPdf, h1Headings);
injectStaticToc(pageMap);

const stats = await renderPdf(pdfOut);

dom = new JSDOM(fs.readFileSync(htmlOut, 'utf8'));
h1Headings = [...dom.window.document.querySelectorAll('main > h1')].map((h) => h.textContent.replace(/\s+/g, ' ').trim());
pageMap = extractSectionPages(pdfOut, h1Headings);
injectStaticToc(pageMap);
const finalStats = await renderPdf(pdfOut);

await browser.close();

const pdfInfo = execFileSync('pdfinfo', [pdfOut], { encoding: 'utf8' });
const pageMatch = pdfInfo.match(/^Pages:\s+(\d+)/m);

console.log(JSON.stringify({
  pdf: pdfOut,
  html: htmlOut,
  preparedMarkdown: preparedMd,
  pages: pageMatch ? Number(pageMatch[1]) : null,
  mermaid: finalStats,
  firstPassMermaid: firstStats,
  screenshots: {
    operationsCenter: path.join(assetsDir, 'operations-center-dashboard.png'),
    fieldMeasurements: path.join(assetsDir, 'wireless-field-measurements.png'),
  },
}, null, 2));
