'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Trophy, 
  Medal, 
  Award, 
  Target, 
  Star, 
  Phone,
  TrendingUp,
  Users,
  Crown,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useUser } from '@/hooks/useUser'

export default function LeaderboardPage() {
  const { user } = useUser()
  const {
    leaderboardData,
    stats,
    availableGenerations,
    isLoading,
    refreshData
  } = useLeaderboard(user?.id || '')

  const [selectedGeneration, setSelectedGeneration] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'total' | 'goals' | 'activities' | 'calls'>('total')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Generaciones disponibles incluyendo "Todas"
  const generations = ['all', ...availableGenerations]
  
  // Filtrar datos según generación seleccionada
  const filteredData = selectedGeneration === 'all' 
    ? leaderboardData 
    : leaderboardData.filter(entry => entry.generation === selectedGeneration)

  const sortedData = [...filteredData].sort((a, b) => {
    let aValue: number, bValue: number
    
    switch (sortBy) {
      case 'goals':
        aValue = a.goals_completion_percentage
        bValue = b.goals_completion_percentage
        break
      case 'activities':
        aValue = a.activities_completion_percentage
        bValue = b.activities_completion_percentage
        break
      case 'calls':
        aValue = a.calls_score
        bValue = b.calls_score
        break
      default:
        aValue = a.total_score
        bValue = b.total_score
    }
    
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue
  })

  // Recargar datos cuando cambie la generación seleccionada
  useEffect(() => {
    if (user?.id) {
      refreshData(selectedGeneration === 'all' ? undefined : selectedGeneration)
    }
  }, [selectedGeneration, user?.id, refreshData])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 " />
      case 2:
        return <Medal className="h-6 w-6 " />
      case 3:
        return <Award className="h-6 w-6 " />
      default:
        return <span className="text-lg font-bold ">#{rank}</span>
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200'
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
      case 3:
        return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200'
      default:
        return 'bg-white border-gray-200'
    }
  }

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('desc')
    }
  }

  const getSortIcon = (column: typeof sortBy) => {
    if (sortBy !== column) return null
    return sortOrder === 'desc' ? 
      <ChevronDown className="h-4 w-4" /> : 
      <ChevronUp className="h-4 w-4" />
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold ">Leaderboard</h1>
        <p className=" mt-2">
          Ranking de líderes por generación y rendimiento general
        </p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium ">Total Participantes</CardTitle>
              <Users className="h-4 w-4 " />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold ">{stats.total_participants}</div>
              <p className="text-xs ">
                En todas las generaciones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium ">Puntaje Promedio</CardTitle>
              <TrendingUp className="h-4 w-4 " />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold ">
                {Math.round(stats.average_score)}
              </div>
              <p className="text-xs ">
                Puntos totales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium ">Generación Líder</CardTitle>
              <Trophy className="h-4 w-4 " />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold ">{stats.leading_generation || 'N/A'}</div>
              <p className="text-xs ">
                Mejor rendimiento promedio
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium ">Meta Completada</CardTitle>
              <Target className="h-4 w-4 " />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold ">
                {Math.round(stats.average_goals_completion)}%
              </div>
              <p className="text-xs ">
                Promedio de metas
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-6">
        <div className="flex flex-wrap gap-2">
          {generations.map((gen) => (
            <Button
              key={gen}
              variant={selectedGeneration === gen ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedGeneration(gen)}
              className={selectedGeneration === gen ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}
            >
              {gen === 'all' ? 'Todas' : gen}
            </Button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm ">Ordenar por:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('total')}
            className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <span>Total</span>
            {getSortIcon('total')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('goals')}
            className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <span>Metas</span>
            {getSortIcon('goals')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('activities')}
            className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <span>Actividades</span>
            {getSortIcon('activities')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('calls')}
            className="flex items-center space-x-1"
          >
            <span>Llamadas</span>
            {getSortIcon('calls')}
          </Button>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-4">
        {sortedData.map((entry) => (
          <Card key={entry.user_id} className={`${getRankColor(entry.rank_position)} transition-all duration-200 hover:shadow-md`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-12 h-12">
                    {getRankIcon(entry.rank_position)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold ">
                        {entry.name}
                      </h3>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        {entry.generation}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 " />
                        <span className="">Metas: {entry.goals_completion_percentage.toFixed(1)}%</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 " />
                        <span className="">Actividades: {entry.activities_completion_percentage.toFixed(1)}%</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 " />
                        <span className="">Llamadas: {entry.calls_score.toFixed(1)}%</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Trophy className="h-4 w-4 " />
                        <span className="font-semibold ">Total: {entry.total_score.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold ">
                    {entry.total_score.toFixed(1)}
                  </div>
                  <div className="text-sm ">
                    puntos totales
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generation Breakdown */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold  mb-6">
          Rendimiento por Generación
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableGenerations.map((gen) => {
            const genData = leaderboardData.filter(entry => entry.generation === gen)
            const avgScore = genData.length > 0 
              ? genData.reduce((sum, entry) => sum + entry.total_score, 0) / genData.length 
              : 0
            
            return (
              <Card key={gen}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>Generación {gen}</span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      {genData.length} participantes
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm ">Puntaje Promedio:</span>
                      <span className="font-semibold">{avgScore.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm ">Mejor Participante:</span>
                      <span className="text-sm font-medium">
                        {genData.length > 0 ? genData[0].name : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm ">Metas Promedio:</span>
                      <span className="text-sm">
                        {genData.length > 0 
                          ? Math.round(genData.reduce((sum, entry) => sum + entry.goals_completion_percentage, 0) / genData.length)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Empty State */}
      {sortedData.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-12 w-12  mx-auto mb-4" />
            <h3 className="text-lg font-medium  mb-2">
              No hay datos disponibles
            </h3>
            <p className="">
              No se encontraron participantes para la generación seleccionada
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
