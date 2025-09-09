'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <h1 className="text-6xl font-bold text-red-600 mb-2">⚠️</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Error</h2>
          <p className="text-gray-600 mb-8">
            Ha ocurrido un error inesperado. Por favor, intenta de nuevo.
          </p>
        </div>
        
        <div className="space-y-4">
          <button 
            onClick={reset}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Intentar de nuevo
          </button>
          
          <div className="text-sm text-gray-500">
            <button 
              onClick={() => window.location.href = '/'}
              className="text-blue-600 hover:text-blue-800"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
