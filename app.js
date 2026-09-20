import { totp } from './totp.js';

const PERIOD = 30;
const KEY = 'totp-web';
const THEME = 'totp-theme';
const COPY_LABEL = 'copy URL to current state WITH SECRETS VISIBLE IN PLAINTEXT';
const $ = id => document.getElementById(id);
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clip = t => (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject());

// Theme: auto (follow system) -> light -> dark. Auto is the default.
const MODES = ['auto', 'light', 'dark'];
const ICON = { auto: '◐', light: '☀', dark: '☽' };
function applyTheme(m) {
  if (m === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = m;
  $('theme').textContent = ICON[m];
}
let mode = localStorage.getItem(THEME) || 'auto';
applyTheme(mode);
$('theme').onclick = () => {
  mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
  localStorage.setItem(THEME, mode);
  applyTheme(mode);
};

// Secrets ride only in the URL fragment (#s=... or #label=secret) so they are
// never sent to the server. A legacy ?query link is migrated into the fragment
// and stripped from the address bar -- but note its secret already reached the
// server on that first request; re-copy the link to get a clean fragment URL.
function readParams(str) {
  const p = new URLSearchParams(str);
  if (p.has('s')) return p.get('s');
  return [...p].filter(([k]) => k).map(([k, v]) => (v ? `${k}: ${v}` : k)).join('\n');
}
if (location.search.length > 1) {
  const text = readParams(location.search.slice(1));
  history.replaceState(null, '', location.pathname + '#s=' + encodeURIComponent(text));
}
$('in').value = readParams(location.hash.slice(1)) || localStorage.getItem(KEY) || '';
$('in').oninput = () => localStorage.setItem(KEY, $('in').value);

$('copy').onclick = async () => {
  const link = location.origin + location.pathname + '#s=' + encodeURIComponent($('in').value);
  try { await clip(link); $('copy').textContent = 'copied!'; }
  catch { prompt('copy this link:', link); }
  setTimeout(() => ($('copy').textContent = COPY_LABEL), 1200);
};

// Copy an individual code (raw digits, no space) via the per-row button.
$('out').onclick = e => {
  const b = e.target.closest('button[data-code]');
  if (b && b.dataset.code) clip(b.dataset.code).then(() => (b.textContent = 'copied!')).catch(() => {});
};

// One secret per line: "label: BASE32", a bare "BASE32", or an otpauth:// URI.
function parse(text) {
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    if (line.startsWith('otpauth://')) {
      const u = new URL(line);
      return {
        label: decodeURIComponent(u.pathname.slice(1)) || u.searchParams.get('issuer') || '',
        secret: u.searchParams.get('secret') || '',
      };
    }
    const i = line.indexOf(':');
    return i < 0
      ? { label: '', secret: line }
      : { label: line.slice(0, i).trim(), secret: line.slice(i + 1).trim() };
  });
}

async function tick() {
  $('clock').value = PERIOD - (Date.now() / 1000) % PERIOD;
  const rows = await Promise.all(parse($('in').value).map(async ({ label, secret }) => {
    let raw = '';
    try { raw = await totp(secret); } catch { /* bad secret */ }
    const shown = raw ? raw.replace(/(\d{3})(\d+)/, '$1 $2') : '—';
    const btn = raw ? `<button data-code="${raw}">copy code</button>` : '';
    return `<tr><td>${esc(label)}</td><td class=code>${shown}</td><td>${btn}</td></tr>`;
  }));
  $('out').innerHTML = rows.join('');
}

tick();
setInterval(tick, 1000);
