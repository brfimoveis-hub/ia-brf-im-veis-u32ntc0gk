import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'

// Module-level in-flight guard: if several AuthProvider instances mount at the
// same time (React StrictMode double-invokes effects in dev, and React Router
// can render <AuthProvider> while a previous mount is still settling), they
// each call authRefresh() — producing the duplicate POST
// /api/collections/users/auth-refresh seen in the logs at the same millisecond.
// Deduplicate by sharing a single in-flight promise across all callers.
let authRefreshInFlight: Promise<void> | null = null

const AUTH_REFRESH_TIMEOUT_MS = 10_000

const refreshAuthOnce = (): Promise<void> => {
  if (authRefreshInFlight) return authRefreshInFlight

  // Guard against authRefresh() hanging (the 67s login seen in the logs
  // suggests the backend can stall). If it does not resolve within 10s,
  // we treat it as a failure: clear the auth store so the app falls back
  // to the login screen instead of staying on the loading spinner forever.
  const refreshPromise = pb
    .collection('users')
    .authRefresh()
    .then(() => {
      authRefreshInFlight = null
    })
    .catch((err) => {
      authRefreshInFlight = null
      throw err
    })

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('authRefresh timeout'))
    }, AUTH_REFRESH_TIMEOUT_MS)
  })

  authRefreshInFlight = Promise.race([refreshPromise, timeoutPromise])
    .then(() => {
      authRefreshInFlight = null
    })
    .catch((err) => {
      // On timeout (or underlying failure) clear the stale token so the user
      // is sent to login instead of being stuck on the loading screen.
      pb.authStore.clear()
      authRefreshInFlight = null
      throw err
    })

  return authRefreshInFlight
}

interface AuthContextType {
  user: any
  isAuthenticated: boolean
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => void
  loading: boolean
  sessionExpired: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(pb.authStore.isValid ? pb.authStore.record : null)
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      const isValid = pb.authStore.isValid
      setUser(isValid ? record : null)
      setIsAuthenticated(isValid)
      if (!isValid && pb.authStore.record) {
        setSessionExpired(true)
      }
    })

    if (pb.authStore.isValid) {
      refreshAuthOnce()
        .then(() => {
          setSessionExpired(false)
        })
        .catch(() => {
          pb.authStore.clear()
          setSessionExpired(true)
        })
        .finally(() => setLoading(false))
    } else {
      if (pb.authStore.record) {
        pb.authStore.clear()
      }
      setLoading(false)
    }

    return () => {
      unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string) => {
    try {
      await pb.collection('users').create({ email, password, passwordConfirm: password })
      await pb.collection('users').authWithPassword(email, password)
      setSessionExpired(false)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      await pb.collection('users').authWithPassword(email, password)
      setSessionExpired(false)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOut = useCallback(() => {
    pb.authStore.clear()
    setSessionExpired(false)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        signUp,
        signIn,
        signOut,
        loading,
        sessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
