'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, CheckCircle, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DraggableActivityProps {
  activity: {
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
}

export function DraggableActivity({ activity }: DraggableActivityProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Aquí se implementaría la lógica para marcar como completada
    console.log('Toggle complete for activity:', activity.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center space-x-2 p-2 rounded-md text-xs cursor-grab',
        'hover:shadow-sm transition-all duration-200',
        'active:cursor-grabbing',
        activity.color,
        isDragging && 'opacity-30 shadow-2xl scale-105 rotate-2 z-50',
        activity.completed && 'opacity-60'
      )}
      {...attributes}
      {...listeners}
    >
      {/* Handle de arrastre */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
        <GripVertical className="h-3 w-3 text-gray-400 hover:text-gray-600" />
      </div>

      {/* Checkbox de completado */}
      <button
        onClick={handleToggleComplete}
        className="flex-shrink-0"
      >
        {activity.completed ? (
          <CheckCircle className="h-3 w-3 text-green-600" />
        ) : (
          <Circle className="h-3 w-3 text-gray-400 hover:text-green-600" />
        )}
      </button>

      {/* Contenido de la actividad */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">
          {activity.title}
        </div>
        <div className="text-xs opacity-75 truncate">
          {activity.goalCategory}
        </div>
      </div>

      {/* Indicador de frecuencia */}
      <div className="flex-shrink-0 text-xs opacity-60">
        {activity.frequency === 'daily' && 'D'}
        {activity.frequency === '2x_week' && '2x'}
        {activity.frequency === '3x_week' && '3x'}
        {activity.frequency === '4x_week' && '4x'}
        {activity.frequency === '5x_week' && '5x'}
        {activity.frequency === 'weekly' && 'S'}
        {activity.frequency === 'biweekly' && 'B'}
        {activity.frequency === 'monthly' && 'M'}
        {activity.frequency === 'yearly' && 'A'}
      </div>
    </div>
  )
}
