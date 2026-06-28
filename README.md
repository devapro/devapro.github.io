# A Developer's Journey

Source for the personal blog at **https://devapro.github.io** — a [Hexo](https://hexo.io/) static site
covering Android development, algorithms, Linux, and self-hosting. Posts are bilingual (English / Russian)
and deployed to GitHub Pages automatically on every push to `main`.

## Stack

- **Generator:** Hexo 8
- **Theme:** `light` (custom, in [`themes/light/`](themes/light/)) — EJS templates + Stylus
- **i18n:** `hexo-generator-i18n` with custom per-language generators in [`scripts/`](scripts/)
- **SEO:** `hexo-generator-sitemap` (sitemap.xml) and `hexo-generator-feed` (atom.xml)
- **Package manager:** npm (single lockfile: `package-lock.json`)

## Local development

```bash
npm ci              # install exact, locked dependencies
npm run server      # serve at http://localhost:4000
npm run clean       # remove db.json + public/ when output looks stale
npm run build       # generate static files into public/
```

## Writing a post

```bash
hexo new "My New Post"   # creates source/_posts/My-New-Post.md
```

Required / supported frontmatter:

```yaml
---
title: Human-readable title
lang: en                 # en | ru — drives the i18n permalink (:lang/:year/...)
date: 2025-01-01 12:00:00
categories:
  - Linux                # Title-cased; shown in the sidebar category widget
tags:
  - linux                # lowercase, kept consistent across posts
translations:            # link a post to its counterpart in the other language
  ru: my-new-post-ru     # value is the other post's filename slug (no extension)
excerpt:
  - Short summary used on index/archive listings
---
```

Conventions worth keeping consistent:

- **Tags lowercase, categories Title-cased** — Hexo treats `Linux` and `linux` as different terms.
- **Always pair translations both ways** (`en:` on the RU post, `ru:` on the EN post) so the
  language switcher links them.
- Permalinks are `:lang/:year/:month/:day/:title/` — changing a title or date changes the URL.

## Custom i18n generators

The default Hexo index/archive/category/tag generators are disabled in [`_config.yml`](_config.yml) in favor
of the language-aware versions in [`scripts/`](scripts/):

- `lang-generator.js` — per-language index pages
- `lang-archive.js` — per-language archives
- `lang-category.js` — per-language category pages
- `lang-tag.js` — per-language tag pages

## Deployment

Pushing to `main` triggers [`.github/workflows/pages.yml`](.github/workflows/pages.yml): it runs
`npm ci`, `npm run build`, and publishes `public/` to GitHub Pages. No manual `hexo deploy` is needed.
