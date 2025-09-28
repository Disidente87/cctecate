"use client"

import { useSelectedUser } from '@/contexts/selected-user'

export function LeaderSwitcher() {
  const { 
    authUserId, 
    selectedUserId, 
    setSelectedUserId, 
    assignedUsers, 
    isSenior, 
    isMasterSenior,
    isAdmin,
    availableGenerations,
    selectedGeneration,
    setSelectedGeneration
  } = useSelectedUser()
  
  if (!isSenior && !isMasterSenior && !isAdmin) return null

  // Filter users by selected generation for admin
  const filteredUsers = isAdmin && selectedGeneration !== 'all' 
    ? assignedUsers.filter(user => user.generation === selectedGeneration)
    : assignedUsers

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 overflow-x-auto">
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-sm text-gray-600 mr-2">Ver datos de:</span>
          
          {/* Generation selector for admin */}
          {isAdmin && (
            <select
              value={selectedGeneration}
              onChange={(e) => setSelectedGeneration(e.target.value)}
              className="px-2 py-1 rounded text-sm border border-gray-300 bg-white"
            >
              <option value="all">Todas las generaciones</option>
              {availableGenerations.map(gen => (
                <option key={gen} value={gen}>{gen}</option>
              ))}
            </select>
          )}
          
          <button
            className={`px-3 py-1 rounded-full text-sm border ${selectedUserId === authUserId ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-blue-50'}`}
            onClick={() => setSelectedUserId(authUserId)}
          >
            Mis datos
          </button>
          
          {filteredUsers.length === 0 && (
            <span className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
              {isAdmin ? 'No hay usuarios asignados aún' : 
               isMasterSenior ? 'No hay usuarios asignados aún' : 
               'No hay líderes asignados aún'}
            </span>
          )}
          
          {filteredUsers.map(user => (
            <button
              key={user.id}
              className={`px-3 py-1 rounded-full text-sm border ${selectedUserId === user.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-blue-50'}`}
              onClick={() => setSelectedUserId(user.id)}
              title={`${user.name} · ${user.generation} · ${user.role}`}
            >
              {user.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LeaderSwitcher


