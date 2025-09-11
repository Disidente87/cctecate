'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle,
  Phone,
  Calendar
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface CallEvaluationModalProps {
  call: {
    id: string
    scheduled_date: string
    senior_name: string
    senior_email: string
  }
  isOpen: boolean
  onClose: () => void
  onEvaluate: (callId: string, evaluationStatus: 'on_time' | 'late' | 'rescheduled' | 'not_done', score?: number, notes?: string) => Promise<void>
}

const evaluationOptions = [
  {
    status: 'on_time' as const,
    label: 'A Tiempo',
    description: 'La llamada se realizó en el horario programado',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-200',
    score: 3.0
  },
  {
    status: 'late' as const,
    label: 'Fuera de Tiempo',
    description: 'La llamada se realizó pero fuera del horario programado',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    score: 2.0
  },
  {
    status: 'rescheduled' as const,
    label: 'Reprogramada',
    description: 'La llamada se reprogramó para otra fecha',
    icon: AlertCircle,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    score: 1.0
  },
  {
    status: 'not_done' as const,
    label: 'No Realizada',
    description: 'La llamada no se pudo realizar',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-200',
    score: 0.0
  }
]

export function CallEvaluationModal({ call, isOpen, onClose, onEvaluate }: CallEvaluationModalProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)

  if (!isOpen) return null

  const handleEvaluate = async () => {
    if (!selectedOption) return

    setIsEvaluating(true)
    try {
      const option = evaluationOptions.find(opt => opt.status === selectedOption)
      if (option) {
        await onEvaluate(call.id, option.status, option.score, notes || undefined)
        onClose()
        setSelectedOption(null)
        setNotes('')
      }
    } catch (error) {
      console.error('Error evaluating call:', error)
    } finally {
      setIsEvaluating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Phone className="h-5 w-5" />
            Evaluar Llamada
          </CardTitle>
          <CardDescription className="text-gray-600">
            Califica la llamada programada con {call.senior_name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Información de la llamada */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-gray-600" />
              <span className="font-medium">Fecha programada:</span>
              <span>{(() => {
                const date = new Date(call.scheduled_date)
                const localDate = format(date, 'dd MMMM yyyy', { locale: es })
                const localTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
                return `${localDate}, ${localTime}`
              })()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-600" />
              <span className="font-medium">Senior:</span>
              <span>{call.senior_name}</span>
            </div>
          </div>

          {/* Opciones de evaluación */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Selecciona el resultado de la llamada:</h3>
            {evaluationOptions.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.status}
                  onClick={() => setSelectedOption(option.status)}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedOption === option.status
                      ? `${option.color} border-current`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Puntuación: {option.score} puntos
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Notas adicionales */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas adicionales (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agrega comentarios sobre la llamada..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isEvaluating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEvaluate}
              disabled={!selectedOption || isEvaluating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isEvaluating ? 'Evaluando...' : 'Evaluar Llamada'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
