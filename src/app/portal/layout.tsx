import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import PortalNavbar from '@/components/portal/PortalNavbar'
import { SelectedUserProvider } from '@/contexts/selected-user'
import LeaderSwitcher from '@/components/portal/LeaderSwitcher'
import type { UserRole } from '@/types'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Obtener el rol real desde profiles (no confiar en user_metadata)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const effectiveRole = (profile?.role || user.user_metadata?.role || 'lider') as UserRole

  return (
    <div className="min-h-screen bg-gray-50">
      <SelectedUserProvider authUserId={user.id} authUserRole={effectiveRole}>
        <PortalNavbar user={{
          id: user.id,
          email: user.email || '',
          user_metadata: user.user_metadata
        }} />
        <LeaderSwitcher />
        <main className="py-6">
          {children}
        </main>
      </SelectedUserProvider>
    </div>
  )
}
