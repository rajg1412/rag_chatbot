import { UploadForm } from '@/components/upload-form'
import { DocumentList } from '@/components/document-list'
import { getIsAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function UploadPage() {
    const isAdmin = await getIsAdmin()

    if (!isAdmin) {
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
