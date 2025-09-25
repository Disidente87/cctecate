'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Users, Calendar } from 'lucide-react'
interface AssignedSenior {
  id: string
  name: string
  email: string
}
import { supabase } from '@/lib/supabase'
import { useSelectedUser } from '@/contexts/selected-user'

interface CallScheduleFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (seniorId: string, mondayTime?: string, wednesdayTime?: string, fridayTime?: string) => Promise<void>
}

export function CallScheduleForm({ isOpen, onClose, onSubmit }: CallScheduleFormProps) {
  const { selectedUserId } = useSelectedUser()
  const [assignedSenior, setAssignedSenior] = useState<AssignedSenior | null>(null)
  const [selectedSenior, setSelectedSenior] = useState('')
  const [mondayTime, setMondayTime] = useState('')
  const [wednesdayTime, setWednesdayTime] = useState('')
  const [fridayTime, setFridayTime] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Cargar senior asignado al líder seleccionado
  useEffect(() => {
    const loadAssignedSenior = async () => {
      try {
        if (!selectedUserId) return
        const { data: leader } = await supabase
          .from('profiles')
          .select('senior_id')
          .eq('id', selectedUserId)
          .single()
        if (!leader?.senior_id) {
          setAssignedSenior(null)
          setSelectedSenior('')
          return
        }
        const { data: senior } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('id', leader.senior_id)
          .single()
        if (senior) {
          setAssignedSenior({ id: senior.id, name: senior.name, email: senior.email })
          setSelectedSenior(senior.id)
        } else {
          setAssignedSenior(null)
          setSelectedSenior('')
        }
      } catch (error) {
        console.error('Error loading assigned senior:', error)
        setAssignedSenior(null)
        setSelectedSenior('')
      }
    }
    if (isOpen) loadAssignedSenior()
  }, [isOpen, selectedUserId])

  // Validar que se hayan seleccionado horarios para los 3 días y exista senior asignado
  const isFormValid = Boolean(selectedSenior) && mondayTime && wednesdayTime && fridayTime

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isFormValid) return

    setIsLoading(true)
    try {
      // Enviar solo la hora sin zona horaria (el backend manejará la conversión)
      const convertTimeToUTC = (time: string) => {
        if (!time) return undefined
        
        // Validar formato de hora
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
        if (!timeRegex.test(time)) {
          console.error(`Invalid time format: ${time}`)
          return undefined
        }
        
        // Convertir la hora local a UTC
        const today = new Date()
        const [hours, minutes] = time.split(':')
        const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours), parseInt(minutes))
        
        // Convertir a UTC (RESTAR el offset)
        const utcDate = new Date(localDate.getTime() )
        
        // Formatear como HH:MM UTC
        const utcHours = String(utcDate.getUTCHours()).padStart(2, '0')
        const utcMinutes = String(utcDate.getUTCMinutes()).padStart(2, '0')
        
        const utcTime = `${utcHours}:${utcMinutes}`
        
        console.log(`Converting local time ${time} to UTC: ${utcTime}`)
        console.log(`Timezone offset: ${localDate.getTimezoneOffset()} minutes`)
        
        return utcTime
      }

      const mondayUTC = convertTimeToUTC(mondayTime)
      const wednesdayUTC = convertTimeToUTC(wednesdayTime)
      const fridayUTC = convertTimeToUTC(fridayTime)
      
      // Verificar que al menos una hora sea válida
      if (!mondayUTC && !wednesdayUTC && !fridayUTC) {
        throw new Error('Debe seleccionar al menos una hora válida')
      }
      
      await onSubmit(
        selectedSenior,
        mondayUTC,
        wednesdayUTC,
        fridayUTC
      )
      
      // Reset form
      setSelectedSenior('')
      setMondayTime('')
      setWednesdayTime('')
      setFridayTime('')
      onClose()
    } catch (error) {
      console.error('Error creating call schedule:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedSenior('')
    setMondayTime('')
    setWednesdayTime('')
    setFridayTime('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Calendar className="h-5 w-5" />
            Programar Llamadas Automáticas
          </CardTitle>
          <CardDescription className="text-gray-600">
            Configura tu horario de llamadas con tu Senior (Lunes, Miércoles y Viernes)
          </CardDescription>
          {!isFormValid && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm text-amber-800">
                ⚠️ Configura tus horarios para los 3 días (Lunes, Miércoles y Viernes)
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Senior Asignado */}
            <div>
              <label className="flex items-center gap-2 mb-2 block text-sm font-medium text-gray-700">
                <Users className="h-4 w-4" />
                Senior Asignado
              </label>
              {assignedSenior ? (
                <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-800">
                  {assignedSenior.name} ({assignedSenior.email})
                </div>
              ) : (
                <div className="px-3 py-2 border border-amber-200 rounded-md bg-amber-50 text-amber-800">
                  Pronto se mostrará tu Senior asignado
                </div>
              )}
            </div>

            {/* Horarios de llamadas */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horarios de Llamadas
              </h3>
              <p className="text-sm text-gray-600">
                Configura los horarios para cada día de llamada. Puedes dejar vacío si no quieres llamadas ese día.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Lunes */}
                <div>
                  <label htmlFor="monday-time" className="block text-sm font-medium text-gray-700">Lunes</label>
                  <input
                    id="monday-time"
                    type="time"
                    value={mondayTime}
                    onChange={(e) => setMondayTime(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Miércoles */}
                <div>
                  <label htmlFor="wednesday-time" className="block text-sm font-medium text-gray-700">Miércoles</label>
                  <input
                    id="wednesday-time"
                    type="time"
                    value={wednesdayTime}
                    onChange={(e) => setWednesdayTime(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Viernes */}
                <div>
                  <label htmlFor="friday-time" className="block text-sm font-medium text-gray-700">Viernes</label>
                  <input
                    id="friday-time"
                    type="time"
                    value={fridayTime}
                    onChange={(e) => setFridayTime(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Información Importante</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Las llamadas se programarán automáticamente desde 2 días después de PL1 hasta 5 días antes de PL3</li>
                <li>• Solo se crearán llamadas para los días con horario configurado</li>
                <li>• Puedes modificar o cancelar llamadas individuales después de crearlas</li>
                <li>• Cada llamada se puede evaluar como: A Tiempo, Fuera de Tiempo, Reprogramada o No Realizada</li>
              </ul>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creando...' : 'Crear Programación'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

