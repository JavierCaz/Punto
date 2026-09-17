'use strict';

/**
 * Minimal loopback static file server for the Expo web export (`dist/`).
 *
 * Why serve over HTTP instead of loading `dist/index.html` with `file://`?
 *   1. `session.webRequest` never observes `file://` requests, so COEP/COOP
 *      cannot be injected for them (electron/electron#23485). Without those
 *      headers the renderer is not cross-origin isolated and `SharedArrayBuffer`
 *      stays unavailable — expo-sqlite's wa-sqlite worker then fails.
 *   2. The static export references its assets with absolute paths
 *      (`/_expo/...`), which do not resolve from a `file://` document.
 *
 * The server binds to 127.0.0.1 only, serves GET/HEAD, rejects any `Host`
 * header that is not loopback (DNS-rebinding hardening) and refuses to escape
 * the web root.
 *
 * `port` matters: browser storage (OPFS, where expo-sqlite keeps its database)
 * is scoped to the origin — including the port. Callers must reuse a stable
 * port across launches or the app will look empty on every restart.
 */

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  // Required so WebAssembly.instantiateStreaming() works for wa-sqlite.
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf',
};

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

/** True when `host` points at the loopback interface (guards DNS rebinding). */
function isLoopbackHost(hostHeader) {
  if (!hostHeader) return false;
  const host = hostHeader.replace(/^\[|\]$/g, '').split(':')[0].toLowerCase();
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

/**
 * Map a request pathname onto a file inside `root`, mirroring the layout the
 * Expo static export produces: `/sales` -> `sales.html`,
 * `/team` -> `team/index.html`. Returns `null` for missing files and for paths
 * that would escape the web root.
 */
async function resolveRequestPath(root, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const absolute = path.resolve(root, `.${path.posix.normalize(decoded)}`);
  const relative = path.relative(root, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

  const candidates = path.extname(absolute)
    ? [absolute]
    : [`${absolute}.html`, path.join(absolute, 'index.html')];

  for (const candidate of candidates) {
    const stat = await fsp.stat(candidate).catch(() => null);
    if (stat?.isFile()) return candidate;
  }
  return null;
}

function createStaticServer({ root }) {
  const webRoot = path.resolve(root);

  return http.createServer(async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD' }).end();
        return;
      }
      if (!isLoopbackHost(req.headers.host)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Forbidden');
        return;
      }

      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      let filePath = await resolveRequestPath(webRoot, url.pathname);
      let isSpaFallback = false;

      // Unknown, extension-less routes boot the SPA so expo-router can render
      // its own not-found screen. Missing assets still 404.
      if (!filePath && !path.extname(url.pathname)) {
        filePath = path.join(webRoot, 'index.html');
        isSpaFallback = true;
      }
      if (!filePath) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
        return;
      }

      const stat = await fsp.stat(filePath);
      const isHtml = filePath.endsWith('.html');
      const headers = {
        'Content-Type': getContentType(filePath),
        'Content-Length': stat.size,
        'Cache-Control':
          isHtml || isSpaFallback
            ? 'no-store'
            : 'public, max-age=31536000, immutable',
        'Cross-Origin-Resource-Policy': 'same-origin',
      };

      if (req.method === 'HEAD') {
        res.writeHead(200, headers).end();
        return;
      }
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      res
        .writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
        .end(`Internal error: ${error.message}`);
    }
  });
}

/**
 * Bind the static server to a loopback port.
 * @param {{ root: string, host?: string, port?: number }} options
 * @returns {Promise<{ server: import('node:http').Server, port: number, origin: string }>}
 */
async function startStaticServer({ root, host = '127.0.0.1', port = 0 }) {
  const server = createStaticServer({ root });
  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Static server did not bind to a TCP port');
  }
  return { server, port: address.port, origin: `http://${host}:${address.port}` };
}

module.exports = {
  MIME_TYPES,
  getContentType,
  isLoopbackHost,
  resolveRequestPath,
  createStaticServer,
  startStaticServer,
};
