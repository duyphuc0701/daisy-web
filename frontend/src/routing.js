export function normalizePathname(pathname) {
  return pathname === '/' ? pathname : pathname.replace(/\/+$/, '')
}

export function resolveClientNavigation(destination, currentHref) {
  const currentUrl = new URL(currentHref)
  const destinationUrl = new URL(destination, currentUrl)
  const usesHttp = ['http:', 'https:'].includes(destinationUrl.protocol)

  if (!usesHttp || destinationUrl.origin !== currentUrl.origin) {
    return null
  }

  return destinationUrl
}

function decodePathSegment(segment) {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

export function resolveRoute(pathname) {
  const normalizedPath = normalizePathname(pathname)

  if (normalizedPath === '/about') {
    return { name: 'about' }
  }
  if (normalizedPath === '/login') {
    return { name: 'login' }
  }
  if (normalizedPath === '/register') {
    return { name: 'register' }
  }
  if (normalizedPath === '/forgot-password') {
    return { name: 'forgot_password' }
  }
  if (normalizedPath === '/activity') {
    return { name: 'activity' }
  }

  const resetMatch = normalizedPath.match(/^\/reset-password\/([^/]+)$/)
  if (resetMatch) {
    return {
      name: 'reset_password',
      params: { token: decodePathSegment(resetMatch[1]) }
    }
  }

  const bookMatch = normalizedPath.match(/^\/book\/([^/]+)$/)
  if (bookMatch) {
    return {
      name: 'book',
      params: { id: decodePathSegment(bookMatch[1]) },
    }
  }

  return { name: 'home' }
}
