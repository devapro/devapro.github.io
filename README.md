# A Developer's Journey

Source for the personal blog at **https://devapro.github.io** — a [Hexo](https://hexo.io/) static site
covering Android development, algorithms, Linux, and self-hosting. Posts are bilingual (English / Russian)
and deployed to GitHub Pages automatically on every push to `main`.

## Stack

- **Generator:** Hexo 8
- **Theme:** `light` (custom, in [`themes/light/`](themes/light/)) — EJS templates + Stylus
- **i18n:** custom per-language generators and helpers in [`scripts/`](scripts/)
- **SEO:** `hexo-generator-sitemap` (sitemap.xml), per-language Atom feeds (`atom.xml`, `ru/atom.xml`),
  canonical / hreflang / Open Graph tags in the theme
- **Package manager:** npm (single lockfile: `package-lock.json`), Node >= 20.19

## Local development

```bash
npm ci              # install exact, locked dependencies
npm run server      # serve at http://localhost:4000
npm run clean       # remove db.json + public/ when output looks stale
npm run build       # generate static files into public/
npm run check       # validate posts + clean build + check internal links (what CI runs)
```

## Writing a post

```bash
npx hexo new "My New Post"   # creates source/_posts/My-New-Post.md from scaffolds/post.md
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
- **Link to other posts with `{% post_link <slug> "text" %}`**, not a hard-coded `/en/2026/...` URL,
  so links survive date or title changes.
- Set `updated:` when a post gets a real revision; otherwise `date` is used for feeds and the sitemap.

`npm run validate` ([`tools/validate-posts.js`](tools/validate-posts.js)) enforces these rules and runs in CI.

## i18n internals

Hexo's built-in index/archive/category/tag/feed generators are not installed; everything is
language-aware and lives in [`scripts/`](scripts/):

- `lang-generators.js` — per-language index, archives (by year/month), category and tag pages, and Atom
  feeds. English is served from `/`, Russian from `/ru/`.
- `i18n-helpers.js` — template helpers: `url_for_lang`, `lang_switch_url` (switcher goes to the
  translated post when there is one), `lang_alternates` (hreflang), `canonical_url`, `excerpt_text`.
- `lib/i18n.js` — shared utilities for both.

## Deployment

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) validates posts, builds, and checks internal
links on every pull request and push. Pushes to `main` then publish `public/` to GitHub Pages.

## Claude Code

[`.claude/`](.claude/) has project skills — `/new-post`, `/translate-post`, `/review-post` — and a hook that
runs the post validator whenever Claude edits a file in `source/_posts/`.
