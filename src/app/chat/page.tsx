import { ChatInterface } from '@/components/chat-interface'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ChatPage() {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        redirect('/login')
    }

    return (
        <div className="flex flex-col items-center min-h-screen p-4 md:p-8 bg-gray-50/50">
            <div className="w-full max-w-4xl text-center mb-6">
                <h1 className="text-3xl font-bold tracking-tight">RAG Assistant</h1>
                <p className="text-muted-foreground mt-2">
                    Expert document analysis at your fingertips.
                </p>
            </div>
            <ChatInterface />
        </div>
    )
}
