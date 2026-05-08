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
        } catch (error) {
          pb.authStore.clear()
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

      // Log successful login
      try {
        await pb.collection('system_logs').create({
          type: 'auth_success',
          message: `Login bem-sucedido para ${email}`,
          details: { email },
          payload: {},
          user_id: authData.record.id,
        })
      } catch (e) {
        console.error('Failed to log auth success', e)
      }

      return { error: null }
    } catch (error: any) {
      // Log failed login
      try {
        await pb.collection('system_logs').create({
          type: 'auth_error',
          message: `Falha de login para ${email}`,
          details: { email, error: error.message },
          payload: error.response || {},
        })
      } catch (e) {
        console.error('Failed to log auth error', e)
      }

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
