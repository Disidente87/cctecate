import { supabase } from '@/lib/supabase'

export interface Generation {
  id: string
  name: string
  description: string | null
  registration_start_date: string
  registration_end_date: string
  generation_start_date: string
  generation_graduation_date: string
  basic_training_date: string
  advanced_training_date: string
  pl1_training_date: string | null
  pl2_training_date: string | null
  pl3_training_date: string | null
  is_active: boolean
}

export async function getActiveGeneration(): Promise<Generation | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_active_generation')
      .single()

    if (error) {
      console.error('Error fetching active generation:', error)
      return null
    }

    return data as Generation
  } catch (error) {
    console.error('Error in getActiveGeneration:', error)
    return null
  }
}

export async function getAllGenerations(): Promise<Generation[]> {
  try {
    const { data, error } = await supabase
      .from('generations')
      .select('*')
      .order('registration_start_date', { ascending: false })

    if (error) {
      console.error('Error fetching generations:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getAllGenerations:', error)
    return []
  }
}

export async function createGeneration(generation: Omit<Generation, 'id'>): Promise<Generation | null> {
  try {
    const { data, error } = await supabase
      .from('generations')
      .insert(generation)
      .select()
      .single()

    if (error) {
      console.error('Error creating generation:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in createGeneration:', error)
    return null
  }
}

export async function updateGeneration(id: string, updates: Partial<Generation>): Promise<Generation | null> {
  try {
    const { data, error } = await supabase
      .from('generations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating generation:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in updateGeneration:', error)
    return null
  }
}
