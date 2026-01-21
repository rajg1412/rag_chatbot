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
        <div className="container mx-auto py-6">
            <h1 className="text-3xl font-bold text-center mb-4">RAG Assistant</h1>
            <p className="text-center text-gray-500 mb-8">
                Ask anything about your uploaded documents.
            </p>
            <ChatInterface />
        </div>
    )
}
