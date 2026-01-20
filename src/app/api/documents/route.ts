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
