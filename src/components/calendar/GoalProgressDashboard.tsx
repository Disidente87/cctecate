'use client'

import React from 'react'
import { useGoalProgress } from '@/hooks/useOptimizedCalendar'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

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

interface GoalProgressCardProps {
  goal: GoalProgress
}

const GoalProgressCard: React.FC<GoalProgressCardProps> = ({ goal }) => {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 60) return 'bg-yellow-500'
    if (percentage >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getPredictionText = (days: number | null) => {
    if (!days) return 'Sin estimación'
    if (days <= 7) return `${days} días`
    if (days <= 30) return `${Math.ceil(days / 7)} semanas`
    return `${Math.ceil(days / 30)} meses`
  }

  const getStatusText = (percentage: number) => {
    if (percentage >= 70) return 'En buen camino'
    if (percentage >= 40) return 'Progreso moderado'
    return 'Necesita atención'
  }

  const getStatusColor = (percentage: number) => {
    if (percentage >= 70) return 'bg-green-500'
    if (percentage >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1 mr-4">
          {goal.goalDescription}
        </h3>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-blue-600">
            {Math.round(goal.avgProgress)}%
          </div>
          <div className="text-sm text-gray-500">completado</div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
        <div 
          className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(goal.avgProgress)}`}
          style={{ width: `${Math.min(100, goal.avgProgress)}%` }}
        />
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">
            {goal.mechanismsOnTrack}/{goal.totalMechanisms}
          </div>
          <div className="text-sm text-gray-600">En seguimiento</div>
        </div>
        
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">
            {goal.activeMechanisms}
          </div>
          <div className="text-sm text-gray-600">Activos</div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="space-y-2 text-sm">
        {goal.lastActivityDate && (
          <div className="flex justify-between">
            <span className="text-gray-600">Última actividad:</span>
            <span className="font-medium">
              {format(goal.lastActivityDate, 'dd MMM yyyy', { locale: es })}
            </span>
          </div>
        )}
        
        {goal.goalCompletionPredictionDays && (
          <div className="flex justify-between">
            <span className="text-gray-600">Estimación:</span>
            <span className="font-medium text-blue-600">
              {getPredictionText(goal.goalCompletionPredictionDays)}
            </span>
          </div>
        )}
      </div>

      {/* Indicador de estado */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div 
            className={`w-3 h-3 rounded-full ${getStatusColor(goal.avgProgress)}`}
          />
          <span className="text-sm text-gray-600">
            {getStatusText(goal.avgProgress)}
          </span>
        </div>
      </div>
    </div>
  )
}

interface GoalProgressDashboardProps {
  userId: string
  goalIds?: string[]
}

export const GoalProgressDashboard: React.FC<GoalProgressDashboardProps> = ({
  userId,
  goalIds
}) => {
  const { goalsProgress, isLoading } = useGoalProgress(userId, goalIds)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-4"></div>
            <div className="h-3 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {goals.map((goal) => (
        <GoalProgressCard key={goal.goalId} goal={goal} />
      ))}
    </div>
  )
}
