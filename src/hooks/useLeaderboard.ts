'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface LeaderboardEntry {
  user_id: string
  name: string
  generation: string
  goals_completion_percentage: number
  activities_completion_percentage: number
  calls_score: number
  total_score: number
  rank_position: number
}

export interface LeaderboardStats {
  total_participants: number
  average_score: number
  leading_generation: string
  average_goals_completion: number
}

export const useLeaderboard = (userId: string) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [stats, setStats] = useState<LeaderboardStats | null>(null)
  const [availableGenerations, setAvailableGenerations] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Cargar datos del leaderboard
  const loadLeaderboardData = useCallback(async (generationFilter?: string) => {
    try {
      const { data, error } = await supabase.rpc('get_leaderboard_data', {
        p_user_id: userId,
        p_generation_filter: generationFilter || null
      })

      if (error) {
        console.error('Error loading leaderboard data:', error)
        return
      }

      setLeaderboardData(data || [])
    } catch (error) {
      console.error('Error loading leaderboard data:', error)
    }
  }, [userId])

  // Cargar estadísticas del leaderboard
  const loadStats = useCallback(async (generationFilter?: string) => {
    try {
      const { data, error } = await supabase.rpc('get_leaderboard_stats', {
        p_user_id: userId,
        p_generation_filter: generationFilter || null
      })

      if (error) {
        console.error('Error loading leaderboard stats:', error)
        return
      }

      if (data && data.length > 0) {
        setStats(data[0])
      }
    } catch (error) {
      console.error('Error loading leaderboard stats:', error)
    }
  }, [userId])

  // Cargar generaciones disponibles
  const loadAvailableGenerations = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_available_generations', {
        p_user_id: userId
      })

      if (error) {
        console.error('Error loading available generations:', error)
        return
      }

      setAvailableGenerations(data?.map((item: { generation: string }) => item.generation) || [])
    } catch (error) {
      console.error('Error loading available generations:', error)
    }
  }, [userId])

  // Cargar todos los datos
  const loadAllData = useCallback(async (generationFilter?: string) => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadLeaderboardData(generationFilter),
        loadStats(generationFilter),
        loadAvailableGenerations()
      ])
    } catch (error) {
      console.error('Error loading leaderboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [loadLeaderboardData, loadStats, loadAvailableGenerations])

  // Efectos
  useEffect(() => {
    if (userId) {
      loadAllData()
    }
  }, [userId, loadAllData])

  return {
    leaderboardData,
    stats,
    availableGenerations,
    isLoading,
    loadLeaderboardData,
    loadStats,
    loadAvailableGenerations,
    refreshData: loadAllData
  }
}
