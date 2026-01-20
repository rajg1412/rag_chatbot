import { ChatInterface } from '@/components/chat-interface'

export default function ChatPage() {
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
