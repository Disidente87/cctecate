"use client"

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Leader {
  id: string
  name: string
  email: string
  generation: string
}

interface SelectedUserContextValue {
  authUserId: string
  authUserRole: 'lider' | 'senior' | 'admin'
  selectedUserId: string
  setSelectedUserId: (id: string) => void
  leaders: Leader[]
  isSenior: boolean
}

const SelectedUserContext = createContext<SelectedUserContextValue | null>(null)

interface ProviderProps {
  children: React.ReactNode
  authUserId: string
  authUserRole: 'lider' | 'senior' | 'admin'
}

export function SelectedUserProvider({ children, authUserId, authUserRole }: ProviderProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(authUserId)
  const [leaders, setLeaders] = useState<Leader[]>([])

  const isSenior = authUserRole === 'senior'

  useEffect(() => {
    setSelectedUserId(authUserId)
  }, [authUserId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      console.log('[SelectedUserProvider] Loading leaders for senior:', authUserId)
      const { data, error } = await supabase.rpc('get_leaders_for_senior', { p_senior_id: authUserId })
      if (error) console.error('[SelectedUserProvider] RPC get_leaders_for_senior error:', error)
      if (cancelled) return
      if (error) {
        setLeaders([])
        return
      }
      console.log('[SelectedUserProvider] Leaders loaded:', data)
      setLeaders((data || []).map((row: { id: string; name: string; email: string; generation: string }) => ({ id: row.id, name: row.name, email: row.email, generation: row.generation })))
    })()
    return () => { cancelled = true }
  }, [authUserId])

  const value = useMemo<SelectedUserContextValue>(() => ({
    authUserId,
    authUserRole,
    selectedUserId,
    setSelectedUserId,
    leaders,
    isSenior
  }), [authUserId, authUserRole, selectedUserId, leaders, isSenior])

  return (
    <SelectedUserContext.Provider value={value}>{children}</SelectedUserContext.Provider>
  )
}

export function useSelectedUser() {
  const ctx = useContext(SelectedUserContext)
  if (!ctx) throw new Error('useSelectedUser must be used within SelectedUserProvider')
  return ctx
}


