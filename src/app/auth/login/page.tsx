'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  console.log('📱 LoginPage componente montado')
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    console.log('🚀 handleLogin ejecutándose...')
    e.preventDefault()
    setLoading(true)
    setError('')
    setShowResetPassword(false)
    setResetMessage('')

    console.log('🔐 Intentando iniciar sesión con:', { email })

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('📊 Resultado del login:', { data, error })

      if (error) {
        console.error('❌ Error en login:', error)
        setError(error.message)
        // Mostrar opción de restablecer contraseña si es error de credenciales
        if (error.message.includes('Invalid login credentials')) {
          setShowResetPassword(true)
        }
      } else {
        console.log('✅ Login exitoso, redirigiendo a /portal...')
        console.log('🔍 Datos del usuario:', data.user)
        console.log('🔍 Sesión:', data.session)
        
        // Redirección directa al portal
        window.location.href = '/portal'
      }
    } catch (err) {
      console.error('💥 Error inesperado:', err)
      setError('Error inesperado. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setResetMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        setResetMessage(`Error: ${error.message}`)
      } else {
        setResetMessage('¡Revisa tu correo! Te hemos enviado un enlace para restablecer tu contraseña.')
        setShowResetPassword(false)
      }
    } catch (err) {
      console.error('Error inesperado al restablecer contraseña:', err)
      setResetMessage('Error inesperado. Intenta de nuevo.')
    } finally {
      setResetLoading(false)
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
          <h1 className="text-3xl font-bold  mb-2">Bienvenido de vuelta</h1>
          <p className="">Inicia sesión en tu portal personal</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="">Iniciar Sesión</CardTitle>
            <CardDescription className="">
              Ingresa tus credenciales para acceder al portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium  mb-2">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500  bg-white"
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium  mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500  bg-white"
                    placeholder="Tu contraseña"
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

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-700">
                    {error}
                    {error.includes('Invalid login credentials') && (
                      <span className="block mt-2">
                        ¿Olvidaste tu contraseña?{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setShowResetPassword(true)
                            // Hacer scroll hacia la sección de restablecer contraseña
                            setTimeout(() => {
                              const resetSection = document.getElementById('reset-password-section')
                              if (resetSection) {
                                resetSection.scrollIntoView({ 
                                  behavior: 'smooth',
                                  block: 'start'
                                })
                              }
                            }, 100) // Pequeño delay para asegurar que el DOM se actualice
                          }}
                          className="text-blue-600 hover:text-blue-800 underline font-medium"
                        >
                          Restablecer contraseña
                        </button>
                      </span>
                    )}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm ">
                ¿No tienes cuenta?{' '}
                <Link href="/auth/register" className=" hover: font-medium">
                  Regístrate aquí
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Modal de restablecer contraseña */}
        {showResetPassword && (
          <Card id="reset-password-section" className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Restablecer Contraseña</CardTitle>
              <CardDescription>
                Te enviaremos un enlace para restablecer tu contraseña
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium mb-2">
                    Correo electrónico
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                    placeholder="tu@email.com"
                    required
                  />
                </div>

                {resetMessage && (
                  <div className={`p-3 rounded-md ${
                    resetMessage.includes('Error') 
                      ? 'bg-red-50 border border-red-200 text-red-700' 
                      : 'bg-green-50 border border-green-200 text-green-700'
                  }`}>
                    <p className="text-sm">{resetMessage}</p>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={resetLoading}
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Enviar enlace
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowResetPassword(false)
                      setResetMessage('')
                    }}
                    className="px-4"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm  hover:">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
