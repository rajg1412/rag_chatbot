'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { toast } from 'sonner'

export function AuthForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                })
                if (error) throw error
                toast.success('Check your email for the confirmation link!')
            } else {
                const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (signInError) throw signInError

                // Safety check: ensure profile exists
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id, is_admin')
                        .eq('id', user.id)
                        .maybeSingle()

                    let is_admin = profile?.is_admin

                    if (!profile) {
                        console.log('Profile missing, creating manually...')
                        is_admin = user.email === 'rajg50103@gmail.com'
                        await supabase.from('profiles').insert({
                            id: user.id,
                            email: user.email,
                            is_admin: is_admin
                        })
                    }

                    if (is_admin) {
                        router.push('/upload')
                    } else {
                        router.push('/chat')
                    }
                }
                router.refresh()
            }
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="w-[400px]">
            <CardHeader>
                <CardTitle>{isSignUp ? 'Create Account' : 'Login'}</CardTitle>
                <CardDescription>
                    {isSignUp ? 'Sign up to start chatting.' : 'Log in to access your docs and chat.'}
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleAuth}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                    <Button className="w-full" type="submit" disabled={loading}>
                        {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Login'}
                    </Button>
                    <Button
                        variant="link"
                        className="w-full"
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                    >
                        {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
