"use client"

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  name: string
  email: string
  generation: string
  role: string
}

interface SelectedUserContextValue {
  authUserId: string
  authUserRole: 'lider' | 'senior' | 'master_senior' | 'admin'
  selectedUserId: string
  setSelectedUserId: (id: string) => void
  assignedUsers: User[]
  isSenior: boolean
  isAdmin: boolean
  availableGenerations: string[]
  selectedGeneration: string
  setSelectedGeneration: (generation: string) => void
}

const SelectedUserContext = createContext<SelectedUserContextValue | null>(null)

interface ProviderProps {
  children: React.ReactNode
  authUserId: string
  authUserRole: 'lider' | 'senior' | 'master_senior' | 'admin'
}

export function SelectedUserProvider({ children, authUserId, authUserRole }: ProviderProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(authUserId)
  const [assignedUsers, setAssignedUsers] = useState<User[]>([])
  const [availableGenerations, setAvailableGenerations] = useState<string[]>([])
  const [selectedGeneration, setSelectedGeneration] = useState<string>('all')

  const isSenior = authUserRole === 'senior'
  const isAdmin = authUserRole === 'admin'

  useEffect(() => {
    setSelectedUserId(authUserId)
  }, [authUserId])

  // Load assigned users based on role
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (isSenior) {
        console.log('[SelectedUserProvider] Loading leaders for senior:', authUserId)
        const { data, error } = await supabase.rpc('get_leaders_for_supervisor', { p_supervisor_id: authUserId })
        if (error) console.error('[SelectedUserProvider] RPC get_leaders_for_supervisor error:', error)
        if (cancelled) return
        if (error) {
          setAssignedUsers([])
          return
        }
        console.log('[SelectedUserProvider] Leaders loaded:', data)
        setAssignedUsers((data || []).map((row: { id: string; name: string; email: string; generation: string }) => ({ 
          id: row.id, 
          name: row.name, 
          email: row.email, 
          generation: row.generation,
          role: 'lider'
        })))
      } else if (isAdmin) {
        console.log('[SelectedUserProvider] Loading users for admin:', authUserId)
        const { data, error } = await supabase.rpc('get_users_for_supervisor', { p_supervisor_id: authUserId })
        if (error) console.error('[SelectedUserProvider] RPC get_users_for_supervisor error:', error)
        if (cancelled) return
        if (error) {
          setAssignedUsers([])
          return
        }
        console.log('[SelectedUserProvider] Users loaded:', data)
        setAssignedUsers((data || []).map((row: { id: string; name: string; email: string; generation: string; role: string }) => ({ 
          id: row.id, 
          name: row.name, 
          email: row.email, 
          generation: row.generation,
          role: row.role
        })))
      }
    })()
    return () => { cancelled = true }
  }, [authUserId, isSenior, isAdmin])

  // Load available generations for admin
  useEffect(() => {
    if (!isAdmin) return
    
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('generation')
        .in('role', ['lider', 'senior'])
        .order('generation')
      
      if (error) console.error('[SelectedUserProvider] Error loading generations:', error)
      if (cancelled) return
      
      if (data) {
        const generations = [...new Set(data.map(row => row.generation))].sort()
        setAvailableGenerations(generations)
      }
    })()
    return () => { cancelled = true }
  }, [isAdmin])

  const value = useMemo<SelectedUserContextValue>(() => ({
    authUserId,
    authUserRole,
    selectedUserId,
    setSelectedUserId,
    assignedUsers,
    isSenior,
    isAdmin,
    availableGenerations,
    selectedGeneration,
    setSelectedGeneration
  }), [authUserId, authUserRole, selectedUserId, assignedUsers, isSenior, isAdmin, availableGenerations, selectedGeneration])

  return (
    <SelectedUserContext.Provider value={value}>{children}</SelectedUserContext.Provider>
  )
}

export function useSelectedUser() {
  const ctx = useContext(SelectedUserContext)
  if (!ctx) throw new Error('useSelectedUser must be used within SelectedUserProvider')
  return ctx
}


