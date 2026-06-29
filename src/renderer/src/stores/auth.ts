import { create } from 'zustand'
import type { AuthUser, Role } from '@shared/types'
import { api, getToken, setToken } from '@/lib/api'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  initialized: boolean
  init: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  can: (...roles: Role[]) => boolean
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,

  init: async () => {
    if (!getToken()) {
      set({ initialized: true })
      return
    }
    try {
      const user = await api.auth.me()
      set({ user, initialized: true })
    } catch {
      setToken(null)
      set({ user: null, initialized: true })
    }
  },

  login: async (email, password) => {
    set({ loading: true })
    try {
      const { token, user } = await api.auth.login(email, password)
      setToken(token)
      set({ user, loading: false })
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  logout: () => {
    setToken(null)
    set({ user: null })
  },

  can: (...roles) => {
    const u = get().user
    return !!u && roles.includes(u.role)
  }
}))
