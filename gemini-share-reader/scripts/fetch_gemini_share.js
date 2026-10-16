/**
 * fetch_gemini_share.js
 * 
 * Fetches and renders a shared Google Gemini chat session (share.gemini.google or gemini.google.com/share)
 * via Chrome DevTools Protocol (CDP) using headless Chrome/Edge.
 * 
 * Usage:
 *   node fetch_gemini_share.js <url> [--output <path>] [--format text|json|html|all]
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const https = require('https');
const http = require('http');

// Parse CLI arguments
const args = process.argv.slice(2);
let inputUrl = '';
let outputPath = '';
let outputFormat = 'all';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--output' || args[i] === '-o') {
    outputPath = args[++i];
  } else if (args[i] === '--format' || args[i] === '-f') {
    outputFormat = args[++i] || 'all';
  } else if (!inputUrl && !args[i].startsWith('-')) {
    inputUrl = args[i];
  }
}

if (!inputUrl) {
  console.error('Error: Please provide a Gemini share URL.');
  console.error('Usage: node fetch_gemini_share.js <url> [--output <path>] [--format text|json|html|all]');
  process.exit(1);
}

function resolveRedirects(currentUrl, maxRedirects = 5) {
  return new Promise((resolve) => {
    if (maxRedirects <= 0) return resolve(currentUrl);
    const client = currentUrl.startsWith('https') ? https : http;
    client.get(currentUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let nextUrl = res.headers.location;
        if (!nextUrl.startsWith('http')) {
          const origin = new URL(currentUrl).origin;
          nextUrl = new URL(nextUrl, origin).href;
        }
        resolve(resolveRedirects(nextUrl, maxRedirects - 1));
      } else {
        resolve(currentUrl);
      }
    }).on('error', () => resolve(currentUrl));
  });
}

function findBrowserBinary() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getWsDebuggerUrl(port, retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const data = await res.json();
      if (data && data.webSocketDebuggerUrl) {
        return data.webSocketDebuggerUrl;
      }
    } catch (e) {
      // Chrome starting up
    }
    await sleep(500);
  }
  throw new Error(`Failed to connect to browser on debugging port ${port}`);
}

async function main() {
  const browserPath = findBrowserBinary();
  if (!browserPath) {
    console.error('Error: Could not find Google Chrome or Microsoft Edge executable.');
    process.exit(1);
  }

  console.log(`Resolving URL: ${inputUrl}`);
  const targetUrl = await resolveRedirects(inputUrl);
  console.log(`Target URL: ${targetUrl}`);

  const port = await getAvailablePort();
  const tempProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'gemini_share_cdp_'));

  const browserProc = spawn(browserPath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${tempProfile}`,
    `--remote-debugging-port=${port}`,
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    const browserWsUrl = await getWsDebuggerUrl(port);

    // Open target URL
    const openRes = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURI(targetUrl)}`, { method: 'PUT' });
    const targetData = await openRes.json();
    const pageWs = new WebSocket(targetData.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      pageWs.onopen = resolve;
      pageWs.onerror = reject;
    });

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (event) => {
          const resp = JSON.parse(event.data);
          if (resp.id === id) {
            pageWs.removeEventListener('message', handler);
            resolve(resp.result);
          }
        };
        pageWs.addEventListener('message', handler);
        pageWs.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');

    console.log('Waiting for Gemini conversation content to render...');
    let renderedText = '';
    let pageTitle = '';
    let pageHtml = '';

    // Wait until content renders (typically takes 6-10 seconds)
    const maxWaitSeconds = 20;
    for (let sec = 0; sec < maxWaitSeconds; sec++) {
      await sleep(1000);
      const evalRes = await send('Runtime.evaluate', {
        expression: `(() => {
          return {
            title: document.title,
            innerText: document.body ? document.body.innerText : '',
            html: document.body ? document.body.innerHTML : ''
          };
        })()`,
        returnByValue: true
      });

      if (evalRes && evalRes.result && evalRes.result.value) {
        const val = evalRes.result.value;
        pageTitle = val.title || '';
        renderedText = val.innerText || '';
        pageHtml = val.html || '';

        // If chat text has rendered significantly
        if (renderedText.length > 2000) {
          break;
        }
      }
    }

    pageWs.close();

    const baseOutput = outputPath ? outputPath.replace(/\.[^/.]+$/, '') : path.join(process.cwd(), 'gemini_chat_extracted');

    if (outputFormat === 'text' || outputFormat === 'all') {
      const txtPath = outputPath && outputPath.endsWith('.txt') ? outputPath : `${baseOutput}.txt`;
      fs.writeFileSync(txtPath, renderedText, 'utf-8');
      console.log(`Saved text: ${txtPath}`);
    }

    if (outputFormat === 'html' || outputFormat === 'all') {
      const htmlPath = outputPath && outputPath.endsWith('.html') ? outputPath : `${baseOutput}.html`;
      fs.writeFileSync(htmlPath, pageHtml, 'utf-8');
      console.log(`Saved HTML: ${htmlPath}`);
    }

    if (outputFormat === 'json' || outputFormat === 'all') {
      const jsonPath = outputPath && outputPath.endsWith('.json') ? outputPath : `${baseOutput}.json`;
      const data = {
        url: inputUrl,
        resolvedUrl: targetUrl,
        title: pageTitle,
        extractedAt: new Date().toISOString(),
        contentLength: renderedText.length,
        rawText: renderedText
      };
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`Saved JSON: ${jsonPath}`);
    }

    console.log(`Successfully extracted "${pageTitle}" (${renderedText.length} characters)`);
  } catch (err) {
    console.error('Error during execution:', err);
    process.exit(1);
  } finally {
    try {
      browserProc.kill('SIGKILL');
    } catch (e) {}
    setTimeout(() => {
      try {
        fs.rmSync(tempProfile, { recursive: true, force: true });
      } catch (e) {}
    }, 500);
  }
}

main();
