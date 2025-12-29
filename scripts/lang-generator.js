hexo.extend.generator.register('lang-index', function(locals) {
  const config = this.config;
  const perPage = config.per_page || 10;
  const paginationDir = config.pagination_dir || 'page';
  const languages = config.language || ['en'];

  // Ensure languages is an array
  const langArray = Array.isArray(languages) ? languages : [languages];

  const routes = [];

  // Generate index for each language
  langArray.forEach(lang => {
    // Filter posts by language
    const posts = locals.posts.sort('-date').filter(post => {
      return post.lang === lang;
    });

    const totalPosts = posts.length;
    const totalPages = Math.ceil(totalPosts / perPage);

    // Determine base path for this language
    const basePath = lang === 'en' ? '' : `${lang}/`;

    // Generate pages for this language
    for (let i = 1; i <= totalPages; i++) {
      let path;
      if (i === 1) {
        path = basePath + 'index.html';
      } else {
        path = `${basePath}${paginationDir}/${i}/index.html`;
      }

      const start = (i - 1) * perPage;
      const end = i * perPage;

      // Use limit and skip to get paginated posts while keeping it as a Query object
      const pagePosts = posts.skip(start).limit(perPage);

      routes.push({
        path: path,
        data: {
          lang: lang,
          base: basePath,
          total: totalPages,
          current: i,
          current_url: path.replace(/index\.html$/, ''),
          posts: pagePosts,
          prev: i > 1 ? i - 1 : 0,
          prev_link: i > 1 ? (i === 2 ? basePath : `${basePath}${paginationDir}/${i - 1}/`) : '',
          next: i < totalPages ? i + 1 : 0,
          next_link: i < totalPages ? `${basePath}${paginationDir}/${i + 1}/` : ''
        },
        layout: ['index', 'archive']
      });
    }
  });

  return routes;
});
