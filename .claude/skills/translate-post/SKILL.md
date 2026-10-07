---
name: translate-post
description: Translate an existing blog post between English and Russian and link the two versions. Use when the user asks to translate a post, add the RU/EN version, or make a post bilingual.
---

# Translate post

Input: the source post (filename or slug in `source/_posts/`).

1. Read the source post. If its `translations` already points at an existing file, update that file instead of creating a new one.
2. Target filename: EN → RU is `<slug>-ru.md`; RU → EN drops the `-ru` suffix (if the RU slug has none, choose a lowercase-hyphenated English slug).
3. Frontmatter of the new post: translated `title` and `excerpt`; `lang` set to the target language; the same `date`, `categories` and `tags` (terms are shared across languages — do not translate them); `translations` pointing back at the source slug.
4. Add the reverse link to the source post's `translations`.
5. Body:
   - Translate prose naturally for a technical reader; keep the author's tone and first-person voice.
   - Keep code blocks, commands, file paths, identifiers, and URLs byte-for-byte. Translate code comments only when they are explanatory prose.
   - Keep headings at the same levels and in the same order.
   - In `{% post_link <slug> "text" %}`, point at the target-language counterpart when one exists (check its `translations`), and translate the link text.
   - Keep `<!-- more -->` where it is, if present.
6. Run `npm run check` and fix anything it reports.
