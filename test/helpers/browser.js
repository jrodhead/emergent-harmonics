import { createServer } from 'node:http';
import { readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url));

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

/** The browser to drive, or null when there is none installed to drive. */
export const findChrome = () => CHROME_PATHS.find((path) => path && existsSync(path)) ?? null;

const CONTENT_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

/** Serves the project over http, since ES modules will not load from file://. */
const startStaticServer = async () => {
  const server = createServer(async (request, response) => {
    const requested = normalize(decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    const filePath = join(PROJECT_ROOT, requested === '/' ? 'index.html' : requested);

    // Refuse to serve anything that climbed out of the project.
    if (!filePath.startsWith(PROJECT_ROOT)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    try {
      const body = await readFile(filePath);
      response.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream' });
      response.end(body);
    } catch (error) {
      response.writeHead(404).end('Not found');
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  return { server, port: server.address().port };
};

const waitForDebugger = async (port, attempts = 100) => {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error('The browser never opened its debugging port');
};

/**
 * Launches a headless browser on the project and returns the handle the tests
 * drive it through.
 */
export async function launchApp() {
  const chromePath = findChrome();
  if (!chromePath) throw new Error('No Chrome-like browser found to test with');

  const { server, port } = await startStaticServer();
  const debuggingPort = 9333 + Math.floor(Math.random() * 500);
  const profileDir = join(tmpdir(), `emergent-harmonics-test-${process.pid}-${debuggingPort}`);

  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    // Notes are auditioned without a click, which autoplay policy would block.
    '--autoplay-policy=no-user-gesture-required',
    'about:blank',
  ], { stdio: 'ignore' });

  const version = await waitForDebugger(debuggingPort);
  const socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = () => reject(new Error('Could not connect to the browser'));
  });

  let messageId = 0;
  const pending = new Map();
  const consoleErrors = [];

  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);

    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
      return;
    }

    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      consoleErrors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(' '));
    }

    if (message.method === 'Runtime.exceptionThrown') {
      const { exceptionDetails } = message.params;
      consoleErrors.push(exceptionDetails.exception?.description ?? exceptionDetails.text);
    }
  };

  const send = (method, params = {}, sessionId) => new Promise((resolve) => {
    const id = ++messageId;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });

  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });

  await send('Runtime.enable', {}, sessionId);
  await send('Page.enable', {}, sessionId);

  /** Runs an expression in the page and returns its value. */
  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', {
      expression: `(() => { ${expression} })()`,
      returnByValue: true,
      awaitPromise: true,
    }, sessionId);

    const { exceptionDetails, result } = response.result;

    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    }

    return result.value;
  };

  /** Polls until the expression is truthy, so no test has to guess at a delay. */
  const waitFor = async (expression, description = expression) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        if (await evaluate(`return ${expression}`)) return;
      } catch (error) {
        // The page may still be navigating; keep trying.
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    throw new Error(`Timed out waiting for: ${description}`);
  };

  const reload = async () => {
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` }, sessionId);
    await waitFor("document.querySelectorAll('.config-note[data-note-index]').length > 0", 'the app to render');
  };

  return {
    evaluate,
    waitFor,
    reload,
    consoleErrors,

    /** Clears saved state and reloads, so each test starts from a first visit. */
    async resetApp() {
      await evaluate('localStorage.clear();');
      await reload();
      consoleErrors.length = 0;
    },

    /** Clicks the element at its centre with a real mouse, not a synthetic event. */
    async click(selector) {
      const box = await evaluate(`
        const element = document.querySelector('${selector}');
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      `);

      if (!box) throw new Error(`Nothing matched ${selector}`);

      for (const type of ['mousePressed', 'mouseReleased']) {
        await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 }, sessionId);
      }
    },

    async close() {
      socket.close();
      server.close();

      // Wait for Chrome to actually release the profile directory before
      // deleting it, or the delete can race its own shutdown writes.
      await new Promise((resolve) => {
        if (chrome.exitCode !== null || chrome.signalCode !== null) {
          resolve();
          return;
        }
        chrome.once('exit', resolve);
        chrome.kill();
      });

      await rm(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    },
  };
}
