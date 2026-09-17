import { onRequestGet as getStore } from './functions/api/store.js';
import { onRequestGet as getMedia } from './functions/api/media/[key].js';
import { onRequestPost as adminLogin } from './functions/api/admin/login.js';
import { onRequestPost as adminLogout } from './functions/api/admin/logout.js';
import { onRequestGet as adminMe } from './functions/api/admin/me.js';
import { onRequestPut as adminPassword } from './functions/api/admin/password.js';
import { onRequestPut as adminUsername } from './functions/api/admin/username.js';
import { onRequestPost as adminProductCreate } from './functions/api/admin/product.js';
import { onRequestPut as adminProductUpdate, onRequestDelete as adminProductDelete } from './functions/api/admin/product/[id].js';
import { onRequestPost as adminCategoryCreate } from './functions/api/admin/category.js';
import { onRequestPut as adminCategoryUpdate, onRequestDelete as adminCategoryDelete } from './functions/api/admin/category/[id].js';
import { onRequestPost as adminImport } from './functions/api/admin/import.js';
import { onRequestPost as adminReset } from './functions/api/admin/reset.js';
import { onRequestPost as adminUploadImage } from './functions/api/admin/upload-image.js';
import { bad } from './functions/api/_shared.js';
import { onRequestGet as getReviews, onRequestPost as postReview } from './functions/api/reviews.js';
import { onRequestGet as adminReviews, onRequestPut as adminReviewUpdate, onRequestDelete as adminReviewDelete } from './functions/api/admin/review/index.js';
import { onRequestPut as adminSettings } from './functions/api/admin/settings.js';

function contextFor(request, env, executionCtx, params = {}) {
  return { request, env, params, waitUntil: executionCtx?.waitUntil?.bind(executionCtx), next: executionCtx?.passThroughOnException?.bind(executionCtx) };
}

async function healthHandler(context) {
  return new Response(JSON.stringify({
    ok: true,
    build: 'foxshop-media-edit-v7',
    d1: !!context.env.DB,
    webCrypto: !!globalThis.crypto?.subtle,
    pbkdf2: typeof crypto?.subtle?.deriveBits === 'function',
    pbkdf2Iterations: 100000
  }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function matchApi(url, request) {
  const p = url.pathname;
  const method = request.method.toUpperCase();

  if (p === '/api/health' && method === 'GET') return [healthHandler, {}];
  if (p === '/api/store' && method === 'GET') return [getStore, {}];
  if (p === '/api/reviews' && method === 'GET') return [getReviews, {}];
  if (p === '/api/reviews' && method === 'POST') return [postReview, {}];
  if (p === '/api/admin/reviews' && method === 'GET') return [adminReviews, {}];
  if (p === '/api/admin/settings' && method === 'PUT') return [adminSettings, {}];
  if (p === '/api/admin/login' && method === 'POST') return [adminLogin, {}];
  if (p === '/api/admin/logout' && method === 'POST') return [adminLogout, {}];
  if (p === '/api/admin/me' && method === 'GET') return [adminMe, {}];
  if (p === '/api/admin/password' && method === 'PUT') return [adminPassword, {}];
  if (p === '/api/admin/username' && method === 'PUT') return [adminUsername, {}];
  if (p === '/api/admin/product' && method === 'POST') return [adminProductCreate, {}];
  if (p === '/api/admin/category' && method === 'POST') return [adminCategoryCreate, {}];
  if (p === '/api/admin/import' && method === 'POST') return [adminImport, {}];
  if (p === '/api/admin/reset' && method === 'POST') return [adminReset, {}];
  if (p === '/api/admin/upload-image' && method === 'POST') return [adminUploadImage, {}];

  let m = p.match(/^\/api\/admin\/product\/([^/]+)$/);
  if (m && method === 'PUT') return [adminProductUpdate, { id: decodeURIComponent(m[1]) }];
  if (m && method === 'DELETE') return [adminProductDelete, { id: decodeURIComponent(m[1]) }];

  m = p.match(/^\/api\/admin\/category\/([^/]+)$/);
  if (m && method === 'PUT') return [adminCategoryUpdate, { id: decodeURIComponent(m[1]) }];
  if (m && method === 'DELETE') return [adminCategoryDelete, { id: decodeURIComponent(m[1]) }];

  m = p.match(/^\/api\/admin\/review\/([^/]+)$/);
  if (m && method === 'PUT') return [adminReviewUpdate, { id: decodeURIComponent(m[1]) }];
  if (m && method === 'DELETE') return [adminReviewDelete, { id: decodeURIComponent(m[1]) }];

  m = p.match(/^\/api\/media\/([A-Za-z0-9_-]{20,80})$/);
  if (m && method === 'GET') return [getMedia, { key: decodeURIComponent(m[1]) }];

  return null;
}


function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-frame-options', 'DENY');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('cross-origin-opener-policy', 'same-origin');
  headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
  headers.set('content-security-policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com",
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
    "font-src 'self' https://cdnjs.cloudflare.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self'",
    "media-src 'self' https: data: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; '));
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}

export default {
  async fetch(request, env, executionCtx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: { 'access-control-allow-origin': url.origin, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS' } });
      }

      const route = matchApi(url, request);
      if (!route) return bad('API route not found.', 404);

      try {
        return withSecurityHeaders(await route[0](contextFor(request, env, executionCtx, route[1])));
      } catch (error) {
        console.error('FoxShop API error:', error);
        return bad('خطای داخلی سرور. تنظیمات Cloudflare D1 را بررسی کنید.', 500);
      }
    }

    // Everything else is a static FoxShop file served by Cloudflare Workers Static Assets.
    return withSecurityHeaders(await env.ASSETS.fetch(request));
  }
};
