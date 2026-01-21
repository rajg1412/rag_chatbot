import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: documents, error } = await supabase
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching documents:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(documents)
    } catch (error: any) {
        console.error('Documents Fetch Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
        }

        // 1. Get document details first to get storage path and name
        const { data: document, error: fetchError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', id)
            .single()

        if (fetchError || !document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        // 2. Delete from Supabase Storage
        const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([document.storage_path])

        if (storageError) {
            console.error('Error deleting from storage:', storageError)
            // Continue anyway to clean up DB
        }

        // 3. Delete from Pinecone if it was processed
        if (document.status === 'completed') {
            const { deleteVectorsBySource } = await import('@/lib/vector-service')
            await deleteVectorsBySource(document.name)
        }

        // 4. Delete from Database
        const { error: deleteError } = await supabase
            .from('documents')
            .delete()
            .eq('id', id)

        if (deleteError) {
            throw deleteError
        }

        return NextResponse.json({ message: 'Document deleted successfully' })
    } catch (error: any) {
        console.error('Delete Document Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
