import { supabase } from '@/lib/supabase'
import type { Goal, GoalInsert, GoalUpdate, Mechanism, MechanismInsert, GoalWithMechanisms } from '@/types/database'

// Obtener todas las metas de un usuario con sus mecanismos (usando participación activa)
export async function getUserGoals(userId: string, participationId?: string): Promise<GoalWithMechanisms[]> {
  try {
    let query = supabase
      .from('goals')
      .select(`
        *,
        mechanisms (*)
      `)
      .eq('user_id', userId)

    // Si se proporciona participationId, filtrar por participación
    if (participationId) {
      query = query.eq('user_participation_id', participationId)
    } else {
      // Si no se proporciona, usar la participación activa del usuario
      const { data: activeParticipation } = await supabase
        .rpc('get_user_active_participation', { p_user_id: userId })
      
      if (activeParticipation?.[0]?.participation_id) {
        query = query.eq('user_participation_id', activeParticipation[0].participation_id)
      } else {
        // Fallback: usar metas sin user_participation_id (datos antiguos)
        query = query.is('user_participation_id', null)
      }
    }

    const { data: goals, error: goalsError } = await query
      .order('created_at', { ascending: false })

    if (goalsError) {
      console.error('Error fetching user goals:', goalsError)
      return []
    }

    return goals as GoalWithMechanisms[]
  } catch (error) {
    console.error('Error in getUserGoals:', error)
    return []
  }
}

// Crear una nueva meta con sus mecanismos (usando participación activa)
export async function createGoalWithMechanisms(
  goal: Omit<GoalInsert, 'id' | 'created_at' | 'updated_at'>,
  mechanisms: Omit<MechanismInsert, 'id' | 'goal_id' | 'created_at' | 'updated_at'>[],
  participationId?: string
): Promise<GoalWithMechanisms | null> {
  try {
    // Obtener la participación activa si no se proporciona
    let activeParticipationId = participationId
    if (!activeParticipationId) {
      const { data: activeParticipation } = await supabase
        .rpc('get_user_active_participation', { p_user_id: goal.user_id })
      
      activeParticipationId = activeParticipation?.[0]?.participation_id
    }

    // Crear la meta con la participación
    const goalWithParticipation = {
      ...goal,
      user_participation_id: activeParticipationId
    }

    const { data: newGoal, error: goalError } = await supabase
      .from('goals')
      .insert(goalWithParticipation)
      .select()
      .single()

    if (goalError || !newGoal) {
      console.error('Error creating goal:', goalError)
      return null
    }

    // Crear los mecanismos con la participación
    const mechanismsWithGoalId = mechanisms.map(mechanism => ({
      ...mechanism,
      goal_id: newGoal.id,
      user_participation_id: activeParticipationId
    }))

    const { data: newMechanisms, error: mechanismsError } = await supabase
      .from('mechanisms')
      .insert(mechanismsWithGoalId)
      .select()

    if (mechanismsError) {
      console.error('Error creating mechanisms:', mechanismsError)
      // Intentar eliminar la meta creada si fallan los mecanismos
      await supabase.from('goals').delete().eq('id', newGoal.id)
      return null
    }

    return {
      ...newGoal,
      mechanisms: newMechanisms || []
    }
  } catch (error) {
    console.error('Error in createGoalWithMechanisms:', error)
    return null
  }
}

// Actualizar una meta
export async function updateGoal(goalId: string, updates: GoalUpdate): Promise<Goal | null> {
  try {
    const { data, error } = await supabase
      .from('goals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', goalId)
      .select()
      .single()

    if (error) {
      console.error('Error updating goal:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in updateGoal:', error)
    return null
  }
}

// Marcar meta como completada por un Senior
export async function completeGoalBySenior(
  goalId: string, 
  seniorId: string, 
  progressPercentage: number = 100
): Promise<Goal | null> {
  try {
    const { data, error } = await supabase
      .from('goals')
      .update({
        completed: true,
        completed_by_supervisor_id: seniorId,
        progress_percentage: progressPercentage,
        updated_at: new Date().toISOString()
      })
      .eq('id', goalId)
      .select()
      .single()

    if (error) {
      console.error('Error completing goal:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in completeGoalBySenior:', error)
    return null
  }
}

// Actualizar porcentaje de avance de una meta
export async function updateGoalProgress(
  goalId: string, 
  progressPercentage: number
): Promise<Goal | null> {
  try {
    const { data, error } = await supabase
      .from('goals')
      .update({
        progress_percentage: Math.max(0, Math.min(100, progressPercentage)),
        updated_at: new Date().toISOString()
      })
      .eq('id', goalId)
      .select()
      .single()

    if (error) {
      console.error('Error updating goal progress:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in updateGoalProgress:', error)
    return null
  }
}

// Eliminar una meta (esto también eliminará sus mecanismos por CASCADE)
export async function deleteGoal(goalId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)

    if (error) {
      console.error('Error deleting goal:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteGoal:', error)
    return false
  }
}

// Obtener mecanismos de una meta específica
export async function getGoalMechanisms(goalId: string): Promise<Mechanism[]> {
  try {
    const { data, error } = await supabase
      .from('mechanisms')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching goal mechanisms:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getGoalMechanisms:', error)
    return []
  }
}

// Agregar un mecanismo a una meta existente
export async function addMechanismToGoal(
  goalId: string,
  mechanism: Omit<MechanismInsert, 'id' | 'goal_id' | 'created_at' | 'updated_at'>
): Promise<Mechanism | null> {
  try {
    const { data, error } = await supabase
      .from('mechanisms')
      .insert({
        ...mechanism,
        goal_id: goalId
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding mechanism to goal:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in addMechanismToGoal:', error)
    return null
  }
}

// Eliminar un mecanismo
export async function deleteMechanism(mechanismId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('mechanisms')
      .delete()
      .eq('id', mechanismId)

    if (error) {
      console.error('Error deleting mechanism:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteMechanism:', error)
    return false
  }
}
