import {
  C as useComposedRefs,
  D as require_react,
  b as createContextScope,
  f as Presence,
  h as Primitive,
  k as __toESM,
  m as useCallbackRef,
  p as useLayoutEffect2,
  s as cn,
  w as composeEventHandlers$1,
  x as require_jsx_runtime,
} from './client-CVWO68xh.js'
//#region \0vite/preload-helper.js
var scriptRel = 'modulepreload'
var assetsURL = function (dep) {
  return '/' + dep
}
var seen = {}
var __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve()
  if (deps && deps.length > 0) {
    const links = document.getElementsByTagName('link')
    const cspNonceMeta = document.querySelector('meta[property=csp-nonce]')
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute('nonce')
    function allSettled(promises) {
      return Promise.all(
        promises.map((p) =>
          Promise.resolve(p).then(
            (value) => ({
              status: 'fulfilled',
              value,
            }),
            (reason) => ({
              status: 'rejected',
              reason,
            }),
          ),
        ),
      )
    }
    promise = allSettled(
      deps.map((dep) => {
        dep = assetsURL(dep, importerUrl)
        if (dep in seen) return
        seen[dep] = true
        const isCss = dep.endsWith('.css')
        const cssSelector = isCss ? '[rel="stylesheet"]' : ''
        if (!!importerUrl)
          for (let i = links.length - 1; i >= 0; i--) {
            const link = links[i]
            if (link.href === dep && (!isCss || link.rel === 'stylesheet')) return
          }
        else if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) return
        const link = document.createElement('link')
        link.rel = isCss ? 'stylesheet' : scriptRel
        if (!isCss) link.as = 'script'
        link.crossOrigin = ''
        link.href = dep
        if (cspNonce) link.setAttribute('nonce', cspNonce)
        document.head.appendChild(link)
        if (isCss)
          return new Promise((res, rej) => {
            link.addEventListener('load', res)
            link.addEventListener('error', () =>
              rej(/* @__PURE__ */ new Error(`Unable to preload CSS for ${dep}`)),
            )
          })
      }),
    )
  }
  function handlePreloadError(err) {
    const e = new Event('vite:preloadError', { cancelable: true })
    e.payload = err
    window.dispatchEvent(e)
    if (!e.defaultPrevented) throw err
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== 'rejected') continue
      handlePreloadError(item.reason)
    }
    return baseModule().catch(handlePreloadError)
  })
}
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/react-router@7.14.0_react-dom@19.2.4_react@19.2.4__react@19.2.4/node_modules/react-router/dist/development/chunk-QFMPRPBF.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1)
/**
 * react-router v7.14.0
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
var __typeError = (msg) => {
  throw TypeError(msg)
}
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError('Cannot ' + msg)
var __privateGet = (obj, member, getter) => (
  __accessCheck(obj, member, 'read from private field'), getter ? getter.call(obj) : member.get(obj)
)
var __privateAdd = (obj, member, value) =>
  member.has(obj)
    ? __typeError('Cannot add the same private member more than once')
    : member instanceof WeakSet
      ? member.add(obj)
      : member.set(obj, value)
var PopStateEventType = 'popstate'
function isLocation(obj) {
  return (
    typeof obj === 'object' &&
    obj != null &&
    'pathname' in obj &&
    'search' in obj &&
    'hash' in obj &&
    'state' in obj &&
    'key' in obj
  )
}
function createBrowserHistory(options = {}) {
  function createBrowserLocation(window2, globalHistory) {
    let maskedLocation = globalHistory.state?.masked
    let { pathname, search, hash } = maskedLocation || window2.location
    return createLocation(
      '',
      {
        pathname,
        search,
        hash,
      },
      (globalHistory.state && globalHistory.state.usr) || null,
      (globalHistory.state && globalHistory.state.key) || 'default',
      maskedLocation
        ? {
            pathname: window2.location.pathname,
            search: window2.location.search,
            hash: window2.location.hash,
          }
        : void 0,
    )
  }
  function createBrowserHref(window2, to) {
    return typeof to === 'string' ? to : createPath(to)
  }
  return getUrlBasedHistory(createBrowserLocation, createBrowserHref, null, options)
}
function invariant(value, message) {
  if (value === false || value === null || typeof value === 'undefined') throw new Error(message)
}
function warning(cond, message) {
  if (!cond) {
    if (typeof console !== 'undefined') console.warn(message)
    try {
      throw new Error(message)
    } catch (e) {}
  }
}
function createKey() {
  return Math.random().toString(36).substring(2, 10)
}
function getHistoryState(location, index) {
  return {
    usr: location.state,
    key: location.key,
    idx: index,
    masked: location.unstable_mask
      ? {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        }
      : void 0,
  }
}
function createLocation(current, to, state = null, key, unstable_mask) {
  return {
    pathname: typeof current === 'string' ? current : current.pathname,
    search: '',
    hash: '',
    ...(typeof to === 'string' ? parsePath(to) : to),
    state,
    key: (to && to.key) || key || createKey(),
    unstable_mask,
  }
}
function createPath({ pathname = '/', search = '', hash = '' }) {
  if (search && search !== '?') pathname += search.charAt(0) === '?' ? search : '?' + search
  if (hash && hash !== '#') pathname += hash.charAt(0) === '#' ? hash : '#' + hash
  return pathname
}
function parsePath(path) {
  let parsedPath = {}
  if (path) {
    let hashIndex = path.indexOf('#')
    if (hashIndex >= 0) {
      parsedPath.hash = path.substring(hashIndex)
      path = path.substring(0, hashIndex)
    }
    let searchIndex = path.indexOf('?')
    if (searchIndex >= 0) {
      parsedPath.search = path.substring(searchIndex)
      path = path.substring(0, searchIndex)
    }
    if (path) parsedPath.pathname = path
  }
  return parsedPath
}
function getUrlBasedHistory(getLocation, createHref2, validateLocation, options = {}) {
  let { window: window2 = document.defaultView, v5Compat = false } = options
  let globalHistory = window2.history
  let action = 'POP'
  let listener = null
  let index = getIndex()
  if (index == null) {
    index = 0
    globalHistory.replaceState(
      {
        ...globalHistory.state,
        idx: index,
      },
      '',
    )
  }
  function getIndex() {
    return (globalHistory.state || { idx: null }).idx
  }
  function handlePop() {
    action = 'POP'
    let nextIndex = getIndex()
    let delta = nextIndex == null ? null : nextIndex - index
    index = nextIndex
    if (listener)
      listener({
        action,
        location: history.location,
        delta,
      })
  }
  function push(to, state) {
    action = 'PUSH'
    let location = isLocation(to) ? to : createLocation(history.location, to, state)
    if (validateLocation) validateLocation(location, to)
    index = getIndex() + 1
    let historyState = getHistoryState(location, index)
    let url = history.createHref(location.unstable_mask || location)
    try {
      globalHistory.pushState(historyState, '', url)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'DataCloneError') throw error
      window2.location.assign(url)
    }
    if (v5Compat && listener)
      listener({
        action,
        location: history.location,
        delta: 1,
      })
  }
  function replace2(to, state) {
    action = 'REPLACE'
    let location = isLocation(to) ? to : createLocation(history.location, to, state)
    if (validateLocation) validateLocation(location, to)
    index = getIndex()
    let historyState = getHistoryState(location, index)
    let url = history.createHref(location.unstable_mask || location)
    globalHistory.replaceState(historyState, '', url)
    if (v5Compat && listener)
      listener({
        action,
        location: history.location,
        delta: 0,
      })
  }
  function createURL(to) {
    return createBrowserURLImpl(to)
  }
  let history = {
    get action() {
      return action
    },
    get location() {
      return getLocation(window2, globalHistory)
    },
    listen(fn) {
      if (listener) throw new Error('A history only accepts one active listener')
      window2.addEventListener(PopStateEventType, handlePop)
      listener = fn
      return () => {
        window2.removeEventListener(PopStateEventType, handlePop)
        listener = null
      }
    },
    createHref(to) {
      return createHref2(window2, to)
    },
    createURL,
    encodeLocation(to) {
      let url = createURL(to)
      return {
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
      }
    },
    push,
    replace: replace2,
    go(n) {
      return globalHistory.go(n)
    },
  }
  return history
}
function createBrowserURLImpl(to, isAbsolute = false) {
  let base = 'http://localhost'
  if (typeof window !== 'undefined')
    base = window.location.origin !== 'null' ? window.location.origin : window.location.href
  invariant(base, 'No window.location.(origin|href) available to create URL')
  let href = typeof to === 'string' ? to : createPath(to)
  href = href.replace(/ $/, '%20')
  if (!isAbsolute && href.startsWith('//')) href = base + href
  return new URL(href, base)
}
function createContext(defaultValue) {
  return { defaultValue }
}
var _map
var RouterContextProvider = class {
  /**
   * Create a new `RouterContextProvider` instance
   * @param init An optional initial context map to populate the provider with
   */
  constructor(init) {
    __privateAdd(this, _map, /* @__PURE__ */ new Map())
    if (init) for (let [context, value] of init) this.set(context, value)
  }
  /**
   * Access a value from the context. If no value has been set for the context,
   * it will return the context's `defaultValue` if provided, or throw an error
   * if no `defaultValue` was set.
   * @param context The context to get the value for
   * @returns The value for the context, or the context's `defaultValue` if no
   * value was set
   */
  get(context) {
    if (__privateGet(this, _map).has(context)) return __privateGet(this, _map).get(context)
    if (context.defaultValue !== void 0) return context.defaultValue
    throw new Error('No value found for context')
  }
  /**
   * Set a value for the context. If the context already has a value set, this
   * will overwrite it.
   *
   * @param context The context to set the value for
   * @param value The value to set for the context
   * @returns {void}
   */
  set(context, value) {
    __privateGet(this, _map).set(context, value)
  }
}
_map = /* @__PURE__ */ new WeakMap()
var unsupportedLazyRouteObjectKeys = /* @__PURE__ */ new Set([
  'lazy',
  'caseSensitive',
  'path',
  'id',
  'index',
  'children',
])
function isUnsupportedLazyRouteObjectKey(key) {
  return unsupportedLazyRouteObjectKeys.has(key)
}
var unsupportedLazyRouteFunctionKeys = /* @__PURE__ */ new Set([
  'lazy',
  'caseSensitive',
  'path',
  'id',
  'index',
  'middleware',
  'children',
])
function isUnsupportedLazyRouteFunctionKey(key) {
  return unsupportedLazyRouteFunctionKeys.has(key)
}
function isIndexRoute(route) {
  return route.index === true
}
function convertRoutesToDataRoutes(
  routes,
  mapRouteProperties2,
  parentPath = [],
  manifest = {},
  allowInPlaceMutations = false,
) {
  return routes.map((route, index) => {
    let treePath = [...parentPath, String(index)]
    let id = typeof route.id === 'string' ? route.id : treePath.join('-')
    invariant(route.index !== true || !route.children, `Cannot specify children on an index route`)
    invariant(
      allowInPlaceMutations || !manifest[id],
      `Found a route id collision on id "${id}".  Route id's must be globally unique within Data Router usages`,
    )
    if (isIndexRoute(route)) {
      let indexRoute = {
        ...route,
        id,
      }
      manifest[id] = mergeRouteUpdates(indexRoute, mapRouteProperties2(indexRoute))
      return indexRoute
    } else {
      let pathOrLayoutRoute = {
        ...route,
        id,
        children: void 0,
      }
      manifest[id] = mergeRouteUpdates(pathOrLayoutRoute, mapRouteProperties2(pathOrLayoutRoute))
      if (route.children)
        pathOrLayoutRoute.children = convertRoutesToDataRoutes(
          route.children,
          mapRouteProperties2,
          treePath,
          manifest,
          allowInPlaceMutations,
        )
      return pathOrLayoutRoute
    }
  })
}
function mergeRouteUpdates(route, updates) {
  return Object.assign(route, {
    ...updates,
    ...(typeof updates.lazy === 'object' && updates.lazy != null
      ? {
          lazy: {
            ...route.lazy,
            ...updates.lazy,
          },
        }
      : {}),
  })
}
function matchRoutes(routes, locationArg, basename = '/') {
  return matchRoutesImpl(routes, locationArg, basename, false)
}
function matchRoutesImpl(routes, locationArg, basename, allowPartial) {
  let pathname = stripBasename(
    (typeof locationArg === 'string' ? parsePath(locationArg) : locationArg).pathname || '/',
    basename,
  )
  if (pathname == null) return null
  let branches = flattenRoutes(routes)
  rankRouteBranches(branches)
  let matches = null
  for (let i = 0; matches == null && i < branches.length; ++i) {
    let decoded = decodePath(pathname)
    matches = matchRouteBranch(branches[i], decoded, allowPartial)
  }
  return matches
}
function convertRouteMatchToUiMatch(match, loaderData) {
  let { route, pathname, params } = match
  return {
    id: route.id,
    pathname,
    params,
    data: loaderData[route.id],
    loaderData: loaderData[route.id],
    handle: route.handle,
  }
}
function flattenRoutes(
  routes,
  branches = [],
  parentsMeta = [],
  parentPath = '',
  _hasParentOptionalSegments = false,
) {
  let flattenRoute = (
    route,
    index,
    hasParentOptionalSegments = _hasParentOptionalSegments,
    relativePath,
  ) => {
    let meta = {
      relativePath: relativePath === void 0 ? route.path || '' : relativePath,
      caseSensitive: route.caseSensitive === true,
      childrenIndex: index,
      route,
    }
    if (meta.relativePath.startsWith('/')) {
      if (!meta.relativePath.startsWith(parentPath) && hasParentOptionalSegments) return
      invariant(
        meta.relativePath.startsWith(parentPath),
        `Absolute route path "${meta.relativePath}" nested under path "${parentPath}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`,
      )
      meta.relativePath = meta.relativePath.slice(parentPath.length)
    }
    let path = joinPaths([parentPath, meta.relativePath])
    let routesMeta = parentsMeta.concat(meta)
    if (route.children && route.children.length > 0) {
      invariant(
        route.index !== true,
        `Index routes must not have child routes. Please remove all child routes from route path "${path}".`,
      )
      flattenRoutes(route.children, branches, routesMeta, path, hasParentOptionalSegments)
    }
    if (route.path == null && !route.index) return
    branches.push({
      path,
      score: computeScore(path, route.index),
      routesMeta,
    })
  }
  routes.forEach((route, index) => {
    if (route.path === '' || !route.path?.includes('?')) flattenRoute(route, index)
    else
      for (let exploded of explodeOptionalSegments(route.path))
        flattenRoute(route, index, true, exploded)
  })
  return branches
}
function explodeOptionalSegments(path) {
  let segments = path.split('/')
  if (segments.length === 0) return []
  let [first, ...rest] = segments
  let isOptional = first.endsWith('?')
  let required = first.replace(/\?$/, '')
  if (rest.length === 0) return isOptional ? [required, ''] : [required]
  let restExploded = explodeOptionalSegments(rest.join('/'))
  let result = []
  result.push(
    ...restExploded.map((subpath) => (subpath === '' ? required : [required, subpath].join('/'))),
  )
  if (isOptional) result.push(...restExploded)
  return result.map((exploded) => (path.startsWith('/') && exploded === '' ? '/' : exploded))
}
function rankRouteBranches(branches) {
  branches.sort((a, b) =>
    a.score !== b.score
      ? b.score - a.score
      : compareIndexes(
          a.routesMeta.map((meta) => meta.childrenIndex),
          b.routesMeta.map((meta) => meta.childrenIndex),
        ),
  )
}
var paramRe = /^:[\w-]+$/
var dynamicSegmentValue = 3
var indexRouteValue = 2
var emptySegmentValue = 1
var staticSegmentValue = 10
var splatPenalty = -2
var isSplat = (s) => s === '*'
function computeScore(path, index) {
  let segments = path.split('/')
  let initialScore = segments.length
  if (segments.some(isSplat)) initialScore += splatPenalty
  if (index) initialScore += indexRouteValue
  return segments
    .filter((s) => !isSplat(s))
    .reduce(
      (score, segment) =>
        score +
        (paramRe.test(segment)
          ? dynamicSegmentValue
          : segment === ''
            ? emptySegmentValue
            : staticSegmentValue),
      initialScore,
    )
}
function compareIndexes(a, b) {
  return a.length === b.length && a.slice(0, -1).every((n, i) => n === b[i])
    ? a[a.length - 1] - b[b.length - 1]
    : 0
}
function matchRouteBranch(branch, pathname, allowPartial = false) {
  let { routesMeta } = branch
  let matchedParams = {}
  let matchedPathname = '/'
  let matches = []
  for (let i = 0; i < routesMeta.length; ++i) {
    let meta = routesMeta[i]
    let end = i === routesMeta.length - 1
    let remainingPathname =
      matchedPathname === '/' ? pathname : pathname.slice(matchedPathname.length) || '/'
    let match = matchPath(
      {
        path: meta.relativePath,
        caseSensitive: meta.caseSensitive,
        end,
      },
      remainingPathname,
    )
    let route = meta.route
    if (!match && end && allowPartial && !routesMeta[routesMeta.length - 1].route.index)
      match = matchPath(
        {
          path: meta.relativePath,
          caseSensitive: meta.caseSensitive,
          end: false,
        },
        remainingPathname,
      )
    if (!match) return null
    Object.assign(matchedParams, match.params)
    matches.push({
      params: matchedParams,
      pathname: joinPaths([matchedPathname, match.pathname]),
      pathnameBase: normalizePathname(joinPaths([matchedPathname, match.pathnameBase])),
      route,
    })
    if (match.pathnameBase !== '/')
      matchedPathname = joinPaths([matchedPathname, match.pathnameBase])
  }
  return matches
}
function matchPath(pattern, pathname) {
  if (typeof pattern === 'string')
    pattern = {
      path: pattern,
      caseSensitive: false,
      end: true,
    }
  let [matcher, compiledParams] = compilePath(pattern.path, pattern.caseSensitive, pattern.end)
  let match = pathname.match(matcher)
  if (!match) return null
  let matchedPathname = match[0]
  let pathnameBase = matchedPathname.replace(/(.)\/+$/, '$1')
  let captureGroups = match.slice(1)
  return {
    params: compiledParams.reduce((memo2, { paramName, isOptional }, index) => {
      if (paramName === '*') {
        let splatValue = captureGroups[index] || ''
        pathnameBase = matchedPathname
          .slice(0, matchedPathname.length - splatValue.length)
          .replace(/(.)\/+$/, '$1')
      }
      const value = captureGroups[index]
      if (isOptional && !value) memo2[paramName] = void 0
      else memo2[paramName] = (value || '').replace(/%2F/g, '/')
      return memo2
    }, {}),
    pathname: matchedPathname,
    pathnameBase,
    pattern,
  }
}
function compilePath(path, caseSensitive = false, end = true) {
  warning(
    path === '*' || !path.endsWith('*') || path.endsWith('/*'),
    `Route path "${path}" will be treated as if it were "${path.replace(/\*$/, '/*')}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${path.replace(/\*$/, '/*')}".`,
  )
  let params = []
  let regexpSource =
    '^' +
    path
      .replace(/\/*\*?$/, '')
      .replace(/^\/*/, '/')
      .replace(/[\\.*+^${}|()[\]]/g, '\\$&')
      .replace(/\/:([\w-]+)(\?)?/g, (match, paramName, isOptional, index, str) => {
        params.push({
          paramName,
          isOptional: isOptional != null,
        })
        if (isOptional) {
          let nextChar = str.charAt(index + match.length)
          if (nextChar && nextChar !== '/') return '/([^\\/]*)'
          return '(?:/([^\\/]*))?'
        }
        return '/([^\\/]+)'
      })
      .replace(/\/([\w-]+)\?(\/|$)/g, '(/$1)?$2')
  if (path.endsWith('*')) {
    params.push({ paramName: '*' })
    regexpSource += path === '*' || path === '/*' ? '(.*)$' : '(?:\\/(.+)|\\/*)$'
  } else if (end) regexpSource += '\\/*$'
  else if (path !== '' && path !== '/') regexpSource += '(?:(?=\\/|$))'
  return [new RegExp(regexpSource, caseSensitive ? void 0 : 'i'), params]
}
function decodePath(value) {
  try {
    return value
      .split('/')
      .map((v) => decodeURIComponent(v).replace(/\//g, '%2F'))
      .join('/')
  } catch (error) {
    warning(
      false,
      `The URL path "${value}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${error}).`,
    )
    return value
  }
}
function stripBasename(pathname, basename) {
  if (basename === '/') return pathname
  if (!pathname.toLowerCase().startsWith(basename.toLowerCase())) return null
  let startIndex = basename.endsWith('/') ? basename.length - 1 : basename.length
  let nextChar = pathname.charAt(startIndex)
  if (nextChar && nextChar !== '/') return null
  return pathname.slice(startIndex) || '/'
}
function prependBasename({ basename, pathname }) {
  return pathname === '/' ? basename : joinPaths([basename, pathname])
}
var ABSOLUTE_URL_REGEX = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i
var isAbsoluteUrl = (url) => ABSOLUTE_URL_REGEX.test(url)
function resolvePath(to, fromPathname = '/') {
  let { pathname: toPathname, search = '', hash = '' } = typeof to === 'string' ? parsePath(to) : to
  let pathname
  if (toPathname) {
    toPathname = toPathname.replace(/\/\/+/g, '/')
    if (toPathname.startsWith('/')) pathname = resolvePathname(toPathname.substring(1), '/')
    else pathname = resolvePathname(toPathname, fromPathname)
  } else pathname = fromPathname
  return {
    pathname,
    search: normalizeSearch(search),
    hash: normalizeHash(hash),
  }
}
function resolvePathname(relativePath, fromPathname) {
  let segments = fromPathname.replace(/\/+$/, '').split('/')
  relativePath.split('/').forEach((segment) => {
    if (segment === '..') {
      if (segments.length > 1) segments.pop()
    } else if (segment !== '.') segments.push(segment)
  })
  return segments.length > 1 ? segments.join('/') : '/'
}
function getInvalidPathError(char, field, dest, path) {
  return `Cannot include a '${char}' character in a manually specified \`to.${field}\` field [${JSON.stringify(path)}].  Please separate it out to the \`to.${dest}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`
}
function getPathContributingMatches(matches) {
  return matches.filter(
    (match, index) => index === 0 || (match.route.path && match.route.path.length > 0),
  )
}
function getResolveToMatches(matches) {
  let pathMatches = getPathContributingMatches(matches)
  return pathMatches.map((match, idx) =>
    idx === pathMatches.length - 1 ? match.pathname : match.pathnameBase,
  )
}
function resolveTo(toArg, routePathnames, locationPathname, isPathRelative = false) {
  let to
  if (typeof toArg === 'string') to = parsePath(toArg)
  else {
    to = { ...toArg }
    invariant(
      !to.pathname || !to.pathname.includes('?'),
      getInvalidPathError('?', 'pathname', 'search', to),
    )
    invariant(
      !to.pathname || !to.pathname.includes('#'),
      getInvalidPathError('#', 'pathname', 'hash', to),
    )
    invariant(
      !to.search || !to.search.includes('#'),
      getInvalidPathError('#', 'search', 'hash', to),
    )
  }
  let isEmptyPath = toArg === '' || to.pathname === ''
  let toPathname = isEmptyPath ? '/' : to.pathname
  let from
  if (toPathname == null) from = locationPathname
  else {
    let routePathnameIndex = routePathnames.length - 1
    if (!isPathRelative && toPathname.startsWith('..')) {
      let toSegments = toPathname.split('/')
      while (toSegments[0] === '..') {
        toSegments.shift()
        routePathnameIndex -= 1
      }
      to.pathname = toSegments.join('/')
    }
    from = routePathnameIndex >= 0 ? routePathnames[routePathnameIndex] : '/'
  }
  let path = resolvePath(to, from)
  let hasExplicitTrailingSlash = toPathname && toPathname !== '/' && toPathname.endsWith('/')
  let hasCurrentTrailingSlash =
    (isEmptyPath || toPathname === '.') && locationPathname.endsWith('/')
  if (!path.pathname.endsWith('/') && (hasExplicitTrailingSlash || hasCurrentTrailingSlash))
    path.pathname += '/'
  return path
}
var joinPaths = (paths) => paths.join('/').replace(/\/\/+/g, '/')
var normalizePathname = (pathname) => pathname.replace(/\/+$/, '').replace(/^\/*/, '/')
var normalizeSearch = (search) =>
  !search || search === '?' ? '' : search.startsWith('?') ? search : '?' + search
var normalizeHash = (hash) =>
  !hash || hash === '#' ? '' : hash.startsWith('#') ? hash : '#' + hash
var ErrorResponseImpl = class {
  constructor(status, statusText, data2, internal = false) {
    this.status = status
    this.statusText = statusText || ''
    this.internal = internal
    if (data2 instanceof Error) {
      this.data = data2.toString()
      this.error = data2
    } else this.data = data2
  }
}
function isRouteErrorResponse(error) {
  return (
    error != null &&
    typeof error.status === 'number' &&
    typeof error.statusText === 'string' &&
    typeof error.internal === 'boolean' &&
    'data' in error
  )
}
function getRoutePattern(matches) {
  return (
    matches
      .map((m) => m.route.path)
      .filter(Boolean)
      .join('/')
      .replace(/\/\/*/g, '/') || '/'
  )
}
var isBrowser =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined'
function parseToInfo(_to, basename) {
  let to = _to
  if (typeof to !== 'string' || !ABSOLUTE_URL_REGEX.test(to))
    return {
      absoluteURL: void 0,
      isExternal: false,
      to,
    }
  let absoluteURL = to
  let isExternal = false
  if (isBrowser)
    try {
      let currentUrl = new URL(window.location.href)
      let targetUrl = to.startsWith('//') ? new URL(currentUrl.protocol + to) : new URL(to)
      let path = stripBasename(targetUrl.pathname, basename)
      if (targetUrl.origin === currentUrl.origin && path != null)
        to = path + targetUrl.search + targetUrl.hash
      else isExternal = true
    } catch (e) {
      warning(
        false,
        `<Link to="${to}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`,
      )
    }
  return {
    absoluteURL,
    isExternal,
    to,
  }
}
var UninstrumentedSymbol = Symbol('Uninstrumented')
function getRouteInstrumentationUpdates(fns, route) {
  let aggregated = {
    lazy: [],
    'lazy.loader': [],
    'lazy.action': [],
    'lazy.middleware': [],
    middleware: [],
    loader: [],
    action: [],
  }
  fns.forEach((fn) =>
    fn({
      id: route.id,
      index: route.index,
      path: route.path,
      instrument(i) {
        let keys = Object.keys(aggregated)
        for (let key of keys) if (i[key]) aggregated[key].push(i[key])
      },
    }),
  )
  let updates = {}
  if (typeof route.lazy === 'function' && aggregated.lazy.length > 0) {
    let instrumented = wrapImpl(aggregated.lazy, route.lazy, () => void 0)
    if (instrumented) updates.lazy = instrumented
  }
  if (typeof route.lazy === 'object') {
    let lazyObject = route.lazy
    ;['middleware', 'loader', 'action'].forEach((key) => {
      let lazyFn = lazyObject[key]
      let instrumentations = aggregated[`lazy.${key}`]
      if (typeof lazyFn === 'function' && instrumentations.length > 0) {
        let instrumented = wrapImpl(instrumentations, lazyFn, () => void 0)
        if (instrumented) updates.lazy = Object.assign(updates.lazy || {}, { [key]: instrumented })
      }
    })
  }
  ;['loader', 'action'].forEach((key) => {
    let handler = route[key]
    if (typeof handler === 'function' && aggregated[key].length > 0) {
      let original = handler[UninstrumentedSymbol] ?? handler
      let instrumented = wrapImpl(aggregated[key], original, (...args) => getHandlerInfo(args[0]))
      if (instrumented) {
        if (key === 'loader' && original.hydrate === true) instrumented.hydrate = true
        instrumented[UninstrumentedSymbol] = original
        updates[key] = instrumented
      }
    }
  })
  if (route.middleware && route.middleware.length > 0 && aggregated.middleware.length > 0)
    updates.middleware = route.middleware.map((middleware) => {
      let original = middleware[UninstrumentedSymbol] ?? middleware
      let instrumented = wrapImpl(aggregated.middleware, original, (...args) =>
        getHandlerInfo(args[0]),
      )
      if (instrumented) {
        instrumented[UninstrumentedSymbol] = original
        return instrumented
      }
      return middleware
    })
  return updates
}
function instrumentClientSideRouter(router, fns) {
  let aggregated = {
    navigate: [],
    fetch: [],
  }
  fns.forEach((fn) =>
    fn({
      instrument(i) {
        let keys = Object.keys(i)
        for (let key of keys) if (i[key]) aggregated[key].push(i[key])
      },
    }),
  )
  if (aggregated.navigate.length > 0) {
    let navigate = router.navigate[UninstrumentedSymbol] ?? router.navigate
    let instrumentedNavigate = wrapImpl(aggregated.navigate, navigate, (...args) => {
      let [to, opts] = args
      return {
        to: typeof to === 'number' || typeof to === 'string' ? to : to ? createPath(to) : '.',
        ...getRouterInfo(router, opts ?? {}),
      }
    })
    if (instrumentedNavigate) {
      instrumentedNavigate[UninstrumentedSymbol] = navigate
      router.navigate = instrumentedNavigate
    }
  }
  if (aggregated.fetch.length > 0) {
    let fetch2 = router.fetch[UninstrumentedSymbol] ?? router.fetch
    let instrumentedFetch = wrapImpl(aggregated.fetch, fetch2, (...args) => {
      let [key, , href, opts] = args
      return {
        href: href ?? '.',
        fetcherKey: key,
        ...getRouterInfo(router, opts ?? {}),
      }
    })
    if (instrumentedFetch) {
      instrumentedFetch[UninstrumentedSymbol] = fetch2
      router.fetch = instrumentedFetch
    }
  }
  return router
}
function wrapImpl(impls, handler, getInfo) {
  if (impls.length === 0) return null
  return async (...args) => {
    let result = await recurseRight(
      impls,
      getInfo(...args),
      () => handler(...args),
      impls.length - 1,
    )
    if (result.type === 'error') throw result.value
    return result.value
  }
}
async function recurseRight(impls, info, handler, index) {
  let impl = impls[index]
  let result
  if (!impl)
    try {
      result = {
        type: 'success',
        value: await handler(),
      }
    } catch (e) {
      result = {
        type: 'error',
        value: e,
      }
    }
  else {
    let handlerPromise = void 0
    let callHandler = async () => {
      if (handlerPromise) console.error('You cannot call instrumented handlers more than once')
      else handlerPromise = recurseRight(impls, info, handler, index - 1)
      result = await handlerPromise
      invariant(result, 'Expected a result')
      if (result.type === 'error' && result.value instanceof Error)
        return {
          status: 'error',
          error: result.value,
        }
      return {
        status: 'success',
        error: void 0,
      }
    }
    try {
      await impl(callHandler, info)
    } catch (e) {
      console.error('An instrumentation function threw an error:', e)
    }
    if (!handlerPromise) await callHandler()
    await handlerPromise
  }
  if (result) return result
  return {
    type: 'error',
    value: /* @__PURE__ */ new Error('No result assigned in instrumentation chain.'),
  }
}
function getHandlerInfo(args) {
  let { request, context, params, unstable_pattern } = args
  return {
    request: getReadonlyRequest(request),
    params: { ...params },
    unstable_pattern,
    context: getReadonlyContext(context),
  }
}
function getRouterInfo(router, opts) {
  return {
    currentUrl: createPath(router.state.location),
    ...('formMethod' in opts ? { formMethod: opts.formMethod } : {}),
    ...('formEncType' in opts ? { formEncType: opts.formEncType } : {}),
    ...('formData' in opts ? { formData: opts.formData } : {}),
    ...('body' in opts ? { body: opts.body } : {}),
  }
}
function getReadonlyRequest(request) {
  return {
    method: request.method,
    url: request.url,
    headers: { get: (...args) => request.headers.get(...args) },
  }
}
function getReadonlyContext(context) {
  if (isPlainObject(context)) {
    let frozen = { ...context }
    Object.freeze(frozen)
    return frozen
  } else return { get: (ctx) => context.get(ctx) }
}
var objectProtoNames = Object.getOwnPropertyNames(Object.prototype).sort().join('\0')
function isPlainObject(thing) {
  if (thing === null || typeof thing !== 'object') return false
  const proto = Object.getPrototypeOf(thing)
  return (
    proto === Object.prototype ||
    proto === null ||
    Object.getOwnPropertyNames(proto).sort().join('\0') === objectProtoNames
  )
}
var validMutationMethodsArr = ['POST', 'PUT', 'PATCH', 'DELETE']
var validMutationMethods = new Set(validMutationMethodsArr)
var validRequestMethodsArr = ['GET', ...validMutationMethodsArr]
var validRequestMethods = new Set(validRequestMethodsArr)
var redirectStatusCodes = /* @__PURE__ */ new Set([301, 302, 303, 307, 308])
var redirectPreserveMethodStatusCodes = /* @__PURE__ */ new Set([307, 308])
var IDLE_NAVIGATION = {
  state: 'idle',
  location: void 0,
  formMethod: void 0,
  formAction: void 0,
  formEncType: void 0,
  formData: void 0,
  json: void 0,
  text: void 0,
}
var IDLE_FETCHER = {
  state: 'idle',
  data: void 0,
  formMethod: void 0,
  formAction: void 0,
  formEncType: void 0,
  formData: void 0,
  json: void 0,
  text: void 0,
}
var IDLE_BLOCKER = {
  state: 'unblocked',
  proceed: void 0,
  reset: void 0,
  location: void 0,
}
var defaultMapRouteProperties = (route) => ({ hasErrorBoundary: Boolean(route.hasErrorBoundary) })
var TRANSITIONS_STORAGE_KEY = 'remix-router-transitions'
var ResetLoaderDataSymbol = Symbol('ResetLoaderData')
function createRouter(init) {
  const routerWindow = init.window ? init.window : typeof window !== 'undefined' ? window : void 0
  const isBrowser3 =
    typeof routerWindow !== 'undefined' &&
    typeof routerWindow.document !== 'undefined' &&
    typeof routerWindow.document.createElement !== 'undefined'
  invariant(init.routes.length > 0, 'You must provide a non-empty routes array to createRouter')
  let hydrationRouteProperties2 = init.hydrationRouteProperties || []
  let _mapRouteProperties = init.mapRouteProperties || defaultMapRouteProperties
  let mapRouteProperties2 = _mapRouteProperties
  if (init.unstable_instrumentations) {
    let instrumentations = init.unstable_instrumentations
    mapRouteProperties2 = (route) => {
      return {
        ..._mapRouteProperties(route),
        ...getRouteInstrumentationUpdates(
          instrumentations.map((i) => i.route).filter(Boolean),
          route,
        ),
      }
    }
  }
  let manifest = {}
  let dataRoutes = convertRoutesToDataRoutes(init.routes, mapRouteProperties2, void 0, manifest)
  let inFlightDataRoutes
  let basename = init.basename || '/'
  if (!basename.startsWith('/')) basename = `/${basename}`
  let dataStrategyImpl = init.dataStrategy || defaultDataStrategyWithMiddleware
  let future = {
    unstable_passThroughRequests: false,
    ...init.future,
  }
  let unlistenHistory = null
  let subscribers = /* @__PURE__ */ new Set()
  let savedScrollPositions2 = null
  let getScrollRestorationKey2 = null
  let getScrollPosition = null
  let initialScrollRestored = init.hydrationData != null
  let initialMatches = matchRoutes(dataRoutes, init.history.location, basename)
  let initialMatchesIsFOW = false
  let initialErrors = null
  let initialized
  let renderFallback
  if (initialMatches == null && !init.patchRoutesOnNavigation) {
    let error = getInternalRouterError(404, { pathname: init.history.location.pathname })
    let { matches, route } = getShortCircuitMatches(dataRoutes)
    initialized = true
    renderFallback = !initialized
    initialMatches = matches
    initialErrors = { [route.id]: error }
  } else {
    if (initialMatches && !init.hydrationData) {
      if (checkFogOfWar(initialMatches, dataRoutes, init.history.location.pathname).active)
        initialMatches = null
    }
    if (!initialMatches) {
      initialized = false
      renderFallback = !initialized
      initialMatches = []
      let fogOfWar = checkFogOfWar(null, dataRoutes, init.history.location.pathname)
      if (fogOfWar.active && fogOfWar.matches) {
        initialMatchesIsFOW = true
        initialMatches = fogOfWar.matches
      }
    } else if (initialMatches.some((m) => m.route.lazy)) {
      initialized = false
      renderFallback = !initialized
    } else if (!initialMatches.some((m) => routeHasLoaderOrMiddleware(m.route))) {
      initialized = true
      renderFallback = !initialized
    } else {
      let loaderData = init.hydrationData ? init.hydrationData.loaderData : null
      let errors = init.hydrationData ? init.hydrationData.errors : null
      let relevantMatches = initialMatches
      if (errors) {
        let idx = initialMatches.findIndex((m) => errors[m.route.id] !== void 0)
        relevantMatches = relevantMatches.slice(0, idx + 1)
      }
      renderFallback = false
      initialized = true
      relevantMatches.forEach((m) => {
        let status = getRouteHydrationStatus(m.route, loaderData, errors)
        renderFallback = renderFallback || status.renderFallback
        initialized = initialized && !status.shouldLoad
      })
    }
  }
  let router
  let state = {
    historyAction: init.history.action,
    location: init.history.location,
    matches: initialMatches,
    initialized,
    renderFallback,
    navigation: IDLE_NAVIGATION,
    restoreScrollPosition: init.hydrationData != null ? false : null,
    preventScrollReset: false,
    revalidation: 'idle',
    loaderData: (init.hydrationData && init.hydrationData.loaderData) || {},
    actionData: (init.hydrationData && init.hydrationData.actionData) || null,
    errors: (init.hydrationData && init.hydrationData.errors) || initialErrors,
    fetchers: /* @__PURE__ */ new Map(),
    blockers: /* @__PURE__ */ new Map(),
  }
  let pendingAction = 'POP'
  let pendingPopstateNavigationDfd = null
  let pendingPreventScrollReset = false
  let pendingNavigationController
  let pendingViewTransitionEnabled = false
  let appliedViewTransitions = /* @__PURE__ */ new Map()
  let removePageHideEventListener = null
  let isUninterruptedRevalidation = false
  let isRevalidationRequired = false
  let cancelledFetcherLoads = /* @__PURE__ */ new Set()
  let fetchControllers = /* @__PURE__ */ new Map()
  let incrementingLoadId = 0
  let pendingNavigationLoadId = -1
  let fetchReloadIds = /* @__PURE__ */ new Map()
  let fetchRedirectIds = /* @__PURE__ */ new Set()
  let fetchLoadMatches = /* @__PURE__ */ new Map()
  let activeFetchers = /* @__PURE__ */ new Map()
  let fetchersQueuedForDeletion = /* @__PURE__ */ new Set()
  let blockerFunctions = /* @__PURE__ */ new Map()
  let unblockBlockerHistoryUpdate = void 0
  let pendingRevalidationDfd = null
  function initialize() {
    unlistenHistory = init.history.listen(({ action: historyAction, location, delta }) => {
      if (unblockBlockerHistoryUpdate) {
        unblockBlockerHistoryUpdate()
        unblockBlockerHistoryUpdate = void 0
        return
      }
      warning(
        blockerFunctions.size === 0 || delta != null,
        'You are trying to use a blocker on a POP navigation to a location that was not created by @remix-run/router. This will fail silently in production. This can happen if you are navigating outside the router via `window.history.pushState`/`window.location.hash` instead of using router navigation APIs.  This can also happen if you are using createHashRouter and the user manually changes the URL.',
      )
      let blockerKey = shouldBlockNavigation({
        currentLocation: state.location,
        nextLocation: location,
        historyAction,
      })
      if (blockerKey && delta != null) {
        let nextHistoryUpdatePromise = new Promise((resolve) => {
          unblockBlockerHistoryUpdate = resolve
        })
        init.history.go(delta * -1)
        updateBlocker(blockerKey, {
          state: 'blocked',
          location,
          proceed() {
            updateBlocker(blockerKey, {
              state: 'proceeding',
              proceed: void 0,
              reset: void 0,
              location,
            })
            nextHistoryUpdatePromise.then(() => init.history.go(delta))
          },
          reset() {
            let blockers = new Map(state.blockers)
            blockers.set(blockerKey, IDLE_BLOCKER)
            updateState({ blockers })
          },
        })
        pendingPopstateNavigationDfd?.resolve()
        pendingPopstateNavigationDfd = null
        return
      }
      return startNavigation(historyAction, location)
    })
    if (isBrowser3) {
      restoreAppliedTransitions(routerWindow, appliedViewTransitions)
      let _saveAppliedTransitions = () =>
        persistAppliedTransitions(routerWindow, appliedViewTransitions)
      routerWindow.addEventListener('pagehide', _saveAppliedTransitions)
      removePageHideEventListener = () =>
        routerWindow.removeEventListener('pagehide', _saveAppliedTransitions)
    }
    if (!state.initialized) startNavigation('POP', state.location, { initialHydration: true })
    return router
  }
  function dispose() {
    if (unlistenHistory) unlistenHistory()
    if (removePageHideEventListener) removePageHideEventListener()
    subscribers.clear()
    pendingNavigationController && pendingNavigationController.abort()
    state.fetchers.forEach((_, key) => deleteFetcher(key))
    state.blockers.forEach((_, key) => deleteBlocker(key))
  }
  function subscribe(fn) {
    subscribers.add(fn)
    return () => subscribers.delete(fn)
  }
  function updateState(newState, opts = {}) {
    if (newState.matches)
      newState.matches = newState.matches.map((m) => {
        let route = manifest[m.route.id]
        let matchRoute = m.route
        if (
          matchRoute.element !== route.element ||
          matchRoute.errorElement !== route.errorElement ||
          matchRoute.hydrateFallbackElement !== route.hydrateFallbackElement
        )
          return {
            ...m,
            route,
          }
        return m
      })
    state = {
      ...state,
      ...newState,
    }
    let unmountedFetchers = []
    let mountedFetchers = []
    state.fetchers.forEach((fetcher, key) => {
      if (fetcher.state === 'idle')
        if (fetchersQueuedForDeletion.has(key)) unmountedFetchers.push(key)
        else mountedFetchers.push(key)
    })
    fetchersQueuedForDeletion.forEach((key) => {
      if (!state.fetchers.has(key) && !fetchControllers.has(key)) unmountedFetchers.push(key)
    })
    ;[...subscribers].forEach((subscriber) =>
      subscriber(state, {
        deletedFetchers: unmountedFetchers,
        newErrors: newState.errors ?? null,
        viewTransitionOpts: opts.viewTransitionOpts,
        flushSync: opts.flushSync === true,
      }),
    )
    unmountedFetchers.forEach((key) => deleteFetcher(key))
    mountedFetchers.forEach((key) => state.fetchers.delete(key))
  }
  function completeNavigation(location, newState, { flushSync } = {}) {
    let isActionReload =
      state.actionData != null &&
      state.navigation.formMethod != null &&
      isMutationMethod(state.navigation.formMethod) &&
      state.navigation.state === 'loading' &&
      location.state?._isRedirect !== true
    let actionData
    if (newState.actionData)
      if (Object.keys(newState.actionData).length > 0) actionData = newState.actionData
      else actionData = null
    else if (isActionReload) actionData = state.actionData
    else actionData = null
    let loaderData = newState.loaderData
      ? mergeLoaderData(
          state.loaderData,
          newState.loaderData,
          newState.matches || [],
          newState.errors,
        )
      : state.loaderData
    let blockers = state.blockers
    if (blockers.size > 0) {
      blockers = new Map(blockers)
      blockers.forEach((_, k) => blockers.set(k, IDLE_BLOCKER))
    }
    let restoreScrollPosition = isUninterruptedRevalidation
      ? false
      : getSavedScrollPosition(location, newState.matches || state.matches)
    let preventScrollReset =
      pendingPreventScrollReset === true ||
      (state.navigation.formMethod != null &&
        isMutationMethod(state.navigation.formMethod) &&
        location.state?._isRedirect !== true)
    if (inFlightDataRoutes) {
      dataRoutes = inFlightDataRoutes
      inFlightDataRoutes = void 0
    }
    if (isUninterruptedRevalidation) {
    } else if (pendingAction === 'POP') {
    } else if (pendingAction === 'PUSH') init.history.push(location, location.state)
    else if (pendingAction === 'REPLACE') init.history.replace(location, location.state)
    let viewTransitionOpts
    if (pendingAction === 'POP') {
      let priorPaths = appliedViewTransitions.get(state.location.pathname)
      if (priorPaths && priorPaths.has(location.pathname))
        viewTransitionOpts = {
          currentLocation: state.location,
          nextLocation: location,
        }
      else if (appliedViewTransitions.has(location.pathname))
        viewTransitionOpts = {
          currentLocation: location,
          nextLocation: state.location,
        }
    } else if (pendingViewTransitionEnabled) {
      let toPaths = appliedViewTransitions.get(state.location.pathname)
      if (toPaths) toPaths.add(location.pathname)
      else {
        toPaths = /* @__PURE__ */ new Set([location.pathname])
        appliedViewTransitions.set(state.location.pathname, toPaths)
      }
      viewTransitionOpts = {
        currentLocation: state.location,
        nextLocation: location,
      }
    }
    updateState(
      {
        ...newState,
        actionData,
        loaderData,
        historyAction: pendingAction,
        location,
        initialized: true,
        renderFallback: false,
        navigation: IDLE_NAVIGATION,
        revalidation: 'idle',
        restoreScrollPosition,
        preventScrollReset,
        blockers,
      },
      {
        viewTransitionOpts,
        flushSync: flushSync === true,
      },
    )
    pendingAction = 'POP'
    pendingPreventScrollReset = false
    pendingViewTransitionEnabled = false
    isUninterruptedRevalidation = false
    isRevalidationRequired = false
    pendingPopstateNavigationDfd?.resolve()
    pendingPopstateNavigationDfd = null
    pendingRevalidationDfd?.resolve()
    pendingRevalidationDfd = null
  }
  async function navigate(to, opts) {
    pendingPopstateNavigationDfd?.resolve()
    pendingPopstateNavigationDfd = null
    if (typeof to === 'number') {
      if (!pendingPopstateNavigationDfd) pendingPopstateNavigationDfd = createDeferred()
      let promise = pendingPopstateNavigationDfd.promise
      init.history.go(to)
      return promise
    }
    let { path, submission, error } = normalizeNavigateOptions(
      false,
      normalizeTo(state.location, state.matches, basename, to, opts?.fromRouteId, opts?.relative),
      opts,
    )
    let maskPath
    if (opts?.unstable_mask)
      maskPath = {
        pathname: '',
        search: '',
        hash: '',
        ...(typeof opts.unstable_mask === 'string'
          ? parsePath(opts.unstable_mask)
          : {
              ...state.location.unstable_mask,
              ...opts.unstable_mask,
            }),
      }
    let currentLocation = state.location
    let nextLocation = createLocation(currentLocation, path, opts && opts.state, void 0, maskPath)
    nextLocation = {
      ...nextLocation,
      ...init.history.encodeLocation(nextLocation),
    }
    let userReplace = opts && opts.replace != null ? opts.replace : void 0
    let historyAction = 'PUSH'
    if (userReplace === true) historyAction = 'REPLACE'
    else if (userReplace === false) {
    } else if (
      submission != null &&
      isMutationMethod(submission.formMethod) &&
      submission.formAction === state.location.pathname + state.location.search
    )
      historyAction = 'REPLACE'
    let preventScrollReset =
      opts && 'preventScrollReset' in opts ? opts.preventScrollReset === true : void 0
    let flushSync = (opts && opts.flushSync) === true
    let blockerKey = shouldBlockNavigation({
      currentLocation,
      nextLocation,
      historyAction,
    })
    if (blockerKey) {
      updateBlocker(blockerKey, {
        state: 'blocked',
        location: nextLocation,
        proceed() {
          updateBlocker(blockerKey, {
            state: 'proceeding',
            proceed: void 0,
            reset: void 0,
            location: nextLocation,
          })
          navigate(to, opts)
        },
        reset() {
          let blockers = new Map(state.blockers)
          blockers.set(blockerKey, IDLE_BLOCKER)
          updateState({ blockers })
        },
      })
      return
    }
    await startNavigation(historyAction, nextLocation, {
      submission,
      pendingError: error,
      preventScrollReset,
      replace: opts && opts.replace,
      enableViewTransition: opts && opts.viewTransition,
      flushSync,
      callSiteDefaultShouldRevalidate: opts && opts.unstable_defaultShouldRevalidate,
    })
  }
  function revalidate() {
    if (!pendingRevalidationDfd) pendingRevalidationDfd = createDeferred()
    interruptActiveLoads()
    updateState({ revalidation: 'loading' })
    let promise = pendingRevalidationDfd.promise
    if (state.navigation.state === 'submitting') return promise
    if (state.navigation.state === 'idle') {
      startNavigation(state.historyAction, state.location, { startUninterruptedRevalidation: true })
      return promise
    }
    startNavigation(pendingAction || state.historyAction, state.navigation.location, {
      overrideNavigation: state.navigation,
      enableViewTransition: pendingViewTransitionEnabled === true,
    })
    return promise
  }
  async function startNavigation(historyAction, location, opts) {
    pendingNavigationController && pendingNavigationController.abort()
    pendingNavigationController = null
    pendingAction = historyAction
    isUninterruptedRevalidation = (opts && opts.startUninterruptedRevalidation) === true
    saveScrollPosition(state.location, state.matches)
    pendingPreventScrollReset = (opts && opts.preventScrollReset) === true
    pendingViewTransitionEnabled = (opts && opts.enableViewTransition) === true
    let routesToUse = inFlightDataRoutes || dataRoutes
    let loadingNavigation = opts && opts.overrideNavigation
    let matches =
      opts?.initialHydration && state.matches && state.matches.length > 0 && !initialMatchesIsFOW
        ? state.matches
        : matchRoutes(routesToUse, location, basename)
    let flushSync = (opts && opts.flushSync) === true
    if (
      matches &&
      state.initialized &&
      !isRevalidationRequired &&
      isHashChangeOnly(state.location, location) &&
      !(opts && opts.submission && isMutationMethod(opts.submission.formMethod))
    ) {
      completeNavigation(location, { matches }, { flushSync })
      return
    }
    let fogOfWar = checkFogOfWar(matches, routesToUse, location.pathname)
    if (fogOfWar.active && fogOfWar.matches) matches = fogOfWar.matches
    if (!matches) {
      let { error, notFoundMatches, route } = handleNavigational404(location.pathname)
      completeNavigation(
        location,
        {
          matches: notFoundMatches,
          loaderData: {},
          errors: { [route.id]: error },
        },
        { flushSync },
      )
      return
    }
    pendingNavigationController = new AbortController()
    let request = createClientSideRequest(
      init.history,
      location,
      pendingNavigationController.signal,
      opts && opts.submission,
    )
    let scopedContext = init.getContext ? await init.getContext() : new RouterContextProvider()
    let pendingActionResult
    if (opts && opts.pendingError)
      pendingActionResult = [
        findNearestBoundary(matches).route.id,
        {
          type: 'error',
          error: opts.pendingError,
        },
      ]
    else if (opts && opts.submission && isMutationMethod(opts.submission.formMethod)) {
      let actionResult = await handleAction(
        request,
        location,
        opts.submission,
        matches,
        scopedContext,
        fogOfWar.active,
        opts && opts.initialHydration === true,
        {
          replace: opts.replace,
          flushSync,
        },
      )
      if (actionResult.shortCircuited) return
      if (actionResult.pendingActionResult) {
        let [routeId, result] = actionResult.pendingActionResult
        if (
          isErrorResult(result) &&
          isRouteErrorResponse(result.error) &&
          result.error.status === 404
        ) {
          pendingNavigationController = null
          completeNavigation(location, {
            matches: actionResult.matches,
            loaderData: {},
            errors: { [routeId]: result.error },
          })
          return
        }
      }
      matches = actionResult.matches || matches
      pendingActionResult = actionResult.pendingActionResult
      loadingNavigation = getLoadingNavigation(location, opts.submission)
      flushSync = false
      fogOfWar.active = false
      request = createClientSideRequest(init.history, request.url, request.signal)
    }
    let {
      shortCircuited,
      matches: updatedMatches,
      loaderData,
      errors,
    } = await handleLoaders(
      request,
      location,
      matches,
      scopedContext,
      fogOfWar.active,
      loadingNavigation,
      opts && opts.submission,
      opts && opts.fetcherSubmission,
      opts && opts.replace,
      opts && opts.initialHydration === true,
      flushSync,
      pendingActionResult,
      opts && opts.callSiteDefaultShouldRevalidate,
    )
    if (shortCircuited) return
    pendingNavigationController = null
    completeNavigation(location, {
      matches: updatedMatches || matches,
      ...getActionDataForCommit(pendingActionResult),
      loaderData,
      errors,
    })
  }
  async function handleAction(
    request,
    location,
    submission,
    matches,
    scopedContext,
    isFogOfWar,
    initialHydration,
    opts = {},
  ) {
    interruptActiveLoads()
    updateState(
      { navigation: getSubmittingNavigation(location, submission) },
      { flushSync: opts.flushSync === true },
    )
    if (isFogOfWar) {
      let discoverResult = await discoverRoutes(matches, location.pathname, request.signal)
      if (discoverResult.type === 'aborted') return { shortCircuited: true }
      else if (discoverResult.type === 'error') {
        if (discoverResult.partialMatches.length === 0) {
          let { matches: matches2, route } = getShortCircuitMatches(dataRoutes)
          return {
            matches: matches2,
            pendingActionResult: [
              route.id,
              {
                type: 'error',
                error: discoverResult.error,
              },
            ],
          }
        }
        let boundaryId = findNearestBoundary(discoverResult.partialMatches).route.id
        return {
          matches: discoverResult.partialMatches,
          pendingActionResult: [
            boundaryId,
            {
              type: 'error',
              error: discoverResult.error,
            },
          ],
        }
      } else if (!discoverResult.matches) {
        let { notFoundMatches, error, route } = handleNavigational404(location.pathname)
        return {
          matches: notFoundMatches,
          pendingActionResult: [
            route.id,
            {
              type: 'error',
              error,
            },
          ],
        }
      } else matches = discoverResult.matches
    }
    let result
    let actionMatch = getTargetMatch(matches, location)
    if (!actionMatch.route.action && !actionMatch.route.lazy)
      result = {
        type: 'error',
        error: getInternalRouterError(405, {
          method: request.method,
          pathname: location.pathname,
          routeId: actionMatch.route.id,
        }),
      }
    else {
      let results = await callDataStrategy(
        request,
        location,
        getTargetedDataStrategyMatches(
          mapRouteProperties2,
          manifest,
          request,
          location,
          matches,
          actionMatch,
          initialHydration ? [] : hydrationRouteProperties2,
          scopedContext,
        ),
        scopedContext,
        null,
      )
      result = results[actionMatch.route.id]
      if (!result) {
        for (let match of matches)
          if (results[match.route.id]) {
            result = results[match.route.id]
            break
          }
      }
      if (request.signal.aborted) return { shortCircuited: true }
    }
    if (isRedirectResult(result)) {
      let replace2
      if (opts && opts.replace != null) replace2 = opts.replace
      else
        replace2 =
          normalizeRedirectLocation(
            result.response.headers.get('Location'),
            new URL(request.url),
            basename,
            init.history,
          ) ===
          state.location.pathname + state.location.search
      await startRedirectNavigation(request, result, true, {
        submission,
        replace: replace2,
      })
      return { shortCircuited: true }
    }
    if (isErrorResult(result)) {
      let boundaryMatch = findNearestBoundary(matches, actionMatch.route.id)
      if ((opts && opts.replace) !== true) pendingAction = 'PUSH'
      return {
        matches,
        pendingActionResult: [boundaryMatch.route.id, result, actionMatch.route.id],
      }
    }
    return {
      matches,
      pendingActionResult: [actionMatch.route.id, result],
    }
  }
  async function handleLoaders(
    request,
    location,
    matches,
    scopedContext,
    isFogOfWar,
    overrideNavigation,
    submission,
    fetcherSubmission,
    replace2,
    initialHydration,
    flushSync,
    pendingActionResult,
    callSiteDefaultShouldRevalidate,
  ) {
    let loadingNavigation = overrideNavigation || getLoadingNavigation(location, submission)
    let activeSubmission =
      submission || fetcherSubmission || getSubmissionFromNavigation(loadingNavigation)
    let shouldUpdateNavigationState = !isUninterruptedRevalidation && !initialHydration
    if (isFogOfWar) {
      if (shouldUpdateNavigationState) {
        let actionData = getUpdatedActionData(pendingActionResult)
        updateState(
          {
            navigation: loadingNavigation,
            ...(actionData !== void 0 ? { actionData } : {}),
          },
          { flushSync },
        )
      }
      let discoverResult = await discoverRoutes(matches, location.pathname, request.signal)
      if (discoverResult.type === 'aborted') return { shortCircuited: true }
      else if (discoverResult.type === 'error') {
        if (discoverResult.partialMatches.length === 0) {
          let { matches: matches2, route } = getShortCircuitMatches(dataRoutes)
          return {
            matches: matches2,
            loaderData: {},
            errors: { [route.id]: discoverResult.error },
          }
        }
        let boundaryId = findNearestBoundary(discoverResult.partialMatches).route.id
        return {
          matches: discoverResult.partialMatches,
          loaderData: {},
          errors: { [boundaryId]: discoverResult.error },
        }
      } else if (!discoverResult.matches) {
        let { error, notFoundMatches, route } = handleNavigational404(location.pathname)
        return {
          matches: notFoundMatches,
          loaderData: {},
          errors: { [route.id]: error },
        }
      } else matches = discoverResult.matches
    }
    let routesToUse = inFlightDataRoutes || dataRoutes
    let { dsMatches, revalidatingFetchers } = getMatchesToLoad(
      request,
      scopedContext,
      mapRouteProperties2,
      manifest,
      init.history,
      state,
      matches,
      activeSubmission,
      location,
      initialHydration ? [] : hydrationRouteProperties2,
      initialHydration === true,
      isRevalidationRequired,
      cancelledFetcherLoads,
      fetchersQueuedForDeletion,
      fetchLoadMatches,
      fetchRedirectIds,
      routesToUse,
      basename,
      init.patchRoutesOnNavigation != null,
      pendingActionResult,
      callSiteDefaultShouldRevalidate,
    )
    pendingNavigationLoadId = ++incrementingLoadId
    if (
      !init.dataStrategy &&
      !dsMatches.some((m) => m.shouldLoad) &&
      !dsMatches.some((m) => m.route.middleware && m.route.middleware.length > 0) &&
      revalidatingFetchers.length === 0
    ) {
      let updatedFetchers2 = markFetchRedirectsDone()
      completeNavigation(
        location,
        {
          matches,
          loaderData: {},
          errors:
            pendingActionResult && isErrorResult(pendingActionResult[1])
              ? { [pendingActionResult[0]]: pendingActionResult[1].error }
              : null,
          ...getActionDataForCommit(pendingActionResult),
          ...(updatedFetchers2 ? { fetchers: new Map(state.fetchers) } : {}),
        },
        { flushSync },
      )
      return { shortCircuited: true }
    }
    if (shouldUpdateNavigationState) {
      let updates = {}
      if (!isFogOfWar) {
        updates.navigation = loadingNavigation
        let actionData = getUpdatedActionData(pendingActionResult)
        if (actionData !== void 0) updates.actionData = actionData
      }
      if (revalidatingFetchers.length > 0)
        updates.fetchers = getUpdatedRevalidatingFetchers(revalidatingFetchers)
      updateState(updates, { flushSync })
    }
    revalidatingFetchers.forEach((rf) => {
      abortFetcher(rf.key)
      if (rf.controller) fetchControllers.set(rf.key, rf.controller)
    })
    let abortPendingFetchRevalidations = () =>
      revalidatingFetchers.forEach((f) => abortFetcher(f.key))
    if (pendingNavigationController)
      pendingNavigationController.signal.addEventListener('abort', abortPendingFetchRevalidations)
    let { loaderResults, fetcherResults } = await callLoadersAndMaybeResolveData(
      dsMatches,
      revalidatingFetchers,
      request,
      location,
      scopedContext,
    )
    if (request.signal.aborted) return { shortCircuited: true }
    if (pendingNavigationController)
      pendingNavigationController.signal.removeEventListener(
        'abort',
        abortPendingFetchRevalidations,
      )
    revalidatingFetchers.forEach((rf) => fetchControllers.delete(rf.key))
    let redirect2 = findRedirect(loaderResults)
    if (redirect2) {
      await startRedirectNavigation(request, redirect2.result, true, { replace: replace2 })
      return { shortCircuited: true }
    }
    redirect2 = findRedirect(fetcherResults)
    if (redirect2) {
      fetchRedirectIds.add(redirect2.key)
      await startRedirectNavigation(request, redirect2.result, true, { replace: replace2 })
      return { shortCircuited: true }
    }
    let { loaderData, errors } = processLoaderData(
      state,
      matches,
      loaderResults,
      pendingActionResult,
      revalidatingFetchers,
      fetcherResults,
    )
    if (initialHydration && state.errors)
      errors = {
        ...state.errors,
        ...errors,
      }
    let updatedFetchers = markFetchRedirectsDone()
    let didAbortFetchLoads = abortStaleFetchLoads(pendingNavigationLoadId)
    let shouldUpdateFetchers =
      updatedFetchers || didAbortFetchLoads || revalidatingFetchers.length > 0
    return {
      matches,
      loaderData,
      errors,
      ...(shouldUpdateFetchers ? { fetchers: new Map(state.fetchers) } : {}),
    }
  }
  function getUpdatedActionData(pendingActionResult) {
    if (pendingActionResult && !isErrorResult(pendingActionResult[1]))
      return { [pendingActionResult[0]]: pendingActionResult[1].data }
    else if (state.actionData)
      if (Object.keys(state.actionData).length === 0) return null
      else return state.actionData
  }
  function getUpdatedRevalidatingFetchers(revalidatingFetchers) {
    revalidatingFetchers.forEach((rf) => {
      let fetcher = state.fetchers.get(rf.key)
      let revalidatingFetcher = getLoadingFetcher(void 0, fetcher ? fetcher.data : void 0)
      state.fetchers.set(rf.key, revalidatingFetcher)
    })
    return new Map(state.fetchers)
  }
  async function fetch2(key, routeId, href, opts) {
    abortFetcher(key)
    let flushSync = (opts && opts.flushSync) === true
    let routesToUse = inFlightDataRoutes || dataRoutes
    let normalizedPath = normalizeTo(
      state.location,
      state.matches,
      basename,
      href,
      routeId,
      opts?.relative,
    )
    let matches = matchRoutes(routesToUse, normalizedPath, basename)
    let fogOfWar = checkFogOfWar(matches, routesToUse, normalizedPath)
    if (fogOfWar.active && fogOfWar.matches) matches = fogOfWar.matches
    if (!matches) {
      setFetcherError(key, routeId, getInternalRouterError(404, { pathname: normalizedPath }), {
        flushSync,
      })
      return
    }
    let { path, submission, error } = normalizeNavigateOptions(true, normalizedPath, opts)
    if (error) {
      setFetcherError(key, routeId, error, { flushSync })
      return
    }
    let scopedContext = init.getContext ? await init.getContext() : new RouterContextProvider()
    let preventScrollReset = (opts && opts.preventScrollReset) === true
    if (submission && isMutationMethod(submission.formMethod)) {
      await handleFetcherAction(
        key,
        routeId,
        path,
        matches,
        scopedContext,
        fogOfWar.active,
        flushSync,
        preventScrollReset,
        submission,
        opts && opts.unstable_defaultShouldRevalidate,
      )
      return
    }
    fetchLoadMatches.set(key, {
      routeId,
      path,
    })
    await handleFetcherLoader(
      key,
      routeId,
      path,
      matches,
      scopedContext,
      fogOfWar.active,
      flushSync,
      preventScrollReset,
      submission,
    )
  }
  async function handleFetcherAction(
    key,
    routeId,
    path,
    requestMatches,
    scopedContext,
    isFogOfWar,
    flushSync,
    preventScrollReset,
    submission,
    callSiteDefaultShouldRevalidate,
  ) {
    interruptActiveLoads()
    fetchLoadMatches.delete(key)
    updateFetcherState(key, getSubmittingFetcher(submission, state.fetchers.get(key)), {
      flushSync,
    })
    let abortController = new AbortController()
    let fetchRequest = createClientSideRequest(
      init.history,
      path,
      abortController.signal,
      submission,
    )
    if (isFogOfWar) {
      let discoverResult = await discoverRoutes(
        requestMatches,
        new URL(fetchRequest.url).pathname,
        fetchRequest.signal,
        key,
      )
      if (discoverResult.type === 'aborted') return
      else if (discoverResult.type === 'error') {
        setFetcherError(key, routeId, discoverResult.error, { flushSync })
        return
      } else if (!discoverResult.matches) {
        setFetcherError(key, routeId, getInternalRouterError(404, { pathname: path }), {
          flushSync,
        })
        return
      } else requestMatches = discoverResult.matches
    }
    let match = getTargetMatch(requestMatches, path)
    if (!match.route.action && !match.route.lazy) {
      setFetcherError(
        key,
        routeId,
        getInternalRouterError(405, {
          method: submission.formMethod,
          pathname: path,
          routeId,
        }),
        { flushSync },
      )
      return
    }
    fetchControllers.set(key, abortController)
    let originatingLoadId = incrementingLoadId
    let fetchMatches = getTargetedDataStrategyMatches(
      mapRouteProperties2,
      manifest,
      fetchRequest,
      path,
      requestMatches,
      match,
      hydrationRouteProperties2,
      scopedContext,
    )
    let actionResults = await callDataStrategy(fetchRequest, path, fetchMatches, scopedContext, key)
    let actionResult = actionResults[match.route.id]
    if (!actionResult) {
      for (let match2 of fetchMatches)
        if (actionResults[match2.route.id]) {
          actionResult = actionResults[match2.route.id]
          break
        }
    }
    if (fetchRequest.signal.aborted) {
      if (fetchControllers.get(key) === abortController) fetchControllers.delete(key)
      return
    }
    if (fetchersQueuedForDeletion.has(key)) {
      if (isRedirectResult(actionResult) || isErrorResult(actionResult)) {
        updateFetcherState(key, getDoneFetcher(void 0))
        return
      }
    } else {
      if (isRedirectResult(actionResult)) {
        fetchControllers.delete(key)
        if (pendingNavigationLoadId > originatingLoadId) {
          updateFetcherState(key, getDoneFetcher(void 0))
          return
        } else {
          fetchRedirectIds.add(key)
          updateFetcherState(key, getLoadingFetcher(submission))
          return startRedirectNavigation(fetchRequest, actionResult, false, {
            fetcherSubmission: submission,
            preventScrollReset,
          })
        }
      }
      if (isErrorResult(actionResult)) {
        setFetcherError(key, routeId, actionResult.error)
        return
      }
    }
    let nextLocation = state.navigation.location || state.location
    let revalidationRequest = createClientSideRequest(
      init.history,
      nextLocation,
      abortController.signal,
    )
    let routesToUse = inFlightDataRoutes || dataRoutes
    let matches =
      state.navigation.state !== 'idle'
        ? matchRoutes(routesToUse, state.navigation.location, basename)
        : state.matches
    invariant(matches, "Didn't find any matches after fetcher action")
    let loadId = ++incrementingLoadId
    fetchReloadIds.set(key, loadId)
    let loadFetcher = getLoadingFetcher(submission, actionResult.data)
    state.fetchers.set(key, loadFetcher)
    let { dsMatches, revalidatingFetchers } = getMatchesToLoad(
      revalidationRequest,
      scopedContext,
      mapRouteProperties2,
      manifest,
      init.history,
      state,
      matches,
      submission,
      nextLocation,
      hydrationRouteProperties2,
      false,
      isRevalidationRequired,
      cancelledFetcherLoads,
      fetchersQueuedForDeletion,
      fetchLoadMatches,
      fetchRedirectIds,
      routesToUse,
      basename,
      init.patchRoutesOnNavigation != null,
      [match.route.id, actionResult],
      callSiteDefaultShouldRevalidate,
    )
    revalidatingFetchers
      .filter((rf) => rf.key !== key)
      .forEach((rf) => {
        let staleKey = rf.key
        let existingFetcher2 = state.fetchers.get(staleKey)
        let revalidatingFetcher = getLoadingFetcher(
          void 0,
          existingFetcher2 ? existingFetcher2.data : void 0,
        )
        state.fetchers.set(staleKey, revalidatingFetcher)
        abortFetcher(staleKey)
        if (rf.controller) fetchControllers.set(staleKey, rf.controller)
      })
    updateState({ fetchers: new Map(state.fetchers) })
    let abortPendingFetchRevalidations = () =>
      revalidatingFetchers.forEach((rf) => abortFetcher(rf.key))
    abortController.signal.addEventListener('abort', abortPendingFetchRevalidations)
    let { loaderResults, fetcherResults } = await callLoadersAndMaybeResolveData(
      dsMatches,
      revalidatingFetchers,
      revalidationRequest,
      nextLocation,
      scopedContext,
    )
    if (abortController.signal.aborted) return
    abortController.signal.removeEventListener('abort', abortPendingFetchRevalidations)
    fetchReloadIds.delete(key)
    fetchControllers.delete(key)
    revalidatingFetchers.forEach((r) => fetchControllers.delete(r.key))
    if (state.fetchers.has(key)) {
      let doneFetcher = getDoneFetcher(actionResult.data)
      state.fetchers.set(key, doneFetcher)
    }
    let redirect2 = findRedirect(loaderResults)
    if (redirect2)
      return startRedirectNavigation(revalidationRequest, redirect2.result, false, {
        preventScrollReset,
      })
    redirect2 = findRedirect(fetcherResults)
    if (redirect2) {
      fetchRedirectIds.add(redirect2.key)
      return startRedirectNavigation(revalidationRequest, redirect2.result, false, {
        preventScrollReset,
      })
    }
    let { loaderData, errors } = processLoaderData(
      state,
      matches,
      loaderResults,
      void 0,
      revalidatingFetchers,
      fetcherResults,
    )
    abortStaleFetchLoads(loadId)
    if (state.navigation.state === 'loading' && loadId > pendingNavigationLoadId) {
      invariant(pendingAction, 'Expected pending action')
      pendingNavigationController && pendingNavigationController.abort()
      completeNavigation(state.navigation.location, {
        matches,
        loaderData,
        errors,
        fetchers: new Map(state.fetchers),
      })
    } else {
      updateState({
        errors,
        loaderData: mergeLoaderData(state.loaderData, loaderData, matches, errors),
        fetchers: new Map(state.fetchers),
      })
      isRevalidationRequired = false
    }
  }
  async function handleFetcherLoader(
    key,
    routeId,
    path,
    matches,
    scopedContext,
    isFogOfWar,
    flushSync,
    preventScrollReset,
    submission,
  ) {
    let existingFetcher = state.fetchers.get(key)
    updateFetcherState(
      key,
      getLoadingFetcher(submission, existingFetcher ? existingFetcher.data : void 0),
      { flushSync },
    )
    let abortController = new AbortController()
    let fetchRequest = createClientSideRequest(init.history, path, abortController.signal)
    if (isFogOfWar) {
      let discoverResult = await discoverRoutes(
        matches,
        new URL(fetchRequest.url).pathname,
        fetchRequest.signal,
        key,
      )
      if (discoverResult.type === 'aborted') return
      else if (discoverResult.type === 'error') {
        setFetcherError(key, routeId, discoverResult.error, { flushSync })
        return
      } else if (!discoverResult.matches) {
        setFetcherError(key, routeId, getInternalRouterError(404, { pathname: path }), {
          flushSync,
        })
        return
      } else matches = discoverResult.matches
    }
    let match = getTargetMatch(matches, path)
    fetchControllers.set(key, abortController)
    let originatingLoadId = incrementingLoadId
    let result = (
      await callDataStrategy(
        fetchRequest,
        path,
        getTargetedDataStrategyMatches(
          mapRouteProperties2,
          manifest,
          fetchRequest,
          path,
          matches,
          match,
          hydrationRouteProperties2,
          scopedContext,
        ),
        scopedContext,
        key,
      )
    )[match.route.id]
    if (fetchControllers.get(key) === abortController) fetchControllers.delete(key)
    if (fetchRequest.signal.aborted) return
    if (fetchersQueuedForDeletion.has(key)) {
      updateFetcherState(key, getDoneFetcher(void 0))
      return
    }
    if (isRedirectResult(result))
      if (pendingNavigationLoadId > originatingLoadId) {
        updateFetcherState(key, getDoneFetcher(void 0))
        return
      } else {
        fetchRedirectIds.add(key)
        await startRedirectNavigation(fetchRequest, result, false, { preventScrollReset })
        return
      }
    if (isErrorResult(result)) {
      setFetcherError(key, routeId, result.error)
      return
    }
    updateFetcherState(key, getDoneFetcher(result.data))
  }
  async function startRedirectNavigation(
    request,
    redirect2,
    isNavigation,
    { submission, fetcherSubmission, preventScrollReset, replace: replace2 } = {},
  ) {
    if (!isNavigation) {
      pendingPopstateNavigationDfd?.resolve()
      pendingPopstateNavigationDfd = null
    }
    if (redirect2.response.headers.has('X-Remix-Revalidate')) isRevalidationRequired = true
    let location = redirect2.response.headers.get('Location')
    invariant(location, 'Expected a Location header on the redirect Response')
    location = normalizeRedirectLocation(location, new URL(request.url), basename, init.history)
    let redirectLocation = createLocation(state.location, location, { _isRedirect: true })
    if (isBrowser3) {
      let isDocumentReload = false
      if (redirect2.response.headers.has('X-Remix-Reload-Document')) isDocumentReload = true
      else if (isAbsoluteUrl(location)) {
        const url = createBrowserURLImpl(location, true)
        isDocumentReload =
          url.origin !== routerWindow.location.origin ||
          stripBasename(url.pathname, basename) == null
      }
      if (isDocumentReload) {
        if (replace2) routerWindow.location.replace(location)
        else routerWindow.location.assign(location)
        return
      }
    }
    pendingNavigationController = null
    let redirectNavigationType =
      replace2 === true || redirect2.response.headers.has('X-Remix-Replace') ? 'REPLACE' : 'PUSH'
    let { formMethod, formAction, formEncType } = state.navigation
    if (!submission && !fetcherSubmission && formMethod && formAction && formEncType)
      submission = getSubmissionFromNavigation(state.navigation)
    let activeSubmission = submission || fetcherSubmission
    if (
      redirectPreserveMethodStatusCodes.has(redirect2.response.status) &&
      activeSubmission &&
      isMutationMethod(activeSubmission.formMethod)
    )
      await startNavigation(redirectNavigationType, redirectLocation, {
        submission: {
          ...activeSubmission,
          formAction: location,
        },
        preventScrollReset: preventScrollReset || pendingPreventScrollReset,
        enableViewTransition: isNavigation ? pendingViewTransitionEnabled : void 0,
      })
    else
      await startNavigation(redirectNavigationType, redirectLocation, {
        overrideNavigation: getLoadingNavigation(redirectLocation, submission),
        fetcherSubmission,
        preventScrollReset: preventScrollReset || pendingPreventScrollReset,
        enableViewTransition: isNavigation ? pendingViewTransitionEnabled : void 0,
      })
  }
  async function callDataStrategy(request, path, matches, scopedContext, fetcherKey) {
    let results
    let dataResults = {}
    try {
      results = await callDataStrategyImpl(
        dataStrategyImpl,
        request,
        path,
        matches,
        fetcherKey,
        scopedContext,
        false,
      )
    } catch (e) {
      matches
        .filter((m) => m.shouldLoad)
        .forEach((m) => {
          dataResults[m.route.id] = {
            type: 'error',
            error: e,
          }
        })
      return dataResults
    }
    if (request.signal.aborted) return dataResults
    if (!isMutationMethod(request.method))
      for (let match of matches) {
        if (results[match.route.id]?.type === 'error') break
        if (
          !results.hasOwnProperty(match.route.id) &&
          !state.loaderData.hasOwnProperty(match.route.id) &&
          (!state.errors || !state.errors.hasOwnProperty(match.route.id)) &&
          match.shouldCallHandler()
        )
          results[match.route.id] = {
            type: 'error',
            result: /* @__PURE__ */ new Error(
              `No result returned from dataStrategy for route ${match.route.id}`,
            ),
          }
      }
    for (let [routeId, result] of Object.entries(results))
      if (isRedirectDataStrategyResult(result)) {
        let response = result.result
        dataResults[routeId] = {
          type: 'redirect',
          response: normalizeRelativeRoutingRedirectResponse(
            response,
            request,
            routeId,
            matches,
            basename,
          ),
        }
      } else dataResults[routeId] = await convertDataStrategyResultToDataResult(result)
    return dataResults
  }
  async function callLoadersAndMaybeResolveData(
    matches,
    fetchersToLoad,
    request,
    location,
    scopedContext,
  ) {
    let loaderResultsPromise = callDataStrategy(request, location, matches, scopedContext, null)
    let fetcherResultsPromise = Promise.all(
      fetchersToLoad.map(async (f) => {
        if (f.matches && f.match && f.request && f.controller) {
          let result = (await callDataStrategy(f.request, f.path, f.matches, scopedContext, f.key))[
            f.match.route.id
          ]
          return { [f.key]: result }
        } else
          return Promise.resolve({
            [f.key]: {
              type: 'error',
              error: getInternalRouterError(404, { pathname: f.path }),
            },
          })
      }),
    )
    return {
      loaderResults: await loaderResultsPromise,
      fetcherResults: (await fetcherResultsPromise).reduce((acc, r) => Object.assign(acc, r), {}),
    }
  }
  function interruptActiveLoads() {
    isRevalidationRequired = true
    fetchLoadMatches.forEach((_, key) => {
      if (fetchControllers.has(key)) cancelledFetcherLoads.add(key)
      abortFetcher(key)
    })
  }
  function updateFetcherState(key, fetcher, opts = {}) {
    state.fetchers.set(key, fetcher)
    updateState(
      { fetchers: new Map(state.fetchers) },
      { flushSync: (opts && opts.flushSync) === true },
    )
  }
  function setFetcherError(key, routeId, error, opts = {}) {
    let boundaryMatch = findNearestBoundary(state.matches, routeId)
    deleteFetcher(key)
    updateState(
      {
        errors: { [boundaryMatch.route.id]: error },
        fetchers: new Map(state.fetchers),
      },
      { flushSync: (opts && opts.flushSync) === true },
    )
  }
  function getFetcher(key) {
    activeFetchers.set(key, (activeFetchers.get(key) || 0) + 1)
    if (fetchersQueuedForDeletion.has(key)) fetchersQueuedForDeletion.delete(key)
    return state.fetchers.get(key) || IDLE_FETCHER
  }
  function resetFetcher(key, opts) {
    abortFetcher(key, opts?.reason)
    updateFetcherState(key, getDoneFetcher(null))
  }
  function deleteFetcher(key) {
    let fetcher = state.fetchers.get(key)
    if (
      fetchControllers.has(key) &&
      !(fetcher && fetcher.state === 'loading' && fetchReloadIds.has(key))
    )
      abortFetcher(key)
    fetchLoadMatches.delete(key)
    fetchReloadIds.delete(key)
    fetchRedirectIds.delete(key)
    fetchersQueuedForDeletion.delete(key)
    cancelledFetcherLoads.delete(key)
    state.fetchers.delete(key)
  }
  function queueFetcherForDeletion(key) {
    let count = (activeFetchers.get(key) || 0) - 1
    if (count <= 0) {
      activeFetchers.delete(key)
      fetchersQueuedForDeletion.add(key)
    } else activeFetchers.set(key, count)
    updateState({ fetchers: new Map(state.fetchers) })
  }
  function abortFetcher(key, reason) {
    let controller = fetchControllers.get(key)
    if (controller) {
      controller.abort(reason)
      fetchControllers.delete(key)
    }
  }
  function markFetchersDone(keys) {
    for (let key of keys) {
      let doneFetcher = getDoneFetcher(getFetcher(key).data)
      state.fetchers.set(key, doneFetcher)
    }
  }
  function markFetchRedirectsDone() {
    let doneKeys = []
    let updatedFetchers = false
    for (let key of fetchRedirectIds) {
      let fetcher = state.fetchers.get(key)
      invariant(fetcher, `Expected fetcher: ${key}`)
      if (fetcher.state === 'loading') {
        fetchRedirectIds.delete(key)
        doneKeys.push(key)
        updatedFetchers = true
      }
    }
    markFetchersDone(doneKeys)
    return updatedFetchers
  }
  function abortStaleFetchLoads(landedId) {
    let yeetedKeys = []
    for (let [key, id] of fetchReloadIds)
      if (id < landedId) {
        let fetcher = state.fetchers.get(key)
        invariant(fetcher, `Expected fetcher: ${key}`)
        if (fetcher.state === 'loading') {
          abortFetcher(key)
          fetchReloadIds.delete(key)
          yeetedKeys.push(key)
        }
      }
    markFetchersDone(yeetedKeys)
    return yeetedKeys.length > 0
  }
  function getBlocker(key, fn) {
    let blocker = state.blockers.get(key) || IDLE_BLOCKER
    if (blockerFunctions.get(key) !== fn) blockerFunctions.set(key, fn)
    return blocker
  }
  function deleteBlocker(key) {
    state.blockers.delete(key)
    blockerFunctions.delete(key)
  }
  function updateBlocker(key, newBlocker) {
    let blocker = state.blockers.get(key) || IDLE_BLOCKER
    invariant(
      (blocker.state === 'unblocked' && newBlocker.state === 'blocked') ||
        (blocker.state === 'blocked' && newBlocker.state === 'blocked') ||
        (blocker.state === 'blocked' && newBlocker.state === 'proceeding') ||
        (blocker.state === 'blocked' && newBlocker.state === 'unblocked') ||
        (blocker.state === 'proceeding' && newBlocker.state === 'unblocked'),
      `Invalid blocker state transition: ${blocker.state} -> ${newBlocker.state}`,
    )
    let blockers = new Map(state.blockers)
    blockers.set(key, newBlocker)
    updateState({ blockers })
  }
  function shouldBlockNavigation({ currentLocation, nextLocation, historyAction }) {
    if (blockerFunctions.size === 0) return
    if (blockerFunctions.size > 1) warning(false, 'A router only supports one blocker at a time')
    let entries = Array.from(blockerFunctions.entries())
    let [blockerKey, blockerFunction] = entries[entries.length - 1]
    let blocker = state.blockers.get(blockerKey)
    if (blocker && blocker.state === 'proceeding') return
    if (
      blockerFunction({
        currentLocation,
        nextLocation,
        historyAction,
      })
    )
      return blockerKey
  }
  function handleNavigational404(pathname) {
    let error = getInternalRouterError(404, { pathname })
    let { matches, route } = getShortCircuitMatches(inFlightDataRoutes || dataRoutes)
    return {
      notFoundMatches: matches,
      route,
      error,
    }
  }
  function enableScrollRestoration(positions, getPosition, getKey) {
    savedScrollPositions2 = positions
    getScrollPosition = getPosition
    getScrollRestorationKey2 = getKey || null
    if (!initialScrollRestored && state.navigation === IDLE_NAVIGATION) {
      initialScrollRestored = true
      let y = getSavedScrollPosition(state.location, state.matches)
      if (y != null) updateState({ restoreScrollPosition: y })
    }
    return () => {
      savedScrollPositions2 = null
      getScrollPosition = null
      getScrollRestorationKey2 = null
    }
  }
  function getScrollKey(location, matches) {
    if (getScrollRestorationKey2)
      return (
        getScrollRestorationKey2(
          location,
          matches.map((m) => convertRouteMatchToUiMatch(m, state.loaderData)),
        ) || location.key
      )
    return location.key
  }
  function saveScrollPosition(location, matches) {
    if (savedScrollPositions2 && getScrollPosition) {
      let key = getScrollKey(location, matches)
      savedScrollPositions2[key] = getScrollPosition()
    }
  }
  function getSavedScrollPosition(location, matches) {
    if (savedScrollPositions2) {
      let key = getScrollKey(location, matches)
      let y = savedScrollPositions2[key]
      if (typeof y === 'number') return y
    }
    return null
  }
  function checkFogOfWar(matches, routesToUse, pathname) {
    if (init.patchRoutesOnNavigation) {
      if (!matches)
        return {
          active: true,
          matches: matchRoutesImpl(routesToUse, pathname, basename, true) || [],
        }
      else if (Object.keys(matches[0].params).length > 0)
        return {
          active: true,
          matches: matchRoutesImpl(routesToUse, pathname, basename, true),
        }
    }
    return {
      active: false,
      matches: null,
    }
  }
  async function discoverRoutes(matches, pathname, signal, fetcherKey) {
    if (!init.patchRoutesOnNavigation)
      return {
        type: 'success',
        matches,
      }
    let partialMatches = matches
    while (true) {
      let isNonHMR = inFlightDataRoutes == null
      let routesToUse = inFlightDataRoutes || dataRoutes
      let localManifest = manifest
      try {
        await init.patchRoutesOnNavigation({
          signal,
          path: pathname,
          matches: partialMatches,
          fetcherKey,
          patch: (routeId, children) => {
            if (signal.aborted) return
            patchRoutesImpl(
              routeId,
              children,
              routesToUse,
              localManifest,
              mapRouteProperties2,
              false,
            )
          },
        })
      } catch (e) {
        return {
          type: 'error',
          error: e,
          partialMatches,
        }
      } finally {
        if (isNonHMR && !signal.aborted) dataRoutes = [...dataRoutes]
      }
      if (signal.aborted) return { type: 'aborted' }
      let newMatches = matchRoutes(routesToUse, pathname, basename)
      let newPartialMatches = null
      if (newMatches)
        if (Object.keys(newMatches[0].params).length === 0)
          return {
            type: 'success',
            matches: newMatches,
          }
        else {
          newPartialMatches = matchRoutesImpl(routesToUse, pathname, basename, true)
          if (
            !(
              newPartialMatches &&
              partialMatches.length < newPartialMatches.length &&
              compareMatches(partialMatches, newPartialMatches.slice(0, partialMatches.length))
            )
          )
            return {
              type: 'success',
              matches: newMatches,
            }
        }
      if (!newPartialMatches)
        newPartialMatches = matchRoutesImpl(routesToUse, pathname, basename, true)
      if (!newPartialMatches || compareMatches(partialMatches, newPartialMatches))
        return {
          type: 'success',
          matches: null,
        }
      partialMatches = newPartialMatches
    }
  }
  function compareMatches(a, b) {
    return a.length === b.length && a.every((m, i) => m.route.id === b[i].route.id)
  }
  function _internalSetRoutes(newRoutes) {
    manifest = {}
    inFlightDataRoutes = convertRoutesToDataRoutes(newRoutes, mapRouteProperties2, void 0, manifest)
  }
  function patchRoutes(routeId, children, unstable_allowElementMutations = false) {
    let isNonHMR = inFlightDataRoutes == null
    patchRoutesImpl(
      routeId,
      children,
      inFlightDataRoutes || dataRoutes,
      manifest,
      mapRouteProperties2,
      unstable_allowElementMutations,
    )
    if (isNonHMR) {
      dataRoutes = [...dataRoutes]
      updateState({})
    }
  }
  router = {
    get basename() {
      return basename
    },
    get future() {
      return future
    },
    get state() {
      return state
    },
    get routes() {
      return dataRoutes
    },
    get window() {
      return routerWindow
    },
    initialize,
    subscribe,
    enableScrollRestoration,
    navigate,
    fetch: fetch2,
    revalidate,
    createHref: (to) => init.history.createHref(to),
    encodeLocation: (to) => init.history.encodeLocation(to),
    getFetcher,
    resetFetcher,
    deleteFetcher: queueFetcherForDeletion,
    dispose,
    getBlocker,
    deleteBlocker,
    patchRoutes,
    _internalFetchControllers: fetchControllers,
    _internalSetRoutes,
    _internalSetStateDoNotUseOrYouWillBreakYourApp(newState) {
      updateState(newState)
    },
  }
  if (init.unstable_instrumentations)
    router = instrumentClientSideRouter(
      router,
      init.unstable_instrumentations.map((i) => i.router).filter(Boolean),
    )
  return router
}
function isSubmissionNavigation(opts) {
  return (
    opts != null &&
    (('formData' in opts && opts.formData != null) || ('body' in opts && opts.body !== void 0))
  )
}
function normalizeTo(location, matches, basename, to, fromRouteId, relative) {
  let contextualMatches
  let activeRouteMatch
  if (fromRouteId) {
    contextualMatches = []
    for (let match of matches) {
      contextualMatches.push(match)
      if (match.route.id === fromRouteId) {
        activeRouteMatch = match
        break
      }
    }
  } else {
    contextualMatches = matches
    activeRouteMatch = matches[matches.length - 1]
  }
  let path = resolveTo(
    to ? to : '.',
    getResolveToMatches(contextualMatches),
    stripBasename(location.pathname, basename) || location.pathname,
    relative === 'path',
  )
  if (to == null) {
    path.search = location.search
    path.hash = location.hash
  }
  if ((to == null || to === '' || to === '.') && activeRouteMatch) {
    let nakedIndex = hasNakedIndexQuery(path.search)
    if (activeRouteMatch.route.index && !nakedIndex)
      path.search = path.search ? path.search.replace(/^\?/, '?index&') : '?index'
    else if (!activeRouteMatch.route.index && nakedIndex) {
      let params = new URLSearchParams(path.search)
      let indexValues = params.getAll('index')
      params.delete('index')
      indexValues.filter((v) => v).forEach((v) => params.append('index', v))
      let qs = params.toString()
      path.search = qs ? `?${qs}` : ''
    }
  }
  if (basename !== '/')
    path.pathname = prependBasename({
      basename,
      pathname: path.pathname,
    })
  return createPath(path)
}
function normalizeNavigateOptions(isFetcher, path, opts) {
  if (!opts || !isSubmissionNavigation(opts)) return { path }
  if (opts.formMethod && !isValidMethod(opts.formMethod))
    return {
      path,
      error: getInternalRouterError(405, { method: opts.formMethod }),
    }
  let getInvalidBodyError = () => ({
    path,
    error: getInternalRouterError(400, { type: 'invalid-body' }),
  })
  let formMethod = (opts.formMethod || 'get').toUpperCase()
  let formAction = stripHashFromPath(path)
  if (opts.body !== void 0) {
    if (opts.formEncType === 'text/plain') {
      if (!isMutationMethod(formMethod)) return getInvalidBodyError()
      let text =
        typeof opts.body === 'string'
          ? opts.body
          : opts.body instanceof FormData || opts.body instanceof URLSearchParams
            ? Array.from(opts.body.entries()).reduce(
                (acc, [name, value]) => `${acc}${name}=${value}
`,
                '',
              )
            : String(opts.body)
      return {
        path,
        submission: {
          formMethod,
          formAction,
          formEncType: opts.formEncType,
          formData: void 0,
          json: void 0,
          text,
        },
      }
    } else if (opts.formEncType === 'application/json') {
      if (!isMutationMethod(formMethod)) return getInvalidBodyError()
      try {
        let json = typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body
        return {
          path,
          submission: {
            formMethod,
            formAction,
            formEncType: opts.formEncType,
            formData: void 0,
            json,
            text: void 0,
          },
        }
      } catch (e) {
        return getInvalidBodyError()
      }
    }
  }
  invariant(typeof FormData === 'function', 'FormData is not available in this environment')
  let searchParams
  let formData
  if (opts.formData) {
    searchParams = convertFormDataToSearchParams(opts.formData)
    formData = opts.formData
  } else if (opts.body instanceof FormData) {
    searchParams = convertFormDataToSearchParams(opts.body)
    formData = opts.body
  } else if (opts.body instanceof URLSearchParams) {
    searchParams = opts.body
    formData = convertSearchParamsToFormData(searchParams)
  } else if (opts.body == null) {
    searchParams = new URLSearchParams()
    formData = new FormData()
  } else
    try {
      searchParams = new URLSearchParams(opts.body)
      formData = convertSearchParamsToFormData(searchParams)
    } catch (e) {
      return getInvalidBodyError()
    }
  let submission = {
    formMethod,
    formAction,
    formEncType: (opts && opts.formEncType) || 'application/x-www-form-urlencoded',
    formData,
    json: void 0,
    text: void 0,
  }
  if (isMutationMethod(submission.formMethod))
    return {
      path,
      submission,
    }
  let parsedPath = parsePath(path)
  if (isFetcher && parsedPath.search && hasNakedIndexQuery(parsedPath.search))
    searchParams.append('index', '')
  parsedPath.search = `?${searchParams}`
  return {
    path: createPath(parsedPath),
    submission,
  }
}
function getMatchesToLoad(
  request,
  scopedContext,
  mapRouteProperties2,
  manifest,
  history,
  state,
  matches,
  submission,
  location,
  lazyRoutePropertiesToSkip,
  initialHydration,
  isRevalidationRequired,
  cancelledFetcherLoads,
  fetchersQueuedForDeletion,
  fetchLoadMatches,
  fetchRedirectIds,
  routesToUse,
  basename,
  hasPatchRoutesOnNavigation,
  pendingActionResult,
  callSiteDefaultShouldRevalidate,
) {
  let actionResult = pendingActionResult
    ? isErrorResult(pendingActionResult[1])
      ? pendingActionResult[1].error
      : pendingActionResult[1].data
    : void 0
  let currentUrl = history.createURL(state.location)
  let nextUrl = history.createURL(location)
  let maxIdx
  if (initialHydration && state.errors) {
    let boundaryId = Object.keys(state.errors)[0]
    maxIdx = matches.findIndex((m) => m.route.id === boundaryId)
  } else if (pendingActionResult && isErrorResult(pendingActionResult[1])) {
    let boundaryId = pendingActionResult[0]
    maxIdx = matches.findIndex((m) => m.route.id === boundaryId) - 1
  }
  let actionStatus = pendingActionResult ? pendingActionResult[1].statusCode : void 0
  let shouldSkipRevalidation = actionStatus && actionStatus >= 400
  let baseShouldRevalidateArgs = {
    currentUrl,
    currentParams: state.matches[0]?.params || {},
    nextUrl,
    nextParams: matches[0].params,
    ...submission,
    actionResult,
    actionStatus,
  }
  let pattern = getRoutePattern(matches)
  let dsMatches = matches.map((match, index) => {
    let { route } = match
    let forceShouldLoad = null
    if (maxIdx != null && index > maxIdx) forceShouldLoad = false
    else if (route.lazy) forceShouldLoad = true
    else if (!routeHasLoaderOrMiddleware(route)) forceShouldLoad = false
    else if (initialHydration) {
      let { shouldLoad: shouldLoad2 } = getRouteHydrationStatus(
        route,
        state.loaderData,
        state.errors,
      )
      forceShouldLoad = shouldLoad2
    } else if (isNewLoader(state.loaderData, state.matches[index], match)) forceShouldLoad = true
    if (forceShouldLoad !== null)
      return getDataStrategyMatch(
        mapRouteProperties2,
        manifest,
        request,
        location,
        pattern,
        match,
        lazyRoutePropertiesToSkip,
        scopedContext,
        forceShouldLoad,
      )
    let defaultShouldRevalidate = false
    if (typeof callSiteDefaultShouldRevalidate === 'boolean')
      defaultShouldRevalidate = callSiteDefaultShouldRevalidate
    else if (shouldSkipRevalidation) defaultShouldRevalidate = false
    else if (isRevalidationRequired) defaultShouldRevalidate = true
    else if (currentUrl.pathname + currentUrl.search === nextUrl.pathname + nextUrl.search)
      defaultShouldRevalidate = true
    else if (currentUrl.search !== nextUrl.search) defaultShouldRevalidate = true
    else if (isNewRouteInstance(state.matches[index], match)) defaultShouldRevalidate = true
    let shouldRevalidateArgs = {
      ...baseShouldRevalidateArgs,
      defaultShouldRevalidate,
    }
    return getDataStrategyMatch(
      mapRouteProperties2,
      manifest,
      request,
      location,
      pattern,
      match,
      lazyRoutePropertiesToSkip,
      scopedContext,
      shouldRevalidateLoader(match, shouldRevalidateArgs),
      shouldRevalidateArgs,
      callSiteDefaultShouldRevalidate,
    )
  })
  let revalidatingFetchers = []
  fetchLoadMatches.forEach((f, key) => {
    if (
      initialHydration ||
      !matches.some((m) => m.route.id === f.routeId) ||
      fetchersQueuedForDeletion.has(key)
    )
      return
    let fetcher = state.fetchers.get(key)
    let isMidInitialLoad = fetcher && fetcher.state !== 'idle' && fetcher.data === void 0
    let fetcherMatches = matchRoutes(routesToUse, f.path, basename)
    if (!fetcherMatches) {
      if (hasPatchRoutesOnNavigation && isMidInitialLoad) return
      revalidatingFetchers.push({
        key,
        routeId: f.routeId,
        path: f.path,
        matches: null,
        match: null,
        request: null,
        controller: null,
      })
      return
    }
    if (fetchRedirectIds.has(key)) return
    let fetcherMatch = getTargetMatch(fetcherMatches, f.path)
    let fetchController = new AbortController()
    let fetchRequest = createClientSideRequest(history, f.path, fetchController.signal)
    let fetcherDsMatches = null
    if (cancelledFetcherLoads.has(key)) {
      cancelledFetcherLoads.delete(key)
      fetcherDsMatches = getTargetedDataStrategyMatches(
        mapRouteProperties2,
        manifest,
        fetchRequest,
        f.path,
        fetcherMatches,
        fetcherMatch,
        lazyRoutePropertiesToSkip,
        scopedContext,
      )
    } else if (isMidInitialLoad) {
      if (isRevalidationRequired)
        fetcherDsMatches = getTargetedDataStrategyMatches(
          mapRouteProperties2,
          manifest,
          fetchRequest,
          f.path,
          fetcherMatches,
          fetcherMatch,
          lazyRoutePropertiesToSkip,
          scopedContext,
        )
    } else {
      let defaultShouldRevalidate
      if (typeof callSiteDefaultShouldRevalidate === 'boolean')
        defaultShouldRevalidate = callSiteDefaultShouldRevalidate
      else if (shouldSkipRevalidation) defaultShouldRevalidate = false
      else defaultShouldRevalidate = isRevalidationRequired
      let shouldRevalidateArgs = {
        ...baseShouldRevalidateArgs,
        defaultShouldRevalidate,
      }
      if (shouldRevalidateLoader(fetcherMatch, shouldRevalidateArgs))
        fetcherDsMatches = getTargetedDataStrategyMatches(
          mapRouteProperties2,
          manifest,
          fetchRequest,
          f.path,
          fetcherMatches,
          fetcherMatch,
          lazyRoutePropertiesToSkip,
          scopedContext,
          shouldRevalidateArgs,
        )
    }
    if (fetcherDsMatches)
      revalidatingFetchers.push({
        key,
        routeId: f.routeId,
        path: f.path,
        matches: fetcherDsMatches,
        match: fetcherMatch,
        request: fetchRequest,
        controller: fetchController,
      })
  })
  return {
    dsMatches,
    revalidatingFetchers,
  }
}
function routeHasLoaderOrMiddleware(route) {
  return route.loader != null || (route.middleware != null && route.middleware.length > 0)
}
function getRouteHydrationStatus(route, loaderData, errors) {
  if (route.lazy)
    return {
      shouldLoad: true,
      renderFallback: true,
    }
  if (!routeHasLoaderOrMiddleware(route))
    return {
      shouldLoad: false,
      renderFallback: false,
    }
  let hasData = loaderData != null && route.id in loaderData
  let hasError = errors != null && errors[route.id] !== void 0
  if (!hasData && hasError)
    return {
      shouldLoad: false,
      renderFallback: false,
    }
  if (typeof route.loader === 'function' && route.loader.hydrate === true)
    return {
      shouldLoad: true,
      renderFallback: !hasData,
    }
  let shouldLoad = !hasData && !hasError
  return {
    shouldLoad,
    renderFallback: shouldLoad,
  }
}
function isNewLoader(currentLoaderData, currentMatch, match) {
  let isNew = !currentMatch || match.route.id !== currentMatch.route.id
  let isMissingData = !currentLoaderData.hasOwnProperty(match.route.id)
  return isNew || isMissingData
}
function isNewRouteInstance(currentMatch, match) {
  let currentPath = currentMatch.route.path
  return (
    currentMatch.pathname !== match.pathname ||
    (currentPath != null &&
      currentPath.endsWith('*') &&
      currentMatch.params['*'] !== match.params['*'])
  )
}
function shouldRevalidateLoader(loaderMatch, arg) {
  if (loaderMatch.route.shouldRevalidate) {
    let routeChoice = loaderMatch.route.shouldRevalidate(arg)
    if (typeof routeChoice === 'boolean') return routeChoice
  }
  return arg.defaultShouldRevalidate
}
function patchRoutesImpl(
  routeId,
  children,
  routesToUse,
  manifest,
  mapRouteProperties2,
  allowElementMutations,
) {
  let childrenToPatch
  if (routeId) {
    let route = manifest[routeId]
    invariant(route, `No route found to patch children into: routeId = ${routeId}`)
    if (!route.children) route.children = []
    childrenToPatch = route.children
  } else childrenToPatch = routesToUse
  let uniqueChildren = []
  let existingChildren = []
  children.forEach((newRoute) => {
    let existingRoute = childrenToPatch.find((existingRoute2) =>
      isSameRoute(newRoute, existingRoute2),
    )
    if (existingRoute)
      existingChildren.push({
        existingRoute,
        newRoute,
      })
    else uniqueChildren.push(newRoute)
  })
  if (uniqueChildren.length > 0) {
    let newRoutes = convertRoutesToDataRoutes(
      uniqueChildren,
      mapRouteProperties2,
      [routeId || '_', 'patch', String(childrenToPatch?.length || '0')],
      manifest,
    )
    childrenToPatch.push(...newRoutes)
  }
  if (allowElementMutations && existingChildren.length > 0)
    for (let i = 0; i < existingChildren.length; i++) {
      let { existingRoute, newRoute } = existingChildren[i]
      let existingRouteTyped = existingRoute
      let [newRouteTyped] = convertRoutesToDataRoutes([newRoute], mapRouteProperties2, [], {}, true)
      Object.assign(existingRouteTyped, {
        element: newRouteTyped.element ? newRouteTyped.element : existingRouteTyped.element,
        errorElement: newRouteTyped.errorElement
          ? newRouteTyped.errorElement
          : existingRouteTyped.errorElement,
        hydrateFallbackElement: newRouteTyped.hydrateFallbackElement
          ? newRouteTyped.hydrateFallbackElement
          : existingRouteTyped.hydrateFallbackElement,
      })
    }
}
function isSameRoute(newRoute, existingRoute) {
  if ('id' in newRoute && 'id' in existingRoute && newRoute.id === existingRoute.id) return true
  if (
    !(
      newRoute.index === existingRoute.index &&
      newRoute.path === existingRoute.path &&
      newRoute.caseSensitive === existingRoute.caseSensitive
    )
  )
    return false
  if (
    (!newRoute.children || newRoute.children.length === 0) &&
    (!existingRoute.children || existingRoute.children.length === 0)
  )
    return true
  return (
    newRoute.children?.every((aChild, i) =>
      existingRoute.children?.some((bChild) => isSameRoute(aChild, bChild)),
    ) ?? false
  )
}
var lazyRoutePropertyCache = /* @__PURE__ */ new WeakMap()
var loadLazyRouteProperty = ({ key, route, manifest, mapRouteProperties: mapRouteProperties2 }) => {
  let routeToUpdate = manifest[route.id]
  invariant(routeToUpdate, 'No route found in manifest')
  if (!routeToUpdate.lazy || typeof routeToUpdate.lazy !== 'object') return
  let lazyFn = routeToUpdate.lazy[key]
  if (!lazyFn) return
  let cache = lazyRoutePropertyCache.get(routeToUpdate)
  if (!cache) {
    cache = {}
    lazyRoutePropertyCache.set(routeToUpdate, cache)
  }
  let cachedPromise = cache[key]
  if (cachedPromise) return cachedPromise
  let propertyPromise = (async () => {
    let isUnsupported = isUnsupportedLazyRouteObjectKey(key)
    let isStaticallyDefined = routeToUpdate[key] !== void 0 && key !== 'hasErrorBoundary'
    if (isUnsupported) {
      warning(
        !isUnsupported,
        'Route property ' +
          key +
          ' is not a supported lazy route property. This property will be ignored.',
      )
      cache[key] = Promise.resolve()
    } else if (isStaticallyDefined)
      warning(
        false,
        `Route "${routeToUpdate.id}" has a static property "${key}" defined. The lazy property will be ignored.`,
      )
    else {
      let value = await lazyFn()
      if (value != null) {
        Object.assign(routeToUpdate, { [key]: value })
        Object.assign(routeToUpdate, mapRouteProperties2(routeToUpdate))
      }
    }
    if (typeof routeToUpdate.lazy === 'object') {
      routeToUpdate.lazy[key] = void 0
      if (Object.values(routeToUpdate.lazy).every((value) => value === void 0))
        routeToUpdate.lazy = void 0
    }
  })()
  cache[key] = propertyPromise
  return propertyPromise
}
var lazyRouteFunctionCache = /* @__PURE__ */ new WeakMap()
function loadLazyRoute(route, type, manifest, mapRouteProperties2, lazyRoutePropertiesToSkip) {
  let routeToUpdate = manifest[route.id]
  invariant(routeToUpdate, 'No route found in manifest')
  if (!route.lazy)
    return {
      lazyRoutePromise: void 0,
      lazyHandlerPromise: void 0,
    }
  if (typeof route.lazy === 'function') {
    let cachedPromise = lazyRouteFunctionCache.get(routeToUpdate)
    if (cachedPromise)
      return {
        lazyRoutePromise: cachedPromise,
        lazyHandlerPromise: cachedPromise,
      }
    let lazyRoutePromise2 = (async () => {
      invariant(typeof route.lazy === 'function', 'No lazy route function found')
      let lazyRoute = await route.lazy()
      let routeUpdates = {}
      for (let lazyRouteProperty in lazyRoute) {
        let lazyValue = lazyRoute[lazyRouteProperty]
        if (lazyValue === void 0) continue
        let isUnsupported = isUnsupportedLazyRouteFunctionKey(lazyRouteProperty)
        let isStaticallyDefined =
          routeToUpdate[lazyRouteProperty] !== void 0 && lazyRouteProperty !== 'hasErrorBoundary'
        if (isUnsupported)
          warning(
            !isUnsupported,
            'Route property ' +
              lazyRouteProperty +
              ' is not a supported property to be returned from a lazy route function. This property will be ignored.',
          )
        else if (isStaticallyDefined)
          warning(
            !isStaticallyDefined,
            `Route "${routeToUpdate.id}" has a static property "${lazyRouteProperty}" defined but its lazy function is also returning a value for this property. The lazy route property "${lazyRouteProperty}" will be ignored.`,
          )
        else routeUpdates[lazyRouteProperty] = lazyValue
      }
      Object.assign(routeToUpdate, routeUpdates)
      Object.assign(routeToUpdate, {
        ...mapRouteProperties2(routeToUpdate),
        lazy: void 0,
      })
    })()
    lazyRouteFunctionCache.set(routeToUpdate, lazyRoutePromise2)
    lazyRoutePromise2.catch(() => {})
    return {
      lazyRoutePromise: lazyRoutePromise2,
      lazyHandlerPromise: lazyRoutePromise2,
    }
  }
  let lazyKeys = Object.keys(route.lazy)
  let lazyPropertyPromises = []
  let lazyHandlerPromise = void 0
  for (let key of lazyKeys) {
    if (lazyRoutePropertiesToSkip && lazyRoutePropertiesToSkip.includes(key)) continue
    let promise = loadLazyRouteProperty({
      key,
      route,
      manifest,
      mapRouteProperties: mapRouteProperties2,
    })
    if (promise) {
      lazyPropertyPromises.push(promise)
      if (key === type) lazyHandlerPromise = promise
    }
  }
  let lazyRoutePromise =
    lazyPropertyPromises.length > 0 ? Promise.all(lazyPropertyPromises).then(() => {}) : void 0
  lazyRoutePromise?.catch(() => {})
  lazyHandlerPromise?.catch(() => {})
  return {
    lazyRoutePromise,
    lazyHandlerPromise,
  }
}
async function defaultDataStrategy(args) {
  let matchesToLoad = args.matches.filter((m) => m.shouldLoad)
  let keyedResults = {}
  ;(await Promise.all(matchesToLoad.map((m) => m.resolve()))).forEach((result, i) => {
    keyedResults[matchesToLoad[i].route.id] = result
  })
  return keyedResults
}
async function defaultDataStrategyWithMiddleware(args) {
  if (!args.matches.some((m) => m.route.middleware)) return defaultDataStrategy(args)
  return runClientMiddlewarePipeline(args, () => defaultDataStrategy(args))
}
function runClientMiddlewarePipeline(args, handler) {
  return runMiddlewarePipeline(
    args,
    handler,
    (r) => {
      if (isRedirectResponse(r)) throw r
      return r
    },
    isDataStrategyResults,
    errorHandler,
  )
  function errorHandler(error, routeId, nextResult) {
    if (nextResult)
      return Promise.resolve(
        Object.assign(nextResult.value, {
          [routeId]: {
            type: 'error',
            result: error,
          },
        }),
      )
    else {
      let { matches } = args
      let boundaryRouteId = findNearestBoundary(
        matches,
        matches[
          Math.min(
            Math.max(
              matches.findIndex((m) => m.route.id === routeId),
              0,
            ),
            Math.max(
              matches.findIndex((m) => m.shouldCallHandler()),
              0,
            ),
          )
        ].route.id,
      ).route.id
      return Promise.resolve({
        [boundaryRouteId]: {
          type: 'error',
          result: error,
        },
      })
    }
  }
}
async function runMiddlewarePipeline(args, handler, processResult, isResult, errorHandler) {
  let { matches, ...dataFnArgs } = args
  return await callRouteMiddleware(
    dataFnArgs,
    matches.flatMap((m) =>
      m.route.middleware ? m.route.middleware.map((fn) => [m.route.id, fn]) : [],
    ),
    handler,
    processResult,
    isResult,
    errorHandler,
  )
}
async function callRouteMiddleware(
  args,
  middlewares,
  handler,
  processResult,
  isResult,
  errorHandler,
  idx = 0,
) {
  let { request } = args
  if (request.signal.aborted)
    throw (
      request.signal.reason ??
      /* @__PURE__ */ new Error(`Request aborted: ${request.method} ${request.url}`)
    )
  let tuple = middlewares[idx]
  if (!tuple) return await handler()
  let [routeId, middleware] = tuple
  let nextResult
  let next = async () => {
    if (nextResult) throw new Error('You may only call `next()` once per middleware')
    try {
      nextResult = {
        value: await callRouteMiddleware(
          args,
          middlewares,
          handler,
          processResult,
          isResult,
          errorHandler,
          idx + 1,
        ),
      }
      return nextResult.value
    } catch (error) {
      nextResult = { value: await errorHandler(error, routeId, nextResult) }
      return nextResult.value
    }
  }
  try {
    let value = await middleware(args, next)
    let result = value != null ? processResult(value) : void 0
    if (isResult(result)) return result
    else if (nextResult) return result ?? nextResult.value
    else {
      nextResult = { value: await next() }
      return nextResult.value
    }
  } catch (error) {
    return await errorHandler(error, routeId, nextResult)
  }
}
function getDataStrategyMatchLazyPromises(
  mapRouteProperties2,
  manifest,
  request,
  match,
  lazyRoutePropertiesToSkip,
) {
  let lazyMiddlewarePromise = loadLazyRouteProperty({
    key: 'middleware',
    route: match.route,
    manifest,
    mapRouteProperties: mapRouteProperties2,
  })
  let lazyRoutePromises = loadLazyRoute(
    match.route,
    isMutationMethod(request.method) ? 'action' : 'loader',
    manifest,
    mapRouteProperties2,
    lazyRoutePropertiesToSkip,
  )
  return {
    middleware: lazyMiddlewarePromise,
    route: lazyRoutePromises.lazyRoutePromise,
    handler: lazyRoutePromises.lazyHandlerPromise,
  }
}
function getDataStrategyMatch(
  mapRouteProperties2,
  manifest,
  request,
  path,
  unstable_pattern,
  match,
  lazyRoutePropertiesToSkip,
  scopedContext,
  shouldLoad,
  shouldRevalidateArgs = null,
  callSiteDefaultShouldRevalidate,
) {
  let isUsingNewApi = false
  let _lazyPromises = getDataStrategyMatchLazyPromises(
    mapRouteProperties2,
    manifest,
    request,
    match,
    lazyRoutePropertiesToSkip,
  )
  return {
    ...match,
    _lazyPromises,
    shouldLoad,
    shouldRevalidateArgs,
    shouldCallHandler(defaultShouldRevalidate) {
      isUsingNewApi = true
      if (!shouldRevalidateArgs) return shouldLoad
      if (typeof callSiteDefaultShouldRevalidate === 'boolean')
        return shouldRevalidateLoader(match, {
          ...shouldRevalidateArgs,
          defaultShouldRevalidate: callSiteDefaultShouldRevalidate,
        })
      if (typeof defaultShouldRevalidate === 'boolean')
        return shouldRevalidateLoader(match, {
          ...shouldRevalidateArgs,
          defaultShouldRevalidate,
        })
      return shouldRevalidateLoader(match, shouldRevalidateArgs)
    },
    resolve(handlerOverride) {
      let { lazy, loader, middleware } = match.route
      let callHandler =
        isUsingNewApi ||
        shouldLoad ||
        (handlerOverride && !isMutationMethod(request.method) && (lazy || loader))
      let isMiddlewareOnlyRoute = middleware && middleware.length > 0 && !loader && !lazy
      if (callHandler && (isMutationMethod(request.method) || !isMiddlewareOnlyRoute))
        return callLoaderOrAction({
          request,
          path,
          unstable_pattern,
          match,
          lazyHandlerPromise: _lazyPromises?.handler,
          lazyRoutePromise: _lazyPromises?.route,
          handlerOverride,
          scopedContext,
        })
      return Promise.resolve({
        type: 'data',
        result: void 0,
      })
    },
  }
}
function getTargetedDataStrategyMatches(
  mapRouteProperties2,
  manifest,
  request,
  path,
  matches,
  targetMatch,
  lazyRoutePropertiesToSkip,
  scopedContext,
  shouldRevalidateArgs = null,
) {
  return matches.map((match) => {
    if (match.route.id !== targetMatch.route.id)
      return {
        ...match,
        shouldLoad: false,
        shouldRevalidateArgs,
        shouldCallHandler: () => false,
        _lazyPromises: getDataStrategyMatchLazyPromises(
          mapRouteProperties2,
          manifest,
          request,
          match,
          lazyRoutePropertiesToSkip,
        ),
        resolve: () =>
          Promise.resolve({
            type: 'data',
            result: void 0,
          }),
      }
    return getDataStrategyMatch(
      mapRouteProperties2,
      manifest,
      request,
      path,
      getRoutePattern(matches),
      match,
      lazyRoutePropertiesToSkip,
      scopedContext,
      true,
      shouldRevalidateArgs,
    )
  })
}
async function callDataStrategyImpl(
  dataStrategyImpl,
  request,
  path,
  matches,
  fetcherKey,
  scopedContext,
  isStaticHandler,
) {
  if (matches.some((m) => m._lazyPromises?.middleware))
    await Promise.all(matches.map((m) => m._lazyPromises?.middleware))
  let dataStrategyArgs = {
    request,
    unstable_url: createDataFunctionUrl(request, path),
    unstable_pattern: getRoutePattern(matches),
    params: matches[0].params,
    context: scopedContext,
    matches,
  }
  let runClientMiddleware = isStaticHandler
    ? () => {
        throw new Error(
          'You cannot call `runClientMiddleware()` from a static handler `dataStrategy`. Middleware is run outside of `dataStrategy` during SSR in order to bubble up the Response.  You can enable middleware via the `respond` API in `query`/`queryRoute`',
        )
      }
    : (cb) => {
        let typedDataStrategyArgs = dataStrategyArgs
        return runClientMiddlewarePipeline(typedDataStrategyArgs, () => {
          return cb({
            ...typedDataStrategyArgs,
            fetcherKey,
            runClientMiddleware: () => {
              throw new Error(
                'Cannot call `runClientMiddleware()` from within an `runClientMiddleware` handler',
              )
            },
          })
        })
      }
  let results = await dataStrategyImpl({
    ...dataStrategyArgs,
    fetcherKey,
    runClientMiddleware,
  })
  try {
    await Promise.all(matches.flatMap((m) => [m._lazyPromises?.handler, m._lazyPromises?.route]))
  } catch (e) {}
  return results
}
async function callLoaderOrAction({
  request,
  path,
  unstable_pattern,
  match,
  lazyHandlerPromise,
  lazyRoutePromise,
  handlerOverride,
  scopedContext,
}) {
  let result
  let onReject
  let isAction = isMutationMethod(request.method)
  let type = isAction ? 'action' : 'loader'
  let runHandler = (handler) => {
    let reject
    let abortPromise = new Promise((_, r) => (reject = r))
    onReject = () => reject()
    request.signal.addEventListener('abort', onReject)
    let actualHandler = (ctx) => {
      if (typeof handler !== 'function')
        return Promise.reject(
          /* @__PURE__ */ new Error(
            `You cannot call the handler for a route which defines a boolean "${type}" [routeId: ${match.route.id}]`,
          ),
        )
      return handler(
        {
          request,
          unstable_url: createDataFunctionUrl(request, path),
          unstable_pattern,
          params: match.params,
          context: scopedContext,
        },
        ...(ctx !== void 0 ? [ctx] : []),
      )
    }
    let handlerPromise = (async () => {
      try {
        return {
          type: 'data',
          result: await (handlerOverride
            ? handlerOverride((ctx) => actualHandler(ctx))
            : actualHandler()),
        }
      } catch (e) {
        return {
          type: 'error',
          result: e,
        }
      }
    })()
    return Promise.race([handlerPromise, abortPromise])
  }
  try {
    let handler = isAction ? match.route.action : match.route.loader
    if (lazyHandlerPromise || lazyRoutePromise)
      if (handler) {
        let handlerError
        let [value] = await Promise.all([
          runHandler(handler).catch((e) => {
            handlerError = e
          }),
          lazyHandlerPromise,
          lazyRoutePromise,
        ])
        if (handlerError !== void 0) throw handlerError
        result = value
      } else {
        await lazyHandlerPromise
        let handler2 = isAction ? match.route.action : match.route.loader
        if (handler2) [result] = await Promise.all([runHandler(handler2), lazyRoutePromise])
        else if (type === 'action') {
          let url = new URL(request.url)
          let pathname = url.pathname + url.search
          throw getInternalRouterError(405, {
            method: request.method,
            pathname,
            routeId: match.route.id,
          })
        } else
          return {
            type: 'data',
            result: void 0,
          }
      }
    else if (!handler) {
      let url = new URL(request.url)
      throw getInternalRouterError(404, { pathname: url.pathname + url.search })
    } else result = await runHandler(handler)
  } catch (e) {
    return {
      type: 'error',
      result: e,
    }
  } finally {
    if (onReject) request.signal.removeEventListener('abort', onReject)
  }
  return result
}
async function parseResponseBody(response) {
  let contentType = response.headers.get('Content-Type')
  if (contentType && /\bapplication\/json\b/.test(contentType))
    return response.body == null ? null : response.json()
  return response.text()
}
async function convertDataStrategyResultToDataResult(dataStrategyResult) {
  let { result, type } = dataStrategyResult
  if (isResponse(result)) {
    let data2
    try {
      data2 = await parseResponseBody(result)
    } catch (e) {
      return {
        type: 'error',
        error: e,
      }
    }
    if (type === 'error')
      return {
        type: 'error',
        error: new ErrorResponseImpl(result.status, result.statusText, data2),
        statusCode: result.status,
        headers: result.headers,
      }
    return {
      type: 'data',
      data: data2,
      statusCode: result.status,
      headers: result.headers,
    }
  }
  if (type === 'error') {
    if (isDataWithResponseInit(result)) {
      if (result.data instanceof Error)
        return {
          type: 'error',
          error: result.data,
          statusCode: result.init?.status,
          headers: result.init?.headers ? new Headers(result.init.headers) : void 0,
        }
      return {
        type: 'error',
        error: dataWithResponseInitToErrorResponse(result),
        statusCode: isRouteErrorResponse(result) ? result.status : void 0,
        headers: result.init?.headers ? new Headers(result.init.headers) : void 0,
      }
    }
    return {
      type: 'error',
      error: result,
      statusCode: isRouteErrorResponse(result) ? result.status : void 0,
    }
  }
  if (isDataWithResponseInit(result))
    return {
      type: 'data',
      data: result.data,
      statusCode: result.init?.status,
      headers: result.init?.headers ? new Headers(result.init.headers) : void 0,
    }
  return {
    type: 'data',
    data: result,
  }
}
function normalizeRelativeRoutingRedirectResponse(response, request, routeId, matches, basename) {
  let location = response.headers.get('Location')
  invariant(location, 'Redirects returned/thrown from loaders/actions must have a Location header')
  if (!isAbsoluteUrl(location)) {
    let trimmedMatches = matches.slice(0, matches.findIndex((m) => m.route.id === routeId) + 1)
    location = normalizeTo(new URL(request.url), trimmedMatches, basename, location)
    response.headers.set('Location', location)
  }
  return response
}
var invalidProtocols = [
  'about:',
  'blob:',
  'chrome:',
  'chrome-untrusted:',
  'content:',
  'data:',
  'devtools:',
  'file:',
  'filesystem:',
  'javascript:',
]
function normalizeRedirectLocation(location, currentUrl, basename, historyInstance) {
  if (isAbsoluteUrl(location)) {
    let normalizedLocation = location
    let url = normalizedLocation.startsWith('//')
      ? new URL(currentUrl.protocol + normalizedLocation)
      : new URL(normalizedLocation)
    if (invalidProtocols.includes(url.protocol)) throw new Error('Invalid redirect location')
    let isSameBasename = stripBasename(url.pathname, basename) != null
    if (url.origin === currentUrl.origin && isSameBasename)
      return url.pathname + url.search + url.hash
  }
  try {
    let url = historyInstance.createURL(location)
    if (invalidProtocols.includes(url.protocol)) throw new Error('Invalid redirect location')
  } catch (e) {}
  return location
}
function createClientSideRequest(history, location, signal, submission) {
  let url = history.createURL(stripHashFromPath(location)).toString()
  let init = { signal }
  if (submission && isMutationMethod(submission.formMethod)) {
    let { formMethod, formEncType } = submission
    init.method = formMethod.toUpperCase()
    if (formEncType === 'application/json') {
      init.headers = new Headers({ 'Content-Type': formEncType })
      init.body = JSON.stringify(submission.json)
    } else if (formEncType === 'text/plain') init.body = submission.text
    else if (formEncType === 'application/x-www-form-urlencoded' && submission.formData)
      init.body = convertFormDataToSearchParams(submission.formData)
    else init.body = submission.formData
  }
  return new Request(url, init)
}
function createDataFunctionUrl(request, path) {
  let url = new URL(request.url)
  let parsed = typeof path === 'string' ? parsePath(path) : path
  url.pathname = parsed.pathname || '/'
  if (parsed.search) {
    let searchParams = new URLSearchParams(parsed.search)
    let indexValues = searchParams.getAll('index')
    searchParams.delete('index')
    for (let value of indexValues.filter(Boolean)) searchParams.append('index', value)
    url.search = searchParams.size ? `?${searchParams.toString()}` : ''
  } else url.search = ''
  url.hash = parsed.hash || ''
  return url
}
function convertFormDataToSearchParams(formData) {
  let searchParams = new URLSearchParams()
  for (let [key, value] of formData.entries())
    searchParams.append(key, typeof value === 'string' ? value : value.name)
  return searchParams
}
function convertSearchParamsToFormData(searchParams) {
  let formData = new FormData()
  for (let [key, value] of searchParams.entries()) formData.append(key, value)
  return formData
}
function processRouteLoaderData(
  matches,
  results,
  pendingActionResult,
  isStaticHandler = false,
  skipLoaderErrorBubbling = false,
) {
  let loaderData = {}
  let errors = null
  let statusCode
  let foundError = false
  let loaderHeaders = {}
  let pendingError =
    pendingActionResult && isErrorResult(pendingActionResult[1])
      ? pendingActionResult[1].error
      : void 0
  matches.forEach((match) => {
    if (!(match.route.id in results)) return
    let id = match.route.id
    let result = results[id]
    invariant(!isRedirectResult(result), 'Cannot handle redirect results in processLoaderData')
    if (isErrorResult(result)) {
      let error = result.error
      if (pendingError !== void 0) {
        error = pendingError
        pendingError = void 0
      }
      errors = errors || {}
      if (skipLoaderErrorBubbling) errors[id] = error
      else {
        let boundaryMatch = findNearestBoundary(matches, id)
        if (errors[boundaryMatch.route.id] == null) errors[boundaryMatch.route.id] = error
      }
      if (!isStaticHandler) loaderData[id] = ResetLoaderDataSymbol
      if (!foundError) {
        foundError = true
        statusCode = isRouteErrorResponse(result.error) ? result.error.status : 500
      }
      if (result.headers) loaderHeaders[id] = result.headers
    } else {
      loaderData[id] = result.data
      if (result.statusCode && result.statusCode !== 200 && !foundError)
        statusCode = result.statusCode
      if (result.headers) loaderHeaders[id] = result.headers
    }
  })
  if (pendingError !== void 0 && pendingActionResult) {
    errors = { [pendingActionResult[0]]: pendingError }
    if (pendingActionResult[2]) loaderData[pendingActionResult[2]] = void 0
  }
  return {
    loaderData,
    errors,
    statusCode: statusCode || 200,
    loaderHeaders,
  }
}
function processLoaderData(
  state,
  matches,
  results,
  pendingActionResult,
  revalidatingFetchers,
  fetcherResults,
) {
  let { loaderData, errors } = processRouteLoaderData(matches, results, pendingActionResult)
  revalidatingFetchers
    .filter((f) => !f.matches || f.matches.some((m) => m.shouldLoad))
    .forEach((rf) => {
      let { key, match, controller } = rf
      if (controller && controller.signal.aborted) return
      let result = fetcherResults[key]
      invariant(result, 'Did not find corresponding fetcher result')
      if (isErrorResult(result)) {
        let boundaryMatch = findNearestBoundary(state.matches, match?.route.id)
        if (!(errors && errors[boundaryMatch.route.id]))
          errors = {
            ...errors,
            [boundaryMatch.route.id]: result.error,
          }
        state.fetchers.delete(key)
      } else if (isRedirectResult(result))
        invariant(false, 'Unhandled fetcher revalidation redirect')
      else {
        let doneFetcher = getDoneFetcher(result.data)
        state.fetchers.set(key, doneFetcher)
      }
    })
  return {
    loaderData,
    errors,
  }
}
function mergeLoaderData(loaderData, newLoaderData, matches, errors) {
  let mergedLoaderData = Object.entries(newLoaderData)
    .filter(([, v]) => v !== ResetLoaderDataSymbol)
    .reduce((merged, [k, v]) => {
      merged[k] = v
      return merged
    }, {})
  for (let match of matches) {
    let id = match.route.id
    if (!newLoaderData.hasOwnProperty(id) && loaderData.hasOwnProperty(id) && match.route.loader)
      mergedLoaderData[id] = loaderData[id]
    if (errors && errors.hasOwnProperty(id)) break
  }
  return mergedLoaderData
}
function getActionDataForCommit(pendingActionResult) {
  if (!pendingActionResult) return {}
  return isErrorResult(pendingActionResult[1])
    ? { actionData: {} }
    : { actionData: { [pendingActionResult[0]]: pendingActionResult[1].data } }
}
function findNearestBoundary(matches, routeId) {
  return (
    (routeId
      ? matches.slice(0, matches.findIndex((m) => m.route.id === routeId) + 1)
      : [...matches]
    )
      .reverse()
      .find((m) => m.route.hasErrorBoundary === true) || matches[0]
  )
}
function getShortCircuitMatches(routes) {
  let route =
    routes.length === 1
      ? routes[0]
      : routes.find((r) => r.index || !r.path || r.path === '/') || { id: `__shim-error-route__` }
  return {
    matches: [
      {
        params: {},
        pathname: '',
        pathnameBase: '',
        route,
      },
    ],
    route,
  }
}
function getInternalRouterError(status, { pathname, routeId, method, type, message } = {}) {
  let statusText = 'Unknown Server Error'
  let errorMessage = 'Unknown @remix-run/router error'
  if (status === 400) {
    statusText = 'Bad Request'
    if (method && pathname && routeId)
      errorMessage = `You made a ${method} request to "${pathname}" but did not provide a \`loader\` for route "${routeId}", so there is no way to handle the request.`
    else if (type === 'invalid-body') errorMessage = 'Unable to encode submission body'
  } else if (status === 403) {
    statusText = 'Forbidden'
    errorMessage = `Route "${routeId}" does not match URL "${pathname}"`
  } else if (status === 404) {
    statusText = 'Not Found'
    errorMessage = `No route matches URL "${pathname}"`
  } else if (status === 405) {
    statusText = 'Method Not Allowed'
    if (method && pathname && routeId)
      errorMessage = `You made a ${method.toUpperCase()} request to "${pathname}" but did not provide an \`action\` for route "${routeId}", so there is no way to handle the request.`
    else if (method) errorMessage = `Invalid request method "${method.toUpperCase()}"`
  }
  return new ErrorResponseImpl(status || 500, statusText, new Error(errorMessage), true)
}
function findRedirect(results) {
  let entries = Object.entries(results)
  for (let i = entries.length - 1; i >= 0; i--) {
    let [key, result] = entries[i]
    if (isRedirectResult(result))
      return {
        key,
        result,
      }
  }
}
function stripHashFromPath(path) {
  return createPath({
    ...(typeof path === 'string' ? parsePath(path) : path),
    hash: '',
  })
}
function isHashChangeOnly(a, b) {
  if (a.pathname !== b.pathname || a.search !== b.search) return false
  if (a.hash === '') return b.hash !== ''
  else if (a.hash === b.hash) return true
  else if (b.hash !== '') return true
  return false
}
function dataWithResponseInitToErrorResponse(data2) {
  return new ErrorResponseImpl(
    data2.init?.status ?? 500,
    data2.init?.statusText ?? 'Internal Server Error',
    data2.data,
  )
}
function isDataStrategyResults(result) {
  return (
    result != null &&
    typeof result === 'object' &&
    Object.entries(result).every(
      ([key, value]) => typeof key === 'string' && isDataStrategyResult(value),
    )
  )
}
function isDataStrategyResult(result) {
  return (
    result != null &&
    typeof result === 'object' &&
    'type' in result &&
    'result' in result &&
    (result.type === 'data' || result.type === 'error')
  )
}
function isRedirectDataStrategyResult(result) {
  return isResponse(result.result) && redirectStatusCodes.has(result.result.status)
}
function isErrorResult(result) {
  return result.type === 'error'
}
function isRedirectResult(result) {
  return (result && result.type) === 'redirect'
}
function isDataWithResponseInit(value) {
  return (
    typeof value === 'object' &&
    value != null &&
    'type' in value &&
    'data' in value &&
    'init' in value &&
    value.type === 'DataWithResponseInit'
  )
}
function isResponse(value) {
  return (
    value != null &&
    typeof value.status === 'number' &&
    typeof value.statusText === 'string' &&
    typeof value.headers === 'object' &&
    typeof value.body !== 'undefined'
  )
}
function isRedirectStatusCode(statusCode) {
  return redirectStatusCodes.has(statusCode)
}
function isRedirectResponse(result) {
  return isResponse(result) && isRedirectStatusCode(result.status) && result.headers.has('Location')
}
function isValidMethod(method) {
  return validRequestMethods.has(method.toUpperCase())
}
function isMutationMethod(method) {
  return validMutationMethods.has(method.toUpperCase())
}
function hasNakedIndexQuery(search) {
  return new URLSearchParams(search).getAll('index').some((v) => v === '')
}
function getTargetMatch(matches, location) {
  let search = typeof location === 'string' ? parsePath(location).search : location.search
  if (matches[matches.length - 1].route.index && hasNakedIndexQuery(search || ''))
    return matches[matches.length - 1]
  let pathMatches = getPathContributingMatches(matches)
  return pathMatches[pathMatches.length - 1]
}
function getSubmissionFromNavigation(navigation) {
  let { formMethod, formAction, formEncType, text, formData, json } = navigation
  if (!formMethod || !formAction || !formEncType) return
  if (text != null)
    return {
      formMethod,
      formAction,
      formEncType,
      formData: void 0,
      json: void 0,
      text,
    }
  else if (formData != null)
    return {
      formMethod,
      formAction,
      formEncType,
      formData,
      json: void 0,
      text: void 0,
    }
  else if (json !== void 0)
    return {
      formMethod,
      formAction,
      formEncType,
      formData: void 0,
      json,
      text: void 0,
    }
}
function getLoadingNavigation(location, submission) {
  if (submission)
    return {
      state: 'loading',
      location,
      formMethod: submission.formMethod,
      formAction: submission.formAction,
      formEncType: submission.formEncType,
      formData: submission.formData,
      json: submission.json,
      text: submission.text,
    }
  else
    return {
      state: 'loading',
      location,
      formMethod: void 0,
      formAction: void 0,
      formEncType: void 0,
      formData: void 0,
      json: void 0,
      text: void 0,
    }
}
function getSubmittingNavigation(location, submission) {
  return {
    state: 'submitting',
    location,
    formMethod: submission.formMethod,
    formAction: submission.formAction,
    formEncType: submission.formEncType,
    formData: submission.formData,
    json: submission.json,
    text: submission.text,
  }
}
function getLoadingFetcher(submission, data2) {
  if (submission)
    return {
      state: 'loading',
      formMethod: submission.formMethod,
      formAction: submission.formAction,
      formEncType: submission.formEncType,
      formData: submission.formData,
      json: submission.json,
      text: submission.text,
      data: data2,
    }
  else
    return {
      state: 'loading',
      formMethod: void 0,
      formAction: void 0,
      formEncType: void 0,
      formData: void 0,
      json: void 0,
      text: void 0,
      data: data2,
    }
}
function getSubmittingFetcher(submission, existingFetcher) {
  return {
    state: 'submitting',
    formMethod: submission.formMethod,
    formAction: submission.formAction,
    formEncType: submission.formEncType,
    formData: submission.formData,
    json: submission.json,
    text: submission.text,
    data: existingFetcher ? existingFetcher.data : void 0,
  }
}
function getDoneFetcher(data2) {
  return {
    state: 'idle',
    formMethod: void 0,
    formAction: void 0,
    formEncType: void 0,
    formData: void 0,
    json: void 0,
    text: void 0,
    data: data2,
  }
}
function restoreAppliedTransitions(_window, transitions) {
  try {
    let sessionPositions = _window.sessionStorage.getItem(TRANSITIONS_STORAGE_KEY)
    if (sessionPositions) {
      let json = JSON.parse(sessionPositions)
      for (let [k, v] of Object.entries(json || {}))
        if (v && Array.isArray(v)) transitions.set(k, new Set(v || []))
    }
  } catch (e) {}
}
function persistAppliedTransitions(_window, transitions) {
  if (transitions.size > 0) {
    let json = {}
    for (let [k, v] of transitions) json[k] = [...v]
    try {
      _window.sessionStorage.setItem(TRANSITIONS_STORAGE_KEY, JSON.stringify(json))
    } catch (error) {
      warning(false, `Failed to save applied view transitions in sessionStorage (${error}).`)
    }
  }
}
function createDeferred() {
  let resolve
  let reject
  let promise = new Promise((res, rej) => {
    resolve = async (val) => {
      res(val)
      try {
        await promise
      } catch (e) {}
    }
    reject = async (error) => {
      rej(error)
      try {
        await promise
      } catch (e) {}
    }
  })
  return {
    promise,
    resolve,
    reject,
  }
}
var DataRouterContext = import_react.createContext(null)
DataRouterContext.displayName = 'DataRouter'
var DataRouterStateContext = import_react.createContext(null)
DataRouterStateContext.displayName = 'DataRouterState'
var RSCRouterContext = import_react.createContext(false)
function useIsRSCRouterContext() {
  return import_react.useContext(RSCRouterContext)
}
var ViewTransitionContext = import_react.createContext({ isTransitioning: false })
ViewTransitionContext.displayName = 'ViewTransition'
var FetchersContext = import_react.createContext(/* @__PURE__ */ new Map())
FetchersContext.displayName = 'Fetchers'
var AwaitContext = import_react.createContext(null)
AwaitContext.displayName = 'Await'
var NavigationContext = import_react.createContext(null)
NavigationContext.displayName = 'Navigation'
var LocationContext = import_react.createContext(null)
LocationContext.displayName = 'Location'
var RouteContext = import_react.createContext({
  outlet: null,
  matches: [],
  isDataRoute: false,
})
RouteContext.displayName = 'Route'
var RouteErrorContext = import_react.createContext(null)
RouteErrorContext.displayName = 'RouteError'
var ERROR_DIGEST_BASE = 'REACT_ROUTER_ERROR'
var ERROR_DIGEST_REDIRECT = 'REDIRECT'
var ERROR_DIGEST_ROUTE_ERROR_RESPONSE = 'ROUTE_ERROR_RESPONSE'
function decodeRedirectErrorDigest(digest) {
  if (digest.startsWith(`${ERROR_DIGEST_BASE}:${ERROR_DIGEST_REDIRECT}:{`))
    try {
      let parsed = JSON.parse(digest.slice(28))
      if (
        typeof parsed === 'object' &&
        parsed &&
        typeof parsed.status === 'number' &&
        typeof parsed.statusText === 'string' &&
        typeof parsed.location === 'string' &&
        typeof parsed.reloadDocument === 'boolean' &&
        typeof parsed.replace === 'boolean'
      )
        return parsed
    } catch {}
}
function decodeRouteErrorResponseDigest(digest) {
  if (digest.startsWith(`${ERROR_DIGEST_BASE}:${ERROR_DIGEST_ROUTE_ERROR_RESPONSE}:{`))
    try {
      let parsed = JSON.parse(digest.slice(40))
      if (
        typeof parsed === 'object' &&
        parsed &&
        typeof parsed.status === 'number' &&
        typeof parsed.statusText === 'string'
      )
        return new ErrorResponseImpl(parsed.status, parsed.statusText, parsed.data)
    } catch {}
}
function useHref(to, { relative } = {}) {
  invariant(
    useInRouterContext(),
    `useHref() may be used only in the context of a <Router> component.`,
  )
  let { basename, navigator } = import_react.useContext(NavigationContext)
  let { hash, pathname, search } = useResolvedPath(to, { relative })
  let joinedPathname = pathname
  if (basename !== '/')
    joinedPathname = pathname === '/' ? basename : joinPaths([basename, pathname])
  return navigator.createHref({
    pathname: joinedPathname,
    search,
    hash,
  })
}
function useInRouterContext() {
  return import_react.useContext(LocationContext) != null
}
function useLocation() {
  invariant(
    useInRouterContext(),
    `useLocation() may be used only in the context of a <Router> component.`,
  )
  return import_react.useContext(LocationContext).location
}
var navigateEffectWarning = `You should call navigate() in a React.useEffect(), not when your component is first rendered.`
function useIsomorphicLayoutEffect(cb) {
  if (!import_react.useContext(NavigationContext).static) import_react.useLayoutEffect(cb)
}
function useNavigate() {
  let { isDataRoute } = import_react.useContext(RouteContext)
  return isDataRoute ? useNavigateStable() : useNavigateUnstable()
}
function useNavigateUnstable() {
  invariant(
    useInRouterContext(),
    `useNavigate() may be used only in the context of a <Router> component.`,
  )
  let dataRouterContext = import_react.useContext(DataRouterContext)
  let { basename, navigator } = import_react.useContext(NavigationContext)
  let { matches } = import_react.useContext(RouteContext)
  let { pathname: locationPathname } = useLocation()
  let routePathnamesJson = JSON.stringify(getResolveToMatches(matches))
  let activeRef = import_react.useRef(false)
  useIsomorphicLayoutEffect(() => {
    activeRef.current = true
  })
  return import_react.useCallback(
    (to, options = {}) => {
      warning(activeRef.current, navigateEffectWarning)
      if (!activeRef.current) return
      if (typeof to === 'number') {
        navigator.go(to)
        return
      }
      let path = resolveTo(
        to,
        JSON.parse(routePathnamesJson),
        locationPathname,
        options.relative === 'path',
      )
      if (dataRouterContext == null && basename !== '/')
        path.pathname = path.pathname === '/' ? basename : joinPaths([basename, path.pathname])
      ;(!!options.replace ? navigator.replace : navigator.push)(path, options.state, options)
    },
    [basename, navigator, routePathnamesJson, locationPathname, dataRouterContext],
  )
}
var OutletContext = import_react.createContext(null)
function useOutletContext() {
  return import_react.useContext(OutletContext)
}
function useOutlet(context) {
  let outlet = import_react.useContext(RouteContext).outlet
  return import_react.useMemo(
    () =>
      outlet &&
      /* @__PURE__ */ import_react.createElement(
        OutletContext.Provider,
        { value: context },
        outlet,
      ),
    [outlet, context],
  )
}
function useResolvedPath(to, { relative } = {}) {
  let { matches } = import_react.useContext(RouteContext)
  let { pathname: locationPathname } = useLocation()
  let routePathnamesJson = JSON.stringify(getResolveToMatches(matches))
  return import_react.useMemo(
    () => resolveTo(to, JSON.parse(routePathnamesJson), locationPathname, relative === 'path'),
    [to, routePathnamesJson, locationPathname, relative],
  )
}
function useRoutesImpl(routes, locationArg, dataRouterOpts) {
  invariant(
    useInRouterContext(),
    `useRoutes() may be used only in the context of a <Router> component.`,
  )
  let { navigator } = import_react.useContext(NavigationContext)
  let { matches: parentMatches } = import_react.useContext(RouteContext)
  let routeMatch = parentMatches[parentMatches.length - 1]
  let parentParams = routeMatch ? routeMatch.params : {}
  let parentPathname = routeMatch ? routeMatch.pathname : '/'
  let parentPathnameBase = routeMatch ? routeMatch.pathnameBase : '/'
  let parentRoute = routeMatch && routeMatch.route
  {
    let parentPath = (parentRoute && parentRoute.path) || ''
    warningOnce(
      parentPathname,
      !parentRoute || parentPath.endsWith('*') || parentPath.endsWith('*?'),
      `You rendered descendant <Routes> (or called \`useRoutes()\`) at "${parentPathname}" (under <Route path="${parentPath}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${parentPath}"> to <Route path="${parentPath === '/' ? '*' : `${parentPath}/*`}">.`,
    )
  }
  let locationFromContext = useLocation()
  let location
  if (locationArg) {
    let parsedLocationArg = typeof locationArg === 'string' ? parsePath(locationArg) : locationArg
    invariant(
      parentPathnameBase === '/' || parsedLocationArg.pathname?.startsWith(parentPathnameBase),
      `When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${parentPathnameBase}" but pathname "${parsedLocationArg.pathname}" was given in the \`location\` prop.`,
    )
    location = parsedLocationArg
  } else location = locationFromContext
  let pathname = location.pathname || '/'
  let remainingPathname = pathname
  if (parentPathnameBase !== '/') {
    let parentSegments = parentPathnameBase.replace(/^\//, '').split('/')
    remainingPathname =
      '/' + pathname.replace(/^\//, '').split('/').slice(parentSegments.length).join('/')
  }
  let matches = matchRoutes(routes, { pathname: remainingPathname })
  warning(
    parentRoute || matches != null,
    `No routes matched location "${location.pathname}${location.search}${location.hash}" `,
  )
  warning(
    matches == null ||
      matches[matches.length - 1].route.element !== void 0 ||
      matches[matches.length - 1].route.Component !== void 0 ||
      matches[matches.length - 1].route.lazy !== void 0,
    `Matched leaf route at location "${location.pathname}${location.search}${location.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`,
  )
  let renderedMatches = _renderMatches(
    matches &&
      matches.map((match) =>
        Object.assign({}, match, {
          params: Object.assign({}, parentParams, match.params),
          pathname: joinPaths([
            parentPathnameBase,
            navigator.encodeLocation
              ? navigator.encodeLocation(
                  match.pathname.replace(/%/g, '%25').replace(/\?/g, '%3F').replace(/#/g, '%23'),
                ).pathname
              : match.pathname,
          ]),
          pathnameBase:
            match.pathnameBase === '/'
              ? parentPathnameBase
              : joinPaths([
                  parentPathnameBase,
                  navigator.encodeLocation
                    ? navigator.encodeLocation(
                        match.pathnameBase
                          .replace(/%/g, '%25')
                          .replace(/\?/g, '%3F')
                          .replace(/#/g, '%23'),
                      ).pathname
                    : match.pathnameBase,
                ]),
        }),
      ),
    parentMatches,
    dataRouterOpts,
  )
  if (locationArg && renderedMatches)
    return /* @__PURE__ */ import_react.createElement(
      LocationContext.Provider,
      {
        value: {
          location: {
            pathname: '/',
            search: '',
            hash: '',
            state: null,
            key: 'default',
            unstable_mask: void 0,
            ...location,
          },
          navigationType: 'POP',
        },
      },
      renderedMatches,
    )
  return renderedMatches
}
function DefaultErrorComponent() {
  let error = useRouteError()
  let message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : JSON.stringify(error)
  let stack = error instanceof Error ? error.stack : null
  let lightgrey = 'rgba(200,200,200, 0.5)'
  let preStyles = {
    padding: '0.5rem',
    backgroundColor: lightgrey,
  }
  let codeStyles = {
    padding: '2px 4px',
    backgroundColor: lightgrey,
  }
  let devInfo = null
  console.error('Error handled by React Router default ErrorBoundary:', error)
  devInfo = /* @__PURE__ */ import_react.createElement(
    import_react.Fragment,
    null,
    /* @__PURE__ */ import_react.createElement('p', null, '💿 Hey developer 👋'),
    /* @__PURE__ */ import_react.createElement(
      'p',
      null,
      'You can provide a way better UX than this when your app throws errors by providing your own ',
      /* @__PURE__ */ import_react.createElement('code', { style: codeStyles }, 'ErrorBoundary'),
      ' or',
      ' ',
      /* @__PURE__ */ import_react.createElement('code', { style: codeStyles }, 'errorElement'),
      ' prop on your route.',
    ),
  )
  return /* @__PURE__ */ import_react.createElement(
    import_react.Fragment,
    null,
    /* @__PURE__ */ import_react.createElement('h2', null, 'Unexpected Application Error!'),
    /* @__PURE__ */ import_react.createElement('h3', { style: { fontStyle: 'italic' } }, message),
    stack ? /* @__PURE__ */ import_react.createElement('pre', { style: preStyles }, stack) : null,
    devInfo,
  )
}
var defaultErrorElement = /* @__PURE__ */ import_react.createElement(DefaultErrorComponent, null)
var RenderErrorBoundary = class extends import_react.Component {
  constructor(props) {
    super(props)
    this.state = {
      location: props.location,
      revalidation: props.revalidation,
      error: props.error,
    }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  static getDerivedStateFromProps(props, state) {
    if (
      state.location !== props.location ||
      (state.revalidation !== 'idle' && props.revalidation === 'idle')
    )
      return {
        error: props.error,
        location: props.location,
        revalidation: props.revalidation,
      }
    return {
      error: props.error !== void 0 ? props.error : state.error,
      location: state.location,
      revalidation: props.revalidation || state.revalidation,
    }
  }
  componentDidCatch(error, errorInfo) {
    if (this.props.onError) this.props.onError(error, errorInfo)
    else console.error('React Router caught the following error during render', error)
  }
  render() {
    let error = this.state.error
    if (
      this.context &&
      typeof error === 'object' &&
      error &&
      'digest' in error &&
      typeof error.digest === 'string'
    ) {
      const decoded = decodeRouteErrorResponseDigest(error.digest)
      if (decoded) error = decoded
    }
    let result =
      error !== void 0
        ? /* @__PURE__ */ import_react.createElement(
            RouteContext.Provider,
            { value: this.props.routeContext },
            /* @__PURE__ */ import_react.createElement(RouteErrorContext.Provider, {
              value: error,
              children: this.props.component,
            }),
          )
        : this.props.children
    if (this.context)
      return /* @__PURE__ */ import_react.createElement(RSCErrorHandler, { error }, result)
    return result
  }
}
RenderErrorBoundary.contextType = RSCRouterContext
var errorRedirectHandledMap = /* @__PURE__ */ new WeakMap()
function RSCErrorHandler({ children, error }) {
  let { basename } = import_react.useContext(NavigationContext)
  if (typeof error === 'object' && error && 'digest' in error && typeof error.digest === 'string') {
    let redirect2 = decodeRedirectErrorDigest(error.digest)
    if (redirect2) {
      let existingRedirect = errorRedirectHandledMap.get(error)
      if (existingRedirect) throw existingRedirect
      let parsed = parseToInfo(redirect2.location, basename)
      if (isBrowser && !errorRedirectHandledMap.get(error))
        if (parsed.isExternal || redirect2.reloadDocument)
          window.location.href = parsed.absoluteURL || parsed.to
        else {
          const redirectPromise = Promise.resolve().then(() =>
            window.__reactRouterDataRouter.navigate(parsed.to, { replace: redirect2.replace }),
          )
          errorRedirectHandledMap.set(error, redirectPromise)
          throw redirectPromise
        }
      return /* @__PURE__ */ import_react.createElement('meta', {
        httpEquiv: 'refresh',
        content: `0;url=${parsed.absoluteURL || parsed.to}`,
      })
    }
  }
  return children
}
function RenderedRoute({ routeContext, match, children }) {
  let dataRouterContext = import_react.useContext(DataRouterContext)
  if (
    dataRouterContext &&
    dataRouterContext.static &&
    dataRouterContext.staticContext &&
    (match.route.errorElement || match.route.ErrorBoundary)
  )
    dataRouterContext.staticContext._deepestRenderedBoundaryId = match.route.id
  return /* @__PURE__ */ import_react.createElement(
    RouteContext.Provider,
    { value: routeContext },
    children,
  )
}
function _renderMatches(matches, parentMatches = [], dataRouterOpts) {
  let dataRouterState = dataRouterOpts?.state
  if (matches == null) {
    if (!dataRouterState) return null
    if (dataRouterState.errors) matches = dataRouterState.matches
    else if (
      parentMatches.length === 0 &&
      !dataRouterState.initialized &&
      dataRouterState.matches.length > 0
    )
      matches = dataRouterState.matches
    else return null
  }
  let renderedMatches = matches
  let errors = dataRouterState?.errors
  if (errors != null) {
    let errorIndex = renderedMatches.findIndex((m) => m.route.id && errors?.[m.route.id] !== void 0)
    invariant(
      errorIndex >= 0,
      `Could not find a matching route for errors on route IDs: ${Object.keys(errors).join(',')}`,
    )
    renderedMatches = renderedMatches.slice(0, Math.min(renderedMatches.length, errorIndex + 1))
  }
  let renderFallback = false
  let fallbackIndex = -1
  if (dataRouterOpts && dataRouterState) {
    renderFallback = dataRouterState.renderFallback
    for (let i = 0; i < renderedMatches.length; i++) {
      let match = renderedMatches[i]
      if (match.route.HydrateFallback || match.route.hydrateFallbackElement) fallbackIndex = i
      if (match.route.id) {
        let { loaderData, errors: errors2 } = dataRouterState
        let needsToRunLoader =
          match.route.loader &&
          !loaderData.hasOwnProperty(match.route.id) &&
          (!errors2 || errors2[match.route.id] === void 0)
        if (match.route.lazy || needsToRunLoader) {
          if (dataRouterOpts.isStatic) renderFallback = true
          if (fallbackIndex >= 0) renderedMatches = renderedMatches.slice(0, fallbackIndex + 1)
          else renderedMatches = [renderedMatches[0]]
          break
        }
      }
    }
  }
  let onErrorHandler = dataRouterOpts?.onError
  let onError =
    dataRouterState && onErrorHandler
      ? (error, errorInfo) => {
          onErrorHandler(error, {
            location: dataRouterState.location,
            params: dataRouterState.matches?.[0]?.params ?? {},
            unstable_pattern: getRoutePattern(dataRouterState.matches),
            errorInfo,
          })
        }
      : void 0
  return renderedMatches.reduceRight((outlet, match, index) => {
    let error
    let shouldRenderHydrateFallback = false
    let errorElement = null
    let hydrateFallbackElement = null
    if (dataRouterState) {
      error = errors && match.route.id ? errors[match.route.id] : void 0
      errorElement = match.route.errorElement || defaultErrorElement
      if (renderFallback) {
        if (fallbackIndex < 0 && index === 0) {
          warningOnce(
            'route-fallback',
            false,
            'No `HydrateFallback` element provided to render during initial hydration',
          )
          shouldRenderHydrateFallback = true
          hydrateFallbackElement = null
        } else if (fallbackIndex === index) {
          shouldRenderHydrateFallback = true
          hydrateFallbackElement = match.route.hydrateFallbackElement || null
        }
      }
    }
    let matches2 = parentMatches.concat(renderedMatches.slice(0, index + 1))
    let getChildren = () => {
      let children
      if (error) children = errorElement
      else if (shouldRenderHydrateFallback) children = hydrateFallbackElement
      else if (match.route.Component)
        children = /* @__PURE__ */ import_react.createElement(match.route.Component, null)
      else if (match.route.element) children = match.route.element
      else children = outlet
      return /* @__PURE__ */ import_react.createElement(RenderedRoute, {
        match,
        routeContext: {
          outlet,
          matches: matches2,
          isDataRoute: dataRouterState != null,
        },
        children,
      })
    }
    return dataRouterState && (match.route.ErrorBoundary || match.route.errorElement || index === 0)
      ? /* @__PURE__ */ import_react.createElement(RenderErrorBoundary, {
          location: dataRouterState.location,
          revalidation: dataRouterState.revalidation,
          component: errorElement,
          error,
          children: getChildren(),
          routeContext: {
            outlet: null,
            matches: matches2,
            isDataRoute: true,
          },
          onError,
        })
      : getChildren()
  }, null)
}
function getDataRouterConsoleError(hookName) {
  return `${hookName} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`
}
function useDataRouterContext(hookName) {
  let ctx = import_react.useContext(DataRouterContext)
  invariant(ctx, getDataRouterConsoleError(hookName))
  return ctx
}
function useDataRouterState(hookName) {
  let state = import_react.useContext(DataRouterStateContext)
  invariant(state, getDataRouterConsoleError(hookName))
  return state
}
function useRouteContext(hookName) {
  let route = import_react.useContext(RouteContext)
  invariant(route, getDataRouterConsoleError(hookName))
  return route
}
function useCurrentRouteId(hookName) {
  let route = useRouteContext(hookName)
  let thisRoute = route.matches[route.matches.length - 1]
  invariant(thisRoute.route.id, `${hookName} can only be used on routes that contain a unique "id"`)
  return thisRoute.route.id
}
function useRouteId() {
  return useCurrentRouteId('useRouteId')
}
function useNavigation() {
  return useDataRouterState('useNavigation').navigation
}
function useMatches() {
  let { matches, loaderData } = useDataRouterState('useMatches')
  return import_react.useMemo(
    () => matches.map((m) => convertRouteMatchToUiMatch(m, loaderData)),
    [matches, loaderData],
  )
}
function useRouteError() {
  let error = import_react.useContext(RouteErrorContext)
  let state = useDataRouterState('useRouteError')
  let routeId = useCurrentRouteId('useRouteError')
  if (error !== void 0) return error
  return state.errors?.[routeId]
}
var blockerId = 0
function useBlocker(shouldBlock) {
  let { router, basename } = useDataRouterContext('useBlocker')
  let state = useDataRouterState('useBlocker')
  let [blockerKey, setBlockerKey] = import_react.useState('')
  let blockerFunction = import_react.useCallback(
    (arg) => {
      if (typeof shouldBlock !== 'function') return !!shouldBlock
      if (basename === '/') return shouldBlock(arg)
      let { currentLocation, nextLocation, historyAction } = arg
      return shouldBlock({
        currentLocation: {
          ...currentLocation,
          pathname: stripBasename(currentLocation.pathname, basename) || currentLocation.pathname,
        },
        nextLocation: {
          ...nextLocation,
          pathname: stripBasename(nextLocation.pathname, basename) || nextLocation.pathname,
        },
        historyAction,
      })
    },
    [basename, shouldBlock],
  )
  import_react.useEffect(() => {
    let key = String(++blockerId)
    setBlockerKey(key)
    return () => router.deleteBlocker(key)
  }, [router])
  import_react.useEffect(() => {
    if (blockerKey !== '') router.getBlocker(blockerKey, blockerFunction)
  }, [router, blockerKey, blockerFunction])
  return blockerKey && state.blockers.has(blockerKey)
    ? state.blockers.get(blockerKey)
    : IDLE_BLOCKER
}
function useNavigateStable() {
  let { router } = useDataRouterContext('useNavigate')
  let id = useCurrentRouteId('useNavigate')
  let activeRef = import_react.useRef(false)
  useIsomorphicLayoutEffect(() => {
    activeRef.current = true
  })
  return import_react.useCallback(
    async (to, options = {}) => {
      warning(activeRef.current, navigateEffectWarning)
      if (!activeRef.current) return
      if (typeof to === 'number') await router.navigate(to)
      else
        await router.navigate(to, {
          fromRouteId: id,
          ...options,
        })
    },
    [router, id],
  )
}
var alreadyWarned = {}
function warningOnce(key, cond, message) {
  if (!cond && !alreadyWarned[key]) {
    alreadyWarned[key] = true
    warning(false, message)
  }
}
var alreadyWarned2 = {}
function warnOnce(condition, message) {
  if (!condition && !alreadyWarned2[message]) {
    alreadyWarned2[message] = true
    console.warn(message)
  }
}
var useOptimisticImpl = import_react.useOptimistic
var stableUseOptimisticSetter = () => void 0
function useOptimisticSafe(val) {
  if (useOptimisticImpl) return useOptimisticImpl(val)
  else return [val, stableUseOptimisticSetter]
}
function mapRouteProperties(route) {
  let updates = {
    hasErrorBoundary:
      route.hasErrorBoundary || route.ErrorBoundary != null || route.errorElement != null,
  }
  if (route.Component) {
    if (route.element)
      warning(
        false,
        'You should not include both `Component` and `element` on your route - `Component` will be used.',
      )
    Object.assign(updates, {
      element: import_react.createElement(route.Component),
      Component: void 0,
    })
  }
  if (route.HydrateFallback) {
    if (route.hydrateFallbackElement)
      warning(
        false,
        'You should not include both `HydrateFallback` and `hydrateFallbackElement` on your route - `HydrateFallback` will be used.',
      )
    Object.assign(updates, {
      hydrateFallbackElement: import_react.createElement(route.HydrateFallback),
      HydrateFallback: void 0,
    })
  }
  if (route.ErrorBoundary) {
    if (route.errorElement)
      warning(
        false,
        'You should not include both `ErrorBoundary` and `errorElement` on your route - `ErrorBoundary` will be used.',
      )
    Object.assign(updates, {
      errorElement: import_react.createElement(route.ErrorBoundary),
      ErrorBoundary: void 0,
    })
  }
  return updates
}
var hydrationRouteProperties = ['HydrateFallback', 'hydrateFallbackElement']
var Deferred = class {
  constructor() {
    this.status = 'pending'
    this.promise = new Promise((resolve, reject) => {
      this.resolve = (value) => {
        if (this.status === 'pending') {
          this.status = 'resolved'
          resolve(value)
        }
      }
      this.reject = (reason) => {
        if (this.status === 'pending') {
          this.status = 'rejected'
          reject(reason)
        }
      }
    })
  }
}
function RouterProvider({
  router,
  flushSync: reactDomFlushSyncImpl,
  onError,
  unstable_useTransitions,
}) {
  unstable_useTransitions = useIsRSCRouterContext() || unstable_useTransitions
  let [_state, setStateImpl] = import_react.useState(router.state)
  let [state, setOptimisticState] = useOptimisticSafe(_state)
  let [pendingState, setPendingState] = import_react.useState()
  let [vtContext, setVtContext] = import_react.useState({ isTransitioning: false })
  let [renderDfd, setRenderDfd] = import_react.useState()
  let [transition, setTransition] = import_react.useState()
  let [interruption, setInterruption] = import_react.useState()
  let fetcherData = import_react.useRef(/* @__PURE__ */ new Map())
  let setState = import_react.useCallback(
    (newState, { deletedFetchers, newErrors, flushSync, viewTransitionOpts }) => {
      if (newErrors && onError)
        Object.values(newErrors).forEach((error) =>
          onError(error, {
            location: newState.location,
            params: newState.matches[0]?.params ?? {},
            unstable_pattern: getRoutePattern(newState.matches),
          }),
        )
      newState.fetchers.forEach((fetcher, key) => {
        if (fetcher.data !== void 0) fetcherData.current.set(key, fetcher.data)
      })
      deletedFetchers.forEach((key) => fetcherData.current.delete(key))
      warnOnce(
        flushSync === false || reactDomFlushSyncImpl != null,
        'You provided the `flushSync` option to a router update, but you are not using the `<RouterProvider>` from `react-router/dom` so `ReactDOM.flushSync()` is unavailable.  Please update your app to `import { RouterProvider } from "react-router/dom"` and ensure you have `react-dom` installed as a dependency to use the `flushSync` option.',
      )
      let isViewTransitionAvailable =
        router.window != null &&
        router.window.document != null &&
        typeof router.window.document.startViewTransition === 'function'
      warnOnce(
        viewTransitionOpts == null || isViewTransitionAvailable,
        'You provided the `viewTransition` option to a router update, but you do not appear to be running in a DOM environment as `window.startViewTransition` is not available.',
      )
      if (!viewTransitionOpts || !isViewTransitionAvailable) {
        if (reactDomFlushSyncImpl && flushSync) reactDomFlushSyncImpl(() => setStateImpl(newState))
        else if (unstable_useTransitions === false) setStateImpl(newState)
        else
          import_react.startTransition(() => {
            if (unstable_useTransitions === true)
              setOptimisticState((s) => getOptimisticRouterState(s, newState))
            setStateImpl(newState)
          })
        return
      }
      if (reactDomFlushSyncImpl && flushSync) {
        reactDomFlushSyncImpl(() => {
          if (transition) {
            renderDfd?.resolve()
            transition.skipTransition()
          }
          setVtContext({
            isTransitioning: true,
            flushSync: true,
            currentLocation: viewTransitionOpts.currentLocation,
            nextLocation: viewTransitionOpts.nextLocation,
          })
        })
        let t = router.window.document.startViewTransition(() => {
          reactDomFlushSyncImpl(() => setStateImpl(newState))
        })
        t.finished.finally(() => {
          reactDomFlushSyncImpl(() => {
            setRenderDfd(void 0)
            setTransition(void 0)
            setPendingState(void 0)
            setVtContext({ isTransitioning: false })
          })
        })
        reactDomFlushSyncImpl(() => setTransition(t))
        return
      }
      if (transition) {
        renderDfd?.resolve()
        transition.skipTransition()
        setInterruption({
          state: newState,
          currentLocation: viewTransitionOpts.currentLocation,
          nextLocation: viewTransitionOpts.nextLocation,
        })
      } else {
        setPendingState(newState)
        setVtContext({
          isTransitioning: true,
          flushSync: false,
          currentLocation: viewTransitionOpts.currentLocation,
          nextLocation: viewTransitionOpts.nextLocation,
        })
      }
    },
    [
      router.window,
      reactDomFlushSyncImpl,
      transition,
      renderDfd,
      unstable_useTransitions,
      setOptimisticState,
      onError,
    ],
  )
  import_react.useLayoutEffect(() => router.subscribe(setState), [router, setState])
  import_react.useEffect(() => {
    if (vtContext.isTransitioning && !vtContext.flushSync) setRenderDfd(new Deferred())
  }, [vtContext])
  import_react.useEffect(() => {
    if (renderDfd && pendingState && router.window) {
      let newState = pendingState
      let renderPromise = renderDfd.promise
      let transition2 = router.window.document.startViewTransition(async () => {
        if (unstable_useTransitions === false) setStateImpl(newState)
        else
          import_react.startTransition(() => {
            if (unstable_useTransitions === true)
              setOptimisticState((s) => getOptimisticRouterState(s, newState))
            setStateImpl(newState)
          })
        await renderPromise
      })
      transition2.finished.finally(() => {
        setRenderDfd(void 0)
        setTransition(void 0)
        setPendingState(void 0)
        setVtContext({ isTransitioning: false })
      })
      setTransition(transition2)
    }
  }, [pendingState, renderDfd, router.window, unstable_useTransitions, setOptimisticState])
  import_react.useEffect(() => {
    if (renderDfd && pendingState && state.location.key === pendingState.location.key)
      renderDfd.resolve()
  }, [renderDfd, transition, state.location, pendingState])
  import_react.useEffect(() => {
    if (!vtContext.isTransitioning && interruption) {
      setPendingState(interruption.state)
      setVtContext({
        isTransitioning: true,
        flushSync: false,
        currentLocation: interruption.currentLocation,
        nextLocation: interruption.nextLocation,
      })
      setInterruption(void 0)
    }
  }, [vtContext.isTransitioning, interruption])
  let navigator = import_react.useMemo(() => {
    return {
      createHref: router.createHref,
      encodeLocation: router.encodeLocation,
      go: (n) => router.navigate(n),
      push: (to, state2, opts) =>
        router.navigate(to, {
          state: state2,
          preventScrollReset: opts?.preventScrollReset,
        }),
      replace: (to, state2, opts) =>
        router.navigate(to, {
          replace: true,
          state: state2,
          preventScrollReset: opts?.preventScrollReset,
        }),
    }
  }, [router])
  let basename = router.basename || '/'
  let dataRouterContext = import_react.useMemo(
    () => ({
      router,
      navigator,
      static: false,
      basename,
      onError,
    }),
    [router, navigator, basename, onError],
  )
  return /* @__PURE__ */ import_react.createElement(
    import_react.Fragment,
    null,
    /* @__PURE__ */ import_react.createElement(
      DataRouterContext.Provider,
      { value: dataRouterContext },
      /* @__PURE__ */ import_react.createElement(
        DataRouterStateContext.Provider,
        { value: state },
        /* @__PURE__ */ import_react.createElement(
          FetchersContext.Provider,
          { value: fetcherData.current },
          /* @__PURE__ */ import_react.createElement(
            ViewTransitionContext.Provider,
            { value: vtContext },
            /* @__PURE__ */ import_react.createElement(
              Router,
              {
                basename,
                location: state.location,
                navigationType: state.historyAction,
                navigator,
                unstable_useTransitions,
              },
              /* @__PURE__ */ import_react.createElement(MemoizedDataRoutes, {
                routes: router.routes,
                future: router.future,
                state,
                isStatic: false,
                onError,
              }),
            ),
          ),
        ),
      ),
    ),
    null,
  )
}
function getOptimisticRouterState(currentState, newState) {
  return {
    ...currentState,
    navigation:
      newState.navigation.state !== 'idle' ? newState.navigation : currentState.navigation,
    revalidation:
      newState.revalidation !== 'idle' ? newState.revalidation : currentState.revalidation,
    actionData:
      newState.navigation.state !== 'submitting' ? newState.actionData : currentState.actionData,
    fetchers: newState.fetchers,
  }
}
var MemoizedDataRoutes = import_react.memo(DataRoutes)
function DataRoutes({ routes, future, state, isStatic, onError }) {
  return useRoutesImpl(routes, void 0, {
    state,
    isStatic,
    onError,
    future,
  })
}
function Navigate({ to, replace: replace2, state, relative }) {
  invariant(
    useInRouterContext(),
    `<Navigate> may be used only in the context of a <Router> component.`,
  )
  let { static: isStatic } = import_react.useContext(NavigationContext)
  warning(
    !isStatic,
    `<Navigate> must not be used on the initial render in a <StaticRouter>. This is a no-op, but you should modify your code so the <Navigate> is only ever rendered in response to some user interaction or state change.`,
  )
  let { matches } = import_react.useContext(RouteContext)
  let { pathname: locationPathname } = useLocation()
  let navigate = useNavigate()
  let path = resolveTo(to, getResolveToMatches(matches), locationPathname, relative === 'path')
  let jsonPath = JSON.stringify(path)
  import_react.useEffect(() => {
    navigate(JSON.parse(jsonPath), {
      replace: replace2,
      state,
      relative,
    })
  }, [navigate, jsonPath, relative, replace2, state])
  return null
}
function Outlet(props) {
  return useOutlet(props.context)
}
function Router({
  basename: basenameProp = '/',
  children = null,
  location: locationProp,
  navigationType = 'POP',
  navigator,
  static: staticProp = false,
  unstable_useTransitions,
}) {
  invariant(
    !useInRouterContext(),
    `You cannot render a <Router> inside another <Router>. You should never have more than one in your app.`,
  )
  let basename = basenameProp.replace(/^\/*/, '/')
  let navigationContext = import_react.useMemo(
    () => ({
      basename,
      navigator,
      static: staticProp,
      unstable_useTransitions,
      future: {},
    }),
    [basename, navigator, staticProp, unstable_useTransitions],
  )
  if (typeof locationProp === 'string') locationProp = parsePath(locationProp)
  let {
    pathname = '/',
    search = '',
    hash = '',
    state = null,
    key = 'default',
    unstable_mask,
  } = locationProp
  let locationContext = import_react.useMemo(() => {
    let trailingPathname = stripBasename(pathname, basename)
    if (trailingPathname == null) return null
    return {
      location: {
        pathname: trailingPathname,
        search,
        hash,
        state,
        key,
        unstable_mask,
      },
      navigationType,
    }
  }, [basename, pathname, search, hash, state, key, navigationType, unstable_mask])
  warning(
    locationContext != null,
    `<Router basename="${basename}"> is not able to match the URL "${pathname}${search}${hash}" because it does not start with the basename, so the <Router> won't render anything.`,
  )
  if (locationContext == null) return null
  return /* @__PURE__ */ import_react.createElement(
    NavigationContext.Provider,
    { value: navigationContext },
    /* @__PURE__ */ import_react.createElement(LocationContext.Provider, {
      children,
      value: locationContext,
    }),
  )
}
import_react.Component
var defaultMethod = 'get'
var defaultEncType = 'application/x-www-form-urlencoded'
function isHtmlElement(object) {
  return typeof HTMLElement !== 'undefined' && object instanceof HTMLElement
}
function isButtonElement(object) {
  return isHtmlElement(object) && object.tagName.toLowerCase() === 'button'
}
function isFormElement(object) {
  return isHtmlElement(object) && object.tagName.toLowerCase() === 'form'
}
function isInputElement(object) {
  return isHtmlElement(object) && object.tagName.toLowerCase() === 'input'
}
function isModifiedEvent(event) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
}
function shouldProcessLinkClick(event, target) {
  return event.button === 0 && (!target || target === '_self') && !isModifiedEvent(event)
}
function createSearchParams(init = '') {
  return new URLSearchParams(
    typeof init === 'string' || Array.isArray(init) || init instanceof URLSearchParams
      ? init
      : Object.keys(init).reduce((memo2, key) => {
          let value = init[key]
          return memo2.concat(Array.isArray(value) ? value.map((v) => [key, v]) : [[key, value]])
        }, []),
  )
}
function getSearchParamsForLocation(locationSearch, defaultSearchParams) {
  let searchParams = createSearchParams(locationSearch)
  if (defaultSearchParams)
    defaultSearchParams.forEach((_, key) => {
      if (!searchParams.has(key))
        defaultSearchParams.getAll(key).forEach((value) => {
          searchParams.append(key, value)
        })
    })
  return searchParams
}
var _formDataSupportsSubmitter = null
function isFormDataSubmitterSupported() {
  if (_formDataSupportsSubmitter === null)
    try {
      new FormData(document.createElement('form'), 0)
      _formDataSupportsSubmitter = false
    } catch (e) {
      _formDataSupportsSubmitter = true
    }
  return _formDataSupportsSubmitter
}
var supportedFormEncTypes = /* @__PURE__ */ new Set([
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
])
function getFormEncType(encType) {
  if (encType != null && !supportedFormEncTypes.has(encType)) {
    warning(
      false,
      `"${encType}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${defaultEncType}"`,
    )
    return null
  }
  return encType
}
function getFormSubmissionInfo(target, basename) {
  let method
  let action
  let encType
  let formData
  let body
  if (isFormElement(target)) {
    let attr = target.getAttribute('action')
    action = attr ? stripBasename(attr, basename) : null
    method = target.getAttribute('method') || defaultMethod
    encType = getFormEncType(target.getAttribute('enctype')) || defaultEncType
    formData = new FormData(target)
  } else if (
    isButtonElement(target) ||
    (isInputElement(target) && (target.type === 'submit' || target.type === 'image'))
  ) {
    let form = target.form
    if (form == null)
      throw new Error(`Cannot submit a <button> or <input type="submit"> without a <form>`)
    let attr = target.getAttribute('formaction') || form.getAttribute('action')
    action = attr ? stripBasename(attr, basename) : null
    method = target.getAttribute('formmethod') || form.getAttribute('method') || defaultMethod
    encType =
      getFormEncType(target.getAttribute('formenctype')) ||
      getFormEncType(form.getAttribute('enctype')) ||
      defaultEncType
    formData = new FormData(form, target)
    if (!isFormDataSubmitterSupported()) {
      let { name, type, value } = target
      if (type === 'image') {
        let prefix = name ? `${name}.` : ''
        formData.append(`${prefix}x`, '0')
        formData.append(`${prefix}y`, '0')
      } else if (name) formData.append(name, value)
    }
  } else if (isHtmlElement(target))
    throw new Error(
      `Cannot submit element that is not <form>, <button>, or <input type="submit|image">`,
    )
  else {
    method = defaultMethod
    action = null
    encType = defaultEncType
    body = target
  }
  if (formData && encType === 'text/plain') {
    body = formData
    formData = void 0
  }
  return {
    action,
    method: method.toLowerCase(),
    encType,
    formData,
    body,
  }
}
Object.getOwnPropertyNames(Object.prototype).sort().join('\0')
var ESCAPE_LOOKUP = {
  '&': '\\u0026',
  '>': '\\u003e',
  '<': '\\u003c',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
}
var ESCAPE_REGEX = /[&><\u2028\u2029]/g
function escapeHtml(html) {
  return html.replace(ESCAPE_REGEX, (match) => ESCAPE_LOOKUP[match])
}
function invariant2(value, message) {
  if (value === false || value === null || typeof value === 'undefined') throw new Error(message)
}
function singleFetchUrl(reqUrl, basename, trailingSlashAware, extension) {
  let url =
    typeof reqUrl === 'string'
      ? new URL(
          reqUrl,
          typeof window === 'undefined' ? 'server://singlefetch/' : window.location.origin,
        )
      : reqUrl
  if (trailingSlashAware)
    if (url.pathname.endsWith('/')) url.pathname = `${url.pathname}_.${extension}`
    else url.pathname = `${url.pathname}.${extension}`
  else if (url.pathname === '/') url.pathname = `_root.${extension}`
  else if (basename && stripBasename(url.pathname, basename) === '/')
    url.pathname = `${basename.replace(/\/$/, '')}/_root.${extension}`
  else url.pathname = `${url.pathname.replace(/\/$/, '')}.${extension}`
  return url
}
async function loadRouteModule(route, routeModulesCache) {
  if (route.id in routeModulesCache) return routeModulesCache[route.id]
  try {
    let routeModule = await __vitePreload(
      () =>
        import(
          /* @vite-ignore */
          /* webpackIgnore: true */
          route.module
        ),
      [],
    )
    routeModulesCache[route.id] = routeModule
    return routeModule
  } catch (error) {
    console.error(`Error loading route module \`${route.module}\`, reloading page...`)
    console.error(error)
    if (window.__reactRouterContext && window.__reactRouterContext.isSpaMode && void 0);
    window.location.reload()
    return new Promise(() => {})
  }
}
function isPageLinkDescriptor(object) {
  return object != null && typeof object.page === 'string'
}
function isHtmlLinkDescriptor(object) {
  if (object == null) return false
  if (object.href == null)
    return (
      object.rel === 'preload' &&
      typeof object.imageSrcSet === 'string' &&
      typeof object.imageSizes === 'string'
    )
  return typeof object.rel === 'string' && typeof object.href === 'string'
}
async function getKeyedPrefetchLinks(matches, manifest, routeModules) {
  return dedupeLinkDescriptors(
    (
      await Promise.all(
        matches.map(async (match) => {
          let route = manifest.routes[match.route.id]
          if (route) {
            let mod = await loadRouteModule(route, routeModules)
            return mod.links ? mod.links() : []
          }
          return []
        }),
      )
    )
      .flat(1)
      .filter(isHtmlLinkDescriptor)
      .filter((link) => link.rel === 'stylesheet' || link.rel === 'preload')
      .map((link) =>
        link.rel === 'stylesheet'
          ? {
              ...link,
              rel: 'prefetch',
              as: 'style',
            }
          : {
              ...link,
              rel: 'prefetch',
            },
      ),
  )
}
function getNewMatchesForLinks(page, nextMatches, currentMatches, manifest, location, mode) {
  let isNew = (match, index) => {
    if (!currentMatches[index]) return true
    return match.route.id !== currentMatches[index].route.id
  }
  let matchPathChanged = (match, index) => {
    return (
      currentMatches[index].pathname !== match.pathname ||
      (currentMatches[index].route.path?.endsWith('*') &&
        currentMatches[index].params['*'] !== match.params['*'])
    )
  }
  if (mode === 'assets')
    return nextMatches.filter(
      (match, index) => isNew(match, index) || matchPathChanged(match, index),
    )
  if (mode === 'data')
    return nextMatches.filter((match, index) => {
      let manifestRoute = manifest.routes[match.route.id]
      if (!manifestRoute || !manifestRoute.hasLoader) return false
      if (isNew(match, index) || matchPathChanged(match, index)) return true
      if (match.route.shouldRevalidate) {
        let routeChoice = match.route.shouldRevalidate({
          currentUrl: new URL(location.pathname + location.search + location.hash, window.origin),
          currentParams: currentMatches[0]?.params || {},
          nextUrl: new URL(page, window.origin),
          nextParams: match.params,
          defaultShouldRevalidate: true,
        })
        if (typeof routeChoice === 'boolean') return routeChoice
      }
      return true
    })
  return []
}
function getModuleLinkHrefs(matches, manifest, { includeHydrateFallback } = {}) {
  return dedupeHrefs(
    matches
      .map((match) => {
        let route = manifest.routes[match.route.id]
        if (!route) return []
        let hrefs = [route.module]
        if (route.clientActionModule) hrefs = hrefs.concat(route.clientActionModule)
        if (route.clientLoaderModule) hrefs = hrefs.concat(route.clientLoaderModule)
        if (includeHydrateFallback && route.hydrateFallbackModule)
          hrefs = hrefs.concat(route.hydrateFallbackModule)
        if (route.imports) hrefs = hrefs.concat(route.imports)
        return hrefs
      })
      .flat(1),
  )
}
function dedupeHrefs(hrefs) {
  return [...new Set(hrefs)]
}
function sortKeys(obj) {
  let sorted = {}
  let keys = Object.keys(obj).sort()
  for (let key of keys) sorted[key] = obj[key]
  return sorted
}
function dedupeLinkDescriptors(descriptors, preloads) {
  let set = /* @__PURE__ */ new Set()
  let preloadsSet = new Set(preloads)
  return descriptors.reduce((deduped, descriptor) => {
    if (
      preloads &&
      !isPageLinkDescriptor(descriptor) &&
      descriptor.as === 'script' &&
      descriptor.href &&
      preloadsSet.has(descriptor.href)
    )
      return deduped
    let key = JSON.stringify(sortKeys(descriptor))
    if (!set.has(key)) {
      set.add(key)
      deduped.push({
        key,
        link: descriptor,
      })
    }
    return deduped
  }, [])
}
function useDataRouterContext2() {
  let context = import_react.useContext(DataRouterContext)
  invariant2(context, 'You must render this element inside a <DataRouterContext.Provider> element')
  return context
}
function useDataRouterStateContext() {
  let context = import_react.useContext(DataRouterStateContext)
  invariant2(
    context,
    'You must render this element inside a <DataRouterStateContext.Provider> element',
  )
  return context
}
var FrameworkContext = import_react.createContext(void 0)
FrameworkContext.displayName = 'FrameworkContext'
function useFrameworkContext() {
  let context = import_react.useContext(FrameworkContext)
  invariant2(context, 'You must render this element inside a <HydratedRouter> element')
  return context
}
function usePrefetchBehavior(prefetch, theirElementProps) {
  let frameworkContext = import_react.useContext(FrameworkContext)
  let [maybePrefetch, setMaybePrefetch] = import_react.useState(false)
  let [shouldPrefetch, setShouldPrefetch] = import_react.useState(false)
  let { onFocus, onBlur, onMouseEnter, onMouseLeave, onTouchStart } = theirElementProps
  let ref = import_react.useRef(null)
  import_react.useEffect(() => {
    if (prefetch === 'render') setShouldPrefetch(true)
    if (prefetch === 'viewport') {
      let callback = (entries) => {
        entries.forEach((entry) => {
          setShouldPrefetch(entry.isIntersecting)
        })
      }
      let observer = new IntersectionObserver(callback, { threshold: 0.5 })
      if (ref.current) observer.observe(ref.current)
      return () => {
        observer.disconnect()
      }
    }
  }, [prefetch])
  import_react.useEffect(() => {
    if (maybePrefetch) {
      let id = setTimeout(() => {
        setShouldPrefetch(true)
      }, 100)
      return () => {
        clearTimeout(id)
      }
    }
  }, [maybePrefetch])
  let setIntent = () => {
    setMaybePrefetch(true)
  }
  let cancelIntent = () => {
    setMaybePrefetch(false)
    setShouldPrefetch(false)
  }
  if (!frameworkContext) return [false, ref, {}]
  if (prefetch !== 'intent') return [shouldPrefetch, ref, {}]
  return [
    shouldPrefetch,
    ref,
    {
      onFocus: composeEventHandlers(onFocus, setIntent),
      onBlur: composeEventHandlers(onBlur, cancelIntent),
      onMouseEnter: composeEventHandlers(onMouseEnter, setIntent),
      onMouseLeave: composeEventHandlers(onMouseLeave, cancelIntent),
      onTouchStart: composeEventHandlers(onTouchStart, setIntent),
    },
  ]
}
function composeEventHandlers(theirHandler, ourHandler) {
  return (event) => {
    theirHandler && theirHandler(event)
    if (!event.defaultPrevented) ourHandler(event)
  }
}
function PrefetchPageLinks({ page, ...linkProps }) {
  let rsc = useIsRSCRouterContext()
  let { router } = useDataRouterContext2()
  let matches = import_react.useMemo(
    () => matchRoutes(router.routes, page, router.basename),
    [router.routes, page, router.basename],
  )
  if (!matches) return null
  if (rsc)
    return /* @__PURE__ */ import_react.createElement(RSCPrefetchPageLinksImpl, {
      page,
      matches,
      ...linkProps,
    })
  return /* @__PURE__ */ import_react.createElement(PrefetchPageLinksImpl, {
    page,
    matches,
    ...linkProps,
  })
}
function useKeyedPrefetchLinks(matches) {
  let { manifest, routeModules } = useFrameworkContext()
  let [keyedPrefetchLinks, setKeyedPrefetchLinks] = import_react.useState([])
  import_react.useEffect(() => {
    let interrupted = false
    getKeyedPrefetchLinks(matches, manifest, routeModules).then((links) => {
      if (!interrupted) setKeyedPrefetchLinks(links)
    })
    return () => {
      interrupted = true
    }
  }, [matches, manifest, routeModules])
  return keyedPrefetchLinks
}
function RSCPrefetchPageLinksImpl({ page, matches: nextMatches, ...linkProps }) {
  let location = useLocation()
  let { future } = useFrameworkContext()
  let { basename } = useDataRouterContext2()
  let dataHrefs = import_react.useMemo(() => {
    if (page === location.pathname + location.search + location.hash) return []
    let url = singleFetchUrl(page, basename, future.unstable_trailingSlashAwareDataRequests, 'rsc')
    let hasSomeRoutesWithShouldRevalidate = false
    let targetRoutes = []
    for (let match of nextMatches)
      if (typeof match.route.shouldRevalidate === 'function')
        hasSomeRoutesWithShouldRevalidate = true
      else targetRoutes.push(match.route.id)
    if (hasSomeRoutesWithShouldRevalidate && targetRoutes.length > 0)
      url.searchParams.set('_routes', targetRoutes.join(','))
    return [url.pathname + url.search]
  }, [basename, future.unstable_trailingSlashAwareDataRequests, page, location, nextMatches])
  return /* @__PURE__ */ import_react.createElement(
    import_react.Fragment,
    null,
    dataHrefs.map((href) =>
      /* @__PURE__ */ import_react.createElement('link', {
        key: href,
        rel: 'prefetch',
        as: 'fetch',
        href,
        ...linkProps,
      }),
    ),
  )
}
function PrefetchPageLinksImpl({ page, matches: nextMatches, ...linkProps }) {
  let location = useLocation()
  let { future, manifest, routeModules } = useFrameworkContext()
  let { basename } = useDataRouterContext2()
  let { loaderData, matches } = useDataRouterStateContext()
  let newMatchesForData = import_react.useMemo(
    () => getNewMatchesForLinks(page, nextMatches, matches, manifest, location, 'data'),
    [page, nextMatches, matches, manifest, location],
  )
  let newMatchesForAssets = import_react.useMemo(
    () => getNewMatchesForLinks(page, nextMatches, matches, manifest, location, 'assets'),
    [page, nextMatches, matches, manifest, location],
  )
  let dataHrefs = import_react.useMemo(() => {
    if (page === location.pathname + location.search + location.hash) return []
    let routesParams = /* @__PURE__ */ new Set()
    let foundOptOutRoute = false
    nextMatches.forEach((m) => {
      let manifestRoute = manifest.routes[m.route.id]
      if (!manifestRoute || !manifestRoute.hasLoader) return
      if (
        !newMatchesForData.some((m2) => m2.route.id === m.route.id) &&
        m.route.id in loaderData &&
        routeModules[m.route.id]?.shouldRevalidate
      )
        foundOptOutRoute = true
      else if (manifestRoute.hasClientLoader) foundOptOutRoute = true
      else routesParams.add(m.route.id)
    })
    if (routesParams.size === 0) return []
    let url = singleFetchUrl(page, basename, future.unstable_trailingSlashAwareDataRequests, 'data')
    if (foundOptOutRoute && routesParams.size > 0)
      url.searchParams.set(
        '_routes',
        nextMatches
          .filter((m) => routesParams.has(m.route.id))
          .map((m) => m.route.id)
          .join(','),
      )
    return [url.pathname + url.search]
  }, [
    basename,
    future.unstable_trailingSlashAwareDataRequests,
    loaderData,
    location,
    manifest,
    newMatchesForData,
    nextMatches,
    page,
    routeModules,
  ])
  let moduleHrefs = import_react.useMemo(
    () => getModuleLinkHrefs(newMatchesForAssets, manifest),
    [newMatchesForAssets, manifest],
  )
  let keyedPrefetchLinks = useKeyedPrefetchLinks(newMatchesForAssets)
  return /* @__PURE__ */ import_react.createElement(
    import_react.Fragment,
    null,
    dataHrefs.map((href) =>
      /* @__PURE__ */ import_react.createElement('link', {
        key: href,
        rel: 'prefetch',
        as: 'fetch',
        href,
        ...linkProps,
      }),
    ),
    moduleHrefs.map((href) =>
      /* @__PURE__ */ import_react.createElement('link', {
        key: href,
        rel: 'modulepreload',
        href,
        ...linkProps,
      }),
    ),
    keyedPrefetchLinks.map(({ key, link }) =>
      /* @__PURE__ */ import_react.createElement('link', {
        key,
        nonce: linkProps.nonce,
        ...link,
        crossOrigin: link.crossOrigin ?? linkProps.crossOrigin,
      }),
    ),
  )
}
function mergeRefs(...refs) {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') ref(value)
      else if (ref != null) ref.current = value
    })
  }
}
import_react.Component
var isBrowser2 =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined'
try {
  if (isBrowser2) window.__reactRouterVersion = '7.14.0'
} catch (e) {}
function createBrowserRouter(routes, opts) {
  return createRouter({
    basename: opts?.basename,
    getContext: opts?.getContext,
    future: opts?.future,
    history: createBrowserHistory({ window: opts?.window }),
    hydrationData: opts?.hydrationData || parseHydrationData(),
    routes,
    mapRouteProperties,
    hydrationRouteProperties,
    dataStrategy: opts?.dataStrategy,
    patchRoutesOnNavigation: opts?.patchRoutesOnNavigation,
    window: opts?.window,
    unstable_instrumentations: opts?.unstable_instrumentations,
  }).initialize()
}
function parseHydrationData() {
  let state = window?.__staticRouterHydrationData
  if (state && state.errors)
    state = {
      ...state,
      errors: deserializeErrors(state.errors),
    }
  return state
}
function deserializeErrors(errors) {
  if (!errors) return null
  let entries = Object.entries(errors)
  let serialized = {}
  for (let [key, val] of entries)
    if (val && val.__type === 'RouteErrorResponse')
      serialized[key] = new ErrorResponseImpl(
        val.status,
        val.statusText,
        val.data,
        val.internal === true,
      )
    else if (val && val.__type === 'Error') {
      if (val.__subType) {
        let ErrorConstructor = window[val.__subType]
        if (typeof ErrorConstructor === 'function')
          try {
            let error = new ErrorConstructor(val.message)
            error.stack = ''
            serialized[key] = error
          } catch (e) {}
      }
      if (serialized[key] == null) {
        let error = new Error(val.message)
        error.stack = ''
        serialized[key] = error
      }
    } else serialized[key] = val
  return serialized
}
function HistoryRouter({ basename, children, history, unstable_useTransitions }) {
  let [state, setStateImpl] = import_react.useState({
    action: history.action,
    location: history.location,
  })
  let setState = import_react.useCallback(
    (newState) => {
      if (unstable_useTransitions === false) setStateImpl(newState)
      else import_react.startTransition(() => setStateImpl(newState))
    },
    [unstable_useTransitions],
  )
  import_react.useLayoutEffect(() => history.listen(setState), [history, setState])
  return /* @__PURE__ */ import_react.createElement(Router, {
    basename,
    children,
    location: state.location,
    navigationType: state.action,
    navigator: history,
    unstable_useTransitions,
  })
}
HistoryRouter.displayName = 'unstable_HistoryRouter'
var ABSOLUTE_URL_REGEX2 = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i
var Link = import_react.forwardRef(function LinkWithRef(
  {
    onClick,
    discover = 'render',
    prefetch = 'none',
    relative,
    reloadDocument,
    replace: replace2,
    unstable_mask,
    state,
    target,
    to,
    preventScrollReset,
    viewTransition,
    unstable_defaultShouldRevalidate,
    ...rest
  },
  forwardedRef,
) {
  let { basename, navigator, unstable_useTransitions } = import_react.useContext(NavigationContext)
  let isAbsolute = typeof to === 'string' && ABSOLUTE_URL_REGEX2.test(to)
  let parsed = parseToInfo(to, basename)
  to = parsed.to
  let href = useHref(to, { relative })
  let location = useLocation()
  let maskedHref = null
  if (unstable_mask) {
    let resolved = resolveTo(
      unstable_mask,
      [],
      location.unstable_mask ? location.unstable_mask.pathname : '/',
      true,
    )
    if (basename !== '/')
      resolved.pathname =
        resolved.pathname === '/' ? basename : joinPaths([basename, resolved.pathname])
    maskedHref = navigator.createHref(resolved)
  }
  let [shouldPrefetch, prefetchRef, prefetchHandlers] = usePrefetchBehavior(prefetch, rest)
  let internalOnClick = useLinkClickHandler(to, {
    replace: replace2,
    unstable_mask,
    state,
    target,
    preventScrollReset,
    relative,
    viewTransition,
    unstable_defaultShouldRevalidate,
    unstable_useTransitions,
  })
  function handleClick(event) {
    if (onClick) onClick(event)
    if (!event.defaultPrevented) internalOnClick(event)
  }
  let isSpaLink = !(parsed.isExternal || reloadDocument)
  let link = /* @__PURE__ */ import_react.createElement('a', {
    ...rest,
    ...prefetchHandlers,
    href: (isSpaLink ? maskedHref : void 0) || parsed.absoluteURL || href,
    onClick: isSpaLink ? handleClick : onClick,
    ref: mergeRefs(forwardedRef, prefetchRef),
    target,
    'data-discover': !isAbsolute && discover === 'render' ? 'true' : void 0,
  })
  return shouldPrefetch && !isAbsolute
    ? /* @__PURE__ */ import_react.createElement(
        import_react.Fragment,
        null,
        link,
        /* @__PURE__ */ import_react.createElement(PrefetchPageLinks, { page: href }),
      )
    : link
})
Link.displayName = 'Link'
var NavLink = import_react.forwardRef(function NavLinkWithRef(
  {
    'aria-current': ariaCurrentProp = 'page',
    caseSensitive = false,
    className: classNameProp = '',
    end = false,
    style: styleProp,
    to,
    viewTransition,
    children,
    ...rest
  },
  ref,
) {
  let path = useResolvedPath(to, { relative: rest.relative })
  let location = useLocation()
  let routerState = import_react.useContext(DataRouterStateContext)
  let { navigator, basename } = import_react.useContext(NavigationContext)
  let isTransitioning =
    routerState != null && useViewTransitionState(path) && viewTransition === true
  let toPathname = navigator.encodeLocation
    ? navigator.encodeLocation(path).pathname
    : path.pathname
  let locationPathname = location.pathname
  let nextLocationPathname =
    routerState && routerState.navigation && routerState.navigation.location
      ? routerState.navigation.location.pathname
      : null
  if (!caseSensitive) {
    locationPathname = locationPathname.toLowerCase()
    nextLocationPathname = nextLocationPathname ? nextLocationPathname.toLowerCase() : null
    toPathname = toPathname.toLowerCase()
  }
  if (nextLocationPathname && basename)
    nextLocationPathname = stripBasename(nextLocationPathname, basename) || nextLocationPathname
  const endSlashPosition =
    toPathname !== '/' && toPathname.endsWith('/') ? toPathname.length - 1 : toPathname.length
  let isActive =
    locationPathname === toPathname ||
    (!end &&
      locationPathname.startsWith(toPathname) &&
      locationPathname.charAt(endSlashPosition) === '/')
  let isPending =
    nextLocationPathname != null &&
    (nextLocationPathname === toPathname ||
      (!end &&
        nextLocationPathname.startsWith(toPathname) &&
        nextLocationPathname.charAt(toPathname.length) === '/'))
  let renderProps = {
    isActive,
    isPending,
    isTransitioning,
  }
  let ariaCurrent = isActive ? ariaCurrentProp : void 0
  let className
  if (typeof classNameProp === 'function') className = classNameProp(renderProps)
  else
    className = [
      classNameProp,
      isActive ? 'active' : null,
      isPending ? 'pending' : null,
      isTransitioning ? 'transitioning' : null,
    ]
      .filter(Boolean)
      .join(' ')
  let style = typeof styleProp === 'function' ? styleProp(renderProps) : styleProp
  return /* @__PURE__ */ import_react.createElement(
    Link,
    {
      ...rest,
      'aria-current': ariaCurrent,
      className,
      ref,
      style,
      to,
      viewTransition,
    },
    typeof children === 'function' ? children(renderProps) : children,
  )
})
NavLink.displayName = 'NavLink'
var Form = import_react.forwardRef(
  (
    {
      discover = 'render',
      fetcherKey,
      navigate,
      reloadDocument,
      replace: replace2,
      state,
      method = defaultMethod,
      action,
      onSubmit,
      relative,
      preventScrollReset,
      viewTransition,
      unstable_defaultShouldRevalidate,
      ...props
    },
    forwardedRef,
  ) => {
    let { unstable_useTransitions } = import_react.useContext(NavigationContext)
    let submit = useSubmit()
    let formAction = useFormAction(action, { relative })
    let formMethod = method.toLowerCase() === 'get' ? 'get' : 'post'
    let isAbsolute = typeof action === 'string' && ABSOLUTE_URL_REGEX2.test(action)
    let submitHandler = (event) => {
      onSubmit && onSubmit(event)
      if (event.defaultPrevented) return
      event.preventDefault()
      let submitter = event.nativeEvent.submitter
      let submitMethod = submitter?.getAttribute('formmethod') || method
      let doSubmit = () =>
        submit(submitter || event.currentTarget, {
          fetcherKey,
          method: submitMethod,
          navigate,
          replace: replace2,
          state,
          relative,
          preventScrollReset,
          viewTransition,
          unstable_defaultShouldRevalidate,
        })
      if (unstable_useTransitions && navigate !== false)
        import_react.startTransition(() => doSubmit())
      else doSubmit()
    }
    return /* @__PURE__ */ import_react.createElement('form', {
      ref: forwardedRef,
      method: formMethod,
      action: formAction,
      onSubmit: reloadDocument ? onSubmit : submitHandler,
      ...props,
      'data-discover': !isAbsolute && discover === 'render' ? 'true' : void 0,
    })
  },
)
Form.displayName = 'Form'
function ScrollRestoration({ getKey, storageKey, ...props }) {
  let remixContext = import_react.useContext(FrameworkContext)
  let { basename } = import_react.useContext(NavigationContext)
  let location = useLocation()
  let matches = useMatches()
  useScrollRestoration({
    getKey,
    storageKey,
  })
  let ssrKey = import_react.useMemo(() => {
    if (!remixContext || !getKey) return null
    let userKey = getScrollRestorationKey(location, matches, basename, getKey)
    return userKey !== location.key ? userKey : null
  }, [])
  if (!remixContext || remixContext.isSpaMode) return null
  let restoreScroll = ((storageKey2, restoreKey) => {
    if (!window.history.state || !window.history.state.key) {
      let key = Math.random().toString(32).slice(2)
      window.history.replaceState({ key }, '')
    }
    try {
      let storedY = JSON.parse(sessionStorage.getItem(storageKey2) || '{}')[
        restoreKey || window.history.state.key
      ]
      if (typeof storedY === 'number') window.scrollTo(0, storedY)
    } catch (error) {
      console.error(error)
      sessionStorage.removeItem(storageKey2)
    }
  }).toString()
  return /* @__PURE__ */ import_react.createElement('script', {
    ...props,
    suppressHydrationWarning: true,
    dangerouslySetInnerHTML: {
      __html: `(${restoreScroll})(${escapeHtml(JSON.stringify(storageKey || SCROLL_RESTORATION_STORAGE_KEY))}, ${escapeHtml(JSON.stringify(ssrKey))})`,
    },
  })
}
ScrollRestoration.displayName = 'ScrollRestoration'
function getDataRouterConsoleError2(hookName) {
  return `${hookName} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`
}
function useDataRouterContext3(hookName) {
  let ctx = import_react.useContext(DataRouterContext)
  invariant(ctx, getDataRouterConsoleError2(hookName))
  return ctx
}
function useDataRouterState2(hookName) {
  let state = import_react.useContext(DataRouterStateContext)
  invariant(state, getDataRouterConsoleError2(hookName))
  return state
}
function useLinkClickHandler(
  to,
  {
    target,
    replace: replaceProp,
    unstable_mask,
    state,
    preventScrollReset,
    relative,
    viewTransition,
    unstable_defaultShouldRevalidate,
    unstable_useTransitions,
  } = {},
) {
  let navigate = useNavigate()
  let location = useLocation()
  let path = useResolvedPath(to, { relative })
  return import_react.useCallback(
    (event) => {
      if (shouldProcessLinkClick(event, target)) {
        event.preventDefault()
        let replace2 =
          replaceProp !== void 0 ? replaceProp : createPath(location) === createPath(path)
        let doNavigate = () =>
          navigate(to, {
            replace: replace2,
            unstable_mask,
            state,
            preventScrollReset,
            relative,
            viewTransition,
            unstable_defaultShouldRevalidate,
          })
        if (unstable_useTransitions) import_react.startTransition(() => doNavigate())
        else doNavigate()
      }
    },
    [
      location,
      navigate,
      path,
      replaceProp,
      unstable_mask,
      state,
      target,
      to,
      preventScrollReset,
      relative,
      viewTransition,
      unstable_defaultShouldRevalidate,
      unstable_useTransitions,
    ],
  )
}
function useSearchParams(defaultInit) {
  warning(
    typeof URLSearchParams !== 'undefined',
    `You cannot use the \`useSearchParams\` hook in a browser that does not support the URLSearchParams API. If you need to support Internet Explorer 11, we recommend you load a polyfill such as https://github.com/ungap/url-search-params.`,
  )
  let defaultSearchParamsRef = import_react.useRef(createSearchParams(defaultInit))
  let hasSetSearchParamsRef = import_react.useRef(false)
  let location = useLocation()
  let searchParams = import_react.useMemo(
    () =>
      getSearchParamsForLocation(
        location.search,
        hasSetSearchParamsRef.current ? null : defaultSearchParamsRef.current,
      ),
    [location.search],
  )
  let navigate = useNavigate()
  return [
    searchParams,
    import_react.useCallback(
      (nextInit, navigateOptions) => {
        const newSearchParams = createSearchParams(
          typeof nextInit === 'function' ? nextInit(new URLSearchParams(searchParams)) : nextInit,
        )
        hasSetSearchParamsRef.current = true
        navigate('?' + newSearchParams, navigateOptions)
      },
      [navigate, searchParams],
    ),
  ]
}
var fetcherId = 0
var getUniqueFetcherId = () => `__${String(++fetcherId)}__`
function useSubmit() {
  let { router } = useDataRouterContext3('useSubmit')
  let { basename } = import_react.useContext(NavigationContext)
  let currentRouteId = useRouteId()
  let routerFetch = router.fetch
  let routerNavigate = router.navigate
  return import_react.useCallback(
    async (target, options = {}) => {
      let { action, method, encType, formData, body } = getFormSubmissionInfo(target, basename)
      if (options.navigate === false)
        await routerFetch(
          options.fetcherKey || getUniqueFetcherId(),
          currentRouteId,
          options.action || action,
          {
            unstable_defaultShouldRevalidate: options.unstable_defaultShouldRevalidate,
            preventScrollReset: options.preventScrollReset,
            formData,
            body,
            formMethod: options.method || method,
            formEncType: options.encType || encType,
            flushSync: options.flushSync,
          },
        )
      else
        await routerNavigate(options.action || action, {
          unstable_defaultShouldRevalidate: options.unstable_defaultShouldRevalidate,
          preventScrollReset: options.preventScrollReset,
          formData,
          body,
          formMethod: options.method || method,
          formEncType: options.encType || encType,
          replace: options.replace,
          state: options.state,
          fromRouteId: currentRouteId,
          flushSync: options.flushSync,
          viewTransition: options.viewTransition,
        })
    },
    [routerFetch, routerNavigate, basename, currentRouteId],
  )
}
function useFormAction(action, { relative } = {}) {
  let { basename } = import_react.useContext(NavigationContext)
  let routeContext = import_react.useContext(RouteContext)
  invariant(routeContext, 'useFormAction must be used inside a RouteContext')
  let [match] = routeContext.matches.slice(-1)
  let path = { ...useResolvedPath(action ? action : '.', { relative }) }
  let location = useLocation()
  if (action == null) {
    path.search = location.search
    let params = new URLSearchParams(path.search)
    let indexValues = params.getAll('index')
    if (indexValues.some((v) => v === '')) {
      params.delete('index')
      indexValues.filter((v) => v).forEach((v) => params.append('index', v))
      let qs = params.toString()
      path.search = qs ? `?${qs}` : ''
    }
  }
  if ((!action || action === '.') && match.route.index)
    path.search = path.search ? path.search.replace(/^\?/, '?index&') : '?index'
  if (basename !== '/')
    path.pathname = path.pathname === '/' ? basename : joinPaths([basename, path.pathname])
  return createPath(path)
}
var SCROLL_RESTORATION_STORAGE_KEY = 'react-router-scroll-positions'
var savedScrollPositions = {}
function getScrollRestorationKey(location, matches, basename, getKey) {
  let key = null
  if (getKey)
    if (basename !== '/')
      key = getKey(
        {
          ...location,
          pathname: stripBasename(location.pathname, basename) || location.pathname,
        },
        matches,
      )
    else key = getKey(location, matches)
  if (key == null) key = location.key
  return key
}
function useScrollRestoration({ getKey, storageKey } = {}) {
  let { router } = useDataRouterContext3('useScrollRestoration')
  let { restoreScrollPosition, preventScrollReset } = useDataRouterState2('useScrollRestoration')
  let { basename } = import_react.useContext(NavigationContext)
  let location = useLocation()
  let matches = useMatches()
  let navigation = useNavigation()
  import_react.useEffect(() => {
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = 'auto'
    }
  }, [])
  usePageHide(
    import_react.useCallback(() => {
      if (navigation.state === 'idle') {
        let key = getScrollRestorationKey(location, matches, basename, getKey)
        savedScrollPositions[key] = window.scrollY
      }
      try {
        sessionStorage.setItem(
          storageKey || SCROLL_RESTORATION_STORAGE_KEY,
          JSON.stringify(savedScrollPositions),
        )
      } catch (error) {
        warning(
          false,
          `Failed to save scroll positions in sessionStorage, <ScrollRestoration /> will not work properly (${error}).`,
        )
      }
      window.history.scrollRestoration = 'auto'
    }, [navigation.state, getKey, basename, location, matches, storageKey]),
  )
  if (typeof document !== 'undefined') {
    import_react.useLayoutEffect(() => {
      try {
        let sessionPositions = sessionStorage.getItem(storageKey || SCROLL_RESTORATION_STORAGE_KEY)
        if (sessionPositions) savedScrollPositions = JSON.parse(sessionPositions)
      } catch (e) {}
    }, [storageKey])
    import_react.useLayoutEffect(() => {
      let disableScrollRestoration = router?.enableScrollRestoration(
        savedScrollPositions,
        () => window.scrollY,
        getKey
          ? (location2, matches2) => getScrollRestorationKey(location2, matches2, basename, getKey)
          : void 0,
      )
      return () => disableScrollRestoration && disableScrollRestoration()
    }, [router, basename, getKey])
    import_react.useLayoutEffect(() => {
      if (restoreScrollPosition === false) return
      if (typeof restoreScrollPosition === 'number') {
        window.scrollTo(0, restoreScrollPosition)
        return
      }
      try {
        if (location.hash) {
          let el = document.getElementById(decodeURIComponent(location.hash.slice(1)))
          if (el) {
            el.scrollIntoView()
            return
          }
        }
      } catch {
        warning(
          false,
          `"${location.hash.slice(1)}" is not a decodable element ID. The view will not scroll to it.`,
        )
      }
      if (preventScrollReset === true) return
      window.scrollTo(0, 0)
    }, [location, restoreScrollPosition, preventScrollReset])
  }
}
function usePageHide(callback, options) {
  let { capture } = options || {}
  import_react.useEffect(() => {
    let opts = capture != null ? { capture } : void 0
    window.addEventListener('pagehide', callback, opts)
    return () => {
      window.removeEventListener('pagehide', callback, opts)
    }
  }, [callback, capture])
}
function useViewTransitionState(to, { relative } = {}) {
  let vtContext = import_react.useContext(ViewTransitionContext)
  invariant(
    vtContext != null,
    "`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?",
  )
  let { basename } = useDataRouterContext3('useViewTransitionState')
  let path = useResolvedPath(to, { relative })
  if (!vtContext.isTransitioning) return false
  let currentPath =
    stripBasename(vtContext.currentLocation.pathname, basename) ||
    vtContext.currentLocation.pathname
  let nextPath =
    stripBasename(vtContext.nextLocation.pathname, basename) || vtContext.nextLocation.pathname
  return matchPath(path.pathname, nextPath) != null || matchPath(path.pathname, currentPath) != null
}
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/@radix-ui+number@1.1.1/node_modules/@radix-ui/number/dist/index.mjs
function clamp(value, [min, max]) {
  return Math.min(max, Math.max(min, value))
}
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/@radix-ui+react-direction@1.1.1_@types+react@19.2.14_react@19.2.4/node_modules/@radix-ui/react-direction/dist/index.mjs
var import_jsx_runtime = require_jsx_runtime()
var DirectionContext = import_react.createContext(void 0)
function useDirection(localDir) {
  const globalDir = import_react.useContext(DirectionContext)
  return localDir || globalDir || 'ltr'
}
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/@radix-ui+react-scroll-area@1.2.10_@types+react-dom@19.2.3_@types+react@19.2.14__@types_155614c2fe5222bb9b221068b09efefc/node_modules/@radix-ui/react-scroll-area/dist/index.mjs
function useStateMachine(initialState, machine) {
  return import_react.useReducer((state, event) => {
    return machine[state][event] ?? state
  }, initialState)
}
var SCROLL_AREA_NAME = 'ScrollArea'
var [createScrollAreaContext, createScrollAreaScope] = createContextScope(SCROLL_AREA_NAME)
var [ScrollAreaProvider, useScrollAreaContext] = createScrollAreaContext(SCROLL_AREA_NAME)
var ScrollArea$1 = import_react.forwardRef((props, forwardedRef) => {
  const {
    __scopeScrollArea,
    type = 'hover',
    dir,
    scrollHideDelay = 600,
    ...scrollAreaProps
  } = props
  const [scrollArea, setScrollArea] = import_react.useState(null)
  const [viewport, setViewport] = import_react.useState(null)
  const [content, setContent] = import_react.useState(null)
  const [scrollbarX, setScrollbarX] = import_react.useState(null)
  const [scrollbarY, setScrollbarY] = import_react.useState(null)
  const [cornerWidth, setCornerWidth] = import_react.useState(0)
  const [cornerHeight, setCornerHeight] = import_react.useState(0)
  const [scrollbarXEnabled, setScrollbarXEnabled] = import_react.useState(false)
  const [scrollbarYEnabled, setScrollbarYEnabled] = import_react.useState(false)
  const composedRefs = useComposedRefs(forwardedRef, (node) => setScrollArea(node))
  const direction = useDirection(dir)
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaProvider, {
    scope: __scopeScrollArea,
    type,
    dir: direction,
    scrollHideDelay,
    scrollArea,
    viewport,
    onViewportChange: setViewport,
    content,
    onContentChange: setContent,
    scrollbarX,
    onScrollbarXChange: setScrollbarX,
    scrollbarXEnabled,
    onScrollbarXEnabledChange: setScrollbarXEnabled,
    scrollbarY,
    onScrollbarYChange: setScrollbarY,
    scrollbarYEnabled,
    onScrollbarYEnabledChange: setScrollbarYEnabled,
    onCornerWidthChange: setCornerWidth,
    onCornerHeightChange: setCornerHeight,
    children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.div, {
      dir: direction,
      ...scrollAreaProps,
      ref: composedRefs,
      style: {
        position: 'relative',
        ['--radix-scroll-area-corner-width']: cornerWidth + 'px',
        ['--radix-scroll-area-corner-height']: cornerHeight + 'px',
        ...props.style,
      },
    }),
  })
})
ScrollArea$1.displayName = SCROLL_AREA_NAME
var VIEWPORT_NAME = 'ScrollAreaViewport'
var ScrollAreaViewport = import_react.forwardRef((props, forwardedRef) => {
  const { __scopeScrollArea, children, nonce, ...viewportProps } = props
  const context = useScrollAreaContext(VIEWPORT_NAME, __scopeScrollArea)
  const composedRefs = useComposedRefs(
    forwardedRef,
    import_react.useRef(null),
    context.onViewportChange,
  )
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, {
    children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)('style', {
        dangerouslySetInnerHTML: {
          __html: `[data-radix-scroll-area-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-scroll-area-viewport]::-webkit-scrollbar{display:none}`,
        },
        nonce,
      }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.div, {
        'data-radix-scroll-area-viewport': '',
        ...viewportProps,
        ref: composedRefs,
        style: {
          overflowX: context.scrollbarXEnabled ? 'scroll' : 'hidden',
          overflowY: context.scrollbarYEnabled ? 'scroll' : 'hidden',
          ...props.style,
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)('div', {
          ref: context.onContentChange,
          style: {
            minWidth: '100%',
            display: 'table',
          },
          children,
        }),
      }),
    ],
  })
})
ScrollAreaViewport.displayName = VIEWPORT_NAME
var SCROLLBAR_NAME = 'ScrollAreaScrollbar'
var ScrollAreaScrollbar = import_react.forwardRef((props, forwardedRef) => {
  const { forceMount, ...scrollbarProps } = props
  const context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea)
  const { onScrollbarXEnabledChange, onScrollbarYEnabledChange } = context
  const isHorizontal = props.orientation === 'horizontal'
  import_react.useEffect(() => {
    isHorizontal ? onScrollbarXEnabledChange(true) : onScrollbarYEnabledChange(true)
    return () => {
      isHorizontal ? onScrollbarXEnabledChange(false) : onScrollbarYEnabledChange(false)
    }
  }, [isHorizontal, onScrollbarXEnabledChange, onScrollbarYEnabledChange])
  return context.type === 'hover'
    ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaScrollbarHover, {
        ...scrollbarProps,
        ref: forwardedRef,
        forceMount,
      })
    : context.type === 'scroll'
      ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaScrollbarScroll, {
          ...scrollbarProps,
          ref: forwardedRef,
          forceMount,
        })
      : context.type === 'auto'
        ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaScrollbarAuto, {
            ...scrollbarProps,
            ref: forwardedRef,
            forceMount,
          })
        : context.type === 'always'
          ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaScrollbarVisible, {
              ...scrollbarProps,
              ref: forwardedRef,
            })
          : null
})
ScrollAreaScrollbar.displayName = SCROLLBAR_NAME
var ScrollAreaScrollbarHover = import_react.forwardRef((props, forwardedRef) => {
  const { forceMount, ...scrollbarProps } = props
  const context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea)
  const [visible, setVisible] = import_react.useState(false)
  import_react.useEffect(() => {
    const scrollArea = context.scrollArea
    let hideTimer = 0
    if (scrollArea) {
      const handlePointerEnter = () => {
        window.clearTimeout(hideTimer)
        setVisible(true)
      }
      const handlePointerLeave = () => {
        hideTimer = window.setTimeout(() => setVisible(false), context.scrollHideDelay)
      }
      scrollArea.addEventListener('pointerenter', handlePointerEnter)
      scrollArea.addEventListener('pointerleave', handlePointerLeave)
      return () => {
        window.clearTimeout(hideTimer)
        scrollArea.removeEventListener('pointerenter', handlePointerEnter)
        scrollArea.removeEventListener('pointerleave', handlePointerLeave)
      }
    }
  }, [context.scrollArea, context.scrollHideDelay])
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Presence, {
    present: forceMount || visible,
    children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaScrollbarAuto, {
      'data-state': visible ? 'visible' : 'hidden',
      ...scrollbarProps,
      ref: forwardedRef,
    }),
  })
})
var ScrollAreaScrollbarScroll = import_react.forwardRef((props, forwardedRef) => {
  const { forceMount, ...scrollbarProps } = props
  const context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea)
  const isHorizontal = props.orientation === 'horizontal'
  const debounceScrollEnd = useDebounceCallback(() => send('SCROLL_END'), 100)
  const [state, send] = useStateMachine('hidden', {
    hidden: { SCROLL: 'scrolling' },
    scrolling: {
      SCROLL_END: 'idle',
      POINTER_ENTER: 'interacting',
    },
    interacting: {
      SCROLL: 'interacting',
      POINTER_LEAVE: 'idle',
    },
    idle: {
      HIDE: 'hidden',
      SCROLL: 'scrolling',
      POINTER_ENTER: 'interacting',
    },
  })
  import_react.useEffect(() => {
    if (state === 'idle') {
      const hideTimer = window.setTimeout(() => send('HIDE'), context.scrollHideDelay)
      return () => window.clearTimeout(hideTimer)
    }
  }, [state, context.scrollHideDelay, send])
  import_react.useEffect(() => {
    const viewport = context.viewport
    const scrollDirection = isHorizontal ? 'scrollLeft' : 'scrollTop'
    if (viewport) {
      let prevScrollPos = viewport[scrollDirection]
      const handleScroll = () => {
        const scrollPos = viewport[scrollDirection]
        if (prevScrollPos !== scrollPos) {
          send('SCROLL')
          debounceScrollEnd()
        }
        prevScrollPos = scrollPos
      }
      viewport.addEventListener('scroll', handleScroll)
      return () => viewport.removeEventListener('scroll', handleScroll)
    }
  }, [context.viewport, isHorizontal, send, debounceScrollEnd])
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Presence, {
    present: forceMount || state !== 'hidden',
    children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaScrollbarVisible, {
      'data-state': state === 'hidden' ? 'hidden' : 'visible',
      ...scrollbarProps,
      ref: forwardedRef,
      onPointerEnter: composeEventHandlers$1(props.onPointerEnter, () => send('POINTER_ENTER')),
      onPointerLeave: composeEventHandlers$1(props.onPointerLeave, () => send('POINTER_LEAVE')),
    }),
  })
})
var ScrollAreaScrollbarAuto = import_react.forwardRef((props, forwardedRef) => {
  const context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea)
  const { forceMount, ...scrollbarProps } = props
  const [visible, setVisible] = import_react.useState(false)
  const isHorizontal = props.orientation === 'horizontal'
  const handleResize = useDebounceCallback(() => {
    if (context.viewport) {
      const isOverflowX = context.viewport.offsetWidth < context.viewport.scrollWidth
      const isOverflowY = context.viewport.offsetHeight < context.viewport.scrollHeight
      setVisible(isHorizontal ? isOverflowX : isOverflowY)
    }
  }, 10)
  useResizeObserver(context.viewport, handleResize)
  useResizeObserver(context.content, handleResize)
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Presence, {
    present: forceMount || visible,
    children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaScrollbarVisible, {
      'data-state': visible ? 'visible' : 'hidden',
      ...scrollbarProps,
      ref: forwardedRef,
    }),
  })
})
var ScrollAreaScrollbarVisible = import_react.forwardRef((props, forwardedRef) => {
  const { orientation = 'vertical', ...scrollbarProps } = props
  const context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea)
  const thumbRef = import_react.useRef(null)
  const pointerOffsetRef = import_react.useRef(0)
  const [sizes, setSizes] = import_react.useState({
    content: 0,
    viewport: 0,
    scrollbar: {
      size: 0,
      paddingStart: 0,
      paddingEnd: 0,
    },
  })
  const thumbRatio = getThumbRatio(sizes.viewport, sizes.content)
  const commonProps = {
    ...scrollbarProps,
    sizes,
    onSizesChange: setSizes,
    hasThumb: Boolean(thumbRatio > 0 && thumbRatio < 1),
    onThumbChange: (thumb) => (thumbRef.current = thumb),
    onThumbPointerUp: () => (pointerOffsetRef.current = 0),
    onThumbPointerDown: (pointerPos) => (pointerOffsetRef.current = pointerPos),
  }
  function getScrollPosition(pointerPos, dir) {
    return getScrollPositionFromPointer(pointerPos, pointerOffsetRef.current, sizes, dir)
  }
  if (orientation === 'horizontal')
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaScrollbarX, {
      ...commonProps,
      ref: forwardedRef,
      onThumbPositionChange: () => {
        if (context.viewport && thumbRef.current) {
          const scrollPos = context.viewport.scrollLeft
          const offset = getThumbOffsetFromScroll(scrollPos, sizes, context.dir)
          thumbRef.current.style.transform = `translate3d(${offset}px, 0, 0)`
        }
      },
      onWheelScroll: (scrollPos) => {
        if (context.viewport) context.viewport.scrollLeft = scrollPos
      },
      onDragScroll: (pointerPos) => {
        if (context.viewport)
          context.viewport.scrollLeft = getScrollPosition(pointerPos, context.dir)
      },
    })
  if (orientation === 'vertical')
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaScrollbarY, {
      ...commonProps,
      ref: forwardedRef,
      onThumbPositionChange: () => {
        if (context.viewport && thumbRef.current) {
          const scrollPos = context.viewport.scrollTop
          const offset = getThumbOffsetFromScroll(scrollPos, sizes)
          thumbRef.current.style.transform = `translate3d(0, ${offset}px, 0)`
        }
      },
      onWheelScroll: (scrollPos) => {
        if (context.viewport) context.viewport.scrollTop = scrollPos
      },
      onDragScroll: (pointerPos) => {
        if (context.viewport) context.viewport.scrollTop = getScrollPosition(pointerPos)
      },
    })
  return null
})
var ScrollAreaScrollbarX = import_react.forwardRef((props, forwardedRef) => {
  const { sizes, onSizesChange, ...scrollbarProps } = props
  const context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea)
  const [computedStyle, setComputedStyle] = import_react.useState()
  const ref = import_react.useRef(null)
  const composeRefs = useComposedRefs(forwardedRef, ref, context.onScrollbarXChange)
  import_react.useEffect(() => {
    if (ref.current) setComputedStyle(getComputedStyle(ref.current))
  }, [ref])
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaScrollbarImpl, {
    'data-orientation': 'horizontal',
    ...scrollbarProps,
    ref: composeRefs,
    sizes,
    style: {
      bottom: 0,
      left: context.dir === 'rtl' ? 'var(--radix-scroll-area-corner-width)' : 0,
      right: context.dir === 'ltr' ? 'var(--radix-scroll-area-corner-width)' : 0,
      ['--radix-scroll-area-thumb-width']: getThumbSize(sizes) + 'px',
      ...props.style,
    },
    onThumbPointerDown: (pointerPos) => props.onThumbPointerDown(pointerPos.x),
    onDragScroll: (pointerPos) => props.onDragScroll(pointerPos.x),
    onWheelScroll: (event, maxScrollPos) => {
      if (context.viewport) {
        const scrollPos = context.viewport.scrollLeft + event.deltaX
        props.onWheelScroll(scrollPos)
        if (isScrollingWithinScrollbarBounds(scrollPos, maxScrollPos)) event.preventDefault()
      }
    },
    onResize: () => {
      if (ref.current && context.viewport && computedStyle)
        onSizesChange({
          content: context.viewport.scrollWidth,
          viewport: context.viewport.offsetWidth,
          scrollbar: {
            size: ref.current.clientWidth,
            paddingStart: toInt(computedStyle.paddingLeft),
            paddingEnd: toInt(computedStyle.paddingRight),
          },
        })
    },
  })
})
var ScrollAreaScrollbarY = import_react.forwardRef((props, forwardedRef) => {
  const { sizes, onSizesChange, ...scrollbarProps } = props
  const context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea)
  const [computedStyle, setComputedStyle] = import_react.useState()
  const ref = import_react.useRef(null)
  const composeRefs = useComposedRefs(forwardedRef, ref, context.onScrollbarYChange)
  import_react.useEffect(() => {
    if (ref.current) setComputedStyle(getComputedStyle(ref.current))
  }, [ref])
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaScrollbarImpl, {
    'data-orientation': 'vertical',
    ...scrollbarProps,
    ref: composeRefs,
    sizes,
    style: {
      top: 0,
      right: context.dir === 'ltr' ? 0 : void 0,
      left: context.dir === 'rtl' ? 0 : void 0,
      bottom: 'var(--radix-scroll-area-corner-height)',
      ['--radix-scroll-area-thumb-height']: getThumbSize(sizes) + 'px',
      ...props.style,
    },
    onThumbPointerDown: (pointerPos) => props.onThumbPointerDown(pointerPos.y),
    onDragScroll: (pointerPos) => props.onDragScroll(pointerPos.y),
    onWheelScroll: (event, maxScrollPos) => {
      if (context.viewport) {
        const scrollPos = context.viewport.scrollTop + event.deltaY
        props.onWheelScroll(scrollPos)
        if (isScrollingWithinScrollbarBounds(scrollPos, maxScrollPos)) event.preventDefault()
      }
    },
    onResize: () => {
      if (ref.current && context.viewport && computedStyle)
        onSizesChange({
          content: context.viewport.scrollHeight,
          viewport: context.viewport.offsetHeight,
          scrollbar: {
            size: ref.current.clientHeight,
            paddingStart: toInt(computedStyle.paddingTop),
            paddingEnd: toInt(computedStyle.paddingBottom),
          },
        })
    },
  })
})
var [ScrollbarProvider, useScrollbarContext] = createScrollAreaContext(SCROLLBAR_NAME)
var ScrollAreaScrollbarImpl = import_react.forwardRef((props, forwardedRef) => {
  const {
    __scopeScrollArea,
    sizes,
    hasThumb,
    onThumbChange,
    onThumbPointerUp,
    onThumbPointerDown,
    onThumbPositionChange,
    onDragScroll,
    onWheelScroll,
    onResize,
    ...scrollbarProps
  } = props
  const context = useScrollAreaContext(SCROLLBAR_NAME, __scopeScrollArea)
  const [scrollbar, setScrollbar] = import_react.useState(null)
  const composeRefs = useComposedRefs(forwardedRef, (node) => setScrollbar(node))
  const rectRef = import_react.useRef(null)
  const prevWebkitUserSelectRef = import_react.useRef('')
  const viewport = context.viewport
  const maxScrollPos = sizes.content - sizes.viewport
  const handleWheelScroll = useCallbackRef(onWheelScroll)
  const handleThumbPositionChange = useCallbackRef(onThumbPositionChange)
  const handleResize = useDebounceCallback(onResize, 10)
  function handleDragScroll(event) {
    if (rectRef.current)
      onDragScroll({
        x: event.clientX - rectRef.current.left,
        y: event.clientY - rectRef.current.top,
      })
  }
  import_react.useEffect(() => {
    const handleWheel = (event) => {
      const element = event.target
      if (scrollbar?.contains(element)) handleWheelScroll(event, maxScrollPos)
    }
    document.addEventListener('wheel', handleWheel, { passive: false })
    return () => document.removeEventListener('wheel', handleWheel, { passive: false })
  }, [viewport, scrollbar, maxScrollPos, handleWheelScroll])
  import_react.useEffect(handleThumbPositionChange, [sizes, handleThumbPositionChange])
  useResizeObserver(scrollbar, handleResize)
  useResizeObserver(context.content, handleResize)
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollbarProvider, {
    scope: __scopeScrollArea,
    scrollbar,
    hasThumb,
    onThumbChange: useCallbackRef(onThumbChange),
    onThumbPointerUp: useCallbackRef(onThumbPointerUp),
    onThumbPositionChange: handleThumbPositionChange,
    onThumbPointerDown: useCallbackRef(onThumbPointerDown),
    children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.div, {
      ...scrollbarProps,
      ref: composeRefs,
      style: {
        position: 'absolute',
        ...scrollbarProps.style,
      },
      onPointerDown: composeEventHandlers$1(props.onPointerDown, (event) => {
        if (event.button === 0) {
          event.target.setPointerCapture(event.pointerId)
          rectRef.current = scrollbar.getBoundingClientRect()
          prevWebkitUserSelectRef.current = document.body.style.webkitUserSelect
          document.body.style.webkitUserSelect = 'none'
          if (context.viewport) context.viewport.style.scrollBehavior = 'auto'
          handleDragScroll(event)
        }
      }),
      onPointerMove: composeEventHandlers$1(props.onPointerMove, handleDragScroll),
      onPointerUp: composeEventHandlers$1(props.onPointerUp, (event) => {
        const element = event.target
        if (element.hasPointerCapture(event.pointerId))
          element.releasePointerCapture(event.pointerId)
        document.body.style.webkitUserSelect = prevWebkitUserSelectRef.current
        if (context.viewport) context.viewport.style.scrollBehavior = ''
        rectRef.current = null
      }),
    }),
  })
})
var THUMB_NAME = 'ScrollAreaThumb'
var ScrollAreaThumb = import_react.forwardRef((props, forwardedRef) => {
  const { forceMount, ...thumbProps } = props
  const scrollbarContext = useScrollbarContext(THUMB_NAME, props.__scopeScrollArea)
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Presence, {
    present: forceMount || scrollbarContext.hasThumb,
    children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaThumbImpl, {
      ref: forwardedRef,
      ...thumbProps,
    }),
  })
})
var ScrollAreaThumbImpl = import_react.forwardRef((props, forwardedRef) => {
  const { __scopeScrollArea, style, ...thumbProps } = props
  const scrollAreaContext = useScrollAreaContext(THUMB_NAME, __scopeScrollArea)
  const scrollbarContext = useScrollbarContext(THUMB_NAME, __scopeScrollArea)
  const { onThumbPositionChange } = scrollbarContext
  const composedRef = useComposedRefs(forwardedRef, (node) => scrollbarContext.onThumbChange(node))
  const removeUnlinkedScrollListenerRef = import_react.useRef(void 0)
  const debounceScrollEnd = useDebounceCallback(() => {
    if (removeUnlinkedScrollListenerRef.current) {
      removeUnlinkedScrollListenerRef.current()
      removeUnlinkedScrollListenerRef.current = void 0
    }
  }, 100)
  import_react.useEffect(() => {
    const viewport = scrollAreaContext.viewport
    if (viewport) {
      const handleScroll = () => {
        debounceScrollEnd()
        if (!removeUnlinkedScrollListenerRef.current) {
          removeUnlinkedScrollListenerRef.current = addUnlinkedScrollListener(
            viewport,
            onThumbPositionChange,
          )
          onThumbPositionChange()
        }
      }
      onThumbPositionChange()
      viewport.addEventListener('scroll', handleScroll)
      return () => viewport.removeEventListener('scroll', handleScroll)
    }
  }, [scrollAreaContext.viewport, debounceScrollEnd, onThumbPositionChange])
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.div, {
    'data-state': scrollbarContext.hasThumb ? 'visible' : 'hidden',
    ...thumbProps,
    ref: composedRef,
    style: {
      width: 'var(--radix-scroll-area-thumb-width)',
      height: 'var(--radix-scroll-area-thumb-height)',
      ...style,
    },
    onPointerDownCapture: composeEventHandlers$1(props.onPointerDownCapture, (event) => {
      const thumbRect = event.target.getBoundingClientRect()
      const x = event.clientX - thumbRect.left
      const y = event.clientY - thumbRect.top
      scrollbarContext.onThumbPointerDown({
        x,
        y,
      })
    }),
    onPointerUp: composeEventHandlers$1(props.onPointerUp, scrollbarContext.onThumbPointerUp),
  })
})
ScrollAreaThumb.displayName = THUMB_NAME
var CORNER_NAME = 'ScrollAreaCorner'
var ScrollAreaCorner = import_react.forwardRef((props, forwardedRef) => {
  const context = useScrollAreaContext(CORNER_NAME, props.__scopeScrollArea)
  const hasBothScrollbarsVisible = Boolean(context.scrollbarX && context.scrollbarY)
  return context.type !== 'scroll' && hasBothScrollbarsVisible
    ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaCornerImpl, {
        ...props,
        ref: forwardedRef,
      })
    : null
})
ScrollAreaCorner.displayName = CORNER_NAME
var ScrollAreaCornerImpl = import_react.forwardRef((props, forwardedRef) => {
  const { __scopeScrollArea, ...cornerProps } = props
  const context = useScrollAreaContext(CORNER_NAME, __scopeScrollArea)
  const [width, setWidth] = import_react.useState(0)
  const [height, setHeight] = import_react.useState(0)
  const hasSize = Boolean(width && height)
  useResizeObserver(context.scrollbarX, () => {
    const height2 = context.scrollbarX?.offsetHeight || 0
    context.onCornerHeightChange(height2)
    setHeight(height2)
  })
  useResizeObserver(context.scrollbarY, () => {
    const width2 = context.scrollbarY?.offsetWidth || 0
    context.onCornerWidthChange(width2)
    setWidth(width2)
  })
  return hasSize
    ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.div, {
        ...cornerProps,
        ref: forwardedRef,
        style: {
          width,
          height,
          position: 'absolute',
          right: context.dir === 'ltr' ? 0 : void 0,
          left: context.dir === 'rtl' ? 0 : void 0,
          bottom: 0,
          ...props.style,
        },
      })
    : null
})
function toInt(value) {
  return value ? parseInt(value, 10) : 0
}
function getThumbRatio(viewportSize, contentSize) {
  const ratio = viewportSize / contentSize
  return isNaN(ratio) ? 0 : ratio
}
function getThumbSize(sizes) {
  const ratio = getThumbRatio(sizes.viewport, sizes.content)
  const scrollbarPadding = sizes.scrollbar.paddingStart + sizes.scrollbar.paddingEnd
  const thumbSize = (sizes.scrollbar.size - scrollbarPadding) * ratio
  return Math.max(thumbSize, 18)
}
function getScrollPositionFromPointer(pointerPos, pointerOffset, sizes, dir = 'ltr') {
  const thumbSizePx = getThumbSize(sizes)
  const thumbCenter = thumbSizePx / 2
  const offset = pointerOffset || thumbCenter
  const thumbOffsetFromEnd = thumbSizePx - offset
  const minPointerPos = sizes.scrollbar.paddingStart + offset
  const maxPointerPos = sizes.scrollbar.size - sizes.scrollbar.paddingEnd - thumbOffsetFromEnd
  const maxScrollPos = sizes.content - sizes.viewport
  const scrollRange = dir === 'ltr' ? [0, maxScrollPos] : [maxScrollPos * -1, 0]
  return linearScale([minPointerPos, maxPointerPos], scrollRange)(pointerPos)
}
function getThumbOffsetFromScroll(scrollPos, sizes, dir = 'ltr') {
  const thumbSizePx = getThumbSize(sizes)
  const scrollbarPadding = sizes.scrollbar.paddingStart + sizes.scrollbar.paddingEnd
  const scrollbar = sizes.scrollbar.size - scrollbarPadding
  const maxScrollPos = sizes.content - sizes.viewport
  const maxThumbPos = scrollbar - thumbSizePx
  const scrollWithoutMomentum = clamp(
    scrollPos,
    dir === 'ltr' ? [0, maxScrollPos] : [maxScrollPos * -1, 0],
  )
  return linearScale([0, maxScrollPos], [0, maxThumbPos])(scrollWithoutMomentum)
}
function linearScale(input, output) {
  return (value) => {
    if (input[0] === input[1] || output[0] === output[1]) return output[0]
    const ratio = (output[1] - output[0]) / (input[1] - input[0])
    return output[0] + ratio * (value - input[0])
  }
}
function isScrollingWithinScrollbarBounds(scrollPos, maxScrollPos) {
  return scrollPos > 0 && scrollPos < maxScrollPos
}
var addUnlinkedScrollListener = (node, handler = () => {}) => {
  let prevPosition = {
    left: node.scrollLeft,
    top: node.scrollTop,
  }
  let rAF = 0
  ;(function loop() {
    const position = {
      left: node.scrollLeft,
      top: node.scrollTop,
    }
    const isHorizontalScroll = prevPosition.left !== position.left
    const isVerticalScroll = prevPosition.top !== position.top
    if (isHorizontalScroll || isVerticalScroll) handler()
    prevPosition = position
    rAF = window.requestAnimationFrame(loop)
  })()
  return () => window.cancelAnimationFrame(rAF)
}
function useDebounceCallback(callback, delay) {
  const handleCallback = useCallbackRef(callback)
  const debounceTimerRef = import_react.useRef(0)
  import_react.useEffect(() => () => window.clearTimeout(debounceTimerRef.current), [])
  return import_react.useCallback(() => {
    window.clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = window.setTimeout(handleCallback, delay)
  }, [handleCallback, delay])
}
function useResizeObserver(element, onResize) {
  const handleResize = useCallbackRef(onResize)
  useLayoutEffect2(() => {
    let rAF = 0
    if (element) {
      const resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(rAF)
        rAF = window.requestAnimationFrame(handleResize)
      })
      resizeObserver.observe(element)
      return () => {
        window.cancelAnimationFrame(rAF)
        resizeObserver.unobserve(element)
      }
    }
  }, [element, handleResize])
}
var Root = ScrollArea$1
var Viewport = ScrollAreaViewport
var Corner = ScrollAreaCorner
//#endregion
//#region src/components/ui/scroll-area.tsx
var ScrollArea = import_react.forwardRef(({ className, children, ...props }, ref) =>
  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Root, {
    'data-uid': 'src/components/ui/scroll-area.tsx:11:3',
    'data-prohibitions': '[editContent]',
    ref,
    className: cn('relative overflow-hidden', className),
    ...props,
    children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Viewport, {
        'data-uid': 'src/components/ui/scroll-area.tsx:16:5',
        'data-prohibitions': '[editContent]',
        className: 'h-full w-full rounded-[inherit]',
        children,
      }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollBar, {
        'data-uid': 'src/components/ui/scroll-area.tsx:19:5',
        'data-prohibitions': '[editContent]',
      }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Corner, {
        'data-uid': 'src/components/ui/scroll-area.tsx:20:5',
        'data-prohibitions': '[editContent]',
      }),
    ],
  }),
)
ScrollArea.displayName = Root.displayName
var ScrollBar = import_react.forwardRef(({ className, orientation = 'vertical', ...props }, ref) =>
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaScrollbar, {
    'data-uid': 'src/components/ui/scroll-area.tsx:29:3',
    'data-prohibitions': '[editContent]',
    ref,
    orientation,
    className: cn(
      'flex touch-none select-none transition-colors',
      orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent p-[1px]',
      orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent p-[1px]',
      className,
    ),
    ...props,
    children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaThumb, {
      'data-uid': 'src/components/ui/scroll-area.tsx:40:5',
      'data-prohibitions': '[editContent]',
      className: 'relative flex-1 rounded-full bg-border',
    }),
  }),
)
ScrollBar.displayName = ScrollAreaScrollbar.displayName
//#endregion
export {
  Navigate as a,
  createBrowserRouter as c,
  useLocation as d,
  useNavigate as f,
  __vitePreload as g,
  useSearchParams as h,
  Link as i,
  createContext as l,
  useRouteError as m,
  useDirection as n,
  Outlet as o,
  useOutletContext as p,
  clamp as r,
  RouterProvider as s,
  ScrollArea as t,
  useBlocker as u,
}

//# sourceMappingURL=scroll-area-qQDYGHrB.js.map
