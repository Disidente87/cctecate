'use client'

import React from 'react'
import { useGoalProgress } from '@/hooks/useOptimizedCalendar'

interface GoalProgress {
  goalId: string
  goalDescription: string
  totalMechanisms: number
  activeMechanisms: number
  avgProgress: number
  progressUntilToday: number
  mechanismsOnTrack: number
  goalCompletionPredictionDays: number | null
  lastActivityDate: Date | null
}

interface GoalProgressCardProps {
  goal: GoalProgress
}

// Función para generar colores únicos para cada meta (igual que en el calendario)
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

const GoalProgressCard: React.FC<GoalProgressCardProps> = ({ goal }) => {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 70) return 'bg-green-500'
    if (percentage >= 50) return 'bg-yellow-500'
    if (percentage >= 30) return 'bg-orange-500'
    return 'bg-red-500'
  }


  const getStatusText = (progressUntilToday: number) => {
    if (progressUntilToday >= 70) return 'En buen camino'
    if (progressUntilToday >= 50) return 'Progreso moderado'
    return 'Necesita atención'
  }

  const getStatusColor = (progressUntilToday: number) => {
    if (progressUntilToday >= 70) return 'bg-green-500'
    if (progressUntilToday >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const goalColor = getGoalColor(goal.goalId)
  
  return (
    <div className={`${goalColor} rounded-lg shadow p-3 hover:shadow-md transition-shadow`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold line-clamp-2 flex-1 mr-2">
          {goal.goalDescription}
        </h3>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold">
            {Math.round(goal.avgProgress)}%
          </div>
          <div className="text-xs opacity-75">completado</div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(goal.avgProgress)}`}
          style={{ width: `${Math.min(100, goal.avgProgress)}%` }}
        />
      </div>


      {/* Indicador de estado */}
      <div className="mt-2 pt-2 border-t border-current border-opacity-20">
        <div className="flex items-center space-x-1">
          <div 
            className={`w-2 h-2 rounded-full ${getStatusColor(goal.progressUntilToday)}`}
          />
          <span className="text-xs opacity-75">
            {getStatusText(goal.progressUntilToday)}
          </span>
        </div>
      </div>
    </div>
  )
}

interface GoalProgressDashboardProps {
  userId: string
  goalIds?: string[]
  onRefresh?: (refreshFn: () => void) => void
}

export const GoalProgressDashboard: React.FC<GoalProgressDashboardProps> = ({
  userId,
  goalIds,
  onRefresh
}) => {
  const { goalsProgress, isLoading, refreshProgress, updateSingleGoalProgress } = useGoalProgress(userId, goalIds)
  
  // Exponer la función de refresh al componente padre
  React.useEffect(() => {
    if (onRefresh) {
      onRefresh(refreshProgress)
    }
  }, [onRefresh, refreshProgress])

  // Escuchar eventos de completado de mecanismos para actualizar el progreso
  React.useEffect(() => {
    const handleMechanismCompleted = (event: CustomEvent) => {
      const { goalId } = event.detail
      console.log('Mechanism completed, updating specific goal:', goalId)
      
      if (goalId) {
        // Actualizar solo la meta específica
        updateSingleGoalProgress(goalId)
      } else {
        // Fallback: actualizar todo si no se especifica la meta
        console.log('No goalId provided, refreshing all goals progress')
        refreshProgress()
      }
    }

    window.addEventListener('mechanismCompleted', handleMechanismCompleted as EventListener)
    
    return () => {
      window.removeEventListener('mechanismCompleted', handleMechanismCompleted as EventListener)
    }
  }, [refreshProgress, updateSingleGoalProgress])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-gray-100 rounded-lg shadow p-3 animate-pulse">
            <div className="h-3 bg-gray-200 rounded mb-3"></div>
            <div className="h-2 bg-gray-200 rounded mb-3"></div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-1">
              <div className="h-2 bg-gray-200 rounded"></div>
              <div className="h-2 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const goals = Object.values(goalsProgress)

  if (goals.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-2">No hay metas configuradas</div>
        <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
          Crear primera meta
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {goals.map((goal) => (
        <GoalProgressCard key={goal.goalId} goal={goal} />
      ))}
    </div>
  )
}
