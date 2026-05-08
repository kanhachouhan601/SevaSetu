const fs = require('fs');

const md = fs.readFileSync('docs/SevaSetu_Project_Documentation.md', 'utf8');

const escapeHtml = value => value.replace(/[&<>]/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
}[char]));

let inCode = false;
let html = '';

for (const line of md.split(/\r?\n/)) {
  if (line.startsWith('```')) {
    html += inCode ? '</code></pre>' : '<pre><code>';
    inCode = !inCode;
    continue;
  }

  if (inCode) {
    html += `${escapeHtml(line)}\n`;
    continue;
  }

  if (line.startsWith('# ')) html += `<h1>${escapeHtml(line.slice(2))}</h1>`;
  else if (line.startsWith('## ')) html += `<h2>${escapeHtml(line.slice(3))}</h2>`;
  else if (line.startsWith('### ')) html += `<h3>${escapeHtml(line.slice(4))}</h3>`;
  else if (line.startsWith('- ')) html += `<ul><li>${escapeHtml(line.slice(2))}</li></ul>`;
  else if (/^\d+\. /.test(line)) html += `<ol><li>${escapeHtml(line.replace(/^\d+\. /, ''))}</li></ol>`;
  else if (!line.trim()) html += '<br>';
  else html += `<p>${escapeHtml(line)}</p>`;
}

html = html.replace(/<\/ul><ul>/g, '').replace(/<\/ol><ol>/g, '');

const css = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    line-height: 1.5;
    color: #172033;
    margin: 42px;
    max-width: 920px;
  }
  h1 {
    font-size: 30px;
    border-bottom: 3px solid #0ea5e9;
    padding-bottom: 10px;
  }
  h2 {
    font-size: 22px;
    margin-top: 34px;
    border-bottom: 1px solid #d7dee8;
    padding-bottom: 6px;
  }
  h3 {
    font-size: 17px;
    margin-top: 22px;
    color: #0f766e;
  }
  pre {
    background: #0f172a;
    color: #e2e8f0;
    padding: 14px;
    border-radius: 8px;
    white-space: pre-wrap;
    word-break: break-word;
  }
  code {
    font-family: SFMono-Regular, Consolas, monospace;
    font-size: 12px;
  }
  p, li {
    font-size: 13px;
  }
  ul, ol {
    margin-top: 4px;
    margin-bottom: 8px;
  }
  @media print {
    body { margin: 28px; }
    h2 { page-break-after: avoid; }
    pre { page-break-inside: avoid; }
  }
`;

fs.writeFileSync(
  'docs/SevaSetu_Project_Documentation.html',
  `<!doctype html><html><head><meta charset="utf-8"><title>SevaSetu Project Documentation</title><style>${css}</style></head><body>${html}</body></html>`
);
