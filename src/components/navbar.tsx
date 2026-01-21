'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { toast } from 'sonner'

export function Navbar() {
    const [user, setUser] = useState<User | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            if (user) {
                console.log('Checking admin status for:', user.email)
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', user.id)
                    .maybeSingle()

                if (error) {
                    console.error('Profile fetch error:', error)
                }

                setIsAdmin(!!profile?.is_admin)
            }
        }
        checkUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const user = session?.user ?? null
            setUser(user)
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', user.id)
                    .maybeSingle()
                setIsAdmin(!!profile?.is_admin)
            } else {
                setIsAdmin(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    if (!user) return null

    return (
        <nav className="border-b bg-white">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-8">
                    <Link href="/" className="text-xl font-bold text-primary">
                        RAG Document
                    </Link>
                    <div className="flex gap-4">
                        <Link href="/chat" className="text-sm font-medium hover:text-primary">
                            Chat
                        </Link>
                        {isAdmin && (
                            <Link href="/upload" className="text-sm font-medium hover:text-primary">
                                Upload
                            </Link>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">{user.email}</span>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                        Logout
                    </Button>
                </div>
            </div>
        </nav>
    )
}
