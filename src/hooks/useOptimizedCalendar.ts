'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'

interface CalendarActivity {
  id: string
  mechanismId: string
  mechanismDescription: string
  goalId: string
  goalDescription: string
  date: Date
  originalDate: Date
  isScheduled: boolean
  isException: boolean
  isCompleted: boolean
}

interface MechanismProgress {
  mechanismId: string
  totalExpected: number
  totalCompleted: number
  progressPercentage: number
  lastCompletionDate: Date | null
  currentStreak: number
}

interface GoalProgress {
  goalId: string
  goalDescription: string
  totalMechanisms: number
  activeMechanisms: number
  avgProgress: number
  mechanismsOnTrack: number
  goalCompletionPredictionDays: number | null
  lastActivityDate: Date | null
}

interface CalendarDataItem {
  date: string
  mechanism_id: string
  mechanism_description: string
  goal_id: string
  goal_description: string
  is_scheduled: boolean
  is_exception: boolean
  is_completed: boolean
  original_date: string
}

// Función de fallback para cargar datos básicos
const loadBasicCalendarData = async (userId: string, dateRange: { start: Date; end: Date }) => {
  try {
    // Cargar metas y mecanismos del usuario
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select(`
        id,
        description,
        category,
        mechanisms (
          id,
          description,
          frequency,
          start_date,
          end_date
        )
      `)
      .eq('user_id', userId)

    if (goalsError) throw goalsError

    // Generar actividades básicas
    const activities: CalendarActivity[] = []
    const startDate = dateRange.start
    const endDate = dateRange.end

    // Cargar excepciones existentes
    const { data: exceptions, error: exceptionsError } = await supabase
      .from('mechanism_schedule_exceptions')
      .select('*')
      .eq('user_id', userId)
      .gte('original_date', format(startDate, 'yyyy-MM-dd'))
      .lte('original_date', format(endDate, 'yyyy-MM-dd'))

    if (exceptionsError) {
      console.warn('Error loading exceptions:', exceptionsError)
    }

    console.log('Goals found:', goals?.length || 0)
    console.log('Exceptions found:', exceptions?.length || 0)
    
    goals?.forEach(goal => {
      goal.mechanisms?.forEach((mechanism: { id: string; description: string; frequency: string; start_date?: string; end_date?: string }) => {
        // Validar que el mecanismo tenga ID
        if (!mechanism.id || !mechanism.description) {
          console.warn('Skipping mechanism without ID or description:', mechanism)
          return
        }

        const currentDate = new Date(startDate)
        while (currentDate <= endDate) {
          // Lógica básica de frecuencia
          let shouldInclude = false
          const dayOfWeek = currentDate.getDay()

          switch (mechanism.frequency) {
            case 'daily':
              shouldInclude = true
              break
            case 'weekly':
              shouldInclude = dayOfWeek === 1 // Lunes
              break
            case '2x_week':
              shouldInclude = dayOfWeek === 1 || dayOfWeek === 4 // Lun y Jue
              break
            case '3x_week':
              shouldInclude = dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5 // LMV
              break
            case '4x_week':
              shouldInclude = dayOfWeek >= 1 && dayOfWeek <= 4 // L-J
              break
            case '5x_week':
              shouldInclude = dayOfWeek >= 1 && dayOfWeek <= 5 // L-V
              break
            case 'biweekly':
              // Cada 14 días desde start_date
              if (mechanism.start_date) {
                const startDate = new Date(mechanism.start_date)
                const daysDiff = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                shouldInclude = daysDiff >= 0 && daysDiff % 14 === 0
              }
              break
            case 'monthly':
              // Mismo día del mes
              if (mechanism.start_date) {
                const startDate = new Date(mechanism.start_date)
                shouldInclude = currentDate.getDate() === startDate.getDate()
              }
              break
            case 'yearly':
              // Mismo día y mes
              if (mechanism.start_date) {
                const startDate = new Date(mechanism.start_date)
                shouldInclude = currentDate.getMonth() === startDate.getMonth() && 
                               currentDate.getDate() === startDate.getDate()
              }
              break
          }

          if (shouldInclude) {
            const currentDateStr = format(currentDate, 'yyyy-MM-dd')
            
            // Verificar si hay una excepción para este mecanismo en esta fecha
            const exception = exceptions?.find(ex => 
              ex.mechanism_id === mechanism.id && 
              ex.original_date === currentDateStr
            )
            
            if (exception) {
              // Si hay excepción, crear la actividad en la fecha movida
              // Crear la fecha en zona horaria local para evitar problemas de UTC
              const [year, month, day] = exception.moved_to_date.split('-').map(Number)
              const movedDate = new Date(year, month - 1, day) // month - 1 porque Date usa 0-indexado
              
              console.log('Applying exception:', {
                mechanismId: mechanism.id,
                originalDate: currentDateStr,
                movedToDate: exception.moved_to_date,
                movedDate: movedDate.toISOString(),
                movedDateLocal: movedDate.toLocaleDateString()
              })
              
              activities.push({
                id: `${mechanism.id}-${currentDateStr}`,
                mechanismId: mechanism.id,
                mechanismDescription: mechanism.description,
                goalId: goal.id,
                goalDescription: goal.description,
                date: movedDate,
                originalDate: new Date(currentDate),
                isScheduled: true,
                isException: true,
                isCompleted: false
              })
            } else {
              // Si no hay excepción, crear la actividad en la fecha original
              activities.push({
                id: `${mechanism.id}-${currentDateStr}`,
                mechanismId: mechanism.id,
                mechanismDescription: mechanism.description,
                goalId: goal.id,
                goalDescription: goal.description,
                date: new Date(currentDate),
                originalDate: new Date(currentDate),
                isScheduled: true,
                isException: false,
                isCompleted: false
              })
            }
          }

          currentDate.setDate(currentDate.getDate() + 1)
        }
      })
    })

    return { data: activities, error: null }
  } catch (error) {
    console.error('Error in fallback calendar data:', error)
    return { data: [], error }
  }
}

export const useOptimizedCalendar = (userId: string, dateRange: { start: Date; end: Date }) => {
  const [activities, setActivities] = useState<CalendarActivity[]>([])
  const [progressData, setProgressData] = useState<Record<string, MechanismProgress>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set())

  // Cargar datos del calendario usando lógica básica
  const loadCalendarData = useCallback(async () => {
    setIsLoading(true)
    try {
      console.log('Loading calendar data for user:', userId)
      console.log('Date range:', { start: dateRange.start, end: dateRange.end })

      // Usar directamente la lógica básica
      const fallbackResult = await loadBasicCalendarData(userId, dateRange)
      
      if (fallbackResult.error) {
        console.error('Error loading calendar data:', fallbackResult.error)
        setActivities([])
        return
      }

      console.log('Calendar data loaded:', fallbackResult.data?.length || 0, 'activities')
      setActivities(fallbackResult.data || [])
    } catch (error) {
      console.error('Error loading calendar data:', error)
      setActivities([])
    } finally {
      setIsLoading(false)
    }
  }, [userId, dateRange.start.getTime(), dateRange.end.getTime()])

  // Cargar datos de progreso para cada mecanismo (básico)
  const loadProgressData = useCallback(async () => {
    if (activities.length === 0) return

    console.log('Loading progress data for', activities.length, 'activities')

    const uniqueMechanismIds = [...new Set(activities.map(a => a.mechanismId))]
    
    // Usar progreso básico sin funciones RPC
    const newProgressData: Record<string, MechanismProgress> = {}
    uniqueMechanismIds.forEach(mechanismId => {
      newProgressData[mechanismId] = {
        mechanismId,
        totalExpected: 0,
        totalCompleted: 0,
        progressPercentage: 0,
        lastCompletionDate: null,
        currentStreak: 0
      }
    })

    console.log('Progress data loaded for', Object.keys(newProgressData).length, 'mechanisms')
    setProgressData(newProgressData)
  }, [activities.length])

  // Recalcular progreso específico
  const recalculateProgress = useCallback(async (mechanismId: string) => {
    try {
      const { data, error } = await supabase.rpc('calculate_mechanism_progress', {
        p_mechanism_id: mechanismId,
        p_user_id: userId
      })

      if (error) {
        console.error('Error recalculating progress:', error)
        return
      }

      if (data?.[0]) {
        setProgressData(prev => ({
          ...prev,
          [mechanismId]: {
            mechanismId,
            totalExpected: data[0].total_expected,
            totalCompleted: data[0].total_completed,
            progressPercentage: data[0].progress_percentage,
            lastCompletionDate: data[0].last_completion_date ? new Date(data[0].last_completion_date) : null,
            currentStreak: data[0].current_streak
          }
        }))
        console.log('Progress recalculated for mechanism:', mechanismId)
      }
    } catch (error) {
      console.error('Error in progress recalculation:', error)
    }
  }, [userId])

  // Mover actividad (crear excepción)
  const moveActivity = useCallback(async (activityId: string, newDate: Date, originalDate: Date) => {
    // El activityId tiene formato: mechanismId-date (ej: fb106005-36bc-4879-abc6-2e714b8190f7-2025-09-08)
    // Necesitamos tomar las primeras 5 partes para formar el UUID completo del mechanismId
    const parts = activityId.split('-')
    const mechanismId = parts.slice(0, 5).join('-') // UUID tiene 5 partes separadas por guiones
    
    console.log('Moving activity:', { 
      activityId, 
      mechanismId, 
      newDate: newDate.toISOString(), 
      originalDate: originalDate?.toISOString(),
      splitResult: parts,
      mechanismIdParts: parts.slice(0, 5)
    })
    
    setPendingUpdates(prev => new Set([...prev, activityId]))

    // Update optimista local
    setActivities(prev => prev.map(activity => 
      activity.id === activityId
        ? { ...activity, date: newDate, isException: true }
        : activity
    ))

    try {
      // Intentar crear excepción en DB (si la tabla existe)
      let error
      try {
        const result = await supabase.from('mechanism_schedule_exceptions').upsert({
          mechanism_id: mechanismId,
          original_date: format(originalDate, 'yyyy-MM-dd'),
          moved_to_date: format(newDate, 'yyyy-MM-dd'),
          user_id: userId
        })
        
        if (result.error) {
          // Si es un error 409 (conflicto), actualizar la excepción existente
          if (result.error.code === '23505') {
            console.log('Exception already exists, updating...')
            const updateResult = await supabase
              .from('mechanism_schedule_exceptions')
              .update({ moved_to_date: format(newDate, 'yyyy-MM-dd') })
              .eq('mechanism_id', mechanismId)
              .eq('original_date', format(originalDate, 'yyyy-MM-dd'))
              .eq('user_id', userId)
            
            if (updateResult.error) {
              throw new Error(`Database update error: ${updateResult.error.message}`)
            }
            console.log('Exception updated successfully')
          } else {
            throw new Error(`Database error: ${result.error.message}`)
          }
        }
        
        error = null
      } catch (dbError) {
        console.warn('Table mechanism_schedule_exceptions not available, using fallback:', dbError)
        // Fallback: solo actualizar localmente
        error = null
      }

      if (error) {
        console.error('Error creating exception:', error)
        throw error
      }

      console.log('Activity moved successfully')
    } catch (error) {
      console.error('Error moving activity:', error)
      // Rollback optimista
      setActivities(prev => prev.map(activity => 
        activity.id === activityId
          ? { ...activity, date: originalDate, isException: false }
          : activity
      ))
    } finally {
      setPendingUpdates(prev => {
        const newSet = new Set(prev)
        newSet.delete(activityId)
        return newSet
      })
    }
  }, [userId])

  // Marcar como completado
  const toggleCompletion = useCallback(async (activityId: string, date: Date) => {
    // El activityId tiene formato: mechanismId-date (ej: fb106005-36bc-4879-abc6-2e714b8190f7-2025-09-08)
    // Necesitamos tomar las primeras 5 partes para formar el UUID completo del mechanismId
    const parts = activityId.split('-')
    const mechanismId = parts.slice(0, 5).join('-') // UUID tiene 5 partes separadas por guiones
    const activity = activities.find(a => a.id === activityId)
    if (!activity) {
      console.warn('Activity not found for completion toggle:', activityId)
      return
    }

    const newCompletionState = !activity.isCompleted
    console.log('Toggling completion:', { activityId, mechanismId, newCompletionState })
    
    // Update optimista local
    setActivities(prev => prev.map(a => 
      a.id === activityId ? { ...a, isCompleted: newCompletionState } : a
    ))

    try {
      if (newCompletionState) {
        // Intentar marcar como completado (si la tabla existe)
        let error
        try {
          const result = await supabase.from('mechanism_completions').insert({
            mechanism_id: mechanismId,
            user_id: userId,
            completed_date: format(date, 'yyyy-MM-dd')
          })
          
          if (result.error) {
            throw new Error(`Database error: ${result.error.message}`)
          }
          
          error = null
        } catch (dbError) {
          console.warn('Table mechanism_completions not available, using fallback:', dbError)
          // Fallback: solo actualizar localmente
          error = null
        }

        if (error) {
          console.error('Error marking as completed:', error)
          throw error
        }
      } else {
        // Intentar desmarcar (si la tabla existe)
        let error
        try {
          const result = await supabase
            .from('mechanism_completions')
            .delete()
            .eq('mechanism_id', mechanismId)
            .eq('user_id', userId)
            .eq('completed_date', format(date, 'yyyy-MM-dd'))
          
          if (result.error) {
            throw new Error(`Database error: ${result.error.message}`)
          }
          
          error = null
        } catch (dbError) {
          console.warn('Table mechanism_completions not available, using fallback:', dbError)
          // Fallback: solo actualizar localmente
          error = null
        }

        if (error) {
          console.error('Error unmarking completion:', error)
          throw error
        }
      }

      // Recalcular progreso
      await recalculateProgress(mechanismId)
      console.log('Completion toggled successfully')
    } catch (error) {
      console.error('Error toggling completion:', error)
      // Rollback optimista
      setActivities(prev => prev.map(a => 
        a.id === activityId ? { ...a, isCompleted: !newCompletionState } : a
      ))
    }
  }, [activities, userId, recalculateProgress])

  // Cargar datos inicial
  useEffect(() => {
    if (userId) {
      loadCalendarData()
    }
  }, [userId, dateRange.start.getTime(), dateRange.end.getTime()])

  useEffect(() => {
    if (activities.length > 0) {
      loadProgressData()
    }
  }, [activities.length])

  // Agrupar actividades por fecha para renderizado
  const activitiesByDate = useMemo(() => {
    return activities.reduce((acc, activity) => {
      const dateKey = format(activity.date, 'yyyy-MM-dd')
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(activity)
      return acc
    }, {} as Record<string, CalendarActivity[]>)
  }, [activities])

  return {
    activities,
    activitiesByDate,
    progressData,
    isLoading,
    pendingUpdates,
    moveActivity,
    toggleCompletion,
    recalculateProgress,
    refreshData: loadCalendarData
  }
}

// Hook para progreso de metas
export const useGoalProgress = (userId: string, goalIds?: string[]) => {
  const [goalsProgress, setGoalsProgress] = useState<Record<string, GoalProgress>>({})
  const [isLoading, setIsLoading] = useState(true)

  const loadGoalsProgress = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    
    try {
      // Si no se especifican goalIds, obtener todas las metas del usuario
      let targetGoalIds = goalIds
      
      if (!targetGoalIds) {
        const { data: goals } = await supabase
          .from('goals')
          .select('id')
          .eq('user_id', userId)
        targetGoalIds = goals?.map(g => g.id) || []
      }

      if (targetGoalIds.length === 0) {
        setGoalsProgress({})
        return
      }

      // Obtener información básica de las metas
      const { data: goalsData } = await supabase
        .from('goals')
        .select('id, description')
        .in('id', targetGoalIds)

      // Calcular progreso para cada meta
      const progressPromises = targetGoalIds.map(async (goalId) => {
        try {
          const goalInfo = goalsData?.find(g => g.id === goalId)
          
          let progressData, error
          try {
            const result = await supabase.rpc('calculate_goal_progress', {
              p_goal_id: goalId,
              p_user_id: userId
            })
            progressData = result.data
            error = result.error
          } catch (fallbackError) {
            console.warn('Function calculate_goal_progress not found, using fallback:', fallbackError)
            // Fallback: progreso básico
            progressData = [{ total_mechanisms: 0, active_mechanisms: 0, avg_progress: 0, mechanisms_on_track: 0, goal_completion_prediction_days: null, last_activity_date: null }]
            error = null
          }

          if (error) {
            console.error('Error calculating goal progress:', error)
            return { goalId, goalDescription: goalInfo?.description || 'Meta sin nombre', progressData: null }
          }

          return {
            goalId,
            goalDescription: goalInfo?.description || 'Meta sin nombre',
            progressData: progressData?.[0]
          }
        } catch (error) {
          console.error('Error in goal progress calculation:', error)
          return { goalId, goalDescription: 'Meta sin nombre', progressData: null }
        }
      })

      const results = await Promise.all(progressPromises)
      
      const newGoalsProgress: Record<string, GoalProgress> = {}
      results.forEach(({ goalId, goalDescription, progressData }) => {
        if (progressData) {
          newGoalsProgress[goalId] = {
            goalId,
            goalDescription,
            totalMechanisms: progressData.total_mechanisms,
            activeMechanisms: progressData.active_mechanisms,
            avgProgress: progressData.avg_progress,
            mechanismsOnTrack: progressData.mechanisms_on_track,
            goalCompletionPredictionDays: progressData.goal_completion_prediction_days,
            lastActivityDate: progressData.last_activity_date ? new Date(progressData.last_activity_date) : null
          }
        }
      })

      console.log('Goals progress loaded for', Object.keys(newGoalsProgress).length, 'goals')
      setGoalsProgress(newGoalsProgress)
    } catch (error) {
      console.error('Error loading goals progress:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId, goalIds])

  useEffect(() => {
    if (userId) {
      loadGoalsProgress()
    }
  }, [userId, loadGoalsProgress])

  return {
    goalsProgress,
    isLoading,
    refreshProgress: loadGoalsProgress
  }
}
