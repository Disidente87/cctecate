'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  Settings,
  Home,
  Target,
  Calendar,
  Trophy,
  Phone,
  Users,
  GraduationCap
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface PortalNavbarProps {
  user: {
    id: string
    email: string
    user_metadata?: {
      name?: string
      role?: string
    }
  }
}

export default function PortalNavbar({ user }: PortalNavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [userRole, setUserRole] = useState<string>('lider')
  const [userProfile, setUserProfile] = useState<{name: string, role: string} | null>(null)
  const router = useRouter()

  // Get user role from profiles table
  useEffect(() => {
    const getUserProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', user.id)
          .single()
        
        if (error) {
          console.error('Error fetching user profile:', error)
          return
        }
        
        if (data) {
          console.log('User profile data:', data)
          setUserRole(data.role)
          setUserProfile(data)
        }
      } catch (error) {
        console.error('Error in getUserProfile:', error)
      }
    }
    getUserProfile()
  }, [user.id])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const baseNavigation = [
    { name: 'Mi Perfil', href: '/portal/perfil', icon: User },
    { name: 'Dashboard', href: '/portal', icon: Home },
    { name: 'Metas', href: '/portal/metas', icon: Target },
    { name: 'Calendario', href: '/portal/calendario', icon: Calendar },
    { name: 'Actividades', href: '/portal/actividades', icon: Calendar },
    { name: 'Llamadas', href: '/portal/llamadas', icon: Phone },
    { name: 'Leaderboard', href: '/portal/leaderboard', icon: Trophy },
  ]

  const adminNavigation = [
    { name: 'Asignación', href: '/portal/asignacion', icon: Users },
    { name: 'Generaciones', href: '/portal/generaciones', icon: GraduationCap },
  ]

  // Para admin, excluir "Mi Perfil" y agregar las opciones de admin
  const navigation = userRole === 'admin' 
    ? [baseNavigation[1], ...baseNavigation.slice(2), ...adminNavigation] // Excluir Mi Perfil (índice 0)
    : baseNavigation

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/portal" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg"></div>
                <span className="text-xl font-bold text-gray-900">CC Portal</span>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:ml-6 lg:flex lg:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Desktop User Menu */}
            <div className="hidden lg:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-600" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white border border-gray-200 shadow-lg" align="end">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{userProfile?.name || user?.user_metadata?.name || user?.email}</p>
                    <p className="text-xs text-gray-600">{userProfile?.role || userRole || 'Usuario'}</p>
                  </div>
                  <DropdownMenuItem className="hover:bg-gray-50 cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Configuración
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-gray-50 cursor-pointer" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2"
              >
                {isMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200 bg-white">
              {navigation.map((item) => {
                const IconComponent = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-gray-700 hover:text-blue-600 hover:bg-gray-50 flex items-center px-3 py-3 rounded-md text-base font-medium transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <IconComponent className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                )
              })}
              
              {/* Mobile User Info and Actions */}
              <div className="border-t border-gray-200 mt-3 pt-3">
                <div className="px-3 py-2 mb-2">
                  <p className="text-sm font-medium text-gray-900">{userProfile?.name || user?.user_metadata?.name || user?.email}</p>
                  <p className="text-xs text-gray-600">{userProfile?.role || userRole || 'Usuario'}</p>
                </div>
                <div className="space-y-1">
                  <button className="text-gray-700 hover:text-blue-600 hover:bg-gray-50 flex items-center w-full px-3 py-3 rounded-md text-base font-medium transition-colors">
                    <Settings className="h-5 w-5 mr-3" />
                    Configuración
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="text-gray-700 hover:text-blue-600 hover:bg-gray-50 flex items-center w-full px-3 py-3 rounded-md text-base font-medium transition-colors"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
