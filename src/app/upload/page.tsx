import { UploadForm } from '@/components/upload-form'
import { DocumentList } from '@/components/document-list'
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
        <div className="container mx-auto py-10 px-4 max-w-4xl space-y-12">
            <div>
                <h1 className="text-3xl font-bold mb-8">Admin Dashboard - Upload Documents</h1>
                <UploadForm />
            </div>

            <hr className="border-muted" />

            <div>
                <DocumentList />
            </div>
        </div>
    )
}
