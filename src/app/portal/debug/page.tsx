import { DatabaseDebugger } from '@/components/debug/DatabaseDebugger'

export default function DebugPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🔧 Database Debugger</h1>
          <p className="mt-2 text-gray-600">
            Herramienta para probar las funciones de la base de datos y identificar problemas
          </p>
        </div>
        
        <DatabaseDebugger />
        
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Instrucciones:</h3>
          <ol className="list-decimal list-inside space-y-2 text-yellow-700">
            <li>Asegúrate de estar logueado como administrador</li>
            <li>Ejecuta &quot;Verificar Usuario&quot; para confirmar tu rol</li>
            <li>Ejecuta &quot;Probar Actualización Profiles&quot; para probar actualizaciones básicas</li>
            <li>Ejecuta &quot;Probar Creación Participaciones&quot; para probar el sistema de participaciones</li>
            <li>Revisa los resultados para identificar problemas específicos</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
