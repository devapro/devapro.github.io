hexo.extend.generator.register('lang-category', function(locals) {
  const config = this.config;
  const perPage = config.category_generator && config.category_generator.per_page || config.per_page || 10;
  const paginationDir = config.pagination_dir || 'page';
  const categoryDir = config.category_dir || 'categories';
  const languages = config.language || ['en'];

  const langArray = Array.isArray(languages) ? languages : [languages];

  const routes = [];

  // Generate category pages for each language
  langArray.forEach(lang => {
    const langPrefix = lang === 'en' ? '' : `${lang}/`;

    locals.categories.forEach(category => {
      // Filter posts by language
      const posts = category.posts.sort('-date').filter(post => {
        return post.lang === lang;
      });

      if (posts.length === 0) return;

      const totalPages = Math.ceil(posts.length / perPage);

      for (let i = 1; i <= totalPages; i++) {
        const start = (i - 1) * perPage;
        const pagePosts = posts.skip(start).limit(perPage);

        let path;
        if (i === 1) {
          path = `${langPrefix}${categoryDir}/${category.slug}/index.html`;
        } else {
          path = `${langPrefix}${categoryDir}/${category.slug}/${paginationDir}/${i}/index.html`;
        }

        routes.push({
          path: path,
          data: {
            lang: lang,
            base: `${langPrefix}${categoryDir}/${category.slug}/`,
            total: totalPages,
            current: i,
            category: category.name,
            posts: pagePosts,
            prev: i > 1 ? i - 1 : 0,
            prev_link: i > 1 ? (i === 2 ? `${langPrefix}${categoryDir}/${category.slug}/` : `${langPrefix}${categoryDir}/${category.slug}/${paginationDir}/${i - 1}/`) : '',
            next: i < totalPages ? i + 1 : 0,
            next_link: i < totalPages ? `${langPrefix}${categoryDir}/${category.slug}/${paginationDir}/${i + 1}/` : ''
          },
          layout: ['category', 'archive', 'index']
        });
      }
    });
  });

  return routes;
});
