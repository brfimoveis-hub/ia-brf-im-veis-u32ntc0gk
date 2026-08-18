import pb from '@/lib/pocketbase/client'

export interface ErrorReport {
  type: string
  message: string
  details?: Record<string, unknown>
}

const errorListeners = new Set<(report: ErrorReport) => void>()

// Cooldown to prevent burst writes to `system_logs`. Multiple errors arriving
// in quick succession (e.g. cascading fetch failures) used to fire several
// POSTs in the same millisecond — each taking ~11s — which worsened the very
// congestion that caused the errors. Only the first error in a 2s window is
// persisted; subsequent ones within the window are dropped.
let lastReportAt = 0
const REPORT_COOLDOWN_MS = 2000

export function reportError(report: ErrorReport): void {
  errorListeners.forEach((listener) => {
    try {
      listener(report)
    } catch {
      // never let listener errors propagate
    }
  })

  try {
    if (pb.authStore.isValid) {
      const now = Date.now()
      if (now - lastReportAt < REPORT_COOLDOWN_MS) return
      lastReportAt = now

      const userId = pb.authStore.record?.id || 'unknown'
      pb.collection('system_logs')
        .create({
          type: report.type,
          message: report.message,
          details: {
            ...report.details,
            user_id: userId,
            timestamp: new Date().toISOString(),
            url: window.location.href,
          },
        })
        .catch(() => {})
    }
  } catch {
    // Silently ignore — never let error logging cause cascading failures
  }
}

export function subscribeToErrors(listener: (report: ErrorReport) => void): () => void {
  errorListeners.add(listener)
  return () => {
    errorListeners.delete(listener)
  }
}

let globalHandlersSetup = false

export function setupGlobalErrorHandlers(): void {
  if (globalHandlersSetup) return
  globalHandlersSetup = true

  window.addEventListener('error', (event) => {
    reportError({
      type: 'frontend_error',
      message: event.message || 'Uncaught error',
      details: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      },
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    reportError({
      type: 'frontend_error',
      message: reason instanceof Error ? reason.message : 'Unhandled promise rejection',
      details: {
        stack: reason instanceof Error ? reason.stack : String(reason),
      },
    })
  })
}
