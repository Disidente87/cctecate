'use client'

import React from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DraggableActivity } from './DraggableActivity'

interface CalendarDayProps {
  day: {
    date: Date
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
    isCurrentMonth: boolean
    isToday: boolean
  }
  onAddActivity?: (date: Date, goalId: string) => void
}

export function CalendarDay({ day, onAddActivity }: CalendarDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: day.date.toISOString(),
  })

  const handleAddActivity = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Por ahora, agregar a la primera meta disponible
    // En el futuro, esto podría abrir un modal para seleccionar la meta
    onAddActivity?.(day.date, 'default-goal-id')
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[120px] bg-white p-2 border-r border-b border-gray-200',
        'hover:bg-gray-50 transition-all duration-200',
        !day.isCurrentMonth && 'bg-gray-50 text-gray-400',
        day.isToday && 'bg-blue-50 border-blue-200',
        isOver && 'bg-blue-100 border-blue-300 ring-2 ring-blue-400 ring-opacity-50'
      )}
    >
      {/* Número del día */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            'text-sm font-medium',
            day.isToday && 'text-blue-600 font-bold',
            !day.isCurrentMonth && 'text-gray-400'
          )}
        >
          {day.date.getDate()}
        </span>
        
        {day.isCurrentMonth && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
            onClick={handleAddActivity}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Actividades del día */}
      <div className="space-y-1">
        <SortableContext
          items={day.activities.map(activity => activity.id)}
          strategy={verticalListSortingStrategy}
        >
          {day.activities.map(activity => (
            <DraggableActivity
              key={activity.id}
              activity={activity}
            />
          ))}
        </SortableContext>
      </div>

      {/* Indicador de más actividades si hay muchas */}
      {day.activities.length > 3 && (
        <div className="text-xs text-gray-500 mt-1">
          +{day.activities.length - 3} más
        </div>
      )}
    </div>
  )
}
