'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { getActiveGeneration, type Generation } from '@/lib/generations'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'lider' as 'lider' | 'senior' | 'master_senior' | 'admin'
  })
  const [activeGeneration, setActiveGeneration] = useState<Generation | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLoadingGeneration, setIsLoadingGeneration] = useState(true)
  const router = useRouter()

  // Cargar generación activa al montar el componente
  useEffect(() => {
    const loadActiveGeneration = async () => {
      try {
        const generation = await getActiveGeneration()
        setActiveGeneration(generation)
        if (!generation) {
          setError('No hay una generación activa para registro en este momento. Contacta al administrador.')
        }
      } catch (error) {
        console.error('Error loading active generation:', error)
        setError('Error al cargar la información de generación. Intenta de nuevo.')
      } finally {
        setIsLoadingGeneration(false)
      }
    }

    loadActiveGeneration()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!activeGeneration) {
      setError('No hay una generación activa para registro.')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
            generation: activeGeneration.name
          }
        }
      })

      if (error) {
        setError(error.message)
      } else {
        router.push('/auth/login?message=Registro exitoso. Por favor inicia sesión.')
      }
    } catch {
      setError('Error inesperado. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg"></div>
            <span className="text-2xl font-bold ">CC Tecate</span>
          </div>
          <h1 className="text-3xl font-bold  mb-2">Únete a nuestra comunidad</h1>
          <p className="">Crea tu cuenta y comienza tu transformación</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="">Crear Cuenta</CardTitle>
            <CardDescription className="">
              Completa el formulario para registrarte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium  mb-2">
                  Nombre completo
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500  bg-white"
                  placeholder="Tu nombre completo"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium  mb-2">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500  bg-white"
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium  mb-2">
                  Rol
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500  bg-white"
                  required
                >
                  <option value="lider" className="">Líder</option>
                  <option value="senior" className="">Senior</option>
                  <option value="master_senior" className="">Master Senior</option>
                  <option value="admin" className="">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium  mb-2">
                  Generación
                </label>
                {isLoadingGeneration ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="">Cargando generación...</span>
                  </div>
                ) : activeGeneration ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-green-50 border-green-200">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className=" font-medium">{activeGeneration.name}</span>
                    </div>
                    <p className="text-sm  mt-1">
                      Registro abierto hasta: {new Date(activeGeneration.registration_end_date).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                ) : (
                  <div className="w-full px-3 py-2 border border-red-300 rounded-md shadow-sm bg-red-50">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4  mr-2" />
                      <span className="">No hay generación activa</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium  mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500  bg-white"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium  mb-2">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500  bg-white"
                    placeholder="Confirma tu contraseña"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm ">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={loading || !activeGeneration || isLoadingGeneration}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  'Crear Cuenta'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm ">
                ¿Ya tienes cuenta?{' '}
                <Link href="/auth/login" className=" hover: font-medium">
                  Inicia sesión aquí
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm  hover:">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
