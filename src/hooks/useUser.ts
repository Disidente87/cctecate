'use client'

import { useState, useEffect } from 'react'
import { User } from '@/types'
import { supabase } from '@/lib/supabase'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.error('Error getting auth user:', authError)
          setIsLoading(false)
          return
        }

        if (authUser) {
          console.log('Auth user found:', authUser.id)
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single()

          if (error) {
            console.error('Error loading user profile:', error)
            console.error('Error details:', {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint
            })
            
            // Si el error es que no se encontró el perfil, intentar crearlo
            if (error.code === 'PGRST116') {
              console.log('Profile not found, attempting to create one...')
              try {
                const { data: newProfile, error: createError } = await supabase
                  .from('profiles')
                  .insert({
                    id: authUser.id,
                    email: authUser.email,
                    name: authUser.user_metadata?.name || authUser.email,
                    role: authUser.user_metadata?.role || 'lider',
                    generation: authUser.user_metadata?.generation || 'C1'
                  })
                  .select()
                  .single()

                if (createError) {
                  console.error('Error creating profile:', createError)
                  setUser(null)
                } else {
                  console.log('Profile created successfully:', newProfile)
                  setUser(newProfile)
                }
              } catch (createErr) {
                console.error('Error creating profile:', createErr)
                setUser(null)
              }
            } else {
              setUser(null)
            }
          } else {
            console.log('Profile loaded successfully:', profile)
            setUser(profile)
          }
        } else {
          console.log('No auth user found')
          setUser(null)
        }
      } catch (error) {
        console.error('Error getting user:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        getUser()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, isLoading }
}
