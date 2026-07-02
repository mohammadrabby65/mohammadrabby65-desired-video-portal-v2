export function getPageUrl(basePath: string, page: number, searchParams?: URLSearchParams) {
  let url = basePath;
  if (page > 1) {
    if (basePath.includes('?')) {
      url = `${basePath}&page=${page}`;
    } else if (basePath.startsWith('/search')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('page', page.toString());
      url = `/search?${newParams.toString()}`;
    } else {
      url = `${basePath.replace(/\/$/, '')}/page/${page}`;
    }
  } else {
    if (basePath.startsWith('/search') && searchParams) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('page');
      url = `/search?${newParams.toString()}`;
    } else {
      url = basePath === '/' ? '/' : basePath.replace(/\/$/, '');
    }
  }
  return url;
}
