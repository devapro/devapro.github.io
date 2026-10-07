'use strict';

// Language-aware template helpers used by the light theme.

const { languagesOf, langPrefix, findTranslation, excerptText } = require('./lib/i18n');

// Absolute URL of a site path, without the trailing "index.html" Hexo keeps in page.path.
function absoluteUrl(ctx, path) {
  return ctx.full_url_for(path).replace(/index\.html$/, '');
}

// Like url_for, but prefixes non-default languages ("archives" -> "/ru/archives").
// Paths that already start with a language segment (post paths like "ru/2026/...") are left alone.
hexo.extend.helper.register('url_for_lang', function(path, lang) {
  const url = this.url_for(path);
  if (/^(#|\/\/|[a-z][a-z0-9+.-]*:)/i.test(url)) return url;

  const languages = languagesOf(this.config);
  const root = this.config.root || '/';
  const rel = url.startsWith(root) ? url.slice(root.length) : url.replace(/^\//, '');
  if (languages.includes(rel.split('/')[0])) return url;

  return root + langPrefix(this.config, lang || this.page.lang || languages[0]) + rel;
});

// Configured languages (Hexo appends a 'default' entry to config.language; this drops it).
hexo.extend.helper.register('site_languages', function() {
  return languagesOf(this.config);
});

// Language of the current page, falling back to the default language.
hexo.extend.helper.register('current_lang', function() {
  return this.page.lang || languagesOf(this.config)[0];
});

hexo.extend.helper.register('canonical_url', function() {
  return absoluteUrl(this, this.page.path);
});

// Target for the header language switcher: the translated post when one exists,
// otherwise that language's home page.
hexo.extend.helper.register('lang_switch_url', function(lang) {
  const { page } = this;
  if (page.lang === lang) return this.url_for(page.path).replace(/index\.html$/, '');
  const translation = findTranslation(this.site.posts, page, lang);
  if (translation) return this.url_for(translation.path);
  return this.config.root + langPrefix(this.config, lang);
});

// hreflang alternates for the current page as [{lang, url}], ending with x-default.
// Emitted for posts that have translations and for the language home pages.
hexo.extend.helper.register('lang_alternates', function() {
  const { page } = this;
  const languages = languagesOf(this.config);
  const alternates = [];

  if (page.translations) {
    alternates.push({ lang: page.lang, url: absoluteUrl(this, page.path) });
    languages.forEach(lang => {
      const t = lang !== page.lang && findTranslation(this.site.posts, page, lang);
      if (t) alternates.push({ lang, url: absoluteUrl(this, t.path) });
    });
  } else if (page.lang && page.current === 1 && page.base === langPrefix(this.config, page.lang)) {
    languages.forEach(lang => {
      alternates.push({ lang, url: absoluteUrl(this, langPrefix(this.config, lang)) });
    });
  }

  if (alternates.length < 2) return [];
  const fallback = alternates.find(a => a.lang === languages[0]) || alternates[0];
  alternates.push({ lang: 'x-default', url: fallback.url });
  return alternates;
});

hexo.extend.helper.register('excerpt_text', function(post, length) {
  return excerptText(html => this.strip_html(html), post || this.page, length);
});
