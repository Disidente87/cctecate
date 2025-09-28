'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'

// Función utilitaria para calcular si una fecha debe incluirse según la frecuencia
const shouldIncludeDate = (
  currentDate: Date, 
  startDate: Date, 
  frequency: string
): boolean => {
  const dayOfWeek = currentDate.getDay()
  
  switch (frequency) {
    case 'daily':
      return true
    case 'weekly':
      return dayOfWeek === 5 // Viernes
    case '2x_week':
      return dayOfWeek === 2 || dayOfWeek === 4 // Mar y Jue
    case '3x_week':
      return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5 // LMV
    case '4x_week':
      return dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4 || dayOfWeek === 5 // LMMJ
    case '5x_week':
      const include5xWeek = dayOfWeek >= 1 && dayOfWeek <= 5 // L-V
      
      
      return include5xWeek
    case 'biweekly':
      const daysSincePeriodStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const shouldInclude = daysSincePeriodStart >= 0 && daysSincePeriodStart % 14 === 0
      
      
      return shouldInclude
    case 'monthly':
      if (startDate) {
        const dayOfMonth = startDate.getDate()
        return currentDate.getDate() === dayOfMonth
      }
      return false
    case 'yearly':
      if (startDate) {
        return currentDate.getMonth() === startDate.getMonth() && 
               currentDate.getDate() === startDate.getDate()
      }
      return false
    default:
      return false
  }
}

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
  category: string
  totalMechanisms: number
  activeMechanisms: number
  avgProgress: number
  progressUntilToday: number
  mechanismsOnTrack: number
  goalCompletionPredictionDays: number | null
  lastActivityDate: Date | null
}


// Función de fallback para cargar datos básicos (usando participación activa)
const loadBasicCalendarData = async (userId: string, dateRange: { start: Date; end: Date }) => {
  try {
    // Obtener la participación activa del usuario
    const { data: activeParticipation } = await supabase
      .rpc('get_user_active_participation', { p_user_id: userId })

    let goalsQuery = supabase
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

    // Filtrar por participación activa si existe
    if (activeParticipation?.[0]?.participation_id) {
      goalsQuery = goalsQuery.eq('user_participation_id', activeParticipation[0].participation_id)
    } else {
      // Fallback: usar metas sin user_participation_id (datos antiguos)
      goalsQuery = goalsQuery.is('user_participation_id', null)
    }

    const { data: goals, error: goalsError } = await goalsQuery

    if (goalsError) throw goalsError

    // Cargar fechas de generación para calcular el período de mecanismos
    // Primero obtener la generación del usuario desde profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('generation')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.warn('Error loading user profile:', profileError)
    }

    let generation = null
    if (profile?.generation) {
      const { data: generationData, error: generationError } = await supabase
        .from('generations')
        .select('pl1_training_date, pl3_training_date')
        .eq('name', profile.generation)
        .single()

      if (generationError) {
        console.warn('Error loading generation dates:', generationError)
      } else {
        generation = generationData
      }
    }

    console.log('Generation dates loaded:', {
      userGeneration: profile?.generation,
      pl1_training_date: generation?.pl1_training_date,
      pl3_training_date: generation?.pl3_training_date
    })

    // Calcular el período de mecanismos
    let mechanismStartDate = dateRange.start
    let mechanismEndDate = dateRange.end

    if (generation?.pl1_training_date && generation?.pl3_training_date) {
      const pl1Date = new Date(generation.pl1_training_date)
      const pl3Date = new Date(generation.pl3_training_date)
      
      // Mecanismos empiezan 1 semana después de PL1
      mechanismStartDate = new Date(pl1Date)
      mechanismStartDate.setDate(mechanismStartDate.getDate() + 9)
      
      // Mecanismos terminan 1 semana antes de PL3
      mechanismEndDate = new Date(pl3Date)
      mechanismEndDate.setDate(mechanismEndDate.getDate() - 7)

      console.log('Mechanism period calculated:', {
        pl1Date: pl1Date.toISOString(),
        pl3Date: pl3Date.toISOString(),
        mechanismStartDate: mechanismStartDate.toISOString(),
        mechanismEndDate: mechanismEndDate.toISOString()
      })
    }

    // Generar actividades básicas
    const activities: CalendarActivity[] = []
    const startDate = dateRange.start
    const endDate = dateRange.end

    // Cargar excepciones existentes - incluir excepciones que se muevan dentro del rango de fechas
    const { data: exceptions, error: exceptionsError } = await supabase
      .from('mechanism_schedule_exceptions')
      .select('*')
      .eq('user_id', userId)
      .or(`original_date.gte.${format(startDate, 'yyyy-MM-dd')},moved_to_date.gte.${format(startDate, 'yyyy-MM-dd')}`)
      .or(`original_date.lte.${format(endDate, 'yyyy-MM-dd')},moved_to_date.lte.${format(endDate, 'yyyy-MM-dd')}`)

    if (exceptionsError) {
      console.warn('Error loading exceptions:', exceptionsError)
    }

    console.log('Goals found:', goals?.length || 0)
    console.log('Exceptions found:', exceptions?.length || 0)

    // Cargar actividades completadas
    const { data: completions, error: completionsError } = await supabase
      .from('mechanism_completions')
      .select('*')
      .eq('user_id', userId)
      .gte('completed_date', format(startDate, 'yyyy-MM-dd'))
      .lte('completed_date', format(endDate, 'yyyy-MM-dd'))

    if (completionsError) {
      console.warn('Error loading completions:', completionsError)
    }

    console.log('Completions found:', completions?.length || 0)

    // Función helper para verificar si una actividad está completada
    const isActivityCompleted = (mechanismId: string, activityDate: Date): boolean => {
      const dateStr = format(activityDate, 'yyyy-MM-dd')
      return completions?.some(completion => 
        completion.mechanism_id === mechanismId && 
        completion.completed_date === dateStr
      ) || false
    }
    
    goals?.forEach(goal => {
      goal.mechanisms?.forEach((mechanism: { id: string; description: string; frequency: string; start_date?: string; end_date?: string }) => {
        // Validar que el mecanismo tenga ID
        if (!mechanism.id || !mechanism.description) {
          console.warn('Skipping mechanism without ID or description:', mechanism)
          return
        }

        const currentDate = new Date(startDate)
        while (currentDate <= endDate) {
          // Verificar si la fecha está dentro del período de mecanismos
          const isWithinMechanismPeriod = currentDate >= mechanismStartDate && currentDate <= mechanismEndDate
          
          if (!isWithinMechanismPeriod) {
            currentDate.setDate(currentDate.getDate() + 1)
            continue
          }

          // Usar función utilitaria para calcular frecuencia
          const mechanismStartDateForFreq = mechanism.start_date ? new Date(mechanism.start_date) : mechanismStartDate
          const shouldInclude = shouldIncludeDate(currentDate, mechanismStartDateForFreq, mechanism.frequency)

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
              
              // Verificar que la fecha movida esté dentro del período de mecanismos
              const isMovedDateWithinPeriod = movedDate >= mechanismStartDate && movedDate <= mechanismEndDate
              
              if (!isMovedDateWithinPeriod) {
                console.log(`Skipping exception for mechanism ${mechanism.id} - moved date ${exception.moved_to_date} is outside mechanism period`)
                currentDate.setDate(currentDate.getDate() + 1)
                continue
              }
              
              console.log('Applying exception:', {
                mechanismId: mechanism.id,
                originalDate: currentDateStr,
                movedToDate: exception.moved_to_date,
                movedDate: movedDate.toISOString(),
                movedDateLocal: movedDate.toLocaleDateString(),
                isWithinPeriod: isMovedDateWithinPeriod
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
                isCompleted: isActivityCompleted(mechanism.id, movedDate)
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
                isCompleted: isActivityCompleted(mechanism.id, new Date(currentDate))
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

  // Cargar datos de progreso para cada mecanismo
  const loadProgressData = useCallback(async () => {
    console.log('DEBUG: loadProgressData called, activities.length:', activities.length)
    if (activities.length === 0) {
      console.log('DEBUG: No activities, returning early')
      return
    }

    console.log('Loading progress data for', activities.length, 'activities')
    console.log('DEBUG: Starting loadProgressData function')

    const uniqueMechanismIds = [...new Set(activities.map(a => a.mechanismId))]
    
    try {
      // Intentar usar la función RPC optimizada
      console.log('DEBUG: Attempting to use RPC function for progress calculation')
      
      // Intentar usar la función RPC optimizada
      const { error } = await supabase.rpc('calculate_mechanism_progress', {
        p_mechanism_id: uniqueMechanismIds[0], // Solo para probar si existe la función
        p_user_id: userId
      })

      if (error) {
        throw new Error('RPC function not available')
      }

      // Si la función RPC está disponible, usarla para todos los mecanismos
      const newProgressData: Record<string, MechanismProgress> = {}
      
      for (const mechanismId of uniqueMechanismIds) {
        const { data: mechanismProgress, error: progressError } = await supabase.rpc('calculate_mechanism_progress', {
          p_mechanism_id: mechanismId,
          p_user_id: userId
        })

        if (progressError) {
          console.warn(`Error calculating progress for mechanism ${mechanismId}:`, progressError)
          continue
        }

        if (mechanismProgress?.[0]) {
          console.log(`RPC Progress for mechanism ${mechanismId}:`, {
            totalExpected: mechanismProgress[0].total_expected,
            totalCompleted: mechanismProgress[0].total_completed,
            progressPercentage: mechanismProgress[0].progress_percentage,
            lastCompletionDate: mechanismProgress[0].last_completion_date
          })
          
          newProgressData[mechanismId] = {
            mechanismId,
            totalExpected: mechanismProgress[0].total_expected,
            totalCompleted: mechanismProgress[0].total_completed,
            progressPercentage: mechanismProgress[0].progress_percentage,
            lastCompletionDate: mechanismProgress[0].last_completion_date ? new Date(mechanismProgress[0].last_completion_date) : null,
            currentStreak: mechanismProgress[0].current_streak
          }
        }
      }

      console.log('Progress data loaded for', Object.keys(newProgressData).length, 'mechanisms')
      setProgressData(newProgressData)
    } catch (error) {
      console.warn('RPC function not available, using fallback progress calculation:', error)
      console.log('DEBUG: Entering fallback calculation')
      
      // Fallback: calcular progreso real del mecanismo desde la base de datos
      const newProgressData: Record<string, MechanismProgress> = {}
      
      // Cargar fechas de generación para el período de mecanismos
      // Primero obtener la generación del usuario desde profiles
      console.log('DEBUG: Loading profile for user:', userId)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('generation')
        .eq('id', userId)
        .single()

      console.log('DEBUG: Profile loaded:', { profile, profileError })

      let generation = null
      if (profile?.generation) {
        console.log('DEBUG: Loading generation data for:', profile.generation)
        const { data: generationData, error: generationError } = await supabase
          .from('generations')
          .select('pl1_training_date, pl3_training_date')
          .eq('name', profile.generation)
          .single()

        console.log('DEBUG: Generation data loaded:', { generationData, generationError })

        if (generationError) {
          console.warn('Error loading generation dates for progress calculation:', generationError)
        } else {
          generation = generationData
        }
      } else {
        console.warn('DEBUG: No generation found in profile')
      }

      // Calcular el período de mecanismos
      let mechanismStartDate = new Date()
      let mechanismEndDate = new Date()

      console.log('DEBUG: Generation data for progress calculation:', {
        pl1_training_date: generation?.pl1_training_date,
        pl3_training_date: generation?.pl3_training_date,
        generation: generation
      })

      if (generation?.pl1_training_date && generation?.pl3_training_date) {
        const pl1Date = new Date(generation.pl1_training_date)
        const pl3Date = new Date(generation.pl3_training_date)
        
        // Mecanismos empiezan 1 semana después de PL1
        mechanismStartDate = new Date(pl1Date)
        mechanismStartDate.setDate(mechanismStartDate.getDate() + 9)
        
        // Mecanismos terminan 1 semana antes de PL3
        mechanismEndDate = new Date(pl3Date)
        mechanismEndDate.setDate(mechanismEndDate.getDate() - 7)
        
        console.log('DEBUG: Mechanism period calculated for progress:', {
          pl1Date: pl1Date.toISOString().split('T')[0],
          pl3Date: pl3Date.toISOString().split('T')[0],
          mechanismStartDate: mechanismStartDate.toISOString().split('T')[0],
          mechanismEndDate: mechanismEndDate.toISOString().split('T')[0]
        })
      } else {
        console.warn('DEBUG: No generation dates available, using fallback dates')
      }
      
      for (const mechanismId of uniqueMechanismIds) {
        console.log(`DEBUG: Processing mechanism ${mechanismId}`)
        try {
          // Obtener el mecanismo para conocer su frecuencia y fechas
          const { data: mechanism, error: mechanismError } = await supabase
            .from('mechanisms')
            .select('*')
            .eq('id', mechanismId)
            .single()

          if (mechanismError || !mechanism) {
            console.warn(`Error loading mechanism ${mechanismId}:`, mechanismError)
            continue
          }

          console.log(`Loading mechanism data for ${mechanismId}:`, {
            description: mechanism.description,
            frequency: mechanism.frequency,
            start_date: mechanism.start_date,
            end_date: mechanism.end_date
          })

          // Usar el período de mecanismos calculado, pero respetar la start_date del mecanismo
          let startDate = mechanismStartDate
          let endDate = mechanismEndDate
          
          // Si el mecanismo tiene una start_date posterior al período de mecanismos, usarla
          if (mechanism.start_date) {
            const mechanismStart = new Date(mechanism.start_date)
            if (mechanismStart > startDate) {
              startDate = mechanismStart
            }
          }
          
          // Si el mecanismo tiene una end_date anterior al período de mecanismos, usarla
          if (mechanism.end_date) {
            const mechanismEnd = new Date(mechanism.end_date)
            if (mechanismEnd < endDate) {
              endDate = mechanismEnd
            }
          }
          
          const today = new Date()
          // Para el cálculo de progreso, usar siempre el período completo de mecanismos
          // No limitar por la fecha actual para permitir cálculo completo del progreso
          const actualEndDate = endDate
          
          console.log(`DEBUG: Date calculation for mechanism ${mechanismId}:`, {
            today: today.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            endDateYear: endDate.getFullYear(),
            todayYear: today.getFullYear(),
            actualEndDate: actualEndDate.toISOString().split('T')[0]
          })
          
          console.log(`DEBUG: Date range for mechanism ${mechanismId}:`, {
            mechanismStartDate: mechanismStartDate.toISOString().split('T')[0],
            mechanismEndDate: mechanismEndDate.toISOString().split('T')[0],
            mechanismStart: mechanism.start_date,
            mechanismEnd: mechanism.end_date,
            finalStartDate: startDate.toISOString().split('T')[0],
            finalEndDate: actualEndDate.toISOString().split('T')[0]
          })

          let totalExpected = 0
          const currentDate = new Date(startDate)
          const expectedDates: string[] = []
          
          console.log(`Calculating expected occurrences for mechanism ${mechanismId}:`, {
            frequency: mechanism.frequency,
            periodStart: startDate.toISOString().split('T')[0],
            periodEnd: actualEndDate.toISOString().split('T')[0]
          })
          
          while (currentDate <= actualEndDate) {
            const shouldInclude = shouldIncludeDate(currentDate, startDate, mechanism.frequency)

            if (shouldInclude) {
              totalExpected++
              expectedDates.push(currentDate.toISOString().split('T')[0])
            }

            currentDate.setDate(currentDate.getDate() + 1)
          }
          
          console.log(`Expected dates for ${mechanismId}:`, expectedDates)

          // Obtener el total completado desde la base de datos
          const { data: completions, error: completionsError } = await supabase
            .from('mechanism_completions')
            .select('completed_date')
            .eq('mechanism_id', mechanismId)
            .eq('user_id', userId)
            .gte('completed_date', format(startDate, 'yyyy-MM-dd'))
            // No aplicamos filtro de fecha límite para obtener el total completado

          if (completionsError) {
            console.warn(`Error loading completions for mechanism ${mechanismId}:`, completionsError)
            continue
          }

          const totalCompleted = completions?.length || 0
          const progressPercentage = totalExpected > 0 ? (totalCompleted / totalExpected) * 100 : 0
          
          // Validación adicional para evitar porcentajes incorrectos
          if (totalExpected === 0 && totalCompleted > 0) {
            console.warn(`Mechanism ${mechanismId} has completions but no expected occurrences in period`)
          }

          // Calcular última fecha de completado
          let lastCompletionDate = null
          if (completions && completions.length > 0) {
            const sortedCompletions = completions.sort((a, b) => 
              new Date(b.completed_date).getTime() - new Date(a.completed_date).getTime()
            )
            lastCompletionDate = new Date(sortedCompletions[0].completed_date)
          }

          newProgressData[mechanismId] = {
            mechanismId,
            totalExpected,
            totalCompleted,
            progressPercentage,
            lastCompletionDate,
            currentStreak: 0 // Simplificado para fallback
          }

          console.log(`Progress calculated for mechanism ${mechanismId}:`, {
            description: mechanism.description,
            frequency: mechanism.frequency,
            periodStart: startDate.toISOString().split('T')[0],
            periodEnd: actualEndDate.toISOString().split('T')[0],
            totalExpected,
            totalCompleted,
            progressPercentage: `${Math.round(progressPercentage)}%`,
            completions: completions?.map(c => c.completed_date) || []
          })

        } catch (error) {
          console.warn(`Error calculating progress for mechanism ${mechanismId}:`, error)
          // Usar datos básicos como último recurso
          const mechanismActivities = activities.filter(a => a.mechanismId === mechanismId)
          const completedActivities = mechanismActivities.filter(a => a.isCompleted)
          
          newProgressData[mechanismId] = {
            mechanismId,
            totalExpected: mechanismActivities.length,
            totalCompleted: completedActivities.length,
            progressPercentage: mechanismActivities.length > 0 ? (completedActivities.length / mechanismActivities.length) * 100 : 0,
            lastCompletionDate: completedActivities.length > 0 ? 
              new Date(Math.max(...completedActivities.map(a => a.date.getTime()))) : null,
            currentStreak: 0
          }
        }
      }

      console.log('Fallback progress data loaded for', Object.keys(newProgressData).length, 'mechanisms')
      setProgressData(newProgressData)
    }
  }, [activities, userId])

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
    
    // Verificar si existe una excepción donde moved_to_date sea igual a original_date
    // Esto indica que el mecanismo está regresando a su día original
    const isReturningToOriginal = originalDate && 
      newDate.getFullYear() === originalDate.getFullYear() &&
      newDate.getMonth() === originalDate.getMonth() &&
      newDate.getDate() === originalDate.getDate()
    
    console.log('=== DATE COMPARISON DEBUG ===')
    console.log('originalDate:', originalDate?.toISOString())
    console.log('newDate:', newDate.toISOString())
    console.log('originalDate year:', originalDate?.getFullYear())
    console.log('newDate year:', newDate.getFullYear())
    console.log('originalDate month:', originalDate?.getMonth())
    console.log('newDate month:', newDate.getMonth())
    console.log('originalDate date:', originalDate?.getDate())
    console.log('newDate date:', newDate.getDate())
    console.log('Years match:', originalDate?.getFullYear() === newDate.getFullYear())
    console.log('Months match:', originalDate?.getMonth() === newDate.getMonth())
    console.log('Dates match:', originalDate?.getDate() === newDate.getDate())
    console.log('Is returning to original day:', isReturningToOriginal)
    console.log('================================')
    
    setPendingUpdates(prev => new Set([...prev, activityId]))

    // Update optimista local
    setActivities(prev => prev.map(activity => 
      activity.id === activityId
        ? { ...activity, date: newDate, isException: !isReturningToOriginal }
        : activity
    ))

    try {
      // Intentar manejar excepción en DB (si la tabla existe)
      let error
      try {
        if (isReturningToOriginal) {
          // Si se regresa al día original, eliminar la excepción
          console.log('Returning to original day, deleting exception...')
          const deleteResult = await supabase
            .from('mechanism_schedule_exceptions')
            .delete()
            .eq('mechanism_id', mechanismId)
            .eq('original_date', format(originalDate, 'yyyy-MM-dd'))
            .eq('user_id', userId)
          
          if (deleteResult.error) {
            throw new Error(`Database delete error: ${deleteResult.error.message}`)
          }
          console.log('Exception deleted successfully')
        } else {
          // Si se mueve a un día diferente, crear o actualizar excepción
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
      // Rollback optimista - mantener el estado original
      setActivities(prev => prev.map(activity => 
        activity.id === activityId
          ? { ...activity, date: originalDate, isException: activity.isException }
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

      // Recalcular progreso del mecanismo
      await recalculateProgress(mechanismId)
      
      // También recargar el progreso de las metas
      if (typeof window !== 'undefined') {
        // Solo en el cliente, recargar el progreso de metas
        setTimeout(async () => {
          console.log('Reloading goals progress after completion toggle')
          // Obtener el goalId del mecanismo para actualizar solo esa meta
          const { data: mechanism } = await supabase
            .from('mechanisms')
            .select('goal_id')
            .eq('id', mechanismId)
            .single()

          // Disparar evento personalizado para que el dashboard se actualice
          window.dispatchEvent(new CustomEvent('mechanismCompleted', { 
            detail: { 
              mechanismId, 
              goalId: mechanism?.goal_id,
              completed: newCompletionState 
            } 
          }))
        }, 100)
      }
      
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
  }, [userId, dateRange.start.getTime(), dateRange.end.getTime(), loadCalendarData])

  useEffect(() => {
    console.log('DEBUG: useEffect for loadProgressData triggered, activities.length:', activities.length)
    if (activities.length > 0) {
      console.log('DEBUG: Calling loadProgressData')
      loadProgressData()
    } else {
      console.log('DEBUG: No activities, skipping loadProgressData')
    }
  }, [activities, loadProgressData])

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

  // Función unificada para calcular progreso de metas (una o múltiples)
  const calculateGoalProgress = useCallback(async (targetGoalIds?: string[]) => {
    if (!userId) return

    console.log('DEBUG: calculateGoalProgress - Starting for userId:', userId, 'goalIds:', targetGoalIds)
    
    try {
      // Si no se especifican goalIds, obtener todas las metas del usuario
      let goalIdsToProcess = targetGoalIds
      
      if (!goalIdsToProcess) {
        const { data: goals } = await supabase
          .from('goals')
          .select('id')
          .eq('user_id', userId)
        goalIdsToProcess = goals?.map(g => g.id) || []
      }

      if (goalIdsToProcess.length === 0) {
        setGoalsProgress({})
        return
      }

      // Obtener información básica de las metas
      const { data: goalsData } = await supabase
        .from('goals')
        .select('id, description, category')
        .in('id', goalIdsToProcess)

      // Calcular progreso para cada meta
      const progressPromises = goalIdsToProcess.map(async (goalId) => {
        try {
          const goalInfo = goalsData?.find(g => g.id === goalId)
          
          // Obtener mecanismos de esta meta
          const { data: mechanisms, error: mechanismsError } = await supabase
            .from('mechanisms')
            .select('*')
            .eq('goal_id', goalId)

          if (mechanismsError) {
            console.error('Error loading mechanisms for goal:', mechanismsError)
            return { goalId, goalDescription: goalInfo?.description || 'Meta sin nombre', progressData: null }
          }


          // Obtener fechas de generación para calcular el período
          const { data: profile } = await supabase
            .from('profiles')
            .select('generation')
            .eq('id', userId)
            .single()

          let mechanismStartDate = new Date()
          let mechanismEndDate = new Date()

          if (profile?.generation) {
            const { data: generationData } = await supabase
              .from('generations')
              .select('pl1_training_date, pl3_training_date')
              .eq('name', profile.generation)
              .single()

            if (generationData?.pl1_training_date && generationData?.pl3_training_date) {
              const pl1Date = new Date(generationData.pl1_training_date)
              const pl3Date = new Date(generationData.pl3_training_date)
              
              // Mecanismos empiezan 1 semana después de PL1
              mechanismStartDate = new Date(pl1Date)
              mechanismStartDate.setDate(mechanismStartDate.getDate() + 9)
              
              // Mecanismos terminan 1 semana antes de PL3
              mechanismEndDate = new Date(pl3Date)
              mechanismEndDate.setDate(mechanismEndDate.getDate() - 7)
            }
          }

          // Calcular actividades totales esperadas para esta meta
          let totalExpectedActivities = 0
          let totalCompletedActivities = 0

          for (const mechanism of mechanisms || []) {
            
            // Calcular cuántas actividades se esperan para este mecanismo
            const startDate = mechanism.start_date ? new Date(mechanism.start_date) : mechanismStartDate
            const endDate = mechanism.end_date ? new Date(mechanism.end_date) : mechanismEndDate
            
            // Usar el período completo para el cálculo
            const actualStartDate = startDate > mechanismStartDate ? startDate : mechanismStartDate
            const actualEndDate = endDate < mechanismEndDate ? endDate : mechanismEndDate
            
            // Normalizar las horas para todas las frecuencias (para incluir el último día)
            const loopStartDate = new Date(actualStartDate)
            const loopEndDate = new Date(actualEndDate)
            
            // Aplicar normalización para todas las frecuencias que usan días específicos
            if (['weekly', '2x_week', '3x_week', '4x_week', '5x_week'].includes(mechanism.frequency)) {
              loopStartDate.setHours(0, 0, 0, 0)
              loopEndDate.setHours(23, 59, 59, 999)
            }

            let expectedCount = 0
            const currentDate = new Date(loopStartDate)
            const expectedDates: string[] = []
            
            
            while (currentDate <= loopEndDate) {
              
              const shouldInclude = shouldIncludeDate(currentDate, actualStartDate, mechanism.frequency)


              if (shouldInclude) {
                expectedCount++
                expectedDates.push(format(currentDate, 'yyyy-MM-dd'))
              }

              
              currentDate.setDate(currentDate.getDate() + 1)
            }


            totalExpectedActivities += expectedCount


            // Contar actividades completadas para este mecanismo (usar mismo período que para esperadas)
            const { data: completions } = await supabase
              .from('mechanism_completions')
              .select('completed_date')
              .eq('mechanism_id', mechanism.id)
              .eq('user_id', userId)
              .gte('completed_date', format(actualStartDate, 'yyyy-MM-dd'))
              // No aplicamos filtro de fecha límite para obtener el total completado

            totalCompletedActivities += completions?.length || 0
          }


          const progressPercentage = totalExpectedActivities > 0 ? (totalCompletedActivities / totalExpectedActivities) * 100 : 0

          // Calcular progreso esperado hasta hoy
          const today = new Date()
          today.setHours(23, 59, 59, 999) // Incluir todo el día de hoy
          
          let expectedUntilToday = 0
          let completedUntilToday = 0

          for (const mechanism of mechanisms || []) {
            const startDate = mechanism.start_date ? new Date(mechanism.start_date) : mechanismStartDate
            const endDate = mechanism.end_date ? new Date(mechanism.end_date) : mechanismEndDate
            
            const actualStartDate = startDate > mechanismStartDate ? startDate : mechanismStartDate
            const actualEndDate = endDate < mechanismEndDate ? endDate : mechanismEndDate
            const todayEndDate = today < actualEndDate ? today : actualEndDate


            let expectedCountUntilToday = 0
            const currentDate = new Date(actualStartDate)
            
            while (currentDate <= todayEndDate) {
              const shouldInclude = shouldIncludeDate(currentDate, actualStartDate, mechanism.frequency)

              if (shouldInclude) {
                expectedCountUntilToday++
              }

              currentDate.setDate(currentDate.getDate() + 1)
            }

            expectedUntilToday += expectedCountUntilToday

            // Contar actividades completadas del mecanismo
            // Para el cálculo de progreso, contamos todas las completions del mecanismo
            // independientemente de la fecha, ya que lo que importa es el total completado
            let completionsQuery = supabase
              .from('mechanism_completions')
              .select('completed_date')
              .eq('mechanism_id', mechanism.id)
              .eq('user_id', userId)

            // Solo aplicar filtro de fecha de inicio si el mecanismo ya comenzó
            if (today >= actualStartDate) {
              completionsQuery = completionsQuery
                .gte('completed_date', format(actualStartDate, 'yyyy-MM-dd'))
            }
            // No aplicamos filtro de fecha límite porque queremos el total completado

            const { data: completionsData } = await completionsQuery

            // Sumar todas las completions del mecanismo (total completado)
            completedUntilToday += completionsData?.length || 0
          }


          // Calcular progreso hasta hoy con lógica especial para actividades adelantadas
          let progressUntilToday = 0
          if (expectedUntilToday > 0) {
            // Caso normal: hay actividades esperadas hasta hoy
            progressUntilToday = (completedUntilToday / expectedUntilToday) * 100
          } else if (completedUntilToday > 0) {
            // Caso especial: no hay actividades esperadas hasta hoy pero se completaron actividades
            // Esto significa que el usuario está adelantado, mostrar 100% o más
            progressUntilToday = 100
          } else {
            // No hay actividades esperadas ni completadas hasta hoy
            progressUntilToday = 0
          }



          return {
            goalId,
            goalDescription: goalInfo?.description || 'Meta sin nombre',
            category: goalInfo?.category || 'Sin categoría',
            progressData: {
              totalMechanisms: mechanisms?.length || 0,
              activeMechanisms: mechanisms?.length || 0,
              avgProgress: progressPercentage,
              progressUntilToday: progressUntilToday,
              mechanismsOnTrack: Math.round(progressPercentage / 100 * (mechanisms?.length || 0)),
              goalCompletionPredictionDays: null,
              lastActivityDate: null
            }
          }
        } catch (error) {
          console.error('Error in goal progress calculation:', error)
          return { goalId, goalDescription: 'Meta sin nombre', progressData: null }
        }
      })

      const results = await Promise.all(progressPromises)
      
      const newGoalsProgress: Record<string, GoalProgress> = {}
      results.forEach(({ goalId, goalDescription, category, progressData }) => {
        if (progressData) {
          newGoalsProgress[goalId] = {
            goalId,
            goalDescription,
            category,
            totalMechanisms: progressData.totalMechanisms,
            activeMechanisms: progressData.activeMechanisms,
            avgProgress: progressData.avgProgress,
            progressUntilToday: progressData.progressUntilToday,
            mechanismsOnTrack: progressData.mechanismsOnTrack,
            goalCompletionPredictionDays: progressData.goalCompletionPredictionDays,
            lastActivityDate: progressData.lastActivityDate ? new Date(progressData.lastActivityDate) : null
          }
        }
      })

      // Si se están actualizando metas específicas, preservar las otras metas existentes
      if (targetGoalIds && targetGoalIds.length > 0) {
        setGoalsProgress(prev => ({
          ...prev,
          ...newGoalsProgress
        }))
      } else {
        // Si se están cargando todas las metas, reemplazar completamente
        setGoalsProgress(newGoalsProgress)
      }
    } catch (error) {
      console.error('Error calculating goal progress:', error)
    }
  }, [userId])

  // Función para cargar progreso inicial (wrapper de calculateGoalProgress)
  const loadGoalsProgress = useCallback(async () => {
    if (!userId) return

    console.log('DEBUG: loadGoalsProgress - Starting for userId:', userId)
    setIsLoading(true)
    
    try {
      await calculateGoalProgress(goalIds)
    } catch (error) {
      console.error('Error loading goals progress:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId, goalIds, calculateGoalProgress])

  // Función para actualizar una sola meta (wrapper de calculateGoalProgress)
  const updateSingleGoalProgress = useCallback(async (goalId: string) => {
    console.log('DEBUG: updateSingleGoalProgress - Updating single goal:', goalId)
    await calculateGoalProgress([goalId])
  }, [calculateGoalProgress])

  useEffect(() => {
    if (userId) {
      loadGoalsProgress()
    }
  }, [userId, loadGoalsProgress])

  return {
    goalsProgress,
    isLoading,
    refreshProgress: loadGoalsProgress,
    updateSingleGoalProgress
  }
}
