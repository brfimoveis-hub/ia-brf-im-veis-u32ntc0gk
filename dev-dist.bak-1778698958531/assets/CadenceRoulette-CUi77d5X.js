import {
  D as require_react,
  T as useToast,
  k as __toESM,
  l as X,
  r as Button,
  s as cn,
  u as createLucideIcon,
  x as require_jsx_runtime,
} from './client-CVWO68xh.js'
import { t as ScrollArea, u as useBlocker } from './scroll-area-qQDYGHrB.js'
import {
  A as LoaderCircle,
  D as Phone,
  E as Play,
  M as ChevronRight,
  O as Pen,
  S as User,
  T as RefreshCw,
  c as getPaginatedCustomers,
  d as CardContent,
  f as CardDescription,
  g as Badge,
  k as MessageSquare,
  l as updateCustomer,
  m as CardTitle,
  n as updateCadence,
  p as CardHeader,
  r as Textarea,
  t as getActiveCadences,
  u as Card,
  w as Save,
} from './index-B-lyNKbh.js'
var ChevronLeft = createLucideIcon('chevron-left', [
  [
    'path',
    {
      d: 'm15 18-6-6 6-6',
      key: '1wnfg3',
    },
  ],
])
var Layers = createLucideIcon('layers', [
  [
    'path',
    {
      d: 'M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z',
      key: 'zw3jo',
    },
  ],
  [
    'path',
    {
      d: 'M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12',
      key: '1wduqc',
    },
  ],
  [
    'path',
    {
      d: 'M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17',
      key: 'kqbvx6',
    },
  ],
])
var Pause = createLucideIcon('pause', [
  [
    'rect',
    {
      x: '14',
      y: '3',
      width: '5',
      height: '18',
      rx: '1',
      key: 'kaeet6',
    },
  ],
  [
    'rect',
    {
      x: '5',
      y: '3',
      width: '5',
      height: '18',
      rx: '1',
      key: '1wsw3u',
    },
  ],
])
var StickyNote = createLucideIcon('sticky-note', [
  [
    'path',
    {
      d: 'M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z',
      key: '1dfntj',
    },
  ],
  [
    'path',
    {
      d: 'M15 3v5a1 1 0 0 0 1 1h5',
      key: '6s6qgf',
    },
  ],
])
//#endregion
//#region src/components/CadenceRoulette.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1)
var import_jsx_runtime = require_jsx_runtime()
function CadenceRoulette({
  search = '',
  phaseFilter = 'all',
  sourceFilter = '',
  onCustomerUpdated,
} = {}) {
  const [cadences, setCadences] = (0, import_react.useState)([])
  const perPage = 100
  const [leads, setLeads] = (0, import_react.useState)([])
  const [totalItems, setTotalItems] = (0, import_react.useState)(0)
  const [page, setPage] = (0, import_react.useState)(1)
  const [hasMore, setHasMore] = (0, import_react.useState)(true)
  const [globalIndex, setGlobalIndex] = (0, import_react.useState)(0)
  const [cadenceIndex, setCadenceIndex] = (0, import_react.useState)(0)
  const [rotationKey, setRotationKey] = (0, import_react.useState)(0)
  const [isEditingCadence, setIsEditingCadence] = (0, import_react.useState)(false)
  const [isEditingNotes, setIsEditingNotes] = (0, import_react.useState)(false)
  const [isPaused, setIsPaused] = (0, import_react.useState)(false)
  const [isInitialized, setIsInitialized] = (0, import_react.useState)(false)
  const [isLoading, setIsLoading] = (0, import_react.useState)(true)
  const [isFetchingMore, setIsFetchingMore] = (0, import_react.useState)(false)
  const [isSaving, setIsSaving] = (0, import_react.useState)(false)
  const [editCadenceContent, setEditCadenceContent] = (0, import_react.useState)('')
  const [editNotesContent, setEditNotesContent] = (0, import_react.useState)('')
  const itemRefs = (0, import_react.useRef)([])
  const observer = (0, import_react.useRef)(null)
  const { toast } = useToast()
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (isEditingCadence || isEditingNotes) && currentLocation.pathname !== nextLocation.pathname,
  )
  ;(0, import_react.useEffect)(() => {
    if (blocker.state === 'blocked')
      toast({
        title: 'Edição em andamento',
        description: 'Salve ou cancele as alterações antes de sair da página.',
        variant: 'destructive',
      })
  }, [blocker.state, toast])
  ;(0, import_react.useEffect)(() => {
    const handleBeforeUnload = (e) => {
      if (isEditingCadence || isEditingNotes) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isEditingCadence, isEditingNotes])
  ;(0, import_react.useEffect)(() => {
    getActiveCadences()
      .then((data) => {
        setCadences(data)
        setCadenceIndex((prev) => (prev >= data.length ? 0 : prev))
      })
      .catch(() =>
        toast({
          title: 'Erro',
          description: 'Falha ao carregar cadências.',
          variant: 'destructive',
        }),
      )
  }, [toast])
  const loadLeads = (0, import_react.useCallback)(
    async (p, overwrite = false) => {
      try {
        if (overwrite) setIsLoading(true)
        else setIsFetchingMore(true)
        const data = await getPaginatedCustomers(p, perPage, search, phaseFilter, sourceFilter)
        setLeads((prev) => {
          if (overwrite) return data.items
          const newItems = data.items.filter((item) => !prev.some((p) => p.id === item.id))
          return [...prev, ...newItems]
        })
        setTotalItems(data.totalItems)
        setHasMore(p < data.totalPages)
        if (overwrite) setGlobalIndex(0)
      } catch (err) {
        if (!overwrite)
          toast({
            title: 'Erro',
            description: 'Falha ao carregar mais clientes.',
            variant: 'destructive',
          })
      } finally {
        setIsLoading(false)
        setIsFetchingMore(false)
        setIsInitialized(true)
      }
    },
    [search, phaseFilter, sourceFilter, perPage, toast],
  )
  ;(0, import_react.useEffect)(() => {
    setPage(1)
    loadLeads(1, true)
  }, [search, phaseFilter, sourceFilter, loadLeads])
  const loadMore = (0, import_react.useCallback)(() => {
    if (!isFetchingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      loadLeads(nextPage, false)
    }
  }, [isFetchingMore, hasMore, page, loadLeads])
  const lastElementRef = (0, import_react.useCallback)(
    (node) => {
      if (isLoading) return
      if (observer.current) observer.current.disconnect()
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) loadMore()
        },
        { rootMargin: '100px' },
      )
      if (node) observer.current.observe(node)
    },
    [isLoading, loadMore],
  )
  ;(0, import_react.useEffect)(() => {
    if (leads.length > 0 && globalIndex >= leads.length - 5 && hasMore && !isFetchingMore)
      loadMore()
  }, [globalIndex, leads.length, hasMore, isFetchingMore, loadMore])
  ;(0, import_react.useEffect)(() => {
    const timeoutId = setTimeout(() => {
      if (itemRefs.current[globalIndex] && !isPaused && !isEditingCadence && !isEditingNotes)
        itemRefs.current[globalIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
    }, 150)
    return () => clearTimeout(timeoutId)
  }, [globalIndex, isPaused, isEditingCadence, isEditingNotes])
  const nextCustomer = (0, import_react.useCallback)(() => {
    if (totalItems === 0) return
    const event = new CustomEvent('roulette-next', { cancelable: true })
    window.dispatchEvent(event)
    if (event.defaultPrevented) return
    setGlobalIndex((prev) => {
      if (prev >= totalItems - 1) return 0
      return prev + 1
    })
    setRotationKey((k) => k + 1)
  }, [totalItems])
  const nextCustomerRef = (0, import_react.useRef)(nextCustomer)
  ;(0, import_react.useEffect)(() => {
    nextCustomerRef.current = nextCustomer
  }, [nextCustomer])
  ;(0, import_react.useEffect)(() => {
    if (
      !isInitialized ||
      isLoading ||
      isPaused ||
      isEditingCadence ||
      isEditingNotes ||
      totalItems === 0
    )
      return
    const timer = setInterval(() => nextCustomerRef.current(), 15e3)
    return () => clearInterval(timer)
  }, [
    isInitialized,
    isLoading,
    isPaused,
    isEditingCadence,
    isEditingNotes,
    totalItems,
    rotationKey,
  ])
  const currentCadence = cadences[cadenceIndex]
  const currentCustomer = leads[globalIndex]
  const handleEditCadence = () => {
    if (!currentCadence) return
    setEditCadenceContent(currentCadence.content)
    setIsEditingCadence(true)
  }
  const handleEditNotes = (customer, index) => {
    setGlobalIndex(index)
    setRotationKey((k) => k + 1)
    setEditNotesContent(customer.notes || '')
    setIsEditingNotes(true)
  }
  const handleSaveCadence = async () => {
    if (!currentCadence) return
    if (!editCadenceContent.trim()) {
      toast({
        title: 'Aviso',
        description: 'O conteúdo da mensagem é obrigatório.',
        variant: 'destructive',
      })
      return
    }
    setIsSaving(true)
    try {
      const updated = await updateCadence(currentCadence.id, { content: editCadenceContent })
      setCadences((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      setIsEditingCadence(false)
      toast({
        title: 'Sucesso',
        description: 'Mensagem sugerida atualizada com sucesso.',
      })
      if (blocker.state === 'blocked' && !isEditingNotes) blocker.proceed?.()
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar cadência.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }
  const handleSaveNotes = async () => {
    if (!currentCustomer) return
    setIsSaving(true)
    try {
      const updated = await updateCustomer(currentCustomer.id, { notes: editNotesContent })
      setLeads((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      if (onCustomerUpdated) onCustomerUpdated(updated)
      setIsEditingNotes(false)
      toast({
        title: 'Sucesso',
        description: 'Anotações do cliente atualizadas.',
      })
      if (blocker.state === 'blocked' && !isEditingCadence) blocker.proceed?.()
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar cliente.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }
  const handleCancelCadence = () => {
    setIsEditingCadence(false)
    if (blocker.state === 'blocked' && !isEditingNotes) blocker.proceed?.()
  }
  const handleCancelNotes = () => {
    setIsEditingNotes(false)
    if (blocker.state === 'blocked' && !isEditingCadence) blocker.proceed?.()
  }
  const nextCadence = () => setCadenceIndex((p) => (p + 1) % cadences.length)
  const prevCadence = () => setCadenceIndex((p) => (p - 1 + cadences.length) % cadences.length)
  if (!isInitialized || (isLoading && leads.length === 0))
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
      'data-uid': 'src/components/CadenceRoulette.tsx:302:7',
      'data-prohibitions': '[]',
      className:
        'h-[400px] flex flex-col items-center justify-center text-muted-foreground border-dashed',
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
          'data-uid': 'src/components/CadenceRoulette.tsx:303:9',
          'data-prohibitions': '[editContent]',
          className: 'h-8 w-8 animate-spin mb-4 text-primary/50',
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)('p', {
          'data-uid': 'src/components/CadenceRoulette.tsx:304:9',
          'data-prohibitions': '[]',
          children: 'Iniciando Roleta Inteligente com carregamento contínuo...',
        }),
      ],
    })
  if (!isLoading && leads.length === 0)
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
      'data-uid': 'src/components/CadenceRoulette.tsx:311:7',
      'data-prohibitions': '[]',
      className:
        'h-[400px] flex flex-col items-center justify-center text-muted-foreground border-dashed',
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, {
          'data-uid': 'src/components/CadenceRoulette.tsx:312:9',
          'data-prohibitions': '[editContent]',
          className: 'h-8 w-8 mb-4 text-primary/50',
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)('p', {
          'data-uid': 'src/components/CadenceRoulette.tsx:313:9',
          'data-prohibitions': '[]',
          children: 'Nenhum cliente encontrado para a roleta com os filtros atuais.',
        }),
      ],
    })
  const parts = currentCadence?.title.split('|').map((s) => s.trim()) || []
  const step = parts[0] || currentCadence?.title || 'Sem cadência'
  const trigger = parts[1] || ''
  const channel = parts[2] || ''
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
    'data-uid': 'src/components/CadenceRoulette.tsx:324:5',
    'data-prohibitions': '[editContent]',
    className: cn(
      'shadow-subtle border-primary/10 bg-gradient-to-br from-background to-primary/5 overflow-hidden relative transition-opacity duration-200 flex flex-col h-[700px]',
      isLoading && 'pointer-events-none',
    ),
    children: [
      isLoading &&
        leads.length > 0 &&
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
          'data-uid': 'src/components/CadenceRoulette.tsx:331:9',
          'data-prohibitions': '[]',
          className:
            'absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[1px]',
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
              'data-uid': 'src/components/CadenceRoulette.tsx:332:11',
              'data-prohibitions': '[editContent]',
              className: 'h-8 w-8 animate-spin text-primary mb-2',
            }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)('p', {
              'data-uid': 'src/components/CadenceRoulette.tsx:333:11',
              'data-prohibitions': '[]',
              className: 'text-sm font-medium text-primary',
              children: 'Carregando dados...',
            }),
          ],
        }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)('div', {
        'data-uid': 'src/components/CadenceRoulette.tsx:337:7',
        'data-prohibitions': '[editContent]',
        className: 'absolute top-0 left-0 w-full h-1 bg-muted z-10',
        children:
          !isLoading &&
          !isPaused &&
          !isEditingCadence &&
          !isEditingNotes &&
          totalItems > 1 &&
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            'div',
            {
              'data-uid': 'src/components/CadenceRoulette.tsx:339:11',
              'data-prohibitions': '[editContent]',
              className: 'h-full bg-primary animate-[progress_15s_linear]',
              style: {
                width: '100%',
                animationFillMode: 'forwards',
              },
            },
            rotationKey,
          ),
      }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
        'data-uid': 'src/components/CadenceRoulette.tsx:347:7',
        'data-prohibitions': '[editContent]',
        className:
          'flex flex-row items-center justify-between pb-4 shrink-0 border-b border-border/40 bg-background/50 backdrop-blur-sm z-10',
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
            'data-uid': 'src/components/CadenceRoulette.tsx:348:9',
            'data-prohibitions': '[]',
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
                'data-uid': 'src/components/CadenceRoulette.tsx:349:11',
                'data-prohibitions': '[]',
                className: 'text-secondary flex items-center gap-2 text-xl',
                children: 'Roleta Inteligente: Villa dos Açores',
              }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, {
                'data-uid': 'src/components/CadenceRoulette.tsx:352:11',
                'data-prohibitions': '[]',
                children: 'Pipeline da Bia - Ciclo de Cadência',
              }),
            ],
          }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)('div', {
            'data-uid': 'src/components/CadenceRoulette.tsx:355:9',
            'data-prohibitions': '[editContent]',
            className: 'flex items-center gap-2 z-10',
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
              'data-uid': 'src/components/CadenceRoulette.tsx:356:11',
              'data-prohibitions': '[editContent]',
              variant: isPaused ? 'secondary' : 'ghost',
              size: 'sm',
              className: 'gap-2 shadow-sm border border-border/50',
              onClick: () => setIsPaused(!isPaused),
              disabled: isEditingCadence || isEditingNotes || totalItems <= 1,
              title: isPaused ? 'Retomar Rotação' : 'Pausar Rotação',
              children: [
                isPaused
                  ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, {
                      'data-uid': 'src/components/CadenceRoulette.tsx:364:25',
                      'data-prohibitions': '[editContent]',
                      className: 'h-4 w-4',
                    })
                  : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, {
                      'data-uid': 'src/components/CadenceRoulette.tsx:364:56',
                      'data-prohibitions': '[editContent]',
                      className: 'h-4 w-4',
                    }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)('span', {
                  'data-uid': 'src/components/CadenceRoulette.tsx:365:13',
                  'data-prohibitions': '[editContent]',
                  className: 'hidden sm:inline-block',
                  children: isPaused ? 'Retomar' : 'Pausar',
                }),
              ],
            }),
          }),
        ],
      }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
        'data-uid': 'src/components/CadenceRoulette.tsx:370:7',
        'data-prohibitions': '[editContent]',
        className: 'p-0 flex flex-col flex-1 overflow-hidden',
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
            'data-uid': 'src/components/CadenceRoulette.tsx:372:9',
            'data-prohibitions': '[editContent]',
            className: 'p-4 bg-muted/10 border-b border-border/40 shrink-0',
            children: [
              cadences.length > 0 &&
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                  'data-uid': 'src/components/CadenceRoulette.tsx:374:13',
                  'data-prohibitions': '[editContent]',
                  className: 'flex flex-wrap items-center gap-2 mb-3',
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                      'data-uid': 'src/components/CadenceRoulette.tsx:375:15',
                      'data-prohibitions': '[editContent]',
                      className: 'flex items-center mr-2',
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)('span', {
                          'data-uid': 'src/components/CadenceRoulette.tsx:376:17',
                          'data-prohibitions': '[]',
                          className: 'text-xs font-semibold text-muted-foreground mr-2',
                          children: 'Cadência:',
                        }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
                          'data-uid': 'src/components/CadenceRoulette.tsx:377:17',
                          'data-prohibitions': '[]',
                          variant: 'outline',
                          size: 'icon',
                          className: 'h-6 w-6 rounded-r-none border-r-0',
                          onClick: prevCadence,
                          disabled: isEditingCadence || isEditingNotes,
                          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, {
                            'data-uid': 'src/components/CadenceRoulette.tsx:384:19',
                            'data-prohibitions': '[editContent]',
                            className: 'h-3 w-3',
                          }),
                        }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                          'data-uid': 'src/components/CadenceRoulette.tsx:386:17',
                          'data-prohibitions': '[editContent]',
                          className:
                            'h-6 px-2 flex items-center border-y border-input bg-background text-xs font-medium',
                          children: [cadenceIndex + 1, '/', cadences.length],
                        }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
                          'data-uid': 'src/components/CadenceRoulette.tsx:389:17',
                          'data-prohibitions': '[]',
                          variant: 'outline',
                          size: 'icon',
                          className: 'h-6 w-6 rounded-l-none border-l-0',
                          onClick: nextCadence,
                          disabled: isEditingCadence || isEditingNotes,
                          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {
                            'data-uid': 'src/components/CadenceRoulette.tsx:396:19',
                            'data-prohibitions': '[editContent]',
                            className: 'h-3 w-3',
                          }),
                        }),
                      ],
                    }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
                      'data-uid': 'src/components/CadenceRoulette.tsx:400:15',
                      'data-prohibitions': '[editContent]',
                      variant: 'outline',
                      className:
                        'bg-primary/5 text-primary border-primary/20 shadow-sm text-[10px] py-0',
                      children: step,
                    }),
                    trigger &&
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
                        'data-uid': 'src/components/CadenceRoulette.tsx:407:17',
                        'data-prohibitions': '[editContent]',
                        variant: 'outline',
                        className:
                          'bg-primary/5 text-primary border-primary/20 shadow-sm text-[10px] py-0',
                        children: ['Gatilho: ', trigger],
                      }),
                    channel &&
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
                        'data-uid': 'src/components/CadenceRoulette.tsx:415:17',
                        'data-prohibitions': '[editContent]',
                        variant: 'outline',
                        className:
                          'bg-primary/5 text-primary border-primary/20 shadow-sm text-[10px] py-0',
                        children: ['Canal: ', channel],
                      }),
                  ],
                }),
              isEditingCadence
                ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                    'data-uid': 'src/components/CadenceRoulette.tsx:426:13',
                    'data-prohibitions': '[editContent]',
                    className: 'space-y-3 animate-in fade-in zoom-in-95 duration-200',
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)('div', {
                        'data-uid': 'src/components/CadenceRoulette.tsx:427:15',
                        'data-prohibitions': '[]',
                        className: 'flex items-center justify-between',
                        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('span', {
                          'data-uid': 'src/components/CadenceRoulette.tsx:428:17',
                          'data-prohibitions': '[]',
                          className:
                            'text-sm font-semibold text-secondary flex items-center gap-1.5',
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSquare, {
                              'data-uid': 'src/components/CadenceRoulette.tsx:429:19',
                              'data-prohibitions': '[editContent]',
                              className: 'w-4 h-4',
                            }),
                            ' ÁREA EDITÁVEL - Mensagem Sugerida',
                          ],
                        }),
                      }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
                        'data-uid': 'src/components/CadenceRoulette.tsx:432:15',
                        'data-prohibitions': '[editContent]',
                        className:
                          'min-h-[100px] resize-none bg-background/80 shadow-inner border-primary/30 focus-visible:ring-primary/50 text-sm',
                        value: editCadenceContent,
                        onChange: (e) => setEditCadenceContent(e.target.value),
                        placeholder: 'Conteúdo da mensagem sugerida...',
                        disabled: isSaving,
                      }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                        'data-uid': 'src/components/CadenceRoulette.tsx:439:15',
                        'data-prohibitions': '[editContent]',
                        className: 'flex justify-end gap-2',
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
                            'data-uid': 'src/components/CadenceRoulette.tsx:440:17',
                            'data-prohibitions': '[]',
                            variant: 'ghost',
                            size: 'sm',
                            onClick: handleCancelCadence,
                            disabled: isSaving,
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
                                'data-uid': 'src/components/CadenceRoulette.tsx:441:19',
                                'data-prohibitions': '[editContent]',
                                className: 'w-4 h-4 mr-2',
                              }),
                              ' Cancelar',
                            ],
                          }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
                            'data-uid': 'src/components/CadenceRoulette.tsx:443:17',
                            'data-prohibitions': '[editContent]',
                            size: 'sm',
                            onClick: handleSaveCadence,
                            disabled: isSaving,
                            children: [
                              isSaving
                                ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
                                    'data-uid': 'src/components/CadenceRoulette.tsx:445:21',
                                    'data-prohibitions': '[editContent]',
                                    className: 'w-4 h-4 mr-2 animate-spin',
                                  })
                                : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, {
                                    'data-uid': 'src/components/CadenceRoulette.tsx:447:21',
                                    'data-prohibitions': '[editContent]',
                                    className: 'w-4 h-4 mr-2',
                                  }),
                              'Salvar Alterações',
                            ],
                          }),
                        ],
                      }),
                    ],
                  })
                : currentCadence
                  ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                      'data-uid': 'src/components/CadenceRoulette.tsx:454:13',
                      'data-prohibitions': '[editContent]',
                      className: 'group relative animate-in fade-in duration-300',
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)('div', {
                          'data-uid': 'src/components/CadenceRoulette.tsx:455:15',
                          'data-prohibitions': '[]',
                          className:
                            'absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10',
                          children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
                            'data-uid': 'src/components/CadenceRoulette.tsx:456:17',
                            'data-prohibitions': '[]',
                            variant: 'secondary',
                            size: 'sm',
                            onClick: handleEditCadence,
                            className: 'shadow-sm border border-border/50 h-7 text-xs',
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, {
                                'data-uid': 'src/components/CadenceRoulette.tsx:462:19',
                                'data-prohibitions': '[editContent]',
                                className: 'w-3 h-3 mr-1.5',
                              }),
                              ' Editar Mensagem',
                            ],
                          }),
                        }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                          'data-uid': 'src/components/CadenceRoulette.tsx:466:15',
                          'data-prohibitions': '[editContent]',
                          className:
                            'bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg p-3 cursor-text hover:border-primary/40 transition-colors shadow-sm group-hover:shadow relative',
                          onClick: handleEditCadence,
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)('div', {
                              'data-uid': 'src/components/CadenceRoulette.tsx:470:17',
                              'data-prohibitions': '[editContent]',
                              className:
                                'absolute top-0 left-0 w-1 h-full bg-primary/20 rounded-l-lg',
                            }),
                            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('h4', {
                              'data-uid': 'src/components/CadenceRoulette.tsx:471:17',
                              'data-prohibitions': '[]',
                              className:
                                'text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5',
                              children: [
                                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSquare, {
                                  'data-uid': 'src/components/CadenceRoulette.tsx:472:19',
                                  'data-prohibitions': '[editContent]',
                                  className: 'w-3.5 h-3.5',
                                }),
                                ' Mensagem Sugerida',
                              ],
                            }),
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollArea, {
                              'data-uid': 'src/components/CadenceRoulette.tsx:474:17',
                              'data-prohibitions': '[editContent]',
                              className: 'h-[60px] w-full pr-4',
                              children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)('div', {
                                'data-uid': 'src/components/CadenceRoulette.tsx:475:19',
                                'data-prohibitions': '[editContent]',
                                className:
                                  'text-sm text-secondary/90 font-medium whitespace-pre-wrap leading-relaxed',
                                children: currentCadence.content,
                              }),
                            }),
                          ],
                        }),
                      ],
                    })
                  : /* @__PURE__ */ (0, import_jsx_runtime.jsx)('div', {
                      'data-uid': 'src/components/CadenceRoulette.tsx:482:13',
                      'data-prohibitions': '[]',
                      className:
                        'p-3 text-center text-sm text-muted-foreground border rounded-lg bg-muted/20',
                      children: 'Nenhuma mensagem de cadência configurada.',
                    }),
            ],
          }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
            'data-uid': 'src/components/CadenceRoulette.tsx:489:9',
            'data-prohibitions': '[editContent]',
            className:
              'flex-1 overflow-y-auto p-4 space-y-3 relative scroll-smooth bg-background/30',
            children: [
              leads.map((customer, index) => {
                const isActive = index === globalIndex
                const isEditingThisNotes = isEditingNotes && isActive
                return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  'div',
                  {
                    'data-uid': 'src/components/CadenceRoulette.tsx:495:15',
                    'data-prohibitions': '[editContent]',
                    ref: (node) => {
                      itemRefs.current[index] = node
                      if (index === leads.length - 1) lastElementRef(node)
                    },
                    className: cn(
                      'bg-background/90 backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 cursor-pointer',
                      isActive
                        ? 'border-primary shadow-md ring-1 ring-primary/20 relative'
                        : 'border-border/60 shadow-sm hover:border-primary/40 opacity-70 hover:opacity-100',
                    ),
                    onClick: () => {
                      if (!isEditingNotes && !isEditingCadence) {
                        setGlobalIndex(index)
                        setRotationKey((k) => k + 1)
                      }
                    },
                    children: [
                      isActive &&
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)('div', {
                          'data-uid': 'src/components/CadenceRoulette.tsx:517:19',
                          'data-prohibitions': '[editContent]',
                          className:
                            'absolute -left-[1px] top-1/2 -translate-y-1/2 w-1 h-12 bg-primary rounded-r-md',
                        }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                        'data-uid': 'src/components/CadenceRoulette.tsx:520:17',
                        'data-prohibitions': '[editContent]',
                        className:
                          'flex flex-col sm:flex-row gap-4 items-start justify-between pl-2',
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                            'data-uid': 'src/components/CadenceRoulette.tsx:521:19',
                            'data-prohibitions': '[editContent]',
                            className: 'space-y-1',
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                                'data-uid': 'src/components/CadenceRoulette.tsx:522:21',
                                'data-prohibitions': '[editContent]',
                                className: 'flex items-center gap-2',
                                children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, {
                                    'data-uid': 'src/components/CadenceRoulette.tsx:523:23',
                                    'data-prohibitions': '[editContent]',
                                    className: cn(
                                      'h-4 w-4',
                                      isActive ? 'text-primary' : 'text-muted-foreground',
                                    ),
                                  }),
                                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)('h3', {
                                    'data-uid': 'src/components/CadenceRoulette.tsx:529:23',
                                    'data-prohibitions': '[editContent]',
                                    className: cn(
                                      'font-semibold',
                                      isActive ? 'text-primary' : 'text-secondary',
                                    ),
                                    children: customer.name || 'Cliente Sem Nome',
                                  }),
                                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
                                    'data-uid': 'src/components/CadenceRoulette.tsx:537:23',
                                    'data-prohibitions': '[editContent]',
                                    variant: 'secondary',
                                    className: 'text-[10px]',
                                    children: customer.status,
                                  }),
                                ],
                              }),
                              (customer.phone || customer.phone_1_value) &&
                                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                                  'data-uid': 'src/components/CadenceRoulette.tsx:542:23',
                                  'data-prohibitions': '[editContent]',
                                  className:
                                    'flex items-center gap-2 text-sm text-muted-foreground pl-6',
                                  children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, {
                                      'data-uid': 'src/components/CadenceRoulette.tsx:543:25',
                                      'data-prohibitions': '[editContent]',
                                      className: 'h-3.5 w-3.5',
                                    }),
                                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)('span', {
                                      'data-uid': 'src/components/CadenceRoulette.tsx:544:25',
                                      'data-prohibitions': '[editContent]',
                                      children: customer.phone || customer.phone_1_value,
                                    }),
                                  ],
                                }),
                            ],
                          }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)('div', {
                            'data-uid': 'src/components/CadenceRoulette.tsx:549:19',
                            'data-prohibitions': '[editContent]',
                            className: 'w-full sm:w-[55%]',
                            onClick: (e) => isEditingThisNotes && e.stopPropagation(),
                            children: isEditingThisNotes
                              ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                                  'data-uid': 'src/components/CadenceRoulette.tsx:554:23',
                                  'data-prohibitions': '[editContent]',
                                  className: 'space-y-2 animate-in fade-in',
                                  children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)('div', {
                                      'data-uid': 'src/components/CadenceRoulette.tsx:555:25',
                                      'data-prohibitions': '[]',
                                      className: 'flex items-center justify-between',
                                      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                                        'span',
                                        {
                                          'data-uid': 'src/components/CadenceRoulette.tsx:556:27',
                                          'data-prohibitions': '[]',
                                          className:
                                            'text-xs font-semibold text-secondary flex items-center gap-1.5',
                                          children: [
                                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                                              StickyNote,
                                              {
                                                'data-uid':
                                                  'src/components/CadenceRoulette.tsx:557:29',
                                                'data-prohibitions': '[editContent]',
                                                className: 'w-3.5 h-3.5',
                                              },
                                            ),
                                            ' Anotações',
                                          ],
                                        },
                                      ),
                                    }),
                                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
                                      'data-uid': 'src/components/CadenceRoulette.tsx:560:25',
                                      'data-prohibitions': '[editContent]',
                                      className:
                                        'min-h-[80px] text-sm resize-none bg-background focus-visible:ring-primary/50',
                                      value: editNotesContent,
                                      onChange: (e) => setEditNotesContent(e.target.value),
                                      placeholder: 'Anotações do cliente...',
                                      disabled: isSaving,
                                    }),
                                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                                      'data-uid': 'src/components/CadenceRoulette.tsx:567:25',
                                      'data-prohibitions': '[editContent]',
                                      className: 'flex justify-end gap-2',
                                      children: [
                                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
                                          'data-uid': 'src/components/CadenceRoulette.tsx:568:27',
                                          'data-prohibitions': '[]',
                                          variant: 'ghost',
                                          size: 'sm',
                                          onClick: handleCancelNotes,
                                          disabled: isSaving,
                                          className: 'h-7 text-xs',
                                          children: 'Cancelar',
                                        }),
                                        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
                                          'data-uid': 'src/components/CadenceRoulette.tsx:577:27',
                                          'data-prohibitions': '[editContent]',
                                          size: 'sm',
                                          onClick: handleSaveNotes,
                                          disabled: isSaving,
                                          className: 'h-7 text-xs',
                                          children: [
                                            isSaving &&
                                              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                                                LoaderCircle,
                                                {
                                                  'data-uid':
                                                    'src/components/CadenceRoulette.tsx:583:42',
                                                  'data-prohibitions': '[editContent]',
                                                  className: 'w-3 h-3 mr-1.5 animate-spin',
                                                },
                                              ),
                                            'Salvar',
                                          ],
                                        }),
                                      ],
                                    }),
                                  ],
                                })
                              : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                                  'data-uid': 'src/components/CadenceRoulette.tsx:589:23',
                                  'data-prohibitions': '[editContent]',
                                  className: 'relative cursor-text group/notes',
                                  onClick: (e) => {
                                    e.stopPropagation()
                                    handleEditNotes(customer, index)
                                  },
                                  children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)('div', {
                                      'data-uid': 'src/components/CadenceRoulette.tsx:596:25',
                                      'data-prohibitions': '[]',
                                      className:
                                        'absolute right-1 top-1 opacity-0 group-hover/notes:opacity-100 transition-opacity',
                                      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                                        Button,
                                        {
                                          'data-uid': 'src/components/CadenceRoulette.tsx:597:27',
                                          'data-prohibitions': '[]',
                                          variant: 'ghost',
                                          size: 'icon',
                                          className: 'h-6 w-6',
                                          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                                            Pen,
                                            {
                                              'data-uid':
                                                'src/components/CadenceRoulette.tsx:598:29',
                                              'data-prohibitions': '[editContent]',
                                              className: 'w-3 h-3',
                                            },
                                          ),
                                        },
                                      ),
                                    }),
                                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('span', {
                                      'data-uid': 'src/components/CadenceRoulette.tsx:601:25',
                                      'data-prohibitions': '[]',
                                      className:
                                        'text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1',
                                      children: [
                                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StickyNote, {
                                          'data-uid': 'src/components/CadenceRoulette.tsx:602:27',
                                          'data-prohibitions': '[editContent]',
                                          className: 'w-3.5 h-3.5',
                                        }),
                                        ' Anotações',
                                      ],
                                    }),
                                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)('div', {
                                      'data-uid': 'src/components/CadenceRoulette.tsx:604:25',
                                      'data-prohibitions': '[editContent]',
                                      className: cn(
                                        'text-sm p-2 rounded border transition-colors',
                                        isActive
                                          ? 'bg-primary/5 border-primary/20 text-secondary'
                                          : 'bg-muted/30 border-transparent group-hover/notes:border-border/50 text-secondary/80',
                                      ),
                                      children: customer.notes
                                        ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)('span', {
                                            'data-uid': 'src/components/CadenceRoulette.tsx:613:29',
                                            'data-prohibitions': '[editContent]',
                                            className: 'line-clamp-2',
                                            children: customer.notes,
                                          })
                                        : /* @__PURE__ */ (0, import_jsx_runtime.jsx)('span', {
                                            'data-uid': 'src/components/CadenceRoulette.tsx:615:29',
                                            'data-prohibitions': '[]',
                                            className: 'italic opacity-50',
                                            children: 'Sem anotações. Clique para adicionar.',
                                          }),
                                    }),
                                  ],
                                }),
                          }),
                        ],
                      }),
                    ],
                  },
                  customer.id,
                )
              }),
              isFetchingMore &&
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)('div', {
                  'data-uid': 'src/components/CadenceRoulette.tsx:629:13',
                  'data-prohibitions': '[]',
                  className: 'py-4 flex justify-center items-center',
                  children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
                    'data-uid': 'src/components/CadenceRoulette.tsx:630:15',
                    'data-prohibitions': '[editContent]',
                    className: 'h-6 w-6 animate-spin text-primary/60',
                  }),
                }),
              !hasMore &&
                leads.length > 0 &&
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)('div', {
                  'data-uid': 'src/components/CadenceRoulette.tsx:634:13',
                  'data-prohibitions': '[editContent]',
                  className:
                    'py-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2',
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)('div', {
                      'data-uid': 'src/components/CadenceRoulette.tsx:635:15',
                      'data-prohibitions': '[]',
                      className: 'w-12 h-1 bg-border rounded-full opacity-50 mb-2',
                    }),
                    'Todos os ',
                    totalItems,
                    ' clientes foram carregados.',
                  ],
                }),
            ],
          }),
        ],
      }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)('style', {
        'data-uid': 'src/components/CadenceRoulette.tsx:642:7',
        'data-prohibitions': '[editContent]',
        children: `
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `,
      }),
    ],
  })
}
//#endregion
export { CadenceRoulette }

//# sourceMappingURL=CadenceRoulette-CUi77d5X.js.map
