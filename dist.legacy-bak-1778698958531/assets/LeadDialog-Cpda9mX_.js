import { E as e, O as t, b as n, t as r, w as i } from './button-BukrqzEL.js'
import { a, i as o, n as s, o as c, r as l, t as u } from './dialog-CPpDeRqy.js'
import { A as d, d as f, m as p, o as m, s as h, u as g } from './index-CH3lbLrq.js'
var _ = t(e(), 1),
  v = n()
function y({ open: e, onOpenChange: t, defaultValues: n }) {
  let [y, b] = (0, _.useState)({
      name: ``,
      first_name: ``,
      last_name: ``,
      phone: ``,
      email: ``,
      status: `1`,
    }),
    [x, S] = (0, _.useState)({}),
    [C, w] = (0, _.useState)(!1),
    { toast: T } = i()
  ;(0, _.useEffect)(() => {
    e &&
      (S({}),
      b(
        n
          ? {
              name: n.name || ``,
              first_name: n.first_name || ``,
              last_name: n.last_name || ``,
              phone: n.phone || ``,
              email: n.email || ``,
              status: n.status || `1`,
            }
          : { name: ``, first_name: ``, last_name: ``, phone: ``, email: ``, status: `1` },
      ))
  }, [n, e])
  let E = (e) => {
      b((t) => {
        let n = [t.first_name, t.last_name].filter(Boolean).join(` `).trim(),
          r = [e, t.last_name].filter(Boolean).join(` `).trim(),
          i = !t.name || t.name === n || t.name.toLowerCase() === `sem nome`
        return { ...t, first_name: e, name: i ? r : t.name }
      })
    },
    D = (e) => {
      b((t) => {
        let n = [t.first_name, t.last_name].filter(Boolean).join(` `).trim(),
          r = [t.first_name, e].filter(Boolean).join(` `).trim(),
          i = !t.name || t.name === n || t.name.toLowerCase() === `sem nome`
        return { ...t, last_name: e, name: i ? r : t.name }
      })
    }
  return (0, v.jsx)(u, {
    open: e,
    onOpenChange: t,
    children: (0, v.jsxs)(s, {
      className: `sm:max-w-[425px]`,
      children: [
        (0, v.jsxs)(a, {
          children: [
            (0, v.jsx)(c, { children: n ? `Editar Lead` : `Adicionar Lead` }),
            (0, v.jsx)(l, {
              children: n
                ? `Atualize as informações do cliente.`
                : `Preencha as informações do novo cliente.`,
            }),
          ],
        }),
        (0, v.jsxs)(`form`, {
          onSubmit: async (e) => {
            ;(e.preventDefault(), w(!0), S({}))
            try {
              let e = { ...y, name: y.name.trim() }
              if (!e.name) {
                let t = [e.first_name, e.last_name].filter(Boolean).join(` `).trim()
                t
                  ? (e.name = t)
                  : e.email
                    ? (e.name = e.email)
                    : e.phone
                      ? (e.name = e.phone)
                      : (e.name = `Sem nome`)
              }
              ;(n?.id
                ? (await g(n.id, e), T({ title: `Lead atualizado com sucesso!` }))
                : (await h({ ...e, tags: [`Manual`] }),
                  T({ title: `Lead adicionado com sucesso!` })),
                t(!1))
            } catch (e) {
              let t = m(e)
              ;(S(t),
                Object.keys(t).length === 0 &&
                  T({ title: `Erro ao salvar`, variant: `destructive` }))
            } finally {
              w(!1)
            }
          },
          className: `space-y-4 py-4`,
          children: [
            (0, v.jsxs)(`div`, {
              className: `grid grid-cols-2 gap-4`,
              children: [
                (0, v.jsxs)(`div`, {
                  className: `space-y-2`,
                  children: [
                    (0, v.jsx)(f, { htmlFor: `first_name`, children: `Nome (Primeiro)` }),
                    (0, v.jsx)(p, {
                      id: `first_name`,
                      value: y.first_name,
                      onChange: (e) => E(e.target.value),
                      placeholder: `Ex: João`,
                    }),
                  ],
                }),
                (0, v.jsxs)(`div`, {
                  className: `space-y-2`,
                  children: [
                    (0, v.jsx)(f, { htmlFor: `last_name`, children: `Sobrenome` }),
                    (0, v.jsx)(p, {
                      id: `last_name`,
                      value: y.last_name,
                      onChange: (e) => D(e.target.value),
                      placeholder: `Ex: da Silva`,
                    }),
                  ],
                }),
              ],
            }),
            (0, v.jsxs)(`div`, {
              className: `space-y-2`,
              children: [
                (0, v.jsx)(f, { htmlFor: `name`, children: `Nome Completo (Exibição) *` }),
                (0, v.jsx)(p, {
                  id: `name`,
                  required: !0,
                  value: y.name,
                  onChange: (e) => b({ ...y, name: e.target.value }),
                  placeholder: `Ex: João da Silva`,
                  className: x.name ? `border-red-500` : ``,
                }),
                x.name && (0, v.jsx)(`p`, { className: `text-sm text-red-500`, children: x.name }),
              ],
            }),
            (0, v.jsxs)(`div`, {
              className: `space-y-2`,
              children: [
                (0, v.jsx)(f, { htmlFor: `phone`, children: `Telefone` }),
                (0, v.jsx)(p, {
                  id: `phone`,
                  value: y.phone,
                  onChange: (e) => b({ ...y, phone: e.target.value }),
                  placeholder: `Ex: +55 11 99999-9999`,
                  className: x.phone ? `border-red-500` : ``,
                }),
                x.phone &&
                  (0, v.jsx)(`p`, { className: `text-sm text-red-500`, children: x.phone }),
              ],
            }),
            (0, v.jsxs)(`div`, {
              className: `space-y-2`,
              children: [
                (0, v.jsx)(f, { htmlFor: `email`, children: `Email` }),
                (0, v.jsx)(p, {
                  id: `email`,
                  type: `email`,
                  value: y.email,
                  onChange: (e) => b({ ...y, email: e.target.value }),
                  placeholder: `Ex: joao@email.com`,
                  className: x.email ? `border-red-500` : ``,
                }),
                x.email &&
                  (0, v.jsx)(`p`, { className: `text-sm text-red-500`, children: x.email }),
              ],
            }),
            (0, v.jsxs)(o, {
              className: `pt-4`,
              children: [
                (0, v.jsx)(r, {
                  type: `button`,
                  variant: `outline`,
                  onClick: () => t(!1),
                  children: `Cancelar`,
                }),
                (0, v.jsxs)(r, {
                  type: `submit`,
                  disabled: C,
                  children: [
                    C && (0, v.jsx)(d, { className: `mr-2 h-4 w-4 animate-spin` }),
                    `Salvar`,
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  })
}
export { y as LeadDialog }
