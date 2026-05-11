import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import type { AuthModel } from 'pocketbase'

interface AuthContextType {
  user: AuthModel | null
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthModel | null>(
    pb.authStore.isValid ? pb.authStore.record : null,
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      if (!pb.authStore.isValid) {
        setUser(null)
      } else {
        setUser(record)
      }
    })

    const initAuth = async () => {
      if (pb.authStore.isValid) {
        try {
          await pb.collection('users').authRefresh()
        } catch (error: any) {
          if (error.status === 401 || error.status === 403 || error.status === 404) {
            pb.authStore.clear()
            setUser(null)
          }
        }
      }
      setLoading(false)
    }

    initAuth()

    return () => {
      unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password)
      setUser(authData.record)
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
