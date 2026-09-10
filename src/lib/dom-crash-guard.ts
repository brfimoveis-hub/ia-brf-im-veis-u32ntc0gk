/**
 * Crash guard global para erros de mutação DOM causados por extensões do navegador,
 * ferramentas de tradução (Google Translate) ou descompasso transiente de nós no reconciliador.
 *
 * Intercepta especificamente NotFoundError em:
 * 1. Node.prototype.removeChild: quando o filho já não pertence ao nó pai esperado
 * 2. Node.prototype.insertBefore: quando o referenceNode já não pertence ao nó pai esperado
 * 3. window.addEventListener('error'): caso um DOMException/NotFoundError escape
 *
 * NÃO mascara outros erros e NÃO altera a lógica de negócios da aplicação.
 */

declare global {
  interface Window {
    __domCrashGuardInstalled?: boolean
  }
}

function isDomNotFoundError(error: unknown): boolean {
  if (!error) return false
  const err = error as { name?: string; message?: string }
  const message = typeof err.message === 'string' ? err.message : String(err)
  const name = typeof err.name === 'string' ? err.name : ''

  const isNotFound = name === 'NotFoundError' || message.includes('NotFoundError')
  const isDomMethod =
    message.includes('insertBefore') ||
    message.includes('removeChild') ||
    message.includes('The node to be removed is not a child of this node') ||
    message.includes(
      'The node before which the new node is to be inserted is not a child of this node',
    )

  return (
    isNotFound ||
    (isDomMethod &&
      (message.includes('child of this node') || message.includes('Failed to execute')))
  )
}

export function installDomCrashGuard(): void {
  if (typeof window === 'undefined' || typeof Node === 'undefined' || !Node.prototype) {
    return
  }

  if (window.__domCrashGuardInstalled) {
    return
  }
  window.__domCrashGuardInstalled = true

  // 1) Patch Node.prototype.removeChild
  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child && child.parentNode !== this) {
      if (import.meta.env.DEV) {
        console.warn(
          '[dom-crash-guard] removeChild prevenido: child não pertence a este parentNode',
          {
            child,
            parent: this,
            actualParent: child.parentNode,
          },
        )
      }
      // Se a intenção era remover e ele já foi movido para outro lugar (ex: tradutor), remove do pai real
      if (child.parentNode) {
        try {
          return originalRemoveChild.call(child.parentNode, child) as T
        } catch {
          // Já não pode ser removido, suprime o crash
          return child
        }
      }
      return child
    }

    try {
      return originalRemoveChild.call(this, child) as T
    } catch (err) {
      if (isDomNotFoundError(err)) {
        if (import.meta.env.DEV) {
          console.warn('[dom-crash-guard] removeChild NotFoundError capturado e suprimido', err)
        }
        return child
      }
      throw err
    }
  }

  // 2) Patch Node.prototype.insertBefore
  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function <T extends Node>(
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (import.meta.env.DEV) {
        console.warn(
          '[dom-crash-guard] insertBefore redirecionado para append: referenceNode não pertence a este parentNode',
          {
            newNode,
            referenceNode,
            parent: this,
            actualParent: referenceNode.parentNode,
          },
        )
      }
      // Se o nó de referência foi reparentado (ex: tradutor), anexa no container desejado em vez de quebrar
      try {
        return originalInsertBefore.call(this, newNode, null) as T
      } catch (err) {
        if (isDomNotFoundError(err)) {
          return newNode
        }
        throw err
      }
    }

    try {
      return originalInsertBefore.call(this, newNode, referenceNode) as T
    } catch (err) {
      if (isDomNotFoundError(err)) {
        if (import.meta.env.DEV) {
          console.warn(
            '[dom-crash-guard] insertBefore NotFoundError capturado e redirecionado',
            err,
          )
        }
        try {
          return originalInsertBefore.call(this, newNode, null) as T
        } catch {
          return newNode
        }
      }
      throw err
    }
  }

  // 3) Global error listener para evitar que um NotFoundError residual de DOM dispare tela branca
  window.addEventListener(
    'error',
    (event) => {
      const error = event.error || event.message
      if (isDomNotFoundError(error)) {
        if (import.meta.env.DEV) {
          console.warn(
            '[dom-crash-guard] Window error evento suprimido para DOM NotFoundError',
            error,
          )
        }
        // Previne a propagação e parada da aplicação
        event.preventDefault()
        event.stopPropagation()
      }
    },
    true, // capture phase para interceptar antes de outros handlers
  )
}
