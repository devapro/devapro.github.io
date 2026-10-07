---
name: new-post
description: Create a new blog post in source/_posts with complete frontmatter, optionally as an EN/RU pair linked via translations. Use when the user wants to start, draft, or add a new article.
---

# New post

1. Get from the user (ask only for what's missing): title, language (`en`/`ru`), whether a counterpart in the other language should exist, category, a few tags, and a one-line summary.
2. Pick the slug: lowercase-hyphenated English words from the title (e.g. `docker-on-raspberry-pi`). The Russian counterpart is `<slug>-ru`. Check `source/_posts/` so the slug is not taken.
3. Reuse existing terms before inventing new ones — list them with:
   `grep -h -A8 '^\(categories\|tags\):' source/_posts/*.md | grep '^  - ' | sort | uniq -c | sort -rn`
4. Write `source/_posts/<slug>.md`:

   ```yaml
   ---
   title: <Title>
   lang: en
   date: <YYYY-MM-DD HH:mm:ss, now, Europe/Belgrade>
   categories:
     - <Title-cased>
   tags:
     - <lowercase>
   translations:
     ru: <slug>-ru
   excerpt:
     - <one-line summary>
   ---
   ```

   Omit `translations` when there is no counterpart. Both files of a pair get the same `date`, `categories` and `tags`, and each points at the other (`ru:` on the EN post, `en:` on the RU post).
5. Body: start with a short intro paragraph, use `##` sections. Link other posts with `{% post_link <slug> "text" %}`, never a hard-coded `/en/2026/...` URL. Images go in `source/images/<topic>/` and are referenced as `/images/<topic>/<file>`.
6. Run `npm run check` and fix anything it reports.
