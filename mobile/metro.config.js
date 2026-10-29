// Learn more https://docs.expo.io/guides/customizing-metro
const http = require('node:http');
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// The app shares plain-TypeScript modules with the website (themes, tones,
// API types) straight from ../src/lib, so there is one source of truth.
config.watchFolders = [path.resolve(__dirname, '../src/lib')];

// Web preview only (`npm run web`): forward /api to the local Next server so
// the browser sees one origin. The Host header is kept, so the server's
// same-origin check still applies. Android builds call EXPO_PUBLIC_API_URL.
const API = process.env.KOTES_DEV_API ?? 'http://localhost:3001';
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    if (!req.url?.startsWith('/api/')) return middleware(req, res, next);
    const target = new URL(req.url, API);
    const upstream = http.request(target, { method: req.method, headers: req.headers }, (r) => {
      res.writeHead(r.statusCode ?? 502, r.headers);
      r.pipe(res);
    });
    upstream.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Start the kotes server on ${API} first.` }));
    });
    req.pipe(upstream);
  },
};

module.exports = config;
