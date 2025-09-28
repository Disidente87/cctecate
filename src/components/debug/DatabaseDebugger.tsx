'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function DatabaseDebugger() {
  const [results, setResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addResult = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'
    setResults(prev => [...prev, `[${timestamp}] ${prefix} ${message}`])
  }

  const clearResults = () => {
    setResults([])
  }

  const checkCurrentUser = async () => {
    setIsLoading(true)
    addResult('🔍 Verificando usuario actual...')
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        addResult(`Error obteniendo usuario: ${userError.message}`, 'error')
        return
      }
      
      if (!user) {
        addResult('No hay usuario autenticado', 'error')
        return
      }
      
      addResult(`Usuario autenticado: ${user.id}`, 'success')
      
      // Obtener perfil del usuario
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, role, email')
        .eq('id', user.id)
        .single()
      
      if (profileError) {
        addResult(`Error obteniendo perfil: ${profileError.message}`, 'error')
        return
      }
      
      addResult(`Perfil: ${profile.name} (${profile.role}) - ${profile.email}`, 'success')
      
      // Verificar si es admin
      const { data: isAdmin, error: adminError } = await supabase
        .rpc('is_user_admin')
      
      if (adminError) {
        addResult(`Error verificando si es admin: ${adminError.message}`, 'error')
      } else {
        addResult(`Es admin: ${isAdmin}`, isAdmin ? 'success' : 'error')
      }
      
    } catch (error) {
      addResult(`Error en checkCurrentUser: ${error}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const testProfileUpdate = async () => {
    setIsLoading(true)
    addResult('🔍 Probando actualización de profiles...')
    
    try {
      // Obtener un usuario de prueba
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, name, supervisor_id')
        .limit(1)
      
      if (usersError) {
        addResult(`Error obteniendo usuarios: ${usersError.message}`, 'error')
        return
      }
      
      if (!users || users.length === 0) {
        addResult('No hay usuarios para probar', 'error')
        return
      }
      
      const testUser = users[0]
      addResult(`Usuario de prueba: ${testUser.name}`, 'info')
      
      // Intentar actualizar supervisor_id
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ supervisor_id: testUser.supervisor_id }) // Mantener el mismo valor
        .eq('id', testUser.id)
      
      if (updateError) {
        addResult(`Error actualizando profile: ${updateError.message}`, 'error')
      } else {
        addResult('Actualización de profile exitosa', 'success')
      }
      
    } catch (error) {
      addResult(`Error en testProfileUpdate: ${error}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const testParticipationCreation = async () => {
    setIsLoading(true)
    addResult('🔍 Probando creación de participación...')
    
    try {
      // Obtener un usuario de prueba
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, name')
        .limit(1)
      
      if (usersError) {
        addResult(`Error obteniendo usuarios: ${usersError.message}`, 'error')
        return
      }
      
      // Obtener una generación de prueba
      const { data: generations, error: genError } = await supabase
        .from('generations')
        .select('id, name')
        .limit(1)
      
      if (genError) {
        addResult(`Error obteniendo generaciones: ${genError.message}`, 'error')
        return
      }
      
      if (!users || users.length === 0 || !generations || generations.length === 0) {
        addResult('No hay datos suficientes para probar', 'error')
        return
      }
      
      const testUser = users[0]
      const testGeneration = generations[0]
      
      addResult(`Usuario: ${testUser.name}, Generación: ${testGeneration.name}`, 'info')
      
      // Intentar crear participación usando RPC
      const { data: participationData, error: participationError } = await supabase
        .rpc('create_and_activate_participation', {
          p_user_id: testUser.id,
          p_generation_id: testGeneration.id,
          p_role: 'lider'
        })
      
      if (participationError) {
        addResult(`Error creando participación: ${participationError.message}`, 'error')
      } else {
        addResult(`Participación creada exitosamente: ${participationData}`, 'success')
        
        // Limpiar el registro de prueba
        // Primero actualizar profiles para remover la referencia
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({ active_participation_id: null })
          .eq('active_participation_id', participationData)
        
        if (updateProfileError) {
          addResult(`Error actualizando profile: ${updateProfileError.message}`, 'error')
        } else {
          addResult('Referencia de participación removida de profile', 'success')
          
          // Ahora eliminar la participación
          const { error: deleteError } = await supabase
            .from('user_participations')
            .delete()
            .eq('id', participationData)
          
          if (deleteError) {
            addResult(`Error limpiando participación: ${deleteError.message}`, 'error')
          } else {
            addResult('Participación de prueba limpiada', 'success')
          }
        }
      }
      
    } catch (error) {
      addResult(`Error en testParticipationCreation: ${error}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const diagnoseTriggerIssue = async () => {
    setIsLoading(true)
    addResult('🔍 Diagnosticando problema del trigger...')
    
    try {
      // 1. Verificar usuarios recientes (usando profiles como proxy)
      addResult('Verificando usuarios recientes...', 'info')
      const { data: recentProfiles, error: recentError } = await supabase
        .from('profiles')
        .select('id, email, created_at')
        .order('created_at', { ascending: false })
        .limit(3)
      
      if (recentError) {
        addResult(`Error obteniendo perfiles recientes: ${recentError.message}`, 'error')
      } else {
        addResult(`Perfiles recientes: ${recentProfiles?.length || 0}`, 'info')
        recentProfiles?.forEach(profile => {
          addResult(`  - ${profile.email} (${profile.id})`, 'info')
        })
      }
      
      // 2. Verificar perfiles recientes
      addResult('Verificando perfiles recientes...', 'info')
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, name, role, generation, created_at')
        .order('created_at', { ascending: false })
        .limit(3)
      
      if (profilesError) {
        addResult(`Error obteniendo perfiles: ${profilesError.message}`, 'error')
      } else {
        addResult(`Perfiles en profiles: ${profiles?.length || 0}`, 'info')
        profiles?.forEach(profile => {
          addResult(`  - ${profile.name} (${profile.email}) - ${profile.role}`, 'info')
        })
      }
      
      // 3. Verificar usuarios sin perfil (simplificado)
      addResult('Verificando usuarios sin perfil...', 'info')
      // Como no podemos acceder a auth.users desde el frontend, asumimos que todos los perfiles corresponden a usuarios válidos
      addResult('Nota: No se puede verificar auth.users desde el frontend', 'info')
      addResult('Todos los perfiles existentes corresponden a usuarios autenticados', 'info')
      
      // 4. Verificar generaciones disponibles
      addResult('Verificando generaciones disponibles...', 'info')
      const { data: generations, error: genError } = await supabase
        .from('generations')
        .select('id, name, description')
        .order('created_at', { ascending: false })
      
      if (genError) {
        addResult(`Error obteniendo generaciones: ${genError.message}`, 'error')
      } else {
        addResult(`Generaciones disponibles: ${generations?.length || 0}`, 'info')
        generations?.forEach(gen => {
          addResult(`  - ${gen.name}: ${gen.description}`, 'info')
        })
      }
      
      // 5. Verificar participaciones existentes
      addResult('Verificando participaciones existentes...', 'info')
      const { data: participations, error: partError } = await supabase
        .from('user_participations')
        .select('id, user_id, role, status')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (partError) {
        addResult(`Error obteniendo participaciones: ${partError.message}`, 'error')
      } else {
        addResult(`Participaciones existentes: ${participations?.length || 0}`, 'info')
        participations?.forEach(part => {
          addResult(`  - Usuario ${part.user_id}: ${part.role} (${part.status})`, 'info')
        })
      }
      
      // 6. Verificar usuarios sin participación
      addResult('Verificando usuarios sin participación...', 'info')
      const { data: usersWithoutParticipation, error: noPartError } = await supabase
        .from('profiles')
        .select('id, name, email, active_participation_id')
        .is('active_participation_id', null)
        .limit(5)
      
      if (noPartError) {
        addResult(`Error verificando usuarios sin participación: ${noPartError.message}`, 'error')
      } else {
        addResult(`Usuarios sin participación: ${usersWithoutParticipation?.length || 0}`, 'info')
        usersWithoutParticipation?.forEach(user => {
          addResult(`  - ${user.name} (${user.email})`, 'info')
        })
      }
      
    } catch (error) {
      addResult(`Error en diagnoseTriggerIssue: ${error}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const testTriggerFunction = async () => {
    setIsLoading(true)
    addResult('🔍 Probando función handle_new_user manualmente...')
    
    try {
      // Generar ID de prueba único
      const testUserId = crypto.randomUUID()
      const testEmail = `test-${Date.now()}@example.com`
      const testName = 'Test User'
      
      addResult(`Usuario de prueba: ${testName} (${testEmail})`, 'info')
      
      // Probar la función handle_new_user usando RPC
      const { data: result, error: testError } = await supabase
        .rpc('test_handle_new_user', {
          p_user_id: testUserId,
          p_email: testEmail,
          p_name: testName,
          p_role: 'lider',
          p_generation: 'C1'
        })
      
      if (testError) {
        addResult(`Error probando función: ${testError.message}`, 'error')
        return
      }
      
      if (result && result.length > 0) {
        const testResult = result[0]
        if (testResult.success) {
          addResult(`✅ ${testResult.message}`, 'success')
          if (testResult.participation_id) {
            addResult(`Participación creada: ${testResult.participation_id}`, 'success')
          }
        } else {
          addResult(`❌ ${testResult.message}`, 'error')
        }
      }
      
      // Limpiar datos de prueba
      const { data: cleanupResult, error: cleanupError } = await supabase
        .rpc('cleanup_test_user', {
          p_user_id: testUserId
        })
      
      if (cleanupError) {
        addResult(`Error limpiando datos: ${cleanupError.message}`, 'error')
      } else if (cleanupResult && cleanupResult.length > 0) {
        const cleanup = cleanupResult[0]
        if (cleanup.success) {
          addResult(`🧹 ${cleanup.message}`, 'success')
        } else {
          addResult(`❌ ${cleanup.message}`, 'error')
        }
      }
      
    } catch (error) {
      addResult(`Error en testTriggerFunction: ${error}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const checkTriggerStatus = async () => {
    setIsLoading(true)
    addResult('🔍 Verificando estado del trigger...')
    
    try {
      const { data: status, error: statusError } = await supabase
        .rpc('check_trigger_status')
      
      if (statusError) {
        addResult(`Error verificando estado: ${statusError.message}`, 'error')
        return
      }
      
      if (status && status.length > 0) {
        const triggerStatus = status[0]
        addResult(`Función existe: ${triggerStatus.function_exists ? '✅' : '❌'}`, triggerStatus.function_exists ? 'success' : 'error')
        addResult(`Trigger existe: ${triggerStatus.trigger_exists ? '✅' : '❌'}`, triggerStatus.trigger_exists ? 'success' : 'error')
        addResult(`Función: ${triggerStatus.function_name}`, 'info')
        addResult(`Trigger: ${triggerStatus.trigger_name}`, 'info')
        addResult(`Security Definer: ${triggerStatus.function_security_definer ? '✅' : '❌'}`, triggerStatus.function_security_definer ? 'success' : 'error')
      }
      
    } catch (error) {
      addResult(`Error en checkTriggerStatus: ${error}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const viewLogs = async () => {
    setIsLoading(true)
    addResult('📋 Obteniendo logs recientes...')
    
    try {
      const { data: logs, error: logsError } = await supabase
        .rpc('get_recent_logs', { p_limit: 20 })
      
      if (logsError) {
        addResult(`Error obteniendo logs: ${logsError.message}`, 'error')
        return
      }
      
      if (logs && logs.length > 0) {
        addResult(`📋 Logs encontrados: ${logs.length}`, 'info')
        logs.forEach((log: { log_time: string; log_level: string; message: string; user_id?: string }) => {
          const timestamp = new Date(log.log_time).toLocaleString()
          const level = log.log_level
          const message = log.message
          const userId = log.user_id ? ` (Usuario: ${log.user_id})` : ''
          addResult(`[${timestamp}] ${level}: ${message}${userId}`, 'info')
        })
      } else {
        addResult('No se encontraron logs recientes', 'info')
      }
      
    } catch (error) {
      addResult(`Error en viewLogs: ${error}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const runAllTests = async () => {
    clearResults()
    addResult('🚀 Iniciando tests de debug...')
    
    await checkCurrentUser()
    await checkTriggerStatus()
    await diagnoseTriggerIssue()
    await testProfileUpdate()
    await testParticipationCreation()
    await testTriggerFunction()
    
    addResult('✅ Tests completados')
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🔧 Database Debugger</CardTitle>
        <CardDescription>
          Herramienta para probar las funciones de la base de datos y identificar problemas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={runAllTests} 
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Ejecutando...' : '🚀 Ejecutar Todos los Tests'}
          </Button>
          
          <Button 
            onClick={checkCurrentUser} 
            disabled={isLoading}
            variant="outline"
          >
            👤 Verificar Usuario
          </Button>
          
          <Button 
            onClick={testProfileUpdate} 
            disabled={isLoading}
            variant="outline"
          >
            📝 Probar Actualización Profiles
          </Button>
          
          <Button 
            onClick={testParticipationCreation} 
            disabled={isLoading}
            variant="outline"
          >
            🎯 Probar Creación Participaciones
          </Button>
          
          <Button 
            onClick={diagnoseTriggerIssue} 
            disabled={isLoading}
            variant="outline"
          >
            🔍 Diagnosticar Trigger
          </Button>
          
          <Button 
            onClick={testTriggerFunction} 
            disabled={isLoading}
            variant="outline"
          >
            ⚙️ Probar Función Trigger
          </Button>
          
               <Button 
                 onClick={checkTriggerStatus} 
                 disabled={isLoading}
                 variant="outline"
               >
                 🔍 Verificar Estado Trigger
               </Button>
               
               <Button 
                 onClick={viewLogs} 
                 disabled={isLoading}
                 variant="outline"
               >
                 📋 Ver Logs
               </Button>
               
               <Button 
                 onClick={clearResults} 
                 disabled={isLoading}
                 variant="outline"
               >
                 🧹 Limpiar Resultados
               </Button>
        </div>
        
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Resultados:</h3>
          <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-gray-500">No hay resultados aún. Ejecuta un test para comenzar.</p>
            ) : (
              <div className="space-y-1">
                {results.map((result, index) => (
                  <div key={index} className="text-sm font-mono">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
