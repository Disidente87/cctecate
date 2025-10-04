'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ActionResponse } from '@/types/actions'

// Schema de validación para el perfil
const profileUpdateSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es demasiado largo'),
  phone: z.string().optional().or(z.literal('')),
  birth_date: z.string().optional().or(z.literal('')),
  personal_contract: z.string().optional().or(z.literal('')),
  bio: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  linkedin_url: z.string().url('URL de LinkedIn inválida').optional().or(z.literal('')),
  website_url: z.string().url('URL del sitio web inválida').optional().or(z.literal('')),
  energy_givers: z.array(z.string().min(1, 'Elemento vacío')).max(10, 'Máximo 10 elementos'),
  energy_drainers: z.array(z.string().min(1, 'Elemento vacío')).max(10, 'Máximo 10 elementos')
})

// Función para validar el contrato personal (máximo 20 palabras)
function validatePersonalContract(contract: string): boolean {
  if (!contract || contract.trim() === '') return true
  const words = contract.trim().split(/\s+/).filter(word => word.length > 0)
  return words.length <= 20
}

// Función para validar URLs
function isValidUrl(url: string): boolean {
  if (!url || url.trim() === '') return true
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export async function updateUserProfile(
  formData: FormData
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient()
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return {
        success: false,
        error: 'No autorizado'
      }
    }

    // Extraer datos del formulario
    const rawData = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      birth_date: formData.get('birth_date') as string,
      personal_contract: formData.get('personal_contract') as string,
      bio: formData.get('bio') as string,
      location: formData.get('location') as string,
      linkedin_url: formData.get('linkedin_url') as string,
      website_url: formData.get('website_url') as string,
      energy_givers: JSON.parse(formData.get('energy_givers') as string || '[]'),
      energy_drainers: JSON.parse(formData.get('energy_drainers') as string || '[]')
    }

    // Validaciones personalizadas
    if (!validatePersonalContract(rawData.personal_contract)) {
      return {
        success: false,
        error: 'El contrato personal no puede tener más de 20 palabras'
      }
    }

    if (!isValidUrl(rawData.linkedin_url)) {
      return {
        success: false,
        error: 'URL de LinkedIn inválida'
      }
    }

    if (!isValidUrl(rawData.website_url)) {
      return {
        success: false,
        error: 'URL del sitio web inválida'
      }
    }

    // Validar con Zod
    const validatedData = profileUpdateSchema.parse(rawData)

    // Preparar datos para actualización (convertir strings vacíos a null)
    const updateData = {
      name: validatedData.name,
      phone: validatedData.phone || null,
      birth_date: validatedData.birth_date || null,
      personal_contract: validatedData.personal_contract || null,
      bio: validatedData.bio || null,
      location: validatedData.location || null,
      linkedin_url: validatedData.linkedin_url || null,
      website_url: validatedData.website_url || null,
      energy_givers: validatedData.energy_givers,
      energy_drainers: validatedData.energy_drainers,
      updated_at: new Date().toISOString()
    }

    // Actualizar perfil en la base de datos
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return {
        success: false,
        error: 'Error al actualizar el perfil'
      }
    }

    // Revalidar la página del perfil
    revalidatePath('/portal/perfil')

    return {
      success: true,
      data: null
    }

  } catch (error) {
    console.error('Error in updateUserProfile:', error)
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Datos inválidos'
      }
    }

    return {
      success: false,
      error: 'Error interno del servidor'
    }
  }
}

export async function getUserProfile(): Promise<ActionResponse<Record<string, unknown>>> {
  try {
    const supabase = await createClient()
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return {
        success: false,
        error: 'No autorizado'
      }
    }

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return {
        success: false,
        error: 'Error al obtener el perfil'
      }
    }

    return {
      success: true,
      data: profile
    }

  } catch (error) {
    console.error('Error in getUserProfile:', error)
    return {
      success: false,
      error: 'Error interno del servidor'
    }
  }
}

export async function addEnergyItem(
  type: 'givers' | 'drainers',
  item: string
): Promise<ActionResponse<string[]>> {
  try {
    const supabase = await createClient()
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return {
        success: false,
        error: 'No autorizado'
      }
    }

    if (!item || item.trim() === '') {
      return {
        success: false,
        error: 'El elemento no puede estar vacío'
      }
    }

    // Obtener el array actual
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select(type === 'givers' ? 'energy_givers' : 'energy_drainers')
      .eq('id', user.id)
      .single()

    if (fetchError) {
      return {
        success: false,
        error: 'Error al obtener el perfil'
      }
    }

    const currentArray = (profile as Record<string, string[]>)[type === 'givers' ? 'energy_givers' : 'energy_drainers'] || []
    
    if (currentArray.length >= 10) {
      return {
        success: false,
        error: 'Máximo 10 elementos permitidos'
      }
    }

    if (currentArray.includes(item.trim())) {
      return {
        success: false,
        error: 'Este elemento ya existe'
      }
    }

    // Agregar el nuevo elemento
    const newArray = [...currentArray, item.trim()]

    // Actualizar en la base de datos
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        [type === 'givers' ? 'energy_givers' : 'energy_drainers']: newArray,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      return {
        success: false,
        error: 'Error al actualizar el perfil'
      }
    }

    revalidatePath('/portal/perfil')

    return {
      success: true,
      data: newArray
    }

  } catch (error) {
    console.error('Error in addEnergyItem:', error)
    return {
      success: false,
      error: 'Error interno del servidor'
    }
  }
}

export async function removeEnergyItem(
  type: 'givers' | 'drainers',
  index: number
): Promise<ActionResponse<string[]>> {
  try {
    const supabase = await createClient()
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return {
        success: false,
        error: 'No autorizado'
      }
    }

    // Obtener el array actual
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select(type === 'givers' ? 'energy_givers' : 'energy_drainers')
      .eq('id', user.id)
      .single()

    if (fetchError) {
      return {
        success: false,
        error: 'Error al obtener el perfil'
      }
    }

    const currentArray = (profile as Record<string, string[]>)[type === 'givers' ? 'energy_givers' : 'energy_drainers'] || []
    
    if (index < 0 || index >= currentArray.length) {
      return {
        success: false,
        error: 'Índice inválido'
      }
    }

    // Remover el elemento
    const newArray = currentArray.filter((_, i) => i !== index)

    // Actualizar en la base de datos
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        [type === 'givers' ? 'energy_givers' : 'energy_drainers']: newArray,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      return {
        success: false,
        error: 'Error al actualizar el perfil'
      }
    }

    revalidatePath('/portal/perfil')

    return {
      success: true,
      data: newArray
    }

  } catch (error) {
    console.error('Error in removeEnergyItem:', error)
    return {
      success: false,
      error: 'Error interno del servidor'
    }
  }
}
