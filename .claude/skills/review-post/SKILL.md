---
name: review-post
description: Review a blog post draft for frontmatter conventions, broken links, structure and language quality, then build the site to confirm it renders. Use when the user asks to review, proofread, or check a post before publishing.
---

# Review post

Input: the post to review (filename or slug in `source/_posts/`).

1. Run `npm run check` (validates every post's frontmatter, builds, checks internal links). Report its errors first — they block deploy.
2. Read the post and check:
   - `excerpt` is one sentence that says what the reader gets, under ~200 characters (it becomes the meta description).
   - `title` is specific; categories/tags reuse existing terms where possible.
   - Headings form a sensible outline (`##` sections, no skipped levels).
   - Every code block has a language (```` ```bash ````, ```` ```kotlin ````); commands are copy-pasteable.
   - Images exist under `source/images/` and have alt text.
   - Links to other posts use `{% post_link %}`; external links are https.
   - If `translations` is set, the counterpart covers the same sections — flag drift between the versions.
3. Proofread the prose for clarity, typos and grammar in the post's language.
4. Report findings grouped as **Must fix** / **Should fix** / **Nits**, each with a line reference. Do not edit the post unless the user asks.
