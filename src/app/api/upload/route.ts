import { NextRequest, NextResponse } from 'next/server'
import { extractText, processPdf } from '@/lib/pdf-processor'
import { upsertVectors } from '@/lib/vector-service'
import { getIsAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
    try {
        const isAdmin = await getIsAdmin()

        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())

        // 1. Upload to Supabase Storage
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()
        const storagePath = `${Date.now()}-${file.name}`

        const { error: storageError } = await supabase.storage
            .from('documents')
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: true
            })

        if (storageError) {
            console.error('Storage error:', storageError)
            throw new Error(`Failed to upload to storage: ${storageError.message}`)
        }

        // 1.5 Extract Text immediately
        const extractedText = await extractText(buffer);

        // 2. Record metadata in database
        const { data: { user } } = await supabase.auth.getUser()
        let docId = null;
        if (user) {
            const { data: newDoc, error: dbError } = await supabase
                .from('documents')
                .insert({
                    name: file.name,
                    storage_path: storagePath,
                    user_id: user.id,
                    type: file.type,
                    status: 'processing', // Start as processing
                    extracted_text: extractedText
                })
                .select()
                .single()

            if (dbError) {
                console.error('Database error:', dbError)
            } else {
                docId = newDoc.id;
            }
        }

        // 3. Automatically trigger vector processing in background
        if (docId) {
            try {
                console.log(`[Upload] Automatically processing vectors for doc: ${docId}`);
                const chunks = await processPdf(extractedText, file.name);
                await upsertVectors(chunks);

                // 4. Update status to completed
                await supabase
                    .from('documents')
                    .update({ status: 'completed' })
                    .eq('id', docId);

                console.log(`[Upload] Document successfully indexed.`);
            } catch (err: any) {
                console.error('[Upload] Background processing failed:', err);
                await supabase
                    .from('documents')
                    .update({ status: 'error' })
                    .eq('id', docId);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Document uploaded and automatically indexed!'
        })
    } catch (error: any) {
        console.error('Upload Error:', error)

        return NextResponse.json({
            error: error.message,
            tip: 'If you see Quota Exceeded, your Gemini API key has a 0 limit. Try a different Google account or wait for activation.'
        }, { status: 500 })
    }
}
