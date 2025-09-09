'use client'

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { GoalWithMechanisms } from '@/types/database'

interface CalendarActivity {
  id: string
  title: string
  description: string
  goalId: string
  goalCategory: string
  frequency: string
  date: Date
  completed: boolean
  color: string
}

interface SavedActivity {
  user_id: string
  goal_id: string
  mechanism_id: string
  scheduled_date: string
  completed: boolean
  created_at: string
  updated_at: string
}

export function useCalendarActivities(goals: GoalWithMechanisms[]) {
  const [activities, setActivities] = useState<CalendarActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Generar actividades por defecto solo si no hay actividades guardadas
  const generateDefaultActivities = useCallback(() => {
    console.log('generateDefaultActivities called with goals:', goals)
    if (goals.length === 0) {
      console.log('No goals, setting empty activities')
      setActivities([])
      setIsLoading(false)
      return
    }

    const newActivities: CalendarActivity[] = []
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'bg-red-100 text-red-800 border-red-200'
    ]

    goals.forEach((goal, goalIndex) => {
      console.log(`Processing goal ${goalIndex}:`, goal.category, 'with mechanisms:', goal.mechanisms.length)
      goal.mechanisms.forEach((mechanism) => {
        console.log(`Processing mechanism:`, mechanism.description, 'frequency:', mechanism.frequency)
        // Generar actividades para los próximos 60 días
        const startDate = new Date()
        for (let i = 0; i < 60; i++) {
          const date = new Date(startDate)
          date.setDate(date.getDate() + i)
          
          let shouldInclude = false
          
          switch (mechanism.frequency) {
            case 'daily':
              shouldInclude = true
              break
            case '2x_week':
              // Lunes y Jueves (días 0, 3, 7, 10, 14, 17, etc.)
              shouldInclude = i % 7 === 0 || i % 7 === 3
              break
            case '3x_week':
              // Lunes, Miércoles y Viernes (días 0, 2, 4, 7, 9, 11, etc.)
              shouldInclude = i % 7 === 0 || i % 7 === 2 || i % 7 === 4
              break
            case '4x_week':
              // Lunes, Martes, Jueves y Viernes (días 0, 1, 3, 4, 7, 8, 10, 11, etc.)
              shouldInclude = i % 7 === 0 || i % 7 === 1 || i % 7 === 3 || i % 7 === 4
              break
            case '5x_week':
              // Lunes a Viernes (días 0, 1, 2, 3, 4, 7, 8, 9, 10, 11, etc.)
              shouldInclude = i % 7 >= 0 && i % 7 <= 4
              break
            case 'weekly':
              shouldInclude = i % 7 === 0
              break
            case 'biweekly':
              shouldInclude = i % 14 === 0
              break
            case 'monthly':
              shouldInclude = i === 0 || i === 15
              break
            case 'yearly':
              shouldInclude = i === 0
              break
          }

          if (shouldInclude) {
            console.log(`Adding activity for ${mechanism.description} on day ${i} (${date.toDateString()})`)
            newActivities.push({
              id: `${goal.id}-${mechanism.id}-${i}`,
              title: mechanism.description,
              description: `${goal.category} - ${mechanism.frequency}`,
              goalId: goal.id,
              goalCategory: goal.category,
              frequency: mechanism.frequency,
              date: new Date(date),
              completed: false,
              color: colors[goalIndex % colors.length]
            })
          }
        }
      })
    })

    console.log('Generated activities:', newActivities.length)
    setActivities(newActivities)
    setIsLoading(false)
  }, [goals])

  // Cargar actividades guardadas desde la base de datos
  const loadSavedActivities = useCallback(async () => {
    if (goals.length === 0) {
      setActivities([])
      setIsLoading(false)
      return
    }

    try {
      // Obtener el usuario actual
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.warn('User not authenticated, generating default activities')
        generateDefaultActivities()
        return
      }

      // Obtener todas las actividades guardadas para este usuario
      const { data: savedActivities, error } = await supabase
        .from('user_calendar_activities')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error loading saved activities:', error)
        generateDefaultActivities()
        return
      }

      console.log('Loaded saved activities:', savedActivities)

      // Convertir las actividades guardadas al formato del calendario
      const calendarActivities: CalendarActivity[] = []
      const colors = [
        'bg-blue-100 text-blue-800 border-blue-200',
        'bg-green-100 text-green-800 border-green-200',
        'bg-purple-100 text-purple-800 border-purple-200',
        'bg-orange-100 text-orange-800 border-orange-200',
        'bg-pink-100 text-pink-800 border-pink-200',
        'bg-indigo-100 text-indigo-800 border-indigo-200',
        'bg-yellow-100 text-yellow-800 border-yellow-200',
        'bg-red-100 text-red-800 border-red-200'
      ]

      // Set para rastrear qué mecanismos ya tienen actividades guardadas
      const savedMechanisms = new Set<string>()

      // Si hay actividades guardadas, procesarlas
      if (savedActivities && savedActivities.length > 0) {
        console.log('Processing saved activities:', savedActivities.length)
        
        // Agrupar actividades por goal_id y mechanism_id
        const activityMap = new Map<string, SavedActivity[]>()
        savedActivities.forEach(activity => {
          const key = `${activity.goal_id}-${activity.mechanism_id}`
          if (!activityMap.has(key)) {
            activityMap.set(key, [])
          }
          activityMap.get(key)!.push(activity)
        })

        // Procesar cada grupo de actividades guardadas
        activityMap.forEach((group, key) => {
          console.log('Processing group with key:', key)
          console.log('Group activities:', group)
          
          // El key es "goalId-mechanismId", pero los UUIDs tienen guiones
          // Necesitamos encontrar el goalId y mechanismId correctamente
          const goalIds = goals.map(g => g.id)
          const goalId = goalIds.find(id => key.startsWith(id))
          
          if (!goalId) {
            console.log('Goal ID not found for key:', key)
            return
          }
          
          const mechanismId = key.replace(`${goalId}-`, '')
          console.log('Parsed goalId:', goalId, 'mechanismId:', mechanismId)
          
          const goal = goals.find(g => g.id === goalId)
          if (!goal) {
            console.log('Goal not found:', goalId)
            return
          }

          const mechanism = goal.mechanisms.find(m => m.id === mechanismId)
          if (!mechanism) {
            console.log('Mechanism not found:', mechanismId, 'in goal:', goal.category)
            return
          }

          // Marcar este mecanismo como ya procesado
          savedMechanisms.add(`${goalId}-${mechanismId}`)

          const goalIndex = goals.findIndex(g => g.id === goalId)
          
          group.forEach((savedActivity, index) => {
            console.log(`Loading saved activity: ${mechanism.description} on ${savedActivity.scheduled_date}`)
            
            // Crear la fecha correctamente para evitar problemas de zona horaria
            // scheduled_date viene como "YYYY-MM-DD", necesitamos crear la fecha en zona horaria local
            const [year, month, day] = savedActivity.scheduled_date.split('-').map(Number)
            const activityDate = new Date(year, month - 1, day) // month es 0-indexed
            
            console.log(`Created date: ${activityDate.toDateString()} from ${savedActivity.scheduled_date}`)
            
            calendarActivities.push({
              id: `${goalId}-${mechanismId}-saved-${index}`,
              title: mechanism.description,
              description: `${goal.category} - ${mechanism.frequency}`,
              goalId: goal.id,
              goalCategory: goal.category,
              frequency: mechanism.frequency,
              date: activityDate,
              completed: savedActivity.completed || false,
              color: colors[goalIndex % colors.length]
            })
          })
        })
      }

      // Generar actividades por defecto SOLO para mecanismos que NO tienen actividades guardadas
      console.log('Generating default activities for mechanisms without saved activities')
      goals.forEach((goal, goalIndex) => {
        goal.mechanisms.forEach((mechanism) => {
          const mechanismKey = `${goal.id}-${mechanism.id}`
          
          // Solo generar actividades por defecto si este mecanismo NO tiene actividades guardadas
          if (!savedMechanisms.has(mechanismKey)) {
            console.log(`Generating default activities for mechanism: ${mechanism.description}`)
            
            // Generar actividades para los próximos 60 días
            const startDate = new Date()
            for (let i = 0; i < 60; i++) {
              const date = new Date(startDate)
              date.setDate(date.getDate() + i)
              
              let shouldInclude = false
              
              switch (mechanism.frequency) {
                case 'daily':
                  shouldInclude = true
                  break
                case '2x_week':
                  // Lunes y Jueves (días 0, 3, 7, 10, 14, 17, etc.)
                  shouldInclude = i % 7 === 0 || i % 7 === 3
                  break
                case '3x_week':
                  // Lunes, Miércoles y Viernes (días 0, 2, 4, 7, 9, 11, etc.)
                  shouldInclude = i % 7 === 0 || i % 7 === 2 || i % 7 === 4
                  break
                case '4x_week':
                  // Lunes, Martes, Jueves y Viernes (días 0, 1, 3, 4, 7, 8, 10, 11, etc.)
                  shouldInclude = i % 7 === 0 || i % 7 === 1 || i % 7 === 3 || i % 7 === 4
                  break
                case '5x_week':
                  // Lunes a Viernes (días 0, 1, 2, 3, 4, 7, 8, 9, 10, 11, etc.)
                  shouldInclude = i % 7 >= 0 && i % 7 <= 4
                  break
                case 'weekly':
                  shouldInclude = i % 7 === 0
                  break
                case 'biweekly':
                  shouldInclude = i % 14 === 0
                  break
                case 'monthly':
                  shouldInclude = i === 0 || i === 15
                  break
                case 'yearly':
                  shouldInclude = i === 0
                  break
              }

              if (shouldInclude) {
                console.log(`Adding default activity for ${mechanism.description} on day ${i} (${date.toDateString()})`)
                calendarActivities.push({
                  id: `${goal.id}-${mechanism.id}-${i}`,
                  title: mechanism.description,
                  description: `${goal.category} - ${mechanism.frequency}`,
                  goalId: goal.id,
                  goalCategory: goal.category,
                  frequency: mechanism.frequency,
                  date: new Date(date),
                  completed: false,
                  color: colors[goalIndex % colors.length]
                })
              }
            }
          } else {
            console.log(`Skipping default generation for mechanism: ${mechanism.description} - has saved activities`)
          }
        })
      })

      console.log('Total calendar activities (saved + default):', calendarActivities.length)
      setActivities(calendarActivities)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading activities:', error)
      generateDefaultActivities()
    }
  }, [goals, generateDefaultActivities])

  // Cargar actividades cuando cambien las metas
  useEffect(() => {
    loadSavedActivities()
  }, [loadSavedActivities])

  const updateActivityDate = useCallback(async (activityId: string, newDate: Date) => {
    // Actualizar estado local inmediatamente para mejor UX
    setActivities(prev => 
      prev.map(activity => 
        activity.id === activityId 
          ? { ...activity, date: newDate }
          : activity
      )
    )

    try {
      // Extraer goalId y mechanismId del activityId
      // El formato puede ser: goalId-mechanismId-index o goalId-mechanismId-saved-index
      const parts = activityId.split('-')
      let goalId, mechanismId, index
      
      if (parts.includes('saved')) {
        // Formato: goalId-mechanismId-saved-index
        const savedIndex = parts.indexOf('saved')
        goalId = parts.slice(0, 5).join('-') // Primeros 5 segmentos (UUID completo)
        mechanismId = parts.slice(5, 10).join('-') // Siguientes 5 segmentos (UUID completo)
        index = parts[savedIndex + 1] // El índice después de 'saved'
      } else {
        // Formato: goalId-mechanismId-index
        goalId = parts.slice(0, 5).join('-') // Primeros 5 segmentos (UUID completo)
        mechanismId = parts.slice(5, 10).join('-') // Siguientes 5 segmentos (UUID completo)
        index = parts[10] // El índice numérico
      }
      
      console.log('Parsed IDs:', { activityId, goalId, mechanismId, index })
      
      // Validar que los IDs sean UUIDs válidos
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(goalId) || !uuidRegex.test(mechanismId)) {
        console.error('Invalid UUID format:', { goalId, mechanismId })
        return
      }
      
      // Obtener el usuario actual
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('Auth error:', authError)
        return
      }
      if (!user) {
        console.warn('User not authenticated')
        return
      }

      // Encontrar la actividad original para obtener su fecha anterior
      const originalActivity = activities.find(a => a.id === activityId)
      if (!originalActivity) {
        console.error('Original activity not found for date update')
        return
      }
      
      const originalDate = originalActivity.date.toISOString().split('T')[0]
      const newDateString = newDate.toISOString().split('T')[0]
      
      console.log('Attempting to update activity date:', JSON.stringify({
        userId: user.id,
        goalId,
        mechanismId,
        originalDate,
        newDate: newDateString,
        fullDate: newDate.toISOString()
      }, null, 2))

      try {
        // Si la fecha es la misma, no hacer nada
        if (originalDate === newDateString) {
          console.log('Date is the same, no update needed')
          return
        }

        // Encontrar el mecanismo para obtener su frecuencia
        const goal = goals.find(g => g.id === goalId)
        if (!goal) {
          console.error('Goal not found for mechanism')
          return
        }
        
        const mechanism = goal.mechanisms.find(m => m.id === mechanismId)
        if (!mechanism) {
          console.error('Mechanism not found')
          return
        }

        // Generar todas las fechas para este mecanismo según su frecuencia
        const mechanismDates: string[] = []
        const startDate = new Date()
        
        for (let i = 0; i < 60; i++) {
          const date = new Date(startDate)
          date.setDate(date.getDate() + i)
          
          let shouldInclude = false
          
          switch (mechanism.frequency) {
            case 'daily':
              shouldInclude = true
              break
            case '2x_week':
              shouldInclude = i % 7 === 0 || i % 7 === 3
              break
            case '3x_week':
              shouldInclude = i % 7 === 0 || i % 7 === 2 || i % 7 === 4
              break
            case '4x_week':
              shouldInclude = i % 7 === 0 || i % 7 === 1 || i % 7 === 3 || i % 7 === 4
              break
            case '5x_week':
              shouldInclude = i % 7 >= 0 && i % 7 <= 4
              break
            case 'weekly':
              shouldInclude = i % 7 === 0
              break
            case 'biweekly':
              shouldInclude = i % 14 === 0
              break
            case 'monthly':
              shouldInclude = i === 0 || i === 15
              break
            case 'yearly':
              shouldInclude = i === 0
              break
          }

          if (shouldInclude) {
            mechanismDates.push(date.toISOString().split('T')[0])
          }
        }

        // Reemplazar la fecha original con la nueva fecha en la lista
        const updatedDates = mechanismDates.map(date => 
          date === originalDate ? newDateString : date
        )

        console.log(`Saving all mechanism dates:`, updatedDates)

        // Eliminar todos los registros existentes para este mecanismo
        console.log(`Deleting all existing records for mechanism: ${mechanismId}`)
        const deleteResponse = await supabase
          .from('user_calendar_activities')
          .delete()
          .eq('user_id', user.id)
          .eq('goal_id', goalId)
          .eq('mechanism_id', mechanismId)
        
        if (deleteResponse.error) {
          console.error('Error deleting existing records:', deleteResponse.error)
        } else {
          console.log('Existing records deleted successfully')
        }

        // Crear nuevos registros para todas las fechas del mecanismo
        const recordsToInsert = updatedDates.map(date => ({
          user_id: user.id,
          goal_id: goalId,
          mechanism_id: mechanismId,
          scheduled_date: date,
          completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

        console.log(`Creating ${recordsToInsert.length} new records for mechanism`)
        const createResponse = await supabase
          .from('user_calendar_activities')
          .insert(recordsToInsert)
        
        if (createResponse.error) {
          console.error('Error creating new records:', createResponse.error)
          // Revertir cambio local si falla
          setActivities(prev => 
            prev.map(activity => 
              activity.id === activityId 
                ? { ...activity, date: new Date(originalDate) } // Revertir a fecha original
                : activity
            )
          )
        } else {
          console.log('All mechanism records created successfully')
        }
      } catch (error) {
        console.error('Error during date update:', error)
        // Revertir cambio local si falla
        setActivities(prev => 
          prev.map(activity => 
            activity.id === activityId 
              ? { ...activity, date: new Date(originalDate) } // Revertir a fecha original
              : activity
          )
        )
      }
    } catch (error) {
      console.error('Error updating activity date:', error)
    }
  }, [activities, goals])

  const toggleActivityComplete = useCallback(async (activityId: string) => {
    // Actualizar estado local inmediatamente para mejor UX
    setActivities(prev => 
      prev.map(activity => 
        activity.id === activityId 
          ? { ...activity, completed: !activity.completed }
          : activity
      )
    )

    try {
      // Extraer goalId y mechanismId del activityId
      // El formato puede ser: goalId-mechanismId-index o goalId-mechanismId-saved-index
      const parts = activityId.split('-')
      let goalId, mechanismId, index
      
      if (parts.includes('saved')) {
        // Formato: goalId-mechanismId-saved-index
        const savedIndex = parts.indexOf('saved')
        goalId = parts.slice(0, 5).join('-') // Primeros 5 segmentos (UUID completo)
        mechanismId = parts.slice(5, 10).join('-') // Siguientes 5 segmentos (UUID completo)
        index = parts[savedIndex + 1] // El índice después de 'saved'
      } else {
        // Formato: goalId-mechanismId-index
        goalId = parts.slice(0, 5).join('-') // Primeros 5 segmentos (UUID completo)
        mechanismId = parts.slice(5, 10).join('-') // Siguientes 5 segmentos (UUID completo)
        index = parts[10] // El índice numérico
      }
      
      console.log('Parsed IDs for completion:', { activityId, goalId, mechanismId, index })
      
      // Validar que los IDs sean UUIDs válidos
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(goalId) || !uuidRegex.test(mechanismId)) {
        console.error('Invalid UUID format for completion:', { goalId, mechanismId })
        return
      }
      
      // Obtener el usuario actual
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('Auth error:', authError)
        return
      }
      if (!user) {
        console.warn('User not authenticated')
        return
      }

      // Encontrar la actividad para obtener su fecha
      const activity = activities.find(a => a.id === activityId)
      if (!activity) {
        console.warn('Activity not found:', activityId)
        return
      }

      console.log('Attempting to update activity completion:', {
        userId: user.id,
        goalId,
        mechanismId,
        scheduledDate: activity.date.toISOString().split('T')[0],
        completed: !activity.completed
      })

      // Upsert en la tabla user_calendar_activities
      const response = await supabase
        .from('user_calendar_activities')
        .upsert({
          user_id: user.id,
          goal_id: goalId,
          mechanism_id: mechanismId,
          scheduled_date: activity.date.toISOString().split('T')[0],
          completed: !activity.completed,
          updated_at: new Date().toISOString()
        })

      console.log('Supabase response for completion:', JSON.stringify(response, null, 2))

      if (response.error) {
        console.error('Error updating activity completion:')
        console.error('Error object:', response.error)
        console.error('Error code:', response.error?.code)
        console.error('Error message:', response.error?.message)
        console.error('Error details:', response.error?.details)
        console.error('Error hint:', response.error?.hint)
        console.error('Full response:', response)
        console.error('Response status:', response.status)
        console.error('Response statusText:', response.statusText)
        
        // Si es un error de tabla no existe o similar, solo mostrar warning
        if (response.error.code === 'PGRST116' || 
            response.error.message?.includes('relation "user_calendar_activities" does not exist') ||
            response.error.message?.includes('relation') ||
            response.error.code === '42P01') {
          console.warn('Table user_calendar_activities does not exist yet. Changes will not persist until table is created.')
        } else if (response.error.code === '23505') {
          // Error de clave duplicada - el registro ya existe, intentar actualizar
          console.log('Record already exists for completion, attempting to update...')
          try {
            const updateResponse = await supabase
              .from('user_calendar_activities')
              .update({
                completed: !activity.completed,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id)
              .eq('goal_id', goalId)
              .eq('mechanism_id', mechanismId)
              .eq('scheduled_date', activity.date.toISOString().split('T')[0])
            
            if (updateResponse.error) {
              console.error('Error updating existing record for completion:', updateResponse.error)
            } else {
              console.log('Record updated successfully for completion')
            }
          } catch (updateError) {
            console.error('Error during update attempt for completion:', updateError)
          }
        } else {
          // Revertir cambio local si falla la persistencia por otros motivos
          setActivities(prev => 
            prev.map(activity => 
              activity.id === activityId 
                ? { ...activity, completed: activity.completed } // Revertir
                : activity
            )
          )
        }
      } else {
        console.log('Activity completion updated successfully')
      }
    } catch (error) {
      console.error('Error updating activity completion:', error)
    }
  }, [activities])

  const addActivity = useCallback((date: Date, goalId: string, mechanismId: string) => {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return

    const mechanism = goal.mechanisms.find(m => m.id === mechanismId)
    if (!mechanism) return

    const goalIndex = goals.findIndex(g => g.id === goalId)
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'bg-red-100 text-red-800 border-red-200'
    ]

    const newActivity: CalendarActivity = {
      id: `${goalId}-${mechanismId}-${Date.now()}`,
      title: mechanism.description,
      description: `${goal.category} - ${mechanism.frequency}`,
      goalId: goal.id,
      goalCategory: goal.category,
      frequency: mechanism.frequency,
      date: new Date(date),
      completed: false,
      color: colors[goalIndex % colors.length]
    }

    setActivities(prev => [...prev, newActivity])
  }, [goals])

  return {
    activities,
    isLoading,
    updateActivityDate,
    toggleActivityComplete,
    addActivity
  }
}
