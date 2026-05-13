//#region \0rolldown/runtime.js
var __create = Object.create
var __defProp = Object.defineProperty
var __getOwnPropDesc = Object.getOwnPropertyDescriptor
var __getOwnPropNames = Object.getOwnPropertyNames
var __getProtoOf = Object.getPrototypeOf
var __hasOwnProp = Object.prototype.hasOwnProperty
var __commonJSMin = (cb, mod) => () => (
  mod || cb((mod = { exports: {} }).exports, mod), mod.exports
)
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === 'object') || typeof from === 'function')
    for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
      key = keys[i]
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: ((k) => from[k]).bind(null, key),
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        })
    }
  return to
}
var __toESM = (mod, isNodeMode, target) => (
  (target = mod != null ? __create(__getProtoOf(mod)) : {}),
  __copyProps(
    isNodeMode || !mod || !mod.__esModule
      ? __defProp(target, 'default', {
          value: mod,
          enumerable: true,
        })
      : target,
    mod,
  )
)
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/react@19.2.4/node_modules/react/cjs/react.development.js
/**
 * @license React
 * react.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var require_react_development = /* @__PURE__ */ __commonJSMin((exports, module) => {
  ;(function () {
    function defineDeprecationWarning(methodName, info) {
      Object.defineProperty(Component.prototype, methodName, {
        get: function () {
          console.warn(
            '%s(...) is deprecated in plain JavaScript React classes. %s',
            info[0],
            info[1],
          )
        },
      })
    }
    function getIteratorFn(maybeIterable) {
      if (null === maybeIterable || 'object' !== typeof maybeIterable) return null
      maybeIterable =
        (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
        maybeIterable['@@iterator']
      return 'function' === typeof maybeIterable ? maybeIterable : null
    }
    function warnNoop(publicInstance, callerName) {
      publicInstance =
        ((publicInstance = publicInstance.constructor) &&
          (publicInstance.displayName || publicInstance.name)) ||
        'ReactClass'
      var warningKey = publicInstance + '.' + callerName
      didWarnStateUpdateForUnmountedComponent[warningKey] ||
        (console.error(
          "Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.",
          callerName,
          publicInstance,
        ),
        (didWarnStateUpdateForUnmountedComponent[warningKey] = !0))
    }
    function Component(props, context, updater) {
      this.props = props
      this.context = context
      this.refs = emptyObject
      this.updater = updater || ReactNoopUpdateQueue
    }
    function ComponentDummy() {}
    function PureComponent(props, context, updater) {
      this.props = props
      this.context = context
      this.refs = emptyObject
      this.updater = updater || ReactNoopUpdateQueue
    }
    function noop() {}
    function testStringCoercion(value) {
      return '' + value
    }
    function checkKeyStringCoercion(value) {
      try {
        testStringCoercion(value)
        var JSCompiler_inline_result = !1
      } catch (e) {
        JSCompiler_inline_result = !0
      }
      if (JSCompiler_inline_result) {
        JSCompiler_inline_result = console
        var JSCompiler_temp_const = JSCompiler_inline_result.error
        var JSCompiler_inline_result$jscomp$0 =
          ('function' === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag]) ||
          value.constructor.name ||
          'Object'
        JSCompiler_temp_const.call(
          JSCompiler_inline_result,
          'The provided key is an unsupported type %s. This value must be coerced to a string before using it here.',
          JSCompiler_inline_result$jscomp$0,
        )
        return testStringCoercion(value)
      }
    }
    function getComponentNameFromType(type) {
      if (null == type) return null
      if ('function' === typeof type)
        return type.$$typeof === REACT_CLIENT_REFERENCE
          ? null
          : type.displayName || type.name || null
      if ('string' === typeof type) return type
      switch (type) {
        case REACT_FRAGMENT_TYPE:
          return 'Fragment'
        case REACT_PROFILER_TYPE:
          return 'Profiler'
        case REACT_STRICT_MODE_TYPE:
          return 'StrictMode'
        case REACT_SUSPENSE_TYPE:
          return 'Suspense'
        case REACT_SUSPENSE_LIST_TYPE:
          return 'SuspenseList'
        case REACT_ACTIVITY_TYPE:
          return 'Activity'
      }
      if ('object' === typeof type)
        switch (
          ('number' === typeof type.tag &&
            console.error(
              'Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.',
            ),
          type.$$typeof)
        ) {
          case REACT_PORTAL_TYPE:
            return 'Portal'
          case REACT_CONTEXT_TYPE:
            return type.displayName || 'Context'
          case REACT_CONSUMER_TYPE:
            return (type._context.displayName || 'Context') + '.Consumer'
          case REACT_FORWARD_REF_TYPE:
            var innerType = type.render
            type = type.displayName
            type ||
              ((type = innerType.displayName || innerType.name || ''),
              (type = '' !== type ? 'ForwardRef(' + type + ')' : 'ForwardRef'))
            return type
          case REACT_MEMO_TYPE:
            return (
              (innerType = type.displayName || null),
              null !== innerType ? innerType : getComponentNameFromType(type.type) || 'Memo'
            )
          case REACT_LAZY_TYPE:
            innerType = type._payload
            type = type._init
            try {
              return getComponentNameFromType(type(innerType))
            } catch (x) {}
        }
      return null
    }
    function getTaskName(type) {
      if (type === REACT_FRAGMENT_TYPE) return '<>'
      if ('object' === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
        return '<...>'
      try {
        var name = getComponentNameFromType(type)
        return name ? '<' + name + '>' : '<...>'
      } catch (x) {
        return '<...>'
      }
    }
    function getOwner() {
      var dispatcher = ReactSharedInternals.A
      return null === dispatcher ? null : dispatcher.getOwner()
    }
    function UnknownOwner() {
      return Error('react-stack-top-frame')
    }
    function hasValidKey(config) {
      if (hasOwnProperty.call(config, 'key')) {
        var getter = Object.getOwnPropertyDescriptor(config, 'key').get
        if (getter && getter.isReactWarning) return !1
      }
      return void 0 !== config.key
    }
    function defineKeyPropWarningGetter(props, displayName) {
      function warnAboutAccessingKey() {
        specialPropKeyWarningShown ||
          ((specialPropKeyWarningShown = !0),
          console.error(
            '%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)',
            displayName,
          ))
      }
      warnAboutAccessingKey.isReactWarning = !0
      Object.defineProperty(props, 'key', {
        get: warnAboutAccessingKey,
        configurable: !0,
      })
    }
    function elementRefGetterWithDeprecationWarning() {
      var componentName = getComponentNameFromType(this.type)
      didWarnAboutElementRef[componentName] ||
        ((didWarnAboutElementRef[componentName] = !0),
        console.error(
          'Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release.',
        ))
      componentName = this.props.ref
      return void 0 !== componentName ? componentName : null
    }
    function ReactElement(type, key, props, owner, debugStack, debugTask) {
      var refProp = props.ref
      type = {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        props,
        _owner: owner,
      }
      null !== (void 0 !== refProp ? refProp : null)
        ? Object.defineProperty(type, 'ref', {
            enumerable: !1,
            get: elementRefGetterWithDeprecationWarning,
          })
        : Object.defineProperty(type, 'ref', {
            enumerable: !1,
            value: null,
          })
      type._store = {}
      Object.defineProperty(type._store, 'validated', {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: 0,
      })
      Object.defineProperty(type, '_debugInfo', {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: null,
      })
      Object.defineProperty(type, '_debugStack', {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: debugStack,
      })
      Object.defineProperty(type, '_debugTask', {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: debugTask,
      })
      Object.freeze && (Object.freeze(type.props), Object.freeze(type))
      return type
    }
    function cloneAndReplaceKey(oldElement, newKey) {
      newKey = ReactElement(
        oldElement.type,
        newKey,
        oldElement.props,
        oldElement._owner,
        oldElement._debugStack,
        oldElement._debugTask,
      )
      oldElement._store && (newKey._store.validated = oldElement._store.validated)
      return newKey
    }
    function validateChildKeys(node) {
      isValidElement(node)
        ? node._store && (node._store.validated = 1)
        : 'object' === typeof node &&
          null !== node &&
          node.$$typeof === REACT_LAZY_TYPE &&
          ('fulfilled' === node._payload.status
            ? isValidElement(node._payload.value) &&
              node._payload.value._store &&
              (node._payload.value._store.validated = 1)
            : node._store && (node._store.validated = 1))
    }
    function isValidElement(object) {
      return 'object' === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE
    }
    function escape(key) {
      var escaperLookup = {
        '=': '=0',
        ':': '=2',
      }
      return (
        '$' +
        key.replace(/[=:]/g, function (match) {
          return escaperLookup[match]
        })
      )
    }
    function getElementKey(element, index) {
      return 'object' === typeof element && null !== element && null != element.key
        ? (checkKeyStringCoercion(element.key), escape('' + element.key))
        : index.toString(36)
    }
    function resolveThenable(thenable) {
      switch (thenable.status) {
        case 'fulfilled':
          return thenable.value
        case 'rejected':
          throw thenable.reason
        default:
          switch (
            ('string' === typeof thenable.status
              ? thenable.then(noop, noop)
              : ((thenable.status = 'pending'),
                thenable.then(
                  function (fulfilledValue) {
                    'pending' === thenable.status &&
                      ((thenable.status = 'fulfilled'), (thenable.value = fulfilledValue))
                  },
                  function (error) {
                    'pending' === thenable.status &&
                      ((thenable.status = 'rejected'), (thenable.reason = error))
                  },
                )),
            thenable.status)
          ) {
            case 'fulfilled':
              return thenable.value
            case 'rejected':
              throw thenable.reason
          }
      }
      throw thenable
    }
    function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
      var type = typeof children
      if ('undefined' === type || 'boolean' === type) children = null
      var invokeCallback = !1
      if (null === children) invokeCallback = !0
      else
        switch (type) {
          case 'bigint':
          case 'string':
          case 'number':
            invokeCallback = !0
            break
          case 'object':
            switch (children.$$typeof) {
              case REACT_ELEMENT_TYPE:
              case REACT_PORTAL_TYPE:
                invokeCallback = !0
                break
              case REACT_LAZY_TYPE:
                return (
                  (invokeCallback = children._init),
                  mapIntoArray(
                    invokeCallback(children._payload),
                    array,
                    escapedPrefix,
                    nameSoFar,
                    callback,
                  )
                )
            }
        }
      if (invokeCallback) {
        invokeCallback = children
        callback = callback(invokeCallback)
        var childKey = '' === nameSoFar ? '.' + getElementKey(invokeCallback, 0) : nameSoFar
        isArrayImpl(callback)
          ? ((escapedPrefix = ''),
            null != childKey &&
              (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, '$&/') + '/'),
            mapIntoArray(callback, array, escapedPrefix, '', function (c) {
              return c
            }))
          : null != callback &&
            (isValidElement(callback) &&
              (null != callback.key &&
                ((invokeCallback && invokeCallback.key === callback.key) ||
                  checkKeyStringCoercion(callback.key)),
              (escapedPrefix = cloneAndReplaceKey(
                callback,
                escapedPrefix +
                  (null == callback.key || (invokeCallback && invokeCallback.key === callback.key)
                    ? ''
                    : ('' + callback.key).replace(userProvidedKeyEscapeRegex, '$&/') + '/') +
                  childKey,
              )),
              '' !== nameSoFar &&
                null != invokeCallback &&
                isValidElement(invokeCallback) &&
                null == invokeCallback.key &&
                invokeCallback._store &&
                !invokeCallback._store.validated &&
                (escapedPrefix._store.validated = 2),
              (callback = escapedPrefix)),
            array.push(callback))
        return 1
      }
      invokeCallback = 0
      childKey = '' === nameSoFar ? '.' : nameSoFar + ':'
      if (isArrayImpl(children))
        for (var i = 0; i < children.length; i++)
          ((nameSoFar = children[i]),
            (type = childKey + getElementKey(nameSoFar, i)),
            (invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback)))
      else if (((i = getIteratorFn(children)), 'function' === typeof i))
        for (
          i === children.entries &&
            (didWarnAboutMaps ||
              console.warn(
                'Using Maps as children is not supported. Use an array of keyed ReactElements instead.',
              ),
            (didWarnAboutMaps = !0)),
            children = i.call(children),
            i = 0;
          !(nameSoFar = children.next()).done;
        )
          ((nameSoFar = nameSoFar.value),
            (type = childKey + getElementKey(nameSoFar, i++)),
            (invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback)))
      else if ('object' === type) {
        if ('function' === typeof children.then)
          return mapIntoArray(resolveThenable(children), array, escapedPrefix, nameSoFar, callback)
        array = String(children)
        throw Error(
          'Objects are not valid as a React child (found: ' +
            ('[object Object]' === array
              ? 'object with keys {' + Object.keys(children).join(', ') + '}'
              : array) +
            '). If you meant to render a collection of children, use an array instead.',
        )
      }
      return invokeCallback
    }
    function mapChildren(children, func, context) {
      if (null == children) return children
      var result = [],
        count = 0
      mapIntoArray(children, result, '', '', function (child) {
        return func.call(context, child, count++)
      })
      return result
    }
    function lazyInitializer(payload) {
      if (-1 === payload._status) {
        var ioInfo = payload._ioInfo
        null != ioInfo && (ioInfo.start = ioInfo.end = performance.now())
        ioInfo = payload._result
        var thenable = ioInfo()
        thenable.then(
          function (moduleObject) {
            if (0 === payload._status || -1 === payload._status) {
              payload._status = 1
              payload._result = moduleObject
              var _ioInfo = payload._ioInfo
              null != _ioInfo && (_ioInfo.end = performance.now())
              void 0 === thenable.status &&
                ((thenable.status = 'fulfilled'), (thenable.value = moduleObject))
            }
          },
          function (error) {
            if (0 === payload._status || -1 === payload._status) {
              payload._status = 2
              payload._result = error
              var _ioInfo2 = payload._ioInfo
              null != _ioInfo2 && (_ioInfo2.end = performance.now())
              void 0 === thenable.status &&
                ((thenable.status = 'rejected'), (thenable.reason = error))
            }
          },
        )
        ioInfo = payload._ioInfo
        if (null != ioInfo) {
          ioInfo.value = thenable
          var displayName = thenable.displayName
          'string' === typeof displayName && (ioInfo.name = displayName)
        }
        ;-1 === payload._status && ((payload._status = 0), (payload._result = thenable))
      }
      if (1 === payload._status)
        return (
          (ioInfo = payload._result),
          void 0 === ioInfo &&
            console.error(
              "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?",
              ioInfo,
            ),
          'default' in ioInfo ||
            console.error(
              "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))",
              ioInfo,
            ),
          ioInfo.default
        )
      throw payload._result
    }
    function resolveDispatcher() {
      var dispatcher = ReactSharedInternals.H
      null === dispatcher &&
        console.error(
          'Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.',
        )
      return dispatcher
    }
    function releaseAsyncTransition() {
      ReactSharedInternals.asyncTransitions--
    }
    function enqueueTask(task) {
      if (null === enqueueTaskImpl)
        try {
          var requireString = ('require' + Math.random()).slice(0, 7)
          enqueueTaskImpl = (module && module[requireString]).call(module, 'timers').setImmediate
        } catch (_err) {
          enqueueTaskImpl = function (callback) {
            !1 === didWarnAboutMessageChannel &&
              ((didWarnAboutMessageChannel = !0),
              'undefined' === typeof MessageChannel &&
                console.error(
                  'This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning.',
                ))
            var channel = new MessageChannel()
            channel.port1.onmessage = callback
            channel.port2.postMessage(void 0)
          }
        }
      return enqueueTaskImpl(task)
    }
    function aggregateErrors(errors) {
      return 1 < errors.length && 'function' === typeof AggregateError
        ? new AggregateError(errors)
        : errors[0]
    }
    function popActScope(prevActQueue, prevActScopeDepth) {
      prevActScopeDepth !== actScopeDepth - 1 &&
        console.error(
          'You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ',
        )
      actScopeDepth = prevActScopeDepth
    }
    function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
      var queue = ReactSharedInternals.actQueue
      if (null !== queue)
        if (0 !== queue.length)
          try {
            flushActQueue(queue)
            enqueueTask(function () {
              return recursivelyFlushAsyncActWork(returnValue, resolve, reject)
            })
            return
          } catch (error) {
            ReactSharedInternals.thrownErrors.push(error)
          }
        else ReactSharedInternals.actQueue = null
      0 < ReactSharedInternals.thrownErrors.length
        ? ((queue = aggregateErrors(ReactSharedInternals.thrownErrors)),
          (ReactSharedInternals.thrownErrors.length = 0),
          reject(queue))
        : resolve(returnValue)
    }
    function flushActQueue(queue) {
      if (!isFlushing) {
        isFlushing = !0
        var i = 0
        try {
          for (; i < queue.length; i++) {
            var callback = queue[i]
            do {
              ReactSharedInternals.didUsePromise = !1
              var continuation = callback(!1)
              if (null !== continuation) {
                if (ReactSharedInternals.didUsePromise) {
                  queue[i] = callback
                  queue.splice(0, i)
                  return
                }
                callback = continuation
              } else break
            } while (1)
          }
          queue.length = 0
        } catch (error) {
          ;(queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error))
        } finally {
          isFlushing = !1
        }
      }
    }
    'undefined' !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ &&
      'function' === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart &&
      __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error())
    var REACT_ELEMENT_TYPE = Symbol.for('react.transitional.element'),
      REACT_PORTAL_TYPE = Symbol.for('react.portal'),
      REACT_FRAGMENT_TYPE = Symbol.for('react.fragment'),
      REACT_STRICT_MODE_TYPE = Symbol.for('react.strict_mode'),
      REACT_PROFILER_TYPE = Symbol.for('react.profiler'),
      REACT_CONSUMER_TYPE = Symbol.for('react.consumer'),
      REACT_CONTEXT_TYPE = Symbol.for('react.context'),
      REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref'),
      REACT_SUSPENSE_TYPE = Symbol.for('react.suspense'),
      REACT_SUSPENSE_LIST_TYPE = Symbol.for('react.suspense_list'),
      REACT_MEMO_TYPE = Symbol.for('react.memo'),
      REACT_LAZY_TYPE = Symbol.for('react.lazy'),
      REACT_ACTIVITY_TYPE = Symbol.for('react.activity'),
      MAYBE_ITERATOR_SYMBOL = Symbol.iterator,
      didWarnStateUpdateForUnmountedComponent = {},
      ReactNoopUpdateQueue = {
        isMounted: function () {
          return !1
        },
        enqueueForceUpdate: function (publicInstance) {
          warnNoop(publicInstance, 'forceUpdate')
        },
        enqueueReplaceState: function (publicInstance) {
          warnNoop(publicInstance, 'replaceState')
        },
        enqueueSetState: function (publicInstance) {
          warnNoop(publicInstance, 'setState')
        },
      },
      assign = Object.assign,
      emptyObject = {}
    Object.freeze(emptyObject)
    Component.prototype.isReactComponent = {}
    Component.prototype.setState = function (partialState, callback) {
      if (
        'object' !== typeof partialState &&
        'function' !== typeof partialState &&
        null != partialState
      )
        throw Error(
          'takes an object of state variables to update or a function which returns an object of state variables.',
        )
      this.updater.enqueueSetState(this, partialState, callback, 'setState')
    }
    Component.prototype.forceUpdate = function (callback) {
      this.updater.enqueueForceUpdate(this, callback, 'forceUpdate')
    }
    var deprecatedAPIs = {
      isMounted: [
        'isMounted',
        'Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks.',
      ],
      replaceState: [
        'replaceState',
        'Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236).',
      ],
    }
    for (fnName in deprecatedAPIs)
      deprecatedAPIs.hasOwnProperty(fnName) &&
        defineDeprecationWarning(fnName, deprecatedAPIs[fnName])
    ComponentDummy.prototype = Component.prototype
    deprecatedAPIs = PureComponent.prototype = new ComponentDummy()
    deprecatedAPIs.constructor = PureComponent
    assign(deprecatedAPIs, Component.prototype)
    deprecatedAPIs.isPureReactComponent = !0
    var isArrayImpl = Array.isArray,
      REACT_CLIENT_REFERENCE = Symbol.for('react.client.reference'),
      ReactSharedInternals = {
        H: null,
        A: null,
        T: null,
        S: null,
        actQueue: null,
        asyncTransitions: 0,
        isBatchingLegacy: !1,
        didScheduleLegacyUpdate: !1,
        didUsePromise: !1,
        thrownErrors: [],
        getCurrentStack: null,
        recentlyCreatedOwnerStacks: 0,
      },
      hasOwnProperty = Object.prototype.hasOwnProperty,
      createTask = console.createTask
        ? console.createTask
        : function () {
            return null
          }
    deprecatedAPIs = {
      react_stack_bottom_frame: function (callStackForError) {
        return callStackForError()
      },
    }
    var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime
    var didWarnAboutElementRef = {}
    var unknownOwnerDebugStack = deprecatedAPIs.react_stack_bottom_frame.bind(
      deprecatedAPIs,
      UnknownOwner,
    )()
    var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner))
    var didWarnAboutMaps = !1,
      userProvidedKeyEscapeRegex = /\/+/g,
      reportGlobalError =
        'function' === typeof reportError
          ? reportError
          : function (error) {
              if ('object' === typeof window && 'function' === typeof window.ErrorEvent) {
                var event = new window.ErrorEvent('error', {
                  bubbles: !0,
                  cancelable: !0,
                  message:
                    'object' === typeof error && null !== error && 'string' === typeof error.message
                      ? String(error.message)
                      : String(error),
                  error,
                })
                if (!window.dispatchEvent(event)) return
              } else if ('object' === typeof process && 'function' === typeof process.emit) {
                process.emit('uncaughtException', error)
                return
              }
              console.error(error)
            },
      didWarnAboutMessageChannel = !1,
      enqueueTaskImpl = null,
      actScopeDepth = 0,
      didWarnNoAwaitAct = !1,
      isFlushing = !1,
      queueSeveralMicrotasks =
        'function' === typeof queueMicrotask
          ? function (callback) {
              queueMicrotask(function () {
                return queueMicrotask(callback)
              })
            }
          : enqueueTask
    deprecatedAPIs = Object.freeze({
      __proto__: null,
      c: function (size) {
        return resolveDispatcher().useMemoCache(size)
      },
    })
    var fnName = {
      map: mapChildren,
      forEach: function (children, forEachFunc, forEachContext) {
        mapChildren(
          children,
          function () {
            forEachFunc.apply(this, arguments)
          },
          forEachContext,
        )
      },
      count: function (children) {
        var n = 0
        mapChildren(children, function () {
          n++
        })
        return n
      },
      toArray: function (children) {
        return (
          mapChildren(children, function (child) {
            return child
          }) || []
        )
      },
      only: function (children) {
        if (!isValidElement(children))
          throw Error('React.Children.only expected to receive a single React element child.')
        return children
      },
    }
    exports.Activity = REACT_ACTIVITY_TYPE
    exports.Children = fnName
    exports.Component = Component
    exports.Fragment = REACT_FRAGMENT_TYPE
    exports.Profiler = REACT_PROFILER_TYPE
    exports.PureComponent = PureComponent
    exports.StrictMode = REACT_STRICT_MODE_TYPE
    exports.Suspense = REACT_SUSPENSE_TYPE
    exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals
    exports.__COMPILER_RUNTIME = deprecatedAPIs
    exports.act = function (callback) {
      var prevActQueue = ReactSharedInternals.actQueue,
        prevActScopeDepth = actScopeDepth
      actScopeDepth++
      var queue = (ReactSharedInternals.actQueue = null !== prevActQueue ? prevActQueue : []),
        didAwaitActCall = !1
      try {
        var result = callback()
      } catch (error) {
        ReactSharedInternals.thrownErrors.push(error)
      }
      if (0 < ReactSharedInternals.thrownErrors.length)
        throw (
          popActScope(prevActQueue, prevActScopeDepth),
          (callback = aggregateErrors(ReactSharedInternals.thrownErrors)),
          (ReactSharedInternals.thrownErrors.length = 0),
          callback
        )
      if (null !== result && 'object' === typeof result && 'function' === typeof result.then) {
        var thenable = result
        queueSeveralMicrotasks(function () {
          didAwaitActCall ||
            didWarnNoAwaitAct ||
            ((didWarnNoAwaitAct = !0),
            console.error(
              'You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);',
            ))
        })
        return {
          then: function (resolve, reject) {
            didAwaitActCall = !0
            thenable.then(
              function (returnValue) {
                popActScope(prevActQueue, prevActScopeDepth)
                if (0 === prevActScopeDepth) {
                  try {
                    ;(flushActQueue(queue),
                      enqueueTask(function () {
                        return recursivelyFlushAsyncActWork(returnValue, resolve, reject)
                      }))
                  } catch (error$0) {
                    ReactSharedInternals.thrownErrors.push(error$0)
                  }
                  if (0 < ReactSharedInternals.thrownErrors.length) {
                    var _thrownError = aggregateErrors(ReactSharedInternals.thrownErrors)
                    ReactSharedInternals.thrownErrors.length = 0
                    reject(_thrownError)
                  }
                } else resolve(returnValue)
              },
              function (error) {
                popActScope(prevActQueue, prevActScopeDepth)
                0 < ReactSharedInternals.thrownErrors.length
                  ? ((error = aggregateErrors(ReactSharedInternals.thrownErrors)),
                    (ReactSharedInternals.thrownErrors.length = 0),
                    reject(error))
                  : reject(error)
              },
            )
          },
        }
      }
      var returnValue$jscomp$0 = result
      popActScope(prevActQueue, prevActScopeDepth)
      0 === prevActScopeDepth &&
        (flushActQueue(queue),
        0 !== queue.length &&
          queueSeveralMicrotasks(function () {
            didAwaitActCall ||
              didWarnNoAwaitAct ||
              ((didWarnNoAwaitAct = !0),
              console.error(
                'A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)',
              ))
          }),
        (ReactSharedInternals.actQueue = null))
      if (0 < ReactSharedInternals.thrownErrors.length)
        throw (
          (callback = aggregateErrors(ReactSharedInternals.thrownErrors)),
          (ReactSharedInternals.thrownErrors.length = 0),
          callback
        )
      return {
        then: function (resolve, reject) {
          didAwaitActCall = !0
          0 === prevActScopeDepth
            ? ((ReactSharedInternals.actQueue = queue),
              enqueueTask(function () {
                return recursivelyFlushAsyncActWork(returnValue$jscomp$0, resolve, reject)
              }))
            : resolve(returnValue$jscomp$0)
        },
      }
    }
    exports.cache = function (fn) {
      return function () {
        return fn.apply(null, arguments)
      }
    }
    exports.cacheSignal = function () {
      return null
    }
    exports.captureOwnerStack = function () {
      var getCurrentStack = ReactSharedInternals.getCurrentStack
      return null === getCurrentStack ? null : getCurrentStack()
    }
    exports.cloneElement = function (element, config, children) {
      if (null === element || void 0 === element)
        throw Error('The argument must be a React element, but you passed ' + element + '.')
      var props = assign({}, element.props),
        key = element.key,
        owner = element._owner
      if (null != config) {
        var JSCompiler_inline_result
        a: {
          if (
            hasOwnProperty.call(config, 'ref') &&
            (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(config, 'ref').get) &&
            JSCompiler_inline_result.isReactWarning
          ) {
            JSCompiler_inline_result = !1
            break a
          }
          JSCompiler_inline_result = void 0 !== config.ref
        }
        JSCompiler_inline_result && (owner = getOwner())
        hasValidKey(config) && (checkKeyStringCoercion(config.key), (key = '' + config.key))
        for (propName in config)
          !hasOwnProperty.call(config, propName) ||
            'key' === propName ||
            '__self' === propName ||
            '__source' === propName ||
            ('ref' === propName && void 0 === config.ref) ||
            (props[propName] = config[propName])
      }
      var propName = arguments.length - 2
      if (1 === propName) props.children = children
      else if (1 < propName) {
        JSCompiler_inline_result = Array(propName)
        for (var i = 0; i < propName; i++) JSCompiler_inline_result[i] = arguments[i + 2]
        props.children = JSCompiler_inline_result
      }
      props = ReactElement(element.type, key, props, owner, element._debugStack, element._debugTask)
      for (key = 2; key < arguments.length; key++) validateChildKeys(arguments[key])
      return props
    }
    exports.createContext = function (defaultValue) {
      defaultValue = {
        $$typeof: REACT_CONTEXT_TYPE,
        _currentValue: defaultValue,
        _currentValue2: defaultValue,
        _threadCount: 0,
        Provider: null,
        Consumer: null,
      }
      defaultValue.Provider = defaultValue
      defaultValue.Consumer = {
        $$typeof: REACT_CONSUMER_TYPE,
        _context: defaultValue,
      }
      defaultValue._currentRenderer = null
      defaultValue._currentRenderer2 = null
      return defaultValue
    }
    exports.createElement = function (type, config, children) {
      for (var i = 2; i < arguments.length; i++) validateChildKeys(arguments[i])
      i = {}
      var key = null
      if (null != config)
        for (propName in (didWarnAboutOldJSXRuntime ||
          !('__self' in config) ||
          'key' in config ||
          ((didWarnAboutOldJSXRuntime = !0),
          console.warn(
            'Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform',
          )),
        hasValidKey(config) && (checkKeyStringCoercion(config.key), (key = '' + config.key)),
        config))
          hasOwnProperty.call(config, propName) &&
            'key' !== propName &&
            '__self' !== propName &&
            '__source' !== propName &&
            (i[propName] = config[propName])
      var childrenLength = arguments.length - 2
      if (1 === childrenLength) i.children = children
      else if (1 < childrenLength) {
        for (var childArray = Array(childrenLength), _i = 0; _i < childrenLength; _i++)
          childArray[_i] = arguments[_i + 2]
        Object.freeze && Object.freeze(childArray)
        i.children = childArray
      }
      if (type && type.defaultProps)
        for (propName in ((childrenLength = type.defaultProps), childrenLength))
          void 0 === i[propName] && (i[propName] = childrenLength[propName])
      key &&
        defineKeyPropWarningGetter(
          i,
          'function' === typeof type ? type.displayName || type.name || 'Unknown' : type,
        )
      var propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++
      return ReactElement(
        type,
        key,
        i,
        getOwner(),
        propName ? Error('react-stack-top-frame') : unknownOwnerDebugStack,
        propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask,
      )
    }
    exports.createRef = function () {
      var refObject = { current: null }
      Object.seal(refObject)
      return refObject
    }
    exports.forwardRef = function (render) {
      null != render && render.$$typeof === REACT_MEMO_TYPE
        ? console.error(
            'forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).',
          )
        : 'function' !== typeof render
          ? console.error(
              'forwardRef requires a render function but was given %s.',
              null === render ? 'null' : typeof render,
            )
          : 0 !== render.length &&
            2 !== render.length &&
            console.error(
              'forwardRef render functions accept exactly two parameters: props and ref. %s',
              1 === render.length
                ? 'Did you forget to use the ref parameter?'
                : 'Any additional parameter will be undefined.',
            )
      null != render &&
        null != render.defaultProps &&
        console.error(
          'forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?',
        )
      var elementType = {
          $$typeof: REACT_FORWARD_REF_TYPE,
          render,
        },
        ownName
      Object.defineProperty(elementType, 'displayName', {
        enumerable: !1,
        configurable: !0,
        get: function () {
          return ownName
        },
        set: function (name) {
          ownName = name
          render.name ||
            render.displayName ||
            (Object.defineProperty(render, 'name', { value: name }), (render.displayName = name))
        },
      })
      return elementType
    }
    exports.isValidElement = isValidElement
    exports.lazy = function (ctor) {
      ctor = {
        _status: -1,
        _result: ctor,
      }
      var lazyType = {
          $$typeof: REACT_LAZY_TYPE,
          _payload: ctor,
          _init: lazyInitializer,
        },
        ioInfo = {
          name: 'lazy',
          start: -1,
          end: -1,
          value: null,
          owner: null,
          debugStack: Error('react-stack-top-frame'),
          debugTask: console.createTask ? console.createTask('lazy()') : null,
        }
      ctor._ioInfo = ioInfo
      lazyType._debugInfo = [{ awaited: ioInfo }]
      return lazyType
    }
    exports.memo = function (type, compare) {
      type ??
        console.error(
          'memo: The first argument must be a component. Instead received: %s',
          null === type ? 'null' : typeof type,
        )
      compare = {
        $$typeof: REACT_MEMO_TYPE,
        type,
        compare: void 0 === compare ? null : compare,
      }
      var ownName
      Object.defineProperty(compare, 'displayName', {
        enumerable: !1,
        configurable: !0,
        get: function () {
          return ownName
        },
        set: function (name) {
          ownName = name
          type.name ||
            type.displayName ||
            (Object.defineProperty(type, 'name', { value: name }), (type.displayName = name))
        },
      })
      return compare
    }
    exports.startTransition = function (scope) {
      var prevTransition = ReactSharedInternals.T,
        currentTransition = {}
      currentTransition._updatedFibers = /* @__PURE__ */ new Set()
      ReactSharedInternals.T = currentTransition
      try {
        var returnValue = scope(),
          onStartTransitionFinish = ReactSharedInternals.S
        null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue)
        'object' === typeof returnValue &&
          null !== returnValue &&
          'function' === typeof returnValue.then &&
          (ReactSharedInternals.asyncTransitions++,
          returnValue.then(releaseAsyncTransition, releaseAsyncTransition),
          returnValue.then(noop, reportGlobalError))
      } catch (error) {
        reportGlobalError(error)
      } finally {
        ;(null === prevTransition &&
          currentTransition._updatedFibers &&
          ((scope = currentTransition._updatedFibers.size),
          currentTransition._updatedFibers.clear(),
          10 < scope &&
            console.warn(
              'Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.',
            )),
          null !== prevTransition &&
            null !== currentTransition.types &&
            (null !== prevTransition.types &&
              prevTransition.types !== currentTransition.types &&
              console.error(
                'We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React.',
              ),
            (prevTransition.types = currentTransition.types)),
          (ReactSharedInternals.T = prevTransition))
      }
    }
    exports.unstable_useCacheRefresh = function () {
      return resolveDispatcher().useCacheRefresh()
    }
    exports.use = function (usable) {
      return resolveDispatcher().use(usable)
    }
    exports.useActionState = function (action, initialState, permalink) {
      return resolveDispatcher().useActionState(action, initialState, permalink)
    }
    exports.useCallback = function (callback, deps) {
      return resolveDispatcher().useCallback(callback, deps)
    }
    exports.useContext = function (Context) {
      var dispatcher = resolveDispatcher()
      Context.$$typeof === REACT_CONSUMER_TYPE &&
        console.error(
          'Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?',
        )
      return dispatcher.useContext(Context)
    }
    exports.useDebugValue = function (value, formatterFn) {
      return resolveDispatcher().useDebugValue(value, formatterFn)
    }
    exports.useDeferredValue = function (value, initialValue) {
      return resolveDispatcher().useDeferredValue(value, initialValue)
    }
    exports.useEffect = function (create, deps) {
      create ??
        console.warn(
          'React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?',
        )
      return resolveDispatcher().useEffect(create, deps)
    }
    exports.useEffectEvent = function (callback) {
      return resolveDispatcher().useEffectEvent(callback)
    }
    exports.useId = function () {
      return resolveDispatcher().useId()
    }
    exports.useImperativeHandle = function (ref, create, deps) {
      return resolveDispatcher().useImperativeHandle(ref, create, deps)
    }
    exports.useInsertionEffect = function (create, deps) {
      create ??
        console.warn(
          'React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?',
        )
      return resolveDispatcher().useInsertionEffect(create, deps)
    }
    exports.useLayoutEffect = function (create, deps) {
      create ??
        console.warn(
          'React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?',
        )
      return resolveDispatcher().useLayoutEffect(create, deps)
    }
    exports.useMemo = function (create, deps) {
      return resolveDispatcher().useMemo(create, deps)
    }
    exports.useOptimistic = function (passthrough, reducer) {
      return resolveDispatcher().useOptimistic(passthrough, reducer)
    }
    exports.useReducer = function (reducer, initialArg, init) {
      return resolveDispatcher().useReducer(reducer, initialArg, init)
    }
    exports.useRef = function (initialValue) {
      return resolveDispatcher().useRef(initialValue)
    }
    exports.useState = function (initialState) {
      return resolveDispatcher().useState(initialState)
    }
    exports.useSyncExternalStore = function (subscribe, getSnapshot, getServerSnapshot) {
      return resolveDispatcher().useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
    }
    exports.useTransition = function () {
      return resolveDispatcher().useTransition()
    }
    exports.version = '19.2.4'
    'undefined' !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ &&
      'function' === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop &&
      __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error())
  })()
})
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/react@19.2.4/node_modules/react/index.js
var require_react = /* @__PURE__ */ __commonJSMin((exports, module) => {
  module.exports = require_react_development()
})
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/react-dom@19.2.4_react@19.2.4/node_modules/react-dom/cjs/react-dom.development.js
/**
 * @license React
 * react-dom.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var require_react_dom_development = /* @__PURE__ */ __commonJSMin((exports) => {
  ;(function () {
    function noop() {}
    function testStringCoercion(value) {
      return '' + value
    }
    function createPortal$1(children, containerInfo, implementation) {
      var key = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null
      try {
        testStringCoercion(key)
        var JSCompiler_inline_result = !1
      } catch (e) {
        JSCompiler_inline_result = !0
      }
      JSCompiler_inline_result &&
        (console.error(
          'The provided key is an unsupported type %s. This value must be coerced to a string before using it here.',
          ('function' === typeof Symbol && Symbol.toStringTag && key[Symbol.toStringTag]) ||
            key.constructor.name ||
            'Object',
        ),
        testStringCoercion(key))
      return {
        $$typeof: REACT_PORTAL_TYPE,
        key: null == key ? null : '' + key,
        children,
        containerInfo,
        implementation,
      }
    }
    function getCrossOriginStringAs(as, input) {
      if ('font' === as) return ''
      if ('string' === typeof input) return 'use-credentials' === input ? input : ''
    }
    function getValueDescriptorExpectingObjectForWarning(thing) {
      return null === thing
        ? '`null`'
        : void 0 === thing
          ? '`undefined`'
          : '' === thing
            ? 'an empty string'
            : 'something with type "' + typeof thing + '"'
    }
    function getValueDescriptorExpectingEnumForWarning(thing) {
      return null === thing
        ? '`null`'
        : void 0 === thing
          ? '`undefined`'
          : '' === thing
            ? 'an empty string'
            : 'string' === typeof thing
              ? JSON.stringify(thing)
              : 'number' === typeof thing
                ? '`' + thing + '`'
                : 'something with type "' + typeof thing + '"'
    }
    function resolveDispatcher() {
      var dispatcher = ReactSharedInternals.H
      null === dispatcher &&
        console.error(
          'Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.',
        )
      return dispatcher
    }
    'undefined' !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ &&
      'function' === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart &&
      __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error())
    var React = require_react(),
      Internals = {
        d: {
          f: noop,
          r: function () {
            throw Error(
              'Invalid form element. requestFormReset must be passed a form that was rendered by React.',
            )
          },
          D: noop,
          C: noop,
          L: noop,
          m: noop,
          X: noop,
          S: noop,
          M: noop,
        },
        p: 0,
        findDOMNode: null,
      },
      REACT_PORTAL_TYPE = Symbol.for('react.portal'),
      ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
    ;('function' === typeof Map &&
      null != Map.prototype &&
      'function' === typeof Map.prototype.forEach &&
      'function' === typeof Set &&
      null != Set.prototype &&
      'function' === typeof Set.prototype.clear &&
      'function' === typeof Set.prototype.forEach) ||
      console.error(
        'React depends on Map and Set built-in types. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills',
      )
    exports.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = Internals
    exports.createPortal = function (children, container) {
      var key = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null
      if (
        !container ||
        (1 !== container.nodeType && 9 !== container.nodeType && 11 !== container.nodeType)
      )
        throw Error('Target container is not a DOM element.')
      return createPortal$1(children, container, null, key)
    }
    exports.flushSync = function (fn) {
      var previousTransition = ReactSharedInternals.T,
        previousUpdatePriority = Internals.p
      try {
        if (((ReactSharedInternals.T = null), (Internals.p = 2), fn)) return fn()
      } finally {
        ;((ReactSharedInternals.T = previousTransition),
          (Internals.p = previousUpdatePriority),
          Internals.d.f() &&
            console.error(
              'flushSync was called from inside a lifecycle method. React cannot flush when React is already rendering. Consider moving this call to a scheduler task or micro task.',
            ))
      }
    }
    exports.preconnect = function (href, options) {
      'string' === typeof href && href
        ? null != options && 'object' !== typeof options
          ? console.error(
              'ReactDOM.preconnect(): Expected the `options` argument (second) to be an object but encountered %s instead. The only supported option at this time is `crossOrigin` which accepts a string.',
              getValueDescriptorExpectingEnumForWarning(options),
            )
          : null != options &&
            'string' !== typeof options.crossOrigin &&
            console.error(
              'ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) to be a string but encountered %s instead. Try removing this option or passing a string value instead.',
              getValueDescriptorExpectingObjectForWarning(options.crossOrigin),
            )
        : console.error(
            'ReactDOM.preconnect(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.',
            getValueDescriptorExpectingObjectForWarning(href),
          )
      'string' === typeof href &&
        (options
          ? ((options = options.crossOrigin),
            (options =
              'string' === typeof options
                ? 'use-credentials' === options
                  ? options
                  : ''
                : void 0))
          : (options = null),
        Internals.d.C(href, options))
    }
    exports.prefetchDNS = function (href) {
      if ('string' !== typeof href || !href)
        console.error(
          'ReactDOM.prefetchDNS(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.',
          getValueDescriptorExpectingObjectForWarning(href),
        )
      else if (1 < arguments.length) {
        var options = arguments[1]
        'object' === typeof options && options.hasOwnProperty('crossOrigin')
          ? console.error(
              'ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. It looks like the you are attempting to set a crossOrigin property for this DNS lookup hint. Browsers do not perform DNS queries using CORS and setting this attribute on the resource hint has no effect. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.',
              getValueDescriptorExpectingEnumForWarning(options),
            )
          : console.error(
              'ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.',
              getValueDescriptorExpectingEnumForWarning(options),
            )
      }
      'string' === typeof href && Internals.d.D(href)
    }
    exports.preinit = function (href, options) {
      'string' === typeof href && href
        ? null == options || 'object' !== typeof options
          ? console.error(
              'ReactDOM.preinit(): Expected the `options` argument (second) to be an object with an `as` property describing the type of resource to be preinitialized but encountered %s instead.',
              getValueDescriptorExpectingEnumForWarning(options),
            )
          : 'style' !== options.as &&
            'script' !== options.as &&
            console.error(
              'ReactDOM.preinit(): Expected the `as` property in the `options` argument (second) to contain a valid value describing the type of resource to be preinitialized but encountered %s instead. Valid values for `as` are "style" and "script".',
              getValueDescriptorExpectingEnumForWarning(options.as),
            )
        : console.error(
            'ReactDOM.preinit(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.',
            getValueDescriptorExpectingObjectForWarning(href),
          )
      if ('string' === typeof href && options && 'string' === typeof options.as) {
        var as = options.as,
          crossOrigin = getCrossOriginStringAs(as, options.crossOrigin),
          integrity = 'string' === typeof options.integrity ? options.integrity : void 0,
          fetchPriority = 'string' === typeof options.fetchPriority ? options.fetchPriority : void 0
        'style' === as
          ? Internals.d.S(
              href,
              'string' === typeof options.precedence ? options.precedence : void 0,
              {
                crossOrigin,
                integrity,
                fetchPriority,
              },
            )
          : 'script' === as &&
            Internals.d.X(href, {
              crossOrigin,
              integrity,
              fetchPriority,
              nonce: 'string' === typeof options.nonce ? options.nonce : void 0,
            })
      }
    }
    exports.preinitModule = function (href, options) {
      var encountered = ''
      ;('string' === typeof href && href) ||
        (encountered +=
          ' The `href` argument encountered was ' +
          getValueDescriptorExpectingObjectForWarning(href) +
          '.')
      void 0 !== options && 'object' !== typeof options
        ? (encountered +=
            ' The `options` argument encountered was ' +
            getValueDescriptorExpectingObjectForWarning(options) +
            '.')
        : options &&
          'as' in options &&
          'script' !== options.as &&
          (encountered +=
            ' The `as` option encountered was ' +
            getValueDescriptorExpectingEnumForWarning(options.as) +
            '.')
      if (encountered)
        console.error(
          'ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` string and, optionally, an `options` object with a valid `as` property.%s',
          encountered,
        )
      else
        switch (
          ((encountered = options && 'string' === typeof options.as ? options.as : 'script'),
          encountered)
        ) {
          case 'script':
            break
          default:
            ;((encountered = getValueDescriptorExpectingEnumForWarning(encountered)),
              console.error(
                'ReactDOM.preinitModule(): Currently the only supported "as" type for this function is "script" but received "%s" instead. This warning was generated for `href` "%s". In the future other module types will be supported, aligning with the import-attributes proposal. Learn more here: (https://github.com/tc39/proposal-import-attributes)',
                encountered,
                href,
              ))
        }
      if ('string' === typeof href)
        if ('object' === typeof options && null !== options) {
          if (null == options.as || 'script' === options.as)
            ((encountered = getCrossOriginStringAs(options.as, options.crossOrigin)),
              Internals.d.M(href, {
                crossOrigin: encountered,
                integrity: 'string' === typeof options.integrity ? options.integrity : void 0,
                nonce: 'string' === typeof options.nonce ? options.nonce : void 0,
              }))
        } else options ?? Internals.d.M(href)
    }
    exports.preload = function (href, options) {
      var encountered = ''
      ;('string' === typeof href && href) ||
        (encountered +=
          ' The `href` argument encountered was ' +
          getValueDescriptorExpectingObjectForWarning(href) +
          '.')
      null == options || 'object' !== typeof options
        ? (encountered +=
            ' The `options` argument encountered was ' +
            getValueDescriptorExpectingObjectForWarning(options) +
            '.')
        : ('string' === typeof options.as && options.as) ||
          (encountered +=
            ' The `as` option encountered was ' +
            getValueDescriptorExpectingObjectForWarning(options.as) +
            '.')
      encountered &&
        console.error(
          'ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an `options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag.%s',
          encountered,
        )
      if (
        'string' === typeof href &&
        'object' === typeof options &&
        null !== options &&
        'string' === typeof options.as
      ) {
        encountered = options.as
        var crossOrigin = getCrossOriginStringAs(encountered, options.crossOrigin)
        Internals.d.L(href, encountered, {
          crossOrigin,
          integrity: 'string' === typeof options.integrity ? options.integrity : void 0,
          nonce: 'string' === typeof options.nonce ? options.nonce : void 0,
          type: 'string' === typeof options.type ? options.type : void 0,
          fetchPriority: 'string' === typeof options.fetchPriority ? options.fetchPriority : void 0,
          referrerPolicy:
            'string' === typeof options.referrerPolicy ? options.referrerPolicy : void 0,
          imageSrcSet: 'string' === typeof options.imageSrcSet ? options.imageSrcSet : void 0,
          imageSizes: 'string' === typeof options.imageSizes ? options.imageSizes : void 0,
          media: 'string' === typeof options.media ? options.media : void 0,
        })
      }
    }
    exports.preloadModule = function (href, options) {
      var encountered = ''
      ;('string' === typeof href && href) ||
        (encountered +=
          ' The `href` argument encountered was ' +
          getValueDescriptorExpectingObjectForWarning(href) +
          '.')
      void 0 !== options && 'object' !== typeof options
        ? (encountered +=
            ' The `options` argument encountered was ' +
            getValueDescriptorExpectingObjectForWarning(options) +
            '.')
        : options &&
          'as' in options &&
          'string' !== typeof options.as &&
          (encountered +=
            ' The `as` option encountered was ' +
            getValueDescriptorExpectingObjectForWarning(options.as) +
            '.')
      encountered &&
        console.error(
          'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag.%s',
          encountered,
        )
      'string' === typeof href &&
        (options
          ? ((encountered = getCrossOriginStringAs(options.as, options.crossOrigin)),
            Internals.d.m(href, {
              as: 'string' === typeof options.as && 'script' !== options.as ? options.as : void 0,
              crossOrigin: encountered,
              integrity: 'string' === typeof options.integrity ? options.integrity : void 0,
            }))
          : Internals.d.m(href))
    }
    exports.requestFormReset = function (form) {
      Internals.d.r(form)
    }
    exports.unstable_batchedUpdates = function (fn, a) {
      return fn(a)
    }
    exports.useFormState = function (action, initialState, permalink) {
      return resolveDispatcher().useFormState(action, initialState, permalink)
    }
    exports.useFormStatus = function () {
      return resolveDispatcher().useHostTransitionStatus()
    }
    exports.version = '19.2.4'
    'undefined' !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ &&
      'function' === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop &&
      __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error())
  })()
})
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/react-dom@19.2.4_react@19.2.4/node_modules/react-dom/index.js
var require_react_dom = /* @__PURE__ */ __commonJSMin((exports, module) => {
  module.exports = require_react_dom_development()
})
//#endregion
//#region src/hooks/use-toast.ts
var import_react = /* @__PURE__ */ __toESM(require_react(), 1)
var TOAST_LIMIT = 1
var TOAST_REMOVE_DELAY = 1e6
var count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}
var toastTimeouts = /* @__PURE__ */ new Map()
var addToRemoveQueue = (toastId) => {
  if (toastTimeouts.has(toastId)) return
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: 'REMOVE_TOAST',
      toastId,
    })
  }, TOAST_REMOVE_DELAY)
  toastTimeouts.set(toastId, timeout)
}
var reducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }
    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id
            ? {
                ...t,
                ...action.toast,
              }
            : t,
        ),
      }
    case 'DISMISS_TOAST': {
      const { toastId } = action
      if (toastId) addToRemoveQueue(toastId)
      else
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === void 0
            ? {
                ...t,
                open: false,
              }
            : t,
        ),
      }
    }
    case 'REMOVE_TOAST':
      if (action.toastId === void 0)
        return {
          ...state,
          toasts: [],
        }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}
var listeners = []
var memoryState = { toasts: [] }
function dispatch(action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}
function toast({ ...props }) {
  const id = genId()
  const update = (props) =>
    dispatch({
      type: 'UPDATE_TOAST',
      toast: {
        ...props,
        id,
      },
    })
  const dismiss = () =>
    dispatch({
      type: 'DISMISS_TOAST',
      toastId: id,
    })
  dispatch({
    type: 'ADD_TOAST',
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })
  return {
    id,
    dismiss,
    update,
  }
}
function useToast() {
  const [state, setState] = import_react.useState(memoryState)
  import_react.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [state])
  return {
    ...state,
    toast,
    dismiss: (toastId) =>
      dispatch({
        type: 'DISMISS_TOAST',
        toastId,
      }),
  }
}
typeof window !== 'undefined' && window.document && window.document.createElement
function composeEventHandlers(
  originalEventHandler,
  ourEventHandler,
  { checkForDefaultPrevented = true } = {},
) {
  return function handleEvent(event) {
    originalEventHandler?.(event)
    if (checkForDefaultPrevented === false || !event.defaultPrevented)
      return ourEventHandler?.(event)
  }
}
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/@radix-ui+react-compose-refs@1.1.2_@types+react@19.2.14_react@19.2.4/node_modules/@radix-ui/react-compose-refs/dist/index.mjs
function setRef(ref, value) {
  if (typeof ref === 'function') return ref(value)
  else if (ref !== null && ref !== void 0) ref.current = value
}
function composeRefs(...refs) {
  return (node) => {
    let hasCleanup = false
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node)
      if (!hasCleanup && typeof cleanup == 'function') hasCleanup = true
      return cleanup
    })
    if (hasCleanup)
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          const cleanup = cleanups[i]
          if (typeof cleanup == 'function') cleanup()
          else setRef(refs[i], null)
        }
      }
  }
}
function useComposedRefs(...refs) {
  return import_react.useCallback(composeRefs(...refs), refs)
}
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/react@19.2.4/node_modules/react/cjs/react-jsx-runtime.development.js
/**
 * @license React
 * react-jsx-runtime.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var require_react_jsx_runtime_development = /* @__PURE__ */ __commonJSMin((exports) => {
  ;(function () {
    function getComponentNameFromType(type) {
      if (null == type) return null
      if ('function' === typeof type)
        return type.$$typeof === REACT_CLIENT_REFERENCE
          ? null
          : type.displayName || type.name || null
      if ('string' === typeof type) return type
      switch (type) {
        case REACT_FRAGMENT_TYPE:
          return 'Fragment'
        case REACT_PROFILER_TYPE:
          return 'Profiler'
        case REACT_STRICT_MODE_TYPE:
          return 'StrictMode'
        case REACT_SUSPENSE_TYPE:
          return 'Suspense'
        case REACT_SUSPENSE_LIST_TYPE:
          return 'SuspenseList'
        case REACT_ACTIVITY_TYPE:
          return 'Activity'
      }
      if ('object' === typeof type)
        switch (
          ('number' === typeof type.tag &&
            console.error(
              'Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.',
            ),
          type.$$typeof)
        ) {
          case REACT_PORTAL_TYPE:
            return 'Portal'
          case REACT_CONTEXT_TYPE:
            return type.displayName || 'Context'
          case REACT_CONSUMER_TYPE:
            return (type._context.displayName || 'Context') + '.Consumer'
          case REACT_FORWARD_REF_TYPE:
            var innerType = type.render
            type = type.displayName
            type ||
              ((type = innerType.displayName || innerType.name || ''),
              (type = '' !== type ? 'ForwardRef(' + type + ')' : 'ForwardRef'))
            return type
          case REACT_MEMO_TYPE:
            return (
              (innerType = type.displayName || null),
              null !== innerType ? innerType : getComponentNameFromType(type.type) || 'Memo'
            )
          case REACT_LAZY_TYPE:
            innerType = type._payload
            type = type._init
            try {
              return getComponentNameFromType(type(innerType))
            } catch (x) {}
        }
      return null
    }
    function testStringCoercion(value) {
      return '' + value
    }
    function checkKeyStringCoercion(value) {
      try {
        testStringCoercion(value)
        var JSCompiler_inline_result = !1
      } catch (e) {
        JSCompiler_inline_result = !0
      }
      if (JSCompiler_inline_result) {
        JSCompiler_inline_result = console
        var JSCompiler_temp_const = JSCompiler_inline_result.error
        var JSCompiler_inline_result$jscomp$0 =
          ('function' === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag]) ||
          value.constructor.name ||
          'Object'
        JSCompiler_temp_const.call(
          JSCompiler_inline_result,
          'The provided key is an unsupported type %s. This value must be coerced to a string before using it here.',
          JSCompiler_inline_result$jscomp$0,
        )
        return testStringCoercion(value)
      }
    }
    function getTaskName(type) {
      if (type === REACT_FRAGMENT_TYPE) return '<>'
      if ('object' === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
        return '<...>'
      try {
        var name = getComponentNameFromType(type)
        return name ? '<' + name + '>' : '<...>'
      } catch (x) {
        return '<...>'
      }
    }
    function getOwner() {
      var dispatcher = ReactSharedInternals.A
      return null === dispatcher ? null : dispatcher.getOwner()
    }
    function UnknownOwner() {
      return Error('react-stack-top-frame')
    }
    function hasValidKey(config) {
      if (hasOwnProperty.call(config, 'key')) {
        var getter = Object.getOwnPropertyDescriptor(config, 'key').get
        if (getter && getter.isReactWarning) return !1
      }
      return void 0 !== config.key
    }
    function defineKeyPropWarningGetter(props, displayName) {
      function warnAboutAccessingKey() {
        specialPropKeyWarningShown ||
          ((specialPropKeyWarningShown = !0),
          console.error(
            '%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)',
            displayName,
          ))
      }
      warnAboutAccessingKey.isReactWarning = !0
      Object.defineProperty(props, 'key', {
        get: warnAboutAccessingKey,
        configurable: !0,
      })
    }
    function elementRefGetterWithDeprecationWarning() {
      var componentName = getComponentNameFromType(this.type)
      didWarnAboutElementRef[componentName] ||
        ((didWarnAboutElementRef[componentName] = !0),
        console.error(
          'Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release.',
        ))
      componentName = this.props.ref
      return void 0 !== componentName ? componentName : null
    }
    function ReactElement(type, key, props, owner, debugStack, debugTask) {
      var refProp = props.ref
      type = {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        props,
        _owner: owner,
      }
      null !== (void 0 !== refProp ? refProp : null)
        ? Object.defineProperty(type, 'ref', {
            enumerable: !1,
            get: elementRefGetterWithDeprecationWarning,
          })
        : Object.defineProperty(type, 'ref', {
            enumerable: !1,
            value: null,
          })
      type._store = {}
      Object.defineProperty(type._store, 'validated', {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: 0,
      })
      Object.defineProperty(type, '_debugInfo', {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: null,
      })
      Object.defineProperty(type, '_debugStack', {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: debugStack,
      })
      Object.defineProperty(type, '_debugTask', {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: debugTask,
      })
      Object.freeze && (Object.freeze(type.props), Object.freeze(type))
      return type
    }
    function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
      var children = config.children
      if (void 0 !== children)
        if (isStaticChildren)
          if (isArrayImpl(children)) {
            for (isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)
              validateChildKeys(children[isStaticChildren])
            Object.freeze && Object.freeze(children)
          } else
            console.error(
              'React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.',
            )
        else validateChildKeys(children)
      if (hasOwnProperty.call(config, 'key')) {
        children = getComponentNameFromType(type)
        var keys = Object.keys(config).filter(function (k) {
          return 'key' !== k
        })
        isStaticChildren =
          0 < keys.length ? '{key: someKey, ' + keys.join(': ..., ') + ': ...}' : '{key: someKey}'
        didWarnAboutKeySpread[children + isStaticChildren] ||
          ((keys = 0 < keys.length ? '{' + keys.join(': ..., ') + ': ...}' : '{}'),
          console.error(
            'A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />',
            isStaticChildren,
            children,
            keys,
            children,
          ),
          (didWarnAboutKeySpread[children + isStaticChildren] = !0))
      }
      children = null
      void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), (children = '' + maybeKey))
      hasValidKey(config) && (checkKeyStringCoercion(config.key), (children = '' + config.key))
      if ('key' in config) {
        maybeKey = {}
        for (var propName in config) 'key' !== propName && (maybeKey[propName] = config[propName])
      } else maybeKey = config
      children &&
        defineKeyPropWarningGetter(
          maybeKey,
          'function' === typeof type ? type.displayName || type.name || 'Unknown' : type,
        )
      return ReactElement(type, children, maybeKey, getOwner(), debugStack, debugTask)
    }
    function validateChildKeys(node) {
      isValidElement(node)
        ? node._store && (node._store.validated = 1)
        : 'object' === typeof node &&
          null !== node &&
          node.$$typeof === REACT_LAZY_TYPE &&
          ('fulfilled' === node._payload.status
            ? isValidElement(node._payload.value) &&
              node._payload.value._store &&
              (node._payload.value._store.validated = 1)
            : node._store && (node._store.validated = 1))
    }
    function isValidElement(object) {
      return 'object' === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE
    }
    var React = require_react(),
      REACT_ELEMENT_TYPE = Symbol.for('react.transitional.element'),
      REACT_PORTAL_TYPE = Symbol.for('react.portal'),
      REACT_FRAGMENT_TYPE = Symbol.for('react.fragment'),
      REACT_STRICT_MODE_TYPE = Symbol.for('react.strict_mode'),
      REACT_PROFILER_TYPE = Symbol.for('react.profiler'),
      REACT_CONSUMER_TYPE = Symbol.for('react.consumer'),
      REACT_CONTEXT_TYPE = Symbol.for('react.context'),
      REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref'),
      REACT_SUSPENSE_TYPE = Symbol.for('react.suspense'),
      REACT_SUSPENSE_LIST_TYPE = Symbol.for('react.suspense_list'),
      REACT_MEMO_TYPE = Symbol.for('react.memo'),
      REACT_LAZY_TYPE = Symbol.for('react.lazy'),
      REACT_ACTIVITY_TYPE = Symbol.for('react.activity'),
      REACT_CLIENT_REFERENCE = Symbol.for('react.client.reference'),
      ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
      hasOwnProperty = Object.prototype.hasOwnProperty,
      isArrayImpl = Array.isArray,
      createTask = console.createTask
        ? console.createTask
        : function () {
            return null
          }
    React = {
      react_stack_bottom_frame: function (callStackForError) {
        return callStackForError()
      },
    }
    var specialPropKeyWarningShown
    var didWarnAboutElementRef = {}
    var unknownOwnerDebugStack = React.react_stack_bottom_frame.bind(React, UnknownOwner)()
    var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner))
    var didWarnAboutKeySpread = {}
    exports.Fragment = REACT_FRAGMENT_TYPE
    exports.jsx = function (type, config, maybeKey) {
      var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++
      return jsxDEVImpl(
        type,
        config,
        maybeKey,
        !1,
        trackActualOwner ? Error('react-stack-top-frame') : unknownOwnerDebugStack,
        trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask,
      )
    }
    exports.jsxs = function (type, config, maybeKey) {
      var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++
      return jsxDEVImpl(
        type,
        config,
        maybeKey,
        !0,
        trackActualOwner ? Error('react-stack-top-frame') : unknownOwnerDebugStack,
        trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask,
      )
    }
  })()
})
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/react@19.2.4/node_modules/react/jsx-runtime.js
var require_jsx_runtime = /* @__PURE__ */ __commonJSMin((exports, module) => {
  module.exports = require_react_jsx_runtime_development()
})
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/@radix-ui+react-context@1.1.2_@types+react@19.2.14_react@19.2.4/node_modules/@radix-ui/react-context/dist/index.mjs
var import_jsx_runtime = require_jsx_runtime()
function createContext2(rootComponentName, defaultContext) {
  const Context = import_react.createContext(defaultContext)
  const Provider = (props) => {
    const { children, ...context } = props
    const value = import_react.useMemo(() => context, Object.values(context))
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Context.Provider, {
      value,
      children,
    })
  }
  Provider.displayName = rootComponentName + 'Provider'
  function useContext2(consumerName) {
    const context = import_react.useContext(Context)
    if (context) return context
    if (defaultContext !== void 0) return defaultContext
    throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``)
  }
  return [Provider, useContext2]
}
function createContextScope(scopeName, createContextScopeDeps = []) {
  let defaultContexts = []
  function createContext3(rootComponentName, defaultContext) {
    const BaseContext = import_react.createContext(defaultContext)
    const index = defaultContexts.length
    defaultContexts = [...defaultContexts, defaultContext]
    const Provider = (props) => {
      const { scope, children, ...context } = props
      const Context = scope?.[scopeName]?.[index] || BaseContext
      const value = import_react.useMemo(() => context, Object.values(context))
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Context.Provider, {
        value,
        children,
      })
    }
    Provider.displayName = rootComponentName + 'Provider'
    function useContext2(consumerName, scope) {
      const Context = scope?.[scopeName]?.[index] || BaseContext
      const context = import_react.useContext(Context)
      if (context) return context
      if (defaultContext !== void 0) return defaultContext
      throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``)
    }
    return [Provider, useContext2]
  }
  const createScope = () => {
    const scopeContexts = defaultContexts.map((defaultContext) => {
      return import_react.createContext(defaultContext)
    })
    return function useScope(scope) {
      const contexts = scope?.[scopeName] || scopeContexts
      return import_react.useMemo(
        () => ({
          [`__scope${scopeName}`]: {
            ...scope,
            [scopeName]: contexts,
          },
        }),
        [scope, contexts],
      )
    }
  }
  createScope.scopeName = scopeName
  return [createContext3, composeContextScopes(createScope, ...createContextScopeDeps)]
}
function composeContextScopes(...scopes) {
  const baseScope = scopes[0]
  if (scopes.length === 1) return baseScope
  const createScope = () => {
    const scopeHooks = scopes.map((createScope2) => ({
      useScope: createScope2(),
      scopeName: createScope2.scopeName,
    }))
    return function useComposedScopes(overrideScopes) {
      const nextScopes = scopeHooks.reduce((nextScopes2, { useScope, scopeName }) => {
        const currentScope = useScope(overrideScopes)[`__scope${scopeName}`]
        return {
          ...nextScopes2,
          ...currentScope,
        }
      }, {})
      return import_react.useMemo(
        () => ({ [`__scope${baseScope.scopeName}`]: nextScopes }),
        [nextScopes],
      )
    }
  }
  createScope.scopeName = baseScope.scopeName
  return createScope
}
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/@radix-ui+react-slot@1.2.3_@types+react@19.2.14_react@19.2.4/node_modules/@radix-ui/react-slot/dist/index.mjs
/* @__NO_SIDE_EFFECTS__ */
function createSlot$1(ownerName) {
  const SlotClone = /* @__PURE__ */ createSlotClone$1(ownerName)
  const Slot2 = import_react.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props
    const childrenArray = import_react.Children.toArray(children)
    const slottable = childrenArray.find(isSlottable$1)
    if (slottable) {
      const newElement = slottable.props.children
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (import_react.Children.count(newElement) > 1) return import_react.Children.only(null)
          return import_react.isValidElement(newElement) ? newElement.props.children : null
        } else return child
      })
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlotClone, {
        ...slotProps,
        ref: forwardedRef,
        children: import_react.isValidElement(newElement)
          ? import_react.cloneElement(newElement, void 0, newChildren)
          : null,
      })
    }
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlotClone, {
      ...slotProps,
      ref: forwardedRef,
      children,
    })
  })
  Slot2.displayName = `${ownerName}.Slot`
  return Slot2
}
/* @__NO_SIDE_EFFECTS__ */
function createSlotClone$1(ownerName) {
  const SlotClone = import_react.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props
    if (import_react.isValidElement(children)) {
      const childrenRef = getElementRef$2(children)
      const props2 = mergeProps$1(slotProps, children.props)
      if (children.type !== import_react.Fragment)
        props2.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef
      return import_react.cloneElement(children, props2)
    }
    return import_react.Children.count(children) > 1 ? import_react.Children.only(null) : null
  })
  SlotClone.displayName = `${ownerName}.SlotClone`
  return SlotClone
}
var SLOTTABLE_IDENTIFIER$1 = Symbol('radix.slottable')
/* @__NO_SIDE_EFFECTS__ */
function createSlottable(ownerName) {
  const Slottable2 = ({ children }) => {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children })
  }
  Slottable2.displayName = `${ownerName}.Slottable`
  Slottable2.__radixId = SLOTTABLE_IDENTIFIER$1
  return Slottable2
}
function isSlottable$1(child) {
  return (
    import_react.isValidElement(child) &&
    typeof child.type === 'function' &&
    '__radixId' in child.type &&
    child.type.__radixId === SLOTTABLE_IDENTIFIER$1
  )
}
function mergeProps$1(slotProps, childProps) {
  const overrideProps = { ...childProps }
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName]
    const childPropValue = childProps[propName]
    if (/^on[A-Z]/.test(propName)) {
      if (slotPropValue && childPropValue)
        overrideProps[propName] = (...args) => {
          const result = childPropValue(...args)
          slotPropValue(...args)
          return result
        }
      else if (slotPropValue) overrideProps[propName] = slotPropValue
    } else if (propName === 'style')
      overrideProps[propName] = {
        ...slotPropValue,
        ...childPropValue,
      }
    else if (propName === 'className')
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(' ')
  }
  return {
    ...slotProps,
    ...overrideProps,
  }
}
function getElementRef$2(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, 'ref')?.get
  let mayWarn = getter && 'isReactWarning' in getter && getter.isReactWarning
  if (mayWarn) return element.ref
  getter = Object.getOwnPropertyDescriptor(element, 'ref')?.get
  mayWarn = getter && 'isReactWarning' in getter && getter.isReactWarning
  if (mayWarn) return element.props.ref
  return element.props.ref || element.ref
}
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/@radix-ui+react-primitive@2.1.3_@types+react-dom@19.2.3_@types+react@19.2.14__@types+re_1181ea5061ec9212248424669240e4ec/node_modules/@radix-ui/react-primitive/dist/index.mjs
var import_react_dom = /* @__PURE__ */ __toESM(require_react_dom(), 1)
var Primitive = [
  'a',
  'button',
  'div',
  'form',
  'h2',
  'h3',
  'img',
  'input',
  'label',
  'li',
  'nav',
  'ol',
  'p',
  'select',
  'span',
  'svg',
  'ul',
].reduce((primitive, node) => {
  const Slot = /* @__PURE__ */ createSlot$1(`Primitive.${node}`)
  const Node = import_react.forwardRef((props, forwardedRef) => {
    const { asChild, ...primitiveProps } = props
    const Comp = asChild ? Slot : node
    if (typeof window !== 'undefined') window[Symbol.for('radix-ui')] = true
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Comp, {
      ...primitiveProps,
      ref: forwardedRef,
    })
  })
  Node.displayName = `Primitive.${node}`
  return {
    ...primitive,
    [node]: Node,
  }
}, {})
function dispatchDiscreteCustomEvent(target, event) {
  if (target) import_react_dom.flushSync(() => target.dispatchEvent(event))
}
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/@radix-ui+react-use-callback-ref@1.1.1_@types+react@19.2.14_react@19.2.4/node_modules/@radix-ui/react-use-callback-ref/dist/index.mjs
function useCallbackRef(callback) {
  const callbackRef = import_react.useRef(callback)
  import_react.useEffect(() => {
    callbackRef.current = callback
  })
  return import_react.useMemo(
    () =>
      (...args) =>
        callbackRef.current?.(...args),
    [],
  )
}
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/@radix-ui+react-use-layout-effect@1.1.1_@types+react@19.2.14_react@19.2.4/node_modules/@radix-ui/react-use-layout-effect/dist/index.mjs
var useLayoutEffect2 = globalThis?.document ? import_react.useLayoutEffect : () => {}
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/@radix-ui+react-presence@1.1.5_@types+react-dom@19.2.3_@types+react@19.2.14__@types+rea_c01c26c80b5ab5e3ecefbda6eca51ad1/node_modules/@radix-ui/react-presence/dist/index.mjs
function useStateMachine(initialState, machine) {
  return import_react.useReducer((state, event) => {
    return machine[state][event] ?? state
  }, initialState)
}
var Presence = (props) => {
  const { present, children } = props
  const presence = usePresence(present)
  const child =
    typeof children === 'function'
      ? children({ present: presence.isPresent })
      : import_react.Children.only(children)
  const ref = useComposedRefs(presence.ref, getElementRef$1(child))
  return typeof children === 'function' || presence.isPresent
    ? import_react.cloneElement(child, { ref })
    : null
}
Presence.displayName = 'Presence'
function usePresence(present) {
  const [node, setNode] = import_react.useState()
  const stylesRef = import_react.useRef(null)
  const prevPresentRef = import_react.useRef(present)
  const prevAnimationNameRef = import_react.useRef('none')
  const [state, send] = useStateMachine(present ? 'mounted' : 'unmounted', {
    mounted: {
      UNMOUNT: 'unmounted',
      ANIMATION_OUT: 'unmountSuspended',
    },
    unmountSuspended: {
      MOUNT: 'mounted',
      ANIMATION_END: 'unmounted',
    },
    unmounted: { MOUNT: 'mounted' },
  })
  import_react.useEffect(() => {
    const currentAnimationName = getAnimationName(stylesRef.current)
    prevAnimationNameRef.current = state === 'mounted' ? currentAnimationName : 'none'
  }, [state])
  useLayoutEffect2(() => {
    const styles = stylesRef.current
    const wasPresent = prevPresentRef.current
    if (wasPresent !== present) {
      const prevAnimationName = prevAnimationNameRef.current
      const currentAnimationName = getAnimationName(styles)
      if (present) send('MOUNT')
      else if (currentAnimationName === 'none' || styles?.display === 'none') send('UNMOUNT')
      else if (wasPresent && prevAnimationName !== currentAnimationName) send('ANIMATION_OUT')
      else send('UNMOUNT')
      prevPresentRef.current = present
    }
  }, [present, send])
  useLayoutEffect2(() => {
    if (node) {
      let timeoutId
      const ownerWindow = node.ownerDocument.defaultView ?? window
      const handleAnimationEnd = (event) => {
        const isCurrentAnimation = getAnimationName(stylesRef.current).includes(
          CSS.escape(event.animationName),
        )
        if (event.target === node && isCurrentAnimation) {
          send('ANIMATION_END')
          if (!prevPresentRef.current) {
            const currentFillMode = node.style.animationFillMode
            node.style.animationFillMode = 'forwards'
            timeoutId = ownerWindow.setTimeout(() => {
              if (node.style.animationFillMode === 'forwards')
                node.style.animationFillMode = currentFillMode
            })
          }
        }
      }
      const handleAnimationStart = (event) => {
        if (event.target === node)
          prevAnimationNameRef.current = getAnimationName(stylesRef.current)
      }
      node.addEventListener('animationstart', handleAnimationStart)
      node.addEventListener('animationcancel', handleAnimationEnd)
      node.addEventListener('animationend', handleAnimationEnd)
      return () => {
        ownerWindow.clearTimeout(timeoutId)
        node.removeEventListener('animationstart', handleAnimationStart)
        node.removeEventListener('animationcancel', handleAnimationEnd)
        node.removeEventListener('animationend', handleAnimationEnd)
      }
    } else send('ANIMATION_END')
  }, [node, send])
  return {
    isPresent: ['mounted', 'unmountSuspended'].includes(state),
    ref: import_react.useCallback((node2) => {
      stylesRef.current = node2 ? getComputedStyle(node2) : null
      setNode(node2)
    }, []),
  }
}
function getAnimationName(styles) {
  return styles?.animationName || 'none'
}
function getElementRef$1(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, 'ref')?.get
  let mayWarn = getter && 'isReactWarning' in getter && getter.isReactWarning
  if (mayWarn) return element.ref
  getter = Object.getOwnPropertyDescriptor(element, 'ref')?.get
  mayWarn = getter && 'isReactWarning' in getter && getter.isReactWarning
  if (mayWarn) return element.props.ref
  return element.props.ref || element.ref
}
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
function r$1(e) {
  var t,
    f,
    n = ''
  if ('string' == typeof e || 'number' == typeof e) n += e
  else if ('object' == typeof e)
    if (Array.isArray(e)) {
      var o = e.length
      for (t = 0; t < o; t++) e[t] && (f = r$1(e[t])) && (n && (n += ' '), (n += f))
    } else for (f in e) e[f] && (n && (n += ' '), (n += f))
  return n
}
function clsx() {
  for (var e, t, f = 0, n = '', o = arguments.length; f < o; f++)
    (e = arguments[f]) && (t = r$1(e)) && (n && (n += ' '), (n += t))
  return n
}
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/class-variance-authority@0.7.1/node_modules/class-variance-authority/dist/index.mjs
/**
 * Copyright 2022 Joe Bell. All rights reserved.
 *
 * This file is licensed to you under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with the
 * License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR REPRESENTATIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */ var falsyToString = (value) =>
  typeof value === 'boolean' ? `${value}` : value === 0 ? '0' : value
var cx = clsx
var cva = (base, config) => (props) => {
  var _config_compoundVariants
  if ((config === null || config === void 0 ? void 0 : config.variants) == null)
    return cx(
      base,
      props === null || props === void 0 ? void 0 : props.class,
      props === null || props === void 0 ? void 0 : props.className,
    )
  const { variants, defaultVariants } = config
  const getVariantClassNames = Object.keys(variants).map((variant) => {
    const variantProp = props === null || props === void 0 ? void 0 : props[variant]
    const defaultVariantProp =
      defaultVariants === null || defaultVariants === void 0 ? void 0 : defaultVariants[variant]
    if (variantProp === null) return null
    const variantKey = falsyToString(variantProp) || falsyToString(defaultVariantProp)
    return variants[variant][variantKey]
  })
  const propsWithoutUndefined =
    props &&
    Object.entries(props).reduce((acc, param) => {
      let [key, value] = param
      if (value === void 0) return acc
      acc[key] = value
      return acc
    }, {})
  return cx(
    base,
    getVariantClassNames,
    config === null || config === void 0
      ? void 0
      : (_config_compoundVariants = config.compoundVariants) === null ||
          _config_compoundVariants === void 0
        ? void 0
        : _config_compoundVariants.reduce((acc, param) => {
            let { class: cvClass, className: cvClassName, ...compoundVariantOptions } = param
            return Object.entries(compoundVariantOptions).every((param) => {
              let [key, value] = param
              return Array.isArray(value)
                ? value.includes(
                    {
                      ...defaultVariants,
                      ...propsWithoutUndefined,
                    }[key],
                  )
                : {
                    ...defaultVariants,
                    ...propsWithoutUndefined,
                  }[key] === value
            })
              ? [...acc, cvClass, cvClassName]
              : acc
          }, []),
    props === null || props === void 0 ? void 0 : props.class,
    props === null || props === void 0 ? void 0 : props.className,
  )
}
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/lucide-react@0.577.0_react@19.2.4/node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.js
/**
 * @license lucide-react v0.577.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var mergeClasses = (...classes) =>
  classes
    .filter((className, index, array) => {
      return Boolean(className) && className.trim() !== '' && array.indexOf(className) === index
    })
    .join(' ')
    .trim()
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/lucide-react@0.577.0_react@19.2.4/node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.js
/**
 * @license lucide-react v0.577.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/lucide-react@0.577.0_react@19.2.4/node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.js
/**
 * @license lucide-react v0.577.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var toCamelCase = (string) =>
  string.replace(/^([A-Z])|[\s-_]+(\w)/g, (match, p1, p2) =>
    p2 ? p2.toUpperCase() : p1.toLowerCase(),
  )
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/lucide-react@0.577.0_react@19.2.4/node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.js
/**
 * @license lucide-react v0.577.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var toPascalCase = (string) => {
  const camelCase = toCamelCase(string)
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1)
}
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/lucide-react@0.577.0_react@19.2.4/node_modules/lucide-react/dist/esm/defaultAttributes.js
/**
 * @license lucide-react v0.577.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var defaultAttributes = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/lucide-react@0.577.0_react@19.2.4/node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.js
/**
 * @license lucide-react v0.577.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var hasA11yProp = (props) => {
  for (const prop in props)
    if (prop.startsWith('aria-') || prop === 'role' || prop === 'title') return true
  return false
}
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/lucide-react@0.577.0_react@19.2.4/node_modules/lucide-react/dist/esm/Icon.js
/**
 * @license lucide-react v0.577.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var Icon = (0, import_react.forwardRef)(
  (
    {
      color = 'currentColor',
      size = 24,
      strokeWidth = 2,
      absoluteStrokeWidth,
      className = '',
      children,
      iconNode,
      ...rest
    },
    ref,
  ) =>
    (0, import_react.createElement)(
      'svg',
      {
        ref,
        ...defaultAttributes,
        width: size,
        height: size,
        stroke: color,
        strokeWidth: absoluteStrokeWidth ? (Number(strokeWidth) * 24) / Number(size) : strokeWidth,
        className: mergeClasses('lucide', className),
        ...(!children && !hasA11yProp(rest) && { 'aria-hidden': 'true' }),
        ...rest,
      },
      [
        ...iconNode.map(([tag, attrs]) => (0, import_react.createElement)(tag, attrs)),
        ...(Array.isArray(children) ? children : [children]),
      ],
    ),
)
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/lucide-react@0.577.0_react@19.2.4/node_modules/lucide-react/dist/esm/createLucideIcon.js
/**
 * @license lucide-react v0.577.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var createLucideIcon = (iconName, iconNode) => {
  const Component = (0, import_react.forwardRef)(({ className, ...props }, ref) =>
    (0, import_react.createElement)(Icon, {
      ref,
      iconNode,
      className: mergeClasses(
        `lucide-${toKebabCase(toPascalCase(iconName))}`,
        `lucide-${iconName}`,
        className,
      ),
      ...props,
    }),
  )
  Component.displayName = toPascalCase(iconName)
  return Component
}
var X = createLucideIcon('x', [
  [
    'path',
    {
      d: 'M18 6 6 18',
      key: '1bl5f8',
    },
  ],
  [
    'path',
    {
      d: 'm6 6 12 12',
      key: 'd8bk6v',
    },
  ],
])
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/tailwind-merge@2.6.1/node_modules/tailwind-merge/dist/bundle-mjs.mjs
var CLASS_PART_SEPARATOR = '-'
var createClassGroupUtils = (config) => {
  const classMap = createClassMap(config)
  const { conflictingClassGroups, conflictingClassGroupModifiers } = config
  const getClassGroupId = (className) => {
    const classParts = className.split(CLASS_PART_SEPARATOR)
    if (classParts[0] === '' && classParts.length !== 1) classParts.shift()
    return getGroupRecursive(classParts, classMap) || getGroupIdForArbitraryProperty(className)
  }
  const getConflictingClassGroupIds = (classGroupId, hasPostfixModifier) => {
    const conflicts = conflictingClassGroups[classGroupId] || []
    if (hasPostfixModifier && conflictingClassGroupModifiers[classGroupId])
      return [...conflicts, ...conflictingClassGroupModifiers[classGroupId]]
    return conflicts
  }
  return {
    getClassGroupId,
    getConflictingClassGroupIds,
  }
}
var getGroupRecursive = (classParts, classPartObject) => {
  if (classParts.length === 0) return classPartObject.classGroupId
  const currentClassPart = classParts[0]
  const nextClassPartObject = classPartObject.nextPart.get(currentClassPart)
  const classGroupFromNextClassPart = nextClassPartObject
    ? getGroupRecursive(classParts.slice(1), nextClassPartObject)
    : void 0
  if (classGroupFromNextClassPart) return classGroupFromNextClassPart
  if (classPartObject.validators.length === 0) return
  const classRest = classParts.join(CLASS_PART_SEPARATOR)
  return classPartObject.validators.find(({ validator }) => validator(classRest))?.classGroupId
}
var arbitraryPropertyRegex = /^\[(.+)\]$/
var getGroupIdForArbitraryProperty = (className) => {
  if (arbitraryPropertyRegex.test(className)) {
    const arbitraryPropertyClassName = arbitraryPropertyRegex.exec(className)[1]
    const property = arbitraryPropertyClassName?.substring(
      0,
      arbitraryPropertyClassName.indexOf(':'),
    )
    if (property) return 'arbitrary..' + property
  }
}
/**
 * Exported for testing only
 */
var createClassMap = (config) => {
  const { theme, prefix } = config
  const classMap = {
    nextPart: /* @__PURE__ */ new Map(),
    validators: [],
  }
  getPrefixedClassGroupEntries(Object.entries(config.classGroups), prefix).forEach(
    ([classGroupId, classGroup]) => {
      processClassesRecursively(classGroup, classMap, classGroupId, theme)
    },
  )
  return classMap
}
var processClassesRecursively = (classGroup, classPartObject, classGroupId, theme) => {
  classGroup.forEach((classDefinition) => {
    if (typeof classDefinition === 'string') {
      const classPartObjectToEdit =
        classDefinition === '' ? classPartObject : getPart(classPartObject, classDefinition)
      classPartObjectToEdit.classGroupId = classGroupId
      return
    }
    if (typeof classDefinition === 'function') {
      if (isThemeGetter(classDefinition)) {
        processClassesRecursively(classDefinition(theme), classPartObject, classGroupId, theme)
        return
      }
      classPartObject.validators.push({
        validator: classDefinition,
        classGroupId,
      })
      return
    }
    Object.entries(classDefinition).forEach(([key, classGroup]) => {
      processClassesRecursively(classGroup, getPart(classPartObject, key), classGroupId, theme)
    })
  })
}
var getPart = (classPartObject, path) => {
  let currentClassPartObject = classPartObject
  path.split(CLASS_PART_SEPARATOR).forEach((pathPart) => {
    if (!currentClassPartObject.nextPart.has(pathPart))
      currentClassPartObject.nextPart.set(pathPart, {
        nextPart: /* @__PURE__ */ new Map(),
        validators: [],
      })
    currentClassPartObject = currentClassPartObject.nextPart.get(pathPart)
  })
  return currentClassPartObject
}
var isThemeGetter = (func) => func.isThemeGetter
var getPrefixedClassGroupEntries = (classGroupEntries, prefix) => {
  if (!prefix) return classGroupEntries
  return classGroupEntries.map(([classGroupId, classGroup]) => {
    return [
      classGroupId,
      classGroup.map((classDefinition) => {
        if (typeof classDefinition === 'string') return prefix + classDefinition
        if (typeof classDefinition === 'object')
          return Object.fromEntries(
            Object.entries(classDefinition).map(([key, value]) => [prefix + key, value]),
          )
        return classDefinition
      }),
    ]
  })
}
var createLruCache = (maxCacheSize) => {
  if (maxCacheSize < 1)
    return {
      get: () => void 0,
      set: () => {},
    }
  let cacheSize = 0
  let cache = /* @__PURE__ */ new Map()
  let previousCache = /* @__PURE__ */ new Map()
  const update = (key, value) => {
    cache.set(key, value)
    cacheSize++
    if (cacheSize > maxCacheSize) {
      cacheSize = 0
      previousCache = cache
      cache = /* @__PURE__ */ new Map()
    }
  }
  return {
    get(key) {
      let value = cache.get(key)
      if (value !== void 0) return value
      if ((value = previousCache.get(key)) !== void 0) {
        update(key, value)
        return value
      }
    },
    set(key, value) {
      if (cache.has(key)) cache.set(key, value)
      else update(key, value)
    },
  }
}
var IMPORTANT_MODIFIER = '!'
var createParseClassName = (config) => {
  const { separator, experimentalParseClassName } = config
  const isSeparatorSingleCharacter = separator.length === 1
  const firstSeparatorCharacter = separator[0]
  const separatorLength = separator.length
  const parseClassName = (className) => {
    const modifiers = []
    let bracketDepth = 0
    let modifierStart = 0
    let postfixModifierPosition
    for (let index = 0; index < className.length; index++) {
      let currentCharacter = className[index]
      if (bracketDepth === 0) {
        if (
          currentCharacter === firstSeparatorCharacter &&
          (isSeparatorSingleCharacter ||
            className.slice(index, index + separatorLength) === separator)
        ) {
          modifiers.push(className.slice(modifierStart, index))
          modifierStart = index + separatorLength
          continue
        }
        if (currentCharacter === '/') {
          postfixModifierPosition = index
          continue
        }
      }
      if (currentCharacter === '[') bracketDepth++
      else if (currentCharacter === ']') bracketDepth--
    }
    const baseClassNameWithImportantModifier =
      modifiers.length === 0 ? className : className.substring(modifierStart)
    const hasImportantModifier = baseClassNameWithImportantModifier.startsWith(IMPORTANT_MODIFIER)
    return {
      modifiers,
      hasImportantModifier,
      baseClassName: hasImportantModifier
        ? baseClassNameWithImportantModifier.substring(1)
        : baseClassNameWithImportantModifier,
      maybePostfixModifierPosition:
        postfixModifierPosition && postfixModifierPosition > modifierStart
          ? postfixModifierPosition - modifierStart
          : void 0,
    }
  }
  if (experimentalParseClassName)
    return (className) =>
      experimentalParseClassName({
        className,
        parseClassName,
      })
  return parseClassName
}
/**
 * Sorts modifiers according to following schema:
 * - Predefined modifiers are sorted alphabetically
 * - When an arbitrary variant appears, it must be preserved which modifiers are before and after it
 */
var sortModifiers = (modifiers) => {
  if (modifiers.length <= 1) return modifiers
  const sortedModifiers = []
  let unsortedModifiers = []
  modifiers.forEach((modifier) => {
    if (modifier[0] === '[') {
      sortedModifiers.push(...unsortedModifiers.sort(), modifier)
      unsortedModifiers = []
    } else unsortedModifiers.push(modifier)
  })
  sortedModifiers.push(...unsortedModifiers.sort())
  return sortedModifiers
}
var createConfigUtils = (config) => ({
  cache: createLruCache(config.cacheSize),
  parseClassName: createParseClassName(config),
  ...createClassGroupUtils(config),
})
var SPLIT_CLASSES_REGEX = /\s+/
var mergeClassList = (classList, configUtils) => {
  const { parseClassName, getClassGroupId, getConflictingClassGroupIds } = configUtils
  /**
   * Set of classGroupIds in following format:
   * `{importantModifier}{variantModifiers}{classGroupId}`
   * @example 'float'
   * @example 'hover:focus:bg-color'
   * @example 'md:!pr'
   */
  const classGroupsInConflict = []
  const classNames = classList.trim().split(SPLIT_CLASSES_REGEX)
  let result = ''
  for (let index = classNames.length - 1; index >= 0; index -= 1) {
    const originalClassName = classNames[index]
    const { modifiers, hasImportantModifier, baseClassName, maybePostfixModifierPosition } =
      parseClassName(originalClassName)
    let hasPostfixModifier = Boolean(maybePostfixModifierPosition)
    let classGroupId = getClassGroupId(
      hasPostfixModifier ? baseClassName.substring(0, maybePostfixModifierPosition) : baseClassName,
    )
    if (!classGroupId) {
      if (!hasPostfixModifier) {
        result = originalClassName + (result.length > 0 ? ' ' + result : result)
        continue
      }
      classGroupId = getClassGroupId(baseClassName)
      if (!classGroupId) {
        result = originalClassName + (result.length > 0 ? ' ' + result : result)
        continue
      }
      hasPostfixModifier = false
    }
    const variantModifier = sortModifiers(modifiers).join(':')
    const modifierId = hasImportantModifier ? variantModifier + IMPORTANT_MODIFIER : variantModifier
    const classId = modifierId + classGroupId
    if (classGroupsInConflict.includes(classId)) continue
    classGroupsInConflict.push(classId)
    const conflictGroups = getConflictingClassGroupIds(classGroupId, hasPostfixModifier)
    for (let i = 0; i < conflictGroups.length; ++i) {
      const group = conflictGroups[i]
      classGroupsInConflict.push(modifierId + group)
    }
    result = originalClassName + (result.length > 0 ? ' ' + result : result)
  }
  return result
}
/**
 * The code in this file is copied from https://github.com/lukeed/clsx and modified to suit the needs of tailwind-merge better.
 *
 * Specifically:
 * - Runtime code from https://github.com/lukeed/clsx/blob/v1.2.1/src/index.js
 * - TypeScript types from https://github.com/lukeed/clsx/blob/v1.2.1/clsx.d.ts
 *
 * Original code has MIT license: Copyright (c) Luke Edwards <luke.edwards05@gmail.com> (lukeed.com)
 */
function twJoin() {
  let index = 0
  let argument
  let resolvedValue
  let string = ''
  while (index < arguments.length)
    if ((argument = arguments[index++])) {
      if ((resolvedValue = toValue(argument))) {
        string && (string += ' ')
        string += resolvedValue
      }
    }
  return string
}
var toValue = (mix) => {
  if (typeof mix === 'string') return mix
  let resolvedValue
  let string = ''
  for (let k = 0; k < mix.length; k++)
    if (mix[k]) {
      if ((resolvedValue = toValue(mix[k]))) {
        string && (string += ' ')
        string += resolvedValue
      }
    }
  return string
}
function createTailwindMerge(createConfigFirst, ...createConfigRest) {
  let configUtils
  let cacheGet
  let cacheSet
  let functionToCall = initTailwindMerge
  function initTailwindMerge(classList) {
    configUtils = createConfigUtils(
      createConfigRest.reduce(
        (previousConfig, createConfigCurrent) => createConfigCurrent(previousConfig),
        createConfigFirst(),
      ),
    )
    cacheGet = configUtils.cache.get
    cacheSet = configUtils.cache.set
    functionToCall = tailwindMerge
    return tailwindMerge(classList)
  }
  function tailwindMerge(classList) {
    const cachedResult = cacheGet(classList)
    if (cachedResult) return cachedResult
    const result = mergeClassList(classList, configUtils)
    cacheSet(classList, result)
    return result
  }
  return function callTailwindMerge() {
    return functionToCall(twJoin.apply(null, arguments))
  }
}
var fromTheme = (key) => {
  const themeGetter = (theme) => theme[key] || []
  themeGetter.isThemeGetter = true
  return themeGetter
}
var arbitraryValueRegex = /^\[(?:([a-z-]+):)?(.+)\]$/i
var fractionRegex = /^\d+\/\d+$/
var stringLengths = /* @__PURE__ */ new Set(['px', 'full', 'screen'])
var tshirtUnitRegex = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/
var lengthUnitRegex =
  /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/
var colorFunctionRegex = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/
var shadowRegex = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/
var imageRegex =
  /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/
var isLength = (value) => isNumber(value) || stringLengths.has(value) || fractionRegex.test(value)
var isArbitraryLength = (value) => getIsArbitraryValue(value, 'length', isLengthOnly)
var isNumber = (value) => Boolean(value) && !Number.isNaN(Number(value))
var isArbitraryNumber = (value) => getIsArbitraryValue(value, 'number', isNumber)
var isInteger = (value) => Boolean(value) && Number.isInteger(Number(value))
var isPercent = (value) => value.endsWith('%') && isNumber(value.slice(0, -1))
var isArbitraryValue = (value) => arbitraryValueRegex.test(value)
var isTshirtSize = (value) => tshirtUnitRegex.test(value)
var sizeLabels = /* @__PURE__ */ new Set(['length', 'size', 'percentage'])
var isArbitrarySize = (value) => getIsArbitraryValue(value, sizeLabels, isNever)
var isArbitraryPosition = (value) => getIsArbitraryValue(value, 'position', isNever)
var imageLabels = /* @__PURE__ */ new Set(['image', 'url'])
var isArbitraryImage = (value) => getIsArbitraryValue(value, imageLabels, isImage)
var isArbitraryShadow = (value) => getIsArbitraryValue(value, '', isShadow)
var isAny = () => true
var getIsArbitraryValue = (value, label, testValue) => {
  const result = arbitraryValueRegex.exec(value)
  if (result) {
    if (result[1]) return typeof label === 'string' ? result[1] === label : label.has(result[1])
    return testValue(result[2])
  }
  return false
}
var isLengthOnly = (value) => lengthUnitRegex.test(value) && !colorFunctionRegex.test(value)
var isNever = () => false
var isShadow = (value) => shadowRegex.test(value)
var isImage = (value) => imageRegex.test(value)
var getDefaultConfig = () => {
  const colors = fromTheme('colors')
  const spacing = fromTheme('spacing')
  const blur = fromTheme('blur')
  const brightness = fromTheme('brightness')
  const borderColor = fromTheme('borderColor')
  const borderRadius = fromTheme('borderRadius')
  const borderSpacing = fromTheme('borderSpacing')
  const borderWidth = fromTheme('borderWidth')
  const contrast = fromTheme('contrast')
  const grayscale = fromTheme('grayscale')
  const hueRotate = fromTheme('hueRotate')
  const invert = fromTheme('invert')
  const gap = fromTheme('gap')
  const gradientColorStops = fromTheme('gradientColorStops')
  const gradientColorStopPositions = fromTheme('gradientColorStopPositions')
  const inset = fromTheme('inset')
  const margin = fromTheme('margin')
  const opacity = fromTheme('opacity')
  const padding = fromTheme('padding')
  const saturate = fromTheme('saturate')
  const scale = fromTheme('scale')
  const sepia = fromTheme('sepia')
  const skew = fromTheme('skew')
  const space = fromTheme('space')
  const translate = fromTheme('translate')
  const getOverscroll = () => ['auto', 'contain', 'none']
  const getOverflow = () => ['auto', 'hidden', 'clip', 'visible', 'scroll']
  const getSpacingWithAutoAndArbitrary = () => ['auto', isArbitraryValue, spacing]
  const getSpacingWithArbitrary = () => [isArbitraryValue, spacing]
  const getLengthWithEmptyAndArbitrary = () => ['', isLength, isArbitraryLength]
  const getNumberWithAutoAndArbitrary = () => ['auto', isNumber, isArbitraryValue]
  const getPositions = () => [
    'bottom',
    'center',
    'left',
    'left-bottom',
    'left-top',
    'right',
    'right-bottom',
    'right-top',
    'top',
  ]
  const getLineStyles = () => ['solid', 'dashed', 'dotted', 'double', 'none']
  const getBlendModes = () => [
    'normal',
    'multiply',
    'screen',
    'overlay',
    'darken',
    'lighten',
    'color-dodge',
    'color-burn',
    'hard-light',
    'soft-light',
    'difference',
    'exclusion',
    'hue',
    'saturation',
    'color',
    'luminosity',
  ]
  const getAlign = () => ['start', 'end', 'center', 'between', 'around', 'evenly', 'stretch']
  const getZeroAndEmpty = () => ['', '0', isArbitraryValue]
  const getBreaks = () => ['auto', 'avoid', 'all', 'avoid-page', 'page', 'left', 'right', 'column']
  const getNumberAndArbitrary = () => [isNumber, isArbitraryValue]
  return {
    cacheSize: 500,
    separator: ':',
    theme: {
      colors: [isAny],
      spacing: [isLength, isArbitraryLength],
      blur: ['none', '', isTshirtSize, isArbitraryValue],
      brightness: getNumberAndArbitrary(),
      borderColor: [colors],
      borderRadius: ['none', '', 'full', isTshirtSize, isArbitraryValue],
      borderSpacing: getSpacingWithArbitrary(),
      borderWidth: getLengthWithEmptyAndArbitrary(),
      contrast: getNumberAndArbitrary(),
      grayscale: getZeroAndEmpty(),
      hueRotate: getNumberAndArbitrary(),
      invert: getZeroAndEmpty(),
      gap: getSpacingWithArbitrary(),
      gradientColorStops: [colors],
      gradientColorStopPositions: [isPercent, isArbitraryLength],
      inset: getSpacingWithAutoAndArbitrary(),
      margin: getSpacingWithAutoAndArbitrary(),
      opacity: getNumberAndArbitrary(),
      padding: getSpacingWithArbitrary(),
      saturate: getNumberAndArbitrary(),
      scale: getNumberAndArbitrary(),
      sepia: getZeroAndEmpty(),
      skew: getNumberAndArbitrary(),
      space: getSpacingWithArbitrary(),
      translate: getSpacingWithArbitrary(),
    },
    classGroups: {
      aspect: [{ aspect: ['auto', 'square', 'video', isArbitraryValue] }],
      container: ['container'],
      columns: [{ columns: [isTshirtSize] }],
      'break-after': [{ 'break-after': getBreaks() }],
      'break-before': [{ 'break-before': getBreaks() }],
      'break-inside': [{ 'break-inside': ['auto', 'avoid', 'avoid-page', 'avoid-column'] }],
      'box-decoration': [{ 'box-decoration': ['slice', 'clone'] }],
      box: [{ box: ['border', 'content'] }],
      display: [
        'block',
        'inline-block',
        'inline',
        'flex',
        'inline-flex',
        'table',
        'inline-table',
        'table-caption',
        'table-cell',
        'table-column',
        'table-column-group',
        'table-footer-group',
        'table-header-group',
        'table-row-group',
        'table-row',
        'flow-root',
        'grid',
        'inline-grid',
        'contents',
        'list-item',
        'hidden',
      ],
      float: [{ float: ['right', 'left', 'none', 'start', 'end'] }],
      clear: [{ clear: ['left', 'right', 'both', 'none', 'start', 'end'] }],
      isolation: ['isolate', 'isolation-auto'],
      'object-fit': [{ object: ['contain', 'cover', 'fill', 'none', 'scale-down'] }],
      'object-position': [{ object: [...getPositions(), isArbitraryValue] }],
      overflow: [{ overflow: getOverflow() }],
      'overflow-x': [{ 'overflow-x': getOverflow() }],
      'overflow-y': [{ 'overflow-y': getOverflow() }],
      overscroll: [{ overscroll: getOverscroll() }],
      'overscroll-x': [{ 'overscroll-x': getOverscroll() }],
      'overscroll-y': [{ 'overscroll-y': getOverscroll() }],
      position: ['static', 'fixed', 'absolute', 'relative', 'sticky'],
      inset: [{ inset: [inset] }],
      'inset-x': [{ 'inset-x': [inset] }],
      'inset-y': [{ 'inset-y': [inset] }],
      start: [{ start: [inset] }],
      end: [{ end: [inset] }],
      top: [{ top: [inset] }],
      right: [{ right: [inset] }],
      bottom: [{ bottom: [inset] }],
      left: [{ left: [inset] }],
      visibility: ['visible', 'invisible', 'collapse'],
      z: [{ z: ['auto', isInteger, isArbitraryValue] }],
      basis: [{ basis: getSpacingWithAutoAndArbitrary() }],
      'flex-direction': [{ flex: ['row', 'row-reverse', 'col', 'col-reverse'] }],
      'flex-wrap': [{ flex: ['wrap', 'wrap-reverse', 'nowrap'] }],
      flex: [{ flex: ['1', 'auto', 'initial', 'none', isArbitraryValue] }],
      grow: [{ grow: getZeroAndEmpty() }],
      shrink: [{ shrink: getZeroAndEmpty() }],
      order: [{ order: ['first', 'last', 'none', isInteger, isArbitraryValue] }],
      'grid-cols': [{ 'grid-cols': [isAny] }],
      'col-start-end': [
        { col: ['auto', { span: ['full', isInteger, isArbitraryValue] }, isArbitraryValue] },
      ],
      'col-start': [{ 'col-start': getNumberWithAutoAndArbitrary() }],
      'col-end': [{ 'col-end': getNumberWithAutoAndArbitrary() }],
      'grid-rows': [{ 'grid-rows': [isAny] }],
      'row-start-end': [
        { row: ['auto', { span: [isInteger, isArbitraryValue] }, isArbitraryValue] },
      ],
      'row-start': [{ 'row-start': getNumberWithAutoAndArbitrary() }],
      'row-end': [{ 'row-end': getNumberWithAutoAndArbitrary() }],
      'grid-flow': [{ 'grid-flow': ['row', 'col', 'dense', 'row-dense', 'col-dense'] }],
      'auto-cols': [{ 'auto-cols': ['auto', 'min', 'max', 'fr', isArbitraryValue] }],
      'auto-rows': [{ 'auto-rows': ['auto', 'min', 'max', 'fr', isArbitraryValue] }],
      gap: [{ gap: [gap] }],
      'gap-x': [{ 'gap-x': [gap] }],
      'gap-y': [{ 'gap-y': [gap] }],
      'justify-content': [{ justify: ['normal', ...getAlign()] }],
      'justify-items': [{ 'justify-items': ['start', 'end', 'center', 'stretch'] }],
      'justify-self': [{ 'justify-self': ['auto', 'start', 'end', 'center', 'stretch'] }],
      'align-content': [{ content: ['normal', ...getAlign(), 'baseline'] }],
      'align-items': [{ items: ['start', 'end', 'center', 'baseline', 'stretch'] }],
      'align-self': [{ self: ['auto', 'start', 'end', 'center', 'stretch', 'baseline'] }],
      'place-content': [{ 'place-content': [...getAlign(), 'baseline'] }],
      'place-items': [{ 'place-items': ['start', 'end', 'center', 'baseline', 'stretch'] }],
      'place-self': [{ 'place-self': ['auto', 'start', 'end', 'center', 'stretch'] }],
      p: [{ p: [padding] }],
      px: [{ px: [padding] }],
      py: [{ py: [padding] }],
      ps: [{ ps: [padding] }],
      pe: [{ pe: [padding] }],
      pt: [{ pt: [padding] }],
      pr: [{ pr: [padding] }],
      pb: [{ pb: [padding] }],
      pl: [{ pl: [padding] }],
      m: [{ m: [margin] }],
      mx: [{ mx: [margin] }],
      my: [{ my: [margin] }],
      ms: [{ ms: [margin] }],
      me: [{ me: [margin] }],
      mt: [{ mt: [margin] }],
      mr: [{ mr: [margin] }],
      mb: [{ mb: [margin] }],
      ml: [{ ml: [margin] }],
      'space-x': [{ 'space-x': [space] }],
      'space-x-reverse': ['space-x-reverse'],
      'space-y': [{ 'space-y': [space] }],
      'space-y-reverse': ['space-y-reverse'],
      w: [{ w: ['auto', 'min', 'max', 'fit', 'svw', 'lvw', 'dvw', isArbitraryValue, spacing] }],
      'min-w': [{ 'min-w': [isArbitraryValue, spacing, 'min', 'max', 'fit'] }],
      'max-w': [
        {
          'max-w': [
            isArbitraryValue,
            spacing,
            'none',
            'full',
            'min',
            'max',
            'fit',
            'prose',
            { screen: [isTshirtSize] },
            isTshirtSize,
          ],
        },
      ],
      h: [{ h: [isArbitraryValue, spacing, 'auto', 'min', 'max', 'fit', 'svh', 'lvh', 'dvh'] }],
      'min-h': [{ 'min-h': [isArbitraryValue, spacing, 'min', 'max', 'fit', 'svh', 'lvh', 'dvh'] }],
      'max-h': [{ 'max-h': [isArbitraryValue, spacing, 'min', 'max', 'fit', 'svh', 'lvh', 'dvh'] }],
      size: [{ size: [isArbitraryValue, spacing, 'auto', 'min', 'max', 'fit'] }],
      'font-size': [{ text: ['base', isTshirtSize, isArbitraryLength] }],
      'font-smoothing': ['antialiased', 'subpixel-antialiased'],
      'font-style': ['italic', 'not-italic'],
      'font-weight': [
        {
          font: [
            'thin',
            'extralight',
            'light',
            'normal',
            'medium',
            'semibold',
            'bold',
            'extrabold',
            'black',
            isArbitraryNumber,
          ],
        },
      ],
      'font-family': [{ font: [isAny] }],
      'fvn-normal': ['normal-nums'],
      'fvn-ordinal': ['ordinal'],
      'fvn-slashed-zero': ['slashed-zero'],
      'fvn-figure': ['lining-nums', 'oldstyle-nums'],
      'fvn-spacing': ['proportional-nums', 'tabular-nums'],
      'fvn-fraction': ['diagonal-fractions', 'stacked-fractions'],
      tracking: [
        { tracking: ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest', isArbitraryValue] },
      ],
      'line-clamp': [{ 'line-clamp': ['none', isNumber, isArbitraryNumber] }],
      leading: [
        {
          leading: [
            'none',
            'tight',
            'snug',
            'normal',
            'relaxed',
            'loose',
            isLength,
            isArbitraryValue,
          ],
        },
      ],
      'list-image': [{ 'list-image': ['none', isArbitraryValue] }],
      'list-style-type': [{ list: ['none', 'disc', 'decimal', isArbitraryValue] }],
      'list-style-position': [{ list: ['inside', 'outside'] }],
      'placeholder-color': [{ placeholder: [colors] }],
      'placeholder-opacity': [{ 'placeholder-opacity': [opacity] }],
      'text-alignment': [{ text: ['left', 'center', 'right', 'justify', 'start', 'end'] }],
      'text-color': [{ text: [colors] }],
      'text-opacity': [{ 'text-opacity': [opacity] }],
      'text-decoration': ['underline', 'overline', 'line-through', 'no-underline'],
      'text-decoration-style': [{ decoration: [...getLineStyles(), 'wavy'] }],
      'text-decoration-thickness': [
        { decoration: ['auto', 'from-font', isLength, isArbitraryLength] },
      ],
      'underline-offset': [{ 'underline-offset': ['auto', isLength, isArbitraryValue] }],
      'text-decoration-color': [{ decoration: [colors] }],
      'text-transform': ['uppercase', 'lowercase', 'capitalize', 'normal-case'],
      'text-overflow': ['truncate', 'text-ellipsis', 'text-clip'],
      'text-wrap': [{ text: ['wrap', 'nowrap', 'balance', 'pretty'] }],
      indent: [{ indent: getSpacingWithArbitrary() }],
      'vertical-align': [
        {
          align: [
            'baseline',
            'top',
            'middle',
            'bottom',
            'text-top',
            'text-bottom',
            'sub',
            'super',
            isArbitraryValue,
          ],
        },
      ],
      whitespace: [
        { whitespace: ['normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap', 'break-spaces'] },
      ],
      break: [{ break: ['normal', 'words', 'all', 'keep'] }],
      hyphens: [{ hyphens: ['none', 'manual', 'auto'] }],
      content: [{ content: ['none', isArbitraryValue] }],
      'bg-attachment': [{ bg: ['fixed', 'local', 'scroll'] }],
      'bg-clip': [{ 'bg-clip': ['border', 'padding', 'content', 'text'] }],
      'bg-opacity': [{ 'bg-opacity': [opacity] }],
      'bg-origin': [{ 'bg-origin': ['border', 'padding', 'content'] }],
      'bg-position': [{ bg: [...getPositions(), isArbitraryPosition] }],
      'bg-repeat': [{ bg: ['no-repeat', { repeat: ['', 'x', 'y', 'round', 'space'] }] }],
      'bg-size': [{ bg: ['auto', 'cover', 'contain', isArbitrarySize] }],
      'bg-image': [
        {
          bg: [
            'none',
            { 'gradient-to': ['t', 'tr', 'r', 'br', 'b', 'bl', 'l', 'tl'] },
            isArbitraryImage,
          ],
        },
      ],
      'bg-color': [{ bg: [colors] }],
      'gradient-from-pos': [{ from: [gradientColorStopPositions] }],
      'gradient-via-pos': [{ via: [gradientColorStopPositions] }],
      'gradient-to-pos': [{ to: [gradientColorStopPositions] }],
      'gradient-from': [{ from: [gradientColorStops] }],
      'gradient-via': [{ via: [gradientColorStops] }],
      'gradient-to': [{ to: [gradientColorStops] }],
      rounded: [{ rounded: [borderRadius] }],
      'rounded-s': [{ 'rounded-s': [borderRadius] }],
      'rounded-e': [{ 'rounded-e': [borderRadius] }],
      'rounded-t': [{ 'rounded-t': [borderRadius] }],
      'rounded-r': [{ 'rounded-r': [borderRadius] }],
      'rounded-b': [{ 'rounded-b': [borderRadius] }],
      'rounded-l': [{ 'rounded-l': [borderRadius] }],
      'rounded-ss': [{ 'rounded-ss': [borderRadius] }],
      'rounded-se': [{ 'rounded-se': [borderRadius] }],
      'rounded-ee': [{ 'rounded-ee': [borderRadius] }],
      'rounded-es': [{ 'rounded-es': [borderRadius] }],
      'rounded-tl': [{ 'rounded-tl': [borderRadius] }],
      'rounded-tr': [{ 'rounded-tr': [borderRadius] }],
      'rounded-br': [{ 'rounded-br': [borderRadius] }],
      'rounded-bl': [{ 'rounded-bl': [borderRadius] }],
      'border-w': [{ border: [borderWidth] }],
      'border-w-x': [{ 'border-x': [borderWidth] }],
      'border-w-y': [{ 'border-y': [borderWidth] }],
      'border-w-s': [{ 'border-s': [borderWidth] }],
      'border-w-e': [{ 'border-e': [borderWidth] }],
      'border-w-t': [{ 'border-t': [borderWidth] }],
      'border-w-r': [{ 'border-r': [borderWidth] }],
      'border-w-b': [{ 'border-b': [borderWidth] }],
      'border-w-l': [{ 'border-l': [borderWidth] }],
      'border-opacity': [{ 'border-opacity': [opacity] }],
      'border-style': [{ border: [...getLineStyles(), 'hidden'] }],
      'divide-x': [{ 'divide-x': [borderWidth] }],
      'divide-x-reverse': ['divide-x-reverse'],
      'divide-y': [{ 'divide-y': [borderWidth] }],
      'divide-y-reverse': ['divide-y-reverse'],
      'divide-opacity': [{ 'divide-opacity': [opacity] }],
      'divide-style': [{ divide: getLineStyles() }],
      'border-color': [{ border: [borderColor] }],
      'border-color-x': [{ 'border-x': [borderColor] }],
      'border-color-y': [{ 'border-y': [borderColor] }],
      'border-color-s': [{ 'border-s': [borderColor] }],
      'border-color-e': [{ 'border-e': [borderColor] }],
      'border-color-t': [{ 'border-t': [borderColor] }],
      'border-color-r': [{ 'border-r': [borderColor] }],
      'border-color-b': [{ 'border-b': [borderColor] }],
      'border-color-l': [{ 'border-l': [borderColor] }],
      'divide-color': [{ divide: [borderColor] }],
      'outline-style': [{ outline: ['', ...getLineStyles()] }],
      'outline-offset': [{ 'outline-offset': [isLength, isArbitraryValue] }],
      'outline-w': [{ outline: [isLength, isArbitraryLength] }],
      'outline-color': [{ outline: [colors] }],
      'ring-w': [{ ring: getLengthWithEmptyAndArbitrary() }],
      'ring-w-inset': ['ring-inset'],
      'ring-color': [{ ring: [colors] }],
      'ring-opacity': [{ 'ring-opacity': [opacity] }],
      'ring-offset-w': [{ 'ring-offset': [isLength, isArbitraryLength] }],
      'ring-offset-color': [{ 'ring-offset': [colors] }],
      shadow: [{ shadow: ['', 'inner', 'none', isTshirtSize, isArbitraryShadow] }],
      'shadow-color': [{ shadow: [isAny] }],
      opacity: [{ opacity: [opacity] }],
      'mix-blend': [{ 'mix-blend': [...getBlendModes(), 'plus-lighter', 'plus-darker'] }],
      'bg-blend': [{ 'bg-blend': getBlendModes() }],
      filter: [{ filter: ['', 'none'] }],
      blur: [{ blur: [blur] }],
      brightness: [{ brightness: [brightness] }],
      contrast: [{ contrast: [contrast] }],
      'drop-shadow': [{ 'drop-shadow': ['', 'none', isTshirtSize, isArbitraryValue] }],
      grayscale: [{ grayscale: [grayscale] }],
      'hue-rotate': [{ 'hue-rotate': [hueRotate] }],
      invert: [{ invert: [invert] }],
      saturate: [{ saturate: [saturate] }],
      sepia: [{ sepia: [sepia] }],
      'backdrop-filter': [{ 'backdrop-filter': ['', 'none'] }],
      'backdrop-blur': [{ 'backdrop-blur': [blur] }],
      'backdrop-brightness': [{ 'backdrop-brightness': [brightness] }],
      'backdrop-contrast': [{ 'backdrop-contrast': [contrast] }],
      'backdrop-grayscale': [{ 'backdrop-grayscale': [grayscale] }],
      'backdrop-hue-rotate': [{ 'backdrop-hue-rotate': [hueRotate] }],
      'backdrop-invert': [{ 'backdrop-invert': [invert] }],
      'backdrop-opacity': [{ 'backdrop-opacity': [opacity] }],
      'backdrop-saturate': [{ 'backdrop-saturate': [saturate] }],
      'backdrop-sepia': [{ 'backdrop-sepia': [sepia] }],
      'border-collapse': [{ border: ['collapse', 'separate'] }],
      'border-spacing': [{ 'border-spacing': [borderSpacing] }],
      'border-spacing-x': [{ 'border-spacing-x': [borderSpacing] }],
      'border-spacing-y': [{ 'border-spacing-y': [borderSpacing] }],
      'table-layout': [{ table: ['auto', 'fixed'] }],
      caption: [{ caption: ['top', 'bottom'] }],
      transition: [
        {
          transition: [
            'none',
            'all',
            '',
            'colors',
            'opacity',
            'shadow',
            'transform',
            isArbitraryValue,
          ],
        },
      ],
      duration: [{ duration: getNumberAndArbitrary() }],
      ease: [{ ease: ['linear', 'in', 'out', 'in-out', isArbitraryValue] }],
      delay: [{ delay: getNumberAndArbitrary() }],
      animate: [{ animate: ['none', 'spin', 'ping', 'pulse', 'bounce', isArbitraryValue] }],
      transform: [{ transform: ['', 'gpu', 'none'] }],
      scale: [{ scale: [scale] }],
      'scale-x': [{ 'scale-x': [scale] }],
      'scale-y': [{ 'scale-y': [scale] }],
      rotate: [{ rotate: [isInteger, isArbitraryValue] }],
      'translate-x': [{ 'translate-x': [translate] }],
      'translate-y': [{ 'translate-y': [translate] }],
      'skew-x': [{ 'skew-x': [skew] }],
      'skew-y': [{ 'skew-y': [skew] }],
      'transform-origin': [
        {
          origin: [
            'center',
            'top',
            'top-right',
            'right',
            'bottom-right',
            'bottom',
            'bottom-left',
            'left',
            'top-left',
            isArbitraryValue,
          ],
        },
      ],
      accent: [{ accent: ['auto', colors] }],
      appearance: [{ appearance: ['none', 'auto'] }],
      cursor: [
        {
          cursor: [
            'auto',
            'default',
            'pointer',
            'wait',
            'text',
            'move',
            'help',
            'not-allowed',
            'none',
            'context-menu',
            'progress',
            'cell',
            'crosshair',
            'vertical-text',
            'alias',
            'copy',
            'no-drop',
            'grab',
            'grabbing',
            'all-scroll',
            'col-resize',
            'row-resize',
            'n-resize',
            'e-resize',
            's-resize',
            'w-resize',
            'ne-resize',
            'nw-resize',
            'se-resize',
            'sw-resize',
            'ew-resize',
            'ns-resize',
            'nesw-resize',
            'nwse-resize',
            'zoom-in',
            'zoom-out',
            isArbitraryValue,
          ],
        },
      ],
      'caret-color': [{ caret: [colors] }],
      'pointer-events': [{ 'pointer-events': ['none', 'auto'] }],
      resize: [{ resize: ['none', 'y', 'x', ''] }],
      'scroll-behavior': [{ scroll: ['auto', 'smooth'] }],
      'scroll-m': [{ 'scroll-m': getSpacingWithArbitrary() }],
      'scroll-mx': [{ 'scroll-mx': getSpacingWithArbitrary() }],
      'scroll-my': [{ 'scroll-my': getSpacingWithArbitrary() }],
      'scroll-ms': [{ 'scroll-ms': getSpacingWithArbitrary() }],
      'scroll-me': [{ 'scroll-me': getSpacingWithArbitrary() }],
      'scroll-mt': [{ 'scroll-mt': getSpacingWithArbitrary() }],
      'scroll-mr': [{ 'scroll-mr': getSpacingWithArbitrary() }],
      'scroll-mb': [{ 'scroll-mb': getSpacingWithArbitrary() }],
      'scroll-ml': [{ 'scroll-ml': getSpacingWithArbitrary() }],
      'scroll-p': [{ 'scroll-p': getSpacingWithArbitrary() }],
      'scroll-px': [{ 'scroll-px': getSpacingWithArbitrary() }],
      'scroll-py': [{ 'scroll-py': getSpacingWithArbitrary() }],
      'scroll-ps': [{ 'scroll-ps': getSpacingWithArbitrary() }],
      'scroll-pe': [{ 'scroll-pe': getSpacingWithArbitrary() }],
      'scroll-pt': [{ 'scroll-pt': getSpacingWithArbitrary() }],
      'scroll-pr': [{ 'scroll-pr': getSpacingWithArbitrary() }],
      'scroll-pb': [{ 'scroll-pb': getSpacingWithArbitrary() }],
      'scroll-pl': [{ 'scroll-pl': getSpacingWithArbitrary() }],
      'snap-align': [{ snap: ['start', 'end', 'center', 'align-none'] }],
      'snap-stop': [{ snap: ['normal', 'always'] }],
      'snap-type': [{ snap: ['none', 'x', 'y', 'both'] }],
      'snap-strictness': [{ snap: ['mandatory', 'proximity'] }],
      touch: [{ touch: ['auto', 'none', 'manipulation'] }],
      'touch-x': [{ 'touch-pan': ['x', 'left', 'right'] }],
      'touch-y': [{ 'touch-pan': ['y', 'up', 'down'] }],
      'touch-pz': ['touch-pinch-zoom'],
      select: [{ select: ['none', 'text', 'all', 'auto'] }],
      'will-change': [
        { 'will-change': ['auto', 'scroll', 'contents', 'transform', isArbitraryValue] },
      ],
      fill: [{ fill: [colors, 'none'] }],
      'stroke-w': [{ stroke: [isLength, isArbitraryLength, isArbitraryNumber] }],
      stroke: [{ stroke: [colors, 'none'] }],
      sr: ['sr-only', 'not-sr-only'],
      'forced-color-adjust': [{ 'forced-color-adjust': ['auto', 'none'] }],
    },
    conflictingClassGroups: {
      overflow: ['overflow-x', 'overflow-y'],
      overscroll: ['overscroll-x', 'overscroll-y'],
      inset: ['inset-x', 'inset-y', 'start', 'end', 'top', 'right', 'bottom', 'left'],
      'inset-x': ['right', 'left'],
      'inset-y': ['top', 'bottom'],
      flex: ['basis', 'grow', 'shrink'],
      gap: ['gap-x', 'gap-y'],
      p: ['px', 'py', 'ps', 'pe', 'pt', 'pr', 'pb', 'pl'],
      px: ['pr', 'pl'],
      py: ['pt', 'pb'],
      m: ['mx', 'my', 'ms', 'me', 'mt', 'mr', 'mb', 'ml'],
      mx: ['mr', 'ml'],
      my: ['mt', 'mb'],
      size: ['w', 'h'],
      'font-size': ['leading'],
      'fvn-normal': [
        'fvn-ordinal',
        'fvn-slashed-zero',
        'fvn-figure',
        'fvn-spacing',
        'fvn-fraction',
      ],
      'fvn-ordinal': ['fvn-normal'],
      'fvn-slashed-zero': ['fvn-normal'],
      'fvn-figure': ['fvn-normal'],
      'fvn-spacing': ['fvn-normal'],
      'fvn-fraction': ['fvn-normal'],
      'line-clamp': ['display', 'overflow'],
      rounded: [
        'rounded-s',
        'rounded-e',
        'rounded-t',
        'rounded-r',
        'rounded-b',
        'rounded-l',
        'rounded-ss',
        'rounded-se',
        'rounded-ee',
        'rounded-es',
        'rounded-tl',
        'rounded-tr',
        'rounded-br',
        'rounded-bl',
      ],
      'rounded-s': ['rounded-ss', 'rounded-es'],
      'rounded-e': ['rounded-se', 'rounded-ee'],
      'rounded-t': ['rounded-tl', 'rounded-tr'],
      'rounded-r': ['rounded-tr', 'rounded-br'],
      'rounded-b': ['rounded-br', 'rounded-bl'],
      'rounded-l': ['rounded-tl', 'rounded-bl'],
      'border-spacing': ['border-spacing-x', 'border-spacing-y'],
      'border-w': [
        'border-w-s',
        'border-w-e',
        'border-w-t',
        'border-w-r',
        'border-w-b',
        'border-w-l',
      ],
      'border-w-x': ['border-w-r', 'border-w-l'],
      'border-w-y': ['border-w-t', 'border-w-b'],
      'border-color': [
        'border-color-s',
        'border-color-e',
        'border-color-t',
        'border-color-r',
        'border-color-b',
        'border-color-l',
      ],
      'border-color-x': ['border-color-r', 'border-color-l'],
      'border-color-y': ['border-color-t', 'border-color-b'],
      'scroll-m': [
        'scroll-mx',
        'scroll-my',
        'scroll-ms',
        'scroll-me',
        'scroll-mt',
        'scroll-mr',
        'scroll-mb',
        'scroll-ml',
      ],
      'scroll-mx': ['scroll-mr', 'scroll-ml'],
      'scroll-my': ['scroll-mt', 'scroll-mb'],
      'scroll-p': [
        'scroll-px',
        'scroll-py',
        'scroll-ps',
        'scroll-pe',
        'scroll-pt',
        'scroll-pr',
        'scroll-pb',
        'scroll-pl',
      ],
      'scroll-px': ['scroll-pr', 'scroll-pl'],
      'scroll-py': ['scroll-pt', 'scroll-pb'],
      touch: ['touch-x', 'touch-y', 'touch-pz'],
      'touch-x': ['touch'],
      'touch-y': ['touch'],
      'touch-pz': ['touch'],
    },
    conflictingClassGroupModifiers: { 'font-size': ['leading'] },
  }
}
var twMerge = /* @__PURE__ */ createTailwindMerge(getDefaultConfig)
//#endregion
//#region src/lib/utils.ts
/**
 * Merges multiple class names into a single string
 * @param inputs - Array of class names
 * @returns Merged class names
 */
function cn(...inputs) {
  return twMerge(clsx(inputs))
}
var formatPhone = (phone) => {
  if (!phone) return ''
  const digits = phone.toString().replace(/\D/g, '')
  if (digits.length >= 10 && digits.length <= 11)
    return digits.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3')
  return phone.trim()
}
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/@radix-ui+react-slot@1.2.4_@types+react@19.2.14_react@19.2.4/node_modules/@radix-ui/react-slot/dist/index.mjs
var REACT_LAZY_TYPE = Symbol.for('react.lazy')
var use = import_react[' use '.trim().toString()]
function isPromiseLike(value) {
  return typeof value === 'object' && value !== null && 'then' in value
}
function isLazyComponent(element) {
  return (
    element != null &&
    typeof element === 'object' &&
    '$$typeof' in element &&
    element.$$typeof === REACT_LAZY_TYPE &&
    '_payload' in element &&
    isPromiseLike(element._payload)
  )
}
/* @__NO_SIDE_EFFECTS__ */
function createSlot(ownerName) {
  const SlotClone = /* @__PURE__ */ createSlotClone(ownerName)
  const Slot2 = import_react.forwardRef((props, forwardedRef) => {
    let { children, ...slotProps } = props
    if (isLazyComponent(children) && typeof use === 'function') children = use(children._payload)
    const childrenArray = import_react.Children.toArray(children)
    const slottable = childrenArray.find(isSlottable)
    if (slottable) {
      const newElement = slottable.props.children
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (import_react.Children.count(newElement) > 1) return import_react.Children.only(null)
          return import_react.isValidElement(newElement) ? newElement.props.children : null
        } else return child
      })
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlotClone, {
        ...slotProps,
        ref: forwardedRef,
        children: import_react.isValidElement(newElement)
          ? import_react.cloneElement(newElement, void 0, newChildren)
          : null,
      })
    }
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlotClone, {
      ...slotProps,
      ref: forwardedRef,
      children,
    })
  })
  Slot2.displayName = `${ownerName}.Slot`
  return Slot2
}
var Slot = /* @__PURE__ */ createSlot('Slot')
/* @__NO_SIDE_EFFECTS__ */
function createSlotClone(ownerName) {
  const SlotClone = import_react.forwardRef((props, forwardedRef) => {
    let { children, ...slotProps } = props
    if (isLazyComponent(children) && typeof use === 'function') children = use(children._payload)
    if (import_react.isValidElement(children)) {
      const childrenRef = getElementRef(children)
      const props2 = mergeProps(slotProps, children.props)
      if (children.type !== import_react.Fragment)
        props2.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef
      return import_react.cloneElement(children, props2)
    }
    return import_react.Children.count(children) > 1 ? import_react.Children.only(null) : null
  })
  SlotClone.displayName = `${ownerName}.SlotClone`
  return SlotClone
}
var SLOTTABLE_IDENTIFIER = Symbol('radix.slottable')
function isSlottable(child) {
  return (
    import_react.isValidElement(child) &&
    typeof child.type === 'function' &&
    '__radixId' in child.type &&
    child.type.__radixId === SLOTTABLE_IDENTIFIER
  )
}
function mergeProps(slotProps, childProps) {
  const overrideProps = { ...childProps }
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName]
    const childPropValue = childProps[propName]
    if (/^on[A-Z]/.test(propName)) {
      if (slotPropValue && childPropValue)
        overrideProps[propName] = (...args) => {
          const result = childPropValue(...args)
          slotPropValue(...args)
          return result
        }
      else if (slotPropValue) overrideProps[propName] = slotPropValue
    } else if (propName === 'style')
      overrideProps[propName] = {
        ...slotPropValue,
        ...childPropValue,
      }
    else if (propName === 'className')
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(' ')
  }
  return {
    ...slotProps,
    ...overrideProps,
  }
}
function getElementRef(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, 'ref')?.get
  let mayWarn = getter && 'isReactWarning' in getter && getter.isReactWarning
  if (mayWarn) return element.ref
  getter = Object.getOwnPropertyDescriptor(element, 'ref')?.get
  mayWarn = getter && 'isReactWarning' in getter && getter.isReactWarning
  if (mayWarn) return element.props.ref
  return element.props.ref || element.ref
}
//#endregion
//#region src/components/ui/button.tsx
var buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'text-foreground underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
var Button = import_react.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : 'button', {
      'data-uid': 'src/components/ui/button.tsx:44:7',
      'data-prohibitions': '[editContent]',
      className: cn(
        buttonVariants({
          variant,
          size,
          className,
        }),
      ),
      ref,
      ...props,
    })
  },
)
Button.displayName = 'Button'
//#endregion
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/pocketbase@0.26.8/node_modules/pocketbase/dist/pocketbase.es.mjs
var ClientResponseError = class ClientResponseError extends Error {
  constructor(e) {
    ;(super('ClientResponseError'),
      (this.url = ''),
      (this.status = 0),
      (this.response = {}),
      (this.isAbort = !1),
      (this.originalError = null),
      Object.setPrototypeOf(this, ClientResponseError.prototype),
      null !== e &&
        'object' == typeof e &&
        ((this.originalError = e.originalError),
        (this.url = 'string' == typeof e.url ? e.url : ''),
        (this.status = 'number' == typeof e.status ? e.status : 0),
        (this.isAbort = !!e.isAbort || 'AbortError' === e.name || 'Aborted' === e.message),
        null !== e.response && 'object' == typeof e.response
          ? (this.response = e.response)
          : null !== e.data && 'object' == typeof e.data
            ? (this.response = e.data)
            : (this.response = {})),
      this.originalError || e instanceof ClientResponseError || (this.originalError = e),
      (this.name = 'ClientResponseError ' + this.status),
      (this.message = this.response?.message),
      this.message ||
        (this.isAbort
          ? (this.message =
              'The request was aborted (most likely autocancelled; you can find more info in https://github.com/pocketbase/js-sdk#auto-cancellation).')
          : this.originalError?.cause?.message?.includes('ECONNREFUSED ::1')
            ? (this.message =
                'Failed to connect to the PocketBase server. Try changing the SDK URL from localhost to 127.0.0.1 (https://github.com/pocketbase/js-sdk/issues/21).')
            : (this.message = 'Something went wrong.')),
      (this.cause = this.originalError))
  }
  get data() {
    return this.response
  }
  toJSON() {
    return { ...this }
  }
}
var e = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/
function cookieParse(e, t) {
  const s = {}
  if ('string' != typeof e) return s
  const i = Object.assign({}, t || {}).decode || defaultDecode
  let n = 0
  for (; n < e.length; ) {
    const t = e.indexOf('=', n)
    if (-1 === t) break
    let r = e.indexOf(';', n)
    if (-1 === r) r = e.length
    else if (r < t) {
      n = e.lastIndexOf(';', t - 1) + 1
      continue
    }
    const o = e.slice(n, t).trim()
    if (void 0 === s[o]) {
      let n = e.slice(t + 1, r).trim()
      34 === n.charCodeAt(0) && (n = n.slice(1, -1))
      try {
        s[o] = i(n)
      } catch (e) {
        s[o] = n
      }
    }
    n = r + 1
  }
  return s
}
function cookieSerialize(t, s, i) {
  const n = Object.assign({}, i || {}),
    r = n.encode || defaultEncode
  if (!e.test(t)) throw new TypeError('argument name is invalid')
  const o = r(s)
  if (o && !e.test(o)) throw new TypeError('argument val is invalid')
  let a = t + '=' + o
  if (null != n.maxAge) {
    const e = n.maxAge - 0
    if (isNaN(e) || !isFinite(e)) throw new TypeError('option maxAge is invalid')
    a += '; Max-Age=' + Math.floor(e)
  }
  if (n.domain) {
    if (!e.test(n.domain)) throw new TypeError('option domain is invalid')
    a += '; Domain=' + n.domain
  }
  if (n.path) {
    if (!e.test(n.path)) throw new TypeError('option path is invalid')
    a += '; Path=' + n.path
  }
  if (n.expires) {
    if (
      !(function isDate(e) {
        return '[object Date]' === Object.prototype.toString.call(e) || e instanceof Date
      })(n.expires) ||
      isNaN(n.expires.valueOf())
    )
      throw new TypeError('option expires is invalid')
    a += '; Expires=' + n.expires.toUTCString()
  }
  if ((n.httpOnly && (a += '; HttpOnly'), n.secure && (a += '; Secure'), n.priority))
    switch ('string' == typeof n.priority ? n.priority.toLowerCase() : n.priority) {
      case 'low':
        a += '; Priority=Low'
        break
      case 'medium':
        a += '; Priority=Medium'
        break
      case 'high':
        a += '; Priority=High'
        break
      default:
        throw new TypeError('option priority is invalid')
    }
  if (n.sameSite)
    switch ('string' == typeof n.sameSite ? n.sameSite.toLowerCase() : n.sameSite) {
      case !0:
        a += '; SameSite=Strict'
        break
      case 'lax':
        a += '; SameSite=Lax'
        break
      case 'strict':
        a += '; SameSite=Strict'
        break
      case 'none':
        a += '; SameSite=None'
        break
      default:
        throw new TypeError('option sameSite is invalid')
    }
  return a
}
function defaultDecode(e) {
  return -1 !== e.indexOf('%') ? decodeURIComponent(e) : e
}
function defaultEncode(e) {
  return encodeURIComponent(e)
}
var t =
  ('undefined' != typeof navigator && 'ReactNative' === navigator.product) ||
  ('undefined' != typeof global && global.HermesInternal)
var s
function getTokenPayload(e) {
  if (e)
    try {
      const t = decodeURIComponent(
        s(e.split('.')[1])
          .split('')
          .map(function (e) {
            return '%' + ('00' + e.charCodeAt(0).toString(16)).slice(-2)
          })
          .join(''),
      )
      return JSON.parse(t) || {}
    } catch (e) {}
  return {}
}
function isTokenExpired(e, t = 0) {
  let s = getTokenPayload(e)
  return !(Object.keys(s).length > 0 && (!s.exp || s.exp - t > Date.now() / 1e3))
}
s =
  'function' != typeof atob || t
    ? (e) => {
        let t = String(e).replace(/=+$/, '')
        if (t.length % 4 == 1)
          throw new Error("'atob' failed: The string to be decoded is not correctly encoded.")
        for (
          var s, i, n = 0, r = 0, o = '';
          (i = t.charAt(r++));
          ~i &&
          ((s = n % 4 ? 64 * s + i : i), n++ % 4) &&
          (o += String.fromCharCode(255 & (s >> ((-2 * n) & 6))))
        )
          i = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.indexOf(i)
        return o
      }
    : atob
var i = 'pb_auth'
var BaseAuthStore = class {
  constructor() {
    ;((this.baseToken = ''), (this.baseModel = null), (this._onChangeCallbacks = []))
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
    return !isTokenExpired(this.token)
  }
  get isSuperuser() {
    let e = getTokenPayload(this.token)
    return (
      'auth' == e.type &&
      ('_superusers' == this.record?.collectionName ||
        (!this.record?.collectionName && 'pbc_3142635823' == e.collectionId))
    )
  }
  get isAdmin() {
    return (
      console.warn(
        'Please replace pb.authStore.isAdmin with pb.authStore.isSuperuser OR simply check the value of pb.authStore.record?.collectionName',
      ),
      this.isSuperuser
    )
  }
  get isAuthRecord() {
    return (
      console.warn(
        'Please replace pb.authStore.isAuthRecord with !pb.authStore.isSuperuser OR simply check the value of pb.authStore.record?.collectionName',
      ),
      'auth' == getTokenPayload(this.token).type && !this.isSuperuser
    )
  }
  save(e, t) {
    ;((this.baseToken = e || ''), (this.baseModel = t || null), this.triggerChange())
  }
  clear() {
    ;((this.baseToken = ''), (this.baseModel = null), this.triggerChange())
  }
  loadFromCookie(e, t = i) {
    const s = cookieParse(e || '')[t] || ''
    let n = {}
    try {
      ;((n = JSON.parse(s)), ('object' != typeof n || Array.isArray(n)) && (n = {}))
    } catch (e) {}
    this.save(n.token || '', n.record || n.model || null)
  }
  exportToCookie(e, t = i) {
    const s = {
        secure: !0,
        sameSite: !0,
        httpOnly: !0,
        path: '/',
      },
      n = getTokenPayload(this.token)
    ;((s.expires = n?.exp
      ? /* @__PURE__ */ new Date(1e3 * n.exp)
      : /* @__PURE__ */ new Date('1970-01-01')),
      (e = Object.assign({}, s, e)))
    const r = {
      token: this.token,
      record: this.record ? JSON.parse(JSON.stringify(this.record)) : null,
    }
    let o = cookieSerialize(t, JSON.stringify(r), e)
    const a = 'undefined' != typeof Blob ? new Blob([o]).size : o.length
    if (r.record && a > 4096) {
      r.record = {
        id: r.record?.id,
        email: r.record?.email,
      }
      const s = ['collectionId', 'collectionName', 'verified']
      for (const e in this.record) s.includes(e) && (r.record[e] = this.record[e])
      o = cookieSerialize(t, JSON.stringify(r), e)
    }
    return o
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
    for (const e of this._onChangeCallbacks) e && e(this.token, this.record)
  }
}
var LocalAuthStore = class extends BaseAuthStore {
  constructor(e = 'pocketbase_auth') {
    ;(super(), (this.storageFallback = {}), (this.storageKey = e), this._bindStorageEvent())
  }
  get token() {
    return (this._storageGet(this.storageKey) || {}).token || ''
  }
  get record() {
    const e = this._storageGet(this.storageKey) || {}
    return e.record || e.model || null
  }
  get model() {
    return this.record
  }
  save(e, t) {
    ;(this._storageSet(this.storageKey, {
      token: e,
      record: t,
    }),
      super.save(e, t))
  }
  clear() {
    ;(this._storageRemove(this.storageKey), super.clear())
  }
  _storageGet(e) {
    if ('undefined' != typeof window && window?.localStorage) {
      const t = window.localStorage.getItem(e) || ''
      try {
        return JSON.parse(t)
      } catch (e) {
        return t
      }
    }
    return this.storageFallback[e]
  }
  _storageSet(e, t) {
    if ('undefined' != typeof window && window?.localStorage) {
      let s = t
      ;('string' != typeof t && (s = JSON.stringify(t)), window.localStorage.setItem(e, s))
    } else this.storageFallback[e] = t
  }
  _storageRemove(e) {
    ;('undefined' != typeof window && window?.localStorage && window.localStorage?.removeItem(e),
      delete this.storageFallback[e])
  }
  _bindStorageEvent() {
    'undefined' != typeof window &&
      window?.localStorage &&
      window.addEventListener &&
      window.addEventListener('storage', (e) => {
        if (e.key != this.storageKey) return
        const t = this._storageGet(this.storageKey) || {}
        super.save(t.token || '', t.record || t.model || null)
      })
  }
}
var BaseService = class {
  constructor(e) {
    this.client = e
  }
}
var SettingsService = class extends BaseService {
  async getAll(e) {
    return ((e = Object.assign({ method: 'GET' }, e)), this.client.send('/api/settings', e))
  }
  async update(e, t) {
    return (
      (t = Object.assign(
        {
          method: 'PATCH',
          body: e,
        },
        t,
      )),
      this.client.send('/api/settings', t)
    )
  }
  async testS3(e = 'storage', t) {
    return (
      (t = Object.assign(
        {
          method: 'POST',
          body: { filesystem: e },
        },
        t,
      )),
      this.client.send('/api/settings/test/s3', t).then(() => !0)
    )
  }
  async testEmail(e, t, s, i) {
    return (
      (i = Object.assign(
        {
          method: 'POST',
          body: {
            email: t,
            template: s,
            collection: e,
          },
        },
        i,
      )),
      this.client.send('/api/settings/test/email', i).then(() => !0)
    )
  }
  async generateAppleClientSecret(e, t, s, i, n, r) {
    return (
      (r = Object.assign(
        {
          method: 'POST',
          body: {
            clientId: e,
            teamId: t,
            keyId: s,
            privateKey: i,
            duration: n,
          },
        },
        r,
      )),
      this.client.send('/api/settings/apple/generate-client-secret', r)
    )
  }
}
var n = [
  'requestKey',
  '$cancelKey',
  '$autoCancel',
  'fetch',
  'headers',
  'body',
  'query',
  'params',
  'cache',
  'credentials',
  'headers',
  'integrity',
  'keepalive',
  'method',
  'mode',
  'redirect',
  'referrer',
  'referrerPolicy',
  'signal',
  'window',
]
function normalizeUnknownQueryParams(e) {
  if (e) {
    e.query = e.query || {}
    for (let t in e) n.includes(t) || ((e.query[t] = e[t]), delete e[t])
  }
}
function serializeQueryParams(e) {
  const t = []
  for (const s in e) {
    const i = encodeURIComponent(s),
      n = Array.isArray(e[s]) ? e[s] : [e[s]]
    for (let e of n) ((e = prepareQueryParamValue(e)), null !== e && t.push(i + '=' + e))
  }
  return t.join('&')
}
function prepareQueryParamValue(e) {
  return null == e
    ? null
    : e instanceof Date
      ? encodeURIComponent(e.toISOString().replace('T', ' '))
      : 'object' == typeof e
        ? encodeURIComponent(JSON.stringify(e))
        : encodeURIComponent(e)
}
var RealtimeService = class extends BaseService {
  constructor() {
    ;(super(...arguments),
      (this.clientId = ''),
      (this.eventSource = null),
      (this.subscriptions = {}),
      (this.lastSentSubscriptions = []),
      (this.maxConnectTimeout = 15e3),
      (this.reconnectAttempts = 0),
      (this.maxReconnectAttempts = Infinity),
      (this.predefinedReconnectIntervals = [200, 300, 500, 1e3, 1200, 1500, 2e3]),
      (this.pendingConnects = []))
  }
  get isConnected() {
    return !!this.eventSource && !!this.clientId && !this.pendingConnects.length
  }
  async subscribe(e, t, s) {
    if (!e) throw new Error('topic must be set.')
    let i = e
    if (s) {
      normalizeUnknownQueryParams((s = Object.assign({}, s)))
      const e =
        'options=' +
        encodeURIComponent(
          JSON.stringify({
            query: s.query,
            headers: s.headers,
          }),
        )
      i += (i.includes('?') ? '&' : '?') + e
    }
    const listener = function (e) {
      const s = e
      let i
      try {
        i = JSON.parse(s?.data)
      } catch {}
      t(i || {})
    }
    return (
      this.subscriptions[i] || (this.subscriptions[i] = []),
      this.subscriptions[i].push(listener),
      this.isConnected
        ? 1 === this.subscriptions[i].length
          ? await this.submitSubscriptions()
          : this.eventSource?.addEventListener(i, listener)
        : await this.connect(),
      async () => this.unsubscribeByTopicAndListener(e, listener)
    )
  }
  async unsubscribe(e) {
    let t = !1
    if (e) {
      const s = this.getSubscriptionsByTopic(e)
      for (let e in s)
        if (this.hasSubscriptionListeners(e)) {
          for (let t of this.subscriptions[e]) this.eventSource?.removeEventListener(e, t)
          ;(delete this.subscriptions[e], t || (t = !0))
        }
    } else this.subscriptions = {}
    this.hasSubscriptionListeners() ? t && (await this.submitSubscriptions()) : this.disconnect()
  }
  async unsubscribeByPrefix(e) {
    let t = !1
    for (let s in this.subscriptions)
      if ((s + '?').startsWith(e)) {
        t = !0
        for (let e of this.subscriptions[s]) this.eventSource?.removeEventListener(s, e)
        delete this.subscriptions[s]
      }
    t && (this.hasSubscriptionListeners() ? await this.submitSubscriptions() : this.disconnect())
  }
  async unsubscribeByTopicAndListener(e, t) {
    let s = !1
    const i = this.getSubscriptionsByTopic(e)
    for (let e in i) {
      if (!Array.isArray(this.subscriptions[e]) || !this.subscriptions[e].length) continue
      let i = !1
      for (let s = this.subscriptions[e].length - 1; s >= 0; s--)
        this.subscriptions[e][s] === t &&
          ((i = !0),
          delete this.subscriptions[e][s],
          this.subscriptions[e].splice(s, 1),
          this.eventSource?.removeEventListener(e, t))
      i &&
        (this.subscriptions[e].length || delete this.subscriptions[e],
        s || this.hasSubscriptionListeners(e) || (s = !0))
    }
    this.hasSubscriptionListeners() ? s && (await this.submitSubscriptions()) : this.disconnect()
  }
  hasSubscriptionListeners(e) {
    if (((this.subscriptions = this.subscriptions || {}), e)) return !!this.subscriptions[e]?.length
    for (let e in this.subscriptions) if (this.subscriptions[e]?.length) return !0
    return !1
  }
  async submitSubscriptions() {
    if (this.clientId)
      return (
        this.addAllSubscriptionListeners(),
        (this.lastSentSubscriptions = this.getNonEmptySubscriptionKeys()),
        this.client
          .send('/api/realtime', {
            method: 'POST',
            body: {
              clientId: this.clientId,
              subscriptions: this.lastSentSubscriptions,
            },
            requestKey: this.getSubscriptionsCancelKey(),
          })
          .catch((e) => {
            if (!e?.isAbort) throw e
          })
      )
  }
  getSubscriptionsCancelKey() {
    return 'realtime_' + this.clientId
  }
  getSubscriptionsByTopic(e) {
    const t = {}
    e = e.includes('?') ? e : e + '?'
    for (let s in this.subscriptions) (s + '?').startsWith(e) && (t[s] = this.subscriptions[s])
    return t
  }
  getNonEmptySubscriptionKeys() {
    const e = []
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
        ;(this.pendingConnects.push({
          resolve: e,
          reject: t,
        }),
          this.pendingConnects.length > 1 || this.initConnect())
      })
  }
  initConnect() {
    ;(this.disconnect(!0),
      clearTimeout(this.connectTimeoutId),
      (this.connectTimeoutId = setTimeout(() => {
        this.connectErrorHandler(/* @__PURE__ */ new Error('EventSource connect took too long.'))
      }, this.maxConnectTimeout)),
      (this.eventSource = new EventSource(this.client.buildURL('/api/realtime'))),
      (this.eventSource.onerror = (e) => {
        this.connectErrorHandler(
          /* @__PURE__ */ new Error('Failed to establish realtime connection.'),
        )
      }),
      this.eventSource.addEventListener('PB_CONNECT', (e) => {
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
              const t = this.getSubscriptionsByTopic('PB_CONNECT')
              for (let s in t) for (let i of t[s]) i(e)
            })
            .catch((e) => {
              ;((this.clientId = ''), this.connectErrorHandler(e))
            }))
      }))
  }
  hasUnsentSubscriptions() {
    const e = this.getNonEmptySubscriptionKeys()
    if (e.length != this.lastSentSubscriptions.length) return !0
    for (const t of e) if (!this.lastSentSubscriptions.includes(t)) return !0
    return !1
  }
  connectErrorHandler(e) {
    if (
      (clearTimeout(this.connectTimeoutId),
      clearTimeout(this.reconnectTimeoutId),
      (!this.clientId && !this.reconnectAttempts) ||
        this.reconnectAttempts > this.maxReconnectAttempts)
    ) {
      for (let t of this.pendingConnects) t.reject(new ClientResponseError(e))
      ;((this.pendingConnects = []), this.disconnect())
      return
    }
    this.disconnect(!0)
    const t =
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
      (this.clientId = ''),
      !e)
    ) {
      this.reconnectAttempts = 0
      for (let e of this.pendingConnects) e.resolve()
      this.pendingConnects = []
    }
  }
}
var CrudService = class extends BaseService {
  decode(e) {
    return e
  }
  async getFullList(e, t) {
    if ('number' == typeof e) return this._getFullList(e, t)
    let s = 1e3
    return (
      (t = Object.assign({}, e, t)).batch && ((s = t.batch), delete t.batch),
      this._getFullList(s, t)
    )
  }
  async getList(e = 1, t = 30, s) {
    return (
      ((s = Object.assign({ method: 'GET' }, s)).query = Object.assign(
        {
          page: e,
          perPage: t,
        },
        s.query,
      )),
      this.client
        .send(this.baseCrudPath, s)
        .then((e) => ((e.items = e.items?.map((e) => this.decode(e)) || []), e))
    )
  }
  async getFirstListItem(e, t) {
    return (
      ((t = Object.assign(
        { requestKey: 'one_by_filter_' + this.baseCrudPath + '_' + e },
        t,
      )).query = Object.assign(
        {
          filter: e,
          skipTotal: 1,
        },
        t.query,
      )),
      this.getList(1, 1, t).then((e) => {
        if (!e?.items?.length)
          throw new ClientResponseError({
            status: 404,
            response: {
              code: 404,
              message: "The requested resource wasn't found.",
              data: {},
            },
          })
        return e.items[0]
      })
    )
  }
  async getOne(e, t) {
    if (!e)
      throw new ClientResponseError({
        url: this.client.buildURL(this.baseCrudPath + '/'),
        status: 404,
        response: {
          code: 404,
          message: 'Missing required record id.',
          data: {},
        },
      })
    return (
      (t = Object.assign({ method: 'GET' }, t)),
      this.client
        .send(this.baseCrudPath + '/' + encodeURIComponent(e), t)
        .then((e) => this.decode(e))
    )
  }
  async create(e, t) {
    return (
      (t = Object.assign(
        {
          method: 'POST',
          body: e,
        },
        t,
      )),
      this.client.send(this.baseCrudPath, t).then((e) => this.decode(e))
    )
  }
  async update(e, t, s) {
    return (
      (s = Object.assign(
        {
          method: 'PATCH',
          body: t,
        },
        s,
      )),
      this.client
        .send(this.baseCrudPath + '/' + encodeURIComponent(e), s)
        .then((e) => this.decode(e))
    )
  }
  async delete(e, t) {
    return (
      (t = Object.assign({ method: 'DELETE' }, t)),
      this.client.send(this.baseCrudPath + '/' + encodeURIComponent(e), t).then(() => !0)
    )
  }
  _getFullList(e = 1e3, t) {
    ;(t = t || {}).query = Object.assign({ skipTotal: 1 }, t.query)
    let s = [],
      request = async (i) =>
        this.getList(i, e || 1e3, t).then((e) => {
          const t = e.items
          return ((s = s.concat(t)), t.length == e.perPage ? request(i + 1) : s)
        })
    return request(1)
  }
}
function normalizeLegacyOptionsArgs(e, t, s, i) {
  const n = void 0 !== i
  return n || void 0 !== s
    ? n
      ? (console.warn(e),
        (t.body = Object.assign({}, t.body, s)),
        (t.query = Object.assign({}, t.query, i)),
        t)
      : Object.assign(t, s)
    : t
}
function resetAutoRefresh(e) {
  e._resetAutoRefresh?.()
}
var RecordService = class extends CrudService {
  constructor(e, t) {
    ;(super(e), (this.collectionIdOrName = t))
  }
  get baseCrudPath() {
    return this.baseCollectionPath + '/records'
  }
  get baseCollectionPath() {
    return '/api/collections/' + encodeURIComponent(this.collectionIdOrName)
  }
  get isSuperusers() {
    return '_superusers' == this.collectionIdOrName || '_pbc_2773867675' == this.collectionIdOrName
  }
  async subscribe(e, t, s) {
    if (!e) throw new Error('Missing topic.')
    if (!t) throw new Error('Missing subscription callback.')
    return this.client.realtime.subscribe(this.collectionIdOrName + '/' + e, t, s)
  }
  async unsubscribe(e) {
    return e
      ? this.client.realtime.unsubscribe(this.collectionIdOrName + '/' + e)
      : this.client.realtime.unsubscribeByPrefix(this.collectionIdOrName)
  }
  async getFullList(e, t) {
    if ('number' == typeof e) return super.getFullList(e, t)
    const s = Object.assign({}, e, t)
    return super.getFullList(s)
  }
  async getList(e = 1, t = 30, s) {
    return super.getList(e, t, s)
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
  async update(e, t, s) {
    return super.update(e, t, s).then((e) => {
      if (
        this.client.authStore.record?.id === e?.id &&
        (this.client.authStore.record?.collectionId === this.collectionIdOrName ||
          this.client.authStore.record?.collectionName === this.collectionIdOrName)
      ) {
        let t = Object.assign({}, this.client.authStore.record.expand),
          s = Object.assign({}, this.client.authStore.record, e)
        ;(t && (s.expand = Object.assign(t, e.expand)),
          this.client.authStore.save(this.client.authStore.token, s))
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
    const t = this.decode(e?.record || {})
    return (
      this.client.authStore.save(e?.token, t),
      Object.assign({}, e, {
        token: e?.token || '',
        record: t,
      })
    )
  }
  async listAuthMethods(e) {
    return (
      (e = Object.assign(
        {
          method: 'GET',
          fields: 'mfa,otp,password,oauth2',
        },
        e,
      )),
      this.client.send(this.baseCollectionPath + '/auth-methods', e)
    )
  }
  async authWithPassword(e, t, s) {
    let i
    ;((s = Object.assign(
      {
        method: 'POST',
        body: {
          identity: e,
          password: t,
        },
      },
      s,
    )),
      this.isSuperusers &&
        ((i = s.autoRefreshThreshold),
        delete s.autoRefreshThreshold,
        s.autoRefresh || resetAutoRefresh(this.client)))
    let n = await this.client.send(this.baseCollectionPath + '/auth-with-password', s)
    return (
      (n = this.authResponse(n)),
      i &&
        this.isSuperusers &&
        (function registerAutoRefresh(e, t, s, i) {
          resetAutoRefresh(e)
          const n = e.beforeSend,
            r = e.authStore.record,
            o = e.authStore.onChange((t, s) => {
              ;(!t ||
                s?.id != r?.id ||
                ((s?.collectionId || r?.collectionId) && s?.collectionId != r?.collectionId)) &&
                resetAutoRefresh(e)
            })
          ;((e._resetAutoRefresh = function () {
            ;(o(), (e.beforeSend = n), delete e._resetAutoRefresh)
          }),
            (e.beforeSend = async (r, o) => {
              const a = e.authStore.token
              if (o.query?.autoRefresh)
                return n
                  ? n(r, o)
                  : {
                      url: r,
                      sendOptions: o,
                    }
              let c = e.authStore.isValid
              if (c && isTokenExpired(e.authStore.token, t))
                try {
                  await s()
                } catch (e) {
                  c = !1
                }
              c || (await i())
              const l = o.headers || {}
              for (let t in l)
                if ('authorization' == t.toLowerCase() && a == l[t] && e.authStore.token) {
                  l[t] = e.authStore.token
                  break
                }
              return (
                (o.headers = l),
                n
                  ? n(r, o)
                  : {
                      url: r,
                      sendOptions: o,
                    }
              )
            }))
        })(
          this.client,
          i,
          () => this.authRefresh({ autoRefresh: !0 }),
          () => this.authWithPassword(e, t, Object.assign({ autoRefresh: !0 }, s)),
        ),
      n
    )
  }
  async authWithOAuth2Code(e, t, s, i, n, r, o) {
    let a = {
      method: 'POST',
      body: {
        provider: e,
        code: t,
        codeVerifier: s,
        redirectURL: i,
        createData: n,
      },
    }
    return (
      (a = normalizeLegacyOptionsArgs(
        'This form of authWithOAuth2Code(provider, code, codeVerifier, redirectURL, createData?, body?, query?) is deprecated. Consider replacing it with authWithOAuth2Code(provider, code, codeVerifier, redirectURL, createData?, options?).',
        a,
        r,
        o,
      )),
      this.client
        .send(this.baseCollectionPath + '/auth-with-oauth2', a)
        .then((e) => this.authResponse(e))
    )
  }
  authWithOAuth2(...e) {
    if (e.length > 1 || 'string' == typeof e?.[0])
      return (
        console.warn(
          'PocketBase: This form of authWithOAuth2() is deprecated and may get removed in the future. Please replace with authWithOAuth2Code() OR use the authWithOAuth2() realtime form as shown in https://pocketbase.io/docs/authentication/#oauth2-integration.',
        ),
        this.authWithOAuth2Code(
          e?.[0] || '',
          e?.[1] || '',
          e?.[2] || '',
          e?.[3] || '',
          e?.[4] || {},
          e?.[5] || {},
          e?.[6] || {},
        )
      )
    const t = e?.[0] || {}
    let s = null
    t.urlCallback || (s = openBrowserPopup(void 0))
    const i = new RealtimeService(this.client)
    function cleanup() {
      ;(s?.close(), i.unsubscribe())
    }
    const n = {},
      r = t.requestKey
    return (
      r && (n.requestKey = r),
      this.listAuthMethods(n)
        .then((e) => {
          const n = e.oauth2.providers.find((e) => e.name === t.provider)
          if (!n)
            throw new ClientResponseError(
              /* @__PURE__ */ new Error(`Missing or invalid provider "${t.provider}".`),
            )
          const o = this.client.buildURL('/api/oauth2-redirect')
          return new Promise(async (e, a) => {
            const c = r ? this.client.cancelControllers?.[r] : void 0
            ;(c &&
              (c.signal.onabort = () => {
                ;(cleanup(),
                  a(
                    new ClientResponseError({
                      isAbort: !0,
                      message: 'manually cancelled',
                    }),
                  ))
              }),
              (i.onDisconnect = (e) => {
                e.length &&
                  a &&
                  (cleanup(),
                  a(
                    new ClientResponseError(
                      /* @__PURE__ */ new Error('realtime connection interrupted'),
                    ),
                  ))
              }))
            try {
              await i.subscribe('@oauth2', async (s) => {
                const r = i.clientId
                try {
                  if (!s.state || r !== s.state) throw new Error("State parameters don't match.")
                  if (s.error || !s.code)
                    throw new Error('OAuth2 redirect error or missing code: ' + s.error)
                  const i = Object.assign({}, t)
                  ;(delete i.provider,
                    delete i.scopes,
                    delete i.createData,
                    delete i.urlCallback,
                    c?.signal?.onabort && (c.signal.onabort = null))
                  e(
                    await this.authWithOAuth2Code(
                      n.name,
                      s.code,
                      n.codeVerifier,
                      o,
                      t.createData,
                      i,
                    ),
                  )
                } catch (e) {
                  a(new ClientResponseError(e))
                }
                cleanup()
              })
              const r = { state: i.clientId }
              t.scopes?.length && (r.scope = t.scopes.join(' '))
              const l = this._replaceQueryParams(n.authURL + o, r)
              await (
                t.urlCallback ||
                function (e) {
                  s ? (s.location.href = e) : (s = openBrowserPopup(e))
                }
              )(l)
            } catch (e) {
              ;(c?.signal?.onabort && (c.signal.onabort = null),
                cleanup(),
                a(new ClientResponseError(e)))
            }
          })
        })
        .catch((e) => {
          throw (cleanup(), e)
        })
    )
  }
  async authRefresh(e, t) {
    let s = { method: 'POST' }
    return (
      (s = normalizeLegacyOptionsArgs(
        'This form of authRefresh(body?, query?) is deprecated. Consider replacing it with authRefresh(options?).',
        s,
        e,
        t,
      )),
      this.client
        .send(this.baseCollectionPath + '/auth-refresh', s)
        .then((e) => this.authResponse(e))
    )
  }
  async requestPasswordReset(e, t, s) {
    let i = {
      method: 'POST',
      body: { email: e },
    }
    return (
      (i = normalizeLegacyOptionsArgs(
        'This form of requestPasswordReset(email, body?, query?) is deprecated. Consider replacing it with requestPasswordReset(email, options?).',
        i,
        t,
        s,
      )),
      this.client.send(this.baseCollectionPath + '/request-password-reset', i).then(() => !0)
    )
  }
  async confirmPasswordReset(e, t, s, i, n) {
    let r = {
      method: 'POST',
      body: {
        token: e,
        password: t,
        passwordConfirm: s,
      },
    }
    return (
      (r = normalizeLegacyOptionsArgs(
        'This form of confirmPasswordReset(token, password, passwordConfirm, body?, query?) is deprecated. Consider replacing it with confirmPasswordReset(token, password, passwordConfirm, options?).',
        r,
        i,
        n,
      )),
      this.client.send(this.baseCollectionPath + '/confirm-password-reset', r).then(() => !0)
    )
  }
  async requestVerification(e, t, s) {
    let i = {
      method: 'POST',
      body: { email: e },
    }
    return (
      (i = normalizeLegacyOptionsArgs(
        'This form of requestVerification(email, body?, query?) is deprecated. Consider replacing it with requestVerification(email, options?).',
        i,
        t,
        s,
      )),
      this.client.send(this.baseCollectionPath + '/request-verification', i).then(() => !0)
    )
  }
  async confirmVerification(e, t, s) {
    let i = {
      method: 'POST',
      body: { token: e },
    }
    return (
      (i = normalizeLegacyOptionsArgs(
        'This form of confirmVerification(token, body?, query?) is deprecated. Consider replacing it with confirmVerification(token, options?).',
        i,
        t,
        s,
      )),
      this.client.send(this.baseCollectionPath + '/confirm-verification', i).then(() => {
        const t = getTokenPayload(e),
          s = this.client.authStore.record
        return (
          s &&
            !s.verified &&
            s.id === t.id &&
            s.collectionId === t.collectionId &&
            ((s.verified = !0), this.client.authStore.save(this.client.authStore.token, s)),
          !0
        )
      })
    )
  }
  async requestEmailChange(e, t, s) {
    let i = {
      method: 'POST',
      body: { newEmail: e },
    }
    return (
      (i = normalizeLegacyOptionsArgs(
        'This form of requestEmailChange(newEmail, body?, query?) is deprecated. Consider replacing it with requestEmailChange(newEmail, options?).',
        i,
        t,
        s,
      )),
      this.client.send(this.baseCollectionPath + '/request-email-change', i).then(() => !0)
    )
  }
  async confirmEmailChange(e, t, s, i) {
    let n = {
      method: 'POST',
      body: {
        token: e,
        password: t,
      },
    }
    return (
      (n = normalizeLegacyOptionsArgs(
        'This form of confirmEmailChange(token, password, body?, query?) is deprecated. Consider replacing it with confirmEmailChange(token, password, options?).',
        n,
        s,
        i,
      )),
      this.client.send(this.baseCollectionPath + '/confirm-email-change', n).then(() => {
        const t = getTokenPayload(e),
          s = this.client.authStore.record
        return (
          s && s.id === t.id && s.collectionId === t.collectionId && this.client.authStore.clear(),
          !0
        )
      })
    )
  }
  async listExternalAuths(e, t) {
    return this.client
      .collection('_externalAuths')
      .getFullList(
        Object.assign({}, t, { filter: this.client.filter('recordRef = {:id}', { id: e }) }),
      )
  }
  async unlinkExternalAuth(e, t, s) {
    const i = await this.client.collection('_externalAuths').getFirstListItem(
      this.client.filter('recordRef = {:recordId} && provider = {:provider}', {
        recordId: e,
        provider: t,
      }),
    )
    return this.client
      .collection('_externalAuths')
      .delete(i.id, s)
      .then(() => !0)
  }
  async requestOTP(e, t) {
    return (
      (t = Object.assign(
        {
          method: 'POST',
          body: { email: e },
        },
        t,
      )),
      this.client.send(this.baseCollectionPath + '/request-otp', t)
    )
  }
  async authWithOTP(e, t, s) {
    return (
      (s = Object.assign(
        {
          method: 'POST',
          body: {
            otpId: e,
            password: t,
          },
        },
        s,
      )),
      this.client
        .send(this.baseCollectionPath + '/auth-with-otp', s)
        .then((e) => this.authResponse(e))
    )
  }
  async impersonate(e, t, s) {
    ;(((s = Object.assign(
      {
        method: 'POST',
        body: { duration: t },
      },
      s,
    )).headers = s.headers || {}),
      s.headers.Authorization || (s.headers.Authorization = this.client.authStore.token))
    const i = new Client(this.client.baseURL, new BaseAuthStore(), this.client.lang),
      n = await i.send(this.baseCollectionPath + '/impersonate/' + encodeURIComponent(e), s)
    return (i.authStore.save(n?.token, this.decode(n?.record || {})), i)
  }
  _replaceQueryParams(e, t = {}) {
    let s = e,
      i = ''
    e.indexOf('?') >= 0 &&
      ((s = e.substring(0, e.indexOf('?'))), (i = e.substring(e.indexOf('?') + 1)))
    const n = {},
      r = i.split('&')
    for (const e of r) {
      if ('' == e) continue
      const t = e.split('=')
      n[decodeURIComponent(t[0].replace(/\+/g, ' '))] = decodeURIComponent(
        (t[1] || '').replace(/\+/g, ' '),
      )
    }
    for (let e in t) t.hasOwnProperty(e) && (null == t[e] ? delete n[e] : (n[e] = t[e]))
    i = ''
    for (let e in n)
      n.hasOwnProperty(e) &&
        ('' != i && (i += '&'),
        (i +=
          encodeURIComponent(e.replace(/%20/g, '+')) +
          '=' +
          encodeURIComponent(n[e].replace(/%20/g, '+'))))
    return '' != i ? s + '?' + i : s
  }
}
function openBrowserPopup(e) {
  if ('undefined' == typeof window || !window?.open)
    throw new ClientResponseError(
      /* @__PURE__ */ new Error(
        'Not in a browser context - please pass a custom urlCallback function.',
      ),
    )
  let t = 1024,
    s = 768,
    i = window.innerWidth,
    n = window.innerHeight
  ;((t = t > i ? i : t), (s = s > n ? n : s))
  let r = i / 2 - t / 2,
    o = n / 2 - s / 2
  return window.open(
    e,
    'popup_window',
    'width=' + t + ',height=' + s + ',top=' + o + ',left=' + r + ',resizable,menubar=no',
  )
}
var CollectionService = class extends CrudService {
  get baseCrudPath() {
    return '/api/collections'
  }
  async import(e, t = !1, s) {
    return (
      (s = Object.assign(
        {
          method: 'PUT',
          body: {
            collections: e,
            deleteMissing: t,
          },
        },
        s,
      )),
      this.client.send(this.baseCrudPath + '/import', s).then(() => !0)
    )
  }
  async getScaffolds(e) {
    return (
      (e = Object.assign({ method: 'GET' }, e)),
      this.client.send(this.baseCrudPath + '/meta/scaffolds', e)
    )
  }
  async truncate(e, t) {
    return (
      (t = Object.assign({ method: 'DELETE' }, t)),
      this.client
        .send(this.baseCrudPath + '/' + encodeURIComponent(e) + '/truncate', t)
        .then(() => !0)
    )
  }
}
var LogService = class extends BaseService {
  async getList(e = 1, t = 30, s) {
    return (
      ((s = Object.assign({ method: 'GET' }, s)).query = Object.assign(
        {
          page: e,
          perPage: t,
        },
        s.query,
      )),
      this.client.send('/api/logs', s)
    )
  }
  async getOne(e, t) {
    if (!e)
      throw new ClientResponseError({
        url: this.client.buildURL('/api/logs/'),
        status: 404,
        response: {
          code: 404,
          message: 'Missing required log id.',
          data: {},
        },
      })
    return (
      (t = Object.assign({ method: 'GET' }, t)),
      this.client.send('/api/logs/' + encodeURIComponent(e), t)
    )
  }
  async getStats(e) {
    return ((e = Object.assign({ method: 'GET' }, e)), this.client.send('/api/logs/stats', e))
  }
}
var HealthService = class extends BaseService {
  async check(e) {
    return ((e = Object.assign({ method: 'GET' }, e)), this.client.send('/api/health', e))
  }
}
var FileService = class extends BaseService {
  getUrl(e, t, s = {}) {
    return (
      console.warn('Please replace pb.files.getUrl() with pb.files.getURL()'), this.getURL(e, t, s)
    )
  }
  getURL(e, t, s = {}) {
    if (!t || !e?.id || (!e?.collectionId && !e?.collectionName)) return ''
    const i = []
    ;(i.push('api'),
      i.push('files'),
      i.push(encodeURIComponent(e.collectionId || e.collectionName)),
      i.push(encodeURIComponent(e.id)),
      i.push(encodeURIComponent(t)))
    let n = this.client.buildURL(i.join('/'))
    !1 === s.download && delete s.download
    const r = serializeQueryParams(s)
    return (r && (n += (n.includes('?') ? '&' : '?') + r), n)
  }
  async getToken(e) {
    return (
      (e = Object.assign({ method: 'POST' }, e)),
      this.client.send('/api/files/token', e).then((e) => e?.token || '')
    )
  }
}
var BackupService = class extends BaseService {
  async getFullList(e) {
    return ((e = Object.assign({ method: 'GET' }, e)), this.client.send('/api/backups', e))
  }
  async create(e, t) {
    return (
      (t = Object.assign(
        {
          method: 'POST',
          body: { name: e },
        },
        t,
      )),
      this.client.send('/api/backups', t).then(() => !0)
    )
  }
  async upload(e, t) {
    return (
      (t = Object.assign(
        {
          method: 'POST',
          body: e,
        },
        t,
      )),
      this.client.send('/api/backups/upload', t).then(() => !0)
    )
  }
  async delete(e, t) {
    return (
      (t = Object.assign({ method: 'DELETE' }, t)),
      this.client.send(`/api/backups/${encodeURIComponent(e)}`, t).then(() => !0)
    )
  }
  async restore(e, t) {
    return (
      (t = Object.assign({ method: 'POST' }, t)),
      this.client.send(`/api/backups/${encodeURIComponent(e)}/restore`, t).then(() => !0)
    )
  }
  getDownloadUrl(e, t) {
    return (
      console.warn('Please replace pb.backups.getDownloadUrl() with pb.backups.getDownloadURL()'),
      this.getDownloadURL(e, t)
    )
  }
  getDownloadURL(e, t) {
    return this.client.buildURL(
      `/api/backups/${encodeURIComponent(t)}?token=${encodeURIComponent(e)}`,
    )
  }
}
var CronService = class extends BaseService {
  async getFullList(e) {
    return ((e = Object.assign({ method: 'GET' }, e)), this.client.send('/api/crons', e))
  }
  async run(e, t) {
    return (
      (t = Object.assign({ method: 'POST' }, t)),
      this.client.send(`/api/crons/${encodeURIComponent(e)}`, t).then(() => !0)
    )
  }
}
function isFile(e) {
  return (
    ('undefined' != typeof Blob && e instanceof Blob) ||
    ('undefined' != typeof File && e instanceof File) ||
    (null !== e &&
      'object' == typeof e &&
      e.uri &&
      (('undefined' != typeof navigator && 'ReactNative' === navigator.product) ||
        ('undefined' != typeof global && global.HermesInternal)))
  )
}
function isFormData(e) {
  return (
    e &&
    ('FormData' === e.constructor?.name ||
      ('undefined' != typeof FormData && e instanceof FormData))
  )
}
function hasFileField(e) {
  for (const t in e) {
    const s = Array.isArray(e[t]) ? e[t] : [e[t]]
    for (const e of s) if (isFile(e)) return !0
  }
  return !1
}
var r = /^[\-\.\d]+$/
function inferFormDataValue(e) {
  if ('string' != typeof e) return e
  if ('true' == e) return !0
  if ('false' == e) return !1
  if (('-' === e[0] || (e[0] >= '0' && e[0] <= '9')) && r.test(e)) {
    let t = +e
    if ('' + t === e) return t
  }
  return e
}
var BatchService = class extends BaseService {
  constructor() {
    ;(super(...arguments), (this.requests = []), (this.subs = {}))
  }
  collection(e) {
    return (this.subs[e] || (this.subs[e] = new SubBatchService(this.requests, e)), this.subs[e])
  }
  async send(e) {
    const t = new FormData(),
      s = []
    for (let e = 0; e < this.requests.length; e++) {
      const i = this.requests[e]
      if (
        (s.push({
          method: i.method,
          url: i.url,
          headers: i.headers,
          body: i.json,
        }),
        i.files)
      )
        for (let s in i.files) {
          const n = i.files[s] || []
          for (let i of n) t.append('requests.' + e + '.' + s, i)
        }
    }
    return (
      t.append('@jsonPayload', JSON.stringify({ requests: s })),
      (e = Object.assign(
        {
          method: 'POST',
          body: t,
        },
        e,
      )),
      this.client.send('/api/batch', e)
    )
  }
}
var SubBatchService = class {
  constructor(e, t) {
    ;((this.requests = []), (this.requests = e), (this.collectionIdOrName = t))
  }
  upsert(e, t) {
    t = Object.assign({ body: e || {} }, t)
    const s = {
      method: 'PUT',
      url: '/api/collections/' + encodeURIComponent(this.collectionIdOrName) + '/records',
    }
    ;(this.prepareRequest(s, t), this.requests.push(s))
  }
  create(e, t) {
    t = Object.assign({ body: e || {} }, t)
    const s = {
      method: 'POST',
      url: '/api/collections/' + encodeURIComponent(this.collectionIdOrName) + '/records',
    }
    ;(this.prepareRequest(s, t), this.requests.push(s))
  }
  update(e, t, s) {
    s = Object.assign({ body: t || {} }, s)
    const i = {
      method: 'PATCH',
      url:
        '/api/collections/' +
        encodeURIComponent(this.collectionIdOrName) +
        '/records/' +
        encodeURIComponent(e),
    }
    ;(this.prepareRequest(i, s), this.requests.push(i))
  }
  delete(e, t) {
    t = Object.assign({}, t)
    const s = {
      method: 'DELETE',
      url:
        '/api/collections/' +
        encodeURIComponent(this.collectionIdOrName) +
        '/records/' +
        encodeURIComponent(e),
    }
    ;(this.prepareRequest(s, t), this.requests.push(s))
  }
  prepareRequest(e, t) {
    if (
      (normalizeUnknownQueryParams(t),
      (e.headers = t.headers),
      (e.json = {}),
      (e.files = {}),
      void 0 !== t.query)
    ) {
      const s = serializeQueryParams(t.query)
      s && (e.url += (e.url.includes('?') ? '&' : '?') + s)
    }
    let s = t.body
    isFormData(s) &&
      (s = (function convertFormDataToObject(e) {
        let t = {}
        return (
          e.forEach((e, s) => {
            if ('@jsonPayload' === s && 'string' == typeof e)
              try {
                let s = JSON.parse(e)
                Object.assign(t, s)
              } catch (e) {
                console.warn('@jsonPayload error:', e)
              }
            else
              void 0 !== t[s]
                ? (Array.isArray(t[s]) || (t[s] = [t[s]]), t[s].push(inferFormDataValue(e)))
                : (t[s] = inferFormDataValue(e))
          }),
          t
        )
      })(s))
    for (const t in s) {
      const i = s[t]
      if (isFile(i)) ((e.files[t] = e.files[t] || []), e.files[t].push(i))
      else if (Array.isArray(i)) {
        const s = [],
          n = []
        for (const e of i) isFile(e) ? s.push(e) : n.push(e)
        if (s.length > 0 && s.length == i.length) {
          e.files[t] = e.files[t] || []
          for (let i of s) e.files[t].push(i)
        } else if (((e.json[t] = n), s.length > 0)) {
          let i = t
          ;(t.startsWith('+') || t.endsWith('+') || (i += '+'), (e.files[i] = e.files[i] || []))
          for (let t of s) e.files[i].push(t)
        }
      } else e.json[t] = i
    }
  }
}
var Client = class {
  get baseUrl() {
    return this.baseURL
  }
  set baseUrl(e) {
    this.baseURL = e
  }
  constructor(e = '/', t, s = 'en-US') {
    ;((this.cancelControllers = {}),
      (this.recordServices = {}),
      (this.enableAutoCancellation = !0),
      (this.baseURL = e),
      (this.lang = s),
      t
        ? (this.authStore = t)
        : 'undefined' != typeof window && window.Deno
          ? (this.authStore = new BaseAuthStore())
          : (this.authStore = new LocalAuthStore()),
      (this.collections = new CollectionService(this)),
      (this.files = new FileService(this)),
      (this.logs = new LogService(this)),
      (this.settings = new SettingsService(this)),
      (this.realtime = new RealtimeService(this)),
      (this.health = new HealthService(this)),
      (this.backups = new BackupService(this)),
      (this.crons = new CronService(this)))
  }
  get admins() {
    return this.collection('_superusers')
  }
  createBatch() {
    return new BatchService(this)
  }
  collection(e) {
    return (
      this.recordServices[e] || (this.recordServices[e] = new RecordService(this, e)),
      this.recordServices[e]
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
    for (let s in t) {
      let i = t[s]
      switch (typeof i) {
        case 'boolean':
        case 'number':
          i = '' + i
          break
        case 'string':
          i = "'" + i.replace(/'/g, "\\'") + "'"
          break
        default:
          i =
            null === i
              ? 'null'
              : i instanceof Date
                ? "'" + i.toISOString().replace('T', ' ') + "'"
                : "'" + JSON.stringify(i).replace(/'/g, "\\'") + "'"
      }
      e = e.replaceAll('{:' + s + '}', i)
    }
    return e
  }
  getFileUrl(e, t, s = {}) {
    return (
      console.warn('Please replace pb.getFileUrl() with pb.files.getURL()'),
      this.files.getURL(e, t, s)
    )
  }
  buildUrl(e) {
    return (console.warn('Please replace pb.buildUrl() with pb.buildURL()'), this.buildURL(e))
  }
  buildURL(e) {
    let t = this.baseURL
    return (
      'undefined' == typeof window ||
        !window.location ||
        t.startsWith('https://') ||
        t.startsWith('http://') ||
        ((t = window.location.origin?.endsWith('/')
          ? window.location.origin.substring(0, window.location.origin.length - 1)
          : window.location.origin || ''),
        this.baseURL.startsWith('/') ||
          ((t += window.location.pathname || '/'), (t += t.endsWith('/') ? '' : '/')),
        (t += this.baseURL)),
      e && ((t += t.endsWith('/') ? '' : '/'), (t += e.startsWith('/') ? e.substring(1) : e)),
      t
    )
  }
  async send(e, t) {
    t = this.initSendOptions(e, t)
    let s = this.buildURL(e)
    if (this.beforeSend) {
      const e = Object.assign({}, await this.beforeSend(s, t))
      void 0 !== e.url || void 0 !== e.options
        ? ((s = e.url || s), (t = e.options || t))
        : Object.keys(e).length &&
          ((t = e),
          console?.warn &&
            console.warn(
              'Deprecated format of beforeSend return: please use `return { url, options }`, instead of `return options`.',
            ))
    }
    if (void 0 !== t.query) {
      const e = serializeQueryParams(t.query)
      ;(e && (s += (s.includes('?') ? '&' : '?') + e), delete t.query)
    }
    'application/json' == this.getHeader(t.headers, 'Content-Type') &&
      t.body &&
      'string' != typeof t.body &&
      (t.body = JSON.stringify(t.body))
    return (t.fetch || fetch)(s, t)
      .then(async (e) => {
        let s = {}
        try {
          s = await e.json()
        } catch (e) {
          if (t.signal?.aborted || 'AbortError' == e?.name || 'Aborted' == e?.message) throw e
        }
        if ((this.afterSend && (s = await this.afterSend(e, s, t)), e.status >= 400))
          throw new ClientResponseError({
            url: e.url,
            status: e.status,
            data: s,
          })
        return s
      })
      .catch((e) => {
        throw new ClientResponseError(e)
      })
  }
  initSendOptions(e, t) {
    if (
      (((t = Object.assign({ method: 'GET' }, t)).body = (function convertToFormDataIfNeeded(e) {
        if (
          'undefined' == typeof FormData ||
          void 0 === e ||
          'object' != typeof e ||
          null === e ||
          isFormData(e) ||
          !hasFileField(e)
        )
          return e
        const t = new FormData()
        for (const s in e) {
          const i = e[s]
          if (void 0 !== i)
            if ('object' != typeof i || hasFileField({ data: i })) {
              const e = Array.isArray(i) ? i : [i]
              for (let i of e) t.append(s, i)
            } else {
              let e = {}
              ;((e[s] = i), t.append('@jsonPayload', JSON.stringify(e)))
            }
        }
        return t
      })(t.body)),
      normalizeUnknownQueryParams(t),
      (t.query = Object.assign({}, t.params, t.query)),
      void 0 === t.requestKey &&
        (!1 === t.$autoCancel || !1 === t.query.$autoCancel
          ? (t.requestKey = null)
          : (t.$cancelKey || t.query.$cancelKey) &&
            (t.requestKey = t.$cancelKey || t.query.$cancelKey)),
      delete t.$autoCancel,
      delete t.query.$autoCancel,
      delete t.$cancelKey,
      delete t.query.$cancelKey,
      null !== this.getHeader(t.headers, 'Content-Type') ||
        isFormData(t.body) ||
        (t.headers = Object.assign({}, t.headers, { 'Content-Type': 'application/json' })),
      null === this.getHeader(t.headers, 'Accept-Language') &&
        (t.headers = Object.assign({}, t.headers, { 'Accept-Language': this.lang })),
      this.authStore.token &&
        null === this.getHeader(t.headers, 'Authorization') &&
        (t.headers = Object.assign({}, t.headers, { Authorization: this.authStore.token })),
      this.enableAutoCancellation && null !== t.requestKey)
    ) {
      const s = t.requestKey || (t.method || 'GET') + e
      ;(delete t.requestKey, this.cancelRequest(s))
      const i = new AbortController()
      ;((this.cancelControllers[s] = i), (t.signal = i.signal))
    }
    return t
  }
  getHeader(e, t) {
    ;((e = e || {}), (t = t.toLowerCase()))
    for (let s in e) if (s.toLowerCase() == t) return e[s]
    return null
  }
}
//#endregion
//#region src/lib/pocketbase/client.ts
var pb = new Client('https://ia-uazapi-6d79e.shrd00.internal.goskip.dev')
pb.autoCancellation(false)
//#endregion
export {
  useComposedRefs as C,
  require_react as D,
  require_react_dom as E,
  __commonJSMin as O,
  composeRefs as S,
  useToast as T,
  createSlot$1 as _,
  Slot as a,
  createContextScope as b,
  formatPhone as c,
  cva as d,
  Presence as f,
  dispatchDiscreteCustomEvent as g,
  Primitive as h,
  buttonVariants as i,
  __toESM as k,
  X as l,
  useCallbackRef as m,
  ClientResponseError as n,
  createSlot as o,
  useLayoutEffect2 as p,
  Button as r,
  cn as s,
  pb as t,
  createLucideIcon as u,
  createSlottable as v,
  composeEventHandlers as w,
  require_jsx_runtime as x,
  createContext2 as y,
}

//# sourceMappingURL=client-CVWO68xh.js.map
