'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Users, UserCheck, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  name: string
  email: string
  generation: string
  role: 'lider' | 'senior' | 'master_senior' | 'admin'
  supervisor_id?: string
}

interface Assignment {
  userId: string
  assignedTo: string | null
  assignedToName: string | null
  role?: string
  generation?: string
}

export default function AsignacionPage() {
  const [selectedGeneration, setSelectedGeneration] = useState<string>('')
  const [generations, setGenerations] = useState<string[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [seniors, setSeniors] = useState<User[]>([])
  const [masterSeniors, setMasterSeniors] = useState<User[]>([])
  const [admins, setAdmins] = useState<User[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Load generations
  useEffect(() => {
    const loadGenerations = async () => {
      const { data, error } = await supabase
        .from('generations')
        .select('name, registration_start_date, registration_end_date')
      
      if (error) {
        console.error('Error loading generations:', error)
        return
      }
      
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Start of today
      
      // Filter generations with active registration today
      const activeGenerations = data.filter(gen => {
        const startDate = new Date(gen.registration_start_date)
        const endDate = new Date(gen.registration_end_date)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
        
        return today >= startDate && today <= endDate
      })
      
      // Sort all generations by number (descending for display)
      const allGenerationNames = data.map(row => row.name).sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0
        const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0
        return numB - numA // Sort in descending order (C9, C8, C7, etc.)
      })
      
      // If there are active generations, select the smallest one
      let defaultGeneration = allGenerationNames[0] // Fallback to first generation
      
      if (activeGenerations.length > 0) {
        // Sort active generations by number (ascending) to get the smallest
        const activeGenerationNames = activeGenerations.map(gen => gen.name).sort((a, b) => {
          const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0
          const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0
          return numA - numB // Sort in ascending order to get smallest first
        })
        defaultGeneration = activeGenerationNames[0] // Smallest active generation
      }
      
      setGenerations(allGenerationNames)
      setSelectedGeneration(defaultGeneration)
    }
    
    loadGenerations()
  }, [])

  // Load users for selected generation
  useEffect(() => {
    if (!selectedGeneration) return
    
    const loadUsers = async () => {
      setIsLoading(true)
      try {
        // Load non-admin users for selected generation
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select(`
            id, 
            name, 
            email, 
            generation, 
            role, 
            supervisor_id,
            active_participation_id
          `)
          .eq('generation', selectedGeneration)
          .in('role', ['lider', 'senior', 'master_senior'])
          .order('role', { ascending: true })
          .order('name')
        
        if (usersError) {
          console.error('Error loading users:', usersError)
          return
        }
        
        // Load all admins (regardless of generation)
        const { data: adminsData, error: adminsError } = await supabase
          .from('profiles')
          .select(`
            id, 
            name, 
            email, 
            generation, 
            role, 
            supervisor_id,
            active_participation_id
          `)
          .eq('role', 'admin')
          .order('name')
        
        if (adminsError) {
          console.error('Error loading admins:', adminsError)
          return
        }
        
        // Combine users and admins
        const allUsersData = [...(usersData || []), ...(adminsData || [])]
        setUsers(allUsersData)
        
        // Get current roles from participations for each user
        const usersWithCurrentRoles = await Promise.all(
          allUsersData.map(async (u) => {
            let currentRole = u.role // fallback to profiles.role
            
            if (u.active_participation_id) {
              try {
                const { data: participationData } = await supabase
                  .from('user_participations')
                  .select('role')
                  .eq('id', u.active_participation_id)
                  .single()
                
                if (participationData) {
                  currentRole = participationData.role
                }
              } catch (error) {
                console.warn(`Error getting participation for user ${u.name}:`, error)
              }
            }
            
            return {
              ...u,
              currentRole
            }
          })
        )
        
        setSeniors(usersWithCurrentRoles.filter(u => u.currentRole === 'senior'))
        setMasterSeniors(usersWithCurrentRoles.filter(u => u.currentRole === 'master_senior'))
        setAdmins(usersWithCurrentRoles.filter(u => u.currentRole === 'admin'))
        
        // Initialize assignments with current roles
        const initialAssignments: Assignment[] = usersWithCurrentRoles.map(u => ({
          userId: u.id,
          assignedTo: u.supervisor_id || null,
          assignedToName: null,
          role: u.currentRole,
          generation: u.generation
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
        
        const assignedUser = [...seniors, ...masterSeniors, ...admins].find(u => u.id === assignment.assignedTo)
        return {
          ...assignment,
          assignedToName: assignedUser?.name || null
        }
      }))
    }
    
    updateAssignmentNames()
  }, [seniors, masterSeniors, admins])

  const handleAssignmentChange = (userId: string, assignedTo: string | null) => {
    setAssignments(prev => prev.map(assignment => 
      assignment.userId === userId 
        ? { ...assignment, assignedTo, assignedToName: null }
        : assignment
    ))
  }

  const handleRoleChange = (userId: string, newRole: string) => {
    console.log(`Role change: User ${userId} role changed to ${newRole}`)
    
    setAssignments(prev => prev.map(assignment => {
      if (assignment.userId === userId) {
        console.log(`Assignment updated: ${assignment.userId} role set to ${newRole}`)
        return { ...assignment, role: newRole }
      }
      return assignment
    }))
    
    // Update users state to reflect role change
    setUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, role: newRole as 'lider' | 'senior' | 'master_senior' | 'admin' }
        : user
    ))
    
    // Update seniors, master_seniors and admins lists
    const updatedUsers = users.map(user => 
      user.id === userId 
        ? { ...user, role: newRole as 'lider' | 'senior' | 'master_senior' | 'admin' }
        : user
    )
    setSeniors(updatedUsers.filter(u => u.role === 'senior'))
    setMasterSeniors(updatedUsers.filter(u => u.role === 'master_senior'))
    setAdmins(updatedUsers.filter(u => u.role === 'admin'))
  }

  const handleGenerationChange = (userId: string, newGeneration: string) => {
    console.log(`Generation change: User ${userId} generation changed to ${newGeneration}`)
    
    setAssignments(prev => prev.map(assignment => {
      if (assignment.userId === userId) {
        console.log(`Assignment updated: ${assignment.userId} generation set to ${newGeneration}`)
        return { ...assignment, generation: newGeneration }
      }
      return assignment
    }))
    
    // Update users state to reflect generation change
    setUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, generation: newGeneration }
        : user
    ))
  }

  const saveAssignments = async () => {
    setIsSaving(true)
    try {
      console.log('Saving assignments:', assignments)
      
      // Process all assignments using the new participation logic
      for (const assignment of assignments) {
        const user = users.find(u => u.id === assignment.userId)
        if (!user) continue
        
        console.log(`Processing user ${user.name}: supervisor_id = ${assignment.assignedTo}, role = ${assignment.role}, generation = ${assignment.generation}`)
        
        // Use the new function to create/update participation
        const { data: participationResult, error: participationError } = await supabase
          .rpc('create_participation_from_assignment', {
            p_user_id: assignment.userId,
            p_generation_name: assignment.generation || user.generation,
            p_role: assignment.role || user.role,
            p_supervisor_id: assignment.assignedTo
          })
        
        if (participationError) {
          console.error('Error creating/updating participation:', participationError)
          throw participationError
        }
        
        if (participationResult && participationResult.length > 0) {
          const result = participationResult[0]
          if (result.success) {
            console.log(`✅ ${result.message} for user ${user.name}. Participation ID: ${result.participation_id}`)
          } else {
            console.error(`❌ ${result.message} for user ${user.name}`)
            throw new Error(result.message)
          }
        }
      }
      
      // Reload data with current roles from participations
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          name, 
          email, 
          generation, 
          role, 
          supervisor_id,
          active_participation_id
        `)
        .eq('generation', selectedGeneration)
        .in('role', ['lider', 'senior', 'master_senior', 'admin'])
        .order('role', { ascending: true })
        .order('name')
      
      if (error) {
        console.error('Error reloading users:', error)
        return
      }
      
      const usersData = data || []
      setUsers(usersData)
      
      // Get current roles from participations for each user
      const usersWithCurrentRoles = await Promise.all(
        usersData.map(async (u) => {
          let currentRole = u.role // fallback to profiles.role
          
          if (u.active_participation_id) {
            try {
              const { data: participationData } = await supabase
                .from('user_participations')
                .select('role')
                .eq('id', u.active_participation_id)
                .single()
              
              if (participationData) {
                currentRole = participationData.role
              }
            } catch (error) {
              console.warn(`Error getting participation for user ${u.name}:`, error)
            }
          }
          
          return {
            ...u,
            currentRole
          }
        })
      )
      
      const updatedAssignments: Assignment[] = usersWithCurrentRoles.map(u => ({
        userId: u.id,
        assignedTo: u.supervisor_id || null,
        assignedToName: null,
        role: u.currentRole,
        generation: u.generation
      }))
      setAssignments(updatedAssignments)
      
      console.log('Assignments saved successfully')
      alert('Asignaciones guardadas correctamente')
      
    } catch (error) {
      console.error('Error saving assignments:', error)
      alert('Error al guardar las asignaciones. Revisa la consola para más detalles.')
    } finally {
      setIsSaving(false)
    }
  }

  const getUnassignedLeaders = () => {
    return users.filter(u => {
      const assignment = assignments.find(a => a.userId === u.id)
      const currentRole = assignment?.role || u.role
      return currentRole === 'lider' && !assignment?.assignedTo
    })
  }

  const getAvailableAssignees = (user: User, currentRole?: string) => {
    const role = currentRole || user.role
    if (role === 'lider') {
      return [...seniors, ...masterSeniors, ...admins]
    } else if (role === 'senior') {
      return [...masterSeniors, ...admins]
    } else if (role === 'master_senior') {
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
          Asigna seniors, master seniors y admins a líderes y otros usuarios
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
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              {generations.map(gen => (
                <SelectItem key={gen} value={gen} className="hover:bg-gray-50">
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Gestión de Usuarios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {users.map(user => {
            const assignment = assignments.find(a => a.userId === user.id)
            const currentRole = assignment?.role || user.role
            const currentGeneration = assignment?.generation || user.generation
            const availableAssignees = getAvailableAssignees(user, currentRole)
            
            return (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div className="flex-1">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
                
                <div className="flex gap-3">
                  {/* Generation Selector */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-600">Generación</label>
                    <Select
                      value={currentGeneration}
                      onValueChange={(value) => handleGenerationChange(user.id, value)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg">
                        {generations.map(generation => (
                          <SelectItem key={generation} value={generation} className="hover:bg-gray-50">
                            {generation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Role Selector */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-600">Rol</label>
                    <Select
                      value={currentRole}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg">
                        <SelectItem value="lider" className="hover:bg-gray-50">Líder</SelectItem>
                        <SelectItem value="senior" className="hover:bg-gray-50">Senior</SelectItem>
                        <SelectItem value="master_senior" className="hover:bg-gray-50">Master Senior</SelectItem>
                        <SelectItem value="admin" className="hover:bg-gray-50">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Assignment Selector */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-600">Supervisor</label>
                    <Select
                      value={assignment?.assignedTo || 'unassigned'}
                      onValueChange={(value) => handleAssignmentChange(user.id, value === 'unassigned' ? null : value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg">
                        <SelectItem value="unassigned" className="hover:bg-gray-50">Sin asignar</SelectItem>
                        {availableAssignees.map(assignee => (
                          <SelectItem key={assignee.id} value={assignee.id} className="hover:bg-gray-50">
                            {assignee.name} ({assignee.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>


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
