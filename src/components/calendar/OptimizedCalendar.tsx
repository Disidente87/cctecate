'use client'

import React from 'react'
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay, closestCenter, useDraggable, useDroppable } from '@dnd-kit/core'
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import { useOptimizedCalendar, useGoalProgress } from '@/hooks/useOptimizedCalendar'

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

// Función para generar colores únicos para cada meta
const getGoalColor = (goalId: string): string => {
  const colors = [
    'bg-blue-100 border-blue-300 text-blue-800',
    'bg-green-100 border-green-300 text-green-800',
    'bg-purple-100 border-purple-300 text-purple-800',
    'bg-orange-100 border-orange-300 text-orange-800',
    'bg-pink-100 border-pink-300 text-pink-800',
    'bg-indigo-100 border-indigo-300 text-indigo-800',
    'bg-yellow-100 border-yellow-300 text-yellow-800',
    'bg-red-100 border-red-300 text-red-800',
  ]
  
  // Generar un índice basado en el goalId
  let hash = 0
  for (let i = 0; i < goalId.length; i++) {
    hash = ((hash << 5) - hash + goalId.charCodeAt(i)) & 0xffffffff
  }
  return colors[Math.abs(hash) % colors.length]
}

interface CalendarActivityCardProps {
  activity: CalendarActivity
  isPending?: boolean
  onToggleCompletion: (activityId: string, date: Date) => void
}

interface DroppableDayCellProps {
  day: Date
  activities: CalendarActivity[]
  progressData: Record<string, MechanismProgress>
  pendingUpdates: Set<string>
  onToggleCompletion: (activityId: string, date: Date) => void
  overId: string | null
  activeId: string | null
}

const DroppableDayCell: React.FC<DroppableDayCellProps> = ({
  day,
  activities,
  progressData,
  pendingUpdates,
  onToggleCompletion,
  overId,
  activeId
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: format(day, 'yyyy-MM-dd'),
  })

  const dateKey = format(day, 'yyyy-MM-dd')
  const isOverThisDay = overId === dateKey && activeId

  return (
    <div
      ref={setNodeRef}
      className={`
        border rounded-lg p-2 min-h-[150px] space-y-2 transition-all duration-200
        ${isOverThisDay
          ? 'border-blue-400 bg-blue-50 shadow-lg scale-105'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }
        ${isOver && 'ring-2 ring-blue-400 ring-opacity-50'}
      `}
    >
      {activities
        .filter(activity => activity.id && activity.mechanismId)
        .map((activity) => (
          <DraggableActivityCard
            key={activity.id}
            activity={activity}
            isPending={pendingUpdates.has(activity.id)}
            onToggleCompletion={onToggleCompletion}
          />
        ))}
    </div>
  )
}


const DraggableActivityCard: React.FC<CalendarActivityCardProps> = ({
  activity,
  isPending,
  onToggleCompletion
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: activity.id })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  const goalColor = getGoalColor(activity.goalId)
  
  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`
        p-2 rounded-lg border transition-all duration-200 text-sm relative group
        ${activity.isCompleted 
          ? 'bg-green-50 border-green-300 text-green-800' 
          : goalColor
        }
        ${activity.isException ? 'border-l-4 border-l-blue-500' : ''}
        ${isPending ? 'opacity-50 animate-pulse' : ''}
        ${isDragging ? 'opacity-50 shadow-2xl scale-105 rotate-2 z-50' : 'hover:shadow-md hover:scale-105'}
      `}
    >
      {/* Área de insensibilidad para bloquear drag & drop */}
      <div
        className="absolute top-1.5 right-1.5 w-10 h-10 z-20"
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        {/* Botón de completar - solo el icono activa la función */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onToggleCompletion(activity.id, activity.date)
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
          }}
          className={`
            absolute top-1 right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200
            ${activity.isCompleted 
              ? 'bg-green-500 border-green-500 text-white' 
              : 'bg-white border-gray-300 text-gray-400 hover:border-green-400 hover:text-green-500'
            }
            ${isDragging ? 'hidden' : 'group-hover:opacity-100 opacity-70'}
          `}
          title={activity.isCompleted ? 'Marcar como no completada' : 'Marcar como completada'}
        >
          {activity.isCompleted ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Área draggable - excluyendo el botón */}
      <div
        className="cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >

        <div className="flex items-start justify-between pr-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${activity.isCompleted ? 'bg-green-500' : 'bg-current'}`}></div>
              <span className="text-xs font-medium opacity-75">{activity.goalDescription}</span>
            </div>
            <span className={`font-medium ${activity.isCompleted ? 'line-through' : ''}`}>
              {activity.mechanismDescription}
            </span>
          </div>
        </div>
        
        
        {/* Indicadores de estado */}
        <div className="mt-2 flex items-center justify-between text-xs">
          {activity.isException && (
            <span className="text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
              📅 Reprogramada
            </span>
          )}
          {activity.isCompleted && (
            <span className="text-green-600 bg-green-100 px-2 py-1 rounded-full font-medium">
              ✅ Completado
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

interface OptimizedCalendarProps {
  userId: string
  currentDate: Date
}

export const OptimizedCalendar: React.FC<OptimizedCalendarProps> = ({
  userId,
  currentDate
}) => {
  const weekStart = startOfWeek(currentDate, { locale: es })
  const weekEnd = endOfWeek(currentDate, { locale: es })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const {
    activitiesByDate,
    progressData,
    isLoading,
    pendingUpdates,
    moveActivity,
    toggleCompletion
  } = useOptimizedCalendar(userId, { start: weekStart, end: weekEnd })

  // Obtener IDs de metas únicas de las actividades
  const goalIds = React.useMemo(() => {
    const uniqueGoalIds = new Set<string>()
    Object.values(activitiesByDate).forEach(activities => {
      activities.forEach(activity => {
        uniqueGoalIds.add(activity.goalId)
      })
    })
    return Array.from(uniqueGoalIds)
  }, [activitiesByDate])

  // Calcular progreso de metas
  const { goalsProgress, isLoading: goalsLoading, refreshProgress } = useGoalProgress(userId, goalIds)

  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [draggedActivity, setDraggedActivity] = React.useState<CalendarActivity | null>(null)
  const [overId, setOverId] = React.useState<string | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    const activityId = event.active.id as string
    const activity = Object.values(activitiesByDate)
      .flat()
      .find(a => a.id === activityId)
    setDraggedActivity(activity || null)
    setActiveId(activityId)
    
    // Agregar clase al body para mejorar la experiencia de drag
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    setOverId(over?.id ? String(over.id) : null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    console.log('=== DRAG END EVENT ===')
    console.log('Active ID:', active.id)
    console.log('Over ID:', over?.id)
    console.log('Dragged Activity:', draggedActivity?.id)
    console.log('Over type:', over?.data?.current?.type)
    console.log('========================')
    
    // Restaurar cursor y selección de texto
    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    if (!over || !draggedActivity) {
      console.log('No over or draggedActivity, cleaning state')
      setDraggedActivity(null)
      setActiveId(null)
      setOverId(null)
      return
    }

    // Crear la fecha en zona horaria local para evitar problemas de UTC
    const dateString = over.id as string
    const [year, month, day] = dateString.split('-').map(Number)
    const newDate = new Date(year, month - 1, day) // month - 1 porque Date usa 0-indexado
    
    console.log('Date conversion:', {
      dateString,
      year,
      month: month - 1,
      day,
      newDate: newDate.toISOString(),
      newDateLocal: newDate.toLocaleDateString()
    })
    
    if (isNaN(newDate.getTime())) {
      setDraggedActivity(null)
      setActiveId(null)
      setOverId(null)
      return
    }

    // Siempre llamar a moveActivity, incluso si es el mismo día
    // La función moveActivity manejará la lógica de regreso al día original
    const originalDate = draggedActivity.originalDate

    // Actualizar la fecha de la actividad solo si es un día diferente
    console.log('Moving activity to different day:', {
      activityId: draggedActivity.id,
      newDate: newDate.toISOString(),
      originalDate: draggedActivity.originalDate?.toISOString()
    })
    moveActivity(draggedActivity.id, newDate, draggedActivity.originalDate)
    
    // Limpiar estado después de la actualización
    setDraggedActivity(null)
    setActiveId(null)
    setOverId(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Cargando calendario...</span>
      </div>
    )
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-white rounded-lg shadow p-4">
        {/* Header con días de la semana */}
        <div className="grid grid-cols-7 gap-4 mb-4">
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="text-center">
              <div className="font-medium text-gray-900 mb-1">
                {format(day, 'EEE', { locale: es })}
              </div>
              <div className="text-sm text-gray-600">
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        
        {/* Grid del calendario */}
        <div className="grid grid-cols-7 gap-4 min-h-[400px]">
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayActivities = activitiesByDate[dateKey] || []
            
            return (
              <DroppableDayCell
                key={dateKey}
                day={day}
                activities={dayActivities}
                progressData={progressData}
                pendingUpdates={pendingUpdates}
                onToggleCompletion={toggleCompletion}
                overId={overId}
                activeId={activeId}
              />
            )
          })}
        </div>
      </div>
      
      {/* Overlay para drag & drop estilo Notion */}
      <DragOverlay>
        {activeId && draggedActivity ? (
          <div className="transform rotate-3 scale-105 shadow-2xl opacity-90">
            <DraggableActivityCard
              activity={draggedActivity}
              onToggleCompletion={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
