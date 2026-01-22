import { UploadForm } from '@/components/upload-form'
import { DocumentList } from '@/components/document-list'
import { FileText } from 'lucide-react'
import { getIsAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function UploadPage() {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle()

    if (!profile?.is_admin) {
        redirect('/chat')
    }

    return (
        <div className="min-h-screen bg-slate-50/50 relative overflow-hidden">
            {/* Decorative Gradients */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10"></div>

            <div className="container mx-auto py-12 px-6 max-w-6xl">
                <header className="mb-12 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                        <FileText size={14} /> Admin Control
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
                        Knowledge Base <span className="text-primary italic font-serif">Management</span>
                    </h1>
                    <p className="text-lg text-gray-500 max-w-2xl leading-relaxed">
                        Enhance your RAG system by uploading new documents. We'll automatically extract,
                        clean, and index the content for your AI assistant.
                    </p>
                </header>

                <div className="grid gap-10">
                    <section className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-2xl shadow-blue-900/5">
                        <UploadForm />
                    </section>

                    <section className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-2xl shadow-blue-900/5">
                        <DocumentList />
                    </section>
                </div>
            </div>
        </div>
    )
}
