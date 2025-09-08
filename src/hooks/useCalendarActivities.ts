'use client'

import { useState, useCallback, useEffect } from 'react'
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

export function useCalendarActivities(goals: GoalWithMechanisms[]) {
  const [activities, setActivities] = useState<CalendarActivity[]>([])

  // Generar actividades automáticamente cuando cambien las metas
  useEffect(() => {
    if (goals.length === 0) {
      setActivities([])
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
      goal.mechanisms.forEach((mechanism) => {
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
              shouldInclude = i % 3 === 0 || i % 3 === 2
              break
            case '3x_week':
              shouldInclude = i % 2 === 0 || i % 3 === 1
              break
            case '4x_week':
              shouldInclude = i % 2 === 0
              break
            case '5x_week':
              shouldInclude = i % 1 === 0 && i % 2 !== 0
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

    setActivities(newActivities)
  }, [goals])

  const updateActivityDate = useCallback((activityId: string, newDate: Date) => {
    setActivities(prev => 
      prev.map(activity => 
        activity.id === activityId 
          ? { ...activity, date: newDate }
          : activity
      )
    )
  }, [])

  const toggleActivityComplete = useCallback((activityId: string) => {
    setActivities(prev => 
      prev.map(activity => 
        activity.id === activityId 
          ? { ...activity, completed: !activity.completed }
          : activity
      )
    )
  }, [])

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
    updateActivityDate,
    toggleActivityComplete,
    addActivity
  }
}
