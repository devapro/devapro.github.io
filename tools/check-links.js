#!/usr/bin/env node
'use strict';

// Verifies that every internal link in the built site (public/) points at a generated file.
// Internal = root-relative ("/ru/archives/"), relative, or absolute on the site's own `url`.
// Usage: node tools/check-links.js   (run after `hexo generate`)

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const siteUrl = (fs.readFileSync(path.join(root, '_config.yml'), 'utf8').match(/^url:\s*(\S+)/m) || [])[1] || '';

if (!fs.existsSync(publicDir)) {
  console.error('public/ not found — run `npm run build` first.');
  process.exit(1);
}

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

// Map a link found in `fromFile` to the file it should resolve to, or null if external.
function targetFile(link, fromFile) {
  let url = link.trim().replace(/&amp;/g, '&');
  if (siteUrl && url.startsWith(siteUrl)) url = url.slice(siteUrl.length) || '/';
  if (!url || /^(#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) return null;
  url = url.split('#')[0].split('?')[0];
  if (!url) return null;
  try { url = decodeURIComponent(url); } catch { /* keep as is */ }
  let file = url.startsWith('/') ? path.join(publicDir, url) : path.resolve(path.dirname(fromFile), url);
  if (url.endsWith('/')) file = path.join(file, 'index.html');
  return file;
}

const broken = new Map();
let checked = 0;
const attr = /\s(?:href|src)="([^"]*)"/g;

for (const file of htmlFiles(publicDir)) {
  const html = fs.readFileSync(file, 'utf8');
  for (const [, link] of html.matchAll(attr)) {
    const target = targetFile(link, file);
    if (!target) continue;
    checked++;
    const ok = fs.existsSync(target) &&
      (fs.statSync(target).isFile() || fs.existsSync(path.join(target, 'index.html')));
    if (!ok) {
      const page = '/' + path.relative(publicDir, file);
      if (!broken.has(link)) broken.set(link, new Set());
      broken.get(link).add(page);
    }
  }
}

if (broken.size) {
  console.error(`Broken internal links: ${broken.size} (of ${checked} checked)\n`);
  for (const [link, pages] of broken) {
    const list = [...pages];
    console.error(`  ${link}\n    on ${list.slice(0, 3).join(', ')}${list.length > 3 ? ` and ${list.length - 3} more` : ''}`);
  }
  process.exit(1);
}
console.log(`Links OK: ${checked} internal links checked.`);
