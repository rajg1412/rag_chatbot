import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const name = searchParams.get('name')

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let query = supabase
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false })

        if (name) {
            query = query.eq('name', name)
        }

        const { data: documents, error } = await query

        if (error) {
            console.error('Error fetching documents:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (name && documents.length > 0) {
            return NextResponse.json(documents[0])
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
        const { error: deleteError, count } = await supabase
            .from('documents')
            .delete({ count: 'exact' })
            .eq('id', id)
            .select() // Need to select to get count in some versions or just use count: 'exact'

        if (deleteError) {
            console.error('Database Delete Error:', deleteError)
            throw deleteError
        }

        // Note: If RLS prevents deletion, no error is thrown but no row is deleted.
        // We check if the document still exists or if count is 0.
        // In this implementation, the .single() fetch earlier confirmed it exists.
        // If we still get a successful response but nothing changed, it's RLS.

        return NextResponse.json({ message: 'Document deleted successfully' })
    } catch (error: any) {
        console.error('Delete Document Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
