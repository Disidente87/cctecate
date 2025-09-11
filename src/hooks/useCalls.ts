'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Call, 
  CallSchedule, 
  CallStatistics, 
  NextCall, 
  PendingCall
} from '@/types'

export const useCalls = (userId: string) => {
  const [calls, setCalls] = useState<Call[]>([])
  const [callSchedule, setCallSchedule] = useState<CallSchedule | null>(null)
  const [statistics, setStatistics] = useState<CallStatistics | null>(null)
  const [nextCall, setNextCall] = useState<NextCall | null>(null)
  const [pendingCalls, setPendingCalls] = useState<PendingCall[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Cargar estadísticas de llamadas
  const loadStatistics = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_call_statistics', {
        p_leader_id: userId
      })

      if (error) {
        console.error('Error loading call statistics:', error)
        return
      }

      if (data?.[0]) {
        setStatistics(data[0])
      }
    } catch (error) {
      console.error('Error loading call statistics:', error)
    }
  }, [userId])

  // Cargar próxima llamada
  const loadNextCall = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_next_call', {
        p_leader_id: userId
      })

      if (error) {
        console.error('Error loading next call:', error)
        return
      }

      if (data?.[0]) {
        setNextCall(data[0])
      } else {
        setNextCall(null)
      }
    } catch (error) {
      console.error('Error loading next call:', error)
    }
  }, [userId])

  // Cargar llamadas pendientes
  const loadPendingCalls = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_pending_calls', {
        p_leader_id: userId
      })

      if (error) {
        console.error('Error loading pending calls:', error)
        return
      }

      setPendingCalls(data || [])
    } catch (error) {
      console.error('Error loading pending calls:', error)
    }
  }, [userId])

  // Cargar programación de llamadas
  const loadCallSchedule = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('call_schedules')
        .select('*')
        .eq('leader_id', userId)
        .eq('is_active', true)
        .maybeSingle() // Cambiar de .single() a .maybeSingle()

      if (error) {
        console.error('Error loading call schedule:', error)
        return
      }

      setCallSchedule(data)
    } catch (error) {
      console.error('Error loading call schedule:', error)
    }
  }, [userId])

  // Cargar todas las llamadas
  const loadCalls = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('leader_id', userId)
        .order('scheduled_date', { ascending: true })

      if (error) {
        console.error('Error loading calls:', error)
        return
      }

      setCalls(data || [])
    } catch (error) {
      console.error('Error loading calls:', error)
    }
  }, [userId])

  // Crear programación de llamadas
  const createCallSchedule = useCallback(async (
    seniorId: string,
    mondayTime?: string,
    wednesdayTime?: string,
    fridayTime?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('create_call_schedule', {
        p_leader_id: userId,
        p_senior_id: seniorId,
        p_monday_time: mondayTime,
        p_wednesday_time: wednesdayTime,
        p_friday_time: fridayTime
      })

      if (error) {
        console.error('Error creating call schedule:', error)
        throw error
      }

      // Recargar datos
      await Promise.all([
        loadCallSchedule(),
        loadCalls(),
        loadStatistics(),
        loadNextCall(),
        loadPendingCalls()
      ])

      return data
    } catch (error) {
      console.error('Error creating call schedule:', error)
      throw error
    }
  }, [userId, loadCallSchedule, loadCalls, loadStatistics, loadNextCall, loadPendingCalls])

  // Evaluar llamada
  const evaluateCall = useCallback(async (
    callId: string,
    evaluationStatus: 'on_time' | 'late' | 'rescheduled' | 'not_done',
    score?: number,
    notes?: string
  ) => {
    try {
      const { error } = await supabase.rpc('evaluate_call', {
        p_call_id: callId,
        p_evaluation_status: evaluationStatus,
        p_score: score,
        p_notes: notes
      })

      if (error) {
        console.error('Error evaluating call:', error)
        throw error
      }

      // Recargar datos
      await Promise.all([
        loadCalls(),
        loadStatistics(),
        loadNextCall(),
        loadPendingCalls()
      ])
    } catch (error) {
      console.error('Error evaluating call:', error)
      throw error
    }
  }, [loadCalls, loadStatistics, loadNextCall, loadPendingCalls])

  // Cargar vista del calendario de llamadas
  const loadCallCalendar = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      const { data, error } = await supabase.rpc('get_calls_calendar_view', {
        p_leader_id: userId,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0]
      })

      if (error) {
        console.error('Error loading call calendar:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error loading call calendar:', error)
      return []
    }
  }, [userId])

  // Función temporal para obtener seniors (sin usar políticas RLS problemáticas)
  const getSeniors = useCallback(async () => {
    try {
      // Usar RPC function en lugar de consulta directa para evitar problemas de RLS
      const { data, error } = await supabase.rpc('get_senior_profiles')
      
      if (error) {
        console.error('Error loading seniors:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Error loading seniors:', error)
      return []
    }
  }, [])

  // Cargar todos los datos iniciales
  const loadAllData = useCallback(async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadCallSchedule(),
        loadCalls(),
        loadStatistics(),
        loadNextCall(),
        loadPendingCalls()
      ])
    } catch (error) {
      console.error('Error loading call data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [loadCallSchedule, loadCalls, loadStatistics, loadNextCall, loadPendingCalls])

  // Efectos
  useEffect(() => {
    if (userId) {
      loadAllData()
    }
  }, [userId, loadAllData])

  return {
    calls,
    callSchedule,
    statistics,
    nextCall,
    pendingCalls,
    isLoading,
    createCallSchedule,
    evaluateCall,
    loadCallCalendar,
    getSeniors,
    refreshData: loadAllData
  }
}
