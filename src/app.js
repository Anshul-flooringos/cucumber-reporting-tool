const dropPanel = document.querySelector('#dropPanel');
const fileInput = document.querySelector('#fileInput');
const reportContent = document.querySelector('#reportContent');
const emptyState = document.querySelector('#emptyState');
const toast = document.querySelector('#toast');
let currentReport = null;

document.querySelector('#footerDate').textContent = new Date().getFullYear();
document.querySelector('#browseButton').addEventListener('click', () => fileInput.click());
document.querySelector('#htmlExportButton').addEventListener('click', exportHtml);
fileInput.addEventListener('change', event => handleFile(event.target.files[0]));
['dragenter', 'dragover'].forEach(name => dropPanel.addEventListener(name, event => { event.preventDefault(); dropPanel.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(name => dropPanel.addEventListener(name, event => { event.preventDefault(); dropPanel.classList.remove('dragging'); }));
dropPanel.addEventListener('drop', event => handleFile(event.dataTransfer.files[0]));

async function handleFile(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.zip')) return showToast('Please choose a .zip cucumber report.');
  if (file.size > 100 * 1024 * 1024) return showToast('That ZIP is larger than 100 MB.');
  setStatus('Reading report ZIP...');
  try {
    const zip = await JSZip.loadAsync(file);
    const entries = Object.values(zip.files).filter(entry => !entry.dir);
    const indexEntry = entries.find(entry => /(^|\/)index\.html?$/i.test(entry.name));
    if (!indexEntry) throw new Error('No index HTML found');
    const reportPage = await createReportPage(entries, indexEntry);
    currentReport = { fileName: file.name, ...reportPage };
    renderReport(currentReport);
    setStatus('Report ready to publish');
  } catch (error) {
    setStatus('Ready for a report');
    showToast(error.message.includes('index') ? 'No index.html was found in that ZIP.' : 'Could not read that ZIP file.');
  }
}

async function createReportPage(entries, indexEntry) {
  const urls = new Map();
  const entryMap = new Map(entries.map(entry => [normalizePath(entry.name), entry]));
  for (const entry of entries) {
    const path = normalizePath(entry.name);
    const blob = await entry.async('blob');
    urls.set(path, await blobToDataUrl(blob));
  }
  for (const entry of entries) {
    const path = normalizePath(entry.name);
    if (/\.css$/i.test(path)) {
      const css = await entry.async('text');
      urls.set(path, await blobToDataUrl(new Blob([rewriteCssUrls(css, path, urls)], { type: 'text/css' })));
    }
  }
  const html = await indexEntry.async('text');
  const indexPath = normalizePath(indexEntry.name);
  const documentCopy = new DOMParser().parseFromString(html, 'text/html');
  documentCopy.querySelectorAll('[src], [href]').forEach(element => {
    const attribute = element.hasAttribute('src') ? 'src' : 'href';
    const value = element.getAttribute(attribute);
    if (element.tagName === 'A') {
      const targetPath = resolveArchivePath(value, indexPath);
      if (entryMap.has(targetPath) && /\.html?$/i.test(targetPath)) element.setAttribute('href', `#report:${targetPath}`);
      return;
    }
    const mapped = resolveArchiveUrl(value, indexPath, urls);
    if (mapped) element.setAttribute(attribute, mapped);
  });
  documentCopy.querySelectorAll('style').forEach(style => { style.textContent = rewriteCssUrls(style.textContent, normalizePath(indexEntry.name), urls); });
  documentCopy.querySelectorAll('[style]').forEach(element => { element.setAttribute('style', rewriteCssUrls(element.getAttribute('style'), indexPath, urls)); });
  documentCopy.querySelectorAll('[srcset]').forEach(element => { element.setAttribute('srcset', rewriteSrcset(element.getAttribute('srcset'), indexPath, urls)); });
  documentCopy.querySelectorAll('[xlink\\:href]').forEach(element => { const mapped = resolveArchiveUrl(element.getAttribute('xlink:href'), indexPath, urls); if (mapped) element.setAttribute('xlink:href', mapped); });
  addStatusIconFallback(documentCopy);
  const pages = { [indexPath]: `<!doctype html>${documentCopy.documentElement.outerHTML}` };
  for (const entry of entries.filter(item => /\.html?$/i.test(item.name) && normalizePath(item.name) !== indexPath)) pages[normalizePath(entry.name)] = await buildReportHtml(entry, { urls, entryMap });
  return { html: pages[indexPath], pages, urls, entryMap, indexPath };
}

function renderReport(report) {
  emptyState.classList.add('hidden');
  reportContent.classList.remove('hidden');
  document.querySelector('#reportTitle').textContent = report.fileName.replace(/\.zip$/i, '');
  document.querySelector('#reportBadge').textContent = 'Original index.html';
  document.querySelector('.metric-grid').classList.add('hidden');
  document.querySelector('.progress-track').classList.add('hidden');
  document.querySelector('.progress-label').classList.add('hidden');
  document.querySelector('#featureList').innerHTML = `<iframe id="reportFrame" title="Original Cucumber HTML report" srcdoc="${escapeAttribute(report.html)}" style="width:100%; min-height:620px; border:1px solid var(--line); background:#fff"></iframe>`;
  document.querySelector('#reportFrame').addEventListener('load', bindReportNavigation);
  const oldButton = document.querySelector('#exportButton');
  oldButton.outerHTML = '<button class="primary-button" type="button" id="exportButton"><span class="button-icon">↓</span> Export original report PDF</button>';
  document.querySelector('#exportButton').addEventListener('click', exportPdf);
}

function exportHtml() {
  if (!currentReport) return showToast('Upload a report ZIP first.');
  const pages = Object.fromEntries(Object.entries(currentReport.pages).map(([path, html]) => [path, addNavigationBridge(html)]));
  const serializedPages = JSON.stringify(pages).replace(/</g, '\\u003c');
  const html = `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeAttribute(currentReport.fileName)}</title><style>html,body,iframe{margin:0;width:100%;height:100%;min-height:100vh;border:0}body{overflow:hidden}</style></head><body><iframe id="report" title="Cucumber report"></iframe><script>const pages=${serializedPages};const frame=document.getElementById('report');function openReport(path){if(pages[path])frame.srcdoc=pages[path]}window.addEventListener('message',event=>{if(event.data?.reportPath)openReport(event.data.reportPath)});openReport(${JSON.stringify(currentReport.indexPath)});</script></body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${currentReport.fileName.replace(/\.zip$/i, '')}-responsive.html`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Responsive HTML exported successfully.');
}

function addNavigationBridge(html) { return html.replace('</body>', '<script>document.addEventListener("click",event=>{const link=event.target.closest("[href^=\'#report:\']");if(link){event.preventDefault();parent.postMessage({reportPath:link.getAttribute("href").slice(8)},"*");}});</script></body>'); }

function bindReportNavigation() {
  const frame = document.querySelector('#reportFrame');
  frame.contentDocument.querySelectorAll('a[href^="#report:"]').forEach(link => link.addEventListener('click', async event => {
    event.preventDefault();
    const path = link.getAttribute('href').slice('#report:'.length);
    const entry = currentReport.entryMap.get(path);
    if (entry) { frame.srcdoc = await buildReportHtml(entry, currentReport); frame.addEventListener('load', bindReportNavigation, { once: true }); }
  }));
}

async function buildReportHtml(entry, report) {
  const documentCopy = new DOMParser().parseFromString(await entry.async('text'), 'text/html');
  const sourcePath = normalizePath(entry.name);
  documentCopy.querySelectorAll('[src], [href]').forEach(element => {
    const attribute = element.hasAttribute('src') ? 'src' : 'href';
    const value = element.getAttribute(attribute);
    if (element.tagName === 'A') {
      const targetPath = resolveArchivePath(value, sourcePath);
      if (report.entryMap.has(targetPath) && /\.html?$/i.test(targetPath)) element.setAttribute('href', `#report:${targetPath}`);
      return;
    }
    const mapped = resolveArchiveUrl(value, sourcePath, report.urls);
    if (mapped) element.setAttribute(attribute, mapped);
  });
  documentCopy.querySelectorAll('style').forEach(style => { style.textContent = rewriteCssUrls(style.textContent, sourcePath, report.urls); });
  documentCopy.querySelectorAll('[style]').forEach(element => { element.setAttribute('style', rewriteCssUrls(element.getAttribute('style'), sourcePath, report.urls)); });
  documentCopy.querySelectorAll('[srcset]').forEach(element => { element.setAttribute('srcset', rewriteSrcset(element.getAttribute('srcset'), sourcePath, report.urls)); });
  documentCopy.querySelectorAll('[xlink\\:href]').forEach(element => { const mapped = resolveArchiveUrl(element.getAttribute('xlink:href'), sourcePath, report.urls); if (mapped) element.setAttribute('xlink:href', mapped); });
  addStatusIconFallback(documentCopy);
  return `<!doctype html>${documentCopy.documentElement.outerHTML}`;
}

async function exportPdf() {
  if (!currentReport) return;
  const button = document.querySelector('#exportButton');
  const frame = document.querySelector('#reportFrame');
  button.disabled = true; button.textContent = 'Preparing PDF...'; setStatus('Rendering original report...');
  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const htmlPaths = [...currentReport.entryMap.keys()].filter(path => /\.html?$/i.test(path));
    const reportPaths = [currentReport.indexPath, ...htmlPaths.filter(path => path !== currentReport.indexPath)];
    for (let index = 0; index < reportPaths.length; index += 1) {
      const path = reportPaths[index];
      frame.srcdoc = path === currentReport.indexPath ? currentReport.html : await buildReportHtml(currentReport.entryMap.get(path), currentReport);
      await waitForFrame(frame);
      const documentRoot = frame.contentDocument.documentElement;
      const canvas = await html2canvas(frame.contentDocument.body, { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: documentRoot.scrollWidth, windowHeight: documentRoot.scrollHeight });
      addCanvasPages(pdf, canvas, index > 0);
    }
    pdf.save(`${currentReport.fileName.replace(/\.zip$/i, '')}.pdf`);
    showToast('Original report exported successfully.'); setStatus('Report ready to publish');
  } catch (_) { showToast('PDF export failed. Check the report assets and try again.'); setStatus('Report ready to publish'); }
  button.disabled = false; button.innerHTML = '<span class="button-icon">↓</span> Export original report PDF';
}

function waitForFrame(frame) { return new Promise(resolve => frame.addEventListener('load', resolve, { once: true })); }
function addCanvasPages(pdf, canvas, addPageBefore) {
  const width = 190; const pageHeight = 277; const pixelsPerMillimeter = canvas.width / width; const sliceHeight = Math.floor(pageHeight * pixelsPerMillimeter);
  for (let offset = 0; offset < canvas.height; offset += sliceHeight) {
    if (addPageBefore || offset) pdf.addPage();
    addPageBefore = false;
    const slice = document.createElement('canvas'); slice.width = canvas.width; slice.height = Math.min(sliceHeight, canvas.height - offset);
    slice.getContext('2d').drawImage(canvas, 0, offset, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
    pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', 10, 10, width, slice.height / pixelsPerMillimeter);
  }
}

function normalizePath(path) {
  const parts = path.replace(/\\/g, '/').split('/');
  const normalized = [];
  parts.forEach(part => { if (!part || part === '.') return; if (part === '..') normalized.pop(); else normalized.push(part); });
  return normalized.join('/');
}
function resolveArchiveUrl(value, sourcePath, urls) {
  if (!value || /^(data:|blob:|https?:|mailto:|javascript:)/i.test(value)) return null;
  const match = value.match(/^([^?#]+)([?#].*)?$/);
  if (!match) return null;
  const resolved = resolveArchivePath(decodeURIComponent(match[1]), sourcePath);
  const mapped = urls.get(resolved) || urls.get(normalizePath(decodeURIComponent(match[1])));
  return mapped ? `${mapped}${match[2]?.startsWith('#') ? match[2] : ''}` : null;
}
function resolveArchivePath(value, sourcePath) { const base = sourcePath.split('/').slice(0, -1).join('/'); return normalizePath(`${base}/${value}`); }
function rewriteCssUrls(css, sourcePath, urls) {
  return css.replace(/url\((['"]?)([^)'"#]+)\1\)/gi, (match, quote, value) => { const mapped = resolveArchiveUrl(value.trim(), sourcePath, urls); return mapped ? `url(${quote}${mapped}${quote})` : match; })
    .replace(/@import\s+(['"])([^'"]+)\1/gi, (match, quote, value) => { const mapped = resolveArchiveUrl(value, sourcePath, urls); return mapped ? `@import ${quote}${mapped}${quote}` : match; });
}
function rewriteSrcset(srcset, sourcePath, urls) { return srcset.split(',').map(item => { const parts = item.trim().split(/\s+/); const mapped = resolveArchiveUrl(parts[0], sourcePath, urls); if (mapped) parts[0] = mapped; return parts.join(' '); }).join(', '); }
function addStatusIconFallback(documentCopy) { const style = documentCopy.createElement('style'); style.textContent = '[class*="fa-check"]:before,[class*="glyphicon-ok"]:before{content:"✓"!important;font-family:Arial,sans-serif!important}[class*="fa-times"]:before,[class*="glyphicon-remove"]:before{content:"×"!important;font-family:Arial,sans-serif!important}[class*="fa-exclamation"]:before,[class*="glyphicon-warning"]:before{content:"!"!important;font-family:Arial,sans-serif!important}'; documentCopy.head.appendChild(style); }
function blobToDataUrl(blob) { return new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); }); }
function escapeAttribute(value) { return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }
function setStatus(value) { document.querySelector('#engineStatus').textContent = value; }
function showToast(message) { toast.textContent = message; toast.classList.add('show'); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 3200); }
