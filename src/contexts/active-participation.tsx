'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'

interface UserParticipation {
  participation_id: string
  generation_name: string
  role: string
  status: string
  participation_number: number
  created_at: string
  is_active: boolean
}

interface ActiveParticipationContextType {
  activeParticipation: UserParticipation | null
  allParticipations: UserParticipation[]
  isLoading: boolean
  error: string | null
  changeActiveParticipation: (participationId: string) => Promise<boolean>
  createNewParticipation: (generationId: string, role: string) => Promise<boolean>
  refreshParticipations: () => Promise<void>
  isAdmin: boolean
}

const ActiveParticipationContext = createContext<ActiveParticipationContextType | undefined>(undefined)

export function useActiveParticipation() {
  const context = useContext(ActiveParticipationContext)
  if (context === undefined) {
    throw new Error('useActiveParticipation must be used within an ActiveParticipationProvider')
  }
  return context
}

interface ActiveParticipationProviderProps {
  children: ReactNode
  selectedUserId?: string // Para cuando un admin está viendo datos de otro usuario
}

export function ActiveParticipationProvider({ children, selectedUserId }: ActiveParticipationProviderProps) {
  const { user } = useUser()
  const [activeParticipation, setActiveParticipation] = useState<UserParticipation | null>(null)
  const [allParticipations, setAllParticipations] = useState<UserParticipation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Determinar el ID del usuario a consultar
  const targetUserId = selectedUserId || user?.id

  // Verificar si el usuario actual es admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) return

      try {
        // Usar la función RPC para obtener el rol actual desde participaciones
        const { data: currentRole } = await supabase
          .rpc('get_user_current_role', { p_user_id: user.id })

        setIsAdmin(currentRole === 'admin')
      } catch (error) {
        console.error('Error checking admin status:', error)
        // Fallback: verificar en profiles si la función RPC falla
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          setIsAdmin(profile?.role === 'admin')
        } catch (fallbackError) {
          console.error('Error in fallback admin check:', fallbackError)
          setIsAdmin(false)
        }
      }
    }

    checkAdminStatus()
  }, [user?.id])

  // Cargar participaciones del usuario
  const loadParticipations = async () => {
    if (!targetUserId) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: participationsError } = await supabase
        .rpc('get_user_participations', { p_user_id: targetUserId })

      if (participationsError) {
        throw participationsError
      }

      const participations = data || []
      setAllParticipations(participations)

      // Encontrar la participación activa
      const active = participations.find((p: UserParticipation) => p.is_active)
      setActiveParticipation(active || null)

    } catch (error) {
      console.error('Error loading participations:', error)
      setError('Error al cargar las participaciones')
    } finally {
      setIsLoading(false)
    }
  }

  // Cargar participación activa específica
  const loadActiveParticipation = async () => {
    if (!targetUserId) return

    try {
      const { data, error: activeError } = await supabase
        .rpc('get_user_active_participation', { p_user_id: targetUserId })

      if (activeError) {
        throw activeError
      }

      const active = data?.[0] || null
      setActiveParticipation(active)

    } catch (error) {
      console.error('Error loading active participation:', error)
    }
  }

  // Cambiar participación activa (solo admins)
  const changeActiveParticipation = async (participationId: string): Promise<boolean> => {
    if (!targetUserId || !isAdmin) {
      setError('Solo los administradores pueden cambiar participaciones activas')
      return false
    }

    try {
      const { error: changeError } = await supabase
        .rpc('change_user_active_participation', {
          p_user_id: targetUserId,
          p_participation_id: participationId
        })

      if (changeError) {
        throw changeError
      }

      // Sincronizar el rol en profiles con la nueva participación activa
      const { error: syncError } = await supabase
        .rpc('sync_user_role_from_participation', {
          p_user_id: targetUserId
        })

      if (syncError) {
        console.warn('Error syncing role:', syncError)
        // No fallar la operación por esto, solo logear
      }

      // Recargar participaciones para actualizar el estado
      await loadParticipations()
      return true

    } catch (error) {
      console.error('Error changing active participation:', error)
      setError('Error al cambiar la participación activa')
      return false
    }
  }

  // Crear nueva participación (solo admins)
  const createNewParticipation = async (generationId: string, role: string): Promise<boolean> => {
    if (!targetUserId || !isAdmin) {
      setError('Solo los administradores pueden crear participaciones')
      return false
    }

    try {
      const { error: createError } = await supabase
        .rpc('create_and_activate_participation', {
          p_user_id: targetUserId,
          p_generation_id: generationId,
          p_role: role
        })

      if (createError) {
        throw createError
      }

      // Recargar participaciones para actualizar el estado
      await loadParticipations()
      return true

    } catch (error) {
      console.error('Error creating new participation:', error)
      setError('Error al crear la nueva participación')
      return false
    }
  }

  // Refrescar participaciones
  const refreshParticipations = async () => {
    await loadParticipations()
  }

  // Cargar participaciones cuando cambia el usuario objetivo
  useEffect(() => {
    if (targetUserId) {
      loadParticipations()
    }
  }, [targetUserId])

  // Cargar participación activa cuando cambia
  useEffect(() => {
    if (targetUserId && !isLoading) {
      loadActiveParticipation()
    }
  }, [targetUserId, isLoading])

  const value: ActiveParticipationContextType = {
    activeParticipation,
    allParticipations,
    isLoading,
    error,
    changeActiveParticipation,
    createNewParticipation,
    refreshParticipations,
    isAdmin
  }

  return (
    <ActiveParticipationContext.Provider value={value}>
      {children}
    </ActiveParticipationContext.Provider>
  )
}
