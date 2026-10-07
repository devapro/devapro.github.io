'use strict';

// Per-language listing pages and feeds. These replace Hexo's index/archive/category/tag
// generators and hexo-generator-feed: every listing only shows posts whose `lang` matches,
// and non-default languages live under "<lang>/".

const { escapeHTML, stripHTML } = require('hexo-util');
const { languagesOf, langPrefix, excerptText } = require('./lib/i18n');

// Split `posts` into pages under `base` ("" or "ru/archives/2026/") and return Hexo routes.
// Always emits at least one page so a listing never 404s.
function paginate(config, posts, base, layout, data) {
  const perPage = config.per_page || 10;
  const dir = config.pagination_dir || 'page';
  const total = Math.max(1, Math.ceil(posts.length / perPage));
  const pageUrl = i => (i === 1 ? base : `${base}${dir}/${i}/`);

  const routes = [];
  for (let i = 1; i <= total; i++) {
    routes.push({
      path: `${pageUrl(i)}index.html`,
      layout,
      data: Object.assign({
        base,
        total,
        current: i,
        current_url: pageUrl(i),
        posts: posts.skip((i - 1) * perPage).limit(perPage),
        prev: i > 1 ? i - 1 : 0,
        prev_link: i > 1 ? pageUrl(i - 1) : '',
        next: i < total ? i + 1 : 0,
        next_link: i < total ? pageUrl(i + 1) : ''
      }, data)
    });
  }
  return routes;
}

const pad = n => String(n).padStart(2, '0');

function forEachLang(config, fn) {
  return languagesOf(config).flatMap(lang => fn(lang, langPrefix(config, lang)));
}

function postsIn(query, lang) {
  return query.filter(post => post.lang === lang).sort('-date');
}

hexo.extend.generator.register('lang-index', function(locals) {
  return forEachLang(this.config, (lang, prefix) =>
    paginate(this.config, postsIn(locals.posts, lang), prefix, ['index', 'archive'], { lang }));
});

// Archive root plus one listing per year and per month.
hexo.extend.generator.register('lang-archive', function(locals) {
  const { config } = this;
  const dir = config.archive_dir || 'archives';
  const layout = ['archive', 'index'];

  return forEachLang(config, (lang, prefix) => {
    const posts = postsIn(locals.posts, lang);
    const base = `${prefix}${dir}/`;
    const routes = paginate(config, posts, base, layout, { lang, archive: true });

    const months = new Map();
    posts.forEach(post => {
      const year = post.date.year();
      const month = post.date.month() + 1;
      months.set(`${year}/${pad(month)}`, { year, month });
    });
    const years = new Set([...months.values()].map(m => m.year));

    years.forEach(year => {
      const yearPosts = posts.filter(p => p.date.year() === year);
      routes.push(...paginate(config, yearPosts, `${base}${year}/`, layout, { lang, archive: true, year }));
    });
    months.forEach(({ year, month }, key) => {
      const monthPosts = posts.filter(p => p.date.year() === year && p.date.month() + 1 === month);
      routes.push(...paginate(config, monthPosts, `${base}${key}/`, layout, { lang, archive: true, year, month }));
    });
    return routes;
  });
});

// Category and tag pages; a term only gets a page in languages that have posts for it.
function termGenerator(kind, collection, dirKey, fallbackDir, layout) {
  return function(locals) {
    const { config } = this;
    const dir = config[dirKey] || fallbackDir;
    return forEachLang(config, (lang, prefix) => locals[collection].toArray().flatMap(term => {
      const posts = postsIn(term.posts, lang);
      if (!posts.length) return [];
      return paginate(config, posts, `${prefix}${dir}/${term.slug}/`, layout, { lang, [kind]: term.name });
    }));
  };
}

hexo.extend.generator.register('lang-category',
  termGenerator('category', 'categories', 'category_dir', 'categories', ['category', 'archive', 'index']));
hexo.extend.generator.register('lang-tag',
  termGenerator('tag', 'tags', 'tag_dir', 'tags', ['tag', 'archive', 'index']));

// One Atom feed per language: atom.xml for the default language, <lang>/atom.xml for the rest.
hexo.extend.generator.register('lang-feed', function(locals) {
  const { config } = this;
  const feed = config.feed || {};
  const limit = feed.limit || 20;
  const fileName = feed.path || 'atom.xml';
  const root = config.url.replace(/\/$/, '') + config.root;
  const esc = s => escapeHTML(String(s || ''));

  return forEachLang(config, (lang, prefix) => {
    const posts = postsIn(locals.posts, lang).limit(limit).toArray();
    const updated = posts.length ? posts[0].updated || posts[0].date : new Date();
    const entries = posts.map(post => {
      const categories = post.categories.map(c => `    <category term="${esc(c.name)}" scheme="${root}${esc(c.path)}"/>`);
      const tags = post.tags.map(t => `    <category term="${esc(t.name)}" scheme="${root}${esc(t.path)}"/>`);
      return [
        '  <entry>',
        `    <title>${esc(post.title)}</title>`,
        `    <link href="${esc(post.permalink)}"/>`,
        `    <id>${esc(post.permalink)}</id>`,
        `    <published>${post.date.toISOString()}</published>`,
        `    <updated>${(post.updated || post.date).toISOString()}</updated>`,
        `    <summary type="text">${esc(excerptText(stripHTML, post))}</summary>`,
        feed.content === false ? null : `    <content type="html">${esc(post.content)}</content>`,
        ...categories,
        ...tags,
        '  </entry>'
      ].filter(Boolean).join('\n');
    });

    const xml = [
      '<?xml version="1.0" encoding="utf-8"?>',
      `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${lang}">`,
      `  <title>${esc(config.title)}</title>`,
      config.subtitle ? `  <subtitle>${esc(config.subtitle)}</subtitle>` : null,
      `  <link href="${root}${prefix}${fileName}" rel="self"/>`,
      `  <link href="${root}${prefix}"/>`,
      `  <id>${root}${prefix}</id>`,
      `  <updated>${updated.toISOString()}</updated>`,
      `  <author><name>${esc(config.author)}</name></author>`,
      `  <generator uri="https://hexo.io/">Hexo</generator>`,
      ...entries,
      '</feed>',
      ''
    ].filter(v => v !== null).join('\n');

    return { path: `${prefix}${fileName}`, data: xml };
  });
});
