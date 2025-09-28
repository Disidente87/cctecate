'use client'

import React, { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CheckCircle, Clock } from 'lucide-react'
import { useActiveParticipation } from '@/contexts/active-participation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ParticipationSelectorProps {
  className?: string
}

export function ParticipationSelector({ className }: ParticipationSelectorProps) {
  const {
    activeParticipation,
    allParticipations,
    isLoading,
    error,
    changeActiveParticipation,
    isAdmin
  } = useActiveParticipation()

  const [isChanging, setIsChanging] = useState(false)

  // Si no es admin, no mostrar el selector
  if (!isAdmin) {
    return null
  }

  // Si está cargando, mostrar skeleton
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participación Activa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Si hay error, mostrarlo
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Users className="h-5 w-5" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 text-sm">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const handleParticipationChange = async (participationId: string) => {
    if (participationId === activeParticipation?.participation_id) return

    setIsChanging(true)
    const success = await changeActiveParticipation(participationId)
    setIsChanging(false)

    if (!success) {
      // El error ya se maneja en el contexto
      return
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      case 'inactive':
        return <Clock className="h-4 w-4 text-gray-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'lider':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'senior':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'lider':
        return 'Líder'
      case 'senior':
        return 'Senior'
      case 'admin':
        return 'Admin'
      default:
        return role
    }
  }


  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Participación Activa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selector de participación */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Cambiar participación activa
          </label>
          <Select
            value={activeParticipation?.participation_id || ''}
            onValueChange={handleParticipationChange}
            disabled={isChanging}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar participación" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              {allParticipations.map((participation) => (
                <SelectItem
                  key={participation.participation_id}
                  value={participation.participation_id}
                  className="hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(participation.status)}
                    <span className="font-medium">{participation.generation_name}</span>
                    <Badge variant="outline" className={`text-xs ${getRoleColor(participation.role)}`}>
                      {getRoleLabel(participation.role)}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      #{participation.participation_number}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Información de la participación activa */}
        {activeParticipation && (
          <div className="p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(activeParticipation.status)}
                <span className="font-medium">{activeParticipation.generation_name}</span>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getRoleColor(activeParticipation.role)}`}
                >
                  {getRoleLabel(activeParticipation.role)}
                </Badge>
              </div>
              <span className="text-xs text-gray-500">
                Participación #{activeParticipation.participation_number}
              </span>
            </div>
            <div className="text-xs text-gray-600">
              Creada: {format(new Date(activeParticipation.created_at), 'dd/MM/yyyy', { locale: es })}
            </div>
          </div>
        )}

        {/* Lista de todas las participaciones */}
        {allParticipations.length > 1 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Historial de participaciones
            </label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {allParticipations
                .sort((a, b) => b.participation_number - a.participation_number)
                .map((participation) => (
                  <div
                    key={participation.participation_id}
                    className={`flex items-center justify-between p-2 rounded text-xs ${
                      participation.is_active 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(participation.status)}
                      <span className="font-medium">{participation.generation_name}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getRoleColor(participation.role)}`}
                      >
                        {getRoleLabel(participation.role)}
                      </Badge>
                    </div>
                    <span className="text-gray-500">
                      #{participation.participation_number}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Información adicional para admins */}
        <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded border border-yellow-200">
          <strong>Nota:</strong> Solo los administradores pueden cambiar la participación activa de los usuarios.
        </div>
      </CardContent>
    </Card>
  )
}
