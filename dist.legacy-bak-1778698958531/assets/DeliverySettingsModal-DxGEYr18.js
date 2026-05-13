import {
  C as e,
  E as t,
  O as n,
  S as r,
  b as i,
  d as a,
  i as o,
  m as s,
  o as c,
  t as l,
  w as u,
  y as d,
} from './button-BukrqzEL.js'
import { S as f, a as p, n as m, o as h, r as g, t as _ } from './dialog-CPpDeRqy.js'
import { N as v, b as y, d as b, i as x, m as S, p as C, x as w } from './index-CH3lbLrq.js'
var T = n(t(), 1),
  E = i(),
  D = `Checkbox`,
  [O, k] = d(D),
  [A, j] = O(D)
function M(e) {
  let {
      __scopeCheckbox: t,
      checked: n,
      children: r,
      defaultChecked: i,
      disabled: a,
      form: o,
      name: s,
      onCheckedChange: c,
      required: l,
      value: u = `on`,
      internal_do_not_use_render: d,
    } = e,
    [p, m] = f({ prop: n, defaultProp: i ?? !1, onChange: c, caller: D }),
    [h, g] = T.useState(null),
    [_, v] = T.useState(null),
    y = T.useRef(!1),
    b = h ? !!o || !!h.closest(`form`) : !0,
    x = {
      checked: p,
      disabled: a,
      setChecked: m,
      control: h,
      setControl: g,
      name: s,
      form: o,
      value: u,
      hasConsumerStoppedPropagationRef: y,
      required: l,
      defaultChecked: V(i) ? !1 : i,
      isFormControl: b,
      bubbleInput: _,
      setBubbleInput: v,
    }
  return (0, E.jsx)(A, { scope: t, ...x, children: B(d) ? d(x) : r })
}
var N = `CheckboxTrigger`,
  P = T.forwardRef(({ __scopeCheckbox: t, onKeyDown: n, onClick: i, ...a }, o) => {
    let {
        control: c,
        value: l,
        disabled: u,
        checked: d,
        required: f,
        setControl: p,
        setChecked: m,
        hasConsumerStoppedPropagationRef: h,
        isFormControl: g,
        bubbleInput: _,
      } = j(N, t),
      v = r(o, p),
      y = T.useRef(d)
    return (
      T.useEffect(() => {
        let e = c?.form
        if (e) {
          let t = () => m(y.current)
          return (e.addEventListener(`reset`, t), () => e.removeEventListener(`reset`, t))
        }
      }, [c, m]),
      (0, E.jsx)(s.button, {
        type: `button`,
        role: `checkbox`,
        'aria-checked': V(d) ? `mixed` : d,
        'aria-required': f,
        'data-state': H(d),
        'data-disabled': u ? `` : void 0,
        disabled: u,
        value: l,
        ...a,
        ref: v,
        onKeyDown: e(n, (e) => {
          e.key === `Enter` && e.preventDefault()
        }),
        onClick: e(i, (e) => {
          ;(m((e) => (V(e) ? !0 : !e)),
            _ && g && ((h.current = e.isPropagationStopped()), h.current || e.stopPropagation()))
        }),
      })
    )
  })
P.displayName = N
var F = T.forwardRef((e, t) => {
  let {
    __scopeCheckbox: n,
    name: r,
    checked: i,
    defaultChecked: a,
    required: o,
    disabled: s,
    value: c,
    onCheckedChange: l,
    form: u,
    ...d
  } = e
  return (0, E.jsx)(M, {
    __scopeCheckbox: n,
    checked: i,
    defaultChecked: a,
    disabled: s,
    required: o,
    onCheckedChange: l,
    name: r,
    form: u,
    value: c,
    internal_do_not_use_render: ({ isFormControl: e }) =>
      (0, E.jsxs)(E.Fragment, {
        children: [
          (0, E.jsx)(P, { ...d, ref: t, __scopeCheckbox: n }),
          e && (0, E.jsx)(z, { __scopeCheckbox: n }),
        ],
      }),
  })
})
F.displayName = D
var I = `CheckboxIndicator`,
  L = T.forwardRef((e, t) => {
    let { __scopeCheckbox: n, forceMount: r, ...i } = e,
      o = j(I, n)
    return (0, E.jsx)(a, {
      present: r || V(o.checked) || o.checked === !0,
      children: (0, E.jsx)(s.span, {
        'data-state': H(o.checked),
        'data-disabled': o.disabled ? `` : void 0,
        ...i,
        ref: t,
        style: { pointerEvents: `none`, ...e.style },
      }),
    })
  })
L.displayName = I
var R = `CheckboxBubbleInput`,
  z = T.forwardRef(({ __scopeCheckbox: e, ...t }, n) => {
    let {
        control: i,
        hasConsumerStoppedPropagationRef: a,
        checked: o,
        defaultChecked: c,
        required: l,
        disabled: u,
        name: d,
        value: f,
        form: p,
        bubbleInput: m,
        setBubbleInput: h,
      } = j(R, e),
      g = r(n, h),
      _ = C(o),
      v = w(i)
    T.useEffect(() => {
      let e = m
      if (!e) return
      let t = window.HTMLInputElement.prototype,
        n = Object.getOwnPropertyDescriptor(t, `checked`).set,
        r = !a.current
      if (_ !== o && n) {
        let t = new Event(`click`, { bubbles: r })
        ;((e.indeterminate = V(o)), n.call(e, V(o) ? !1 : o), e.dispatchEvent(t))
      }
    }, [m, _, o, a])
    let y = T.useRef(V(o) ? !1 : o)
    return (0, E.jsx)(s.input, {
      type: `checkbox`,
      'aria-hidden': !0,
      defaultChecked: c ?? y.current,
      required: l,
      disabled: u,
      name: d,
      value: f,
      form: p,
      ...t,
      tabIndex: -1,
      ref: g,
      style: {
        ...t.style,
        ...v,
        position: `absolute`,
        pointerEvents: `none`,
        opacity: 0,
        margin: 0,
        transform: `translateX(-100%)`,
      },
    })
  })
z.displayName = R
function B(e) {
  return typeof e == `function`
}
function V(e) {
  return e === `indeterminate`
}
function H(e) {
  return V(e) ? `indeterminate` : e ? `checked` : `unchecked`
}
var U = T.forwardRef(({ className: e, ...t }, n) =>
  (0, E.jsx)(F, {
    ref: n,
    className: c(
      `peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground`,
      e,
    ),
    ...t,
    children: (0, E.jsx)(L, {
      className: c(`flex items-center justify-center text-current`),
      children: (0, E.jsx)(v, { className: `h-4 w-4` }),
    }),
  }),
)
U.displayName = F.displayName
var W = [
  { id: `monday`, label: `Segunda-feira` },
  { id: `tuesday`, label: `Terça-feira` },
  { id: `wednesday`, label: `Quarta-feira` },
  { id: `thursday`, label: `Quinta-feira` },
  { id: `friday`, label: `Sexta-feira` },
  { id: `saturday`, label: `Sábado` },
  { id: `sunday`, label: `Domingo` },
]
function G({ open: e, onOpenChange: t }) {
  let { user: n } = y(),
    { toast: r } = u(),
    [i, a] = (0, T.useState)(!0),
    [s, c] = (0, T.useState)(`08:00`),
    [d, f] = (0, T.useState)(`18:00`),
    [v, C] = (0, T.useState)(5),
    [w, D] = (0, T.useState)([`monday`, `tuesday`, `wednesday`, `thursday`, `friday`]),
    [O, k] = (0, T.useState)(!1)
  ;(0, T.useEffect)(() => {
    n &&
      e &&
      (a(n.delivery_enabled ?? !0),
      c(n.delivery_start_time || `08:00`),
      f(n.delivery_end_time || `18:00`),
      C(n.delivery_interval ?? 5),
      D(n.delivery_days || [`monday`, `tuesday`, `wednesday`, `thursday`, `friday`]))
  }, [n, e])
  let A = async () => {
      if (s >= d) {
        r({
          title: `Horário inválido`,
          description: `O horário de início deve ser anterior ao de término.`,
          variant: `destructive`,
        })
        return
      }
      if (n) {
        k(!0)
        try {
          ;(await o
            .collection(`users`)
            .update(n.id, {
              delivery_enabled: i,
              delivery_start_time: s,
              delivery_end_time: d,
              delivery_interval: v,
              delivery_days: w,
            }),
            r({ title: `Configurações salvas com sucesso` }),
            t(!1))
        } catch (e) {
          r({ title: `Erro ao salvar`, description: e.message, variant: `destructive` })
        } finally {
          k(!1)
        }
      }
    },
    j = (e) => {
      D((t) => (t.includes(e) ? t.filter((t) => t !== e) : [...t, e]))
    }
  return (0, E.jsx)(_, {
    open: e,
    onOpenChange: t,
    children: (0, E.jsxs)(m, {
      className: `max-w-md`,
      children: [
        (0, E.jsxs)(p, {
          children: [
            (0, E.jsx)(h, { children: `Configurações de Envio` }),
            (0, E.jsx)(g, {
              children: `Controle os horários e o intervalo das mensagens automáticas para manter um fluxo natural.`,
            }),
          ],
        }),
        (0, E.jsxs)(`div`, {
          className: `space-y-6 py-4`,
          children: [
            (0, E.jsxs)(`div`, {
              className: `flex items-center justify-between`,
              children: [
                (0, E.jsxs)(`div`, {
                  className: `space-y-0.5`,
                  children: [
                    (0, E.jsx)(b, { children: `Envio Automático Ativo` }),
                    (0, E.jsx)(`div`, {
                      className: `text-sm text-muted-foreground`,
                      children: `Permitir envios da IA globalmente.`,
                    }),
                  ],
                }),
                (0, E.jsx)(x, { checked: i, onCheckedChange: a }),
              ],
            }),
            (0, E.jsxs)(`div`, {
              className: `grid grid-cols-2 gap-4`,
              children: [
                (0, E.jsxs)(`div`, {
                  className: `space-y-2`,
                  children: [
                    (0, E.jsx)(b, { children: `Horário de Início` }),
                    (0, E.jsx)(S, { type: `time`, value: s, onChange: (e) => c(e.target.value) }),
                  ],
                }),
                (0, E.jsxs)(`div`, {
                  className: `space-y-2`,
                  children: [
                    (0, E.jsx)(b, { children: `Horário de Término` }),
                    (0, E.jsx)(S, { type: `time`, value: d, onChange: (e) => f(e.target.value) }),
                  ],
                }),
              ],
            }),
            (0, E.jsxs)(`div`, {
              className: `space-y-2`,
              children: [
                (0, E.jsx)(b, { children: `Intervalo Mínimo (minutos)` }),
                (0, E.jsx)(S, {
                  type: `number`,
                  min: 0,
                  value: v,
                  onChange: (e) => C(parseInt(e.target.value)),
                }),
                (0, E.jsx)(`div`, {
                  className: `text-xs text-muted-foreground`,
                  children: `Tempo de espera entre envios sucessivos.`,
                }),
              ],
            }),
            (0, E.jsxs)(`div`, {
              className: `space-y-3`,
              children: [
                (0, E.jsx)(b, { children: `Dias de Envio` }),
                (0, E.jsx)(`div`, {
                  className: `grid grid-cols-2 gap-3`,
                  children: W.map((e) =>
                    (0, E.jsxs)(
                      `div`,
                      {
                        className: `flex items-center space-x-2`,
                        children: [
                          (0, E.jsx)(U, {
                            id: `day-${e.id}`,
                            checked: w.includes(e.id),
                            onCheckedChange: () => j(e.id),
                          }),
                          (0, E.jsx)(`label`, {
                            htmlFor: `day-${e.id}`,
                            className: `text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer`,
                            children: e.label,
                          }),
                        ],
                      },
                      e.id,
                    ),
                  ),
                }),
              ],
            }),
          ],
        }),
        (0, E.jsxs)(`div`, {
          className: `flex justify-end gap-2`,
          children: [
            (0, E.jsx)(l, { variant: `outline`, onClick: () => t(!1), children: `Cancelar` }),
            (0, E.jsx)(l, { onClick: A, disabled: O, children: `Salvar` }),
          ],
        }),
      ],
    }),
  })
}
export { G as DeliverySettingsModal }
