'use server'

import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'
import type { ActionResponse } from '@/types/actions'

// Schema para validar los pesos del leaderboard
const LeaderboardWeightsSchema = z.object({
  goals_weight: z.number()
    .min(0, 'El peso de metas debe ser mayor o igual a 0')
    .max(1, 'El peso de metas debe ser menor o igual a 1')
    .multipleOf(0.01, 'El peso debe tener máximo 2 decimales'),
  activities_weight: z.number()
    .min(0, 'El peso de actividades debe ser mayor o igual a 0')
    .max(1, 'El peso de actividades debe ser menor o igual a 1')
    .multipleOf(0.01, 'El peso debe tener máximo 2 decimales'),
  calls_weight: z.number()
    .min(0, 'El peso de llamadas debe ser mayor o igual a 0')
    .max(1, 'El peso de llamadas debe ser menor o igual a 1')
    .multipleOf(0.01, 'El peso debe tener máximo 2 decimales')
}).refine(
  (data) => {
    const total = data.goals_weight + data.activities_weight + data.calls_weight
    return Math.abs(total - 1.0) < 0.01 // Permitir pequeñas diferencias por redondeo
  },
  {
    message: 'Los pesos deben sumar exactamente 1.0 (100%)',
    path: ['goals_weight']
  }
)

export interface LeaderboardWeightsConfig {
  goals_weight: number
  activities_weight: number
  calls_weight: number
  total_weight: number
  last_updated: string
  updated_by_name: string
}

// Obtener la configuración actual de pesos
export async function getLeaderboardWeightsConfig(): Promise<ActionResponse<LeaderboardWeightsConfig>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .rpc('get_leaderboard_weights_config')

    if (error) {
      console.error('Error getting leaderboard weights config:', error)
      return {
        success: false,
        error: 'Error al obtener la configuración de pesos del leaderboard'
      }
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'No se encontró configuración de pesos activa'
      }
    }

    return {
      success: true,
      data: data[0]
    }
  } catch (error) {
    console.error('Error in getLeaderboardWeightsConfig:', error)
    return {
      success: false,
      error: 'Error interno del servidor'
    }
  }
}

// Actualizar los pesos del leaderboard
export async function updateLeaderboardWeights(
  weights: z.infer<typeof LeaderboardWeightsSchema>
): Promise<ActionResponse<null>> {
  try {
    // Validar los datos de entrada
    const validationResult = LeaderboardWeightsSchema.safeParse(weights)
    
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0].message
      }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .rpc('update_leaderboard_weights', {
        p_goals_weight: validationResult.data.goals_weight,
        p_activities_weight: validationResult.data.activities_weight,
        p_calls_weight: validationResult.data.calls_weight
      })

    if (error) {
      console.error('Error updating leaderboard weights:', error)
      return {
        success: false,
        error: 'Error al actualizar los pesos del leaderboard'
      }
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'No se recibió respuesta del servidor'
      }
    }

    const result = data[0]
    
    if (!result.success) {
      return {
        success: false,
        error: result.message
      }
    }

    return {
      success: true,
      data: null
    }
  } catch (error) {
    console.error('Error in updateLeaderboardWeights:', error)
    return {
      success: false,
      error: 'Error interno del servidor'
    }
  }
}

// Verificar si el usuario actual es admin
export async function isUserAdmin(): Promise<ActionResponse<boolean>> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado'
      }
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error checking user role:', error)
      return {
        success: false,
        error: 'Error al verificar el rol del usuario'
      }
    }

    return {
      success: true,
      data: profile.role === 'admin'
    }
  } catch (error) {
    console.error('Error in isUserAdmin:', error)
    return {
      success: false,
      error: 'Error interno del servidor'
    }
  }
}
