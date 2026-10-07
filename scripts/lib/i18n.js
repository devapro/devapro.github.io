'use strict';

// Shared, hexo-independent i18n utilities used by scripts/*.js.
// (Hexo also loads this file as a plugin; it only defines exports, so that is harmless.)

// Configured languages; the first one is the default and gets no URL prefix.
function languagesOf(config) {
  const langs = Array.isArray(config.language) ? config.language : [config.language || 'en'];
  return langs.filter(l => l && l !== 'default');
}

// URL prefix for a language: '' for the default, 'ru/' for the others.
function langPrefix(config, lang) {
  return lang === languagesOf(config)[0] ? '' : `${lang}/`;
}

// The post that `post.translations[lang]` points to (matched by filename slug), or null.
function findTranslation(posts, post, lang) {
  const slug = post && post.translations && post.translations[lang];
  if (!slug) return null;
  return posts.findOne({ slug, lang }) || null;
}

// Plain-text summary of a post: frontmatter `excerpt:` (string or list), else the
// <!-- more --> excerpt, else the start of the content.
function excerptText(stripHtml, post, length) {
  let text = post.excerpt;
  if (Array.isArray(text)) text = text.join(' ');
  if (!text) text = post.content || '';
  text = stripHtml(String(text)).replace(/\s+/g, ' ').trim();
  return length && text.length > length ? text.slice(0, length - 1).trimEnd() + '…' : text;
}

module.exports = { languagesOf, langPrefix, findTranslation, excerptText };
