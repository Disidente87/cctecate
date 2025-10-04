'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, Save, RotateCcw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { 
  getLeaderboardWeightsConfig, 
  updateLeaderboardWeights,
  type LeaderboardWeightsConfig 
} from '@/lib/actions/leaderboard-actions'

interface LeaderboardWeightsConfigProps {
  onWeightsUpdated?: () => void
  onClose?: () => void
  isAdmin: boolean
}

export default function LeaderboardWeightsConfig({ onWeightsUpdated, onClose, isAdmin }: LeaderboardWeightsConfigProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [originalWeights, setOriginalWeights] = useState<LeaderboardWeightsConfig | null>(null)
  const [weights, setWeights] = useState({
    goals_weight: 0.40,
    activities_weight: 0.30,
    calls_weight: 0.30
  })
  const [displayValues, setDisplayValues] = useState({
    goals_weight: '40.00',
    activities_weight: '30.00',
    calls_weight: '30.00'
  })
  const [hasChanges, setHasChanges] = useState(false)

  // Cargar configuración inicial
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true)
      
      try {
        if (!isAdmin) {
          setIsLoading(false)
          return
        }

        // Cargar configuración actual
        const configResult = await getLeaderboardWeightsConfig()
        if (configResult.success && configResult.data) {
          const config = configResult.data
          setOriginalWeights(config)
          setWeights({
            goals_weight: config.goals_weight,
            activities_weight: config.activities_weight,
            calls_weight: config.calls_weight
          })
          setDisplayValues({
            goals_weight: (config.goals_weight * 100).toFixed(2),
            activities_weight: (config.activities_weight * 100).toFixed(2),
            calls_weight: (config.calls_weight * 100).toFixed(2)
          })
        }
      } catch (error) {
        console.error('Error loading config:', error)
        toast.error('Error al cargar la configuración')
      } finally {
        setIsLoading(false)
      }
    }

    loadConfig()
  }, [isAdmin])

  // Detectar cambios
  useEffect(() => {
    if (!originalWeights) return

    const hasChanged = 
      Math.abs(weights.goals_weight - originalWeights.goals_weight) > 0.001 ||
      Math.abs(weights.activities_weight - originalWeights.activities_weight) > 0.001 ||
      Math.abs(weights.calls_weight - originalWeights.calls_weight) > 0.001

    setHasChanges(hasChanged)
  }, [weights, originalWeights])

  const handleWeightChange = (field: keyof typeof weights, value: string) => {
    // Actualizar el valor de visualización
    setDisplayValues(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Actualizar el valor numérico solo si es válido
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && value !== '') {
      setWeights(prev => ({
        ...prev,
        [field]: numValue / 100
      }))
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      const result = await updateLeaderboardWeights(weights)
      
      if (result.success) {
        toast.success('Pesos del leaderboard actualizados exitosamente')
        setOriginalWeights({
          ...originalWeights!,
          goals_weight: weights.goals_weight,
          activities_weight: weights.activities_weight,
          calls_weight: weights.calls_weight,
          total_weight: weights.goals_weight + weights.activities_weight + weights.calls_weight
        })
        setHasChanges(false)
        onWeightsUpdated?.()
        onClose?.() // Ocultar la tarjeta después de guardar
      } else {
        toast.error(result.error || 'Error al actualizar los pesos')
      }
    } catch (error) {
      console.error('Error saving weights:', error)
      toast.error('Error al guardar los cambios')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (originalWeights) {
      setWeights({
        goals_weight: originalWeights.goals_weight,
        activities_weight: originalWeights.activities_weight,
        calls_weight: originalWeights.calls_weight
      })
      setDisplayValues({
        goals_weight: (originalWeights.goals_weight * 100).toFixed(2),
        activities_weight: (originalWeights.activities_weight * 100).toFixed(2),
        calls_weight: (originalWeights.calls_weight * 100).toFixed(2)
      })
    }
  }

  const handleCancel = () => {
    // Restaurar valores originales si hay cambios
    if (hasChanges && originalWeights) {
      handleReset()
    }
    onClose?.() // Ocultar la tarjeta
  }

  const totalWeight = weights.goals_weight + weights.activities_weight + weights.calls_weight
  const isTotalValid = Math.abs(totalWeight - 1.0) < 0.01

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Configuración de Pesos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Cargando configuración...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Configuración de Pesos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Solo los administradores pueden modificar los pesos del leaderboard</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Configuración de Pesos del Leaderboard</span>
        </CardTitle>
        <CardDescription>
          Ajusta los pesos para el cálculo del puntaje total. Los pesos deben sumar exactamente 100%.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="goals_weight">Peso de Metas (%)</Label>
            <Input
              id="goals_weight"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={displayValues.goals_weight}
              onChange={(e) => handleWeightChange('goals_weight', e.target.value)}
              className={!isTotalValid ? 'border-red-500' : ''}
            />
            <p className="text-xs text-gray-500">Porcentaje de completitud de metas</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activities_weight">Peso de Actividades (%)</Label>
            <Input
              id="activities_weight"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={displayValues.activities_weight}
              onChange={(e) => handleWeightChange('activities_weight', e.target.value)}
              className={!isTotalValid ? 'border-red-500' : ''}
            />
            <p className="text-xs text-gray-500">Porcentaje de actividades completadas</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="calls_weight">Peso de Llamadas (%)</Label>
            <Input
              id="calls_weight"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={displayValues.calls_weight}
              onChange={(e) => handleWeightChange('calls_weight', e.target.value)}
              className={!isTotalValid ? 'border-red-500' : ''}
            />
            <p className="text-xs text-gray-500">Score de llamadas a tiempo</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Total:</span>
            <span className={`text-lg font-bold ${isTotalValid ? 'text-green-600' : 'text-red-600'}`}>
              {(totalWeight * 100).toFixed(2)}%
            </span>
          </div>
          {!isTotalValid && (
            <div className="flex items-center space-x-1 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Los pesos deben sumar 100%</span>
            </div>
          )}
        </div>

        {originalWeights && (
          <div className="text-sm text-gray-600">
            <p>Última actualización: {new Date(originalWeights.last_updated).toLocaleString('es-ES')}</p>
            <p>Actualizado por: {originalWeights.updated_by_name}</p>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restablecer
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || !isTotalValid || isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
