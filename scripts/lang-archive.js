hexo.extend.generator.register('lang-archive', function(locals) {
  const config = this.config;
  const perPage = config.archive_generator && config.archive_generator.per_page || config.per_page || 10;
  const paginationDir = config.pagination_dir || 'page';
  const archiveDir = config.archive_dir || 'archives';
  const languages = config.language || ['en'];

  const langArray = Array.isArray(languages) ? languages : [languages];

  const routes = [];

  // Generate archives for each language
  langArray.forEach(lang => {
    // Filter posts by language
    const posts = locals.posts.sort('-date').filter(post => {
      return post.lang === lang;
    });

    const totalPosts = posts.length;
    const totalPages = Math.ceil(totalPosts / perPage);

    // Determine base path for this language
    const langPrefix = lang === 'en' ? '' : `${lang}/`;

    // Generate main archive pages
    for (let i = 1; i <= totalPages; i++) {
      const start = (i - 1) * perPage;
      const pagePosts = posts.skip(start).limit(perPage);

      let path;
      if (i === 1) {
        path = `${langPrefix}${archiveDir}/index.html`;
      } else {
        path = `${langPrefix}${archiveDir}/${paginationDir}/${i}/index.html`;
      }

      routes.push({
        path: path,
        data: {
          lang: lang,
          base: `${langPrefix}${archiveDir}/`,
          total: totalPages,
          current: i,
          archive: true,
          posts: pagePosts,
          prev: i > 1 ? i - 1 : 0,
          prev_link: i > 1 ? (i === 2 ? `${langPrefix}${archiveDir}/` : `${langPrefix}${archiveDir}/${paginationDir}/${i - 1}/`) : '',
          next: i < totalPages ? i + 1 : 0,
          next_link: i < totalPages ? `${langPrefix}${archiveDir}/${paginationDir}/${i + 1}/` : ''
        },
        layout: ['archive', 'index']
      });
    }

    // Generate yearly archives
    const yearMap = {};
    posts.forEach(post => {
      const year = post.date.year();
      if (!yearMap[year]) {
        yearMap[year] = [];
      }
      yearMap[year].push(post);
    });

    Object.keys(yearMap).forEach(year => {
      const yearPosts = yearMap[year];
      const yearTotalPages = Math.ceil(yearPosts.length / perPage);

      // Convert array to query-like object
      const yearPostsQuery = locals.posts.filter(post => {
        return post.lang === lang && post.date.year() === parseInt(year);
      }).sort('-date');

      for (let i = 1; i <= yearTotalPages; i++) {
        const start = (i - 1) * perPage;
        const pagePosts = yearPostsQuery.skip(start).limit(perPage);

        let path;
        if (i === 1) {
          path = `${langPrefix}${archiveDir}/${year}/index.html`;
        } else {
          path = `${langPrefix}${archiveDir}/${year}/${paginationDir}/${i}/index.html`;
        }

        routes.push({
          path: path,
          data: {
            lang: lang,
            base: `${langPrefix}${archiveDir}/${year}/`,
            total: yearTotalPages,
            current: i,
            archive: true,
            year: parseInt(year),
            posts: pagePosts,
            prev: i > 1 ? i - 1 : 0,
            prev_link: i > 1 ? (i === 2 ? `${langPrefix}${archiveDir}/${year}/` : `${langPrefix}${archiveDir}/${year}/${paginationDir}/${i - 1}/`) : '',
            next: i < yearTotalPages ? i + 1 : 0,
            next_link: i < yearTotalPages ? `${langPrefix}${archiveDir}/${year}/${paginationDir}/${i + 1}/` : ''
          },
          layout: ['archive', 'index']
        });
      }

      // Generate monthly archives
      const monthMap = {};
      yearPosts.forEach(post => {
        const month = post.date.month() + 1;
        if (!monthMap[month]) {
          monthMap[month] = [];
        }
        monthMap[month].push(post);
      });

      Object.keys(monthMap).forEach(month => {
        const monthPosts = monthMap[month];
        const monthTotalPages = Math.ceil(monthPosts.length / perPage);
        const monthStr = month < 10 ? '0' + month : month;

        // Convert array to query-like object
        const monthPostsQuery = locals.posts.filter(post => {
          return post.lang === lang && post.date.year() === parseInt(year) && (post.date.month() + 1) === parseInt(month);
        }).sort('-date');

        for (let i = 1; i <= monthTotalPages; i++) {
          const start = (i - 1) * perPage;
          const pagePosts = monthPostsQuery.skip(start).limit(perPage);

          let path;
          if (i === 1) {
            path = `${langPrefix}${archiveDir}/${year}/${monthStr}/index.html`;
          } else {
            path = `${langPrefix}${archiveDir}/${year}/${monthStr}/${paginationDir}/${i}/index.html`;
          }

          routes.push({
            path: path,
            data: {
              lang: lang,
              base: `${langPrefix}${archiveDir}/${year}/${monthStr}/`,
              total: monthTotalPages,
              current: i,
              archive: true,
              year: parseInt(year),
              month: parseInt(month),
              posts: pagePosts,
              prev: i > 1 ? i - 1 : 0,
              prev_link: i > 1 ? (i === 2 ? `${langPrefix}${archiveDir}/${year}/${monthStr}/` : `${langPrefix}${archiveDir}/${year}/${monthStr}/${paginationDir}/${i - 1}/`) : '',
              next: i < monthTotalPages ? i + 1 : 0,
              next_link: i < monthTotalPages ? `${langPrefix}${archiveDir}/${year}/${monthStr}/${paginationDir}/${i + 1}/` : ''
            },
            layout: ['archive', 'index']
          });
        }
      });
    });
  });

  return routes;
});
