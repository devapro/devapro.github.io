# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Hexo 8 static blog (https://devapro.github.io), bilingual English/Russian. There is no unit test suite — `npm run check` is the check.

## Commands

```bash
npm ci                  # install locked deps (npm only; package-lock.json is the lockfile)
npm run server          # dev server at http://localhost:4000
npm run build           # hexo generate → public/
npm run clean           # delete db.json + public/ — do this when output looks stale (after editing scripts/ or the theme)
npm run validate        # frontmatter/convention check for all posts (tools/validate-posts.js)
npm run check-links     # verify every internal link in public/ resolves (run after build)
npm run check           # validate + clean build + check-links — same as CI
npx hexo new "Title"    # new post from scaffolds/post.md
```

CI (`.github/workflows/pages.yml`, Node 24) runs validate → build → check-links on PRs and pushes; pushes to `main` deploy `public/` to GitHub Pages. `hexo deploy` is not used.

Project skills in `.claude/skills/`: `/new-post`, `/translate-post`, `/review-post`. A PostToolUse hook runs `tools/validate-posts.js --hook` after edits to `source/_posts/*.md` and blocks on errors.

## Architecture: i18n

There is no i18n plugin and none of Hexo's index/archive/category/tag/feed generator packages — all language handling is in `scripts/` (Hexo auto-loads every `.js` there, recursively):

- **`_config.yml`**: `language: [en, ru]` (first = default, served without prefix) and `permalink: :lang/:year/:month/:day/:title/`, so post paths start with their language (`en/2026/...`, `ru/2026/...`). Hexo appends `'default'` to `config.language` at runtime — use the `site_languages()` / `current_lang()` helpers in templates, not `config.language` directly.
- **`scripts/lang-generators.js`**: per-language index, archive (root/year/month), category, tag pages and Atom feeds (`atom.xml`, `ru/atom.xml`). All listing routes go through one `paginate()` function. A category/tag page only exists in languages that have posts for it.
- **`scripts/i18n-helpers.js`**: template helpers — `url_for_lang` (adds `/ru/` prefix unless the path already has a language), `lang_switch_url` (header switcher → translated post or language home), `lang_alternates` (hreflang), `canonical_url`, `excerpt_text`.
- **`scripts/lib/i18n.js`**: shared pure functions. Scripts can't `require` each other (they reference the injected `hexo` global), so shared code must live in a module that doesn't touch `hexo`.
- **`themes/light/`** (custom EJS + Stylus): widgets filter by `current_lang()`; links to categories/tags must use `url_for_lang(term.path, item.lang)` because terms are per-language URLs. UI strings in `themes/light/languages/{en,ru}.yml`.

## Writing posts

Rules enforced by `npm run validate` (see README for a full frontmatter example):

- `lang: en | ru` required; drives the URL and which listings include the post.
- `translations: { ru: <slug> }` / `{ en: <slug> }` — counterpart's filename without `.md`, must link both ways. RU counterparts are named `<en-slug>-ru.md`.
- `categories` Title-cased, `tags` lowercase.
- Link other posts with `{% post_link <slug> "text" %}`. Never hard-code `/en/YYYY/MM/DD/...` — URLs embed the date. (A Hexo tag inside a Markdown link URL, like `[x]({% post_path ... %})`, gets mangled by the renderer.)
- `excerpt:` (a one-item list) is shown on listings and becomes the meta/OG description.
- `updated_option` is `date`; set `updated:` in frontmatter for a real revision.

Images go in `source/images/<topic>/`.

## Theme assets

When changing `themes/light/source/css/**`, bump `version` in `themes/light/_config.yml` — it is the `?v=` cache-buster on `style.css`. Optional `cover` (default og:image), `twitter.username`, and `google_analytics` (GA4 ID) are also set there.
