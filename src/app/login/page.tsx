import { AuthForm } from '@/components/auth-form'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LoginPage() {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
        // If already logged in, check admin status and redirect
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .maybeSingle()

        if (profile?.is_admin) {
            redirect('/upload')
        } else {
            redirect('/chat')
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <AuthForm />
        </div>
    )
}
