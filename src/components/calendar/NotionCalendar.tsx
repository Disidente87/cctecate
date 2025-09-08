'use client'

import React, { useState, useMemo } from 'react'
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, closestCenter } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Calendar, ChevronLeft, ChevronRight, Plus, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { DraggableActivity } from './DraggableActivity'
import { CalendarDay } from './CalendarDay'
import type { GoalWithMechanisms } from '@/types/database'

interface NotionCalendarProps {
  goals: GoalWithMechanisms[]
  activities: Array<{
    id: string
    title: string
    description: string
    goalId: string
    goalCategory: string
    frequency: string
    date: Date
    completed: boolean
    color: string
  }>
  onUpdateActivityDate?: (activityId: string, newDate: Date) => void
  onAddActivity?: (date: Date, goalId: string) => void
}

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

export function NotionCalendar({ goals, activities, onUpdateActivityDate, onAddActivity }: NotionCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [draggedActivity, setDraggedActivity] = useState<CalendarActivity | null>(null)

  // Generar días del mes actual
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const currentDay = new Date(startDate)
    
    for (let i = 0; i < 42; i++) { // 6 semanas x 7 días
      const dayActivities = activities.filter(activity => 
        activity.date.toDateString() === currentDay.toDateString()
      )
      
      days.push({
        date: new Date(currentDay),
        activities: dayActivities,
        isCurrentMonth: currentDay.getMonth() === month,
        isToday: currentDay.toDateString() === new Date().toDateString()
      })
      
      currentDay.setDate(currentDay.getDate() + 1)
    }
    
    return days
  }, [currentDate, activities])

  const handleDragStart = (event: DragStartEvent) => {
    const activityId = event.active.id as string
    const activity = activities.find(a => a.id === activityId)
    setDraggedActivity(activity || null)
    
    // Agregar clase al body para mejorar la experiencia de drag
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setDraggedActivity(null)
    
    // Restaurar cursor y selección de texto
    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    if (!over || !draggedActivity) return

    const newDate = new Date(over.id as string)
    if (isNaN(newDate.getTime())) return

    // Actualizar la fecha de la actividad
    onUpdateActivityDate?.(draggedActivity.id, newDate)
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Manejar el hover durante el drag
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  return (
    <div className="w-full">
      {/* Header del calendario */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Calendar className="h-6 w-6" />
          <h2 className="text-2xl font-bold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
          >
            Hoy
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Indicador de actividad arrastrada */}
      {draggedActivity && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 max-w-xs">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">
              Arrastrando: {draggedActivity.title}
            </span>
          </div>
        </div>
      )}

      {/* Grid del calendario */}
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
          {/* Días de la semana */}
          {dayNames.map(day => (
            <div key={day} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
          
          {/* Días del mes */}
          {calendarDays.map((day, index) => (
            <CalendarDay
              key={`${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`}
              day={day}
              onAddActivity={onAddActivity}
            />
          ))}
        </div>
      </DndContext>

      {/* Leyenda de colores */}
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="text-sm font-medium text-gray-700">Categorías:</div>
        {goals.map((goal, index) => {
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
          
          return (
            <Badge
              key={goal.id}
              variant="outline"
              className={colors[index % colors.length]}
            >
              {goal.category}
            </Badge>
          )
        })}
      </div>
    </div>
  )
}
