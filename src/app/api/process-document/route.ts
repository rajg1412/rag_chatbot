import { NextRequest, NextResponse } from 'next/server'
import { processPdf } from '@/lib/pdf-processor'
import { upsertVectors } from '@/lib/vector-service'
import { getIsAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
    try {
        const isAdmin = await getIsAdmin()
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { documentId } = await req.json()
        if (!documentId) {
            return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })
        }

        // 1. Fetch document from DB
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()

        const { data: doc, error: fetchError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .single()

        if (fetchError || !doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        if (!doc.extracted_text) {
            return NextResponse.json({ error: 'No extracted text found for this document.' }, { status: 400 })
        }

        // 2. Process (Chunk & Embed)
        try {
            console.log(`[Process] Starting for document: ${doc.name} (${doc.id})`);
            const chunks = await processPdf(doc.extracted_text, doc.name);
            console.log(`[Process] Generated ${chunks.length} chunks`);

            await upsertVectors(chunks);
            console.log(`[Process] Vectors upserted to Pinecone`);

            // 3. Update status to 'completed'
            console.log(`[Process] Updating status to completed...`);
            const { error: updateError } = await supabase
                .from('documents')
                .update({ status: 'completed' })
                .eq('id', documentId)

            if (updateError) {
                console.error('[Process] Database update failed:', updateError);
                throw updateError;
            }
            console.log(`[Process] Status updated successfully`);

            return NextResponse.json({
                success: true,
                message: 'Document successfully processed and indexed.'
            })

        } catch (error: any) {
            console.error('Vector processing error:', error)
            // Update status to 'error'
            await supabase
                .from('documents')
                .update({ status: 'error' })
                .eq('id', documentId)

            throw error;
        }

    } catch (error: any) {
        console.error('Processing Error:', error)
        return NextResponse.json({
            error: error.message,
            tip: 'Check your Gemini API quota or Pinecone configuration.'
        }, { status: 500 })
    }
}
