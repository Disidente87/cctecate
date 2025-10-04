'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Plus, 
  X, 
  Save,
  Loader2,
  FileText,
  Heart,
  Zap
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSelectedUser } from '@/contexts/selected-user'
import { toast } from 'sonner'

// Función para formatear el número de teléfono
function formatPhoneNumber(phone: string | null): string {
  if (!phone) return ''
  
  // Remover todos los caracteres no numéricos
  const cleaned = phone.replace(/\D/g, '')
  
  // Si tiene 10 dígitos, formatear como (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  
  // Si tiene 12 dígitos (con código de país), formatear como +XX (XXX) XXX-XXXX
  if (cleaned.length === 12) {
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`
  }
  
  // Si no coincide con los formatos esperados, devolver tal como está
  return phone
}

// Función para calcular la edad
function calculateAge(birthDate: string | null): string {
  if (!birthDate) return 'No especificada'
  
  const today = new Date()
  const birth = new Date(birthDate)
  
  if (isNaN(birth.getTime())) return 'Fecha inválida'
  
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return `${age} años`
}

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  generation: string
  phone?: string
  birth_date?: string
  personal_contract?: string
  bio?: string
  location?: string
  linkedin_url?: string
  website_url?: string
  energy_givers: string[]
  energy_drainers: string[]
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { authUserId, selectedUserId } = useSelectedUser()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    birth_date: '',
    personal_contract: '',
    bio: '',
    location: '',
    energy_givers: [] as string[],
    energy_drainers: [] as string[]
  })
  
  // Input states for energy items
  const [newEnergyGiver, setNewEnergyGiver] = useState('')
  const [newEnergyDrainer, setNewEnergyDrainer] = useState('')

  const loadProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', selectedUserId)
        .single()

      if (error) throw error

      setProfile(data)
      setFormData({
        name: data.name || '',
        phone: data.phone || '',
        birth_date: data.birth_date || '',
        personal_contract: data.personal_contract || '',
        bio: data.bio || '',
        location: data.location || '',
        energy_givers: data.energy_givers || [],
        energy_drainers: data.energy_drainers || []
      })
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Error al cargar el perfil')
    } finally {
      setLoading(false)
    }
  }, [selectedUserId])

  useEffect(() => {
    if (!authUserId) {
      router.push('/auth/login')
      return
    }
    loadProfile()
  }, [authUserId, selectedUserId, router, loadProfile])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          phone: formData.phone || null,
          birth_date: formData.birth_date || null,
          personal_contract: formData.personal_contract || null,
          bio: formData.bio || null,
          location: formData.location || null,
          energy_givers: formData.energy_givers,
          energy_drainers: formData.energy_drainers,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUserId)

      if (error) throw error

      toast.success('Perfil actualizado exitosamente')
      setEditing(false)
      loadProfile()
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Error al guardar el perfil')
    } finally {
      setSaving(false)
    }
  }

  const addEnergyGiver = () => {
    if (newEnergyGiver.trim() && formData.energy_givers.length < 10) {
      setFormData(prev => ({
        ...prev,
        energy_givers: [...prev.energy_givers, newEnergyGiver.trim()]
      }))
      setNewEnergyGiver('')
    }
  }

  const removeEnergyGiver = (index: number) => {
    setFormData(prev => ({
      ...prev,
      energy_givers: prev.energy_givers.filter((_, i) => i !== index)
    }))
  }

  const addEnergyDrainer = () => {
    if (newEnergyDrainer.trim() && formData.energy_drainers.length < 10) {
      setFormData(prev => ({
        ...prev,
        energy_drainers: [...prev.energy_drainers, newEnergyDrainer.trim()]
      }))
      setNewEnergyDrainer('')
    }
  }

  const removeEnergyDrainer = (index: number) => {
    setFormData(prev => ({
      ...prev,
      energy_drainers: prev.energy_drainers.filter((_, i) => i !== index)
    }))
  }

  const validatePersonalContract = (text: string) => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0)
    return words.length <= 20
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Cargando perfil...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">Error al cargar el perfil</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-gray-600 mt-2">
          Gestiona tu información personal y preferencias
        </p>
      </div>

      {/* Información Personal */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
            <CardDescription>
              {editing ? 'Actualiza tu información básica y de contacto' : 'Tu información personal'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {editing ? (
              // Modo edición - mostrar campos de entrada
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre completo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Tu nombre completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+52 123 456 7890"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="birth_date">Fecha de nacimiento</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Ubicación</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Ciudad, País"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio">Biografía</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Cuéntanos un poco sobre ti..."
                    rows={3}
                  />
                </div>
              </>
            ) : (
              // Modo visualización - mostrar información como texto
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Nombre completo</Label>
                    <p className="text-sm">{profile.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Email</Label>
                    <p className="text-sm">{profile.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Teléfono</Label>
                    <p className="text-sm">{formatPhoneNumber(profile.phone || null) || 'No especificado'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Fecha de nacimiento</Label>
                    <p className="text-sm">{profile.birth_date ? new Date(profile.birth_date).toLocaleDateString('es-ES') : 'No especificada'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Edad</Label>
                    <p className="text-sm">{calculateAge(profile.birth_date || null)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Ubicación</Label>
                    <p className="text-sm">{profile.location || 'No especificada'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Rol</Label>
                    <p className="text-sm">{profile.role}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Generación</Label>
                    <p className="text-sm">{profile.generation}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Miembro desde</Label>
                    <p className="text-sm">
                      {new Date(profile.created_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
                {profile.bio && (
                  <div className="pt-4 border-t border-gray-200">
                    <Label className="text-sm font-medium text-gray-500">Biografía</Label>
                    <p className="text-sm">{profile.bio}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contrato Personal */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Mi Contrato
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea
                value={formData.personal_contract}
                onChange={(e) => setFormData(prev => ({ ...prev, personal_contract: e.target.value }))}
                placeholder="Escribe tu contrato personal aquí..."
                rows={3}
                className={!validatePersonalContract(formData.personal_contract) ? 'border-red-500' : ''}
              />
            ) : (
              <p className="text-sm">
                {profile.personal_contract || 'No has definido tu contrato personal'}
              </p>
            )}
            {editing && !validatePersonalContract(formData.personal_contract) && (
              <p className="text-red-500 text-sm mt-1">
                El contrato no puede tener más de 20 palabras
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Energy Management */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cosas que dan energía */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-green-600" />
              Cosas que me dan energía
            </CardTitle>
            <CardDescription>
              Lista las actividades, personas o situaciones que te energizan (máximo 10)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {editing && (
                <div className="flex gap-2">
                  <Input
                    value={newEnergyGiver}
                    onChange={(e) => setNewEnergyGiver(e.target.value)}
                    placeholder="Agregar algo que te da energía..."
                    onKeyPress={(e) => e.key === 'Enter' && addEnergyGiver()}
                  />
                  <Button 
                    onClick={addEnergyGiver}
                    disabled={!newEnergyGiver.trim() || formData.energy_givers.length >= 10}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div className="space-y-2">
                {formData.energy_givers.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-md">
                    <span className="text-sm">{item}</span>
                    {editing && (
                      <button
                        onClick={() => removeEnergyGiver(index)}
                        className="hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {formData.energy_givers.length === 0 && (
                <p className="text-gray-500 text-sm">No has agregado nada aún</p>
              )}
              
              <p className="text-xs text-gray-500">
                {formData.energy_givers.length}/10 elementos
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cosas que quitan energía */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-red-600" />
              Cosas que me quitan energía
            </CardTitle>
            <CardDescription>
              Lista las actividades, personas o situaciones que te agotan (máximo 10)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {editing && (
                <div className="flex gap-2">
                  <Input
                    value={newEnergyDrainer}
                    onChange={(e) => setNewEnergyDrainer(e.target.value)}
                    placeholder="Agregar algo que te quita energía..."
                    onKeyPress={(e) => e.key === 'Enter' && addEnergyDrainer()}
                  />
                  <Button 
                    onClick={addEnergyDrainer}
                    disabled={!newEnergyDrainer.trim() || formData.energy_drainers.length >= 10}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div className="space-y-2">
                {formData.energy_drainers.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded-md">
                    <span className="text-sm">{item}</span>
                    {editing && (
                      <button
                        onClick={() => removeEnergyDrainer(index)}
                        className="hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {formData.energy_drainers.length === 0 && (
                <p className="text-gray-500 text-sm">No has agregado nada aún</p>
              )}
              
              <p className="text-xs text-gray-500">
                {formData.energy_drainers.length}/10 elementos
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-end gap-4">
        {editing ? (
          <>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(false)
                loadProfile() // Reset form data
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name.trim() || !validatePersonalContract(formData.personal_contract)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </>
        ) : (
          <Button onClick={() => setEditing(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            Editar Perfil
          </Button>
        )}
      </div>
    </div>
  )
}
