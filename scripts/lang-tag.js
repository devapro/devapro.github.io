hexo.extend.generator.register('lang-tag', function(locals) {
  const config = this.config;
  const perPage = config.tag_generator && config.tag_generator.per_page || config.per_page || 10;
  const paginationDir = config.pagination_dir || 'page';
  const tagDir = config.tag_dir || 'tags';
  const languages = config.language || ['en'];

  const langArray = Array.isArray(languages) ? languages : [languages];

  const routes = [];

  // Generate tag pages for each language
  langArray.forEach(lang => {
    const langPrefix = lang === 'en' ? '' : `${lang}/`;

    locals.tags.forEach(tag => {
      // Filter posts by language
      const posts = tag.posts.sort('-date').filter(post => {
        return post.lang === lang;
      });

      if (posts.length === 0) return;

      const totalPages = Math.ceil(posts.length / perPage);

      for (let i = 1; i <= totalPages; i++) {
        const start = (i - 1) * perPage;
        const pagePosts = posts.skip(start).limit(perPage);

        let path;
        if (i === 1) {
          path = `${langPrefix}${tagDir}/${tag.slug}/index.html`;
        } else {
          path = `${langPrefix}${tagDir}/${tag.slug}/${paginationDir}/${i}/index.html`;
        }

        routes.push({
          path: path,
          data: {
            lang: lang,
            base: `${langPrefix}${tagDir}/${tag.slug}/`,
            total: totalPages,
            current: i,
            tag: tag.name,
            posts: pagePosts,
            prev: i > 1 ? i - 1 : 0,
            prev_link: i > 1 ? (i === 2 ? `${langPrefix}${tagDir}/${tag.slug}/` : `${langPrefix}${tagDir}/${tag.slug}/${paginationDir}/${i - 1}/`) : '',
            next: i < totalPages ? i + 1 : 0,
            next_link: i < totalPages ? `${langPrefix}${tagDir}/${tag.slug}/${paginationDir}/${i + 1}/` : ''
          },
          layout: ['tag', 'archive', 'index']
        });
      }
    });
  });

  return routes;
});
