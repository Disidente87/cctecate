"use client"

import { useSelectedUser } from '@/contexts/selected-user'

export function LeaderSwitcher() {
  const { authUserId, selectedUserId, setSelectedUserId, leaders, isSenior } = useSelectedUser()
  if (!isSenior) return null

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 overflow-x-auto">
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-600 mr-2">Ver datos de:</span>
          <button
            className={`px-3 py-1 rounded-full text-sm border ${selectedUserId === authUserId ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-blue-50'}`}
            onClick={() => setSelectedUserId(authUserId)}
          >
            Mis datos
          </button>
          {leaders.length === 0 && (
            <span className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
              No hay líderes asignados aún
            </span>
          )}
          {leaders.map(leader => (
            <button
              key={leader.id}
              className={`px-3 py-1 rounded-full text-sm border ${selectedUserId === leader.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-blue-50'}`}
              onClick={() => setSelectedUserId(leader.id)}
              title={`${leader.name} · ${leader.generation}`}
            >
              {leader.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LeaderSwitcher


