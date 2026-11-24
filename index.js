/**
 * dsh-lulu-pet — Host half.
 *
 * Serves the pet assets (transparent VP9 WebM clips, meme PNGs, a small manifest)
 * on the Harness web server. The Client half (`client.js`) draws the pet and owns
 * all interaction; nothing here depends on another pet plugin.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Package asset directory (…/assets). */
const ASSETS = fileURLToPath(new URL('./assets/', import.meta.url));
/** Public route prefix. Keep in sync with ROUTE in client.js. */
const ROUTE = '/dsh-lulu-pet';
const TYPES = {
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
};

export const inject = ['webServer'];

/** Map a request path to a file inside the asset directory, or undefined. */
function resolveAsset(pathname) {
  let rel = pathname.startsWith(ROUTE) ? pathname.slice(ROUTE.length) : pathname;
  if (rel === '' || rel === '/') rel = '/meta.json';
  let path;
  if (rel === '/meta.json') path = 'meta.json';
  else {
    const match = /^\/(anim|memes)\/([^/]+)$/.exec(rel);
    if (match === null) return undefined;
    path = `${match[1]}/${decodeURIComponent(match[2])}`;
  }
  const file = normalize(join(ASSETS, path));
  if (!file.startsWith(ASSETS.endsWith(sep) ? ASSETS : ASSETS + sep)) return undefined;
  return file;
}

/** Parse a single `bytes=` range against a file size; undefined means "serve whole file". */
function parseRange(header, size) {
  if (typeof header !== 'string') return undefined;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (match === null) return undefined;
  const hasStart = match[1] !== '';
  const hasEnd = match[2] !== '';
  let start;
  let end;
  if (hasStart) {
    start = Number(match[1]);
    end = hasEnd ? Number(match[2]) : size - 1;
  } else if (hasEnd) {
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else return undefined;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return undefined;
  return { start, end: Math.min(end, size - 1) };
}

async function handle(req, res, log) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('allow', 'GET, HEAD');
    res.end('method not allowed');
    return;
  }
  let pathname;
  try {
    pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  } catch {
    res.statusCode = 400;
    res.end('bad request');
    return;
  }
  const file = resolveAsset(pathname);
  if (file === undefined) {
    res.statusCode = 404;
    res.end('not found');
    return;
  }
  let info;
  try {
    info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
  } catch {
    res.statusCode = 404;
    res.end('not found');
    return;
  }
  res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream');
  res.setHeader('cache-control', 'public, max-age=86400');
  res.setHeader('accept-ranges', 'bytes');

  const range = parseRange(req.headers.range, info.size);
  if (range !== undefined) {
    res.statusCode = 206;
    res.setHeader('content-range', `bytes ${range.start}-${range.end}/${info.size}`);
    res.setHeader('content-length', String(range.end - range.start + 1));
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(file, { start: range.start, end: range.end })
      .on('error', (error) => {
        log.warn?.(`[dsh-lulu-pet] stream failed: ${String(error?.message ?? error)}`);
        res.destroy();
      })
      .pipe(res);
    return;
  }

  res.statusCode = 200;
  res.setHeader('content-length', String(info.size));
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(file)
    .on('error', (error) => {
      log.warn?.(`[dsh-lulu-pet] stream failed: ${String(error?.message ?? error)}`);
      res.destroy();
    })
    .pipe(res);
}

export function apply(ctx) {
  const log = ctx.logger ?? console;
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'prefix',
        path: ROUTE,
        handler: (req, res) => {
          handle(req, res, log).catch((error) => {
            log.warn?.(`[dsh-lulu-pet] route failed: ${String(error?.message ?? error)}`);
            if (!res.headersSent) res.statusCode = 500;
            if (!res.writableEnded) res.end('internal error');
          });
        },
      }),
    'dsh-lulu-pet: pet assets',
  );
  log.info?.('[dsh-lulu-pet] pet assets mounted at ' + ROUTE);
}
