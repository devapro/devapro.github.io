#!/usr/bin/env node
'use strict';

// Checks source/_posts/*.md frontmatter against the blog's conventions (see README).
// Errors fail the run (exit 1); warnings are printed only.
//
//   node tools/validate-posts.js          validate all posts
//   node tools/validate-posts.js --hook   Claude Code PostToolUse hook: reads the hook JSON on
//                                         stdin, runs only when a post was edited, exits 2 on errors

const fs = require('fs');
const path = require('path');
const { parse } = require('hexo-front-matter');

const root = path.resolve(__dirname, '..');
const postsDir = path.join(root, 'source', '_posts');
const config = fs.readFileSync(path.join(root, '_config.yml'), 'utf8');
const languages = ((config.match(/^language:\s*\[([^\]]*)\]/m) || [])[1] || 'en')
  .split(',').map(s => s.trim()).filter(Boolean);

const asList = v => (v == null ? [] : Array.isArray(v) ? v : [v]);

function loadPosts() {
  return fs.readdirSync(postsDir)
    .filter(f => f.endsWith('.md'))
    .map(file => {
      const raw = fs.readFileSync(path.join(postsDir, file), 'utf8');
      return { file, slug: file.replace(/\.md$/, ''), data: parse(raw) };
    });
}

function validate(posts) {
  const bySlug = new Map(posts.map(p => [p.slug, p]));
  const errors = [];
  const warnings = [];

  for (const { file, slug, data } of posts) {
    const err = msg => errors.push(`${file}: ${msg}`);
    const warn = msg => warnings.push(`${file}: ${msg}`);

    if (!data.title) err('missing `title`');
    if (!data.date) err('missing `date` (the URL is built from it)');
    if (!languages.includes(data.lang)) err(`\`lang\` must be one of ${languages.join(', ')} (got ${JSON.stringify(data.lang)})`);

    // Categories may be nested lists (["Android", "Performance"]).
    for (const cat of asList(data.categories).flat()) {
      if (typeof cat !== 'string' || cat[0] !== cat[0].toUpperCase()) err(`category ${JSON.stringify(cat)} must be Title-cased`);
    }
    if (!asList(data.categories).length) warn('no `categories`');

    const tags = asList(data.tags).map(String);
    for (const tag of tags) {
      if (tag !== tag.toLowerCase()) err(`tag "${tag}" must be lowercase`);
    }
    const dupes = tags.filter((t, i) => tags.indexOf(t) !== i);
    if (dupes.length) err(`duplicate tags: ${[...new Set(dupes)].join(', ')}`);

    if (!asList(data.excerpt).length && !/<!-- ?more ?-->/i.test(data._content)) {
      warn('no `excerpt` (index pages will show the full post)');
    }

    for (const [lang, target] of Object.entries(data.translations || {})) {
      if (lang === data.lang) { err(`translations.${lang} points to the post's own language`); continue; }
      const other = bySlug.get(target);
      if (!other) { err(`translations.${lang}: no post "${target}.md"`); continue; }
      if (other.data.lang !== lang) err(`translations.${lang}: "${target}" has lang ${JSON.stringify(other.data.lang)}`);
      const back = other.data.translations && other.data.translations[data.lang];
      if (back !== slug) err(`translations.${lang}: "${target}.md" must link back with translations.${data.lang}: ${slug}`);
    }

    // Post URLs contain the date, so hard-coded links break when a date or title changes.
    const hardcoded = data._content.match(/\]\(\/(?:[a-z]{2}\/)?\d{4}\/\d{2}\/\d{2}\/[^)]*\)/g);
    if (hardcoded) err(`hard-coded post URL(s) ${hardcoded.join(' ')} — use {% post_link <slug> "text" %}`);
  }

  return { errors, warnings };
}

function report({ errors, warnings }, out) {
  warnings.forEach(w => out(`warning: ${w}`));
  errors.forEach(e => out(`error: ${e}`));
  if (!errors.length) out(`Posts OK${warnings.length ? ` (${warnings.length} warnings)` : ''}.`);
}

if (process.argv.includes('--hook')) {
  let input = '';
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', () => {
    let filePath = '';
    try { filePath = JSON.parse(input).tool_input.file_path || ''; } catch { /* not a file edit */ }
    if (!path.resolve(filePath).startsWith(postsDir + path.sep) || !filePath.endsWith('.md')) return;
    const result = validate(loadPosts());
    if (result.errors.length) {
      report({ errors: result.errors, warnings: [] }, msg => console.error(msg));
      process.exit(2);
    }
  });
} else {
  const result = validate(loadPosts());
  report(result, msg => (msg.startsWith('error') ? console.error(msg) : console.log(msg)));
  process.exit(result.errors.length ? 1 : 0);
}
