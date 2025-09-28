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
  Users
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
    { name: 'Dashboard', href: '/portal', icon: Home },
    { name: 'Metas', href: '/portal/metas', icon: Target },
    { name: 'Calendario', href: '/portal/calendario', icon: Calendar },
    { name: 'Actividades', href: '/portal/actividades', icon: Calendar },
    { name: 'Llamadas', href: '/portal/llamadas', icon: Phone },
    { name: 'Leaderboard', href: '/portal/leaderboard', icon: Trophy },
  ]

  const adminNavigation = [
    { name: 'Asignación', href: '/portal/asignacion', icon: Users },
  ]

  const navigation = userRole === 'admin' 
    ? [...baseNavigation, ...adminNavigation]
    : baseNavigation

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/portal" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg"></div>
                <span className="text-xl font-bold ">CC Portal</span>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className=" hover: px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* User Menu */}
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
                  <p className="text-sm font-medium ">{userProfile?.name || user?.user_metadata?.name || user?.email}</p>
                  <p className="text-xs ">{userProfile?.role || userRole || 'Usuario'}</p>
                </div>
                <DropdownMenuItem className="hover:bg-gray-50">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-gray-50" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className=" hover: block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
