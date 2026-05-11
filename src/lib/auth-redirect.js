const DEFAULT_AUTH_REDIRECT = '/home';
const AUTH_CALLBACK_PARAMS = new Set([
  'code',
  'error',
  'error_code',
  'error_description',
  'error_uri',
  'provider',
  'state',
]);

function cleanRedirectPath(value) {
  try {
    const url = new URL(value, window.location.origin);
    AUTH_CALLBACK_PARAMS.forEach((param) => {
      url.searchParams.delete(param);
    });

    const search = url.searchParams.toString();
    return `${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
  } catch {
    return value;
  }
}

export function getSafeAuthRedirect(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return DEFAULT_AUTH_REDIRECT;
  }

  if (value.startsWith('/login')) {
    return DEFAULT_AUTH_REDIRECT;
  }

  const cleaned = cleanRedirectPath(value);
  return cleaned || DEFAULT_AUTH_REDIRECT;
}

export function getSafeAuthRedirectFromSearch(search) {
  return getSafeAuthRedirect(new URLSearchParams(search).get('redirect'));
}

export function getAuthErrorFromLocation(search = '', hash = '') {
  const params = new URLSearchParams(search);
  const hashParams = new URLSearchParams(String(hash).replace(/^#/, ''));
  const source = params.get('error') || params.get('error_code') ? params : hashParams;
  const error = source.get('error') || source.get('error_code');
  const description = source.get('error_description');

  if (!error && !description) return null;

  return {
    code: error || 'oauth_error',
    message: description ? description.replace(/\+/g, ' ') : 'Google sign-in could not be completed.',
  };
}
