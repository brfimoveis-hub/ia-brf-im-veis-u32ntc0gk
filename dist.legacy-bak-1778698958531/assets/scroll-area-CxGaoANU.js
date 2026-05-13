import {
  C as e,
  E as t,
  O as n,
  S as r,
  b as i,
  d as a,
  f as o,
  m as s,
  o as c,
  p as l,
  y as u,
} from './button-BukrqzEL.js'
var d = `modulepreload`,
  f = function (e) {
    return `/` + e
  },
  p = {},
  m = function (e, t, n) {
    let r = Promise.resolve()
    if (t && t.length > 0) {
      let e = document.getElementsByTagName(`link`),
        i = document.querySelector(`meta[property=csp-nonce]`),
        a = i?.nonce || i?.getAttribute(`nonce`)
      function o(e) {
        return Promise.all(
          e.map((e) =>
            Promise.resolve(e).then(
              (e) => ({ status: `fulfilled`, value: e }),
              (e) => ({ status: `rejected`, reason: e }),
            ),
          ),
        )
      }
      r = o(
        t.map((t) => {
          if (((t = f(t, n)), t in p)) return
          p[t] = !0
          let r = t.endsWith(`.css`),
            i = r ? `[rel="stylesheet"]` : ``
          if (n)
            for (let n = e.length - 1; n >= 0; n--) {
              let i = e[n]
              if (i.href === t && (!r || i.rel === `stylesheet`)) return
            }
          else if (document.querySelector(`link[href="${t}"]${i}`)) return
          let o = document.createElement(`link`)
          if (
            ((o.rel = r ? `stylesheet` : d),
            r || (o.as = `script`),
            (o.crossOrigin = ``),
            (o.href = t),
            a && o.setAttribute(`nonce`, a),
            document.head.appendChild(o),
            r)
          )
            return new Promise((e, n) => {
              ;(o.addEventListener(`load`, e),
                o.addEventListener(`error`, () => n(Error(`Unable to preload CSS for ${t}`))))
            })
        }),
      )
    }
    function i(e) {
      let t = new Event(`vite:preloadError`, { cancelable: !0 })
      if (((t.payload = e), window.dispatchEvent(t), !t.defaultPrevented)) throw e
    }
    return r.then((t) => {
      for (let e of t || []) e.status === `rejected` && i(e.reason)
      return e().catch(i)
    })
  },
  h = n(t(), 1),
  g = (e) => {
    throw TypeError(e)
  },
  _ = (e, t, n) => t.has(e) || g(`Cannot ` + n),
  v = (e, t, n) => (_(e, t, `read from private field`), n ? n.call(e) : t.get(e)),
  y = (e, t, n) =>
    t.has(e)
      ? g(`Cannot add the same private member more than once`)
      : t instanceof WeakSet
        ? t.add(e)
        : t.set(e, n),
  b = `popstate`
function x(e) {
  return (
    typeof e == `object` &&
    !!e &&
    `pathname` in e &&
    `search` in e &&
    `hash` in e &&
    `state` in e &&
    `key` in e
  )
}
function S(e = {}) {
  function t(e, t) {
    let n = t.state?.masked,
      { pathname: r, search: i, hash: a } = n || e.location
    return D(
      ``,
      { pathname: r, search: i, hash: a },
      (t.state && t.state.usr) || null,
      (t.state && t.state.key) || `default`,
      n
        ? { pathname: e.location.pathname, search: e.location.search, hash: e.location.hash }
        : void 0,
    )
  }
  function n(e, t) {
    return typeof t == `string` ? t : O(t)
  }
  return A(t, n, null, e)
}
function C(e, t) {
  if (e === !1 || e == null) throw Error(t)
}
function w(e, t) {
  if (!e) {
    typeof console < `u` && console.warn(t)
    try {
      throw Error(t)
    } catch {}
  }
}
function T() {
  return Math.random().toString(36).substring(2, 10)
}
function E(e, t) {
  return {
    usr: e.state,
    key: e.key,
    idx: t,
    masked: e.unstable_mask ? { pathname: e.pathname, search: e.search, hash: e.hash } : void 0,
  }
}
function D(e, t, n = null, r, i) {
  return {
    pathname: typeof e == `string` ? e : e.pathname,
    search: ``,
    hash: ``,
    ...(typeof t == `string` ? k(t) : t),
    state: n,
    key: (t && t.key) || r || T(),
    unstable_mask: i,
  }
}
function O({ pathname: e = `/`, search: t = ``, hash: n = `` }) {
  return (
    t && t !== `?` && (e += t.charAt(0) === `?` ? t : `?` + t),
    n && n !== `#` && (e += n.charAt(0) === `#` ? n : `#` + n),
    e
  )
}
function k(e) {
  let t = {}
  if (e) {
    let n = e.indexOf(`#`)
    n >= 0 && ((t.hash = e.substring(n)), (e = e.substring(0, n)))
    let r = e.indexOf(`?`)
    ;(r >= 0 && ((t.search = e.substring(r)), (e = e.substring(0, r))), e && (t.pathname = e))
  }
  return t
}
function A(e, t, n, r = {}) {
  let { window: i = document.defaultView, v5Compat: a = !1 } = r,
    o = i.history,
    s = `POP`,
    c = null,
    l = u()
  l ?? ((l = 0), o.replaceState({ ...o.state, idx: l }, ``))
  function u() {
    return (o.state || { idx: null }).idx
  }
  function d() {
    s = `POP`
    let e = u(),
      t = e == null ? null : e - l
    ;((l = e), c && c({ action: s, location: h.location, delta: t }))
  }
  function f(e, t) {
    s = `PUSH`
    let r = x(e) ? e : D(h.location, e, t)
    ;(n && n(r, e), (l = u() + 1))
    let d = E(r, l),
      f = h.createHref(r.unstable_mask || r)
    try {
      o.pushState(d, ``, f)
    } catch (e) {
      if (e instanceof DOMException && e.name === `DataCloneError`) throw e
      i.location.assign(f)
    }
    a && c && c({ action: s, location: h.location, delta: 1 })
  }
  function p(e, t) {
    s = `REPLACE`
    let r = x(e) ? e : D(h.location, e, t)
    ;(n && n(r, e), (l = u()))
    let i = E(r, l),
      d = h.createHref(r.unstable_mask || r)
    ;(o.replaceState(i, ``, d), a && c && c({ action: s, location: h.location, delta: 0 }))
  }
  function m(e) {
    return ee(e)
  }
  let h = {
    get action() {
      return s
    },
    get location() {
      return e(i, o)
    },
    listen(e) {
      if (c) throw Error(`A history only accepts one active listener`)
      return (
        i.addEventListener(b, d),
        (c = e),
        () => {
          ;(i.removeEventListener(b, d), (c = null))
        }
      )
    },
    createHref(e) {
      return t(i, e)
    },
    createURL: m,
    encodeLocation(e) {
      let t = m(e)
      return { pathname: t.pathname, search: t.search, hash: t.hash }
    },
    push: f,
    replace: p,
    go(e) {
      return o.go(e)
    },
  }
  return h
}
function ee(e, t = !1) {
  let n = `http://localhost`
  ;(typeof window < `u` &&
    (n = window.location.origin === `null` ? window.location.href : window.location.origin),
    C(n, `No window.location.(origin|href) available to create URL`))
  let r = typeof e == `string` ? e : O(e)
  return ((r = r.replace(/ $/, `%20`)), !t && r.startsWith(`//`) && (r = n + r), new URL(r, n))
}
function j(e) {
  return { defaultValue: e }
}
var M,
  te = class {
    constructor(e) {
      if ((y(this, M, new Map()), e)) for (let [t, n] of e) this.set(t, n)
    }
    get(e) {
      if (v(this, M).has(e)) return v(this, M).get(e)
      if (e.defaultValue !== void 0) return e.defaultValue
      throw Error(`No value found for context`)
    }
    set(e, t) {
      v(this, M).set(e, t)
    }
  }
M = new WeakMap()
var N = new Set([`lazy`, `caseSensitive`, `path`, `id`, `index`, `children`])
function P(e) {
  return N.has(e)
}
var ne = new Set([`lazy`, `caseSensitive`, `path`, `id`, `index`, `middleware`, `children`])
function re(e) {
  return ne.has(e)
}
function ie(e) {
  return e.index === !0
}
function F(e, t, n = [], r = {}, i = !1) {
  return e.map((e, a) => {
    let o = [...n, String(a)],
      s = typeof e.id == `string` ? e.id : o.join(`-`)
    if (
      (C(e.index !== !0 || !e.children, `Cannot specify children on an index route`),
      C(
        i || !r[s],
        `Found a route id collision on id "${s}".  Route id's must be globally unique within Data Router usages`,
      ),
      ie(e))
    ) {
      let n = { ...e, id: s }
      return ((r[s] = ae(n, t(n))), n)
    } else {
      let n = { ...e, id: s, children: void 0 }
      return ((r[s] = ae(n, t(n))), e.children && (n.children = F(e.children, t, o, r, i)), n)
    }
  })
}
function ae(e, t) {
  return Object.assign(e, {
    ...t,
    ...(typeof t.lazy == `object` && t.lazy != null ? { lazy: { ...e.lazy, ...t.lazy } } : {}),
  })
}
function oe(e, t, n = `/`) {
  return se(e, t, n, !1)
}
function se(e, t, n, r) {
  let i = B((typeof t == `string` ? k(t) : t).pathname || `/`, n)
  if (i == null) return null
  let a = I(e)
  ue(a)
  let o = null
  for (let e = 0; o == null && e < a.length; ++e) {
    let t = be(i)
    o = ve(a[e], t, r)
  }
  return o
}
function ce(e, t) {
  let { route: n, pathname: r, params: i } = e
  return { id: n.id, pathname: r, params: i, data: t[n.id], loaderData: t[n.id], handle: n.handle }
}
function I(e, t = [], n = [], r = ``, i = !1) {
  let a = (e, a, o = i, s) => {
    let c = {
      relativePath: s === void 0 ? e.path || `` : s,
      caseSensitive: e.caseSensitive === !0,
      childrenIndex: a,
      route: e,
    }
    if (c.relativePath.startsWith(`/`)) {
      if (!c.relativePath.startsWith(r) && o) return
      ;(C(
        c.relativePath.startsWith(r),
        `Absolute route path "${c.relativePath}" nested under path "${r}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`,
      ),
        (c.relativePath = c.relativePath.slice(r.length)))
    }
    let l = V([r, c.relativePath]),
      u = n.concat(c)
    ;(e.children &&
      e.children.length > 0 &&
      (C(
        e.index !== !0,
        `Index routes must not have child routes. Please remove all child routes from route path "${l}".`,
      ),
      I(e.children, t, u, l, o)),
      !(e.path == null && !e.index) && t.push({ path: l, score: ge(l, e.index), routesMeta: u }))
  }
  return (
    e.forEach((e, t) => {
      if (e.path === `` || !e.path?.includes(`?`)) a(e, t)
      else for (let n of le(e.path)) a(e, t, !0, n)
    }),
    t
  )
}
function le(e) {
  let t = e.split(`/`)
  if (t.length === 0) return []
  let [n, ...r] = t,
    i = n.endsWith(`?`),
    a = n.replace(/\?$/, ``)
  if (r.length === 0) return i ? [a, ``] : [a]
  let o = le(r.join(`/`)),
    s = []
  return (
    s.push(...o.map((e) => (e === `` ? a : [a, e].join(`/`)))),
    i && s.push(...o),
    s.map((t) => (e.startsWith(`/`) && t === `` ? `/` : t))
  )
}
function ue(e) {
  e.sort((e, t) =>
    e.score === t.score
      ? _e(
          e.routesMeta.map((e) => e.childrenIndex),
          t.routesMeta.map((e) => e.childrenIndex),
        )
      : t.score - e.score,
  )
}
var de = /^:[\w-]+$/,
  L = 3,
  fe = 2,
  pe = 1,
  R = 10,
  me = -2,
  he = (e) => e === `*`
function ge(e, t) {
  let n = e.split(`/`),
    r = n.length
  return (
    n.some(he) && (r += me),
    t && (r += fe),
    n.filter((e) => !he(e)).reduce((e, t) => e + (de.test(t) ? L : t === `` ? pe : R), r)
  )
}
function _e(e, t) {
  return e.length === t.length && e.slice(0, -1).every((e, n) => e === t[n])
    ? e[e.length - 1] - t[t.length - 1]
    : 0
}
function ve(e, t, n = !1) {
  let { routesMeta: r } = e,
    i = {},
    a = `/`,
    o = []
  for (let e = 0; e < r.length; ++e) {
    let s = r[e],
      c = e === r.length - 1,
      l = a === `/` ? t : t.slice(a.length) || `/`,
      u = ye({ path: s.relativePath, caseSensitive: s.caseSensitive, end: c }, l),
      d = s.route
    if (
      (!u &&
        c &&
        n &&
        !r[r.length - 1].route.index &&
        (u = ye({ path: s.relativePath, caseSensitive: s.caseSensitive, end: !1 }, l)),
      !u)
    )
      return null
    ;(Object.assign(i, u.params),
      o.push({
        params: i,
        pathname: V([a, u.pathname]),
        pathnameBase: Ae(V([a, u.pathnameBase])),
        route: d,
      }),
      u.pathnameBase !== `/` && (a = V([a, u.pathnameBase])))
  }
  return o
}
function ye(e, t) {
  typeof e == `string` && (e = { path: e, caseSensitive: !1, end: !0 })
  let [n, r] = z(e.path, e.caseSensitive, e.end),
    i = t.match(n)
  if (!i) return null
  let a = i[0],
    o = a.replace(/(.)\/+$/, `$1`),
    s = i.slice(1)
  return {
    params: r.reduce((e, { paramName: t, isOptional: n }, r) => {
      if (t === `*`) {
        let e = s[r] || ``
        o = a.slice(0, a.length - e.length).replace(/(.)\/+$/, `$1`)
      }
      let i = s[r]
      return (n && !i ? (e[t] = void 0) : (e[t] = (i || ``).replace(/%2F/g, `/`)), e)
    }, {}),
    pathname: a,
    pathnameBase: o,
    pattern: e,
  }
}
function z(e, t = !1, n = !0) {
  w(
    e === `*` || !e.endsWith(`*`) || e.endsWith(`/*`),
    `Route path "${e}" will be treated as if it were "${e.replace(/\*$/, `/*`)}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${e.replace(/\*$/, `/*`)}".`,
  )
  let r = [],
    i =
      `^` +
      e
        .replace(/\/*\*?$/, ``)
        .replace(/^\/*/, `/`)
        .replace(/[\\.*+^${}|()[\]]/g, `\\$&`)
        .replace(/\/:([\w-]+)(\?)?/g, (e, t, n, i, a) => {
          if ((r.push({ paramName: t, isOptional: n != null }), n)) {
            let t = a.charAt(i + e.length)
            return t && t !== `/` ? `/([^\\/]*)` : `(?:/([^\\/]*))?`
          }
          return `/([^\\/]+)`
        })
        .replace(/\/([\w-]+)\?(\/|$)/g, `(/$1)?$2`)
  return (
    e.endsWith(`*`)
      ? (r.push({ paramName: `*` }), (i += e === `*` || e === `/*` ? `(.*)$` : `(?:\\/(.+)|\\/*)$`))
      : n
        ? (i += `\\/*$`)
        : e !== `` && e !== `/` && (i += `(?:(?=\\/|$))`),
    [new RegExp(i, t ? void 0 : `i`), r]
  )
}
function be(e) {
  try {
    return e
      .split(`/`)
      .map((e) => decodeURIComponent(e).replace(/\//g, `%2F`))
      .join(`/`)
  } catch (t) {
    return (
      w(
        !1,
        `The URL path "${e}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${t}).`,
      ),
      e
    )
  }
}
function B(e, t) {
  if (t === `/`) return e
  if (!e.toLowerCase().startsWith(t.toLowerCase())) return null
  let n = t.endsWith(`/`) ? t.length - 1 : t.length,
    r = e.charAt(n)
  return r && r !== `/` ? null : e.slice(n) || `/`
}
function xe({ basename: e, pathname: t }) {
  return t === `/` ? e : V([e, t])
}
var Se = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,
  Ce = (e) => Se.test(e)
function we(e, t = `/`) {
  let { pathname: n, search: r = ``, hash: i = `` } = typeof e == `string` ? k(e) : e,
    a
  return (
    n
      ? ((n = n.replace(/\/\/+/g, `/`)),
        (a = n.startsWith(`/`) ? Te(n.substring(1), `/`) : Te(n, t)))
      : (a = t),
    { pathname: a, search: je(r), hash: Me(i) }
  )
}
function Te(e, t) {
  let n = t.replace(/\/+$/, ``).split(`/`)
  return (
    e.split(`/`).forEach((e) => {
      e === `..` ? n.length > 1 && n.pop() : e !== `.` && n.push(e)
    }),
    n.length > 1 ? n.join(`/`) : `/`
  )
}
function Ee(e, t, n, r) {
  return `Cannot include a '${e}' character in a manually specified \`to.${t}\` field [${JSON.stringify(r)}].  Please separate it out to the \`to.${n}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`
}
function De(e) {
  return e.filter((e, t) => t === 0 || (e.route.path && e.route.path.length > 0))
}
function Oe(e) {
  let t = De(e)
  return t.map((e, n) => (n === t.length - 1 ? e.pathname : e.pathnameBase))
}
function ke(e, t, n, r = !1) {
  let i
  typeof e == `string`
    ? (i = k(e))
    : ((i = { ...e }),
      C(!i.pathname || !i.pathname.includes(`?`), Ee(`?`, `pathname`, `search`, i)),
      C(!i.pathname || !i.pathname.includes(`#`), Ee(`#`, `pathname`, `hash`, i)),
      C(!i.search || !i.search.includes(`#`), Ee(`#`, `search`, `hash`, i)))
  let a = e === `` || i.pathname === ``,
    o = a ? `/` : i.pathname,
    s
  if (o == null) s = n
  else {
    let e = t.length - 1
    if (!r && o.startsWith(`..`)) {
      let t = o.split(`/`)
      for (; t[0] === `..`; ) (t.shift(), --e)
      i.pathname = t.join(`/`)
    }
    s = e >= 0 ? t[e] : `/`
  }
  let c = we(i, s),
    l = o && o !== `/` && o.endsWith(`/`),
    u = (a || o === `.`) && n.endsWith(`/`)
  return (!c.pathname.endsWith(`/`) && (l || u) && (c.pathname += `/`), c)
}
var V = (e) => e.join(`/`).replace(/\/\/+/g, `/`),
  Ae = (e) => e.replace(/\/+$/, ``).replace(/^\/*/, `/`),
  je = (e) => (!e || e === `?` ? `` : e.startsWith(`?`) ? e : `?` + e),
  Me = (e) => (!e || e === `#` ? `` : e.startsWith(`#`) ? e : `#` + e),
  Ne = class {
    constructor(e, t, n, r = !1) {
      ;((this.status = e),
        (this.statusText = t || ``),
        (this.internal = r),
        n instanceof Error ? ((this.data = n.toString()), (this.error = n)) : (this.data = n))
    }
  }
function Pe(e) {
  return (
    e != null &&
    typeof e.status == `number` &&
    typeof e.statusText == `string` &&
    typeof e.internal == `boolean` &&
    `data` in e
  )
}
function Fe(e) {
  return (
    e
      .map((e) => e.route.path)
      .filter(Boolean)
      .join(`/`)
      .replace(/\/\/*/g, `/`) || `/`
  )
}
var H =
  typeof window < `u` && window.document !== void 0 && window.document.createElement !== void 0
function U(e, t) {
  let n = e
  if (typeof n != `string` || !Se.test(n)) return { absoluteURL: void 0, isExternal: !1, to: n }
  let r = n,
    i = !1
  if (H)
    try {
      let e = new URL(window.location.href),
        r = n.startsWith(`//`) ? new URL(e.protocol + n) : new URL(n),
        a = B(r.pathname, t)
      r.origin === e.origin && a != null ? (n = a + r.search + r.hash) : (i = !0)
    } catch {
      w(
        !1,
        `<Link to="${n}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`,
      )
    }
  return { absoluteURL: r, isExternal: i, to: n }
}
var W = Symbol(`Uninstrumented`)
function Ie(e, t) {
  let n = {
    lazy: [],
    'lazy.loader': [],
    'lazy.action': [],
    'lazy.middleware': [],
    middleware: [],
    loader: [],
    action: [],
  }
  e.forEach((e) =>
    e({
      id: t.id,
      index: t.index,
      path: t.path,
      instrument(e) {
        let t = Object.keys(n)
        for (let r of t) e[r] && n[r].push(e[r])
      },
    }),
  )
  let r = {}
  if (typeof t.lazy == `function` && n.lazy.length > 0) {
    let e = Re(n.lazy, t.lazy, () => void 0)
    e && (r.lazy = e)
  }
  if (typeof t.lazy == `object`) {
    let e = t.lazy
    ;[`middleware`, `loader`, `action`].forEach((t) => {
      let i = e[t],
        a = n[`lazy.${t}`]
      if (typeof i == `function` && a.length > 0) {
        let e = Re(a, i, () => void 0)
        e && (r.lazy = Object.assign(r.lazy || {}, { [t]: e }))
      }
    })
  }
  return (
    [`loader`, `action`].forEach((e) => {
      let i = t[e]
      if (typeof i == `function` && n[e].length > 0) {
        let t = i[W] ?? i,
          a = Re(n[e], t, (...e) => Be(e[0]))
        a && (e === `loader` && t.hydrate === !0 && (a.hydrate = !0), (a[W] = t), (r[e] = a))
      }
    }),
    t.middleware &&
      t.middleware.length > 0 &&
      n.middleware.length > 0 &&
      (r.middleware = t.middleware.map((e) => {
        let t = e[W] ?? e,
          r = Re(n.middleware, t, (...e) => Be(e[0]))
        return r ? ((r[W] = t), r) : e
      })),
    r
  )
}
function Le(e, t) {
  let n = { navigate: [], fetch: [] }
  if (
    (t.forEach((e) =>
      e({
        instrument(e) {
          let t = Object.keys(e)
          for (let r of t) e[r] && n[r].push(e[r])
        },
      }),
    ),
    n.navigate.length > 0)
  ) {
    let t = e.navigate[W] ?? e.navigate,
      r = Re(n.navigate, t, (...t) => {
        let [n, r] = t
        return {
          to: typeof n == `number` || typeof n == `string` ? n : n ? O(n) : `.`,
          ...G(e, r ?? {}),
        }
      })
    r && ((r[W] = t), (e.navigate = r))
  }
  if (n.fetch.length > 0) {
    let t = e.fetch[W] ?? e.fetch,
      r = Re(n.fetch, t, (...t) => {
        let [n, , r, i] = t
        return { href: r ?? `.`, fetcherKey: n, ...G(e, i ?? {}) }
      })
    r && ((r[W] = t), (e.fetch = r))
  }
  return e
}
function Re(e, t, n) {
  return e.length === 0
    ? null
    : async (...r) => {
        let i = await ze(e, n(...r), () => t(...r), e.length - 1)
        if (i.type === `error`) throw i.value
        return i.value
      }
}
async function ze(e, t, n, r) {
  let i = e[r],
    a
  if (i) {
    let o,
      s = async () => (
        o
          ? console.error(`You cannot call instrumented handlers more than once`)
          : (o = ze(e, t, n, r - 1)),
        (a = await o),
        C(a, `Expected a result`),
        a.type === `error` && a.value instanceof Error
          ? { status: `error`, error: a.value }
          : { status: `success`, error: void 0 }
      )
    try {
      await i(s, t)
    } catch (e) {
      console.error(`An instrumentation function threw an error:`, e)
    }
    ;(o || (await s()), await o)
  } else
    try {
      a = { type: `success`, value: await n() }
    } catch (e) {
      a = { type: `error`, value: e }
    }
  return a || { type: `error`, value: Error(`No result assigned in instrumentation chain.`) }
}
function Be(e) {
  let { request: t, context: n, params: r, unstable_pattern: i } = e
  return { request: Ve(t), params: { ...r }, unstable_pattern: i, context: He(n) }
}
function G(e, t) {
  return {
    currentUrl: O(e.state.location),
    ...(`formMethod` in t ? { formMethod: t.formMethod } : {}),
    ...(`formEncType` in t ? { formEncType: t.formEncType } : {}),
    ...(`formData` in t ? { formData: t.formData } : {}),
    ...(`body` in t ? { body: t.body } : {}),
  }
}
function Ve(e) {
  return { method: e.method, url: e.url, headers: { get: (...t) => e.headers.get(...t) } }
}
function He(e) {
  if (We(e)) {
    let t = { ...e }
    return (Object.freeze(t), t)
  } else return { get: (t) => e.get(t) }
}
var Ue = Object.getOwnPropertyNames(Object.prototype).sort().join(`\0`)
function We(e) {
  if (typeof e != `object` || !e) return !1
  let t = Object.getPrototypeOf(e)
  return (
    t === Object.prototype || t === null || Object.getOwnPropertyNames(t).sort().join(`\0`) === Ue
  )
}
var Ge = [`POST`, `PUT`, `PATCH`, `DELETE`],
  Ke = new Set(Ge),
  qe = [`GET`, ...Ge],
  Je = new Set(qe),
  Ye = new Set([301, 302, 303, 307, 308]),
  Xe = new Set([307, 308]),
  Ze = {
    state: `idle`,
    location: void 0,
    formMethod: void 0,
    formAction: void 0,
    formEncType: void 0,
    formData: void 0,
    json: void 0,
    text: void 0,
  },
  Qe = {
    state: `idle`,
    data: void 0,
    formMethod: void 0,
    formAction: void 0,
    formEncType: void 0,
    formData: void 0,
    json: void 0,
    text: void 0,
  },
  $e = { state: `unblocked`, proceed: void 0, reset: void 0, location: void 0 },
  et = (e) => ({ hasErrorBoundary: !!e.hasErrorBoundary }),
  tt = `remix-router-transitions`,
  nt = Symbol(`ResetLoaderData`)
function rt(e) {
  let t = e.window ? e.window : typeof window < `u` ? window : void 0,
    n = t !== void 0 && t.document !== void 0 && t.document.createElement !== void 0
  C(e.routes.length > 0, `You must provide a non-empty routes array to createRouter`)
  let r = e.hydrationRouteProperties || [],
    i = e.mapRouteProperties || et,
    a = i
  if (e.unstable_instrumentations) {
    let t = e.unstable_instrumentations
    a = (e) => ({ ...i(e), ...Ie(t.map((e) => e.route).filter(Boolean), e) })
  }
  let o = {},
    s = F(e.routes, a, void 0, o),
    c,
    l = e.basename || `/`
  l.startsWith(`/`) || (l = `/${l}`)
  let u = e.dataStrategy || bt,
    d = { unstable_passThroughRequests: !1, ...e.future },
    f = null,
    p = new Set(),
    m = null,
    h = null,
    g = null,
    _ = e.hydrationData != null,
    v = oe(s, e.history.location, l),
    y = !1,
    b = null,
    x,
    S
  if (v == null && !e.patchRoutesOnNavigation) {
    let t = K(404, { pathname: e.history.location.pathname }),
      { matches: n, route: r } = Ut(s)
    ;((x = !0), (S = !x), (v = n), (b = { [r.id]: t }))
  } else if (
    (v && !e.hydrationData && it(v, s, e.history.location.pathname).active && (v = null), !v)
  ) {
    ;((x = !1), (S = !x), (v = []))
    let t = it(null, s, e.history.location.pathname)
    t.active && t.matches && ((y = !0), (v = t.matches))
  } else if (v.some((e) => e.route.lazy)) ((x = !1), (S = !x))
  else if (!v.some((e) => ct(e.route))) ((x = !0), (S = !x))
  else {
    let t = e.hydrationData ? e.hydrationData.loaderData : null,
      n = e.hydrationData ? e.hydrationData.errors : null,
      r = v
    if (n) {
      let e = v.findIndex((e) => n[e.route.id] !== void 0)
      r = r.slice(0, e + 1)
    }
    ;((S = !1),
      (x = !0),
      r.forEach((e) => {
        let r = lt(e.route, t, n)
        ;((S ||= r.renderFallback), (x &&= !r.shouldLoad))
      }))
  }
  let T,
    E = {
      historyAction: e.history.action,
      location: e.history.location,
      matches: v,
      initialized: x,
      renderFallback: S,
      navigation: Ze,
      restoreScrollPosition: e.hydrationData == null ? null : !1,
      preventScrollReset: !1,
      revalidation: `idle`,
      loaderData: (e.hydrationData && e.hydrationData.loaderData) || {},
      actionData: (e.hydrationData && e.hydrationData.actionData) || null,
      errors: (e.hydrationData && e.hydrationData.errors) || b,
      fetchers: new Map(),
      blockers: new Map(),
    },
    O = `POP`,
    A = null,
    j = !1,
    M,
    N = !1,
    P = new Map(),
    ne = null,
    re = !1,
    ie = !1,
    ae = new Set(),
    I = new Map(),
    le = 0,
    ue = -1,
    de = new Map(),
    L = new Set(),
    fe = new Map(),
    pe = new Map(),
    R = new Set(),
    me = new Map(),
    he,
    ge = null
  function _e() {
    if (
      ((f = e.history.listen(({ action: t, location: n, delta: r }) => {
        if (he) {
          ;(he(), (he = void 0))
          return
        }
        w(
          me.size === 0 || r != null,
          'You are trying to use a blocker on a POP navigation to a location that was not created by @remix-run/router. This will fail silently in production. This can happen if you are navigating outside the router via `window.history.pushState`/`window.location.hash` instead of using router navigation APIs.  This can also happen if you are using createHashRouter and the user manually changes the URL.',
        )
        let i = qe({ currentLocation: E.location, nextLocation: n, historyAction: t })
        if (i && r != null) {
          let t = new Promise((e) => {
            he = e
          })
          ;(e.history.go(r * -1),
            Ke(i, {
              state: `blocked`,
              location: n,
              proceed() {
                ;(Ke(i, { state: `proceeding`, proceed: void 0, reset: void 0, location: n }),
                  t.then(() => e.history.go(r)))
              },
              reset() {
                let e = new Map(E.blockers)
                ;(e.set(i, $e), z({ blockers: e }))
              },
            }),
            A?.resolve(),
            (A = null))
          return
        }
        return we(t, n)
      })),
      n)
    ) {
      fn(t, P)
      let e = () => pn(t, P)
      ;(t.addEventListener(`pagehide`, e), (ne = () => t.removeEventListener(`pagehide`, e)))
    }
    return (E.initialized || we(`POP`, E.location, { initialHydration: !0 }), T)
  }
  function ve() {
    ;(f && f(),
      ne && ne(),
      p.clear(),
      M && M.abort(),
      E.fetchers.forEach((e, t) => ze(t)),
      E.blockers.forEach((e, t) => Ge(t)))
  }
  function ye(e) {
    return (p.add(e), () => p.delete(e))
  }
  function z(e, t = {}) {
    ;((e.matches &&= e.matches.map((e) => {
      let t = o[e.route.id],
        n = e.route
      return n.element !== t.element ||
        n.errorElement !== t.errorElement ||
        n.hydrateFallbackElement !== t.hydrateFallbackElement
        ? { ...e, route: t }
        : e
    })),
      (E = { ...E, ...e }))
    let n = [],
      r = []
    ;(E.fetchers.forEach((e, t) => {
      e.state === `idle` && (R.has(t) ? n.push(t) : r.push(t))
    }),
      R.forEach((e) => {
        !E.fetchers.has(e) && !I.has(e) && n.push(e)
      }),
      [...p].forEach((r) =>
        r(E, {
          deletedFetchers: n,
          newErrors: e.errors ?? null,
          viewTransitionOpts: t.viewTransitionOpts,
          flushSync: t.flushSync === !0,
        }),
      ),
      n.forEach((e) => ze(e)),
      r.forEach((e) => E.fetchers.delete(e)))
  }
  function be(t, n, { flushSync: r } = {}) {
    let i =
        E.actionData != null &&
        E.navigation.formMethod != null &&
        J(E.navigation.formMethod) &&
        E.navigation.state === `loading` &&
        t.state?._isRedirect !== !0,
      a
    a = n.actionData
      ? Object.keys(n.actionData).length > 0
        ? n.actionData
        : null
      : i
        ? E.actionData
        : null
    let o = n.loaderData ? Bt(E.loaderData, n.loaderData, n.matches || [], n.errors) : E.loaderData,
      l = E.blockers
    l.size > 0 && ((l = new Map(l)), l.forEach((e, t) => l.set(t, $e)))
    let u = re ? !1 : rt(t, n.matches || E.matches),
      d =
        j === !0 ||
        (E.navigation.formMethod != null &&
          J(E.navigation.formMethod) &&
          t.state?._isRedirect !== !0)
    ;((c &&= ((s = c), void 0)),
      re ||
        O === `POP` ||
        (O === `PUSH`
          ? e.history.push(t, t.state)
          : O === `REPLACE` && e.history.replace(t, t.state)))
    let f
    if (O === `POP`) {
      let e = P.get(E.location.pathname)
      e && e.has(t.pathname)
        ? (f = { currentLocation: E.location, nextLocation: t })
        : P.has(t.pathname) && (f = { currentLocation: t, nextLocation: E.location })
    } else if (N) {
      let e = P.get(E.location.pathname)
      ;(e ? e.add(t.pathname) : ((e = new Set([t.pathname])), P.set(E.location.pathname, e)),
        (f = { currentLocation: E.location, nextLocation: t }))
    }
    ;(z(
      {
        ...n,
        actionData: a,
        loaderData: o,
        historyAction: O,
        location: t,
        initialized: !0,
        renderFallback: !1,
        navigation: Ze,
        revalidation: `idle`,
        restoreScrollPosition: u,
        preventScrollReset: d,
        blockers: l,
      },
      { viewTransitionOpts: f, flushSync: r === !0 },
    ),
      (O = `POP`),
      (j = !1),
      (N = !1),
      (re = !1),
      (ie = !1),
      A?.resolve(),
      (A = null),
      ge?.resolve(),
      (ge = null))
  }
  async function xe(t, n) {
    if ((A?.resolve(), (A = null), typeof t == `number`)) {
      A ||= mn()
      let n = A.promise
      return (e.history.go(t), n)
    }
    let {
        path: r,
        submission: i,
        error: a,
      } = ot(!1, at(E.location, E.matches, l, t, n?.fromRouteId, n?.relative), n),
      o
    n?.unstable_mask &&
      (o = {
        pathname: ``,
        search: ``,
        hash: ``,
        ...(typeof n.unstable_mask == `string`
          ? k(n.unstable_mask)
          : { ...E.location.unstable_mask, ...n.unstable_mask }),
      })
    let s = E.location,
      c = D(s, r, n && n.state, void 0, o)
    c = { ...c, ...e.history.encodeLocation(c) }
    let u = n && n.replace != null ? n.replace : void 0,
      d = `PUSH`
    u === !0
      ? (d = `REPLACE`)
      : u === !1 ||
        (i != null &&
          J(i.formMethod) &&
          i.formAction === E.location.pathname + E.location.search &&
          (d = `REPLACE`))
    let f = n && `preventScrollReset` in n ? n.preventScrollReset === !0 : void 0,
      p = (n && n.flushSync) === !0,
      m = qe({ currentLocation: s, nextLocation: c, historyAction: d })
    if (m) {
      Ke(m, {
        state: `blocked`,
        location: c,
        proceed() {
          ;(Ke(m, { state: `proceeding`, proceed: void 0, reset: void 0, location: c }), xe(t, n))
        },
        reset() {
          let e = new Map(E.blockers)
          ;(e.set(m, $e), z({ blockers: e }))
        },
      })
      return
    }
    await we(d, c, {
      submission: i,
      pendingError: a,
      preventScrollReset: f,
      replace: n && n.replace,
      enableViewTransition: n && n.viewTransition,
      flushSync: p,
      callSiteDefaultShouldRevalidate: n && n.unstable_defaultShouldRevalidate,
    })
  }
  function Se() {
    ;((ge ||= mn()), Fe(), z({ revalidation: `loading` }))
    let e = ge.promise
    return E.navigation.state === `submitting`
      ? e
      : E.navigation.state === `idle`
        ? (we(E.historyAction, E.location, { startUninterruptedRevalidation: !0 }), e)
        : (we(O || E.historyAction, E.navigation.location, {
            overrideNavigation: E.navigation,
            enableViewTransition: N === !0,
          }),
          e)
  }
  async function we(t, n, r) {
    ;(M && M.abort(),
      (M = null),
      (O = t),
      (re = (r && r.startUninterruptedRevalidation) === !0),
      nt(E.location, E.matches),
      (j = (r && r.preventScrollReset) === !0),
      (N = (r && r.enableViewTransition) === !0))
    let i = c || s,
      a = r && r.overrideNavigation,
      o = r?.initialHydration && E.matches && E.matches.length > 0 && !y ? E.matches : oe(i, n, l),
      u = (r && r.flushSync) === !0
    if (
      o &&
      E.initialized &&
      !ie &&
      Kt(E.location, n) &&
      !(r && r.submission && J(r.submission.formMethod))
    ) {
      be(n, { matches: o }, { flushSync: u })
      return
    }
    let d = it(o, i, n.pathname)
    if ((d.active && d.matches && (o = d.matches), !o)) {
      let { error: e, notFoundMatches: t, route: r } = Je(n.pathname)
      be(n, { matches: t, loaderData: {}, errors: { [r.id]: e } }, { flushSync: u })
      return
    }
    M = new AbortController()
    let f = Pt(e.history, n, M.signal, r && r.submission),
      p = e.getContext ? await e.getContext() : new te(),
      m
    if (r && r.pendingError) m = [Ht(o).route.id, { type: `error`, error: r.pendingError }]
    else if (r && r.submission && J(r.submission.formMethod)) {
      let t = await Te(f, n, r.submission, o, p, d.active, r && r.initialHydration === !0, {
        replace: r.replace,
        flushSync: u,
      })
      if (t.shortCircuited) return
      if (t.pendingActionResult) {
        let [e, r] = t.pendingActionResult
        if (q(r) && Pe(r.error) && r.error.status === 404) {
          ;((M = null), be(n, { matches: t.matches, loaderData: {}, errors: { [e]: r.error } }))
          return
        }
      }
      ;((o = t.matches || o),
        (m = t.pendingActionResult),
        (a = sn(n, r.submission)),
        (u = !1),
        (d.active = !1),
        (f = Pt(e.history, f.url, f.signal)))
    }
    let {
      shortCircuited: h,
      matches: g,
      loaderData: _,
      errors: v,
    } = await Ee(
      f,
      n,
      o,
      p,
      d.active,
      a,
      r && r.submission,
      r && r.fetcherSubmission,
      r && r.replace,
      r && r.initialHydration === !0,
      u,
      m,
      r && r.callSiteDefaultShouldRevalidate,
    )
    h || ((M = null), be(n, { matches: g || o, ...Vt(m), loaderData: _, errors: v }))
  }
  async function Te(t, n, i, c, u, d, f, p = {}) {
    if ((Fe(), z({ navigation: cn(n, i) }, { flushSync: p.flushSync === !0 }), d)) {
      let e = await ut(c, n.pathname, t.signal)
      if (e.type === `aborted`) return { shortCircuited: !0 }
      if (e.type === `error`) {
        if (e.partialMatches.length === 0) {
          let { matches: t, route: n } = Ut(s)
          return { matches: t, pendingActionResult: [n.id, { type: `error`, error: e.error }] }
        }
        let t = Ht(e.partialMatches).route.id
        return {
          matches: e.partialMatches,
          pendingActionResult: [t, { type: `error`, error: e.error }],
        }
      } else if (e.matches) c = e.matches
      else {
        let { notFoundMatches: e, error: t, route: r } = Je(n.pathname)
        return { matches: e, pendingActionResult: [r.id, { type: `error`, error: t }] }
      }
    }
    let m,
      h = an(c, n)
    if (!h.route.action && !h.route.lazy)
      m = {
        type: `error`,
        error: K(405, { method: t.method, pathname: n.pathname, routeId: h.route.id }),
      }
    else {
      let e = await Me(t, n, Et(a, o, t, n, c, h, f ? [] : r, u), u, null)
      if (((m = e[h.route.id]), !m)) {
        for (let t of c)
          if (e[t.route.id]) {
            m = e[t.route.id]
            break
          }
      }
      if (t.signal.aborted) return { shortCircuited: !0 }
    }
    if (Zt(m)) {
      let n
      return (
        (n =
          p && p.replace != null
            ? p.replace
            : Nt(m.response.headers.get(`Location`), new URL(t.url), l, e.history) ===
              E.location.pathname + E.location.search),
        await je(t, m, !0, { submission: i, replace: n }),
        { shortCircuited: !0 }
      )
    }
    if (q(m)) {
      let e = Ht(c, h.route.id)
      return (
        (p && p.replace) !== !0 && (O = `PUSH`),
        { matches: c, pendingActionResult: [e.route.id, m, h.route.id] }
      )
    }
    return { matches: c, pendingActionResult: [h.route.id, m] }
  }
  async function Ee(t, n, i, u, d, f, p, m, h, g, _, v, y) {
    let b = f || sn(n, p),
      x = p || m || on(b),
      S = !re && !g
    if (d) {
      if (S) {
        let e = De(v)
        z({ navigation: b, ...(e === void 0 ? {} : { actionData: e }) }, { flushSync: _ })
      }
      let e = await ut(i, n.pathname, t.signal)
      if (e.type === `aborted`) return { shortCircuited: !0 }
      if (e.type === `error`) {
        if (e.partialMatches.length === 0) {
          let { matches: t, route: n } = Ut(s)
          return { matches: t, loaderData: {}, errors: { [n.id]: e.error } }
        }
        let t = Ht(e.partialMatches).route.id
        return { matches: e.partialMatches, loaderData: {}, errors: { [t]: e.error } }
      } else if (e.matches) i = e.matches
      else {
        let { error: e, notFoundMatches: t, route: r } = Je(n.pathname)
        return { matches: t, loaderData: {}, errors: { [r.id]: e } }
      }
    }
    let C = c || s,
      { dsMatches: w, revalidatingFetchers: T } = st(
        t,
        u,
        a,
        o,
        e.history,
        E,
        i,
        x,
        n,
        g ? [] : r,
        g === !0,
        ie,
        ae,
        R,
        fe,
        L,
        C,
        l,
        e.patchRoutesOnNavigation != null,
        v,
        y,
      )
    if (
      ((ue = ++le),
      !e.dataStrategy &&
        !w.some((e) => e.shouldLoad) &&
        !w.some((e) => e.route.middleware && e.route.middleware.length > 0) &&
        T.length === 0)
    ) {
      let e = He()
      return (
        be(
          n,
          {
            matches: i,
            loaderData: {},
            errors: v && q(v[1]) ? { [v[0]]: v[1].error } : null,
            ...Vt(v),
            ...(e ? { fetchers: new Map(E.fetchers) } : {}),
          },
          { flushSync: _ },
        ),
        { shortCircuited: !0 }
      )
    }
    if (S) {
      let e = {}
      if (!d) {
        e.navigation = b
        let t = De(v)
        t !== void 0 && (e.actionData = t)
      }
      ;(T.length > 0 && (e.fetchers = Oe(T)), z(e, { flushSync: _ }))
    }
    T.forEach((e) => {
      ;(G(e.key), e.controller && I.set(e.key, e.controller))
    })
    let D = () => T.forEach((e) => G(e.key))
    M && M.signal.addEventListener(`abort`, D)
    let { loaderResults: O, fetcherResults: k } = await Ne(w, T, t, n, u)
    if (t.signal.aborted) return { shortCircuited: !0 }
    ;(M && M.signal.removeEventListener(`abort`, D), T.forEach((e) => I.delete(e.key)))
    let A = Wt(O)
    if (A) return (await je(t, A.result, !0, { replace: h }), { shortCircuited: !0 })
    if (((A = Wt(k)), A))
      return (L.add(A.key), await je(t, A.result, !0, { replace: h }), { shortCircuited: !0 })
    let { loaderData: ee, errors: j } = zt(E, i, O, v, T, k)
    g && E.errors && (j = { ...E.errors, ...j })
    let te = He(),
      N = Ue(ue),
      P = te || N || T.length > 0
    return {
      matches: i,
      loaderData: ee,
      errors: j,
      ...(P ? { fetchers: new Map(E.fetchers) } : {}),
    }
  }
  function De(e) {
    if (e && !q(e[1])) return { [e[0]]: e[1].data }
    if (E.actionData) return Object.keys(E.actionData).length === 0 ? null : E.actionData
  }
  function Oe(e) {
    return (
      e.forEach((e) => {
        let t = E.fetchers.get(e.key),
          n = ln(void 0, t ? t.data : void 0)
        E.fetchers.set(e.key, n)
      }),
      new Map(E.fetchers)
    )
  }
  async function ke(t, n, r, i) {
    G(t)
    let a = (i && i.flushSync) === !0,
      o = c || s,
      u = at(E.location, E.matches, l, r, n, i?.relative),
      d = oe(o, u, l),
      f = it(d, o, u)
    if ((f.active && f.matches && (d = f.matches), !d)) {
      U(t, n, K(404, { pathname: u }), { flushSync: a })
      return
    }
    let { path: p, submission: m, error: h } = ot(!0, u, i)
    if (h) {
      U(t, n, h, { flushSync: a })
      return
    }
    let g = e.getContext ? await e.getContext() : new te(),
      _ = (i && i.preventScrollReset) === !0
    if (m && J(m.formMethod)) {
      await V(t, n, p, d, g, f.active, a, _, m, i && i.unstable_defaultShouldRevalidate)
      return
    }
    ;(fe.set(t, { routeId: n, path: p }), await Ae(t, n, p, d, g, f.active, a, _, m))
  }
  async function V(t, n, i, u, d, f, p, m, h, g) {
    ;(Fe(), fe.delete(t), H(t, un(h, E.fetchers.get(t)), { flushSync: p }))
    let _ = new AbortController(),
      v = Pt(e.history, i, _.signal, h)
    if (f) {
      let e = await ut(u, new URL(v.url).pathname, v.signal, t)
      if (e.type === `aborted`) return
      if (e.type === `error`) {
        U(t, n, e.error, { flushSync: p })
        return
      } else if (e.matches) u = e.matches
      else {
        U(t, n, K(404, { pathname: i }), { flushSync: p })
        return
      }
    }
    let y = an(u, i)
    if (!y.route.action && !y.route.lazy) {
      U(t, n, K(405, { method: h.formMethod, pathname: i, routeId: n }), { flushSync: p })
      return
    }
    I.set(t, _)
    let b = le,
      x = Et(a, o, v, i, u, y, r, d),
      S = await Me(v, i, x, d, t),
      w = S[y.route.id]
    if (!w) {
      for (let e of x)
        if (S[e.route.id]) {
          w = S[e.route.id]
          break
        }
    }
    if (v.signal.aborted) {
      I.get(t) === _ && I.delete(t)
      return
    }
    if (R.has(t)) {
      if (Zt(w) || q(w)) {
        H(t, dn(void 0))
        return
      }
    } else {
      if (Zt(w))
        if ((I.delete(t), ue > b)) {
          H(t, dn(void 0))
          return
        } else
          return (
            L.add(t), H(t, ln(h)), je(v, w, !1, { fetcherSubmission: h, preventScrollReset: m })
          )
      if (q(w)) {
        U(t, n, w.error)
        return
      }
    }
    let T = E.navigation.location || E.location,
      D = Pt(e.history, T, _.signal),
      k = c || s,
      A = E.navigation.state === `idle` ? E.matches : oe(k, E.navigation.location, l)
    C(A, `Didn't find any matches after fetcher action`)
    let ee = ++le
    de.set(t, ee)
    let j = ln(h, w.data)
    E.fetchers.set(t, j)
    let { dsMatches: te, revalidatingFetchers: N } = st(
      D,
      d,
      a,
      o,
      e.history,
      E,
      A,
      h,
      T,
      r,
      !1,
      ie,
      ae,
      R,
      fe,
      L,
      k,
      l,
      e.patchRoutesOnNavigation != null,
      [y.route.id, w],
      g,
    )
    ;(N.filter((e) => e.key !== t).forEach((e) => {
      let t = e.key,
        n = E.fetchers.get(t),
        r = ln(void 0, n ? n.data : void 0)
      ;(E.fetchers.set(t, r), G(t), e.controller && I.set(t, e.controller))
    }),
      z({ fetchers: new Map(E.fetchers) }))
    let P = () => N.forEach((e) => G(e.key))
    _.signal.addEventListener(`abort`, P)
    let { loaderResults: ne, fetcherResults: re } = await Ne(te, N, D, T, d)
    if (_.signal.aborted) return
    if (
      (_.signal.removeEventListener(`abort`, P),
      de.delete(t),
      I.delete(t),
      N.forEach((e) => I.delete(e.key)),
      E.fetchers.has(t))
    ) {
      let e = dn(w.data)
      E.fetchers.set(t, e)
    }
    let F = Wt(ne)
    if (F) return je(D, F.result, !1, { preventScrollReset: m })
    if (((F = Wt(re)), F)) return (L.add(F.key), je(D, F.result, !1, { preventScrollReset: m }))
    let { loaderData: se, errors: ce } = zt(E, A, ne, void 0, N, re)
    ;(Ue(ee),
      E.navigation.state === `loading` && ee > ue
        ? (C(O, `Expected pending action`),
          M && M.abort(),
          be(E.navigation.location, {
            matches: A,
            loaderData: se,
            errors: ce,
            fetchers: new Map(E.fetchers),
          }))
        : (z({
            errors: ce,
            loaderData: Bt(E.loaderData, se, A, ce),
            fetchers: new Map(E.fetchers),
          }),
          (ie = !1)))
  }
  async function Ae(t, n, i, s, c, l, u, d, f) {
    let p = E.fetchers.get(t)
    H(t, ln(f, p ? p.data : void 0), { flushSync: u })
    let m = new AbortController(),
      h = Pt(e.history, i, m.signal)
    if (l) {
      let e = await ut(s, new URL(h.url).pathname, h.signal, t)
      if (e.type === `aborted`) return
      if (e.type === `error`) {
        U(t, n, e.error, { flushSync: u })
        return
      } else if (e.matches) s = e.matches
      else {
        U(t, n, K(404, { pathname: i }), { flushSync: u })
        return
      }
    }
    let g = an(s, i)
    I.set(t, m)
    let _ = le,
      v = (await Me(h, i, Et(a, o, h, i, s, g, r, c), c, t))[g.route.id]
    if ((I.get(t) === m && I.delete(t), !h.signal.aborted)) {
      if (R.has(t)) {
        H(t, dn(void 0))
        return
      }
      if (Zt(v))
        if (ue > _) {
          H(t, dn(void 0))
          return
        } else {
          ;(L.add(t), await je(h, v, !1, { preventScrollReset: d }))
          return
        }
      if (q(v)) {
        U(t, n, v.error)
        return
      }
      H(t, dn(v.data))
    }
  }
  async function je(
    r,
    i,
    a,
    { submission: o, fetcherSubmission: s, preventScrollReset: c, replace: u } = {},
  ) {
    ;(a || (A?.resolve(), (A = null)), i.response.headers.has(`X-Remix-Revalidate`) && (ie = !0))
    let d = i.response.headers.get(`Location`)
    ;(C(d, `Expected a Location header on the redirect Response`),
      (d = Nt(d, new URL(r.url), l, e.history)))
    let f = D(E.location, d, { _isRedirect: !0 })
    if (n) {
      let e = !1
      if (i.response.headers.has(`X-Remix-Reload-Document`)) e = !0
      else if (Ce(d)) {
        let n = ee(d, !0)
        e = n.origin !== t.location.origin || B(n.pathname, l) == null
      }
      if (e) {
        u ? t.location.replace(d) : t.location.assign(d)
        return
      }
    }
    M = null
    let p = u === !0 || i.response.headers.has(`X-Remix-Replace`) ? `REPLACE` : `PUSH`,
      { formMethod: m, formAction: h, formEncType: g } = E.navigation
    !o && !s && m && h && g && (o = on(E.navigation))
    let _ = o || s
    Xe.has(i.response.status) && _ && J(_.formMethod)
      ? await we(p, f, {
          submission: { ..._, formAction: d },
          preventScrollReset: c || j,
          enableViewTransition: a ? N : void 0,
        })
      : await we(p, f, {
          overrideNavigation: sn(f, o),
          fetcherSubmission: s,
          preventScrollReset: c || j,
          enableViewTransition: a ? N : void 0,
        })
  }
  async function Me(e, t, n, r, i) {
    let a,
      o = {}
    try {
      a = await Dt(u, e, t, n, i, r, !1)
    } catch (e) {
      return (
        n
          .filter((e) => e.shouldLoad)
          .forEach((t) => {
            o[t.route.id] = { type: `error`, error: e }
          }),
        o
      )
    }
    if (e.signal.aborted) return o
    if (!J(e.method))
      for (let e of n) {
        if (a[e.route.id]?.type === `error`) break
        !a.hasOwnProperty(e.route.id) &&
          !E.loaderData.hasOwnProperty(e.route.id) &&
          (!E.errors || !E.errors.hasOwnProperty(e.route.id)) &&
          e.shouldCallHandler() &&
          (a[e.route.id] = {
            type: `error`,
            result: Error(`No result returned from dataStrategy for route ${e.route.id}`),
          })
      }
    for (let [t, r] of Object.entries(a))
      if (Xt(r)) {
        let i = r.result
        o[t] = { type: `redirect`, response: jt(i, e, t, n, l) }
      } else o[t] = await At(r)
    return o
  }
  async function Ne(e, t, n, r, i) {
    let a = Me(n, r, e, i, null),
      o = Promise.all(
        t.map(async (e) => {
          if (e.matches && e.match && e.request && e.controller) {
            let t = (await Me(e.request, e.path, e.matches, i, e.key))[e.match.route.id]
            return { [e.key]: t }
          } else
            return Promise.resolve({
              [e.key]: { type: `error`, error: K(404, { pathname: e.path }) },
            })
        }),
      )
    return {
      loaderResults: await a,
      fetcherResults: (await o).reduce((e, t) => Object.assign(e, t), {}),
    }
  }
  function Fe() {
    ;((ie = !0),
      fe.forEach((e, t) => {
        ;(I.has(t) && ae.add(t), G(t))
      }))
  }
  function H(e, t, n = {}) {
    ;(E.fetchers.set(e, t),
      z({ fetchers: new Map(E.fetchers) }, { flushSync: (n && n.flushSync) === !0 }))
  }
  function U(e, t, n, r = {}) {
    let i = Ht(E.matches, t)
    ;(ze(e),
      z(
        { errors: { [i.route.id]: n }, fetchers: new Map(E.fetchers) },
        { flushSync: (r && r.flushSync) === !0 },
      ))
  }
  function W(e) {
    return (pe.set(e, (pe.get(e) || 0) + 1), R.has(e) && R.delete(e), E.fetchers.get(e) || Qe)
  }
  function Re(e, t) {
    ;(G(e, t?.reason), H(e, dn(null)))
  }
  function ze(e) {
    let t = E.fetchers.get(e)
    ;(I.has(e) && !(t && t.state === `loading` && de.has(e)) && G(e),
      fe.delete(e),
      de.delete(e),
      L.delete(e),
      R.delete(e),
      ae.delete(e),
      E.fetchers.delete(e))
  }
  function Be(e) {
    let t = (pe.get(e) || 0) - 1
    ;(t <= 0 ? (pe.delete(e), R.add(e)) : pe.set(e, t), z({ fetchers: new Map(E.fetchers) }))
  }
  function G(e, t) {
    let n = I.get(e)
    n && (n.abort(t), I.delete(e))
  }
  function Ve(e) {
    for (let t of e) {
      let e = dn(W(t).data)
      E.fetchers.set(t, e)
    }
  }
  function He() {
    let e = [],
      t = !1
    for (let n of L) {
      let r = E.fetchers.get(n)
      ;(C(r, `Expected fetcher: ${n}`), r.state === `loading` && (L.delete(n), e.push(n), (t = !0)))
    }
    return (Ve(e), t)
  }
  function Ue(e) {
    let t = []
    for (let [n, r] of de)
      if (r < e) {
        let e = E.fetchers.get(n)
        ;(C(e, `Expected fetcher: ${n}`), e.state === `loading` && (G(n), de.delete(n), t.push(n)))
      }
    return (Ve(t), t.length > 0)
  }
  function We(e, t) {
    let n = E.blockers.get(e) || $e
    return (me.get(e) !== t && me.set(e, t), n)
  }
  function Ge(e) {
    ;(E.blockers.delete(e), me.delete(e))
  }
  function Ke(e, t) {
    let n = E.blockers.get(e) || $e
    C(
      (n.state === `unblocked` && t.state === `blocked`) ||
        (n.state === `blocked` && t.state === `blocked`) ||
        (n.state === `blocked` && t.state === `proceeding`) ||
        (n.state === `blocked` && t.state === `unblocked`) ||
        (n.state === `proceeding` && t.state === `unblocked`),
      `Invalid blocker state transition: ${n.state} -> ${t.state}`,
    )
    let r = new Map(E.blockers)
    ;(r.set(e, t), z({ blockers: r }))
  }
  function qe({ currentLocation: e, nextLocation: t, historyAction: n }) {
    if (me.size === 0) return
    me.size > 1 && w(!1, `A router only supports one blocker at a time`)
    let r = Array.from(me.entries()),
      [i, a] = r[r.length - 1],
      o = E.blockers.get(i)
    if (
      !(o && o.state === `proceeding`) &&
      a({ currentLocation: e, nextLocation: t, historyAction: n })
    )
      return i
  }
  function Je(e) {
    let t = K(404, { pathname: e }),
      { matches: n, route: r } = Ut(c || s)
    return { notFoundMatches: n, route: r, error: t }
  }
  function Ye(e, t, n) {
    if (((m = e), (g = t), (h = n || null), !_ && E.navigation === Ze)) {
      _ = !0
      let e = rt(E.location, E.matches)
      e != null && z({ restoreScrollPosition: e })
    }
    return () => {
      ;((m = null), (g = null), (h = null))
    }
  }
  function tt(e, t) {
    return (
      (h &&
        h(
          e,
          t.map((e) => ce(e, E.loaderData)),
        )) ||
      e.key
    )
  }
  function nt(e, t) {
    if (m && g) {
      let n = tt(e, t)
      m[n] = g()
    }
  }
  function rt(e, t) {
    if (m) {
      let n = tt(e, t),
        r = m[n]
      if (typeof r == `number`) return r
    }
    return null
  }
  function it(t, n, r) {
    if (e.patchRoutesOnNavigation) {
      if (!t) return { active: !0, matches: se(n, r, l, !0) || [] }
      if (Object.keys(t[0].params).length > 0) return { active: !0, matches: se(n, r, l, !0) }
    }
    return { active: !1, matches: null }
  }
  async function ut(t, n, r, i) {
    if (!e.patchRoutesOnNavigation) return { type: `success`, matches: t }
    let u = t
    for (;;) {
      let t = c == null,
        d = c || s,
        f = o
      try {
        await e.patchRoutesOnNavigation({
          signal: r,
          path: n,
          matches: u,
          fetcherKey: i,
          patch: (e, t) => {
            r.aborted || pt(e, t, d, f, a, !1)
          },
        })
      } catch (e) {
        return { type: `error`, error: e, partialMatches: u }
      } finally {
        t && !r.aborted && (s = [...s])
      }
      if (r.aborted) return { type: `aborted` }
      let p = oe(d, n, l),
        m = null
      if (
        p &&
        (Object.keys(p[0].params).length === 0 ||
          ((m = se(d, n, l, !0)), !(m && u.length < m.length && dt(u, m.slice(0, u.length)))))
      )
        return { type: `success`, matches: p }
      if (((m ||= se(d, n, l, !0)), !m || dt(u, m))) return { type: `success`, matches: null }
      u = m
    }
  }
  function dt(e, t) {
    return e.length === t.length && e.every((e, n) => e.route.id === t[n].route.id)
  }
  function ft(e) {
    ;((o = {}), (c = F(e, a, void 0, o)))
  }
  function mt(e, t, n = !1) {
    let r = c == null
    ;(pt(e, t, c || s, o, a, n), r && ((s = [...s]), z({})))
  }
  return (
    (T = {
      get basename() {
        return l
      },
      get future() {
        return d
      },
      get state() {
        return E
      },
      get routes() {
        return s
      },
      get window() {
        return t
      },
      initialize: _e,
      subscribe: ye,
      enableScrollRestoration: Ye,
      navigate: xe,
      fetch: ke,
      revalidate: Se,
      createHref: (t) => e.history.createHref(t),
      encodeLocation: (t) => e.history.encodeLocation(t),
      getFetcher: W,
      resetFetcher: Re,
      deleteFetcher: Be,
      dispose: ve,
      getBlocker: We,
      deleteBlocker: Ge,
      patchRoutes: mt,
      _internalFetchControllers: I,
      _internalSetRoutes: ft,
      _internalSetStateDoNotUseOrYouWillBreakYourApp(e) {
        z(e)
      },
    }),
    e.unstable_instrumentations &&
      (T = Le(T, e.unstable_instrumentations.map((e) => e.router).filter(Boolean))),
    T
  )
}
function it(e) {
  return (
    e != null && ((`formData` in e && e.formData != null) || (`body` in e && e.body !== void 0))
  )
}
function at(e, t, n, r, i, a) {
  let o, s
  if (i) {
    o = []
    for (let e of t)
      if ((o.push(e), e.route.id === i)) {
        s = e
        break
      }
  } else ((o = t), (s = t[t.length - 1]))
  let c = ke(r || `.`, Oe(o), B(e.pathname, n) || e.pathname, a === `path`)
  if (
    (r ?? ((c.search = e.search), (c.hash = e.hash)), (r == null || r === `` || r === `.`) && s)
  ) {
    let e = rn(c.search)
    if (s.route.index && !e) c.search = c.search ? c.search.replace(/^\?/, `?index&`) : `?index`
    else if (!s.route.index && e) {
      let e = new URLSearchParams(c.search),
        t = e.getAll(`index`)
      ;(e.delete(`index`), t.filter((e) => e).forEach((t) => e.append(`index`, t)))
      let n = e.toString()
      c.search = n ? `?${n}` : ``
    }
  }
  return (n !== `/` && (c.pathname = xe({ basename: n, pathname: c.pathname })), O(c))
}
function ot(e, t, n) {
  if (!n || !it(n)) return { path: t }
  if (n.formMethod && !nn(n.formMethod)) return { path: t, error: K(405, { method: n.formMethod }) }
  let r = () => ({ path: t, error: K(400, { type: `invalid-body` }) }),
    i = (n.formMethod || `get`).toUpperCase(),
    a = Gt(t)
  if (n.body !== void 0) {
    if (n.formEncType === `text/plain`) {
      if (!J(i)) return r()
      let e =
        typeof n.body == `string`
          ? n.body
          : n.body instanceof FormData || n.body instanceof URLSearchParams
            ? Array.from(n.body.entries()).reduce(
                (e, [t, n]) => `${e}${t}=${n}
`,
                ``,
              )
            : String(n.body)
      return {
        path: t,
        submission: {
          formMethod: i,
          formAction: a,
          formEncType: n.formEncType,
          formData: void 0,
          json: void 0,
          text: e,
        },
      }
    } else if (n.formEncType === `application/json`) {
      if (!J(i)) return r()
      try {
        let e = typeof n.body == `string` ? JSON.parse(n.body) : n.body
        return {
          path: t,
          submission: {
            formMethod: i,
            formAction: a,
            formEncType: n.formEncType,
            formData: void 0,
            json: e,
            text: void 0,
          },
        }
      } catch {
        return r()
      }
    }
  }
  C(typeof FormData == `function`, `FormData is not available in this environment`)
  let o, s
  if (n.formData) ((o = It(n.formData)), (s = n.formData))
  else if (n.body instanceof FormData) ((o = It(n.body)), (s = n.body))
  else if (n.body instanceof URLSearchParams) ((o = n.body), (s = Lt(o)))
  else if (n.body == null) ((o = new URLSearchParams()), (s = new FormData()))
  else
    try {
      ;((o = new URLSearchParams(n.body)), (s = Lt(o)))
    } catch {
      return r()
    }
  let c = {
    formMethod: i,
    formAction: a,
    formEncType: (n && n.formEncType) || `application/x-www-form-urlencoded`,
    formData: s,
    json: void 0,
    text: void 0,
  }
  if (J(c.formMethod)) return { path: t, submission: c }
  let l = k(t)
  return (
    e && l.search && rn(l.search) && o.append(`index`, ``),
    (l.search = `?${o}`),
    { path: O(l), submission: c }
  )
}
function st(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h, g, _, v, y, b) {
  let x = y ? (q(y[1]) ? y[1].error : y[1].data) : void 0,
    S = i.createURL(a.location),
    C = i.createURL(c),
    w
  if (u && a.errors) {
    let e = Object.keys(a.errors)[0]
    w = o.findIndex((t) => t.route.id === e)
  } else if (y && q(y[1])) {
    let e = y[0]
    w = o.findIndex((t) => t.route.id === e) - 1
  }
  let T = y ? y[1].statusCode : void 0,
    E = T && T >= 400,
    D = {
      currentUrl: S,
      currentParams: a.matches[0]?.params || {},
      nextUrl: C,
      nextParams: o[0].params,
      ...s,
      actionResult: x,
      actionStatus: T,
    },
    O = Fe(o),
    k = o.map((i, o) => {
      let { route: s } = i,
        f = null
      if (w != null && o > w) f = !1
      else if (s.lazy) f = !0
      else if (!ct(s)) f = !1
      else if (u) {
        let { shouldLoad: e } = lt(s, a.loaderData, a.errors)
        f = e
      } else ut(a.loaderData, a.matches[o], i) && (f = !0)
      if (f !== null) return Tt(n, r, e, c, O, i, l, t, f)
      let p = !1
      typeof b == `boolean`
        ? (p = b)
        : E
          ? (p = !1)
          : d || S.pathname + S.search === C.pathname + C.search
            ? (p = !0)
            : S.search === C.search
              ? dt(a.matches[o], i) && (p = !0)
              : (p = !0)
      let m = { ...D, defaultShouldRevalidate: p }
      return Tt(n, r, e, c, O, i, l, t, ft(i, m), m, b)
    }),
    A = []
  return (
    m.forEach((e, s) => {
      if (u || !o.some((t) => t.route.id === e.routeId) || p.has(s)) return
      let c = a.fetchers.get(s),
        m = c && c.state !== `idle` && c.data === void 0,
        y = oe(g, e.path, _)
      if (!y) {
        if (v && m) return
        A.push({
          key: s,
          routeId: e.routeId,
          path: e.path,
          matches: null,
          match: null,
          request: null,
          controller: null,
        })
        return
      }
      if (h.has(s)) return
      let x = an(y, e.path),
        S = new AbortController(),
        C = Pt(i, e.path, S.signal),
        w = null
      if (f.has(s)) (f.delete(s), (w = Et(n, r, C, e.path, y, x, l, t)))
      else if (m) d && (w = Et(n, r, C, e.path, y, x, l, t))
      else {
        let i
        i = typeof b == `boolean` ? b : E ? !1 : d
        let a = { ...D, defaultShouldRevalidate: i }
        ft(x, a) && (w = Et(n, r, C, e.path, y, x, l, t, a))
      }
      w &&
        A.push({
          key: s,
          routeId: e.routeId,
          path: e.path,
          matches: w,
          match: x,
          request: C,
          controller: S,
        })
    }),
    { dsMatches: k, revalidatingFetchers: A }
  )
}
function ct(e) {
  return e.loader != null || (e.middleware != null && e.middleware.length > 0)
}
function lt(e, t, n) {
  if (e.lazy) return { shouldLoad: !0, renderFallback: !0 }
  if (!ct(e)) return { shouldLoad: !1, renderFallback: !1 }
  let r = t != null && e.id in t,
    i = n != null && n[e.id] !== void 0
  if (!r && i) return { shouldLoad: !1, renderFallback: !1 }
  if (typeof e.loader == `function` && e.loader.hydrate === !0)
    return { shouldLoad: !0, renderFallback: !r }
  let a = !r && !i
  return { shouldLoad: a, renderFallback: a }
}
function ut(e, t, n) {
  let r = !t || n.route.id !== t.route.id,
    i = !e.hasOwnProperty(n.route.id)
  return r || i
}
function dt(e, t) {
  let n = e.route.path
  return (
    e.pathname !== t.pathname || (n != null && n.endsWith(`*`) && e.params[`*`] !== t.params[`*`])
  )
}
function ft(e, t) {
  if (e.route.shouldRevalidate) {
    let n = e.route.shouldRevalidate(t)
    if (typeof n == `boolean`) return n
  }
  return t.defaultShouldRevalidate
}
function pt(e, t, n, r, i, a) {
  let o
  if (e) {
    let t = r[e]
    ;(C(t, `No route found to patch children into: routeId = ${e}`),
      (t.children ||= []),
      (o = t.children))
  } else o = n
  let s = [],
    c = []
  if (
    (t.forEach((e) => {
      let t = o.find((t) => mt(e, t))
      t ? c.push({ existingRoute: t, newRoute: e }) : s.push(e)
    }),
    s.length > 0)
  ) {
    let t = F(s, i, [e || `_`, `patch`, String(o?.length || `0`)], r)
    o.push(...t)
  }
  if (a && c.length > 0)
    for (let e = 0; e < c.length; e++) {
      let { existingRoute: t, newRoute: n } = c[e],
        r = t,
        [a] = F([n], i, [], {}, !0)
      Object.assign(r, {
        element: a.element ? a.element : r.element,
        errorElement: a.errorElement ? a.errorElement : r.errorElement,
        hydrateFallbackElement: a.hydrateFallbackElement
          ? a.hydrateFallbackElement
          : r.hydrateFallbackElement,
      })
    }
}
function mt(e, t) {
  return `id` in e && `id` in t && e.id === t.id
    ? !0
    : e.index === t.index && e.path === t.path && e.caseSensitive === t.caseSensitive
      ? (!e.children || e.children.length === 0) && (!t.children || t.children.length === 0)
        ? !0
        : (e.children?.every((e, n) => t.children?.some((t) => mt(e, t))) ?? !1)
      : !1
}
var ht = new WeakMap(),
  gt = ({ key: e, route: t, manifest: n, mapRouteProperties: r }) => {
    let i = n[t.id]
    if ((C(i, `No route found in manifest`), !i.lazy || typeof i.lazy != `object`)) return
    let a = i.lazy[e]
    if (!a) return
    let o = ht.get(i)
    o || ((o = {}), ht.set(i, o))
    let s = o[e]
    if (s) return s
    let c = (async () => {
      let t = P(e),
        n = i[e] !== void 0 && e !== `hasErrorBoundary`
      if (t)
        (w(
          !t,
          `Route property ` +
            e +
            ` is not a supported lazy route property. This property will be ignored.`,
        ),
          (o[e] = Promise.resolve()))
      else if (n)
        w(
          !1,
          `Route "${i.id}" has a static property "${e}" defined. The lazy property will be ignored.`,
        )
      else {
        let t = await a()
        t != null && (Object.assign(i, { [e]: t }), Object.assign(i, r(i)))
      }
      typeof i.lazy == `object` &&
        ((i.lazy[e] = void 0),
        Object.values(i.lazy).every((e) => e === void 0) && (i.lazy = void 0))
    })()
    return ((o[e] = c), c)
  },
  _t = new WeakMap()
function vt(e, t, n, r, i) {
  let a = n[e.id]
  if ((C(a, `No route found in manifest`), !e.lazy))
    return { lazyRoutePromise: void 0, lazyHandlerPromise: void 0 }
  if (typeof e.lazy == `function`) {
    let t = _t.get(a)
    if (t) return { lazyRoutePromise: t, lazyHandlerPromise: t }
    let n = (async () => {
      C(typeof e.lazy == `function`, `No lazy route function found`)
      let t = await e.lazy(),
        n = {}
      for (let e in t) {
        let r = t[e]
        if (r === void 0) continue
        let i = re(e),
          o = a[e] !== void 0 && e !== `hasErrorBoundary`
        i
          ? w(
              !i,
              `Route property ` +
                e +
                ` is not a supported property to be returned from a lazy route function. This property will be ignored.`,
            )
          : o
            ? w(
                !o,
                `Route "${a.id}" has a static property "${e}" defined but its lazy function is also returning a value for this property. The lazy route property "${e}" will be ignored.`,
              )
            : (n[e] = r)
      }
      ;(Object.assign(a, n), Object.assign(a, { ...r(a), lazy: void 0 }))
    })()
    return (_t.set(a, n), n.catch(() => {}), { lazyRoutePromise: n, lazyHandlerPromise: n })
  }
  let o = Object.keys(e.lazy),
    s = [],
    c
  for (let a of o) {
    if (i && i.includes(a)) continue
    let o = gt({ key: a, route: e, manifest: n, mapRouteProperties: r })
    o && (s.push(o), a === t && (c = o))
  }
  let l = s.length > 0 ? Promise.all(s).then(() => {}) : void 0
  return (l?.catch(() => {}), c?.catch(() => {}), { lazyRoutePromise: l, lazyHandlerPromise: c })
}
async function yt(e) {
  let t = e.matches.filter((e) => e.shouldLoad),
    n = {}
  return (
    (await Promise.all(t.map((e) => e.resolve()))).forEach((e, r) => {
      n[t[r].route.id] = e
    }),
    n
  )
}
async function bt(e) {
  return e.matches.some((e) => e.route.middleware) ? xt(e, () => yt(e)) : yt(e)
}
function xt(e, t) {
  return St(
    e,
    t,
    (e) => {
      if (tn(e)) throw e
      return e
    },
    Jt,
    n,
  )
  function n(t, n, r) {
    if (r) return Promise.resolve(Object.assign(r.value, { [n]: { type: `error`, result: t } }))
    {
      let { matches: r } = e,
        i = Ht(
          r,
          r[
            Math.min(
              Math.max(
                r.findIndex((e) => e.route.id === n),
                0,
              ),
              Math.max(
                r.findIndex((e) => e.shouldCallHandler()),
                0,
              ),
            )
          ].route.id,
        ).route.id
      return Promise.resolve({ [i]: { type: `error`, result: t } })
    }
  }
}
async function St(e, t, n, r, i) {
  let { matches: a, ...o } = e
  return await Ct(
    o,
    a.flatMap((e) => (e.route.middleware ? e.route.middleware.map((t) => [e.route.id, t]) : [])),
    t,
    n,
    r,
    i,
  )
}
async function Ct(e, t, n, r, i, a, o = 0) {
  let { request: s } = e
  if (s.signal.aborted) throw s.signal.reason ?? Error(`Request aborted: ${s.method} ${s.url}`)
  let c = t[o]
  if (!c) return await n()
  let [l, u] = c,
    d,
    f = async () => {
      if (d) throw Error('You may only call `next()` once per middleware')
      try {
        return ((d = { value: await Ct(e, t, n, r, i, a, o + 1) }), d.value)
      } catch (e) {
        return ((d = { value: await a(e, l, d) }), d.value)
      }
    }
  try {
    let t = await u(e, f),
      n = t == null ? void 0 : r(t)
    return i(n) ? n : d ? (n ?? d.value) : ((d = { value: await f() }), d.value)
  } catch (e) {
    return await a(e, l, d)
  }
}
function wt(e, t, n, r, i) {
  let a = gt({ key: `middleware`, route: r.route, manifest: t, mapRouteProperties: e }),
    o = vt(r.route, J(n.method) ? `action` : `loader`, t, e, i)
  return { middleware: a, route: o.lazyRoutePromise, handler: o.lazyHandlerPromise }
}
function Tt(e, t, n, r, i, a, o, s, c, l = null, u) {
  let d = !1,
    f = wt(e, t, n, a, o)
  return {
    ...a,
    _lazyPromises: f,
    shouldLoad: c,
    shouldRevalidateArgs: l,
    shouldCallHandler(e) {
      return (
        (d = !0),
        l
          ? typeof u == `boolean`
            ? ft(a, { ...l, defaultShouldRevalidate: u })
            : typeof e == `boolean`
              ? ft(a, { ...l, defaultShouldRevalidate: e })
              : ft(a, l)
          : c
      )
    },
    resolve(e) {
      let { lazy: t, loader: o, middleware: l } = a.route,
        u = d || c || (e && !J(n.method) && (t || o)),
        p = l && l.length > 0 && !o && !t
      return u && (J(n.method) || !p)
        ? Ot({
            request: n,
            path: r,
            unstable_pattern: i,
            match: a,
            lazyHandlerPromise: f?.handler,
            lazyRoutePromise: f?.route,
            handlerOverride: e,
            scopedContext: s,
          })
        : Promise.resolve({ type: `data`, result: void 0 })
    },
  }
}
function Et(e, t, n, r, i, a, o, s, c = null) {
  return i.map((l) =>
    l.route.id === a.route.id
      ? Tt(e, t, n, r, Fe(i), l, o, s, !0, c)
      : {
          ...l,
          shouldLoad: !1,
          shouldRevalidateArgs: c,
          shouldCallHandler: () => !1,
          _lazyPromises: wt(e, t, n, l, o),
          resolve: () => Promise.resolve({ type: `data`, result: void 0 }),
        },
  )
}
async function Dt(e, t, n, r, i, a, o) {
  r.some((e) => e._lazyPromises?.middleware) &&
    (await Promise.all(r.map((e) => e._lazyPromises?.middleware)))
  let s = {
      request: t,
      unstable_url: Ft(t, n),
      unstable_pattern: Fe(r),
      params: r[0].params,
      context: a,
      matches: r,
    },
    c = o
      ? () => {
          throw Error(
            'You cannot call `runClientMiddleware()` from a static handler `dataStrategy`. Middleware is run outside of `dataStrategy` during SSR in order to bubble up the Response.  You can enable middleware via the `respond` API in `query`/`queryRoute`',
          )
        }
      : (e) => {
          let t = s
          return xt(t, () =>
            e({
              ...t,
              fetcherKey: i,
              runClientMiddleware: () => {
                throw Error(
                  'Cannot call `runClientMiddleware()` from within an `runClientMiddleware` handler',
                )
              },
            }),
          )
        },
    l = await e({ ...s, fetcherKey: i, runClientMiddleware: c })
  try {
    await Promise.all(r.flatMap((e) => [e._lazyPromises?.handler, e._lazyPromises?.route]))
  } catch {}
  return l
}
async function Ot({
  request: e,
  path: t,
  unstable_pattern: n,
  match: r,
  lazyHandlerPromise: i,
  lazyRoutePromise: a,
  handlerOverride: o,
  scopedContext: s,
}) {
  let c,
    l,
    u = J(e.method),
    d = u ? `action` : `loader`,
    f = (i) => {
      let a,
        c = new Promise((e, t) => (a = t))
      ;((l = () => a()), e.signal.addEventListener(`abort`, l))
      let u = (a) =>
          typeof i == `function`
            ? i(
                {
                  request: e,
                  unstable_url: Ft(e, t),
                  unstable_pattern: n,
                  params: r.params,
                  context: s,
                },
                ...(a === void 0 ? [] : [a]),
              )
            : Promise.reject(
                Error(
                  `You cannot call the handler for a route which defines a boolean "${d}" [routeId: ${r.route.id}]`,
                ),
              ),
        f = (async () => {
          try {
            return { type: `data`, result: await (o ? o((e) => u(e)) : u()) }
          } catch (e) {
            return { type: `error`, result: e }
          }
        })()
      return Promise.race([f, c])
    }
  try {
    let t = u ? r.route.action : r.route.loader
    if (i || a)
      if (t) {
        let e,
          [n] = await Promise.all([
            f(t).catch((t) => {
              e = t
            }),
            i,
            a,
          ])
        if (e !== void 0) throw e
        c = n
      } else {
        await i
        let t = u ? r.route.action : r.route.loader
        if (t) [c] = await Promise.all([f(t), a])
        else if (d === `action`) {
          let t = new URL(e.url),
            n = t.pathname + t.search
          throw K(405, { method: e.method, pathname: n, routeId: r.route.id })
        } else return { type: `data`, result: void 0 }
      }
    else if (t) c = await f(t)
    else {
      let t = new URL(e.url)
      throw K(404, { pathname: t.pathname + t.search })
    }
  } catch (e) {
    return { type: `error`, result: e }
  } finally {
    l && e.signal.removeEventListener(`abort`, l)
  }
  return c
}
async function kt(e) {
  let t = e.headers.get(`Content-Type`)
  return t && /\bapplication\/json\b/.test(t) ? (e.body == null ? null : e.json()) : e.text()
}
async function At(e) {
  let { result: t, type: n } = e
  if ($t(t)) {
    let e
    try {
      e = await kt(t)
    } catch (e) {
      return { type: `error`, error: e }
    }
    return n === `error`
      ? {
          type: `error`,
          error: new Ne(t.status, t.statusText, e),
          statusCode: t.status,
          headers: t.headers,
        }
      : { type: `data`, data: e, statusCode: t.status, headers: t.headers }
  }
  return n === `error`
    ? Qt(t)
      ? t.data instanceof Error
        ? {
            type: `error`,
            error: t.data,
            statusCode: t.init?.status,
            headers: t.init?.headers ? new Headers(t.init.headers) : void 0,
          }
        : {
            type: `error`,
            error: qt(t),
            statusCode: Pe(t) ? t.status : void 0,
            headers: t.init?.headers ? new Headers(t.init.headers) : void 0,
          }
      : { type: `error`, error: t, statusCode: Pe(t) ? t.status : void 0 }
    : Qt(t)
      ? {
          type: `data`,
          data: t.data,
          statusCode: t.init?.status,
          headers: t.init?.headers ? new Headers(t.init.headers) : void 0,
        }
      : { type: `data`, data: t }
}
function jt(e, t, n, r, i) {
  let a = e.headers.get(`Location`)
  if (
    (C(a, `Redirects returned/thrown from loaders/actions must have a Location header`), !Ce(a))
  ) {
    let o = r.slice(0, r.findIndex((e) => e.route.id === n) + 1)
    ;((a = at(new URL(t.url), o, i, a)), e.headers.set(`Location`, a))
  }
  return e
}
var Mt = [
  `about:`,
  `blob:`,
  `chrome:`,
  `chrome-untrusted:`,
  `content:`,
  `data:`,
  `devtools:`,
  `file:`,
  `filesystem:`,
  `javascript:`,
]
function Nt(e, t, n, r) {
  if (Ce(e)) {
    let r = e,
      i = r.startsWith(`//`) ? new URL(t.protocol + r) : new URL(r)
    if (Mt.includes(i.protocol)) throw Error(`Invalid redirect location`)
    let a = B(i.pathname, n) != null
    if (i.origin === t.origin && a) return i.pathname + i.search + i.hash
  }
  try {
    let t = r.createURL(e)
    if (Mt.includes(t.protocol)) throw Error(`Invalid redirect location`)
  } catch {}
  return e
}
function Pt(e, t, n, r) {
  let i = e.createURL(Gt(t)).toString(),
    a = { signal: n }
  if (r && J(r.formMethod)) {
    let { formMethod: e, formEncType: t } = r
    ;((a.method = e.toUpperCase()),
      t === `application/json`
        ? ((a.headers = new Headers({ 'Content-Type': t })), (a.body = JSON.stringify(r.json)))
        : t === `text/plain`
          ? (a.body = r.text)
          : t === `application/x-www-form-urlencoded` && r.formData
            ? (a.body = It(r.formData))
            : (a.body = r.formData))
  }
  return new Request(i, a)
}
function Ft(e, t) {
  let n = new URL(e.url),
    r = typeof t == `string` ? k(t) : t
  if (((n.pathname = r.pathname || `/`), r.search)) {
    let e = new URLSearchParams(r.search),
      t = e.getAll(`index`)
    e.delete(`index`)
    for (let n of t.filter(Boolean)) e.append(`index`, n)
    n.search = e.size ? `?${e.toString()}` : ``
  } else n.search = ``
  return ((n.hash = r.hash || ``), n)
}
function It(e) {
  let t = new URLSearchParams()
  for (let [n, r] of e.entries()) t.append(n, typeof r == `string` ? r : r.name)
  return t
}
function Lt(e) {
  let t = new FormData()
  for (let [n, r] of e.entries()) t.append(n, r)
  return t
}
function Rt(e, t, n, r = !1, i = !1) {
  let a = {},
    o = null,
    s,
    c = !1,
    l = {},
    u = n && q(n[1]) ? n[1].error : void 0
  return (
    e.forEach((n) => {
      if (!(n.route.id in t)) return
      let d = n.route.id,
        f = t[d]
      if ((C(!Zt(f), `Cannot handle redirect results in processLoaderData`), q(f))) {
        let t = f.error
        if ((u !== void 0 && ((t = u), (u = void 0)), (o ||= {}), i)) o[d] = t
        else {
          let n = Ht(e, d)
          o[n.route.id] ?? (o[n.route.id] = t)
        }
        ;(r || (a[d] = nt),
          c || ((c = !0), (s = Pe(f.error) ? f.error.status : 500)),
          f.headers && (l[d] = f.headers))
      } else
        ((a[d] = f.data),
          f.statusCode && f.statusCode !== 200 && !c && (s = f.statusCode),
          f.headers && (l[d] = f.headers))
    }),
    u !== void 0 && n && ((o = { [n[0]]: u }), n[2] && (a[n[2]] = void 0)),
    { loaderData: a, errors: o, statusCode: s || 200, loaderHeaders: l }
  )
}
function zt(e, t, n, r, i, a) {
  let { loaderData: o, errors: s } = Rt(t, n, r)
  return (
    i
      .filter((e) => !e.matches || e.matches.some((e) => e.shouldLoad))
      .forEach((t) => {
        let { key: n, match: r, controller: i } = t
        if (i && i.signal.aborted) return
        let o = a[n]
        if ((C(o, `Did not find corresponding fetcher result`), q(o))) {
          let t = Ht(e.matches, r?.route.id)
          ;((s && s[t.route.id]) || (s = { ...s, [t.route.id]: o.error }), e.fetchers.delete(n))
        } else if (Zt(o)) C(!1, `Unhandled fetcher revalidation redirect`)
        else {
          let t = dn(o.data)
          e.fetchers.set(n, t)
        }
      }),
    { loaderData: o, errors: s }
  )
}
function Bt(e, t, n, r) {
  let i = Object.entries(t)
    .filter(([, e]) => e !== nt)
    .reduce((e, [t, n]) => ((e[t] = n), e), {})
  for (let a of n) {
    let n = a.route.id
    if (
      (!t.hasOwnProperty(n) && e.hasOwnProperty(n) && a.route.loader && (i[n] = e[n]),
      r && r.hasOwnProperty(n))
    )
      break
  }
  return i
}
function Vt(e) {
  return e ? (q(e[1]) ? { actionData: {} } : { actionData: { [e[0]]: e[1].data } }) : {}
}
function Ht(e, t) {
  return (
    (t ? e.slice(0, e.findIndex((e) => e.route.id === t) + 1) : [...e])
      .reverse()
      .find((e) => e.route.hasErrorBoundary === !0) || e[0]
  )
}
function Ut(e) {
  let t =
    e.length === 1
      ? e[0]
      : e.find((e) => e.index || !e.path || e.path === `/`) || { id: `__shim-error-route__` }
  return { matches: [{ params: {}, pathname: ``, pathnameBase: ``, route: t }], route: t }
}
function K(e, { pathname: t, routeId: n, method: r, type: i, message: a } = {}) {
  let o = `Unknown Server Error`,
    s = `Unknown @remix-run/router error`
  return (
    e === 400
      ? ((o = `Bad Request`),
        r && t && n
          ? (s = `You made a ${r} request to "${t}" but did not provide a \`loader\` for route "${n}", so there is no way to handle the request.`)
          : i === `invalid-body` && (s = `Unable to encode submission body`))
      : e === 403
        ? ((o = `Forbidden`), (s = `Route "${n}" does not match URL "${t}"`))
        : e === 404
          ? ((o = `Not Found`), (s = `No route matches URL "${t}"`))
          : e === 405 &&
            ((o = `Method Not Allowed`),
            r && t && n
              ? (s = `You made a ${r.toUpperCase()} request to "${t}" but did not provide an \`action\` for route "${n}", so there is no way to handle the request.`)
              : r && (s = `Invalid request method "${r.toUpperCase()}"`)),
    new Ne(e || 500, o, Error(s), !0)
  )
}
function Wt(e) {
  let t = Object.entries(e)
  for (let e = t.length - 1; e >= 0; e--) {
    let [n, r] = t[e]
    if (Zt(r)) return { key: n, result: r }
  }
}
function Gt(e) {
  return O({ ...(typeof e == `string` ? k(e) : e), hash: `` })
}
function Kt(e, t) {
  return e.pathname !== t.pathname || e.search !== t.search
    ? !1
    : e.hash === ``
      ? t.hash !== ``
      : e.hash === t.hash
        ? !0
        : t.hash !== ``
}
function qt(e) {
  return new Ne(e.init?.status ?? 500, e.init?.statusText ?? `Internal Server Error`, e.data)
}
function Jt(e) {
  return (
    typeof e == `object` &&
    !!e &&
    Object.entries(e).every(([e, t]) => typeof e == `string` && Yt(t))
  )
}
function Yt(e) {
  return (
    typeof e == `object` &&
    !!e &&
    `type` in e &&
    `result` in e &&
    (e.type === `data` || e.type === `error`)
  )
}
function Xt(e) {
  return $t(e.result) && Ye.has(e.result.status)
}
function q(e) {
  return e.type === `error`
}
function Zt(e) {
  return (e && e.type) === `redirect`
}
function Qt(e) {
  return (
    typeof e == `object` &&
    !!e &&
    `type` in e &&
    `data` in e &&
    `init` in e &&
    e.type === `DataWithResponseInit`
  )
}
function $t(e) {
  return (
    e != null &&
    typeof e.status == `number` &&
    typeof e.statusText == `string` &&
    typeof e.headers == `object` &&
    e.body !== void 0
  )
}
function en(e) {
  return Ye.has(e)
}
function tn(e) {
  return $t(e) && en(e.status) && e.headers.has(`Location`)
}
function nn(e) {
  return Je.has(e.toUpperCase())
}
function J(e) {
  return Ke.has(e.toUpperCase())
}
function rn(e) {
  return new URLSearchParams(e).getAll(`index`).some((e) => e === ``)
}
function an(e, t) {
  let n = typeof t == `string` ? k(t).search : t.search
  if (e[e.length - 1].route.index && rn(n || ``)) return e[e.length - 1]
  let r = De(e)
  return r[r.length - 1]
}
function on(e) {
  let { formMethod: t, formAction: n, formEncType: r, text: i, formData: a, json: o } = e
  if (!(!t || !n || !r)) {
    if (i != null)
      return {
        formMethod: t,
        formAction: n,
        formEncType: r,
        formData: void 0,
        json: void 0,
        text: i,
      }
    if (a != null)
      return {
        formMethod: t,
        formAction: n,
        formEncType: r,
        formData: a,
        json: void 0,
        text: void 0,
      }
    if (o !== void 0)
      return {
        formMethod: t,
        formAction: n,
        formEncType: r,
        formData: void 0,
        json: o,
        text: void 0,
      }
  }
}
function sn(e, t) {
  return t
    ? {
        state: `loading`,
        location: e,
        formMethod: t.formMethod,
        formAction: t.formAction,
        formEncType: t.formEncType,
        formData: t.formData,
        json: t.json,
        text: t.text,
      }
    : {
        state: `loading`,
        location: e,
        formMethod: void 0,
        formAction: void 0,
        formEncType: void 0,
        formData: void 0,
        json: void 0,
        text: void 0,
      }
}
function cn(e, t) {
  return {
    state: `submitting`,
    location: e,
    formMethod: t.formMethod,
    formAction: t.formAction,
    formEncType: t.formEncType,
    formData: t.formData,
    json: t.json,
    text: t.text,
  }
}
function ln(e, t) {
  return e
    ? {
        state: `loading`,
        formMethod: e.formMethod,
        formAction: e.formAction,
        formEncType: e.formEncType,
        formData: e.formData,
        json: e.json,
        text: e.text,
        data: t,
      }
    : {
        state: `loading`,
        formMethod: void 0,
        formAction: void 0,
        formEncType: void 0,
        formData: void 0,
        json: void 0,
        text: void 0,
        data: t,
      }
}
function un(e, t) {
  return {
    state: `submitting`,
    formMethod: e.formMethod,
    formAction: e.formAction,
    formEncType: e.formEncType,
    formData: e.formData,
    json: e.json,
    text: e.text,
    data: t ? t.data : void 0,
  }
}
function dn(e) {
  return {
    state: `idle`,
    formMethod: void 0,
    formAction: void 0,
    formEncType: void 0,
    formData: void 0,
    json: void 0,
    text: void 0,
    data: e,
  }
}
function fn(e, t) {
  try {
    let n = e.sessionStorage.getItem(tt)
    if (n) {
      let e = JSON.parse(n)
      for (let [n, r] of Object.entries(e || {}))
        r && Array.isArray(r) && t.set(n, new Set(r || []))
    }
  } catch {}
}
function pn(e, t) {
  if (t.size > 0) {
    let n = {}
    for (let [e, r] of t) n[e] = [...r]
    try {
      e.sessionStorage.setItem(tt, JSON.stringify(n))
    } catch (e) {
      w(!1, `Failed to save applied view transitions in sessionStorage (${e}).`)
    }
  }
}
function mn() {
  let e,
    t,
    n = new Promise((r, i) => {
      ;((e = async (e) => {
        r(e)
        try {
          await n
        } catch {}
      }),
        (t = async (e) => {
          i(e)
          try {
            await n
          } catch {}
        }))
    })
  return { promise: n, resolve: e, reject: t }
}
var hn = h.createContext(null)
hn.displayName = `DataRouter`
var gn = h.createContext(null)
gn.displayName = `DataRouterState`
var _n = h.createContext(!1)
function vn() {
  return h.useContext(_n)
}
var yn = h.createContext({ isTransitioning: !1 })
yn.displayName = `ViewTransition`
var bn = h.createContext(new Map())
bn.displayName = `Fetchers`
var xn = h.createContext(null)
xn.displayName = `Await`
var Y = h.createContext(null)
Y.displayName = `Navigation`
var Sn = h.createContext(null)
Sn.displayName = `Location`
var X = h.createContext({ outlet: null, matches: [], isDataRoute: !1 })
X.displayName = `Route`
var Cn = h.createContext(null)
Cn.displayName = `RouteError`
var wn = `REACT_ROUTER_ERROR`,
  Tn = `REDIRECT`,
  En = `ROUTE_ERROR_RESPONSE`
function Dn(e) {
  if (e.startsWith(`${wn}:${Tn}:{`))
    try {
      let t = JSON.parse(e.slice(28))
      if (
        typeof t == `object` &&
        t &&
        typeof t.status == `number` &&
        typeof t.statusText == `string` &&
        typeof t.location == `string` &&
        typeof t.reloadDocument == `boolean` &&
        typeof t.replace == `boolean`
      )
        return t
    } catch {}
}
function On(e) {
  if (e.startsWith(`${wn}:${En}:{`))
    try {
      let t = JSON.parse(e.slice(40))
      if (
        typeof t == `object` &&
        t &&
        typeof t.status == `number` &&
        typeof t.statusText == `string`
      )
        return new Ne(t.status, t.statusText, t.data)
    } catch {}
}
function kn(e, { relative: t } = {}) {
  C(An(), `useHref() may be used only in the context of a <Router> component.`)
  let { basename: n, navigator: r } = h.useContext(Y),
    { hash: i, pathname: a, search: o } = Rn(e, { relative: t }),
    s = a
  return (
    n !== `/` && (s = a === `/` ? n : V([n, a])), r.createHref({ pathname: s, search: o, hash: i })
  )
}
function An() {
  return h.useContext(Sn) != null
}
function Z() {
  return (
    C(An(), `useLocation() may be used only in the context of a <Router> component.`),
    h.useContext(Sn).location
  )
}
var jn = `You should call navigate() in a React.useEffect(), not when your component is first rendered.`
function Mn(e) {
  h.useContext(Y).static || h.useLayoutEffect(e)
}
function Nn() {
  let { isDataRoute: e } = h.useContext(X)
  return e ? ir() : Pn()
}
function Pn() {
  C(An(), `useNavigate() may be used only in the context of a <Router> component.`)
  let e = h.useContext(hn),
    { basename: t, navigator: n } = h.useContext(Y),
    { matches: r } = h.useContext(X),
    { pathname: i } = Z(),
    a = JSON.stringify(Oe(r)),
    o = h.useRef(!1)
  return (
    Mn(() => {
      o.current = !0
    }),
    h.useCallback(
      (r, s = {}) => {
        if ((w(o.current, jn), !o.current)) return
        if (typeof r == `number`) {
          n.go(r)
          return
        }
        let c = ke(r, JSON.parse(a), i, s.relative === `path`)
        ;(e == null && t !== `/` && (c.pathname = c.pathname === `/` ? t : V([t, c.pathname])),
          (s.replace ? n.replace : n.push)(c, s.state, s))
      },
      [t, n, a, i, e],
    )
  )
}
var Fn = h.createContext(null)
function In() {
  return h.useContext(Fn)
}
function Ln(e) {
  let t = h.useContext(X).outlet
  return h.useMemo(() => t && h.createElement(Fn.Provider, { value: e }, t), [t, e])
}
function Rn(e, { relative: t } = {}) {
  let { matches: n } = h.useContext(X),
    { pathname: r } = Z(),
    i = JSON.stringify(Oe(n))
  return h.useMemo(() => ke(e, JSON.parse(i), r, t === `path`), [e, i, r, t])
}
function zn(e, t, n) {
  C(An(), `useRoutes() may be used only in the context of a <Router> component.`)
  let { navigator: r } = h.useContext(Y),
    { matches: i } = h.useContext(X),
    a = i[i.length - 1],
    o = a ? a.params : {},
    s = a ? a.pathname : `/`,
    c = a ? a.pathnameBase : `/`,
    l = a && a.route
  {
    let e = (l && l.path) || ``
    or(
      s,
      !l || e.endsWith(`*`) || e.endsWith(`*?`),
      `You rendered descendant <Routes> (or called \`useRoutes()\`) at "${s}" (under <Route path="${e}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${e}"> to <Route path="${e === `/` ? `*` : `${e}/*`}">.`,
    )
  }
  let u = Z(),
    d
  if (t) {
    let e = typeof t == `string` ? k(t) : t
    ;(C(
      c === `/` || e.pathname?.startsWith(c),
      `When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${c}" but pathname "${e.pathname}" was given in the \`location\` prop.`,
    ),
      (d = e))
  } else d = u
  let f = d.pathname || `/`,
    p = f
  if (c !== `/`) {
    let e = c.replace(/^\//, ``).split(`/`)
    p = `/` + f.replace(/^\//, ``).split(`/`).slice(e.length).join(`/`)
  }
  let m = oe(e, { pathname: p })
  ;(w(l || m != null, `No routes matched location "${d.pathname}${d.search}${d.hash}" `),
    w(
      m == null ||
        m[m.length - 1].route.element !== void 0 ||
        m[m.length - 1].route.Component !== void 0 ||
        m[m.length - 1].route.lazy !== void 0,
      `Matched leaf route at location "${d.pathname}${d.search}${d.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`,
    ))
  let g = Kn(
    m &&
      m.map((e) =>
        Object.assign({}, e, {
          params: Object.assign({}, o, e.params),
          pathname: V([
            c,
            r.encodeLocation
              ? r.encodeLocation(
                  e.pathname.replace(/%/g, `%25`).replace(/\?/g, `%3F`).replace(/#/g, `%23`),
                ).pathname
              : e.pathname,
          ]),
          pathnameBase:
            e.pathnameBase === `/`
              ? c
              : V([
                  c,
                  r.encodeLocation
                    ? r.encodeLocation(
                        e.pathnameBase
                          .replace(/%/g, `%25`)
                          .replace(/\?/g, `%3F`)
                          .replace(/#/g, `%23`),
                      ).pathname
                    : e.pathnameBase,
                ]),
        }),
      ),
    i,
    n,
  )
  return t && g
    ? h.createElement(
        Sn.Provider,
        {
          value: {
            location: {
              pathname: `/`,
              search: ``,
              hash: ``,
              state: null,
              key: `default`,
              unstable_mask: void 0,
              ...d,
            },
            navigationType: `POP`,
          },
        },
        g,
      )
    : g
}
function Bn() {
  let e = tr(),
    t = Pe(e) ? `${e.status} ${e.statusText}` : e instanceof Error ? e.message : JSON.stringify(e),
    n = e instanceof Error ? e.stack : null,
    r = `rgba(200,200,200, 0.5)`,
    i = { padding: `0.5rem`, backgroundColor: r },
    a = { padding: `2px 4px`, backgroundColor: r },
    o = null
  return (
    console.error(`Error handled by React Router default ErrorBoundary:`, e),
    (o = h.createElement(
      h.Fragment,
      null,
      h.createElement(`p`, null, `💿 Hey developer 👋`),
      h.createElement(
        `p`,
        null,
        `You can provide a way better UX than this when your app throws errors by providing your own `,
        h.createElement(`code`, { style: a }, `ErrorBoundary`),
        ` or`,
        ` `,
        h.createElement(`code`, { style: a }, `errorElement`),
        ` prop on your route.`,
      ),
    )),
    h.createElement(
      h.Fragment,
      null,
      h.createElement(`h2`, null, `Unexpected Application Error!`),
      h.createElement(`h3`, { style: { fontStyle: `italic` } }, t),
      n ? h.createElement(`pre`, { style: i }, n) : null,
      o,
    )
  )
}
var Vn = h.createElement(Bn, null),
  Hn = class extends h.Component {
    constructor(e) {
      ;(super(e),
        (this.state = { location: e.location, revalidation: e.revalidation, error: e.error }))
    }
    static getDerivedStateFromError(e) {
      return { error: e }
    }
    static getDerivedStateFromProps(e, t) {
      return t.location !== e.location || (t.revalidation !== `idle` && e.revalidation === `idle`)
        ? { error: e.error, location: e.location, revalidation: e.revalidation }
        : {
            error: e.error === void 0 ? t.error : e.error,
            location: t.location,
            revalidation: e.revalidation || t.revalidation,
          }
    }
    componentDidCatch(e, t) {
      this.props.onError
        ? this.props.onError(e, t)
        : console.error(`React Router caught the following error during render`, e)
    }
    render() {
      let e = this.state.error
      if (
        this.context &&
        typeof e == `object` &&
        e &&
        `digest` in e &&
        typeof e.digest == `string`
      ) {
        let t = On(e.digest)
        t && (e = t)
      }
      let t =
        e === void 0
          ? this.props.children
          : h.createElement(
              X.Provider,
              { value: this.props.routeContext },
              h.createElement(Cn.Provider, { value: e, children: this.props.component }),
            )
      return this.context ? h.createElement(Wn, { error: e }, t) : t
    }
  }
Hn.contextType = _n
var Un = new WeakMap()
function Wn({ children: e, error: t }) {
  let { basename: n } = h.useContext(Y)
  if (typeof t == `object` && t && `digest` in t && typeof t.digest == `string`) {
    let e = Dn(t.digest)
    if (e) {
      let r = Un.get(t)
      if (r) throw r
      let i = U(e.location, n)
      if (H && !Un.get(t))
        if (i.isExternal || e.reloadDocument) window.location.href = i.absoluteURL || i.to
        else {
          let n = Promise.resolve().then(() =>
            window.__reactRouterDataRouter.navigate(i.to, { replace: e.replace }),
          )
          throw (Un.set(t, n), n)
        }
      return h.createElement(`meta`, {
        httpEquiv: `refresh`,
        content: `0;url=${i.absoluteURL || i.to}`,
      })
    }
  }
  return e
}
function Gn({ routeContext: e, match: t, children: n }) {
  let r = h.useContext(hn)
  return (
    r &&
      r.static &&
      r.staticContext &&
      (t.route.errorElement || t.route.ErrorBoundary) &&
      (r.staticContext._deepestRenderedBoundaryId = t.route.id),
    h.createElement(X.Provider, { value: e }, n)
  )
}
function Kn(e, t = [], n) {
  let r = n?.state
  if (e == null) {
    if (!r) return null
    if (r.errors) e = r.matches
    else if (t.length === 0 && !r.initialized && r.matches.length > 0) e = r.matches
    else return null
  }
  let i = e,
    a = r?.errors
  if (a != null) {
    let e = i.findIndex((e) => e.route.id && a?.[e.route.id] !== void 0)
    ;(C(
      e >= 0,
      `Could not find a matching route for errors on route IDs: ${Object.keys(a).join(`,`)}`,
    ),
      (i = i.slice(0, Math.min(i.length, e + 1))))
  }
  let o = !1,
    s = -1
  if (n && r) {
    o = r.renderFallback
    for (let e = 0; e < i.length; e++) {
      let t = i[e]
      if (((t.route.HydrateFallback || t.route.hydrateFallbackElement) && (s = e), t.route.id)) {
        let { loaderData: e, errors: a } = r,
          c = t.route.loader && !e.hasOwnProperty(t.route.id) && (!a || a[t.route.id] === void 0)
        if (t.route.lazy || c) {
          ;(n.isStatic && (o = !0), (i = s >= 0 ? i.slice(0, s + 1) : [i[0]]))
          break
        }
      }
    }
  }
  let c = n?.onError,
    l =
      r && c
        ? (e, t) => {
            c(e, {
              location: r.location,
              params: r.matches?.[0]?.params ?? {},
              unstable_pattern: Fe(r.matches),
              errorInfo: t,
            })
          }
        : void 0
  return i.reduceRight((e, n, c) => {
    let u,
      d = !1,
      f = null,
      p = null
    r &&
      ((u = a && n.route.id ? a[n.route.id] : void 0),
      (f = n.route.errorElement || Vn),
      o &&
        (s < 0 && c === 0
          ? (or(
              `route-fallback`,
              !1,
              'No `HydrateFallback` element provided to render during initial hydration',
            ),
            (d = !0),
            (p = null))
          : s === c && ((d = !0), (p = n.route.hydrateFallbackElement || null))))
    let m = t.concat(i.slice(0, c + 1)),
      g = () => {
        let t
        return (
          (t = u
            ? f
            : d
              ? p
              : n.route.Component
                ? h.createElement(n.route.Component, null)
                : n.route.element
                  ? n.route.element
                  : e),
          h.createElement(Gn, {
            match: n,
            routeContext: { outlet: e, matches: m, isDataRoute: r != null },
            children: t,
          })
        )
      }
    return r && (n.route.ErrorBoundary || n.route.errorElement || c === 0)
      ? h.createElement(Hn, {
          location: r.location,
          revalidation: r.revalidation,
          component: f,
          error: u,
          children: g(),
          routeContext: { outlet: null, matches: m, isDataRoute: !0 },
          onError: l,
        })
      : g()
  }, null)
}
function qn(e) {
  return `${e} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`
}
function Jn(e) {
  let t = h.useContext(hn)
  return (C(t, qn(e)), t)
}
function Yn(e) {
  let t = h.useContext(gn)
  return (C(t, qn(e)), t)
}
function Xn(e) {
  let t = h.useContext(X)
  return (C(t, qn(e)), t)
}
function Zn(e) {
  let t = Xn(e),
    n = t.matches[t.matches.length - 1]
  return (C(n.route.id, `${e} can only be used on routes that contain a unique "id"`), n.route.id)
}
function Qn() {
  return Zn(`useRouteId`)
}
function $n() {
  return Yn(`useNavigation`).navigation
}
function er() {
  let { matches: e, loaderData: t } = Yn(`useMatches`)
  return h.useMemo(() => e.map((e) => ce(e, t)), [e, t])
}
function tr() {
  let e = h.useContext(Cn),
    t = Yn(`useRouteError`),
    n = Zn(`useRouteError`)
  return e === void 0 ? t.errors?.[n] : e
}
var nr = 0
function rr(e) {
  let { router: t, basename: n } = Jn(`useBlocker`),
    r = Yn(`useBlocker`),
    [i, a] = h.useState(``),
    o = h.useCallback(
      (t) => {
        if (typeof e != `function`) return !!e
        if (n === `/`) return e(t)
        let { currentLocation: r, nextLocation: i, historyAction: a } = t
        return e({
          currentLocation: { ...r, pathname: B(r.pathname, n) || r.pathname },
          nextLocation: { ...i, pathname: B(i.pathname, n) || i.pathname },
          historyAction: a,
        })
      },
      [n, e],
    )
  return (
    h.useEffect(() => {
      let e = String(++nr)
      return (a(e), () => t.deleteBlocker(e))
    }, [t]),
    h.useEffect(() => {
      i !== `` && t.getBlocker(i, o)
    }, [t, i, o]),
    i && r.blockers.has(i) ? r.blockers.get(i) : $e
  )
}
function ir() {
  let { router: e } = Jn(`useNavigate`),
    t = Zn(`useNavigate`),
    n = h.useRef(!1)
  return (
    Mn(() => {
      n.current = !0
    }),
    h.useCallback(
      async (r, i = {}) => {
        ;(w(n.current, jn),
          n.current &&
            (typeof r == `number`
              ? await e.navigate(r)
              : await e.navigate(r, { fromRouteId: t, ...i })))
      },
      [e, t],
    )
  )
}
var ar = {}
function or(e, t, n) {
  !t && !ar[e] && ((ar[e] = !0), w(!1, n))
}
var sr = {}
function cr(e, t) {
  !e && !sr[t] && ((sr[t] = !0), console.warn(t))
}
var lr = h.useOptimistic,
  ur = () => void 0
function dr(e) {
  return lr ? lr(e) : [e, ur]
}
function fr(e) {
  let t = {
    hasErrorBoundary: e.hasErrorBoundary || e.ErrorBoundary != null || e.errorElement != null,
  }
  return (
    e.Component &&
      (e.element &&
        w(
          !1,
          'You should not include both `Component` and `element` on your route - `Component` will be used.',
        ),
      Object.assign(t, { element: h.createElement(e.Component), Component: void 0 })),
    e.HydrateFallback &&
      (e.hydrateFallbackElement &&
        w(
          !1,
          'You should not include both `HydrateFallback` and `hydrateFallbackElement` on your route - `HydrateFallback` will be used.',
        ),
      Object.assign(t, {
        hydrateFallbackElement: h.createElement(e.HydrateFallback),
        HydrateFallback: void 0,
      })),
    e.ErrorBoundary &&
      (e.errorElement &&
        w(
          !1,
          'You should not include both `ErrorBoundary` and `errorElement` on your route - `ErrorBoundary` will be used.',
        ),
      Object.assign(t, { errorElement: h.createElement(e.ErrorBoundary), ErrorBoundary: void 0 })),
    t
  )
}
var pr = [`HydrateFallback`, `hydrateFallbackElement`],
  mr = class {
    constructor() {
      ;((this.status = `pending`),
        (this.promise = new Promise((e, t) => {
          ;((this.resolve = (t) => {
            this.status === `pending` && ((this.status = `resolved`), e(t))
          }),
            (this.reject = (e) => {
              this.status === `pending` && ((this.status = `rejected`), t(e))
            }))
        })))
    }
  }
function hr({ router: e, flushSync: t, onError: n, unstable_useTransitions: r }) {
  r = vn() || r
  let [i, a] = h.useState(e.state),
    [o, s] = dr(i),
    [c, l] = h.useState(),
    [u, d] = h.useState({ isTransitioning: !1 }),
    [f, p] = h.useState(),
    [m, g] = h.useState(),
    [_, v] = h.useState(),
    y = h.useRef(new Map()),
    b = h.useCallback(
      (i, { deletedFetchers: o, newErrors: c, flushSync: u, viewTransitionOpts: _ }) => {
        ;(c &&
          n &&
          Object.values(c).forEach((e) =>
            n(e, {
              location: i.location,
              params: i.matches[0]?.params ?? {},
              unstable_pattern: Fe(i.matches),
            }),
          ),
          i.fetchers.forEach((e, t) => {
            e.data !== void 0 && y.current.set(t, e.data)
          }),
          o.forEach((e) => y.current.delete(e)),
          cr(
            u === !1 || t != null,
            'You provided the `flushSync` option to a router update, but you are not using the `<RouterProvider>` from `react-router/dom` so `ReactDOM.flushSync()` is unavailable.  Please update your app to `import { RouterProvider } from "react-router/dom"` and ensure you have `react-dom` installed as a dependency to use the `flushSync` option.',
          ))
        let b =
          e.window != null &&
          e.window.document != null &&
          typeof e.window.document.startViewTransition == `function`
        if (
          (cr(
            _ == null || b,
            'You provided the `viewTransition` option to a router update, but you do not appear to be running in a DOM environment as `window.startViewTransition` is not available.',
          ),
          !_ || !b)
        ) {
          t && u
            ? t(() => a(i))
            : r === !1
              ? a(i)
              : h.startTransition(() => {
                  ;(r === !0 && s((e) => gr(e, i)), a(i))
                })
          return
        }
        if (t && u) {
          t(() => {
            ;(m && (f?.resolve(), m.skipTransition()),
              d({
                isTransitioning: !0,
                flushSync: !0,
                currentLocation: _.currentLocation,
                nextLocation: _.nextLocation,
              }))
          })
          let n = e.window.document.startViewTransition(() => {
            t(() => a(i))
          })
          ;(n.finished.finally(() => {
            t(() => {
              ;(p(void 0), g(void 0), l(void 0), d({ isTransitioning: !1 }))
            })
          }),
            t(() => g(n)))
          return
        }
        m
          ? (f?.resolve(),
            m.skipTransition(),
            v({ state: i, currentLocation: _.currentLocation, nextLocation: _.nextLocation }))
          : (l(i),
            d({
              isTransitioning: !0,
              flushSync: !1,
              currentLocation: _.currentLocation,
              nextLocation: _.nextLocation,
            }))
      },
      [e.window, t, m, f, r, s, n],
    )
  ;(h.useLayoutEffect(() => e.subscribe(b), [e, b]),
    h.useEffect(() => {
      u.isTransitioning && !u.flushSync && p(new mr())
    }, [u]),
    h.useEffect(() => {
      if (f && c && e.window) {
        let t = c,
          n = f.promise,
          i = e.window.document.startViewTransition(async () => {
            ;(r === !1
              ? a(t)
              : h.startTransition(() => {
                  ;(r === !0 && s((e) => gr(e, t)), a(t))
                }),
              await n)
          })
        ;(i.finished.finally(() => {
          ;(p(void 0), g(void 0), l(void 0), d({ isTransitioning: !1 }))
        }),
          g(i))
      }
    }, [c, f, e.window, r, s]),
    h.useEffect(() => {
      f && c && o.location.key === c.location.key && f.resolve()
    }, [f, m, o.location, c]),
    h.useEffect(() => {
      !u.isTransitioning &&
        _ &&
        (l(_.state),
        d({
          isTransitioning: !0,
          flushSync: !1,
          currentLocation: _.currentLocation,
          nextLocation: _.nextLocation,
        }),
        v(void 0))
    }, [u.isTransitioning, _]))
  let x = h.useMemo(
      () => ({
        createHref: e.createHref,
        encodeLocation: e.encodeLocation,
        go: (t) => e.navigate(t),
        push: (t, n, r) => e.navigate(t, { state: n, preventScrollReset: r?.preventScrollReset }),
        replace: (t, n, r) =>
          e.navigate(t, { replace: !0, state: n, preventScrollReset: r?.preventScrollReset }),
      }),
      [e],
    ),
    S = e.basename || `/`,
    C = h.useMemo(
      () => ({ router: e, navigator: x, static: !1, basename: S, onError: n }),
      [e, x, S, n],
    )
  return h.createElement(
    h.Fragment,
    null,
    h.createElement(
      hn.Provider,
      { value: C },
      h.createElement(
        gn.Provider,
        { value: o },
        h.createElement(
          bn.Provider,
          { value: y.current },
          h.createElement(
            yn.Provider,
            { value: u },
            h.createElement(
              xr,
              {
                basename: S,
                location: o.location,
                navigationType: o.historyAction,
                navigator: x,
                unstable_useTransitions: r,
              },
              h.createElement(_r, {
                routes: e.routes,
                future: e.future,
                state: o,
                isStatic: !1,
                onError: n,
              }),
            ),
          ),
        ),
      ),
    ),
    null,
  )
}
function gr(e, t) {
  return {
    ...e,
    navigation: t.navigation.state === `idle` ? e.navigation : t.navigation,
    revalidation: t.revalidation === `idle` ? e.revalidation : t.revalidation,
    actionData: t.navigation.state === `submitting` ? e.actionData : t.actionData,
    fetchers: t.fetchers,
  }
}
var _r = h.memo(vr)
function vr({ routes: e, future: t, state: n, isStatic: r, onError: i }) {
  return zn(e, void 0, { state: n, isStatic: r, onError: i, future: t })
}
function yr({ to: e, replace: t, state: n, relative: r }) {
  C(An(), `<Navigate> may be used only in the context of a <Router> component.`)
  let { static: i } = h.useContext(Y)
  w(
    !i,
    `<Navigate> must not be used on the initial render in a <StaticRouter>. This is a no-op, but you should modify your code so the <Navigate> is only ever rendered in response to some user interaction or state change.`,
  )
  let { matches: a } = h.useContext(X),
    { pathname: o } = Z(),
    s = Nn(),
    c = ke(e, Oe(a), o, r === `path`),
    l = JSON.stringify(c)
  return (
    h.useEffect(() => {
      s(JSON.parse(l), { replace: t, state: n, relative: r })
    }, [s, l, r, t, n]),
    null
  )
}
function br(e) {
  return Ln(e.context)
}
function xr({
  basename: e = `/`,
  children: t = null,
  location: n,
  navigationType: r = `POP`,
  navigator: i,
  static: a = !1,
  unstable_useTransitions: o,
}) {
  C(
    !An(),
    `You cannot render a <Router> inside another <Router>. You should never have more than one in your app.`,
  )
  let s = e.replace(/^\/*/, `/`),
    c = h.useMemo(
      () => ({ basename: s, navigator: i, static: a, unstable_useTransitions: o, future: {} }),
      [s, i, a, o],
    )
  typeof n == `string` && (n = k(n))
  let {
      pathname: l = `/`,
      search: u = ``,
      hash: d = ``,
      state: f = null,
      key: p = `default`,
      unstable_mask: m,
    } = n,
    g = h.useMemo(() => {
      let e = B(l, s)
      return e == null
        ? null
        : {
            location: { pathname: e, search: u, hash: d, state: f, key: p, unstable_mask: m },
            navigationType: r,
          }
    }, [s, l, u, d, f, p, r, m])
  return (
    w(
      g != null,
      `<Router basename="${s}"> is not able to match the URL "${l}${u}${d}" because it does not start with the basename, so the <Router> won't render anything.`,
    ),
    g == null
      ? null
      : h.createElement(
          Y.Provider,
          { value: c },
          h.createElement(Sn.Provider, { children: t, value: g }),
        )
  )
}
h.Component
var Sr = `get`,
  Cr = `application/x-www-form-urlencoded`
function wr(e) {
  return typeof HTMLElement < `u` && e instanceof HTMLElement
}
function Tr(e) {
  return wr(e) && e.tagName.toLowerCase() === `button`
}
function Er(e) {
  return wr(e) && e.tagName.toLowerCase() === `form`
}
function Dr(e) {
  return wr(e) && e.tagName.toLowerCase() === `input`
}
function Or(e) {
  return !!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey)
}
function kr(e, t) {
  return e.button === 0 && (!t || t === `_self`) && !Or(e)
}
function Ar(e = ``) {
  return new URLSearchParams(
    typeof e == `string` || Array.isArray(e) || e instanceof URLSearchParams
      ? e
      : Object.keys(e).reduce((t, n) => {
          let r = e[n]
          return t.concat(Array.isArray(r) ? r.map((e) => [n, e]) : [[n, r]])
        }, []),
  )
}
function jr(e, t) {
  let n = Ar(e)
  return (
    t &&
      t.forEach((e, r) => {
        n.has(r) ||
          t.getAll(r).forEach((e) => {
            n.append(r, e)
          })
      }),
    n
  )
}
var Mr = null
function Nr() {
  if (Mr === null)
    try {
      ;(new FormData(document.createElement(`form`), 0), (Mr = !1))
    } catch {
      Mr = !0
    }
  return Mr
}
var Pr = new Set([`application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`])
function Fr(e) {
  return e != null && !Pr.has(e)
    ? (w(
        !1,
        `"${e}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${Cr}"`,
      ),
      null)
    : e
}
function Ir(e, t) {
  let n, r, i, a, o
  if (Er(e)) {
    let o = e.getAttribute(`action`)
    ;((r = o ? B(o, t) : null),
      (n = e.getAttribute(`method`) || Sr),
      (i = Fr(e.getAttribute(`enctype`)) || Cr),
      (a = new FormData(e)))
  } else if (Tr(e) || (Dr(e) && (e.type === `submit` || e.type === `image`))) {
    let o = e.form
    if (o == null) throw Error(`Cannot submit a <button> or <input type="submit"> without a <form>`)
    let s = e.getAttribute(`formaction`) || o.getAttribute(`action`)
    if (
      ((r = s ? B(s, t) : null),
      (n = e.getAttribute(`formmethod`) || o.getAttribute(`method`) || Sr),
      (i = Fr(e.getAttribute(`formenctype`)) || Fr(o.getAttribute(`enctype`)) || Cr),
      (a = new FormData(o, e)),
      !Nr())
    ) {
      let { name: t, type: n, value: r } = e
      if (n === `image`) {
        let e = t ? `${t}.` : ``
        ;(a.append(`${e}x`, `0`), a.append(`${e}y`, `0`))
      } else t && a.append(t, r)
    }
  } else if (wr(e))
    throw Error(
      `Cannot submit element that is not <form>, <button>, or <input type="submit|image">`,
    )
  else ((n = Sr), (r = null), (i = Cr), (o = e))
  return (
    a && i === `text/plain` && ((o = a), (a = void 0)),
    { action: r, method: n.toLowerCase(), encType: i, formData: a, body: o }
  )
}
Object.getOwnPropertyNames(Object.prototype).sort().join(`\0`)
var Lr = {
    '&': `\\u0026`,
    '>': `\\u003e`,
    '<': `\\u003c`,
    '\u2028': `\\u2028`,
    '\u2029': `\\u2029`,
  },
  Rr = /[&><\u2028\u2029]/g
function zr(e) {
  return e.replace(Rr, (e) => Lr[e])
}
function Br(e, t) {
  if (e === !1 || e == null) throw Error(t)
}
function Vr(e, t, n, r) {
  let i =
    typeof e == `string`
      ? new URL(e, typeof window > `u` ? `server://singlefetch/` : window.location.origin)
      : e
  return (
    n
      ? i.pathname.endsWith(`/`)
        ? (i.pathname = `${i.pathname}_.${r}`)
        : (i.pathname = `${i.pathname}.${r}`)
      : i.pathname === `/`
        ? (i.pathname = `_root.${r}`)
        : t && B(i.pathname, t) === `/`
          ? (i.pathname = `${t.replace(/\/$/, ``)}/_root.${r}`)
          : (i.pathname = `${i.pathname.replace(/\/$/, ``)}.${r}`),
    i
  )
}
async function Hr(e, t) {
  if (e.id in t) return t[e.id]
  try {
    let n = await m(() => import(e.module), [])
    return ((t[e.id] = n), n)
  } catch (t) {
    return (
      console.error(`Error loading route module \`${e.module}\`, reloading page...`),
      console.error(t),
      window.__reactRouterContext && window.__reactRouterContext.isSpaMode,
      window.location.reload(),
      new Promise(() => {})
    )
  }
}
function Ur(e) {
  return e != null && typeof e.page == `string`
}
function Wr(e) {
  return e == null
    ? !1
    : e.href == null
      ? e.rel === `preload` && typeof e.imageSrcSet == `string` && typeof e.imageSizes == `string`
      : typeof e.rel == `string` && typeof e.href == `string`
}
async function Gr(e, t, n) {
  return Xr(
    (
      await Promise.all(
        e.map(async (e) => {
          let r = t.routes[e.route.id]
          if (r) {
            let e = await Hr(r, n)
            return e.links ? e.links() : []
          }
          return []
        }),
      )
    )
      .flat(1)
      .filter(Wr)
      .filter((e) => e.rel === `stylesheet` || e.rel === `preload`)
      .map((e) =>
        e.rel === `stylesheet` ? { ...e, rel: `prefetch`, as: `style` } : { ...e, rel: `prefetch` },
      ),
  )
}
function Kr(e, t, n, r, i, a) {
  let o = (e, t) => (n[t] ? e.route.id !== n[t].route.id : !0),
    s = (e, t) =>
      n[t].pathname !== e.pathname ||
      (n[t].route.path?.endsWith(`*`) && n[t].params[`*`] !== e.params[`*`])
  return a === `assets`
    ? t.filter((e, t) => o(e, t) || s(e, t))
    : a === `data`
      ? t.filter((t, a) => {
          let c = r.routes[t.route.id]
          if (!c || !c.hasLoader) return !1
          if (o(t, a) || s(t, a)) return !0
          if (t.route.shouldRevalidate) {
            let r = t.route.shouldRevalidate({
              currentUrl: new URL(i.pathname + i.search + i.hash, window.origin),
              currentParams: n[0]?.params || {},
              nextUrl: new URL(e, window.origin),
              nextParams: t.params,
              defaultShouldRevalidate: !0,
            })
            if (typeof r == `boolean`) return r
          }
          return !0
        })
      : []
}
function qr(e, t, { includeHydrateFallback: n } = {}) {
  return Jr(
    e
      .map((e) => {
        let r = t.routes[e.route.id]
        if (!r) return []
        let i = [r.module]
        return (
          r.clientActionModule && (i = i.concat(r.clientActionModule)),
          r.clientLoaderModule && (i = i.concat(r.clientLoaderModule)),
          n && r.hydrateFallbackModule && (i = i.concat(r.hydrateFallbackModule)),
          r.imports && (i = i.concat(r.imports)),
          i
        )
      })
      .flat(1),
  )
}
function Jr(e) {
  return [...new Set(e)]
}
function Yr(e) {
  let t = {},
    n = Object.keys(e).sort()
  for (let r of n) t[r] = e[r]
  return t
}
function Xr(e, t) {
  let n = new Set(),
    r = new Set(t)
  return e.reduce((e, i) => {
    if (t && !Ur(i) && i.as === `script` && i.href && r.has(i.href)) return e
    let a = JSON.stringify(Yr(i))
    return (n.has(a) || (n.add(a), e.push({ key: a, link: i })), e)
  }, [])
}
function Zr() {
  let e = h.useContext(hn)
  return (Br(e, `You must render this element inside a <DataRouterContext.Provider> element`), e)
}
function Qr() {
  let e = h.useContext(gn)
  return (
    Br(e, `You must render this element inside a <DataRouterStateContext.Provider> element`), e
  )
}
var $r = h.createContext(void 0)
$r.displayName = `FrameworkContext`
function ei() {
  let e = h.useContext($r)
  return (Br(e, `You must render this element inside a <HydratedRouter> element`), e)
}
function ti(e, t) {
  let n = h.useContext($r),
    [r, i] = h.useState(!1),
    [a, o] = h.useState(!1),
    { onFocus: s, onBlur: c, onMouseEnter: l, onMouseLeave: u, onTouchStart: d } = t,
    f = h.useRef(null)
  ;(h.useEffect(() => {
    if ((e === `render` && o(!0), e === `viewport`)) {
      let e = new IntersectionObserver(
        (e) => {
          e.forEach((e) => {
            o(e.isIntersecting)
          })
        },
        { threshold: 0.5 },
      )
      return (
        f.current && e.observe(f.current),
        () => {
          e.disconnect()
        }
      )
    }
  }, [e]),
    h.useEffect(() => {
      if (r) {
        let e = setTimeout(() => {
          o(!0)
        }, 100)
        return () => {
          clearTimeout(e)
        }
      }
    }, [r]))
  let p = () => {
      i(!0)
    },
    m = () => {
      ;(i(!1), o(!1))
    }
  return n
    ? e === `intent`
      ? [
          a,
          f,
          {
            onFocus: ni(s, p),
            onBlur: ni(c, m),
            onMouseEnter: ni(l, p),
            onMouseLeave: ni(u, m),
            onTouchStart: ni(d, p),
          },
        ]
      : [a, f, {}]
    : [!1, f, {}]
}
function ni(e, t) {
  return (n) => {
    ;(e && e(n), n.defaultPrevented || t(n))
  }
}
function ri({ page: e, ...t }) {
  let n = vn(),
    { router: r } = Zr(),
    i = h.useMemo(() => oe(r.routes, e, r.basename), [r.routes, e, r.basename])
  return i
    ? n
      ? h.createElement(ai, { page: e, matches: i, ...t })
      : h.createElement(oi, { page: e, matches: i, ...t })
    : null
}
function ii(e) {
  let { manifest: t, routeModules: n } = ei(),
    [r, i] = h.useState([])
  return (
    h.useEffect(() => {
      let r = !1
      return (
        Gr(e, t, n).then((e) => {
          r || i(e)
        }),
        () => {
          r = !0
        }
      )
    }, [e, t, n]),
    r
  )
}
function ai({ page: e, matches: t, ...n }) {
  let r = Z(),
    { future: i } = ei(),
    { basename: a } = Zr(),
    o = h.useMemo(() => {
      if (e === r.pathname + r.search + r.hash) return []
      let n = Vr(e, a, i.unstable_trailingSlashAwareDataRequests, `rsc`),
        o = !1,
        s = []
      for (let e of t) typeof e.route.shouldRevalidate == `function` ? (o = !0) : s.push(e.route.id)
      return (
        o && s.length > 0 && n.searchParams.set(`_routes`, s.join(`,`)), [n.pathname + n.search]
      )
    }, [a, i.unstable_trailingSlashAwareDataRequests, e, r, t])
  return h.createElement(
    h.Fragment,
    null,
    o.map((e) => h.createElement(`link`, { key: e, rel: `prefetch`, as: `fetch`, href: e, ...n })),
  )
}
function oi({ page: e, matches: t, ...n }) {
  let r = Z(),
    { future: i, manifest: a, routeModules: o } = ei(),
    { basename: s } = Zr(),
    { loaderData: c, matches: l } = Qr(),
    u = h.useMemo(() => Kr(e, t, l, a, r, `data`), [e, t, l, a, r]),
    d = h.useMemo(() => Kr(e, t, l, a, r, `assets`), [e, t, l, a, r]),
    f = h.useMemo(() => {
      if (e === r.pathname + r.search + r.hash) return []
      let n = new Set(),
        l = !1
      if (
        (t.forEach((e) => {
          let t = a.routes[e.route.id]
          !t ||
            !t.hasLoader ||
            ((!u.some((t) => t.route.id === e.route.id) &&
              e.route.id in c &&
              o[e.route.id]?.shouldRevalidate) ||
            t.hasClientLoader
              ? (l = !0)
              : n.add(e.route.id))
        }),
        n.size === 0)
      )
        return []
      let d = Vr(e, s, i.unstable_trailingSlashAwareDataRequests, `data`)
      return (
        l &&
          n.size > 0 &&
          d.searchParams.set(
            `_routes`,
            t
              .filter((e) => n.has(e.route.id))
              .map((e) => e.route.id)
              .join(`,`),
          ),
        [d.pathname + d.search]
      )
    }, [s, i.unstable_trailingSlashAwareDataRequests, c, r, a, u, t, e, o]),
    p = h.useMemo(() => qr(d, a), [d, a]),
    m = ii(d)
  return h.createElement(
    h.Fragment,
    null,
    f.map((e) => h.createElement(`link`, { key: e, rel: `prefetch`, as: `fetch`, href: e, ...n })),
    p.map((e) => h.createElement(`link`, { key: e, rel: `modulepreload`, href: e, ...n })),
    m.map(({ key: e, link: t }) =>
      h.createElement(`link`, {
        key: e,
        nonce: n.nonce,
        ...t,
        crossOrigin: t.crossOrigin ?? n.crossOrigin,
      }),
    ),
  )
}
function si(...e) {
  return (t) => {
    e.forEach((e) => {
      typeof e == `function` ? e(t) : e != null && (e.current = t)
    })
  }
}
h.Component
var ci =
  typeof window < `u` && window.document !== void 0 && window.document.createElement !== void 0
try {
  ci && (window.__reactRouterVersion = `7.14.0`)
} catch {}
function li(e, t) {
  return rt({
    basename: t?.basename,
    getContext: t?.getContext,
    future: t?.future,
    history: S({ window: t?.window }),
    hydrationData: t?.hydrationData || ui(),
    routes: e,
    mapRouteProperties: fr,
    hydrationRouteProperties: pr,
    dataStrategy: t?.dataStrategy,
    patchRoutesOnNavigation: t?.patchRoutesOnNavigation,
    window: t?.window,
    unstable_instrumentations: t?.unstable_instrumentations,
  }).initialize()
}
function ui() {
  let e = window?.__staticRouterHydrationData
  return (e && e.errors && (e = { ...e, errors: di(e.errors) }), e)
}
function di(e) {
  if (!e) return null
  let t = Object.entries(e),
    n = {}
  for (let [e, r] of t)
    if (r && r.__type === `RouteErrorResponse`)
      n[e] = new Ne(r.status, r.statusText, r.data, r.internal === !0)
    else if (r && r.__type === `Error`) {
      if (r.__subType) {
        let t = window[r.__subType]
        if (typeof t == `function`)
          try {
            let i = new t(r.message)
            ;((i.stack = ``), (n[e] = i))
          } catch {}
      }
      if (n[e] == null) {
        let t = Error(r.message)
        ;((t.stack = ``), (n[e] = t))
      }
    } else n[e] = r
  return n
}
function fi({ basename: e, children: t, history: n, unstable_useTransitions: r }) {
  let [i, a] = h.useState({ action: n.action, location: n.location }),
    o = h.useCallback(
      (e) => {
        r === !1 ? a(e) : h.startTransition(() => a(e))
      },
      [r],
    )
  return (
    h.useLayoutEffect(() => n.listen(o), [n, o]),
    h.createElement(xr, {
      basename: e,
      children: t,
      location: i.location,
      navigationType: i.action,
      navigator: n,
      unstable_useTransitions: r,
    })
  )
}
fi.displayName = `unstable_HistoryRouter`
var pi = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,
  mi = h.forwardRef(function (
    {
      onClick: e,
      discover: t = `render`,
      prefetch: n = `none`,
      relative: r,
      reloadDocument: i,
      replace: a,
      unstable_mask: o,
      state: s,
      target: c,
      to: l,
      preventScrollReset: u,
      viewTransition: d,
      unstable_defaultShouldRevalidate: f,
      ...p
    },
    m,
  ) {
    let { basename: g, navigator: _, unstable_useTransitions: v } = h.useContext(Y),
      y = typeof l == `string` && pi.test(l),
      b = U(l, g)
    l = b.to
    let x = kn(l, { relative: r }),
      S = Z(),
      C = null
    if (o) {
      let e = ke(o, [], S.unstable_mask ? S.unstable_mask.pathname : `/`, !0)
      ;(g !== `/` && (e.pathname = e.pathname === `/` ? g : V([g, e.pathname])),
        (C = _.createHref(e)))
    }
    let [w, T, E] = ti(n, p),
      D = xi(l, {
        replace: a,
        unstable_mask: o,
        state: s,
        target: c,
        preventScrollReset: u,
        relative: r,
        viewTransition: d,
        unstable_defaultShouldRevalidate: f,
        unstable_useTransitions: v,
      })
    function O(t) {
      ;(e && e(t), t.defaultPrevented || D(t))
    }
    let k = !(b.isExternal || i),
      A = h.createElement(`a`, {
        ...p,
        ...E,
        href: (k ? C : void 0) || b.absoluteURL || x,
        onClick: k ? O : e,
        ref: si(m, T),
        target: c,
        'data-discover': !y && t === `render` ? `true` : void 0,
      })
    return w && !y ? h.createElement(h.Fragment, null, A, h.createElement(ri, { page: x })) : A
  })
mi.displayName = `Link`
var hi = h.forwardRef(function (
  {
    'aria-current': e = `page`,
    caseSensitive: t = !1,
    className: n = ``,
    end: r = !1,
    style: i,
    to: a,
    viewTransition: o,
    children: s,
    ...c
  },
  l,
) {
  let u = Rn(a, { relative: c.relative }),
    d = Z(),
    f = h.useContext(gn),
    { navigator: p, basename: m } = h.useContext(Y),
    g = f != null && Mi(u) && o === !0,
    _ = p.encodeLocation ? p.encodeLocation(u).pathname : u.pathname,
    v = d.pathname,
    y = f && f.navigation && f.navigation.location ? f.navigation.location.pathname : null
  ;(t || ((v = v.toLowerCase()), (y = y ? y.toLowerCase() : null), (_ = _.toLowerCase())),
    y && m && (y = B(y, m) || y))
  let b = _ !== `/` && _.endsWith(`/`) ? _.length - 1 : _.length,
    x = v === _ || (!r && v.startsWith(_) && v.charAt(b) === `/`),
    S = y != null && (y === _ || (!r && y.startsWith(_) && y.charAt(_.length) === `/`)),
    C = { isActive: x, isPending: S, isTransitioning: g },
    w = x ? e : void 0,
    T
  T =
    typeof n == `function`
      ? n(C)
      : [n, x ? `active` : null, S ? `pending` : null, g ? `transitioning` : null]
          .filter(Boolean)
          .join(` `)
  let E = typeof i == `function` ? i(C) : i
  return h.createElement(
    mi,
    { ...c, 'aria-current': w, className: T, ref: l, style: E, to: a, viewTransition: o },
    typeof s == `function` ? s(C) : s,
  )
})
hi.displayName = `NavLink`
var gi = h.forwardRef(
  (
    {
      discover: e = `render`,
      fetcherKey: t,
      navigate: n,
      reloadDocument: r,
      replace: i,
      state: a,
      method: o = Sr,
      action: s,
      onSubmit: c,
      relative: l,
      preventScrollReset: u,
      viewTransition: d,
      unstable_defaultShouldRevalidate: f,
      ...p
    },
    m,
  ) => {
    let { unstable_useTransitions: g } = h.useContext(Y),
      _ = Ti(),
      v = Ei(s, { relative: l }),
      y = o.toLowerCase() === `get` ? `get` : `post`,
      b = typeof s == `string` && pi.test(s)
    return h.createElement(`form`, {
      ref: m,
      method: y,
      action: v,
      onSubmit: r
        ? c
        : (e) => {
            if ((c && c(e), e.defaultPrevented)) return
            e.preventDefault()
            let r = e.nativeEvent.submitter,
              s = r?.getAttribute(`formmethod`) || o,
              p = () =>
                _(r || e.currentTarget, {
                  fetcherKey: t,
                  method: s,
                  navigate: n,
                  replace: i,
                  state: a,
                  relative: l,
                  preventScrollReset: u,
                  viewTransition: d,
                  unstable_defaultShouldRevalidate: f,
                })
            g && n !== !1 ? h.startTransition(() => p()) : p()
          },
      ...p,
      'data-discover': !b && e === `render` ? `true` : void 0,
    })
  },
)
gi.displayName = `Form`
function _i({ getKey: e, storageKey: t, ...n }) {
  let r = h.useContext($r),
    { basename: i } = h.useContext(Y),
    a = Z(),
    o = er()
  Ai({ getKey: e, storageKey: t })
  let s = h.useMemo(() => {
    if (!r || !e) return null
    let t = ki(a, o, i, e)
    return t === a.key ? null : t
  }, [])
  if (!r || r.isSpaMode) return null
  let c = ((e, t) => {
    if (!window.history.state || !window.history.state.key) {
      let e = Math.random().toString(32).slice(2)
      window.history.replaceState({ key: e }, ``)
    }
    try {
      let n = JSON.parse(sessionStorage.getItem(e) || `{}`)[t || window.history.state.key]
      typeof n == `number` && window.scrollTo(0, n)
    } catch (t) {
      ;(console.error(t), sessionStorage.removeItem(e))
    }
  }).toString()
  return h.createElement(`script`, {
    ...n,
    suppressHydrationWarning: !0,
    dangerouslySetInnerHTML: {
      __html: `(${c})(${zr(JSON.stringify(t || Di))}, ${zr(JSON.stringify(s))})`,
    },
  })
}
_i.displayName = `ScrollRestoration`
function vi(e) {
  return `${e} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`
}
function yi(e) {
  let t = h.useContext(hn)
  return (C(t, vi(e)), t)
}
function bi(e) {
  let t = h.useContext(gn)
  return (C(t, vi(e)), t)
}
function xi(
  e,
  {
    target: t,
    replace: n,
    unstable_mask: r,
    state: i,
    preventScrollReset: a,
    relative: o,
    viewTransition: s,
    unstable_defaultShouldRevalidate: c,
    unstable_useTransitions: l,
  } = {},
) {
  let u = Nn(),
    d = Z(),
    f = Rn(e, { relative: o })
  return h.useCallback(
    (p) => {
      if (kr(p, t)) {
        p.preventDefault()
        let t = n === void 0 ? O(d) === O(f) : n,
          m = () =>
            u(e, {
              replace: t,
              unstable_mask: r,
              state: i,
              preventScrollReset: a,
              relative: o,
              viewTransition: s,
              unstable_defaultShouldRevalidate: c,
            })
        l ? h.startTransition(() => m()) : m()
      }
    },
    [d, u, f, n, r, i, t, e, a, o, s, c, l],
  )
}
function Si(e) {
  w(
    typeof URLSearchParams < `u`,
    'You cannot use the `useSearchParams` hook in a browser that does not support the URLSearchParams API. If you need to support Internet Explorer 11, we recommend you load a polyfill such as https://github.com/ungap/url-search-params.',
  )
  let t = h.useRef(Ar(e)),
    n = h.useRef(!1),
    r = Z(),
    i = h.useMemo(() => jr(r.search, n.current ? null : t.current), [r.search]),
    a = Nn()
  return [
    i,
    h.useCallback(
      (e, t) => {
        let r = Ar(typeof e == `function` ? e(new URLSearchParams(i)) : e)
        ;((n.current = !0), a(`?` + r, t))
      },
      [a, i],
    ),
  ]
}
var Ci = 0,
  wi = () => `__${String(++Ci)}__`
function Ti() {
  let { router: e } = yi(`useSubmit`),
    { basename: t } = h.useContext(Y),
    n = Qn(),
    r = e.fetch,
    i = e.navigate
  return h.useCallback(
    async (e, a = {}) => {
      let { action: o, method: s, encType: c, formData: l, body: u } = Ir(e, t)
      a.navigate === !1
        ? await r(a.fetcherKey || wi(), n, a.action || o, {
            unstable_defaultShouldRevalidate: a.unstable_defaultShouldRevalidate,
            preventScrollReset: a.preventScrollReset,
            formData: l,
            body: u,
            formMethod: a.method || s,
            formEncType: a.encType || c,
            flushSync: a.flushSync,
          })
        : await i(a.action || o, {
            unstable_defaultShouldRevalidate: a.unstable_defaultShouldRevalidate,
            preventScrollReset: a.preventScrollReset,
            formData: l,
            body: u,
            formMethod: a.method || s,
            formEncType: a.encType || c,
            replace: a.replace,
            state: a.state,
            fromRouteId: n,
            flushSync: a.flushSync,
            viewTransition: a.viewTransition,
          })
    },
    [r, i, t, n],
  )
}
function Ei(e, { relative: t } = {}) {
  let { basename: n } = h.useContext(Y),
    r = h.useContext(X)
  C(r, `useFormAction must be used inside a RouteContext`)
  let [i] = r.matches.slice(-1),
    a = { ...Rn(e || `.`, { relative: t }) },
    o = Z()
  if (e == null) {
    a.search = o.search
    let e = new URLSearchParams(a.search),
      t = e.getAll(`index`)
    if (t.some((e) => e === ``)) {
      ;(e.delete(`index`), t.filter((e) => e).forEach((t) => e.append(`index`, t)))
      let n = e.toString()
      a.search = n ? `?${n}` : ``
    }
  }
  return (
    (!e || e === `.`) &&
      i.route.index &&
      (a.search = a.search ? a.search.replace(/^\?/, `?index&`) : `?index`),
    n !== `/` && (a.pathname = a.pathname === `/` ? n : V([n, a.pathname])),
    O(a)
  )
}
var Di = `react-router-scroll-positions`,
  Oi = {}
function ki(e, t, n, r) {
  let i = null
  return (
    r && (i = r(n === `/` ? e : { ...e, pathname: B(e.pathname, n) || e.pathname }, t)),
    (i ??= e.key),
    i
  )
}
function Ai({ getKey: e, storageKey: t } = {}) {
  let { router: n } = yi(`useScrollRestoration`),
    { restoreScrollPosition: r, preventScrollReset: i } = bi(`useScrollRestoration`),
    { basename: a } = h.useContext(Y),
    o = Z(),
    s = er(),
    c = $n()
  ;(h.useEffect(
    () => (
      (window.history.scrollRestoration = `manual`),
      () => {
        window.history.scrollRestoration = `auto`
      }
    ),
    [],
  ),
    ji(
      h.useCallback(() => {
        if (c.state === `idle`) {
          let t = ki(o, s, a, e)
          Oi[t] = window.scrollY
        }
        try {
          sessionStorage.setItem(t || Di, JSON.stringify(Oi))
        } catch (e) {
          w(
            !1,
            `Failed to save scroll positions in sessionStorage, <ScrollRestoration /> will not work properly (${e}).`,
          )
        }
        window.history.scrollRestoration = `auto`
      }, [c.state, e, a, o, s, t]),
    ),
    typeof document < `u` &&
      (h.useLayoutEffect(() => {
        try {
          let e = sessionStorage.getItem(t || Di)
          e && (Oi = JSON.parse(e))
        } catch {}
      }, [t]),
      h.useLayoutEffect(() => {
        let t = n?.enableScrollRestoration(
          Oi,
          () => window.scrollY,
          e ? (t, n) => ki(t, n, a, e) : void 0,
        )
        return () => t && t()
      }, [n, a, e]),
      h.useLayoutEffect(() => {
        if (r !== !1) {
          if (typeof r == `number`) {
            window.scrollTo(0, r)
            return
          }
          try {
            if (o.hash) {
              let e = document.getElementById(decodeURIComponent(o.hash.slice(1)))
              if (e) {
                e.scrollIntoView()
                return
              }
            }
          } catch {
            w(
              !1,
              `"${o.hash.slice(1)}" is not a decodable element ID. The view will not scroll to it.`,
            )
          }
          i !== !0 && window.scrollTo(0, 0)
        }
      }, [o, r, i])))
}
function ji(e, t) {
  let { capture: n } = t || {}
  h.useEffect(() => {
    let t = n == null ? void 0 : { capture: n }
    return (
      window.addEventListener(`pagehide`, e, t),
      () => {
        window.removeEventListener(`pagehide`, e, t)
      }
    )
  }, [e, n])
}
function Mi(e, { relative: t } = {}) {
  let n = h.useContext(yn)
  C(
    n != null,
    "`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?",
  )
  let { basename: r } = yi(`useViewTransitionState`),
    i = Rn(e, { relative: t })
  if (!n.isTransitioning) return !1
  let a = B(n.currentLocation.pathname, r) || n.currentLocation.pathname,
    o = B(n.nextLocation.pathname, r) || n.nextLocation.pathname
  return ye(i.pathname, o) != null || ye(i.pathname, a) != null
}
function Ni(e, [t, n]) {
  return Math.min(n, Math.max(t, e))
}
var Q = i(),
  Pi = h.createContext(void 0)
function Fi(e) {
  let t = h.useContext(Pi)
  return e || t || `ltr`
}
function Ii(e, t) {
  return h.useReducer((e, n) => t[e][n] ?? e, e)
}
var Li = `ScrollArea`,
  [Ri, zi] = u(Li),
  [Bi, $] = Ri(Li),
  Vi = h.forwardRef((e, t) => {
    let { __scopeScrollArea: n, type: i = `hover`, dir: a, scrollHideDelay: o = 600, ...c } = e,
      [l, u] = h.useState(null),
      [d, f] = h.useState(null),
      [p, m] = h.useState(null),
      [g, _] = h.useState(null),
      [v, y] = h.useState(null),
      [b, x] = h.useState(0),
      [S, C] = h.useState(0),
      [w, T] = h.useState(!1),
      [E, D] = h.useState(!1),
      O = r(t, (e) => u(e)),
      k = Fi(a)
    return (0, Q.jsx)(Bi, {
      scope: n,
      type: i,
      dir: k,
      scrollHideDelay: o,
      scrollArea: l,
      viewport: d,
      onViewportChange: f,
      content: p,
      onContentChange: m,
      scrollbarX: g,
      onScrollbarXChange: _,
      scrollbarXEnabled: w,
      onScrollbarXEnabledChange: T,
      scrollbarY: v,
      onScrollbarYChange: y,
      scrollbarYEnabled: E,
      onScrollbarYEnabledChange: D,
      onCornerWidthChange: x,
      onCornerHeightChange: C,
      children: (0, Q.jsx)(s.div, {
        dir: k,
        ...c,
        ref: O,
        style: {
          position: `relative`,
          '--radix-scroll-area-corner-width': b + `px`,
          '--radix-scroll-area-corner-height': S + `px`,
          ...e.style,
        },
      }),
    })
  })
Vi.displayName = Li
var Hi = `ScrollAreaViewport`,
  Ui = h.forwardRef((e, t) => {
    let { __scopeScrollArea: n, children: i, nonce: a, ...o } = e,
      c = $(Hi, n),
      l = r(t, h.useRef(null), c.onViewportChange)
    return (0, Q.jsxs)(Q.Fragment, {
      children: [
        (0, Q.jsx)(`style`, {
          dangerouslySetInnerHTML: {
            __html: `[data-radix-scroll-area-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-scroll-area-viewport]::-webkit-scrollbar{display:none}`,
          },
          nonce: a,
        }),
        (0, Q.jsx)(s.div, {
          'data-radix-scroll-area-viewport': ``,
          ...o,
          ref: l,
          style: {
            overflowX: c.scrollbarXEnabled ? `scroll` : `hidden`,
            overflowY: c.scrollbarYEnabled ? `scroll` : `hidden`,
            ...e.style,
          },
          children: (0, Q.jsx)(`div`, {
            ref: c.onContentChange,
            style: { minWidth: `100%`, display: `table` },
            children: i,
          }),
        }),
      ],
    })
  })
Ui.displayName = Hi
var Wi = `ScrollAreaScrollbar`,
  Gi = h.forwardRef((e, t) => {
    let { forceMount: n, ...r } = e,
      i = $(Wi, e.__scopeScrollArea),
      { onScrollbarXEnabledChange: a, onScrollbarYEnabledChange: o } = i,
      s = e.orientation === `horizontal`
    return (
      h.useEffect(
        () => (
          s ? a(!0) : o(!0),
          () => {
            s ? a(!1) : o(!1)
          }
        ),
        [s, a, o],
      ),
      i.type === `hover`
        ? (0, Q.jsx)(Ki, { ...r, ref: t, forceMount: n })
        : i.type === `scroll`
          ? (0, Q.jsx)(qi, { ...r, ref: t, forceMount: n })
          : i.type === `auto`
            ? (0, Q.jsx)(Ji, { ...r, ref: t, forceMount: n })
            : i.type === `always`
              ? (0, Q.jsx)(Yi, { ...r, ref: t })
              : null
    )
  })
Gi.displayName = Wi
var Ki = h.forwardRef((e, t) => {
    let { forceMount: n, ...r } = e,
      i = $(Wi, e.__scopeScrollArea),
      [o, s] = h.useState(!1)
    return (
      h.useEffect(() => {
        let e = i.scrollArea,
          t = 0
        if (e) {
          let n = () => {
              ;(window.clearTimeout(t), s(!0))
            },
            r = () => {
              t = window.setTimeout(() => s(!1), i.scrollHideDelay)
            }
          return (
            e.addEventListener(`pointerenter`, n),
            e.addEventListener(`pointerleave`, r),
            () => {
              ;(window.clearTimeout(t),
                e.removeEventListener(`pointerenter`, n),
                e.removeEventListener(`pointerleave`, r))
            }
          )
        }
      }, [i.scrollArea, i.scrollHideDelay]),
      (0, Q.jsx)(a, {
        present: n || o,
        children: (0, Q.jsx)(Ji, { 'data-state': o ? `visible` : `hidden`, ...r, ref: t }),
      })
    )
  }),
  qi = h.forwardRef((t, n) => {
    let { forceMount: r, ...i } = t,
      o = $(Wi, t.__scopeScrollArea),
      s = t.orientation === `horizontal`,
      c = ha(() => u(`SCROLL_END`), 100),
      [l, u] = Ii(`hidden`, {
        hidden: { SCROLL: `scrolling` },
        scrolling: { SCROLL_END: `idle`, POINTER_ENTER: `interacting` },
        interacting: { SCROLL: `interacting`, POINTER_LEAVE: `idle` },
        idle: { HIDE: `hidden`, SCROLL: `scrolling`, POINTER_ENTER: `interacting` },
      })
    return (
      h.useEffect(() => {
        if (l === `idle`) {
          let e = window.setTimeout(() => u(`HIDE`), o.scrollHideDelay)
          return () => window.clearTimeout(e)
        }
      }, [l, o.scrollHideDelay, u]),
      h.useEffect(() => {
        let e = o.viewport,
          t = s ? `scrollLeft` : `scrollTop`
        if (e) {
          let n = e[t],
            r = () => {
              let r = e[t]
              ;(n !== r && (u(`SCROLL`), c()), (n = r))
            }
          return (e.addEventListener(`scroll`, r), () => e.removeEventListener(`scroll`, r))
        }
      }, [o.viewport, s, u, c]),
      (0, Q.jsx)(a, {
        present: r || l !== `hidden`,
        children: (0, Q.jsx)(Yi, {
          'data-state': l === `hidden` ? `hidden` : `visible`,
          ...i,
          ref: n,
          onPointerEnter: e(t.onPointerEnter, () => u(`POINTER_ENTER`)),
          onPointerLeave: e(t.onPointerLeave, () => u(`POINTER_LEAVE`)),
        }),
      })
    )
  }),
  Ji = h.forwardRef((e, t) => {
    let n = $(Wi, e.__scopeScrollArea),
      { forceMount: r, ...i } = e,
      [o, s] = h.useState(!1),
      c = e.orientation === `horizontal`,
      l = ha(() => {
        if (n.viewport) {
          let e = n.viewport.offsetWidth < n.viewport.scrollWidth,
            t = n.viewport.offsetHeight < n.viewport.scrollHeight
          s(c ? e : t)
        }
      }, 10)
    return (
      ga(n.viewport, l),
      ga(n.content, l),
      (0, Q.jsx)(a, {
        present: r || o,
        children: (0, Q.jsx)(Yi, { 'data-state': o ? `visible` : `hidden`, ...i, ref: t }),
      })
    )
  }),
  Yi = h.forwardRef((e, t) => {
    let { orientation: n = `vertical`, ...r } = e,
      i = $(Wi, e.__scopeScrollArea),
      a = h.useRef(null),
      o = h.useRef(0),
      [s, c] = h.useState({
        content: 0,
        viewport: 0,
        scrollbar: { size: 0, paddingStart: 0, paddingEnd: 0 },
      }),
      l = ca(s.viewport, s.content),
      u = {
        ...r,
        sizes: s,
        onSizesChange: c,
        hasThumb: l > 0 && l < 1,
        onThumbChange: (e) => (a.current = e),
        onThumbPointerUp: () => (o.current = 0),
        onThumbPointerDown: (e) => (o.current = e),
      }
    function d(e, t) {
      return ua(e, o.current, s, t)
    }
    return n === `horizontal`
      ? (0, Q.jsx)(Xi, {
          ...u,
          ref: t,
          onThumbPositionChange: () => {
            if (i.viewport && a.current) {
              let e = i.viewport.scrollLeft,
                t = da(e, s, i.dir)
              a.current.style.transform = `translate3d(${t}px, 0, 0)`
            }
          },
          onWheelScroll: (e) => {
            i.viewport && (i.viewport.scrollLeft = e)
          },
          onDragScroll: (e) => {
            i.viewport && (i.viewport.scrollLeft = d(e, i.dir))
          },
        })
      : n === `vertical`
        ? (0, Q.jsx)(Zi, {
            ...u,
            ref: t,
            onThumbPositionChange: () => {
              if (i.viewport && a.current) {
                let e = i.viewport.scrollTop,
                  t = da(e, s)
                a.current.style.transform = `translate3d(0, ${t}px, 0)`
              }
            },
            onWheelScroll: (e) => {
              i.viewport && (i.viewport.scrollTop = e)
            },
            onDragScroll: (e) => {
              i.viewport && (i.viewport.scrollTop = d(e))
            },
          })
        : null
  }),
  Xi = h.forwardRef((e, t) => {
    let { sizes: n, onSizesChange: i, ...a } = e,
      o = $(Wi, e.__scopeScrollArea),
      [s, c] = h.useState(),
      l = h.useRef(null),
      u = r(t, l, o.onScrollbarXChange)
    return (
      h.useEffect(() => {
        l.current && c(getComputedStyle(l.current))
      }, [l]),
      (0, Q.jsx)(ea, {
        'data-orientation': `horizontal`,
        ...a,
        ref: u,
        sizes: n,
        style: {
          bottom: 0,
          left: o.dir === `rtl` ? `var(--radix-scroll-area-corner-width)` : 0,
          right: o.dir === `ltr` ? `var(--radix-scroll-area-corner-width)` : 0,
          '--radix-scroll-area-thumb-width': la(n) + `px`,
          ...e.style,
        },
        onThumbPointerDown: (t) => e.onThumbPointerDown(t.x),
        onDragScroll: (t) => e.onDragScroll(t.x),
        onWheelScroll: (t, n) => {
          if (o.viewport) {
            let r = o.viewport.scrollLeft + t.deltaX
            ;(e.onWheelScroll(r), pa(r, n) && t.preventDefault())
          }
        },
        onResize: () => {
          l.current &&
            o.viewport &&
            s &&
            i({
              content: o.viewport.scrollWidth,
              viewport: o.viewport.offsetWidth,
              scrollbar: {
                size: l.current.clientWidth,
                paddingStart: sa(s.paddingLeft),
                paddingEnd: sa(s.paddingRight),
              },
            })
        },
      })
    )
  }),
  Zi = h.forwardRef((e, t) => {
    let { sizes: n, onSizesChange: i, ...a } = e,
      o = $(Wi, e.__scopeScrollArea),
      [s, c] = h.useState(),
      l = h.useRef(null),
      u = r(t, l, o.onScrollbarYChange)
    return (
      h.useEffect(() => {
        l.current && c(getComputedStyle(l.current))
      }, [l]),
      (0, Q.jsx)(ea, {
        'data-orientation': `vertical`,
        ...a,
        ref: u,
        sizes: n,
        style: {
          top: 0,
          right: o.dir === `ltr` ? 0 : void 0,
          left: o.dir === `rtl` ? 0 : void 0,
          bottom: `var(--radix-scroll-area-corner-height)`,
          '--radix-scroll-area-thumb-height': la(n) + `px`,
          ...e.style,
        },
        onThumbPointerDown: (t) => e.onThumbPointerDown(t.y),
        onDragScroll: (t) => e.onDragScroll(t.y),
        onWheelScroll: (t, n) => {
          if (o.viewport) {
            let r = o.viewport.scrollTop + t.deltaY
            ;(e.onWheelScroll(r), pa(r, n) && t.preventDefault())
          }
        },
        onResize: () => {
          l.current &&
            o.viewport &&
            s &&
            i({
              content: o.viewport.scrollHeight,
              viewport: o.viewport.offsetHeight,
              scrollbar: {
                size: l.current.clientHeight,
                paddingStart: sa(s.paddingTop),
                paddingEnd: sa(s.paddingBottom),
              },
            })
        },
      })
    )
  }),
  [Qi, $i] = Ri(Wi),
  ea = h.forwardRef((t, n) => {
    let {
        __scopeScrollArea: i,
        sizes: a,
        hasThumb: o,
        onThumbChange: c,
        onThumbPointerUp: u,
        onThumbPointerDown: d,
        onThumbPositionChange: f,
        onDragScroll: p,
        onWheelScroll: m,
        onResize: g,
        ..._
      } = t,
      v = $(Wi, i),
      [y, b] = h.useState(null),
      x = r(n, (e) => b(e)),
      S = h.useRef(null),
      C = h.useRef(``),
      w = v.viewport,
      T = a.content - a.viewport,
      E = l(m),
      D = l(f),
      O = ha(g, 10)
    function k(e) {
      S.current && p({ x: e.clientX - S.current.left, y: e.clientY - S.current.top })
    }
    return (
      h.useEffect(() => {
        let e = (e) => {
          let t = e.target
          y?.contains(t) && E(e, T)
        }
        return (
          document.addEventListener(`wheel`, e, { passive: !1 }),
          () => document.removeEventListener(`wheel`, e, { passive: !1 })
        )
      }, [w, y, T, E]),
      h.useEffect(D, [a, D]),
      ga(y, O),
      ga(v.content, O),
      (0, Q.jsx)(Qi, {
        scope: i,
        scrollbar: y,
        hasThumb: o,
        onThumbChange: l(c),
        onThumbPointerUp: l(u),
        onThumbPositionChange: D,
        onThumbPointerDown: l(d),
        children: (0, Q.jsx)(s.div, {
          ..._,
          ref: x,
          style: { position: `absolute`, ..._.style },
          onPointerDown: e(t.onPointerDown, (e) => {
            e.button === 0 &&
              (e.target.setPointerCapture(e.pointerId),
              (S.current = y.getBoundingClientRect()),
              (C.current = document.body.style.webkitUserSelect),
              (document.body.style.webkitUserSelect = `none`),
              v.viewport && (v.viewport.style.scrollBehavior = `auto`),
              k(e))
          }),
          onPointerMove: e(t.onPointerMove, k),
          onPointerUp: e(t.onPointerUp, (e) => {
            let t = e.target
            ;(t.hasPointerCapture(e.pointerId) && t.releasePointerCapture(e.pointerId),
              (document.body.style.webkitUserSelect = C.current),
              v.viewport && (v.viewport.style.scrollBehavior = ``),
              (S.current = null))
          }),
        }),
      })
    )
  }),
  ta = `ScrollAreaThumb`,
  na = h.forwardRef((e, t) => {
    let { forceMount: n, ...r } = e,
      i = $i(ta, e.__scopeScrollArea)
    return (0, Q.jsx)(a, { present: n || i.hasThumb, children: (0, Q.jsx)(ra, { ref: t, ...r }) })
  }),
  ra = h.forwardRef((t, n) => {
    let { __scopeScrollArea: i, style: a, ...o } = t,
      c = $(ta, i),
      l = $i(ta, i),
      { onThumbPositionChange: u } = l,
      d = r(n, (e) => l.onThumbChange(e)),
      f = h.useRef(void 0),
      p = ha(() => {
        f.current &&= (f.current(), void 0)
      }, 100)
    return (
      h.useEffect(() => {
        let e = c.viewport
        if (e) {
          let t = () => {
            ;(p(), f.current || ((f.current = ma(e, u)), u()))
          }
          return (u(), e.addEventListener(`scroll`, t), () => e.removeEventListener(`scroll`, t))
        }
      }, [c.viewport, p, u]),
      (0, Q.jsx)(s.div, {
        'data-state': l.hasThumb ? `visible` : `hidden`,
        ...o,
        ref: d,
        style: {
          width: `var(--radix-scroll-area-thumb-width)`,
          height: `var(--radix-scroll-area-thumb-height)`,
          ...a,
        },
        onPointerDownCapture: e(t.onPointerDownCapture, (e) => {
          let t = e.target.getBoundingClientRect(),
            n = e.clientX - t.left,
            r = e.clientY - t.top
          l.onThumbPointerDown({ x: n, y: r })
        }),
        onPointerUp: e(t.onPointerUp, l.onThumbPointerUp),
      })
    )
  })
na.displayName = ta
var ia = `ScrollAreaCorner`,
  aa = h.forwardRef((e, t) => {
    let n = $(ia, e.__scopeScrollArea),
      r = !!(n.scrollbarX && n.scrollbarY)
    return n.type !== `scroll` && r ? (0, Q.jsx)(oa, { ...e, ref: t }) : null
  })
aa.displayName = ia
var oa = h.forwardRef((e, t) => {
  let { __scopeScrollArea: n, ...r } = e,
    i = $(ia, n),
    [a, o] = h.useState(0),
    [c, l] = h.useState(0),
    u = !!(a && c)
  return (
    ga(i.scrollbarX, () => {
      let e = i.scrollbarX?.offsetHeight || 0
      ;(i.onCornerHeightChange(e), l(e))
    }),
    ga(i.scrollbarY, () => {
      let e = i.scrollbarY?.offsetWidth || 0
      ;(i.onCornerWidthChange(e), o(e))
    }),
    u
      ? (0, Q.jsx)(s.div, {
          ...r,
          ref: t,
          style: {
            width: a,
            height: c,
            position: `absolute`,
            right: i.dir === `ltr` ? 0 : void 0,
            left: i.dir === `rtl` ? 0 : void 0,
            bottom: 0,
            ...e.style,
          },
        })
      : null
  )
})
function sa(e) {
  return e ? parseInt(e, 10) : 0
}
function ca(e, t) {
  let n = e / t
  return isNaN(n) ? 0 : n
}
function la(e) {
  let t = ca(e.viewport, e.content),
    n = e.scrollbar.paddingStart + e.scrollbar.paddingEnd,
    r = (e.scrollbar.size - n) * t
  return Math.max(r, 18)
}
function ua(e, t, n, r = `ltr`) {
  let i = la(n),
    a = i / 2,
    o = t || a,
    s = i - o,
    c = n.scrollbar.paddingStart + o,
    l = n.scrollbar.size - n.scrollbar.paddingEnd - s,
    u = n.content - n.viewport,
    d = r === `ltr` ? [0, u] : [u * -1, 0]
  return fa([c, l], d)(e)
}
function da(e, t, n = `ltr`) {
  let r = la(t),
    i = t.scrollbar.paddingStart + t.scrollbar.paddingEnd,
    a = t.scrollbar.size - i,
    o = t.content - t.viewport,
    s = a - r,
    c = Ni(e, n === `ltr` ? [0, o] : [o * -1, 0])
  return fa([0, o], [0, s])(c)
}
function fa(e, t) {
  return (n) => {
    if (e[0] === e[1] || t[0] === t[1]) return t[0]
    let r = (t[1] - t[0]) / (e[1] - e[0])
    return t[0] + r * (n - e[0])
  }
}
function pa(e, t) {
  return e > 0 && e < t
}
var ma = (e, t = () => {}) => {
  let n = { left: e.scrollLeft, top: e.scrollTop },
    r = 0
  return (
    (function i() {
      let a = { left: e.scrollLeft, top: e.scrollTop },
        o = n.left !== a.left,
        s = n.top !== a.top
      ;((o || s) && t(), (n = a), (r = window.requestAnimationFrame(i)))
    })(),
    () => window.cancelAnimationFrame(r)
  )
}
function ha(e, t) {
  let n = l(e),
    r = h.useRef(0)
  return (
    h.useEffect(() => () => window.clearTimeout(r.current), []),
    h.useCallback(() => {
      ;(window.clearTimeout(r.current), (r.current = window.setTimeout(n, t)))
    }, [n, t])
  )
}
function ga(e, t) {
  let n = l(t)
  o(() => {
    let t = 0
    if (e) {
      let r = new ResizeObserver(() => {
        ;(cancelAnimationFrame(t), (t = window.requestAnimationFrame(n)))
      })
      return (
        r.observe(e),
        () => {
          ;(window.cancelAnimationFrame(t), r.unobserve(e))
        }
      )
    }
  }, [e, n])
}
var _a = Vi,
  va = Ui,
  ya = aa,
  ba = h.forwardRef(({ className: e, children: t, ...n }, r) =>
    (0, Q.jsxs)(_a, {
      ref: r,
      className: c(`relative overflow-hidden`, e),
      ...n,
      children: [
        (0, Q.jsx)(va, { className: `h-full w-full rounded-[inherit]`, children: t }),
        (0, Q.jsx)(xa, {}),
        (0, Q.jsx)(ya, {}),
      ],
    }),
  )
ba.displayName = _a.displayName
var xa = h.forwardRef(({ className: e, orientation: t = `vertical`, ...n }, r) =>
  (0, Q.jsx)(Gi, {
    ref: r,
    orientation: t,
    className: c(
      `flex touch-none select-none transition-colors`,
      t === `vertical` && `h-full w-2.5 border-l border-l-transparent p-[1px]`,
      t === `horizontal` && `h-2.5 flex-col border-t border-t-transparent p-[1px]`,
      e,
    ),
    ...n,
    children: (0, Q.jsx)(na, { className: `relative flex-1 rounded-full bg-border` }),
  }),
)
xa.displayName = Gi.displayName
export {
  yr as a,
  li as c,
  Z as d,
  Nn as f,
  m as g,
  Si as h,
  mi as i,
  j as l,
  tr as m,
  Fi as n,
  br as o,
  In as p,
  Ni as r,
  hr as s,
  ba as t,
  rr as u,
}
