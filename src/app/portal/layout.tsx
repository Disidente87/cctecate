import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import PortalNavbar from '@/components/portal/PortalNavbar'

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

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalNavbar user={{
        id: user.id,
        email: user.email || '',
        user_metadata: user.user_metadata
      }} />
      <main className="py-6">
        {children}
      </main>
    </div>
  )
}
