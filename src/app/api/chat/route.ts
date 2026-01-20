import { NextRequest, NextResponse } from 'next/server'
import { generateChatResponse } from '@/lib/chat-service'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { message } = await req.json()

        if (!message) {
            return NextResponse.json({ error: 'No message provided' }, { status: 400 })
        }

        const response = await generateChatResponse(message)

        return NextResponse.json(response)
    } catch (error: any) {
        console.error('Chat error detail:', error)

        let suggestion = 'Your Gemini API key might have a 0 quota. Try creating a new key in Google AI Studio or check your billing settings.';
        if (error.message?.includes('429')) {
            suggestion = 'QUOTA EXCEEDED (Limit 0). This usually means your Google Cloud project needs a billing account, or you are in a region without Free Tier. Please trying using a different Google Account (Personal) or add billing.';
        }

        return NextResponse.json({
            error: error.message || 'Internal Server Error',
            suggestion
        }, { status: 500 })
    }
}
