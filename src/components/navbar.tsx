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
        <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md transition-all">
            <div className="container mx-auto flex h-16 items-center justify-between px-6">
                <div className="flex items-center gap-10">
                    <Link href="/" className="group flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg transition-transform group-hover:scale-105 group-hover:rotate-3">
                            <FileText className="h-6 w-6" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-primary transition-colors hover:text-primary/80">
                            RAG Document
                        </span>
                    </Link>
                    <div className="flex items-center gap-1">
                        <Link
                            href="/chat"
                            className="px-4 py-2 text-sm font-medium text-gray-600 rounded-full transition-all hover:bg-primary/5 hover:text-primary"
                        >
                            Chat
                        </Link>
                        {isAdmin && (
                            <Link
                                href="/upload"
                                className="px-4 py-2 text-sm font-medium text-gray-600 rounded-full transition-all hover:bg-primary/5 hover:text-primary"
                            >
                                Dashboard
                            </Link>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Signed in as</span>
                        <span className="text-sm font-medium text-primary">{user.email}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className="rounded-full px-5 font-semibold text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                        Sign Out
                    </Button>
                </div>
            </div>
        </nav>
    )
}

import { FileText } from 'lucide-react'

