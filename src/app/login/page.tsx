import { AuthForm } from '@/components/auth-form'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'

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
        <div className="min-h-screen flex items-center justify-center bg-slate-50/50 relative overflow-hidden px-4">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] -z-10 animate-float"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] -z-10 animate-float" style={{ animationDelay: '2s' }}></div>

            <div className="w-full max-w-md animate-in fade-in zoom-in duration-700">
                <div className="text-center mb-10 space-y-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 mb-4 rotate-3">
                        <FileText size={24} />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Welcome Back</h1>
                    <p className="text-gray-500">Sign in to manage your documents</p>
                </div>

                <Card className="glass p-8 rounded-3xl border-white/40 shadow-2xl backdrop-blur-xl">
                    <AuthForm />
                </Card>
            </div>
        </div>
    )
}
