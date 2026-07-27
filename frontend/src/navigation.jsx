import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { normalizePathname, resolveClientNavigation } from './routing'

const NavigationContext = createContext(null)

function readLocation() {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
  }
}

export function NavigationProvider({ children }) {
  const [location, setLocation] = useState(readLocation)

  useEffect(() => {
    const handlePopState = () => setLocation(readLocation())
    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = useCallback((destination, { replace = false } = {}) => {
    if (typeof destination === 'number') {
      window.history.go(destination)
      return
    }

    const nextUrl = resolveClientNavigation(destination, window.location.href)
    if (!nextUrl) {
      throw new Error('Client navigation only supports same-origin HTTP URLs')
    }

    const nextLocation = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
    window.history[replace ? 'replaceState' : 'pushState']({}, '', nextLocation)
    setLocation(readLocation())
  }, [])

  const value = useMemo(
    () => ({ ...location, navigate }),
    [location, navigate]
  )

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}

function useNavigation() {
  const navigation = useContext(NavigationContext)

  if (!navigation) {
    throw new Error('Navigation hooks must be used inside NavigationProvider')
  }

  return navigation
}

export function Link({
  to,
  onClick,
  target,
  children,
  ...anchorProps
}) {
  const { navigate } = useNavigation()

  const handleClick = event => {
    onClick?.(event)

    const destinationUrl = resolveClientNavigation(to, window.location.href)
    const shouldUseBrowserNavigation =
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      target === '_blank' ||
      anchorProps.download ||
      !destinationUrl

    if (shouldUseBrowserNavigation) {
      return
    }

    event.preventDefault()
    navigate(to)
  }

  return (
    <a {...anchorProps} href={to} target={target} onClick={handleClick}>
      {children}
    </a>
  )
}

export function NavLink({ to, className, children, ...linkProps }) {
  const { pathname } = useNavigation()
  const targetPathname = new URL(to, window.location.href).pathname
  const isActive =
    normalizePathname(pathname) === normalizePathname(targetPathname)
  const resolvedClassName =
    typeof className === 'function' ? className({ isActive }) : className

  return (
    <Link
      {...linkProps}
      to={to}
      className={resolvedClassName}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}

export function useNavigate() {
  return useNavigation().navigate
}

export function usePathname() {
  return useNavigation().pathname
}

export function useSearchParams() {
  const { pathname, search, navigate } = useNavigation()
  const searchParams = useMemo(() => new URLSearchParams(search), [search])

  const setSearchParams = useCallback(
    nextParams => {
      const resolvedParams =
        typeof nextParams === 'function'
          ? nextParams(new URLSearchParams(search))
          : nextParams
      const query = new URLSearchParams(resolvedParams).toString()
      navigate(`${pathname}${query ? `?${query}` : ''}`)
    },
    [navigate, pathname, search]
  )

  return [searchParams, setSearchParams]
}
