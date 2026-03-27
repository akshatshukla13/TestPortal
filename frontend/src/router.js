export function parseRoute() {
  const hash = window.location.hash || '#/dashboard';
  const clean = hash.replace(/^#\/?/, '');
  const [page, p1, p2] = clean.split('/');

  if (page === 'test' && p1) {
    return { page: 'test', testId: p1 };
  }

  if (page === 'report') {
    return { page: 'report', tab: p1 || 'score', testId: p2 || '' };
  }

  const knownPages = ['bookmarks', 'documents', 'video', 'current-affairs', 'announcements'];
  if (knownPages.includes(page)) {
    return { page };
  }

  return { page: 'dashboard' };
}

export function goTo(path) {
  window.location.hash = path.startsWith('/') ? `#${path}` : `#/${path}`;
}

export function openInNewTab(path) {
  const hashPath = path.startsWith('/') ? `#${path}` : `#/${path}`;
  const url = `${window.location.origin}${window.location.pathname}${hashPath}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
