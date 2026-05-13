var e = Object.create,
  t = Object.defineProperty,
  n = Object.getOwnPropertyDescriptor,
  r = Object.getOwnPropertyNames,
  i = Object.getPrototypeOf,
  a = Object.prototype.hasOwnProperty,
  o = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports),
  s = (e, i, o, s) => {
    if ((i && typeof i == `object`) || typeof i == `function`)
      for (var c = r(i), l = 0, u = c.length, d; l < u; l++)
        ((d = c[l]),
          !a.call(e, d) &&
            d !== o &&
            t(e, d, {
              get: ((e) => i[e]).bind(null, d),
              enumerable: !(s = n(i, d)) || s.enumerable,
            }))
    return e
  },
  c = (n, r, a) => (
    (a = n == null ? {} : e(i(n))),
    s(r || !n || !n.__esModule ? t(a, `default`, { value: n, enumerable: !0 }) : a, n)
  ),
  l = o((e) => {
    var t = Symbol.for(`react.transitional.element`),
      n = Symbol.for(`react.portal`),
      r = Symbol.for(`react.fragment`),
      i = Symbol.for(`react.strict_mode`),
      a = Symbol.for(`react.profiler`),
      o = Symbol.for(`react.consumer`),
      s = Symbol.for(`react.context`),
      c = Symbol.for(`react.forward_ref`),
      l = Symbol.for(`react.suspense`),
      u = Symbol.for(`react.memo`),
      d = Symbol.for(`react.lazy`),
      f = Symbol.for(`react.activity`),
      p = Symbol.iterator
    function m(e) {
      return typeof e != `object` || !e
        ? null
        : ((e = (p && e[p]) || e[`@@iterator`]), typeof e == `function` ? e : null)
    }
    var h = {
        isMounted: function () {
          return !1
        },
        enqueueForceUpdate: function () {},
        enqueueReplaceState: function () {},
        enqueueSetState: function () {},
      },
      g = Object.assign,
      _ = {}
    function v(e, t, n) {
      ;((this.props = e), (this.context = t), (this.refs = _), (this.updater = n || h))
    }
    ;((v.prototype.isReactComponent = {}),
      (v.prototype.setState = function (e, t) {
        if (typeof e != `object` && typeof e != `function` && e != null)
          throw Error(
            `takes an object of state variables to update or a function which returns an object of state variables.`,
          )
        this.updater.enqueueSetState(this, e, t, `setState`)
      }),
      (v.prototype.forceUpdate = function (e) {
        this.updater.enqueueForceUpdate(this, e, `forceUpdate`)
      }))
    function y() {}
    y.prototype = v.prototype
    function b(e, t, n) {
      ;((this.props = e), (this.context = t), (this.refs = _), (this.updater = n || h))
    }
    var x = (b.prototype = new y())
    ;((x.constructor = b), g(x, v.prototype), (x.isPureReactComponent = !0))
    var S = Array.isArray
    function C() {}
    var w = { H: null, A: null, T: null, S: null },
      T = Object.prototype.hasOwnProperty
    function E(e, n, r) {
      var i = r.ref
      return { $$typeof: t, type: e, key: n, ref: i === void 0 ? null : i, props: r }
    }
    function D(e, t) {
      return E(e.type, t, e.props)
    }
    function O(e) {
      return typeof e == `object` && !!e && e.$$typeof === t
    }
    function k(e) {
      var t = { '=': `=0`, ':': `=2` }
      return (
        `$` +
        e.replace(/[=:]/g, function (e) {
          return t[e]
        })
      )
    }
    var A = /\/+/g
    function j(e, t) {
      return typeof e == `object` && e && e.key != null ? k(`` + e.key) : t.toString(36)
    }
    function M(e) {
      switch (e.status) {
        case `fulfilled`:
          return e.value
        case `rejected`:
          throw e.reason
        default:
          switch (
            (typeof e.status == `string`
              ? e.then(C, C)
              : ((e.status = `pending`),
                e.then(
                  function (t) {
                    e.status === `pending` && ((e.status = `fulfilled`), (e.value = t))
                  },
                  function (t) {
                    e.status === `pending` && ((e.status = `rejected`), (e.reason = t))
                  },
                )),
            e.status)
          ) {
            case `fulfilled`:
              return e.value
            case `rejected`:
              throw e.reason
          }
      }
      throw e
    }
    function N(e, r, i, a, o) {
      var s = typeof e
      ;(s === `undefined` || s === `boolean`) && (e = null)
      var c = !1
      if (e === null) c = !0
      else
        switch (s) {
          case `bigint`:
          case `string`:
          case `number`:
            c = !0
            break
          case `object`:
            switch (e.$$typeof) {
              case t:
              case n:
                c = !0
                break
              case d:
                return ((c = e._init), N(c(e._payload), r, i, a, o))
            }
        }
      if (c)
        return (
          (o = o(e)),
          (c = a === `` ? `.` + j(e, 0) : a),
          S(o)
            ? ((i = ``),
              c != null && (i = c.replace(A, `$&/`) + `/`),
              N(o, r, i, ``, function (e) {
                return e
              }))
            : o != null &&
              (O(o) &&
                (o = D(
                  o,
                  i +
                    (o.key == null || (e && e.key === o.key)
                      ? ``
                      : (`` + o.key).replace(A, `$&/`) + `/`) +
                    c,
                )),
              r.push(o)),
          1
        )
      c = 0
      var l = a === `` ? `.` : a + `:`
      if (S(e))
        for (var u = 0; u < e.length; u++) ((a = e[u]), (s = l + j(a, u)), (c += N(a, r, i, s, o)))
      else if (((u = m(e)), typeof u == `function`))
        for (e = u.call(e), u = 0; !(a = e.next()).done; )
          ((a = a.value), (s = l + j(a, u++)), (c += N(a, r, i, s, o)))
      else if (s === `object`) {
        if (typeof e.then == `function`) return N(M(e), r, i, a, o)
        throw (
          (r = String(e)),
          Error(
            `Objects are not valid as a React child (found: ` +
              (r === `[object Object]`
                ? `object with keys {` + Object.keys(e).join(`, `) + `}`
                : r) +
              `). If you meant to render a collection of children, use an array instead.`,
          )
        )
      }
      return c
    }
    function P(e, t, n) {
      if (e == null) return e
      var r = [],
        i = 0
      return (
        N(e, r, ``, ``, function (e) {
          return t.call(n, e, i++)
        }),
        r
      )
    }
    function F(e) {
      if (e._status === -1) {
        var t = e._result
        ;((t = t()),
          t.then(
            function (t) {
              ;(e._status === 0 || e._status === -1) && ((e._status = 1), (e._result = t))
            },
            function (t) {
              ;(e._status === 0 || e._status === -1) && ((e._status = 2), (e._result = t))
            },
          ),
          e._status === -1 && ((e._status = 0), (e._result = t)))
      }
      if (e._status === 1) return e._result.default
      throw e._result
    }
    var I =
        typeof reportError == `function`
          ? reportError
          : function (e) {
              if (typeof window == `object` && typeof window.ErrorEvent == `function`) {
                var t = new window.ErrorEvent(`error`, {
                  bubbles: !0,
                  cancelable: !0,
                  message:
                    typeof e == `object` && e && typeof e.message == `string`
                      ? String(e.message)
                      : String(e),
                  error: e,
                })
                if (!window.dispatchEvent(t)) return
              } else if (typeof process == `object` && typeof process.emit == `function`) {
                process.emit(`uncaughtException`, e)
                return
              }
              console.error(e)
            },
      L = {
        map: P,
        forEach: function (e, t, n) {
          P(
            e,
            function () {
              t.apply(this, arguments)
            },
            n,
          )
        },
        count: function (e) {
          var t = 0
          return (
            P(e, function () {
              t++
            }),
            t
          )
        },
        toArray: function (e) {
          return (
            P(e, function (e) {
              return e
            }) || []
          )
        },
        only: function (e) {
          if (!O(e))
            throw Error(`React.Children.only expected to receive a single React element child.`)
          return e
        },
      }
    ;((e.Activity = f),
      (e.Children = L),
      (e.Component = v),
      (e.Fragment = r),
      (e.Profiler = a),
      (e.PureComponent = b),
      (e.StrictMode = i),
      (e.Suspense = l),
      (e.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = w),
      (e.__COMPILER_RUNTIME = {
        __proto__: null,
        c: function (e) {
          return w.H.useMemoCache(e)
        },
      }),
      (e.cache = function (e) {
        return function () {
          return e.apply(null, arguments)
        }
      }),
      (e.cacheSignal = function () {
        return null
      }),
      (e.cloneElement = function (e, t, n) {
        if (e == null)
          throw Error(`The argument must be a React element, but you passed ` + e + `.`)
        var r = g({}, e.props),
          i = e.key
        if (t != null)
          for (a in (t.key !== void 0 && (i = `` + t.key), t))
            !T.call(t, a) ||
              a === `key` ||
              a === `__self` ||
              a === `__source` ||
              (a === `ref` && t.ref === void 0) ||
              (r[a] = t[a])
        var a = arguments.length - 2
        if (a === 1) r.children = n
        else if (1 < a) {
          for (var o = Array(a), s = 0; s < a; s++) o[s] = arguments[s + 2]
          r.children = o
        }
        return E(e.type, i, r)
      }),
      (e.createContext = function (e) {
        return (
          (e = {
            $$typeof: s,
            _currentValue: e,
            _currentValue2: e,
            _threadCount: 0,
            Provider: null,
            Consumer: null,
          }),
          (e.Provider = e),
          (e.Consumer = { $$typeof: o, _context: e }),
          e
        )
      }),
      (e.createElement = function (e, t, n) {
        var r,
          i = {},
          a = null
        if (t != null)
          for (r in (t.key !== void 0 && (a = `` + t.key), t))
            T.call(t, r) && r !== `key` && r !== `__self` && r !== `__source` && (i[r] = t[r])
        var o = arguments.length - 2
        if (o === 1) i.children = n
        else if (1 < o) {
          for (var s = Array(o), c = 0; c < o; c++) s[c] = arguments[c + 2]
          i.children = s
        }
        if (e && e.defaultProps)
          for (r in ((o = e.defaultProps), o)) i[r] === void 0 && (i[r] = o[r])
        return E(e, a, i)
      }),
      (e.createRef = function () {
        return { current: null }
      }),
      (e.forwardRef = function (e) {
        return { $$typeof: c, render: e }
      }),
      (e.isValidElement = O),
      (e.lazy = function (e) {
        return { $$typeof: d, _payload: { _status: -1, _result: e }, _init: F }
      }),
      (e.memo = function (e, t) {
        return { $$typeof: u, type: e, compare: t === void 0 ? null : t }
      }),
      (e.startTransition = function (e) {
        var t = w.T,
          n = {}
        w.T = n
        try {
          var r = e(),
            i = w.S
          ;(i !== null && i(n, r),
            typeof r == `object` && r && typeof r.then == `function` && r.then(C, I))
        } catch (e) {
          I(e)
        } finally {
          ;(t !== null && n.types !== null && (t.types = n.types), (w.T = t))
        }
      }),
      (e.unstable_useCacheRefresh = function () {
        return w.H.useCacheRefresh()
      }),
      (e.use = function (e) {
        return w.H.use(e)
      }),
      (e.useActionState = function (e, t, n) {
        return w.H.useActionState(e, t, n)
      }),
      (e.useCallback = function (e, t) {
        return w.H.useCallback(e, t)
      }),
      (e.useContext = function (e) {
        return w.H.useContext(e)
      }),
      (e.useDebugValue = function () {}),
      (e.useDeferredValue = function (e, t) {
        return w.H.useDeferredValue(e, t)
      }),
      (e.useEffect = function (e, t) {
        return w.H.useEffect(e, t)
      }),
      (e.useEffectEvent = function (e) {
        return w.H.useEffectEvent(e)
      }),
      (e.useId = function () {
        return w.H.useId()
      }),
      (e.useImperativeHandle = function (e, t, n) {
        return w.H.useImperativeHandle(e, t, n)
      }),
      (e.useInsertionEffect = function (e, t) {
        return w.H.useInsertionEffect(e, t)
      }),
      (e.useLayoutEffect = function (e, t) {
        return w.H.useLayoutEffect(e, t)
      }),
      (e.useMemo = function (e, t) {
        return w.H.useMemo(e, t)
      }),
      (e.useOptimistic = function (e, t) {
        return w.H.useOptimistic(e, t)
      }),
      (e.useReducer = function (e, t, n) {
        return w.H.useReducer(e, t, n)
      }),
      (e.useRef = function (e) {
        return w.H.useRef(e)
      }),
      (e.useState = function (e) {
        return w.H.useState(e)
      }),
      (e.useSyncExternalStore = function (e, t, n) {
        return w.H.useSyncExternalStore(e, t, n)
      }),
      (e.useTransition = function () {
        return w.H.useTransition()
      }),
      (e.version = `19.2.4`))
  }),
  u = o((e, t) => {
    t.exports = l()
  }),
  d = o((e) => {
    var t = u()
    function n(e) {
      var t = `https://react.dev/errors/` + e
      if (1 < arguments.length) {
        t += `?args[]=` + encodeURIComponent(arguments[1])
        for (var n = 2; n < arguments.length; n++)
          t += `&args[]=` + encodeURIComponent(arguments[n])
      }
      return (
        `Minified React error #` +
        e +
        `; visit ` +
        t +
        ` for the full message or use the non-minified dev environment for full errors and additional helpful warnings.`
      )
    }
    function r() {}
    var i = {
        d: {
          f: r,
          r: function () {
            throw Error(n(522))
          },
          D: r,
          C: r,
          L: r,
          m: r,
          X: r,
          S: r,
          M: r,
        },
        p: 0,
        findDOMNode: null,
      },
      a = Symbol.for(`react.portal`)
    function o(e, t, n) {
      var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null
      return {
        $$typeof: a,
        key: r == null ? null : `` + r,
        children: e,
        containerInfo: t,
        implementation: n,
      }
    }
    var s = t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
    function c(e, t) {
      if (e === `font`) return ``
      if (typeof t == `string`) return t === `use-credentials` ? t : ``
    }
    ;((e.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = i),
      (e.createPortal = function (e, t) {
        var r = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null
        if (!t || (t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11)) throw Error(n(299))
        return o(e, t, null, r)
      }),
      (e.flushSync = function (e) {
        var t = s.T,
          n = i.p
        try {
          if (((s.T = null), (i.p = 2), e)) return e()
        } finally {
          ;((s.T = t), (i.p = n), i.d.f())
        }
      }),
      (e.preconnect = function (e, t) {
        typeof e == `string` &&
          (t
            ? ((t = t.crossOrigin),
              (t = typeof t == `string` ? (t === `use-credentials` ? t : ``) : void 0))
            : (t = null),
          i.d.C(e, t))
      }),
      (e.prefetchDNS = function (e) {
        typeof e == `string` && i.d.D(e)
      }),
      (e.preinit = function (e, t) {
        if (typeof e == `string` && t && typeof t.as == `string`) {
          var n = t.as,
            r = c(n, t.crossOrigin),
            a = typeof t.integrity == `string` ? t.integrity : void 0,
            o = typeof t.fetchPriority == `string` ? t.fetchPriority : void 0
          n === `style`
            ? i.d.S(e, typeof t.precedence == `string` ? t.precedence : void 0, {
                crossOrigin: r,
                integrity: a,
                fetchPriority: o,
              })
            : n === `script` &&
              i.d.X(e, {
                crossOrigin: r,
                integrity: a,
                fetchPriority: o,
                nonce: typeof t.nonce == `string` ? t.nonce : void 0,
              })
        }
      }),
      (e.preinitModule = function (e, t) {
        if (typeof e == `string`)
          if (typeof t == `object` && t) {
            if (t.as == null || t.as === `script`) {
              var n = c(t.as, t.crossOrigin)
              i.d.M(e, {
                crossOrigin: n,
                integrity: typeof t.integrity == `string` ? t.integrity : void 0,
                nonce: typeof t.nonce == `string` ? t.nonce : void 0,
              })
            }
          } else t ?? i.d.M(e)
      }),
      (e.preload = function (e, t) {
        if (typeof e == `string` && typeof t == `object` && t && typeof t.as == `string`) {
          var n = t.as,
            r = c(n, t.crossOrigin)
          i.d.L(e, n, {
            crossOrigin: r,
            integrity: typeof t.integrity == `string` ? t.integrity : void 0,
            nonce: typeof t.nonce == `string` ? t.nonce : void 0,
            type: typeof t.type == `string` ? t.type : void 0,
            fetchPriority: typeof t.fetchPriority == `string` ? t.fetchPriority : void 0,
            referrerPolicy: typeof t.referrerPolicy == `string` ? t.referrerPolicy : void 0,
            imageSrcSet: typeof t.imageSrcSet == `string` ? t.imageSrcSet : void 0,
            imageSizes: typeof t.imageSizes == `string` ? t.imageSizes : void 0,
            media: typeof t.media == `string` ? t.media : void 0,
          })
        }
      }),
      (e.preloadModule = function (e, t) {
        if (typeof e == `string`)
          if (t) {
            var n = c(t.as, t.crossOrigin)
            i.d.m(e, {
              as: typeof t.as == `string` && t.as !== `script` ? t.as : void 0,
              crossOrigin: n,
              integrity: typeof t.integrity == `string` ? t.integrity : void 0,
            })
          } else i.d.m(e)
      }),
      (e.requestFormReset = function (e) {
        i.d.r(e)
      }),
      (e.unstable_batchedUpdates = function (e, t) {
        return e(t)
      }),
      (e.useFormState = function (e, t, n) {
        return s.H.useFormState(e, t, n)
      }),
      (e.useFormStatus = function () {
        return s.H.useHostTransitionStatus()
      }),
      (e.version = `19.2.4`))
  }),
  f = o((e, t) => {
    function n() {
      if (
        !(
          typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > `u` ||
          typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != `function`
        )
      )
        try {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n)
        } catch (e) {
          console.error(e)
        }
    }
    ;(n(), (t.exports = d()))
  }),
  p = c(u(), 1),
  m = 1,
  h = 1e6,
  g = 0
function _() {
  return ((g = (g + 1) % (2 ** 53 - 1)), g.toString())
}
var v = new Map(),
  y = (e) => {
    if (v.has(e)) return
    let t = setTimeout(() => {
      ;(v.delete(e), C({ type: `REMOVE_TOAST`, toastId: e }))
    }, h)
    v.set(e, t)
  },
  b = (e, t) => {
    switch (t.type) {
      case `ADD_TOAST`:
        return { ...e, toasts: [t.toast, ...e.toasts].slice(0, m) }
      case `UPDATE_TOAST`:
        return {
          ...e,
          toasts: e.toasts.map((e) => (e.id === t.toast.id ? { ...e, ...t.toast } : e)),
        }
      case `DISMISS_TOAST`: {
        let { toastId: n } = t
        return (
          n
            ? y(n)
            : e.toasts.forEach((e) => {
                y(e.id)
              }),
          {
            ...e,
            toasts: e.toasts.map((e) => (e.id === n || n === void 0 ? { ...e, open: !1 } : e)),
          }
        )
      }
      case `REMOVE_TOAST`:
        return t.toastId === void 0
          ? { ...e, toasts: [] }
          : { ...e, toasts: e.toasts.filter((e) => e.id !== t.toastId) }
    }
  },
  x = [],
  S = { toasts: [] }
function C(e) {
  ;((S = b(S, e)),
    x.forEach((e) => {
      e(S)
    }))
}
function w({ ...e }) {
  let t = _(),
    n = (e) => C({ type: `UPDATE_TOAST`, toast: { ...e, id: t } }),
    r = () => C({ type: `DISMISS_TOAST`, toastId: t })
  return (
    C({
      type: `ADD_TOAST`,
      toast: {
        ...e,
        id: t,
        open: !0,
        onOpenChange: (e) => {
          e || r()
        },
      },
    }),
    { id: t, dismiss: r, update: n }
  )
}
function T() {
  let [e, t] = p.useState(S)
  return (
    p.useEffect(
      () => (
        x.push(t),
        () => {
          let e = x.indexOf(t)
          e > -1 && x.splice(e, 1)
        }
      ),
      [e],
    ),
    { ...e, toast: w, dismiss: (e) => C({ type: `DISMISS_TOAST`, toastId: e }) }
  )
}
typeof window < `u` && window.document && window.document.createElement
function E(e, t, { checkForDefaultPrevented: n = !0 } = {}) {
  return function (r) {
    if ((e?.(r), n === !1 || !r.defaultPrevented)) return t?.(r)
  }
}
function D(e, t) {
  if (typeof e == `function`) return e(t)
  e != null && (e.current = t)
}
function O(...e) {
  return (t) => {
    let n = !1,
      r = e.map((e) => {
        let r = D(e, t)
        return (!n && typeof r == `function` && (n = !0), r)
      })
    if (n)
      return () => {
        for (let t = 0; t < r.length; t++) {
          let n = r[t]
          typeof n == `function` ? n() : D(e[t], null)
        }
      }
  }
}
function k(...e) {
  return p.useCallback(O(...e), e)
}
var A = o((e) => {
    var t = Symbol.for(`react.transitional.element`),
      n = Symbol.for(`react.fragment`)
    function r(e, n, r) {
      var i = null
      if ((r !== void 0 && (i = `` + r), n.key !== void 0 && (i = `` + n.key), `key` in n))
        for (var a in ((r = {}), n)) a !== `key` && (r[a] = n[a])
      else r = n
      return ((n = r.ref), { $$typeof: t, type: e, key: i, ref: n === void 0 ? null : n, props: r })
    }
    ;((e.Fragment = n), (e.jsx = r), (e.jsxs = r))
  }),
  j = o((e, t) => {
    t.exports = A()
  }),
  M = j()
function N(e, t) {
  let n = p.createContext(t),
    r = (e) => {
      let { children: t, ...r } = e,
        i = p.useMemo(() => r, Object.values(r))
      return (0, M.jsx)(n.Provider, { value: i, children: t })
    }
  r.displayName = e + `Provider`
  function i(r) {
    let i = p.useContext(n)
    if (i) return i
    if (t !== void 0) return t
    throw Error(`\`${r}\` must be used within \`${e}\``)
  }
  return [r, i]
}
function P(e, t = []) {
  let n = []
  function r(t, r) {
    let i = p.createContext(r),
      a = n.length
    n = [...n, r]
    let o = (t) => {
      let { scope: n, children: r, ...o } = t,
        s = n?.[e]?.[a] || i,
        c = p.useMemo(() => o, Object.values(o))
      return (0, M.jsx)(s.Provider, { value: c, children: r })
    }
    o.displayName = t + `Provider`
    function s(n, o) {
      let s = o?.[e]?.[a] || i,
        c = p.useContext(s)
      if (c) return c
      if (r !== void 0) return r
      throw Error(`\`${n}\` must be used within \`${t}\``)
    }
    return [o, s]
  }
  let i = () => {
    let t = n.map((e) => p.createContext(e))
    return function (n) {
      let r = n?.[e] || t
      return p.useMemo(() => ({ [`__scope${e}`]: { ...n, [e]: r } }), [n, r])
    }
  }
  return ((i.scopeName = e), [r, F(i, ...t)])
}
function F(...e) {
  let t = e[0]
  if (e.length === 1) return t
  let n = () => {
    let n = e.map((e) => ({ useScope: e(), scopeName: e.scopeName }))
    return function (e) {
      let r = n.reduce((t, { useScope: n, scopeName: r }) => {
        let i = n(e)[`__scope${r}`]
        return { ...t, ...i }
      }, {})
      return p.useMemo(() => ({ [`__scope${t.scopeName}`]: r }), [r])
    }
  }
  return ((n.scopeName = t.scopeName), n)
}
function I(e) {
  let t = L(e),
    n = p.forwardRef((e, n) => {
      let { children: r, ...i } = e,
        a = p.Children.toArray(r),
        o = a.find(ne)
      if (o) {
        let e = o.props.children,
          r = a.map((t) =>
            t === o
              ? p.Children.count(e) > 1
                ? p.Children.only(null)
                : p.isValidElement(e)
                  ? e.props.children
                  : null
              : t,
          )
        return (0, M.jsx)(t, {
          ...i,
          ref: n,
          children: p.isValidElement(e) ? p.cloneElement(e, void 0, r) : null,
        })
      }
      return (0, M.jsx)(t, { ...i, ref: n, children: r })
    })
  return ((n.displayName = `${e}.Slot`), n)
}
function L(e) {
  let t = p.forwardRef((e, t) => {
    let { children: n, ...r } = e
    if (p.isValidElement(n)) {
      let e = ie(n),
        i = re(r, n.props)
      return (n.type !== p.Fragment && (i.ref = t ? O(t, e) : e), p.cloneElement(n, i))
    }
    return p.Children.count(n) > 1 ? p.Children.only(null) : null
  })
  return ((t.displayName = `${e}.SlotClone`), t)
}
var ee = Symbol(`radix.slottable`)
function te(e) {
  let t = ({ children: e }) => (0, M.jsx)(M.Fragment, { children: e })
  return ((t.displayName = `${e}.Slottable`), (t.__radixId = ee), t)
}
function ne(e) {
  return (
    p.isValidElement(e) &&
    typeof e.type == `function` &&
    `__radixId` in e.type &&
    e.type.__radixId === ee
  )
}
function re(e, t) {
  let n = { ...t }
  for (let r in t) {
    let i = e[r],
      a = t[r]
    ;/^on[A-Z]/.test(r)
      ? i && a
        ? (n[r] = (...e) => {
            let t = a(...e)
            return (i(...e), t)
          })
        : i && (n[r] = i)
      : r === `style`
        ? (n[r] = { ...i, ...a })
        : r === `className` && (n[r] = [i, a].filter(Boolean).join(` `))
  }
  return { ...e, ...n }
}
function ie(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, `ref`)?.get,
    n = t && `isReactWarning` in t && t.isReactWarning
  return n
    ? e.ref
    : ((t = Object.getOwnPropertyDescriptor(e, `ref`)?.get),
      (n = t && `isReactWarning` in t && t.isReactWarning),
      n ? e.props.ref : e.props.ref || e.ref)
}
var ae = c(f(), 1),
  oe = [
    `a`,
    `button`,
    `div`,
    `form`,
    `h2`,
    `h3`,
    `img`,
    `input`,
    `label`,
    `li`,
    `nav`,
    `ol`,
    `p`,
    `select`,
    `span`,
    `svg`,
    `ul`,
  ].reduce((e, t) => {
    let n = I(`Primitive.${t}`),
      r = p.forwardRef((e, r) => {
        let { asChild: i, ...a } = e,
          o = i ? n : t
        return (
          typeof window < `u` && (window[Symbol.for(`radix-ui`)] = !0),
          (0, M.jsx)(o, { ...a, ref: r })
        )
      })
    return ((r.displayName = `Primitive.${t}`), { ...e, [t]: r })
  }, {})
function se(e, t) {
  e && ae.flushSync(() => e.dispatchEvent(t))
}
function ce(e) {
  let t = p.useRef(e)
  return (
    p.useEffect(() => {
      t.current = e
    }),
    p.useMemo(
      () =>
        (...e) =>
          t.current?.(...e),
      [],
    )
  )
}
var le = globalThis?.document ? p.useLayoutEffect : () => {}
function ue(e, t) {
  return p.useReducer((e, n) => t[e][n] ?? e, e)
}
var de = (e) => {
  let { present: t, children: n } = e,
    r = fe(t),
    i = typeof n == `function` ? n({ present: r.isPresent }) : p.Children.only(n),
    a = k(r.ref, pe(i))
  return typeof n == `function` || r.isPresent ? p.cloneElement(i, { ref: a }) : null
}
de.displayName = `Presence`
function fe(e) {
  let [t, n] = p.useState(),
    r = p.useRef(null),
    i = p.useRef(e),
    a = p.useRef(`none`),
    [o, s] = ue(e ? `mounted` : `unmounted`, {
      mounted: { UNMOUNT: `unmounted`, ANIMATION_OUT: `unmountSuspended` },
      unmountSuspended: { MOUNT: `mounted`, ANIMATION_END: `unmounted` },
      unmounted: { MOUNT: `mounted` },
    })
  return (
    p.useEffect(() => {
      let e = R(r.current)
      a.current = o === `mounted` ? e : `none`
    }, [o]),
    le(() => {
      let t = r.current,
        n = i.current
      if (n !== e) {
        let r = a.current,
          o = R(t)
        ;(e
          ? s(`MOUNT`)
          : o === `none` || t?.display === `none`
            ? s(`UNMOUNT`)
            : s(n && r !== o ? `ANIMATION_OUT` : `UNMOUNT`),
          (i.current = e))
      }
    }, [e, s]),
    le(() => {
      if (t) {
        let e,
          n = t.ownerDocument.defaultView ?? window,
          o = (a) => {
            let o = R(r.current).includes(CSS.escape(a.animationName))
            if (a.target === t && o && (s(`ANIMATION_END`), !i.current)) {
              let r = t.style.animationFillMode
              ;((t.style.animationFillMode = `forwards`),
                (e = n.setTimeout(() => {
                  t.style.animationFillMode === `forwards` && (t.style.animationFillMode = r)
                })))
            }
          },
          c = (e) => {
            e.target === t && (a.current = R(r.current))
          }
        return (
          t.addEventListener(`animationstart`, c),
          t.addEventListener(`animationcancel`, o),
          t.addEventListener(`animationend`, o),
          () => {
            ;(n.clearTimeout(e),
              t.removeEventListener(`animationstart`, c),
              t.removeEventListener(`animationcancel`, o),
              t.removeEventListener(`animationend`, o))
          }
        )
      } else s(`ANIMATION_END`)
    }, [t, s]),
    {
      isPresent: [`mounted`, `unmountSuspended`].includes(o),
      ref: p.useCallback((e) => {
        ;((r.current = e ? getComputedStyle(e) : null), n(e))
      }, []),
    }
  )
}
function R(e) {
  return e?.animationName || `none`
}
function pe(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, `ref`)?.get,
    n = t && `isReactWarning` in t && t.isReactWarning
  return n
    ? e.ref
    : ((t = Object.getOwnPropertyDescriptor(e, `ref`)?.get),
      (n = t && `isReactWarning` in t && t.isReactWarning),
      n ? e.props.ref : e.props.ref || e.ref)
}
function me(e) {
  var t,
    n,
    r = ``
  if (typeof e == `string` || typeof e == `number`) r += e
  else if (typeof e == `object`)
    if (Array.isArray(e)) {
      var i = e.length
      for (t = 0; t < i; t++) e[t] && (n = me(e[t])) && (r && (r += ` `), (r += n))
    } else for (n in e) e[n] && (r && (r += ` `), (r += n))
  return r
}
function he() {
  for (var e, t, n = 0, r = ``, i = arguments.length; n < i; n++)
    (e = arguments[n]) && (t = me(e)) && (r && (r += ` `), (r += t))
  return r
}
var ge = (e) => (typeof e == `boolean` ? `${e}` : e === 0 ? `0` : e),
  _e = he,
  ve = (e, t) => (n) => {
    if (t?.variants == null) return _e(e, n?.class, n?.className)
    let { variants: r, defaultVariants: i } = t,
      a = Object.keys(r).map((e) => {
        let t = n?.[e],
          a = i?.[e]
        if (t === null) return null
        let o = ge(t) || ge(a)
        return r[e][o]
      }),
      o =
        n &&
        Object.entries(n).reduce((e, t) => {
          let [n, r] = t
          return (r === void 0 || (e[n] = r), e)
        }, {})
    return _e(
      e,
      a,
      t?.compoundVariants?.reduce((e, t) => {
        let { class: n, className: r, ...a } = t
        return Object.entries(a).every((e) => {
          let [t, n] = e
          return Array.isArray(n) ? n.includes({ ...i, ...o }[t]) : { ...i, ...o }[t] === n
        })
          ? [...e, n, r]
          : e
      }, []),
      n?.class,
      n?.className,
    )
  },
  ye = (...e) =>
    e
      .filter((e, t, n) => !!e && e.trim() !== `` && n.indexOf(e) === t)
      .join(` `)
      .trim(),
  be = (e) => e.replace(/([a-z0-9])([A-Z])/g, `$1-$2`).toLowerCase(),
  xe = (e) =>
    e.replace(/^([A-Z])|[\s-_]+(\w)/g, (e, t, n) => (n ? n.toUpperCase() : t.toLowerCase())),
  Se = (e) => {
    let t = xe(e)
    return t.charAt(0).toUpperCase() + t.slice(1)
  },
  Ce = {
    xmlns: `http://www.w3.org/2000/svg`,
    width: 24,
    height: 24,
    viewBox: `0 0 24 24`,
    fill: `none`,
    stroke: `currentColor`,
    strokeWidth: 2,
    strokeLinecap: `round`,
    strokeLinejoin: `round`,
  },
  we = (e) => {
    for (let t in e) if (t.startsWith(`aria-`) || t === `role` || t === `title`) return !0
    return !1
  },
  Te = (0, p.forwardRef)(
    (
      {
        color: e = `currentColor`,
        size: t = 24,
        strokeWidth: n = 2,
        absoluteStrokeWidth: r,
        className: i = ``,
        children: a,
        iconNode: o,
        ...s
      },
      c,
    ) =>
      (0, p.createElement)(
        `svg`,
        {
          ref: c,
          ...Ce,
          width: t,
          height: t,
          stroke: e,
          strokeWidth: r ? (Number(n) * 24) / Number(t) : n,
          className: ye(`lucide`, i),
          ...(!a && !we(s) && { 'aria-hidden': `true` }),
          ...s,
        },
        [...o.map(([e, t]) => (0, p.createElement)(e, t)), ...(Array.isArray(a) ? a : [a])],
      ),
  ),
  Ee = (e, t) => {
    let n = (0, p.forwardRef)(({ className: n, ...r }, i) =>
      (0, p.createElement)(Te, {
        ref: i,
        iconNode: t,
        className: ye(`lucide-${be(Se(e))}`, `lucide-${e}`, n),
        ...r,
      }),
    )
    return ((n.displayName = Se(e)), n)
  },
  De = Ee(`x`, [
    [`path`, { d: `M18 6 6 18`, key: `1bl5f8` }],
    [`path`, { d: `m6 6 12 12`, key: `d8bk6v` }],
  ]),
  Oe = `-`,
  ke = (e) => {
    let t = Ne(e),
      { conflictingClassGroups: n, conflictingClassGroupModifiers: r } = e
    return {
      getClassGroupId: (e) => {
        let n = e.split(Oe)
        return (n[0] === `` && n.length !== 1 && n.shift(), Ae(n, t) || Me(e))
      },
      getConflictingClassGroupIds: (e, t) => {
        let i = n[e] || []
        return t && r[e] ? [...i, ...r[e]] : i
      },
    }
  },
  Ae = (e, t) => {
    if (e.length === 0) return t.classGroupId
    let n = e[0],
      r = t.nextPart.get(n),
      i = r ? Ae(e.slice(1), r) : void 0
    if (i) return i
    if (t.validators.length === 0) return
    let a = e.join(Oe)
    return t.validators.find(({ validator: e }) => e(a))?.classGroupId
  },
  je = /^\[(.+)\]$/,
  Me = (e) => {
    if (je.test(e)) {
      let t = je.exec(e)[1],
        n = t?.substring(0, t.indexOf(`:`))
      if (n) return `arbitrary..` + n
    }
  },
  Ne = (e) => {
    let { theme: t, prefix: n } = e,
      r = { nextPart: new Map(), validators: [] }
    return (
      Le(Object.entries(e.classGroups), n).forEach(([e, n]) => {
        Pe(n, r, e, t)
      }),
      r
    )
  },
  Pe = (e, t, n, r) => {
    e.forEach((e) => {
      if (typeof e == `string`) {
        let r = e === `` ? t : Fe(t, e)
        r.classGroupId = n
        return
      }
      if (typeof e == `function`) {
        if (Ie(e)) {
          Pe(e(r), t, n, r)
          return
        }
        t.validators.push({ validator: e, classGroupId: n })
        return
      }
      Object.entries(e).forEach(([e, i]) => {
        Pe(i, Fe(t, e), n, r)
      })
    })
  },
  Fe = (e, t) => {
    let n = e
    return (
      t.split(Oe).forEach((e) => {
        ;(n.nextPart.has(e) || n.nextPart.set(e, { nextPart: new Map(), validators: [] }),
          (n = n.nextPart.get(e)))
      }),
      n
    )
  },
  Ie = (e) => e.isThemeGetter,
  Le = (e, t) =>
    t
      ? e.map(([e, n]) => [
          e,
          n.map((e) =>
            typeof e == `string`
              ? t + e
              : typeof e == `object`
                ? Object.fromEntries(Object.entries(e).map(([e, n]) => [t + e, n]))
                : e,
          ),
        ])
      : e,
  Re = (e) => {
    if (e < 1) return { get: () => void 0, set: () => {} }
    let t = 0,
      n = new Map(),
      r = new Map(),
      i = (i, a) => {
        ;(n.set(i, a), t++, t > e && ((t = 0), (r = n), (n = new Map())))
      }
    return {
      get(e) {
        let t = n.get(e)
        if (t !== void 0) return t
        if ((t = r.get(e)) !== void 0) return (i(e, t), t)
      },
      set(e, t) {
        n.has(e) ? n.set(e, t) : i(e, t)
      },
    }
  },
  ze = `!`,
  Be = (e) => {
    let { separator: t, experimentalParseClassName: n } = e,
      r = t.length === 1,
      i = t[0],
      a = t.length,
      o = (e) => {
        let n = [],
          o = 0,
          s = 0,
          c
        for (let l = 0; l < e.length; l++) {
          let u = e[l]
          if (o === 0) {
            if (u === i && (r || e.slice(l, l + a) === t)) {
              ;(n.push(e.slice(s, l)), (s = l + a))
              continue
            }
            if (u === `/`) {
              c = l
              continue
            }
          }
          u === `[` ? o++ : u === `]` && o--
        }
        let l = n.length === 0 ? e : e.substring(s),
          u = l.startsWith(ze)
        return {
          modifiers: n,
          hasImportantModifier: u,
          baseClassName: u ? l.substring(1) : l,
          maybePostfixModifierPosition: c && c > s ? c - s : void 0,
        }
      }
    return n ? (e) => n({ className: e, parseClassName: o }) : o
  },
  Ve = (e) => {
    if (e.length <= 1) return e
    let t = [],
      n = []
    return (
      e.forEach((e) => {
        e[0] === `[` ? (t.push(...n.sort(), e), (n = [])) : n.push(e)
      }),
      t.push(...n.sort()),
      t
    )
  },
  He = (e) => ({ cache: Re(e.cacheSize), parseClassName: Be(e), ...ke(e) }),
  Ue = /\s+/,
  We = (e, t) => {
    let { parseClassName: n, getClassGroupId: r, getConflictingClassGroupIds: i } = t,
      a = [],
      o = e.trim().split(Ue),
      s = ``
    for (let e = o.length - 1; e >= 0; --e) {
      let t = o[e],
        {
          modifiers: c,
          hasImportantModifier: l,
          baseClassName: u,
          maybePostfixModifierPosition: d,
        } = n(t),
        f = !!d,
        p = r(f ? u.substring(0, d) : u)
      if (!p) {
        if (!f) {
          s = t + (s.length > 0 ? ` ` + s : s)
          continue
        }
        if (((p = r(u)), !p)) {
          s = t + (s.length > 0 ? ` ` + s : s)
          continue
        }
        f = !1
      }
      let m = Ve(c).join(`:`),
        h = l ? m + ze : m,
        g = h + p
      if (a.includes(g)) continue
      a.push(g)
      let _ = i(p, f)
      for (let e = 0; e < _.length; ++e) {
        let t = _[e]
        a.push(h + t)
      }
      s = t + (s.length > 0 ? ` ` + s : s)
    }
    return s
  }
function Ge() {
  let e = 0,
    t,
    n,
    r = ``
  for (; e < arguments.length; ) (t = arguments[e++]) && (n = Ke(t)) && (r && (r += ` `), (r += n))
  return r
}
var Ke = (e) => {
  if (typeof e == `string`) return e
  let t,
    n = ``
  for (let r = 0; r < e.length; r++) e[r] && (t = Ke(e[r])) && (n && (n += ` `), (n += t))
  return n
}
function qe(e, ...t) {
  let n,
    r,
    i,
    a = o
  function o(o) {
    return (
      (n = He(t.reduce((e, t) => t(e), e()))), (r = n.cache.get), (i = n.cache.set), (a = s), s(o)
    )
  }
  function s(e) {
    let t = r(e)
    if (t) return t
    let a = We(e, n)
    return (i(e, a), a)
  }
  return function () {
    return a(Ge.apply(null, arguments))
  }
}
var z = (e) => {
    let t = (t) => t[e] || []
    return ((t.isThemeGetter = !0), t)
  },
  Je = /^\[(?:([a-z-]+):)?(.+)\]$/i,
  Ye = /^\d+\/\d+$/,
  Xe = new Set([`px`, `full`, `screen`]),
  Ze = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/,
  Qe =
    /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/,
  $e = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/,
  et = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/,
  tt =
    /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/,
  B = (e) => H(e) || Xe.has(e) || Ye.test(e),
  V = (e) => q(e, `length`, ut),
  H = (e) => !!e && !Number.isNaN(Number(e)),
  nt = (e) => q(e, `number`, H),
  U = (e) => !!e && Number.isInteger(Number(e)),
  rt = (e) => e.endsWith(`%`) && H(e.slice(0, -1)),
  W = (e) => Je.test(e),
  G = (e) => Ze.test(e),
  it = new Set([`length`, `size`, `percentage`]),
  at = (e) => q(e, it, dt),
  ot = (e) => q(e, `position`, dt),
  st = new Set([`image`, `url`]),
  ct = (e) => q(e, st, pt),
  lt = (e) => q(e, ``, ft),
  K = () => !0,
  q = (e, t, n) => {
    let r = Je.exec(e)
    return r ? (r[1] ? (typeof t == `string` ? r[1] === t : t.has(r[1])) : n(r[2])) : !1
  },
  ut = (e) => Qe.test(e) && !$e.test(e),
  dt = () => !1,
  ft = (e) => et.test(e),
  pt = (e) => tt.test(e),
  mt = qe(() => {
    let e = z(`colors`),
      t = z(`spacing`),
      n = z(`blur`),
      r = z(`brightness`),
      i = z(`borderColor`),
      a = z(`borderRadius`),
      o = z(`borderSpacing`),
      s = z(`borderWidth`),
      c = z(`contrast`),
      l = z(`grayscale`),
      u = z(`hueRotate`),
      d = z(`invert`),
      f = z(`gap`),
      p = z(`gradientColorStops`),
      m = z(`gradientColorStopPositions`),
      h = z(`inset`),
      g = z(`margin`),
      _ = z(`opacity`),
      v = z(`padding`),
      y = z(`saturate`),
      b = z(`scale`),
      x = z(`sepia`),
      S = z(`skew`),
      C = z(`space`),
      w = z(`translate`),
      T = () => [`auto`, `contain`, `none`],
      E = () => [`auto`, `hidden`, `clip`, `visible`, `scroll`],
      D = () => [`auto`, W, t],
      O = () => [W, t],
      k = () => [``, B, V],
      A = () => [`auto`, H, W],
      j = () => [
        `bottom`,
        `center`,
        `left`,
        `left-bottom`,
        `left-top`,
        `right`,
        `right-bottom`,
        `right-top`,
        `top`,
      ],
      M = () => [`solid`, `dashed`, `dotted`, `double`, `none`],
      N = () => [
        `normal`,
        `multiply`,
        `screen`,
        `overlay`,
        `darken`,
        `lighten`,
        `color-dodge`,
        `color-burn`,
        `hard-light`,
        `soft-light`,
        `difference`,
        `exclusion`,
        `hue`,
        `saturation`,
        `color`,
        `luminosity`,
      ],
      P = () => [`start`, `end`, `center`, `between`, `around`, `evenly`, `stretch`],
      F = () => [``, `0`, W],
      I = () => [`auto`, `avoid`, `all`, `avoid-page`, `page`, `left`, `right`, `column`],
      L = () => [H, W]
    return {
      cacheSize: 500,
      separator: `:`,
      theme: {
        colors: [K],
        spacing: [B, V],
        blur: [`none`, ``, G, W],
        brightness: L(),
        borderColor: [e],
        borderRadius: [`none`, ``, `full`, G, W],
        borderSpacing: O(),
        borderWidth: k(),
        contrast: L(),
        grayscale: F(),
        hueRotate: L(),
        invert: F(),
        gap: O(),
        gradientColorStops: [e],
        gradientColorStopPositions: [rt, V],
        inset: D(),
        margin: D(),
        opacity: L(),
        padding: O(),
        saturate: L(),
        scale: L(),
        sepia: F(),
        skew: L(),
        space: O(),
        translate: O(),
      },
      classGroups: {
        aspect: [{ aspect: [`auto`, `square`, `video`, W] }],
        container: [`container`],
        columns: [{ columns: [G] }],
        'break-after': [{ 'break-after': I() }],
        'break-before': [{ 'break-before': I() }],
        'break-inside': [{ 'break-inside': [`auto`, `avoid`, `avoid-page`, `avoid-column`] }],
        'box-decoration': [{ 'box-decoration': [`slice`, `clone`] }],
        box: [{ box: [`border`, `content`] }],
        display: [
          `block`,
          `inline-block`,
          `inline`,
          `flex`,
          `inline-flex`,
          `table`,
          `inline-table`,
          `table-caption`,
          `table-cell`,
          `table-column`,
          `table-column-group`,
          `table-footer-group`,
          `table-header-group`,
          `table-row-group`,
          `table-row`,
          `flow-root`,
          `grid`,
          `inline-grid`,
          `contents`,
          `list-item`,
          `hidden`,
        ],
        float: [{ float: [`right`, `left`, `none`, `start`, `end`] }],
        clear: [{ clear: [`left`, `right`, `both`, `none`, `start`, `end`] }],
        isolation: [`isolate`, `isolation-auto`],
        'object-fit': [{ object: [`contain`, `cover`, `fill`, `none`, `scale-down`] }],
        'object-position': [{ object: [...j(), W] }],
        overflow: [{ overflow: E() }],
        'overflow-x': [{ 'overflow-x': E() }],
        'overflow-y': [{ 'overflow-y': E() }],
        overscroll: [{ overscroll: T() }],
        'overscroll-x': [{ 'overscroll-x': T() }],
        'overscroll-y': [{ 'overscroll-y': T() }],
        position: [`static`, `fixed`, `absolute`, `relative`, `sticky`],
        inset: [{ inset: [h] }],
        'inset-x': [{ 'inset-x': [h] }],
        'inset-y': [{ 'inset-y': [h] }],
        start: [{ start: [h] }],
        end: [{ end: [h] }],
        top: [{ top: [h] }],
        right: [{ right: [h] }],
        bottom: [{ bottom: [h] }],
        left: [{ left: [h] }],
        visibility: [`visible`, `invisible`, `collapse`],
        z: [{ z: [`auto`, U, W] }],
        basis: [{ basis: D() }],
        'flex-direction': [{ flex: [`row`, `row-reverse`, `col`, `col-reverse`] }],
        'flex-wrap': [{ flex: [`wrap`, `wrap-reverse`, `nowrap`] }],
        flex: [{ flex: [`1`, `auto`, `initial`, `none`, W] }],
        grow: [{ grow: F() }],
        shrink: [{ shrink: F() }],
        order: [{ order: [`first`, `last`, `none`, U, W] }],
        'grid-cols': [{ 'grid-cols': [K] }],
        'col-start-end': [{ col: [`auto`, { span: [`full`, U, W] }, W] }],
        'col-start': [{ 'col-start': A() }],
        'col-end': [{ 'col-end': A() }],
        'grid-rows': [{ 'grid-rows': [K] }],
        'row-start-end': [{ row: [`auto`, { span: [U, W] }, W] }],
        'row-start': [{ 'row-start': A() }],
        'row-end': [{ 'row-end': A() }],
        'grid-flow': [{ 'grid-flow': [`row`, `col`, `dense`, `row-dense`, `col-dense`] }],
        'auto-cols': [{ 'auto-cols': [`auto`, `min`, `max`, `fr`, W] }],
        'auto-rows': [{ 'auto-rows': [`auto`, `min`, `max`, `fr`, W] }],
        gap: [{ gap: [f] }],
        'gap-x': [{ 'gap-x': [f] }],
        'gap-y': [{ 'gap-y': [f] }],
        'justify-content': [{ justify: [`normal`, ...P()] }],
        'justify-items': [{ 'justify-items': [`start`, `end`, `center`, `stretch`] }],
        'justify-self': [{ 'justify-self': [`auto`, `start`, `end`, `center`, `stretch`] }],
        'align-content': [{ content: [`normal`, ...P(), `baseline`] }],
        'align-items': [{ items: [`start`, `end`, `center`, `baseline`, `stretch`] }],
        'align-self': [{ self: [`auto`, `start`, `end`, `center`, `stretch`, `baseline`] }],
        'place-content': [{ 'place-content': [...P(), `baseline`] }],
        'place-items': [{ 'place-items': [`start`, `end`, `center`, `baseline`, `stretch`] }],
        'place-self': [{ 'place-self': [`auto`, `start`, `end`, `center`, `stretch`] }],
        p: [{ p: [v] }],
        px: [{ px: [v] }],
        py: [{ py: [v] }],
        ps: [{ ps: [v] }],
        pe: [{ pe: [v] }],
        pt: [{ pt: [v] }],
        pr: [{ pr: [v] }],
        pb: [{ pb: [v] }],
        pl: [{ pl: [v] }],
        m: [{ m: [g] }],
        mx: [{ mx: [g] }],
        my: [{ my: [g] }],
        ms: [{ ms: [g] }],
        me: [{ me: [g] }],
        mt: [{ mt: [g] }],
        mr: [{ mr: [g] }],
        mb: [{ mb: [g] }],
        ml: [{ ml: [g] }],
        'space-x': [{ 'space-x': [C] }],
        'space-x-reverse': [`space-x-reverse`],
        'space-y': [{ 'space-y': [C] }],
        'space-y-reverse': [`space-y-reverse`],
        w: [{ w: [`auto`, `min`, `max`, `fit`, `svw`, `lvw`, `dvw`, W, t] }],
        'min-w': [{ 'min-w': [W, t, `min`, `max`, `fit`] }],
        'max-w': [
          { 'max-w': [W, t, `none`, `full`, `min`, `max`, `fit`, `prose`, { screen: [G] }, G] },
        ],
        h: [{ h: [W, t, `auto`, `min`, `max`, `fit`, `svh`, `lvh`, `dvh`] }],
        'min-h': [{ 'min-h': [W, t, `min`, `max`, `fit`, `svh`, `lvh`, `dvh`] }],
        'max-h': [{ 'max-h': [W, t, `min`, `max`, `fit`, `svh`, `lvh`, `dvh`] }],
        size: [{ size: [W, t, `auto`, `min`, `max`, `fit`] }],
        'font-size': [{ text: [`base`, G, V] }],
        'font-smoothing': [`antialiased`, `subpixel-antialiased`],
        'font-style': [`italic`, `not-italic`],
        'font-weight': [
          {
            font: [
              `thin`,
              `extralight`,
              `light`,
              `normal`,
              `medium`,
              `semibold`,
              `bold`,
              `extrabold`,
              `black`,
              nt,
            ],
          },
        ],
        'font-family': [{ font: [K] }],
        'fvn-normal': [`normal-nums`],
        'fvn-ordinal': [`ordinal`],
        'fvn-slashed-zero': [`slashed-zero`],
        'fvn-figure': [`lining-nums`, `oldstyle-nums`],
        'fvn-spacing': [`proportional-nums`, `tabular-nums`],
        'fvn-fraction': [`diagonal-fractions`, `stacked-fractions`],
        tracking: [{ tracking: [`tighter`, `tight`, `normal`, `wide`, `wider`, `widest`, W] }],
        'line-clamp': [{ 'line-clamp': [`none`, H, nt] }],
        leading: [{ leading: [`none`, `tight`, `snug`, `normal`, `relaxed`, `loose`, B, W] }],
        'list-image': [{ 'list-image': [`none`, W] }],
        'list-style-type': [{ list: [`none`, `disc`, `decimal`, W] }],
        'list-style-position': [{ list: [`inside`, `outside`] }],
        'placeholder-color': [{ placeholder: [e] }],
        'placeholder-opacity': [{ 'placeholder-opacity': [_] }],
        'text-alignment': [{ text: [`left`, `center`, `right`, `justify`, `start`, `end`] }],
        'text-color': [{ text: [e] }],
        'text-opacity': [{ 'text-opacity': [_] }],
        'text-decoration': [`underline`, `overline`, `line-through`, `no-underline`],
        'text-decoration-style': [{ decoration: [...M(), `wavy`] }],
        'text-decoration-thickness': [{ decoration: [`auto`, `from-font`, B, V] }],
        'underline-offset': [{ 'underline-offset': [`auto`, B, W] }],
        'text-decoration-color': [{ decoration: [e] }],
        'text-transform': [`uppercase`, `lowercase`, `capitalize`, `normal-case`],
        'text-overflow': [`truncate`, `text-ellipsis`, `text-clip`],
        'text-wrap': [{ text: [`wrap`, `nowrap`, `balance`, `pretty`] }],
        indent: [{ indent: O() }],
        'vertical-align': [
          {
            align: [
              `baseline`,
              `top`,
              `middle`,
              `bottom`,
              `text-top`,
              `text-bottom`,
              `sub`,
              `super`,
              W,
            ],
          },
        ],
        whitespace: [
          { whitespace: [`normal`, `nowrap`, `pre`, `pre-line`, `pre-wrap`, `break-spaces`] },
        ],
        break: [{ break: [`normal`, `words`, `all`, `keep`] }],
        hyphens: [{ hyphens: [`none`, `manual`, `auto`] }],
        content: [{ content: [`none`, W] }],
        'bg-attachment': [{ bg: [`fixed`, `local`, `scroll`] }],
        'bg-clip': [{ 'bg-clip': [`border`, `padding`, `content`, `text`] }],
        'bg-opacity': [{ 'bg-opacity': [_] }],
        'bg-origin': [{ 'bg-origin': [`border`, `padding`, `content`] }],
        'bg-position': [{ bg: [...j(), ot] }],
        'bg-repeat': [{ bg: [`no-repeat`, { repeat: [``, `x`, `y`, `round`, `space`] }] }],
        'bg-size': [{ bg: [`auto`, `cover`, `contain`, at] }],
        'bg-image': [
          { bg: [`none`, { 'gradient-to': [`t`, `tr`, `r`, `br`, `b`, `bl`, `l`, `tl`] }, ct] },
        ],
        'bg-color': [{ bg: [e] }],
        'gradient-from-pos': [{ from: [m] }],
        'gradient-via-pos': [{ via: [m] }],
        'gradient-to-pos': [{ to: [m] }],
        'gradient-from': [{ from: [p] }],
        'gradient-via': [{ via: [p] }],
        'gradient-to': [{ to: [p] }],
        rounded: [{ rounded: [a] }],
        'rounded-s': [{ 'rounded-s': [a] }],
        'rounded-e': [{ 'rounded-e': [a] }],
        'rounded-t': [{ 'rounded-t': [a] }],
        'rounded-r': [{ 'rounded-r': [a] }],
        'rounded-b': [{ 'rounded-b': [a] }],
        'rounded-l': [{ 'rounded-l': [a] }],
        'rounded-ss': [{ 'rounded-ss': [a] }],
        'rounded-se': [{ 'rounded-se': [a] }],
        'rounded-ee': [{ 'rounded-ee': [a] }],
        'rounded-es': [{ 'rounded-es': [a] }],
        'rounded-tl': [{ 'rounded-tl': [a] }],
        'rounded-tr': [{ 'rounded-tr': [a] }],
        'rounded-br': [{ 'rounded-br': [a] }],
        'rounded-bl': [{ 'rounded-bl': [a] }],
        'border-w': [{ border: [s] }],
        'border-w-x': [{ 'border-x': [s] }],
        'border-w-y': [{ 'border-y': [s] }],
        'border-w-s': [{ 'border-s': [s] }],
        'border-w-e': [{ 'border-e': [s] }],
        'border-w-t': [{ 'border-t': [s] }],
        'border-w-r': [{ 'border-r': [s] }],
        'border-w-b': [{ 'border-b': [s] }],
        'border-w-l': [{ 'border-l': [s] }],
        'border-opacity': [{ 'border-opacity': [_] }],
        'border-style': [{ border: [...M(), `hidden`] }],
        'divide-x': [{ 'divide-x': [s] }],
        'divide-x-reverse': [`divide-x-reverse`],
        'divide-y': [{ 'divide-y': [s] }],
        'divide-y-reverse': [`divide-y-reverse`],
        'divide-opacity': [{ 'divide-opacity': [_] }],
        'divide-style': [{ divide: M() }],
        'border-color': [{ border: [i] }],
        'border-color-x': [{ 'border-x': [i] }],
        'border-color-y': [{ 'border-y': [i] }],
        'border-color-s': [{ 'border-s': [i] }],
        'border-color-e': [{ 'border-e': [i] }],
        'border-color-t': [{ 'border-t': [i] }],
        'border-color-r': [{ 'border-r': [i] }],
        'border-color-b': [{ 'border-b': [i] }],
        'border-color-l': [{ 'border-l': [i] }],
        'divide-color': [{ divide: [i] }],
        'outline-style': [{ outline: [``, ...M()] }],
        'outline-offset': [{ 'outline-offset': [B, W] }],
        'outline-w': [{ outline: [B, V] }],
        'outline-color': [{ outline: [e] }],
        'ring-w': [{ ring: k() }],
        'ring-w-inset': [`ring-inset`],
        'ring-color': [{ ring: [e] }],
        'ring-opacity': [{ 'ring-opacity': [_] }],
        'ring-offset-w': [{ 'ring-offset': [B, V] }],
        'ring-offset-color': [{ 'ring-offset': [e] }],
        shadow: [{ shadow: [``, `inner`, `none`, G, lt] }],
        'shadow-color': [{ shadow: [K] }],
        opacity: [{ opacity: [_] }],
        'mix-blend': [{ 'mix-blend': [...N(), `plus-lighter`, `plus-darker`] }],
        'bg-blend': [{ 'bg-blend': N() }],
        filter: [{ filter: [``, `none`] }],
        blur: [{ blur: [n] }],
        brightness: [{ brightness: [r] }],
        contrast: [{ contrast: [c] }],
        'drop-shadow': [{ 'drop-shadow': [``, `none`, G, W] }],
        grayscale: [{ grayscale: [l] }],
        'hue-rotate': [{ 'hue-rotate': [u] }],
        invert: [{ invert: [d] }],
        saturate: [{ saturate: [y] }],
        sepia: [{ sepia: [x] }],
        'backdrop-filter': [{ 'backdrop-filter': [``, `none`] }],
        'backdrop-blur': [{ 'backdrop-blur': [n] }],
        'backdrop-brightness': [{ 'backdrop-brightness': [r] }],
        'backdrop-contrast': [{ 'backdrop-contrast': [c] }],
        'backdrop-grayscale': [{ 'backdrop-grayscale': [l] }],
        'backdrop-hue-rotate': [{ 'backdrop-hue-rotate': [u] }],
        'backdrop-invert': [{ 'backdrop-invert': [d] }],
        'backdrop-opacity': [{ 'backdrop-opacity': [_] }],
        'backdrop-saturate': [{ 'backdrop-saturate': [y] }],
        'backdrop-sepia': [{ 'backdrop-sepia': [x] }],
        'border-collapse': [{ border: [`collapse`, `separate`] }],
        'border-spacing': [{ 'border-spacing': [o] }],
        'border-spacing-x': [{ 'border-spacing-x': [o] }],
        'border-spacing-y': [{ 'border-spacing-y': [o] }],
        'table-layout': [{ table: [`auto`, `fixed`] }],
        caption: [{ caption: [`top`, `bottom`] }],
        transition: [
          { transition: [`none`, `all`, ``, `colors`, `opacity`, `shadow`, `transform`, W] },
        ],
        duration: [{ duration: L() }],
        ease: [{ ease: [`linear`, `in`, `out`, `in-out`, W] }],
        delay: [{ delay: L() }],
        animate: [{ animate: [`none`, `spin`, `ping`, `pulse`, `bounce`, W] }],
        transform: [{ transform: [``, `gpu`, `none`] }],
        scale: [{ scale: [b] }],
        'scale-x': [{ 'scale-x': [b] }],
        'scale-y': [{ 'scale-y': [b] }],
        rotate: [{ rotate: [U, W] }],
        'translate-x': [{ 'translate-x': [w] }],
        'translate-y': [{ 'translate-y': [w] }],
        'skew-x': [{ 'skew-x': [S] }],
        'skew-y': [{ 'skew-y': [S] }],
        'transform-origin': [
          {
            origin: [
              `center`,
              `top`,
              `top-right`,
              `right`,
              `bottom-right`,
              `bottom`,
              `bottom-left`,
              `left`,
              `top-left`,
              W,
            ],
          },
        ],
        accent: [{ accent: [`auto`, e] }],
        appearance: [{ appearance: [`none`, `auto`] }],
        cursor: [
          {
            cursor: [
              `auto`,
              `default`,
              `pointer`,
              `wait`,
              `text`,
              `move`,
              `help`,
              `not-allowed`,
              `none`,
              `context-menu`,
              `progress`,
              `cell`,
              `crosshair`,
              `vertical-text`,
              `alias`,
              `copy`,
              `no-drop`,
              `grab`,
              `grabbing`,
              `all-scroll`,
              `col-resize`,
              `row-resize`,
              `n-resize`,
              `e-resize`,
              `s-resize`,
              `w-resize`,
              `ne-resize`,
              `nw-resize`,
              `se-resize`,
              `sw-resize`,
              `ew-resize`,
              `ns-resize`,
              `nesw-resize`,
              `nwse-resize`,
              `zoom-in`,
              `zoom-out`,
              W,
            ],
          },
        ],
        'caret-color': [{ caret: [e] }],
        'pointer-events': [{ 'pointer-events': [`none`, `auto`] }],
        resize: [{ resize: [`none`, `y`, `x`, ``] }],
        'scroll-behavior': [{ scroll: [`auto`, `smooth`] }],
        'scroll-m': [{ 'scroll-m': O() }],
        'scroll-mx': [{ 'scroll-mx': O() }],
        'scroll-my': [{ 'scroll-my': O() }],
        'scroll-ms': [{ 'scroll-ms': O() }],
        'scroll-me': [{ 'scroll-me': O() }],
        'scroll-mt': [{ 'scroll-mt': O() }],
        'scroll-mr': [{ 'scroll-mr': O() }],
        'scroll-mb': [{ 'scroll-mb': O() }],
        'scroll-ml': [{ 'scroll-ml': O() }],
        'scroll-p': [{ 'scroll-p': O() }],
        'scroll-px': [{ 'scroll-px': O() }],
        'scroll-py': [{ 'scroll-py': O() }],
        'scroll-ps': [{ 'scroll-ps': O() }],
        'scroll-pe': [{ 'scroll-pe': O() }],
        'scroll-pt': [{ 'scroll-pt': O() }],
        'scroll-pr': [{ 'scroll-pr': O() }],
        'scroll-pb': [{ 'scroll-pb': O() }],
        'scroll-pl': [{ 'scroll-pl': O() }],
        'snap-align': [{ snap: [`start`, `end`, `center`, `align-none`] }],
        'snap-stop': [{ snap: [`normal`, `always`] }],
        'snap-type': [{ snap: [`none`, `x`, `y`, `both`] }],
        'snap-strictness': [{ snap: [`mandatory`, `proximity`] }],
        touch: [{ touch: [`auto`, `none`, `manipulation`] }],
        'touch-x': [{ 'touch-pan': [`x`, `left`, `right`] }],
        'touch-y': [{ 'touch-pan': [`y`, `up`, `down`] }],
        'touch-pz': [`touch-pinch-zoom`],
        select: [{ select: [`none`, `text`, `all`, `auto`] }],
        'will-change': [{ 'will-change': [`auto`, `scroll`, `contents`, `transform`, W] }],
        fill: [{ fill: [e, `none`] }],
        'stroke-w': [{ stroke: [B, V, nt] }],
        stroke: [{ stroke: [e, `none`] }],
        sr: [`sr-only`, `not-sr-only`],
        'forced-color-adjust': [{ 'forced-color-adjust': [`auto`, `none`] }],
      },
      conflictingClassGroups: {
        overflow: [`overflow-x`, `overflow-y`],
        overscroll: [`overscroll-x`, `overscroll-y`],
        inset: [`inset-x`, `inset-y`, `start`, `end`, `top`, `right`, `bottom`, `left`],
        'inset-x': [`right`, `left`],
        'inset-y': [`top`, `bottom`],
        flex: [`basis`, `grow`, `shrink`],
        gap: [`gap-x`, `gap-y`],
        p: [`px`, `py`, `ps`, `pe`, `pt`, `pr`, `pb`, `pl`],
        px: [`pr`, `pl`],
        py: [`pt`, `pb`],
        m: [`mx`, `my`, `ms`, `me`, `mt`, `mr`, `mb`, `ml`],
        mx: [`mr`, `ml`],
        my: [`mt`, `mb`],
        size: [`w`, `h`],
        'font-size': [`leading`],
        'fvn-normal': [
          `fvn-ordinal`,
          `fvn-slashed-zero`,
          `fvn-figure`,
          `fvn-spacing`,
          `fvn-fraction`,
        ],
        'fvn-ordinal': [`fvn-normal`],
        'fvn-slashed-zero': [`fvn-normal`],
        'fvn-figure': [`fvn-normal`],
        'fvn-spacing': [`fvn-normal`],
        'fvn-fraction': [`fvn-normal`],
        'line-clamp': [`display`, `overflow`],
        rounded: [
          `rounded-s`,
          `rounded-e`,
          `rounded-t`,
          `rounded-r`,
          `rounded-b`,
          `rounded-l`,
          `rounded-ss`,
          `rounded-se`,
          `rounded-ee`,
          `rounded-es`,
          `rounded-tl`,
          `rounded-tr`,
          `rounded-br`,
          `rounded-bl`,
        ],
        'rounded-s': [`rounded-ss`, `rounded-es`],
        'rounded-e': [`rounded-se`, `rounded-ee`],
        'rounded-t': [`rounded-tl`, `rounded-tr`],
        'rounded-r': [`rounded-tr`, `rounded-br`],
        'rounded-b': [`rounded-br`, `rounded-bl`],
        'rounded-l': [`rounded-tl`, `rounded-bl`],
        'border-spacing': [`border-spacing-x`, `border-spacing-y`],
        'border-w': [
          `border-w-s`,
          `border-w-e`,
          `border-w-t`,
          `border-w-r`,
          `border-w-b`,
          `border-w-l`,
        ],
        'border-w-x': [`border-w-r`, `border-w-l`],
        'border-w-y': [`border-w-t`, `border-w-b`],
        'border-color': [
          `border-color-s`,
          `border-color-e`,
          `border-color-t`,
          `border-color-r`,
          `border-color-b`,
          `border-color-l`,
        ],
        'border-color-x': [`border-color-r`, `border-color-l`],
        'border-color-y': [`border-color-t`, `border-color-b`],
        'scroll-m': [
          `scroll-mx`,
          `scroll-my`,
          `scroll-ms`,
          `scroll-me`,
          `scroll-mt`,
          `scroll-mr`,
          `scroll-mb`,
          `scroll-ml`,
        ],
        'scroll-mx': [`scroll-mr`, `scroll-ml`],
        'scroll-my': [`scroll-mt`, `scroll-mb`],
        'scroll-p': [
          `scroll-px`,
          `scroll-py`,
          `scroll-ps`,
          `scroll-pe`,
          `scroll-pt`,
          `scroll-pr`,
          `scroll-pb`,
          `scroll-pl`,
        ],
        'scroll-px': [`scroll-pr`, `scroll-pl`],
        'scroll-py': [`scroll-pt`, `scroll-pb`],
        touch: [`touch-x`, `touch-y`, `touch-pz`],
        'touch-x': [`touch`],
        'touch-y': [`touch`],
        'touch-pz': [`touch`],
      },
      conflictingClassGroupModifiers: { 'font-size': [`leading`] },
    }
  })
function ht(...e) {
  return mt(he(e))
}
var gt = (e) => {
    if (!e) return ``
    let t = e.toString().replace(/\D/g, ``)
    return t.length >= 10 && t.length <= 11
      ? t.replace(/^(\d{2})(\d{4,5})(\d{4})$/, `($1) $2-$3`)
      : e.trim()
  },
  J = class e extends Error {
    constructor(t) {
      ;(super(`ClientResponseError`),
        (this.url = ``),
        (this.status = 0),
        (this.response = {}),
        (this.isAbort = !1),
        (this.originalError = null),
        Object.setPrototypeOf(this, e.prototype),
        typeof t == `object` &&
          t &&
          ((this.originalError = t.originalError),
          (this.url = typeof t.url == `string` ? t.url : ``),
          (this.status = typeof t.status == `number` ? t.status : 0),
          (this.isAbort = !!t.isAbort || t.name === `AbortError` || t.message === `Aborted`),
          t.response !== null && typeof t.response == `object`
            ? (this.response = t.response)
            : t.data !== null && typeof t.data == `object`
              ? (this.response = t.data)
              : (this.response = {})),
        this.originalError || t instanceof e || (this.originalError = t),
        (this.name = `ClientResponseError ` + this.status),
        (this.message = this.response?.message),
        this.message ||
          (this.isAbort
            ? (this.message = `The request was aborted (most likely autocancelled; you can find more info in https://github.com/pocketbase/js-sdk#auto-cancellation).`)
            : this.originalError?.cause?.message?.includes(`ECONNREFUSED ::1`)
              ? (this.message = `Failed to connect to the PocketBase server. Try changing the SDK URL from localhost to 127.0.0.1 (https://github.com/pocketbase/js-sdk/issues/21).`)
              : (this.message = `Something went wrong.`)),
        (this.cause = this.originalError))
    }
    get data() {
      return this.response
    }
    toJSON() {
      return { ...this }
    }
  },
  Y = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/
function _t(e, t) {
  let n = {}
  if (typeof e != `string`) return n
  let r = Object.assign({}, t || {}).decode || yt,
    i = 0
  for (; i < e.length; ) {
    let t = e.indexOf(`=`, i)
    if (t === -1) break
    let a = e.indexOf(`;`, i)
    if (a === -1) a = e.length
    else if (a < t) {
      i = e.lastIndexOf(`;`, t - 1) + 1
      continue
    }
    let o = e.slice(i, t).trim()
    if (n[o] === void 0) {
      let i = e.slice(t + 1, a).trim()
      i.charCodeAt(0) === 34 && (i = i.slice(1, -1))
      try {
        n[o] = r(i)
      } catch {
        n[o] = i
      }
    }
    i = a + 1
  }
  return n
}
function vt(e, t, n) {
  let r = Object.assign({}, n || {}),
    i = r.encode || bt
  if (!Y.test(e)) throw TypeError(`argument name is invalid`)
  let a = i(t)
  if (a && !Y.test(a)) throw TypeError(`argument val is invalid`)
  let o = e + `=` + a
  if (r.maxAge != null) {
    let e = r.maxAge - 0
    if (isNaN(e) || !isFinite(e)) throw TypeError(`option maxAge is invalid`)
    o += `; Max-Age=` + Math.floor(e)
  }
  if (r.domain) {
    if (!Y.test(r.domain)) throw TypeError(`option domain is invalid`)
    o += `; Domain=` + r.domain
  }
  if (r.path) {
    if (!Y.test(r.path)) throw TypeError(`option path is invalid`)
    o += `; Path=` + r.path
  }
  if (r.expires) {
    if (
      !(function (e) {
        return Object.prototype.toString.call(e) === `[object Date]` || e instanceof Date
      })(r.expires) ||
      isNaN(r.expires.valueOf())
    )
      throw TypeError(`option expires is invalid`)
    o += `; Expires=` + r.expires.toUTCString()
  }
  if ((r.httpOnly && (o += `; HttpOnly`), r.secure && (o += `; Secure`), r.priority))
    switch (typeof r.priority == `string` ? r.priority.toLowerCase() : r.priority) {
      case `low`:
        o += `; Priority=Low`
        break
      case `medium`:
        o += `; Priority=Medium`
        break
      case `high`:
        o += `; Priority=High`
        break
      default:
        throw TypeError(`option priority is invalid`)
    }
  if (r.sameSite)
    switch (typeof r.sameSite == `string` ? r.sameSite.toLowerCase() : r.sameSite) {
      case !0:
        o += `; SameSite=Strict`
        break
      case `lax`:
        o += `; SameSite=Lax`
        break
      case `strict`:
        o += `; SameSite=Strict`
        break
      case `none`:
        o += `; SameSite=None`
        break
      default:
        throw TypeError(`option sameSite is invalid`)
    }
  return o
}
function yt(e) {
  return e.indexOf(`%`) === -1 ? e : decodeURIComponent(e)
}
function bt(e) {
  return encodeURIComponent(e)
}
var xt =
    (typeof navigator < `u` && navigator.product === `ReactNative`) ||
    (typeof global < `u` && global.HermesInternal),
  St
function X(e) {
  if (e)
    try {
      let t = decodeURIComponent(
        St(e.split(`.`)[1])
          .split(``)
          .map(function (e) {
            return `%` + (`00` + e.charCodeAt(0).toString(16)).slice(-2)
          })
          .join(``),
      )
      return JSON.parse(t) || {}
    } catch {}
  return {}
}
function Ct(e, t = 0) {
  let n = X(e)
  return !(Object.keys(n).length > 0 && (!n.exp || n.exp - t > Date.now() / 1e3))
}
St =
  typeof atob != `function` || xt
    ? (e) => {
        let t = String(e).replace(/=+$/, ``)
        if (t.length % 4 == 1)
          throw Error(`'atob' failed: The string to be decoded is not correctly encoded.`)
        for (
          var n, r, i = 0, a = 0, o = ``;
          (r = t.charAt(a++));
          ~r &&
          ((n = i % 4 ? 64 * n + r : r), i++ % 4) &&
          (o += String.fromCharCode(255 & (n >> ((-2 * i) & 6))))
        )
          r = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=`.indexOf(r)
        return o
      }
    : atob
var wt = `pb_auth`,
  Tt = class {
    constructor() {
      ;((this.baseToken = ``), (this.baseModel = null), (this._onChangeCallbacks = []))
    }
    get token() {
      return this.baseToken
    }
    get record() {
      return this.baseModel
    }
    get model() {
      return this.baseModel
    }
    get isValid() {
      return !Ct(this.token)
    }
    get isSuperuser() {
      let e = X(this.token)
      return (
        e.type == `auth` &&
        (this.record?.collectionName == `_superusers` ||
          (!this.record?.collectionName && e.collectionId == `pbc_3142635823`))
      )
    }
    get isAdmin() {
      return (
        console.warn(
          `Please replace pb.authStore.isAdmin with pb.authStore.isSuperuser OR simply check the value of pb.authStore.record?.collectionName`,
        ),
        this.isSuperuser
      )
    }
    get isAuthRecord() {
      return (
        console.warn(
          `Please replace pb.authStore.isAuthRecord with !pb.authStore.isSuperuser OR simply check the value of pb.authStore.record?.collectionName`,
        ),
        X(this.token).type == `auth` && !this.isSuperuser
      )
    }
    save(e, t) {
      ;((this.baseToken = e || ``), (this.baseModel = t || null), this.triggerChange())
    }
    clear() {
      ;((this.baseToken = ``), (this.baseModel = null), this.triggerChange())
    }
    loadFromCookie(e, t = wt) {
      let n = _t(e || ``)[t] || ``,
        r = {}
      try {
        ;((r = JSON.parse(n)), (typeof r != `object` || Array.isArray(r)) && (r = {}))
      } catch {}
      this.save(r.token || ``, r.record || r.model || null)
    }
    exportToCookie(e, t = wt) {
      let n = { secure: !0, sameSite: !0, httpOnly: !0, path: `/` },
        r = X(this.token)
      ;((n.expires = r?.exp ? new Date(1e3 * r.exp) : new Date(`1970-01-01`)),
        (e = Object.assign({}, n, e)))
      let i = {
          token: this.token,
          record: this.record ? JSON.parse(JSON.stringify(this.record)) : null,
        },
        a = vt(t, JSON.stringify(i), e),
        o = typeof Blob < `u` ? new Blob([a]).size : a.length
      if (i.record && o > 4096) {
        i.record = { id: i.record?.id, email: i.record?.email }
        let n = [`collectionId`, `collectionName`, `verified`]
        for (let e in this.record) n.includes(e) && (i.record[e] = this.record[e])
        a = vt(t, JSON.stringify(i), e)
      }
      return a
    }
    onChange(e, t = !1) {
      return (
        this._onChangeCallbacks.push(e),
        t && e(this.token, this.record),
        () => {
          for (let t = this._onChangeCallbacks.length - 1; t >= 0; t--)
            if (this._onChangeCallbacks[t] == e)
              return (delete this._onChangeCallbacks[t], void this._onChangeCallbacks.splice(t, 1))
        }
      )
    }
    triggerChange() {
      for (let e of this._onChangeCallbacks) e && e(this.token, this.record)
    }
  },
  Et = class extends Tt {
    constructor(e = `pocketbase_auth`) {
      ;(super(), (this.storageFallback = {}), (this.storageKey = e), this._bindStorageEvent())
    }
    get token() {
      return (this._storageGet(this.storageKey) || {}).token || ``
    }
    get record() {
      let e = this._storageGet(this.storageKey) || {}
      return e.record || e.model || null
    }
    get model() {
      return this.record
    }
    save(e, t) {
      ;(this._storageSet(this.storageKey, { token: e, record: t }), super.save(e, t))
    }
    clear() {
      ;(this._storageRemove(this.storageKey), super.clear())
    }
    _storageGet(e) {
      if (typeof window < `u` && window?.localStorage) {
        let t = window.localStorage.getItem(e) || ``
        try {
          return JSON.parse(t)
        } catch {
          return t
        }
      }
      return this.storageFallback[e]
    }
    _storageSet(e, t) {
      if (typeof window < `u` && window?.localStorage) {
        let n = t
        ;(typeof t != `string` && (n = JSON.stringify(t)), window.localStorage.setItem(e, n))
      } else this.storageFallback[e] = t
    }
    _storageRemove(e) {
      ;(typeof window < `u` && window?.localStorage && window.localStorage?.removeItem(e),
        delete this.storageFallback[e])
    }
    _bindStorageEvent() {
      typeof window < `u` &&
        window?.localStorage &&
        window.addEventListener &&
        window.addEventListener(`storage`, (e) => {
          if (e.key != this.storageKey) return
          let t = this._storageGet(this.storageKey) || {}
          super.save(t.token || ``, t.record || t.model || null)
        })
    }
  },
  Z = class {
    constructor(e) {
      this.client = e
    }
  },
  Dt = class extends Z {
    async getAll(e) {
      return ((e = Object.assign({ method: `GET` }, e)), this.client.send(`/api/settings`, e))
    }
    async update(e, t) {
      return (
        (t = Object.assign({ method: `PATCH`, body: e }, t)), this.client.send(`/api/settings`, t)
      )
    }
    async testS3(e = `storage`, t) {
      return (
        (t = Object.assign({ method: `POST`, body: { filesystem: e } }, t)),
        this.client.send(`/api/settings/test/s3`, t).then(() => !0)
      )
    }
    async testEmail(e, t, n, r) {
      return (
        (r = Object.assign({ method: `POST`, body: { email: t, template: n, collection: e } }, r)),
        this.client.send(`/api/settings/test/email`, r).then(() => !0)
      )
    }
    async generateAppleClientSecret(e, t, n, r, i, a) {
      return (
        (a = Object.assign(
          {
            method: `POST`,
            body: { clientId: e, teamId: t, keyId: n, privateKey: r, duration: i },
          },
          a,
        )),
        this.client.send(`/api/settings/apple/generate-client-secret`, a)
      )
    }
  },
  Ot = [
    `requestKey`,
    `$cancelKey`,
    `$autoCancel`,
    `fetch`,
    `headers`,
    `body`,
    `query`,
    `params`,
    `cache`,
    `credentials`,
    `headers`,
    `integrity`,
    `keepalive`,
    `method`,
    `mode`,
    `redirect`,
    `referrer`,
    `referrerPolicy`,
    `signal`,
    `window`,
  ]
function kt(e) {
  if (e) {
    e.query = e.query || {}
    for (let t in e) Ot.includes(t) || ((e.query[t] = e[t]), delete e[t])
  }
}
function At(e) {
  let t = []
  for (let n in e) {
    let r = encodeURIComponent(n),
      i = Array.isArray(e[n]) ? e[n] : [e[n]]
    for (let e of i) ((e = jt(e)), e !== null && t.push(r + `=` + e))
  }
  return t.join(`&`)
}
function jt(e) {
  return e == null
    ? null
    : e instanceof Date
      ? encodeURIComponent(e.toISOString().replace(`T`, ` `))
      : encodeURIComponent(typeof e == `object` ? JSON.stringify(e) : e)
}
var Mt = class extends Z {
    constructor() {
      ;(super(...arguments),
        (this.clientId = ``),
        (this.eventSource = null),
        (this.subscriptions = {}),
        (this.lastSentSubscriptions = []),
        (this.maxConnectTimeout = 15e3),
        (this.reconnectAttempts = 0),
        (this.maxReconnectAttempts = 1 / 0),
        (this.predefinedReconnectIntervals = [200, 300, 500, 1e3, 1200, 1500, 2e3]),
        (this.pendingConnects = []))
    }
    get isConnected() {
      return !!this.eventSource && !!this.clientId && !this.pendingConnects.length
    }
    async subscribe(e, t, n) {
      if (!e) throw Error(`topic must be set.`)
      let r = e
      if (n) {
        kt((n = Object.assign({}, n)))
        let e =
          `options=` + encodeURIComponent(JSON.stringify({ query: n.query, headers: n.headers }))
        r += (r.includes(`?`) ? `&` : `?`) + e
      }
      let i = function (e) {
        let n = e,
          r
        try {
          r = JSON.parse(n?.data)
        } catch {}
        t(r || {})
      }
      return (
        this.subscriptions[r] || (this.subscriptions[r] = []),
        this.subscriptions[r].push(i),
        this.isConnected
          ? this.subscriptions[r].length === 1
            ? await this.submitSubscriptions()
            : this.eventSource?.addEventListener(r, i)
          : await this.connect(),
        async () => this.unsubscribeByTopicAndListener(e, i)
      )
    }
    async unsubscribe(e) {
      let t = !1
      if (e) {
        let n = this.getSubscriptionsByTopic(e)
        for (let e in n)
          if (this.hasSubscriptionListeners(e)) {
            for (let t of this.subscriptions[e]) this.eventSource?.removeEventListener(e, t)
            ;(delete this.subscriptions[e], (t ||= !0))
          }
      } else this.subscriptions = {}
      this.hasSubscriptionListeners() ? t && (await this.submitSubscriptions()) : this.disconnect()
    }
    async unsubscribeByPrefix(e) {
      let t = !1
      for (let n in this.subscriptions)
        if ((n + `?`).startsWith(e)) {
          t = !0
          for (let e of this.subscriptions[n]) this.eventSource?.removeEventListener(n, e)
          delete this.subscriptions[n]
        }
      t && (this.hasSubscriptionListeners() ? await this.submitSubscriptions() : this.disconnect())
    }
    async unsubscribeByTopicAndListener(e, t) {
      let n = !1,
        r = this.getSubscriptionsByTopic(e)
      for (let e in r) {
        if (!Array.isArray(this.subscriptions[e]) || !this.subscriptions[e].length) continue
        let r = !1
        for (let n = this.subscriptions[e].length - 1; n >= 0; n--)
          this.subscriptions[e][n] === t &&
            ((r = !0),
            delete this.subscriptions[e][n],
            this.subscriptions[e].splice(n, 1),
            this.eventSource?.removeEventListener(e, t))
        r &&
          (this.subscriptions[e].length || delete this.subscriptions[e],
          n || this.hasSubscriptionListeners(e) || (n = !0))
      }
      this.hasSubscriptionListeners() ? n && (await this.submitSubscriptions()) : this.disconnect()
    }
    hasSubscriptionListeners(e) {
      if (((this.subscriptions = this.subscriptions || {}), e))
        return !!this.subscriptions[e]?.length
      for (let e in this.subscriptions) if (this.subscriptions[e]?.length) return !0
      return !1
    }
    async submitSubscriptions() {
      if (this.clientId)
        return (
          this.addAllSubscriptionListeners(),
          (this.lastSentSubscriptions = this.getNonEmptySubscriptionKeys()),
          this.client
            .send(`/api/realtime`, {
              method: `POST`,
              body: { clientId: this.clientId, subscriptions: this.lastSentSubscriptions },
              requestKey: this.getSubscriptionsCancelKey(),
            })
            .catch((e) => {
              if (!e?.isAbort) throw e
            })
        )
    }
    getSubscriptionsCancelKey() {
      return `realtime_` + this.clientId
    }
    getSubscriptionsByTopic(e) {
      let t = {}
      e = e.includes(`?`) ? e : e + `?`
      for (let n in this.subscriptions) (n + `?`).startsWith(e) && (t[n] = this.subscriptions[n])
      return t
    }
    getNonEmptySubscriptionKeys() {
      let e = []
      for (let t in this.subscriptions) this.subscriptions[t].length && e.push(t)
      return e
    }
    addAllSubscriptionListeners() {
      if (this.eventSource) {
        this.removeAllSubscriptionListeners()
        for (let e in this.subscriptions)
          for (let t of this.subscriptions[e]) this.eventSource.addEventListener(e, t)
      }
    }
    removeAllSubscriptionListeners() {
      if (this.eventSource)
        for (let e in this.subscriptions)
          for (let t of this.subscriptions[e]) this.eventSource.removeEventListener(e, t)
    }
    async connect() {
      if (!(this.reconnectAttempts > 0))
        return new Promise((e, t) => {
          ;(this.pendingConnects.push({ resolve: e, reject: t }),
            this.pendingConnects.length > 1 || this.initConnect())
        })
    }
    initConnect() {
      ;(this.disconnect(!0),
        clearTimeout(this.connectTimeoutId),
        (this.connectTimeoutId = setTimeout(() => {
          this.connectErrorHandler(Error(`EventSource connect took too long.`))
        }, this.maxConnectTimeout)),
        (this.eventSource = new EventSource(this.client.buildURL(`/api/realtime`))),
        (this.eventSource.onerror = (e) => {
          this.connectErrorHandler(Error(`Failed to establish realtime connection.`))
        }),
        this.eventSource.addEventListener(`PB_CONNECT`, (e) => {
          ;((this.clientId = e?.lastEventId),
            this.submitSubscriptions()
              .then(async () => {
                let e = 3
                for (; this.hasUnsentSubscriptions() && e > 0; )
                  (e--, await this.submitSubscriptions())
              })
              .then(() => {
                for (let e of this.pendingConnects) e.resolve()
                ;((this.pendingConnects = []),
                  (this.reconnectAttempts = 0),
                  clearTimeout(this.reconnectTimeoutId),
                  clearTimeout(this.connectTimeoutId))
                let t = this.getSubscriptionsByTopic(`PB_CONNECT`)
                for (let n in t) for (let r of t[n]) r(e)
              })
              .catch((e) => {
                ;((this.clientId = ``), this.connectErrorHandler(e))
              }))
        }))
    }
    hasUnsentSubscriptions() {
      let e = this.getNonEmptySubscriptionKeys()
      if (e.length != this.lastSentSubscriptions.length) return !0
      for (let t of e) if (!this.lastSentSubscriptions.includes(t)) return !0
      return !1
    }
    connectErrorHandler(e) {
      if (
        (clearTimeout(this.connectTimeoutId),
        clearTimeout(this.reconnectTimeoutId),
        (!this.clientId && !this.reconnectAttempts) ||
          this.reconnectAttempts > this.maxReconnectAttempts)
      ) {
        for (let t of this.pendingConnects) t.reject(new J(e))
        ;((this.pendingConnects = []), this.disconnect())
        return
      }
      this.disconnect(!0)
      let t =
        this.predefinedReconnectIntervals[this.reconnectAttempts] ||
        this.predefinedReconnectIntervals[this.predefinedReconnectIntervals.length - 1]
      ;(this.reconnectAttempts++,
        (this.reconnectTimeoutId = setTimeout(() => {
          this.initConnect()
        }, t)))
    }
    disconnect(e = !1) {
      if (
        (this.clientId && this.onDisconnect && this.onDisconnect(Object.keys(this.subscriptions)),
        clearTimeout(this.connectTimeoutId),
        clearTimeout(this.reconnectTimeoutId),
        this.removeAllSubscriptionListeners(),
        this.client.cancelRequest(this.getSubscriptionsCancelKey()),
        this.eventSource?.close(),
        (this.eventSource = null),
        (this.clientId = ``),
        !e)
      ) {
        this.reconnectAttempts = 0
        for (let e of this.pendingConnects) e.resolve()
        this.pendingConnects = []
      }
    }
  },
  Nt = class extends Z {
    decode(e) {
      return e
    }
    async getFullList(e, t) {
      if (typeof e == `number`) return this._getFullList(e, t)
      let n = 1e3
      return (
        (t = Object.assign({}, e, t)).batch && ((n = t.batch), delete t.batch),
        this._getFullList(n, t)
      )
    }
    async getList(e = 1, t = 30, n) {
      return (
        ((n = Object.assign({ method: `GET` }, n)).query = Object.assign(
          { page: e, perPage: t },
          n.query,
        )),
        this.client
          .send(this.baseCrudPath, n)
          .then((e) => ((e.items = e.items?.map((e) => this.decode(e)) || []), e))
      )
    }
    async getFirstListItem(e, t) {
      return (
        ((t = Object.assign(
          { requestKey: `one_by_filter_` + this.baseCrudPath + `_` + e },
          t,
        )).query = Object.assign({ filter: e, skipTotal: 1 }, t.query)),
        this.getList(1, 1, t).then((e) => {
          if (!e?.items?.length)
            throw new J({
              status: 404,
              response: { code: 404, message: `The requested resource wasn't found.`, data: {} },
            })
          return e.items[0]
        })
      )
    }
    async getOne(e, t) {
      if (!e)
        throw new J({
          url: this.client.buildURL(this.baseCrudPath + `/`),
          status: 404,
          response: { code: 404, message: `Missing required record id.`, data: {} },
        })
      return (
        (t = Object.assign({ method: `GET` }, t)),
        this.client
          .send(this.baseCrudPath + `/` + encodeURIComponent(e), t)
          .then((e) => this.decode(e))
      )
    }
    async create(e, t) {
      return (
        (t = Object.assign({ method: `POST`, body: e }, t)),
        this.client.send(this.baseCrudPath, t).then((e) => this.decode(e))
      )
    }
    async update(e, t, n) {
      return (
        (n = Object.assign({ method: `PATCH`, body: t }, n)),
        this.client
          .send(this.baseCrudPath + `/` + encodeURIComponent(e), n)
          .then((e) => this.decode(e))
      )
    }
    async delete(e, t) {
      return (
        (t = Object.assign({ method: `DELETE` }, t)),
        this.client.send(this.baseCrudPath + `/` + encodeURIComponent(e), t).then(() => !0)
      )
    }
    _getFullList(e = 1e3, t) {
      ;(t ||= {}).query = Object.assign({ skipTotal: 1 }, t.query)
      let n = [],
        r = async (i) =>
          this.getList(i, e || 1e3, t).then((e) => {
            let t = e.items
            return ((n = n.concat(t)), t.length == e.perPage ? r(i + 1) : n)
          })
      return r(1)
    }
  }
function Q(e, t, n, r) {
  let i = r !== void 0
  return i || n !== void 0
    ? i
      ? (console.warn(e),
        (t.body = Object.assign({}, t.body, n)),
        (t.query = Object.assign({}, t.query, r)),
        t)
      : Object.assign(t, n)
    : t
}
function Pt(e) {
  e._resetAutoRefresh?.()
}
var Ft = class extends Nt {
  constructor(e, t) {
    ;(super(e), (this.collectionIdOrName = t))
  }
  get baseCrudPath() {
    return this.baseCollectionPath + `/records`
  }
  get baseCollectionPath() {
    return `/api/collections/` + encodeURIComponent(this.collectionIdOrName)
  }
  get isSuperusers() {
    return this.collectionIdOrName == `_superusers` || this.collectionIdOrName == `_pbc_2773867675`
  }
  async subscribe(e, t, n) {
    if (!e) throw Error(`Missing topic.`)
    if (!t) throw Error(`Missing subscription callback.`)
    return this.client.realtime.subscribe(this.collectionIdOrName + `/` + e, t, n)
  }
  async unsubscribe(e) {
    return e
      ? this.client.realtime.unsubscribe(this.collectionIdOrName + `/` + e)
      : this.client.realtime.unsubscribeByPrefix(this.collectionIdOrName)
  }
  async getFullList(e, t) {
    if (typeof e == `number`) return super.getFullList(e, t)
    let n = Object.assign({}, e, t)
    return super.getFullList(n)
  }
  async getList(e = 1, t = 30, n) {
    return super.getList(e, t, n)
  }
  async getFirstListItem(e, t) {
    return super.getFirstListItem(e, t)
  }
  async getOne(e, t) {
    return super.getOne(e, t)
  }
  async create(e, t) {
    return super.create(e, t)
  }
  async update(e, t, n) {
    return super.update(e, t, n).then((e) => {
      if (
        this.client.authStore.record?.id === e?.id &&
        (this.client.authStore.record?.collectionId === this.collectionIdOrName ||
          this.client.authStore.record?.collectionName === this.collectionIdOrName)
      ) {
        let t = Object.assign({}, this.client.authStore.record.expand),
          n = Object.assign({}, this.client.authStore.record, e)
        ;(t && (n.expand = Object.assign(t, e.expand)),
          this.client.authStore.save(this.client.authStore.token, n))
      }
      return e
    })
  }
  async delete(e, t) {
    return super
      .delete(e, t)
      .then(
        (t) => (
          !t ||
            this.client.authStore.record?.id !== e ||
            (this.client.authStore.record?.collectionId !== this.collectionIdOrName &&
              this.client.authStore.record?.collectionName !== this.collectionIdOrName) ||
            this.client.authStore.clear(),
          t
        ),
      )
  }
  authResponse(e) {
    let t = this.decode(e?.record || {})
    return (
      this.client.authStore.save(e?.token, t),
      Object.assign({}, e, { token: e?.token || ``, record: t })
    )
  }
  async listAuthMethods(e) {
    return (
      (e = Object.assign({ method: `GET`, fields: `mfa,otp,password,oauth2` }, e)),
      this.client.send(this.baseCollectionPath + `/auth-methods`, e)
    )
  }
  async authWithPassword(e, t, n) {
    let r
    ;((n = Object.assign({ method: `POST`, body: { identity: e, password: t } }, n)),
      this.isSuperusers &&
        ((r = n.autoRefreshThreshold),
        delete n.autoRefreshThreshold,
        n.autoRefresh || Pt(this.client)))
    let i = await this.client.send(this.baseCollectionPath + `/auth-with-password`, n)
    return (
      (i = this.authResponse(i)),
      r &&
        this.isSuperusers &&
        (function (e, t, n, r) {
          Pt(e)
          let i = e.beforeSend,
            a = e.authStore.record,
            o = e.authStore.onChange((t, n) => {
              ;(!t ||
                n?.id != a?.id ||
                ((n?.collectionId || a?.collectionId) && n?.collectionId != a?.collectionId)) &&
                Pt(e)
            })
          ;((e._resetAutoRefresh = function () {
            ;(o(), (e.beforeSend = i), delete e._resetAutoRefresh)
          }),
            (e.beforeSend = async (a, o) => {
              let s = e.authStore.token
              if (o.query?.autoRefresh) return i ? i(a, o) : { url: a, sendOptions: o }
              let c = e.authStore.isValid
              if (c && Ct(e.authStore.token, t))
                try {
                  await n()
                } catch {
                  c = !1
                }
              c || (await r())
              let l = o.headers || {}
              for (let t in l)
                if (t.toLowerCase() == `authorization` && s == l[t] && e.authStore.token) {
                  l[t] = e.authStore.token
                  break
                }
              return ((o.headers = l), i ? i(a, o) : { url: a, sendOptions: o })
            }))
        })(
          this.client,
          r,
          () => this.authRefresh({ autoRefresh: !0 }),
          () => this.authWithPassword(e, t, Object.assign({ autoRefresh: !0 }, n)),
        ),
      i
    )
  }
  async authWithOAuth2Code(e, t, n, r, i, a, o) {
    let s = {
      method: `POST`,
      body: { provider: e, code: t, codeVerifier: n, redirectURL: r, createData: i },
    }
    return (
      (s = Q(
        `This form of authWithOAuth2Code(provider, code, codeVerifier, redirectURL, createData?, body?, query?) is deprecated. Consider replacing it with authWithOAuth2Code(provider, code, codeVerifier, redirectURL, createData?, options?).`,
        s,
        a,
        o,
      )),
      this.client
        .send(this.baseCollectionPath + `/auth-with-oauth2`, s)
        .then((e) => this.authResponse(e))
    )
  }
  authWithOAuth2(...e) {
    if (e.length > 1 || typeof e?.[0] == `string`)
      return (
        console.warn(
          `PocketBase: This form of authWithOAuth2() is deprecated and may get removed in the future. Please replace with authWithOAuth2Code() OR use the authWithOAuth2() realtime form as shown in https://pocketbase.io/docs/authentication/#oauth2-integration.`,
        ),
        this.authWithOAuth2Code(
          e?.[0] || ``,
          e?.[1] || ``,
          e?.[2] || ``,
          e?.[3] || ``,
          e?.[4] || {},
          e?.[5] || {},
          e?.[6] || {},
        )
      )
    let t = e?.[0] || {},
      n = null
    t.urlCallback || (n = It(void 0))
    let r = new Mt(this.client)
    function i() {
      ;(n?.close(), r.unsubscribe())
    }
    let a = {},
      o = t.requestKey
    return (
      o && (a.requestKey = o),
      this.listAuthMethods(a)
        .then((e) => {
          let a = e.oauth2.providers.find((e) => e.name === t.provider)
          if (!a) throw new J(Error(`Missing or invalid provider "${t.provider}".`))
          let s = this.client.buildURL(`/api/oauth2-redirect`)
          return new Promise(async (e, c) => {
            let l = o ? this.client.cancelControllers?.[o] : void 0
            ;(l &&
              (l.signal.onabort = () => {
                ;(i(), c(new J({ isAbort: !0, message: `manually cancelled` })))
              }),
              (r.onDisconnect = (e) => {
                e.length && c && (i(), c(new J(Error(`realtime connection interrupted`))))
              }))
            try {
              await r.subscribe(`@oauth2`, async (n) => {
                let o = r.clientId
                try {
                  if (!n.state || o !== n.state) throw Error(`State parameters don't match.`)
                  if (n.error || !n.code)
                    throw Error(`OAuth2 redirect error or missing code: ` + n.error)
                  let r = Object.assign({}, t)
                  ;(delete r.provider,
                    delete r.scopes,
                    delete r.createData,
                    delete r.urlCallback,
                    l?.signal?.onabort && (l.signal.onabort = null),
                    e(
                      await this.authWithOAuth2Code(
                        a.name,
                        n.code,
                        a.codeVerifier,
                        s,
                        t.createData,
                        r,
                      ),
                    ))
                } catch (e) {
                  c(new J(e))
                }
                i()
              })
              let o = { state: r.clientId }
              t.scopes?.length && (o.scope = t.scopes.join(` `))
              let u = this._replaceQueryParams(a.authURL + s, o)
              await (
                t.urlCallback ||
                function (e) {
                  n ? (n.location.href = e) : (n = It(e))
                }
              )(u)
            } catch (e) {
              ;(l?.signal?.onabort && (l.signal.onabort = null), i(), c(new J(e)))
            }
          })
        })
        .catch((e) => {
          throw (i(), e)
        })
    )
  }
  async authRefresh(e, t) {
    let n = { method: `POST` }
    return (
      (n = Q(
        `This form of authRefresh(body?, query?) is deprecated. Consider replacing it with authRefresh(options?).`,
        n,
        e,
        t,
      )),
      this.client
        .send(this.baseCollectionPath + `/auth-refresh`, n)
        .then((e) => this.authResponse(e))
    )
  }
  async requestPasswordReset(e, t, n) {
    let r = { method: `POST`, body: { email: e } }
    return (
      (r = Q(
        `This form of requestPasswordReset(email, body?, query?) is deprecated. Consider replacing it with requestPasswordReset(email, options?).`,
        r,
        t,
        n,
      )),
      this.client.send(this.baseCollectionPath + `/request-password-reset`, r).then(() => !0)
    )
  }
  async confirmPasswordReset(e, t, n, r, i) {
    let a = { method: `POST`, body: { token: e, password: t, passwordConfirm: n } }
    return (
      (a = Q(
        `This form of confirmPasswordReset(token, password, passwordConfirm, body?, query?) is deprecated. Consider replacing it with confirmPasswordReset(token, password, passwordConfirm, options?).`,
        a,
        r,
        i,
      )),
      this.client.send(this.baseCollectionPath + `/confirm-password-reset`, a).then(() => !0)
    )
  }
  async requestVerification(e, t, n) {
    let r = { method: `POST`, body: { email: e } }
    return (
      (r = Q(
        `This form of requestVerification(email, body?, query?) is deprecated. Consider replacing it with requestVerification(email, options?).`,
        r,
        t,
        n,
      )),
      this.client.send(this.baseCollectionPath + `/request-verification`, r).then(() => !0)
    )
  }
  async confirmVerification(e, t, n) {
    let r = { method: `POST`, body: { token: e } }
    return (
      (r = Q(
        `This form of confirmVerification(token, body?, query?) is deprecated. Consider replacing it with confirmVerification(token, options?).`,
        r,
        t,
        n,
      )),
      this.client.send(this.baseCollectionPath + `/confirm-verification`, r).then(() => {
        let t = X(e),
          n = this.client.authStore.record
        return (
          n &&
            !n.verified &&
            n.id === t.id &&
            n.collectionId === t.collectionId &&
            ((n.verified = !0), this.client.authStore.save(this.client.authStore.token, n)),
          !0
        )
      })
    )
  }
  async requestEmailChange(e, t, n) {
    let r = { method: `POST`, body: { newEmail: e } }
    return (
      (r = Q(
        `This form of requestEmailChange(newEmail, body?, query?) is deprecated. Consider replacing it with requestEmailChange(newEmail, options?).`,
        r,
        t,
        n,
      )),
      this.client.send(this.baseCollectionPath + `/request-email-change`, r).then(() => !0)
    )
  }
  async confirmEmailChange(e, t, n, r) {
    let i = { method: `POST`, body: { token: e, password: t } }
    return (
      (i = Q(
        `This form of confirmEmailChange(token, password, body?, query?) is deprecated. Consider replacing it with confirmEmailChange(token, password, options?).`,
        i,
        n,
        r,
      )),
      this.client.send(this.baseCollectionPath + `/confirm-email-change`, i).then(() => {
        let t = X(e),
          n = this.client.authStore.record
        return (
          n && n.id === t.id && n.collectionId === t.collectionId && this.client.authStore.clear(),
          !0
        )
      })
    )
  }
  async listExternalAuths(e, t) {
    return this.client
      .collection(`_externalAuths`)
      .getFullList(
        Object.assign({}, t, { filter: this.client.filter(`recordRef = {:id}`, { id: e }) }),
      )
  }
  async unlinkExternalAuth(e, t, n) {
    let r = await this.client.collection(`_externalAuths`).getFirstListItem(
      this.client.filter(`recordRef = {:recordId} && provider = {:provider}`, {
        recordId: e,
        provider: t,
      }),
    )
    return this.client
      .collection(`_externalAuths`)
      .delete(r.id, n)
      .then(() => !0)
  }
  async requestOTP(e, t) {
    return (
      (t = Object.assign({ method: `POST`, body: { email: e } }, t)),
      this.client.send(this.baseCollectionPath + `/request-otp`, t)
    )
  }
  async authWithOTP(e, t, n) {
    return (
      (n = Object.assign({ method: `POST`, body: { otpId: e, password: t } }, n)),
      this.client
        .send(this.baseCollectionPath + `/auth-with-otp`, n)
        .then((e) => this.authResponse(e))
    )
  }
  async impersonate(e, t, n) {
    ;(((n = Object.assign({ method: `POST`, body: { duration: t } }, n)).headers = n.headers || {}),
      n.headers.Authorization || (n.headers.Authorization = this.client.authStore.token))
    let r = new Xt(this.client.baseURL, new Tt(), this.client.lang),
      i = await r.send(this.baseCollectionPath + `/impersonate/` + encodeURIComponent(e), n)
    return (r.authStore.save(i?.token, this.decode(i?.record || {})), r)
  }
  _replaceQueryParams(e, t = {}) {
    let n = e,
      r = ``
    e.indexOf(`?`) >= 0 &&
      ((n = e.substring(0, e.indexOf(`?`))), (r = e.substring(e.indexOf(`?`) + 1)))
    let i = {},
      a = r.split(`&`)
    for (let e of a) {
      if (e == ``) continue
      let t = e.split(`=`)
      i[decodeURIComponent(t[0].replace(/\+/g, ` `))] = decodeURIComponent(
        (t[1] || ``).replace(/\+/g, ` `),
      )
    }
    for (let e in t) t.hasOwnProperty(e) && (t[e] == null ? delete i[e] : (i[e] = t[e]))
    r = ``
    for (let e in i)
      i.hasOwnProperty(e) &&
        (r != `` && (r += `&`),
        (r +=
          encodeURIComponent(e.replace(/%20/g, `+`)) +
          `=` +
          encodeURIComponent(i[e].replace(/%20/g, `+`))))
    return r == `` ? n : n + `?` + r
  }
}
function It(e) {
  if (typeof window > `u` || !window?.open)
    throw new J(Error(`Not in a browser context - please pass a custom urlCallback function.`))
  let t = 1024,
    n = 768,
    r = window.innerWidth,
    i = window.innerHeight
  ;((t = t > r ? r : t), (n = n > i ? i : n))
  let a = r / 2 - t / 2,
    o = i / 2 - n / 2
  return window.open(
    e,
    `popup_window`,
    `width=` + t + `,height=` + n + `,top=` + o + `,left=` + a + `,resizable,menubar=no`,
  )
}
var Lt = class extends Nt {
    get baseCrudPath() {
      return `/api/collections`
    }
    async import(e, t = !1, n) {
      return (
        (n = Object.assign({ method: `PUT`, body: { collections: e, deleteMissing: t } }, n)),
        this.client.send(this.baseCrudPath + `/import`, n).then(() => !0)
      )
    }
    async getScaffolds(e) {
      return (
        (e = Object.assign({ method: `GET` }, e)),
        this.client.send(this.baseCrudPath + `/meta/scaffolds`, e)
      )
    }
    async truncate(e, t) {
      return (
        (t = Object.assign({ method: `DELETE` }, t)),
        this.client
          .send(this.baseCrudPath + `/` + encodeURIComponent(e) + `/truncate`, t)
          .then(() => !0)
      )
    }
  },
  Rt = class extends Z {
    async getList(e = 1, t = 30, n) {
      return (
        ((n = Object.assign({ method: `GET` }, n)).query = Object.assign(
          { page: e, perPage: t },
          n.query,
        )),
        this.client.send(`/api/logs`, n)
      )
    }
    async getOne(e, t) {
      if (!e)
        throw new J({
          url: this.client.buildURL(`/api/logs/`),
          status: 404,
          response: { code: 404, message: `Missing required log id.`, data: {} },
        })
      return (
        (t = Object.assign({ method: `GET` }, t)),
        this.client.send(`/api/logs/` + encodeURIComponent(e), t)
      )
    }
    async getStats(e) {
      return ((e = Object.assign({ method: `GET` }, e)), this.client.send(`/api/logs/stats`, e))
    }
  },
  zt = class extends Z {
    async check(e) {
      return ((e = Object.assign({ method: `GET` }, e)), this.client.send(`/api/health`, e))
    }
  },
  Bt = class extends Z {
    getUrl(e, t, n = {}) {
      return (
        console.warn(`Please replace pb.files.getUrl() with pb.files.getURL()`),
        this.getURL(e, t, n)
      )
    }
    getURL(e, t, n = {}) {
      if (!t || !e?.id || (!e?.collectionId && !e?.collectionName)) return ``
      let r = []
      ;(r.push(`api`),
        r.push(`files`),
        r.push(encodeURIComponent(e.collectionId || e.collectionName)),
        r.push(encodeURIComponent(e.id)),
        r.push(encodeURIComponent(t)))
      let i = this.client.buildURL(r.join(`/`))
      !1 === n.download && delete n.download
      let a = At(n)
      return (a && (i += (i.includes(`?`) ? `&` : `?`) + a), i)
    }
    async getToken(e) {
      return (
        (e = Object.assign({ method: `POST` }, e)),
        this.client.send(`/api/files/token`, e).then((e) => e?.token || ``)
      )
    }
  },
  Vt = class extends Z {
    async getFullList(e) {
      return ((e = Object.assign({ method: `GET` }, e)), this.client.send(`/api/backups`, e))
    }
    async create(e, t) {
      return (
        (t = Object.assign({ method: `POST`, body: { name: e } }, t)),
        this.client.send(`/api/backups`, t).then(() => !0)
      )
    }
    async upload(e, t) {
      return (
        (t = Object.assign({ method: `POST`, body: e }, t)),
        this.client.send(`/api/backups/upload`, t).then(() => !0)
      )
    }
    async delete(e, t) {
      return (
        (t = Object.assign({ method: `DELETE` }, t)),
        this.client.send(`/api/backups/${encodeURIComponent(e)}`, t).then(() => !0)
      )
    }
    async restore(e, t) {
      return (
        (t = Object.assign({ method: `POST` }, t)),
        this.client.send(`/api/backups/${encodeURIComponent(e)}/restore`, t).then(() => !0)
      )
    }
    getDownloadUrl(e, t) {
      return (
        console.warn(`Please replace pb.backups.getDownloadUrl() with pb.backups.getDownloadURL()`),
        this.getDownloadURL(e, t)
      )
    }
    getDownloadURL(e, t) {
      return this.client.buildURL(
        `/api/backups/${encodeURIComponent(t)}?token=${encodeURIComponent(e)}`,
      )
    }
  },
  Ht = class extends Z {
    async getFullList(e) {
      return ((e = Object.assign({ method: `GET` }, e)), this.client.send(`/api/crons`, e))
    }
    async run(e, t) {
      return (
        (t = Object.assign({ method: `POST` }, t)),
        this.client.send(`/api/crons/${encodeURIComponent(e)}`, t).then(() => !0)
      )
    }
  }
function Ut(e) {
  return (
    (typeof Blob < `u` && e instanceof Blob) ||
    (typeof File < `u` && e instanceof File) ||
    (typeof e == `object` &&
      !!e &&
      e.uri &&
      ((typeof navigator < `u` && navigator.product === `ReactNative`) ||
        (typeof global < `u` && global.HermesInternal)))
  )
}
function Wt(e) {
  return (
    e && (e.constructor?.name === `FormData` || (typeof FormData < `u` && e instanceof FormData))
  )
}
function Gt(e) {
  for (let t in e) {
    let n = Array.isArray(e[t]) ? e[t] : [e[t]]
    for (let e of n) if (Ut(e)) return !0
  }
  return !1
}
var Kt = /^[\-\.\d]+$/
function qt(e) {
  if (typeof e != `string`) return e
  if (e == `true`) return !0
  if (e == `false`) return !1
  if ((e[0] === `-` || (e[0] >= `0` && e[0] <= `9`)) && Kt.test(e)) {
    let t = +e
    if (`` + t === e) return t
  }
  return e
}
var Jt = class extends Z {
    constructor() {
      ;(super(...arguments), (this.requests = []), (this.subs = {}))
    }
    collection(e) {
      return (this.subs[e] || (this.subs[e] = new Yt(this.requests, e)), this.subs[e])
    }
    async send(e) {
      let t = new FormData(),
        n = []
      for (let e = 0; e < this.requests.length; e++) {
        let r = this.requests[e]
        if ((n.push({ method: r.method, url: r.url, headers: r.headers, body: r.json }), r.files))
          for (let n in r.files) {
            let i = r.files[n] || []
            for (let r of i) t.append(`requests.` + e + `.` + n, r)
          }
      }
      return (
        t.append(`@jsonPayload`, JSON.stringify({ requests: n })),
        (e = Object.assign({ method: `POST`, body: t }, e)),
        this.client.send(`/api/batch`, e)
      )
    }
  },
  Yt = class {
    constructor(e, t) {
      ;((this.requests = []), (this.requests = e), (this.collectionIdOrName = t))
    }
    upsert(e, t) {
      t = Object.assign({ body: e || {} }, t)
      let n = {
        method: `PUT`,
        url: `/api/collections/` + encodeURIComponent(this.collectionIdOrName) + `/records`,
      }
      ;(this.prepareRequest(n, t), this.requests.push(n))
    }
    create(e, t) {
      t = Object.assign({ body: e || {} }, t)
      let n = {
        method: `POST`,
        url: `/api/collections/` + encodeURIComponent(this.collectionIdOrName) + `/records`,
      }
      ;(this.prepareRequest(n, t), this.requests.push(n))
    }
    update(e, t, n) {
      n = Object.assign({ body: t || {} }, n)
      let r = {
        method: `PATCH`,
        url:
          `/api/collections/` +
          encodeURIComponent(this.collectionIdOrName) +
          `/records/` +
          encodeURIComponent(e),
      }
      ;(this.prepareRequest(r, n), this.requests.push(r))
    }
    delete(e, t) {
      t = Object.assign({}, t)
      let n = {
        method: `DELETE`,
        url:
          `/api/collections/` +
          encodeURIComponent(this.collectionIdOrName) +
          `/records/` +
          encodeURIComponent(e),
      }
      ;(this.prepareRequest(n, t), this.requests.push(n))
    }
    prepareRequest(e, t) {
      if ((kt(t), (e.headers = t.headers), (e.json = {}), (e.files = {}), t.query !== void 0)) {
        let n = At(t.query)
        n && (e.url += (e.url.includes(`?`) ? `&` : `?`) + n)
      }
      let n = t.body
      Wt(n) &&
        (n = (function (e) {
          let t = {}
          return (
            e.forEach((e, n) => {
              if (n === `@jsonPayload` && typeof e == `string`)
                try {
                  let n = JSON.parse(e)
                  Object.assign(t, n)
                } catch (e) {
                  console.warn(`@jsonPayload error:`, e)
                }
              else
                t[n] === void 0
                  ? (t[n] = qt(e))
                  : (Array.isArray(t[n]) || (t[n] = [t[n]]), t[n].push(qt(e)))
            }),
            t
          )
        })(n))
      for (let t in n) {
        let r = n[t]
        if (Ut(r)) ((e.files[t] = e.files[t] || []), e.files[t].push(r))
        else if (Array.isArray(r)) {
          let n = [],
            i = []
          for (let e of r) Ut(e) ? n.push(e) : i.push(e)
          if (n.length > 0 && n.length == r.length) {
            e.files[t] = e.files[t] || []
            for (let r of n) e.files[t].push(r)
          } else if (((e.json[t] = i), n.length > 0)) {
            let r = t
            ;(t.startsWith(`+`) || t.endsWith(`+`) || (r += `+`), (e.files[r] = e.files[r] || []))
            for (let t of n) e.files[r].push(t)
          }
        } else e.json[t] = r
      }
    }
  },
  Xt = class {
    get baseUrl() {
      return this.baseURL
    }
    set baseUrl(e) {
      this.baseURL = e
    }
    constructor(e = `/`, t, n = `en-US`) {
      ;((this.cancelControllers = {}),
        (this.recordServices = {}),
        (this.enableAutoCancellation = !0),
        (this.baseURL = e),
        (this.lang = n),
        t
          ? (this.authStore = t)
          : typeof window < `u` && window.Deno
            ? (this.authStore = new Tt())
            : (this.authStore = new Et()),
        (this.collections = new Lt(this)),
        (this.files = new Bt(this)),
        (this.logs = new Rt(this)),
        (this.settings = new Dt(this)),
        (this.realtime = new Mt(this)),
        (this.health = new zt(this)),
        (this.backups = new Vt(this)),
        (this.crons = new Ht(this)))
    }
    get admins() {
      return this.collection(`_superusers`)
    }
    createBatch() {
      return new Jt(this)
    }
    collection(e) {
      return (
        this.recordServices[e] || (this.recordServices[e] = new Ft(this, e)), this.recordServices[e]
      )
    }
    autoCancellation(e) {
      return ((this.enableAutoCancellation = !!e), this)
    }
    cancelRequest(e) {
      return (
        this.cancelControllers[e] &&
          (this.cancelControllers[e].abort(), delete this.cancelControllers[e]),
        this
      )
    }
    cancelAllRequests() {
      for (let e in this.cancelControllers) this.cancelControllers[e].abort()
      return ((this.cancelControllers = {}), this)
    }
    filter(e, t) {
      if (!t) return e
      for (let n in t) {
        let r = t[n]
        switch (typeof r) {
          case `boolean`:
          case `number`:
            r = `` + r
            break
          case `string`:
            r = `'` + r.replace(/'/g, `\\'`) + `'`
            break
          default:
            r =
              r === null
                ? `null`
                : r instanceof Date
                  ? `'` + r.toISOString().replace(`T`, ` `) + `'`
                  : `'` + JSON.stringify(r).replace(/'/g, `\\'`) + `'`
        }
        e = e.replaceAll(`{:` + n + `}`, r)
      }
      return e
    }
    getFileUrl(e, t, n = {}) {
      return (
        console.warn(`Please replace pb.getFileUrl() with pb.files.getURL()`),
        this.files.getURL(e, t, n)
      )
    }
    buildUrl(e) {
      return (console.warn(`Please replace pb.buildUrl() with pb.buildURL()`), this.buildURL(e))
    }
    buildURL(e) {
      let t = this.baseURL
      return (
        typeof window > `u` ||
          !window.location ||
          t.startsWith(`https://`) ||
          t.startsWith(`http://`) ||
          ((t = window.location.origin?.endsWith(`/`)
            ? window.location.origin.substring(0, window.location.origin.length - 1)
            : window.location.origin || ``),
          this.baseURL.startsWith(`/`) ||
            ((t += window.location.pathname || `/`), (t += t.endsWith(`/`) ? `` : `/`)),
          (t += this.baseURL)),
        e && ((t += t.endsWith(`/`) ? `` : `/`), (t += e.startsWith(`/`) ? e.substring(1) : e)),
        t
      )
    }
    async send(e, t) {
      t = this.initSendOptions(e, t)
      let n = this.buildURL(e)
      if (this.beforeSend) {
        let e = Object.assign({}, await this.beforeSend(n, t))
        e.url !== void 0 || e.options !== void 0
          ? ((n = e.url || n), (t = e.options || t))
          : Object.keys(e).length &&
            ((t = e),
            console?.warn &&
              console.warn(
                'Deprecated format of beforeSend return: please use `return { url, options }`, instead of `return options`.',
              ))
      }
      if (t.query !== void 0) {
        let e = At(t.query)
        ;(e && (n += (n.includes(`?`) ? `&` : `?`) + e), delete t.query)
      }
      return (
        this.getHeader(t.headers, `Content-Type`) == `application/json` &&
          t.body &&
          typeof t.body != `string` &&
          (t.body = JSON.stringify(t.body)),
        (t.fetch || fetch)(n, t)
          .then(async (e) => {
            let n = {}
            try {
              n = await e.json()
            } catch (e) {
              if (t.signal?.aborted || e?.name == `AbortError` || e?.message == `Aborted`) throw e
            }
            if ((this.afterSend && (n = await this.afterSend(e, n, t)), e.status >= 400))
              throw new J({ url: e.url, status: e.status, data: n })
            return n
          })
          .catch((e) => {
            throw new J(e)
          })
      )
    }
    initSendOptions(e, t) {
      if (
        (((t = Object.assign({ method: `GET` }, t)).body = (function (e) {
          if (
            typeof FormData > `u` ||
            e === void 0 ||
            typeof e != `object` ||
            !e ||
            Wt(e) ||
            !Gt(e)
          )
            return e
          let t = new FormData()
          for (let n in e) {
            let r = e[n]
            if (r !== void 0)
              if (typeof r != `object` || Gt({ data: r })) {
                let e = Array.isArray(r) ? r : [r]
                for (let r of e) t.append(n, r)
              } else {
                let e = {}
                ;((e[n] = r), t.append(`@jsonPayload`, JSON.stringify(e)))
              }
          }
          return t
        })(t.body)),
        kt(t),
        (t.query = Object.assign({}, t.params, t.query)),
        t.requestKey === void 0 &&
          (!1 === t.$autoCancel || !1 === t.query.$autoCancel
            ? (t.requestKey = null)
            : (t.$cancelKey || t.query.$cancelKey) &&
              (t.requestKey = t.$cancelKey || t.query.$cancelKey)),
        delete t.$autoCancel,
        delete t.query.$autoCancel,
        delete t.$cancelKey,
        delete t.query.$cancelKey,
        this.getHeader(t.headers, `Content-Type`) !== null ||
          Wt(t.body) ||
          (t.headers = Object.assign({}, t.headers, { 'Content-Type': `application/json` })),
        this.getHeader(t.headers, `Accept-Language`) === null &&
          (t.headers = Object.assign({}, t.headers, { 'Accept-Language': this.lang })),
        this.authStore.token &&
          this.getHeader(t.headers, `Authorization`) === null &&
          (t.headers = Object.assign({}, t.headers, { Authorization: this.authStore.token })),
        this.enableAutoCancellation && t.requestKey !== null)
      ) {
        let n = t.requestKey || (t.method || `GET`) + e
        ;(delete t.requestKey, this.cancelRequest(n))
        let r = new AbortController()
        ;((this.cancelControllers[n] = r), (t.signal = r.signal))
      }
      return t
    }
    getHeader(e, t) {
      ;((e ||= {}), (t = t.toLowerCase()))
      for (let n in e) if (n.toLowerCase() == t) return e[n]
      return null
    }
  },
  Zt = new Xt(`https://ia-uazapi-6d79e.shrd00.internal.goskip.dev`)
Zt.autoCancellation(!1)
var Qt = Symbol.for(`react.lazy`),
  $ = p.use
function $t(e) {
  return typeof e == `object` && !!e && `then` in e
}
function en(e) {
  return (
    typeof e == `object` &&
    !!e &&
    `$$typeof` in e &&
    e.$$typeof === Qt &&
    `_payload` in e &&
    $t(e._payload)
  )
}
function tn(e) {
  let t = rn(e),
    n = p.forwardRef((e, n) => {
      let { children: r, ...i } = e
      en(r) && typeof $ == `function` && (r = $(r._payload))
      let a = p.Children.toArray(r),
        o = a.find(on)
      if (o) {
        let e = o.props.children,
          r = a.map((t) =>
            t === o
              ? p.Children.count(e) > 1
                ? p.Children.only(null)
                : p.isValidElement(e)
                  ? e.props.children
                  : null
              : t,
          )
        return (0, M.jsx)(t, {
          ...i,
          ref: n,
          children: p.isValidElement(e) ? p.cloneElement(e, void 0, r) : null,
        })
      }
      return (0, M.jsx)(t, { ...i, ref: n, children: r })
    })
  return ((n.displayName = `${e}.Slot`), n)
}
var nn = tn(`Slot`)
function rn(e) {
  let t = p.forwardRef((e, t) => {
    let { children: n, ...r } = e
    if ((en(n) && typeof $ == `function` && (n = $(n._payload)), p.isValidElement(n))) {
      let e = cn(n),
        i = sn(r, n.props)
      return (n.type !== p.Fragment && (i.ref = t ? O(t, e) : e), p.cloneElement(n, i))
    }
    return p.Children.count(n) > 1 ? p.Children.only(null) : null
  })
  return ((t.displayName = `${e}.SlotClone`), t)
}
var an = Symbol(`radix.slottable`)
function on(e) {
  return (
    p.isValidElement(e) &&
    typeof e.type == `function` &&
    `__radixId` in e.type &&
    e.type.__radixId === an
  )
}
function sn(e, t) {
  let n = { ...t }
  for (let r in t) {
    let i = e[r],
      a = t[r]
    ;/^on[A-Z]/.test(r)
      ? i && a
        ? (n[r] = (...e) => {
            let t = a(...e)
            return (i(...e), t)
          })
        : i && (n[r] = i)
      : r === `style`
        ? (n[r] = { ...i, ...a })
        : r === `className` && (n[r] = [i, a].filter(Boolean).join(` `))
  }
  return { ...e, ...n }
}
function cn(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, `ref`)?.get,
    n = t && `isReactWarning` in t && t.isReactWarning
  return n
    ? e.ref
    : ((t = Object.getOwnPropertyDescriptor(e, `ref`)?.get),
      (n = t && `isReactWarning` in t && t.isReactWarning),
      n ? e.props.ref : e.props.ref || e.ref)
}
var ln = ve(
    `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0`,
    {
      variants: {
        variant: {
          default: `bg-primary text-primary-foreground hover:bg-primary/90`,
          destructive: `bg-destructive text-destructive-foreground hover:bg-destructive/90`,
          outline: `border border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground`,
          secondary: `bg-secondary text-secondary-foreground hover:bg-secondary/80`,
          ghost: `text-foreground hover:bg-accent hover:text-accent-foreground`,
          link: `text-foreground underline-offset-4 hover:underline`,
        },
        size: {
          default: `h-10 px-4 py-2`,
          sm: `h-9 rounded-md px-3`,
          lg: `h-11 rounded-md px-8`,
          icon: `h-10 w-10`,
        },
      },
      defaultVariants: { variant: `default`, size: `default` },
    },
  ),
  un = p.forwardRef(({ className: e, variant: t, size: n, asChild: r = !1, ...i }, a) =>
    (0, M.jsx)(r ? nn : `button`, {
      className: ht(ln({ variant: t, size: n, className: e })),
      ref: a,
      ...i,
    }),
  )
un.displayName = `Button`
export {
  E as C,
  o as D,
  u as E,
  c as O,
  k as S,
  f as T,
  te as _,
  J as a,
  j as b,
  De as c,
  de as d,
  le as f,
  I as g,
  se as h,
  Zt as i,
  Ee as l,
  oe as m,
  ln as n,
  ht as o,
  ce as p,
  tn as r,
  gt as s,
  un as t,
  ve as u,
  N as v,
  T as w,
  O as x,
  P as y,
}
