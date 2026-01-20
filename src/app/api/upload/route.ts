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

        // 2. Record metadata in database (Status: Pending)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { error: dbError } = await supabase
                .from('documents')
                .insert({
                    name: file.name,
                    storage_path: storagePath,
                    user_id: user.id,
                    type: file.type,
                    status: 'pending',
                    extracted_text: extractedText // Store the raw text!
                })

            if (dbError) {
                console.error('Database error:', dbError)
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Document uploaded and text extracted. Ready for processing.'
        })
    } catch (error: any) {
        console.error('Upload Error:', error)

        return NextResponse.json({
            error: error.message,
            tip: 'If you see Quota Exceeded, your Gemini API key has a 0 limit. Try a different Google account or wait for activation.'
        }, { status: 500 })
    }
}
