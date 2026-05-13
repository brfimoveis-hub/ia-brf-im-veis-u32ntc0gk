import {
  D as require_react,
  T as useToast,
  k as __toESM,
  r as Button,
  u as createLucideIcon,
  x as require_jsx_runtime,
} from './client-CVWO68xh.js'
import {
  a as DialogHeader,
  n as DialogContent,
  o as DialogTitle,
  r as DialogDescription,
  t as Dialog,
} from './dialog-D1OGDVgL.js'
import {
  A as LoaderCircle,
  C as Upload,
  j as FileText,
  s as createCustomerWithRetry,
} from './index-B-lyNKbh.js'
var FileBadge = createLucideIcon('file-badge', [
  [
    'path',
    {
      d: 'M13 22h5a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v3.3',
      key: 'cvl1xm',
    },
  ],
  [
    'path',
    {
      d: 'M14 2v5a1 1 0 0 0 1 1h5',
      key: 'wfsgrz',
    },
  ],
  [
    'path',
    {
      d: 'm7.69 16.479 1.29 4.88a.5.5 0 0 1-.698.591l-1.843-.849a1 1 0 0 0-.879.001l-1.846.85a.5.5 0 0 1-.692-.593l1.29-4.88',
      key: '1ff7gj',
    },
  ],
  [
    'circle',
    {
      cx: '6',
      cy: '14',
      r: '3',
      key: 'a1xfv6',
    },
  ],
])
//#endregion
//#region src/components/customers/CustomerImportDialog.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1)
var import_jsx_runtime = require_jsx_runtime()
function CustomerImportDialog({ open, onOpenChange, onSuccess }) {
  const [isUploading, setIsUploading] = (0, import_react.useState)(false)
  const [progress, setProgress] = (0, import_react.useState)(0)
  const fileInputRef = (0, import_react.useRef)(null)
  const { toast } = useToast()
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    setProgress(10)
    try {
      const text = await file.text()
      const isVcf = file.name.endsWith('.vcf')
      const isCsv = file.name.endsWith('.csv')
      const parsedContacts = []
      if (isCsv) {
        const lines = text.split('\n')
        if (lines.length > 0) {
          const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue
            const values = lines[i].split(',')
            const contact = {}
            headers.forEach((h, idx) => {
              if (values[idx]) contact[h] = values[idx].trim()
            })
            if (
              contact.name ||
              contact.email ||
              contact.phone ||
              contact.first_name ||
              contact.telefone
            )
              parsedContacts.push({
                name: contact.name || contact.first_name || 'Sem nome',
                email: contact.email || '',
                phone: contact.phone || contact.telefone || '',
                status: 'Base de Clientes/Novo LYD',
                source: 'Importação CSV',
              })
          }
        }
      } else if (isVcf) {
        const vcards = text.split('BEGIN:VCARD')
        for (const card of vcards) {
          if (!card.trim()) continue
          const lines = card.split('\n')
          let name = ''
          let phone = ''
          let email = ''
          for (const line of lines) {
            if (line.startsWith('FN:')) name = line.substring(3).trim()
            if (line.startsWith('TEL')) {
              const parts = line.split(':')
              if (parts.length > 1) phone = parts[1].trim()
            }
            if (line.startsWith('EMAIL')) {
              const parts = line.split(':')
              if (parts.length > 1) email = parts[1].trim()
            }
          }
          if (name || phone || email)
            parsedContacts.push({
              name: name || 'Sem nome',
              phone,
              email,
              status: 'Base de Clientes/Novo LYD',
              source: 'Importação VCF',
            })
        }
      }
      if (parsedContacts.length === 0)
        throw new Error('Nenhum contato válido encontrado no arquivo.')
      let successCount = 0
      for (let i = 0; i < parsedContacts.length; i++) {
        try {
          await createCustomerWithRetry(parsedContacts[i])
          successCount++
        } catch {}
        setProgress(10 + Math.round((successCount / parsedContacts.length) * 90))
      }
      toast({
        title: 'Importação Concluída',
        description: `${successCount} contatos importados com sucesso.`,
      })
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Erro na importação',
        description: error.message || 'Falha ao processar o arquivo.',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
      setProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
    'data-uid': 'src/components/customers/CustomerImportDialog.tsx:140:5',
    'data-prohibitions': '[editContent]',
    open,
    onOpenChange,
    children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
      'data-uid': 'src/components/customers/CustomerImportDialog.tsx:141:7',
      'data-prohibitions': '[editContent]',
      className: 'sm:max-w-md',
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, {
          'data-uid': 'src/components/customers/CustomerImportDialog.tsx:142:9',
          'data-prohibitions': '[]',
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
              'data-uid': 'src/components/customers/CustomerImportDialog.tsx:143:11',
              'data-prohibitions': '[]',
              children: 'Importar Base de Clientes',
            }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
              'data-uid': 'src/components/customers/CustomerImportDialog.tsx:144:11',
              'data-prohibitions': '[]',
              children: 'Faça upload de arquivos CSV ou VCF para adicionar leads massivamente.',
            }),
          ],
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)('div', {
          'data-uid': 'src/components/customers/CustomerImportDialog.tsx:148:9',
          'data-prohibitions': '[editContent]',
          className:
            'flex flex-col items-center justify-center py-8 gap-4 border-2 border-dashed rounded-lg border-muted-foreground/20 bg-muted/10',
          children: isUploading
            ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                'data-uid': 'src/components/customers/CustomerImportDialog.tsx:150:13',
                'data-prohibitions': '[editContent]',
                className: 'flex flex-col items-center gap-4 w-full px-8',
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
                    'data-uid': 'src/components/customers/CustomerImportDialog.tsx:151:15',
                    'data-prohibitions': '[editContent]',
                    className: 'h-8 w-8 animate-spin text-primary',
                  }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                    'data-uid': 'src/components/customers/CustomerImportDialog.tsx:152:15',
                    'data-prohibitions': '[editContent]',
                    className: 'text-sm font-medium',
                    children: ['Processando... ', progress, '%'],
                  }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)('div', {
                    'data-uid': 'src/components/customers/CustomerImportDialog.tsx:153:15',
                    'data-prohibitions': '[]',
                    className: 'w-full bg-secondary h-2 rounded-full overflow-hidden',
                    children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)('div', {
                      'data-uid': 'src/components/customers/CustomerImportDialog.tsx:154:17',
                      'data-prohibitions': '[editContent]',
                      className: 'bg-primary h-full transition-all duration-300',
                      style: { width: `${progress}%` },
                    }),
                  }),
                ],
              })
            : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, {
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                    'data-uid': 'src/components/customers/CustomerImportDialog.tsx:162:15',
                    'data-prohibitions': '[]',
                    className: 'flex gap-4 mb-2',
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                        'data-uid': 'src/components/customers/CustomerImportDialog.tsx:163:17',
                        'data-prohibitions': '[]',
                        className: 'flex flex-col items-center gap-2 text-muted-foreground',
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, {
                            'data-uid': 'src/components/customers/CustomerImportDialog.tsx:164:19',
                            'data-prohibitions': '[editContent]',
                            className: 'h-8 w-8',
                          }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)('span', {
                            'data-uid': 'src/components/customers/CustomerImportDialog.tsx:165:19',
                            'data-prohibitions': '[]',
                            className: 'text-xs font-semibold uppercase',
                            children: 'CSV',
                          }),
                        ],
                      }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                        'data-uid': 'src/components/customers/CustomerImportDialog.tsx:167:17',
                        'data-prohibitions': '[]',
                        className: 'flex flex-col items-center gap-2 text-muted-foreground',
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileBadge, {
                            'data-uid': 'src/components/customers/CustomerImportDialog.tsx:168:19',
                            'data-prohibitions': '[editContent]',
                            className: 'h-8 w-8',
                          }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)('span', {
                            'data-uid': 'src/components/customers/CustomerImportDialog.tsx:169:19',
                            'data-prohibitions': '[]',
                            className: 'text-xs font-semibold uppercase',
                            children: 'VCF / vCard',
                          }),
                        ],
                      }),
                    ],
                  }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)('input', {
                    'data-uid': 'src/components/customers/CustomerImportDialog.tsx:172:15',
                    'data-prohibitions': '[editContent]',
                    type: 'file',
                    ref: fileInputRef,
                    className: 'hidden',
                    accept: '.csv,.vcf',
                    onChange: handleFileUpload,
                  }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
                    'data-uid': 'src/components/customers/CustomerImportDialog.tsx:179:15',
                    'data-prohibitions': '[]',
                    onClick: () => fileInputRef.current?.click(),
                    className: 'gap-2',
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, {
                        'data-uid': 'src/components/customers/CustomerImportDialog.tsx:180:17',
                        'data-prohibitions': '[editContent]',
                        className: 'h-4 w-4',
                      }),
                      ' Selecionar Arquivo',
                    ],
                  }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)('p', {
                    'data-uid': 'src/components/customers/CustomerImportDialog.tsx:182:15',
                    'data-prohibitions': '[]',
                    className: 'text-xs text-muted-foreground text-center px-4 mt-2',
                    children:
                      'O arquivo deve conter colunas/campos para Nome, Email e Telefone. O status inicial será "Base de Clientes/Novo LYD".',
                  }),
                ],
              }),
        }),
      ],
    }),
  })
}
//#endregion
export { CustomerImportDialog }

//# sourceMappingURL=CustomerImportDialog-Dph8XC60.js.map
