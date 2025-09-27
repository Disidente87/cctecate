'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Users, UserCheck, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'

interface User {
  id: string
  name: string
  email: string
  generation: string
  role: 'lider' | 'senior' | 'admin'
  supervisor_id?: string
}

interface Assignment {
  userId: string
  assignedTo: string | null
  assignedToName: string | null
}

export default function AsignacionPage() {
  const { user } = useUser()
  const [selectedGeneration, setSelectedGeneration] = useState<string>('')
  const [generations, setGenerations] = useState<string[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [seniors, setSeniors] = useState<User[]>([])
  const [admins, setAdmins] = useState<User[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Load generations
  useEffect(() => {
    const loadGenerations = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('generation')
        .in('role', ['lider', 'senior'])
        .order('generation')
      
      if (error) {
        console.error('Error loading generations:', error)
        return
      }
      
      const uniqueGenerations = [...new Set(data.map(row => row.generation))].sort()
      setGenerations(uniqueGenerations)
      if (uniqueGenerations.length > 0) {
        setSelectedGeneration(uniqueGenerations[0])
      }
    }
    
    loadGenerations()
  }, [])

  // Load users for selected generation
  useEffect(() => {
    if (!selectedGeneration) return
    
    const loadUsers = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, generation, role, supervisor_id')
          .eq('generation', selectedGeneration)
          .in('role', ['lider', 'senior', 'admin'])
          .order('role', { ascending: true })
          .order('name')
        
        if (error) {
          console.error('Error loading users:', error)
          return
        }
        
        const usersData = data || []
        setUsers(usersData)
        
        // Separate by role
        setSeniors(usersData.filter(u => u.role === 'senior'))
        setAdmins(usersData.filter(u => u.role === 'admin'))
        
        // Initialize assignments
        const initialAssignments: Assignment[] = usersData.map(u => ({
          userId: u.id,
          assignedTo: u.supervisor_id || null,
          assignedToName: null
        }))
        setAssignments(initialAssignments)
        
      } catch (error) {
        console.error('Error loading users:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadUsers()
  }, [selectedGeneration])

  // Update assignedToName when assignments change
  useEffect(() => {
    const updateAssignmentNames = () => {
      setAssignments(prev => prev.map(assignment => {
        if (!assignment.assignedTo) return assignment
        
        const assignedUser = [...seniors, ...admins].find(u => u.id === assignment.assignedTo)
        return {
          ...assignment,
          assignedToName: assignedUser?.name || null
        }
      }))
    }
    
    updateAssignmentNames()
  }, [seniors, admins])

  const handleAssignmentChange = (userId: string, assignedTo: string | null) => {
    setAssignments(prev => prev.map(assignment => 
      assignment.userId === userId 
        ? { ...assignment, assignedTo, assignedToName: null }
        : assignment
    ))
  }

  const saveAssignments = async () => {
    setIsSaving(true)
    try {
      const updates = assignments.map(assignment => {
        const user = users.find(u => u.id === assignment.userId)
        if (!user) return null
        
        // Use supervisor_id for all assignments (both senior and admin)
        const assignedUser = [...seniors, ...admins].find(u => u.id === assignment.assignedTo)
        if (!assignedUser) return null
        
        return {
          id: assignment.userId,
          supervisor_id: assignment.assignedTo
        }
      }).filter((update): update is NonNullable<typeof update> => update !== null)
      
      // Update all assignments
      for (const update of updates) {
        const { error } = await supabase
          .from('profiles')
          .update({
            supervisor_id: update.supervisor_id
          })
          .eq('id', update.id)
        
        if (error) {
          console.error('Error updating assignment:', error)
          throw error
        }
      }
      
      // Reload data
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, generation, role, supervisor_id')
        .eq('generation', selectedGeneration)
        .in('role', ['lider', 'senior', 'admin'])
        .order('role', { ascending: true })
        .order('name')
      
      if (error) {
        console.error('Error reloading users:', error)
        return
      }
      
      const usersData = data || []
      setUsers(usersData)
      
      const updatedAssignments: Assignment[] = usersData.map(u => ({
        userId: u.id,
        assignedTo: u.supervisor_id || null,
        assignedToName: null
      }))
      setAssignments(updatedAssignments)
      
    } catch (error) {
      console.error('Error saving assignments:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getUnassignedLeaders = () => {
    return users.filter(u => u.role === 'lider' && !assignments.find(a => a.userId === u.id)?.assignedTo)
  }

  const getAvailableAssignees = (user: User) => {
    if (user.role === 'lider') {
      return [...seniors, ...admins]
    } else if (user.role === 'senior') {
      return admins
    }
    return []
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Asignación de Líderes</h1>
        <p className="text-gray-600 mt-2">
          Asigna seniors y admins a líderes y otros usuarios
        </p>
      </div>

      {/* Generation Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Seleccionar Generación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedGeneration} onValueChange={setSelectedGeneration}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecciona una generación" />
            </SelectTrigger>
            <SelectContent>
              {generations.map(gen => (
                <SelectItem key={gen} value={gen}>
                  {gen}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Unassigned Leaders Alert */}
      {getUnassignedLeaders().length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">
                {getUnassignedLeaders().length} líder(es) sin asignar:
              </span>
              <div className="flex gap-2 flex-wrap">
                {getUnassignedLeaders().map(leader => (
                  <Badge key={leader.id} variant="outline" className="text-amber-800 border-amber-300">
                    {leader.name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Líderes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {users.filter(u => u.role === 'lider').map(leader => {
              const assignment = assignments.find(a => a.userId === leader.id)
              const availableAssignees = getAvailableAssignees(leader)
              
              return (
                <div key={leader.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{leader.name}</div>
                    <div className="text-sm text-gray-500">{leader.email}</div>
                  </div>
                  <Select
                    value={assignment?.assignedTo || ''}
                    onValueChange={(value) => handleAssignmentChange(leader.id, value || null)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin asignar</SelectItem>
                      {availableAssignees.map(assignee => (
                        <SelectItem key={assignee.id} value={assignee.id}>
                          {assignee.name} ({assignee.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Seniors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Seniors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {seniors.map(senior => {
              const assignment = assignments.find(a => a.userId === senior.id)
              const availableAssignees = getAvailableAssignees(senior)
              
              return (
                <div key={senior.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{senior.name}</div>
                    <div className="text-sm text-gray-500">{senior.email}</div>
                  </div>
                  <Select
                    value={assignment?.assignedTo || ''}
                    onValueChange={(value) => handleAssignmentChange(senior.id, value || null)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin asignar</SelectItem>
                      {availableAssignees.map(assignee => (
                        <SelectItem key={assignee.id} value={assignee.id}>
                          {assignee.name} ({assignee.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <Button 
          onClick={saveAssignments} 
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSaving ? 'Guardando...' : 'Guardar Asignaciones'}
        </Button>
      </div>
    </div>
  )
}
