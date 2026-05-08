export function getSafeAuthRedirect(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/home';
  }

  if (value.startsWith('/login')) {
    return '/home';
  }

  return value;
}

export function getSafeAuthRedirectFromSearch(search) {
  return getSafeAuthRedirect(new URLSearchParams(search).get('redirect'));
}
