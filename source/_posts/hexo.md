---
title: Hexo Static Site Generator - Commands and Themes
date: 2020-03-01 01:11:31
lang: en
categories:
- cms
tags:
- cms
- hexo
- markdown
- web
- themes
excerpt:
- Complete Hexo guide covering essential commands, workflow, and recommended themes
---

Hexo is a fast, simple and powerful blog framework powered by Node.js. This guide covers the essential commands and workflow, plus a curated list of excellent themes to get you started.

## Quick Start

### Create a New Post

```bash
hexo new "My New Post"

# Or with a specific layout
hexo new post "My New Post"
hexo new draft "Work in Progress"
hexo new page "About Me"
```

Creates a new markdown file in `source/_posts/` with frontmatter template.

**More info:** [Writing](https://hexo.io/docs/writing.html)

### Run Development Server

```bash
hexo server

# Or short form
hexo s

# With custom port
hexo server -p 5000

# Open in browser automatically
hexo server -o
```

Starts local server at `http://localhost:4000` for previewing your site.

**More info:** [Server](https://hexo.io/docs/server.html)

### Generate Static Files

```bash
hexo generate

# Or short form
hexo g

# With file watching for auto-regeneration
hexo generate --watch
```

Generates static HTML files in the `public/` directory.

**More info:** [Generating](https://hexo.io/docs/generating.html)

### Deploy to Remote Sites

```bash
hexo deploy

# Or short form
hexo d

# Generate and deploy in one command
hexo generate --deploy
# or
hexo g -d
```

Deploys your site to configured hosting (GitHub Pages, Netlify, etc.).

**More info:** [Deployment](https://hexo.io/docs/one-command-deployment.html)

## Common Workflow

### Clean and Regenerate

```bash
# Clean cached files and generated static files
hexo clean

# Then regenerate
hexo generate
```

Use this when you change config or encounter rendering issues.

### Development Workflow

```bash
# Start with clean slate
hexo clean

# Generate and start server with watch mode
hexo generate --watch & hexo server

# Or use concurrently
hexo server --draft  # Include draft posts in preview
```

### Deployment Workflow

```bash
# Test locally first
hexo clean && hexo generate && hexo server

# Then deploy
hexo deploy

# Or combined
hexo clean && hexo generate --deploy
```

## Writing Content

### Markdown Syntax

Hexo uses Markdown for content. Quick reference:

```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*
~~Strikethrough~~

- Unordered list
- Another item

1. Ordered list
2. Another item

[Link text](https://example.com)
![Image alt text](/images/photo.jpg)

`inline code`

\```javascript
// Code block
console.log('Hello World');
\```

> Blockquote
```

**Complete guide:** [Markdown Syntax](https://www.markdownguide.org/basic-syntax/)

### Post Frontmatter

```yaml
---
title: My Post Title
date: 2025-12-29 10:00:00
updated: 2025-12-29 15:30:00
tags:
  - tutorial
  - hexo
categories:
  - Web Development
excerpt: Brief description for preview
---
```

### Tags and Categories

```bash
# Create a new post with tags
hexo new "My Post" --tag tutorial,hexo,web

# Tags in frontmatter (multiple ways)
tags: tutorial
# or
tags: [tutorial, hexo, web]
# or
tags:
  - tutorial
  - hexo
  - web
```

## Configuration Tips

### _config.yml Essentials

```yaml
# Site
title: Your Blog Name
subtitle: Your Subtitle
description: SEO description
author: Your Name
language: en
timezone: America/New_York

# URL
url: https://yourdomain.com
permalink: :year/:month/:day/:title/

# Writing
new_post_name: :title.md
default_layout: post
auto_spacing: true
titlecase: true

# Server
port: 4000
```

### Theme Configuration

Each theme has its own `_config.yml` in `themes/theme-name/` directory. Common settings:

```yaml
# Navigation menu
menu:
  Home: /
  Archives: /archives
  About: /about

# Sidebar widgets
widgets:
  - category
  - tag
  - archive
  - recent_posts

# Social links
social:
  GitHub: https://github.com/username
  Twitter: https://twitter.com/username
```

## Recommended Hexo Themes

### Production-Ready Themes

#### Cactus - Minimalist Blog Theme
- **Demo:** [https://probberechts.github.io/hexo-theme-cactus/](https://probberechts.github.io/hexo-theme-cactus/)
- **GitHub:** [https://github.com/probberechts/hexo-theme-cactus](https://github.com/probberechts/hexo-theme-cactus)
- **Features:** Clean design, responsive, dark mode, analytics support
- **Best for:** Personal blogs, developers, writers

#### Obsidian - Modern & Feature-Rich
- **Demo:** [https://tridiamond.me/](https://tridiamond.me/)
- **GitHub:** [https://github.com/TriDiamond/hexo-theme-obsidian](https://github.com/TriDiamond/hexo-theme-obsidian)
- **Features:** Modern UI, search, comments, multiple layouts
- **Best for:** Tech blogs, portfolios, documentation

#### Meadow - Elegant & Simple
- **Demo:** [https://garybear.cn/](https://garybear.cn/)
- **GitHub:** [https://github.com/kb1000fx/hexo-theme-meadow](https://github.com/kb1000fx/hexo-theme-meadow)
- **Features:** Beautiful typography, smooth animations, mobile-first
- **Best for:** Photography blogs, creative portfolios

#### 3-Hexo - Advanced Features
- **Demo:** [https://yelog.org/](https://yelog.org/)
- **GitHub:** [https://github.com/yelog/hexo-theme-3-hexo](https://github.com/yelog/hexo-theme-3-hexo)
- **Features:** Complex catalog, advanced navigation, rich widgets
- **Best for:** Technical documentation, knowledge bases, large blogs

### Installing a Theme

```bash
# Clone theme into themes directory
cd your-hexo-site
git clone https://github.com/probberechts/hexo-theme-cactus themes/cactus

# Install theme dependencies (if any)
cd themes/cactus
npm install

# Update _config.yml
theme: cactus

# Regenerate site
hexo clean && hexo generate && hexo server
```

### Popular Theme Collections

- **Official Themes:** [https://hexo.io/themes/](https://hexo.io/themes/)
- **GitHub Topics:** [hexo-theme](https://github.com/topics/hexo-theme)
- **Awesome Hexo:** [Collection of plugins and themes](https://github.com/hexojs/awesome-hexo)

### Choosing a Theme

Consider these factors:

1. **Design Style**
   - Minimalist vs. feature-rich
   - Light vs. dark vs. both
   - Typography preferences

2. **Features Needed**
   - Comments (Disqus, Gitalk, etc.)
   - Search functionality
   - Analytics integration
   - Social sharing buttons
   - Code syntax highlighting

3. **Performance**
   - Page load speed
   - Mobile responsiveness
   - SEO optimization

4. **Maintenance**
   - Last updated date
   - Active development
   - Community support
   - Documentation quality

5. **Customization**
   - Easy color changes
   - Layout options
   - Widget flexibility

## Essential Plugins

Extend Hexo functionality with plugins:

```bash
# SEO
npm install hexo-seo --save

# Sitemap generation
npm install hexo-generator-sitemap --save

# RSS feed
npm install hexo-generator-feed --save

# Search
npm install hexo-generator-search --save

# Image optimization
npm install hexo-image-sizes --save

# Related posts
npm install hexo-related-posts --save
```

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 4000
lsof -ti:4000 | xargs kill -9

# Or use different port
hexo server -p 5000
```

### Changes Not Showing

```bash
# Clear cache and regenerate
hexo clean && hexo generate

# Check if files are generated
ls public/

# Restart server
hexo server
```

### Theme Not Loading

```bash
# Verify theme directory
ls themes/

# Check theme name in _config.yml
grep "^theme:" _config.yml

# Install theme dependencies
cd themes/your-theme && npm install
```

### Deployment Issues

```bash
# Clean before deploying
hexo clean

# Generate fresh files
hexo generate

# Deploy
hexo deploy

# Check deployment config in _config.yml
```

## Quick Reference

```bash
# Installation
npm install -g hexo-cli
hexo init my-blog
cd my-blog
npm install

# Create content
hexo new "Post Title"
hexo new page "about"
hexo new draft "Draft Title"

# Development
hexo server                 # Start server
hexo server --draft        # Include drafts
hexo server -p 5000        # Custom port

# Generation
hexo generate              # Generate files
hexo generate --watch      # Auto-regenerate on changes
hexo clean                 # Clean cache

# Deployment
hexo deploy                # Deploy
hexo generate --deploy     # Generate & deploy

# Combined commands
hexo clean && hexo generate && hexo deploy
hexo g -d                  # Short form of above

# Help
hexo help                  # Show all commands
hexo help generate         # Help for specific command
hexo version              # Show version
```

## Useful Links

- **Official Documentation:** [https://hexo.io/docs/](https://hexo.io/docs/)
- **API Documentation:** [https://hexo.io/api/](https://hexo.io/api/)
- **Plugin List:** [https://hexo.io/plugins/](https://hexo.io/plugins/)
- **Theme List:** [https://hexo.io/themes/](https://hexo.io/themes/)
- **GitHub:** [https://github.com/hexojs/hexo](https://github.com/hexojs/hexo)
- **Community:** [https://discuss.hexo.io/](https://discuss.hexo.io/)

## Conclusion

Hexo provides a powerful yet simple platform for creating static websites. Key points:

- Use `hexo clean` when you encounter issues
- Test locally with `hexo server` before deploying
- Choose a theme that fits your needs and style
- Keep your Hexo and plugins updated
- Leverage Markdown for easy content creation
- Deploy frequently to keep your site fresh

Start with the basic commands, pick a nice theme, and customize as you go. Hexo's flexibility allows you to grow from a simple blog to a complex website as your needs evolve.
