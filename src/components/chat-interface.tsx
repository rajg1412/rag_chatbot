'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Send, Bot, User, Loader2, Info } from 'lucide-react'
import { toast } from 'sonner'

interface Message {
    role: 'user' | 'assistant'
    content: string
    sources?: string[]
}

export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: 'Hello! I can answer questions based on the documents you have uploaded. How can I help you today?',
        },
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || loading) return

        const userMessage: Message = { role: 'user', content: input }
        setMessages((prev) => [...prev, userMessage])
        setInput('')
        setLoading(true)

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: input }),
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to get response');
            }

            const data = await res.json()
            const assistantMessage: Message = {
                role: 'assistant',
                content: data.answer,
                sources: data.sources,
            }
            setMessages((prev) => [...prev, assistantMessage])
        } catch (error: any) {
            toast.error(`Chat Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100-theme(spacing.16))] h-[80vh] w-full max-w-4xl mx-auto mt-4 p-4">
            <Card className="flex-1 flex flex-col overflow-hidden bg-white shadow-xl border-t-0 rounded-t-none">
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'
                                    }`}
                            >
                                <div
                                    className={`flex max-w-[80%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                        }`}
                                >
                                    <div
                                        className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-white'
                                            }`}
                                    >
                                        {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                                    </div>
                                    <div className="space-y-2">
                                        <div
                                            className={`rounded-lg px-4 py-2 text-sm shadow-sm ${msg.role === 'user'
                                                ? 'bg-primary text-white'
                                                : 'bg-gray-100 text-gray-800'
                                                }`}
                                        >
                                            {msg.content}
                                        </div>
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1">
                                                    <Info size={10} /> Sources:
                                                </span>
                                                {Array.from(new Set(msg.sources)).map((source, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded"
                                                    >
                                                        {source}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                        {loading && (
                            <div className="flex justify-start">
                                <div className="flex max-w-[80%] gap-3 flex-row">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border shadow bg-white">
                                        <Bot size={18} />
                                    </div>
                                    <div className="bg-gray-100 rounded-lg px-4 py-2 text-sm text-gray-800 flex items-center">
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Searching knowledge base...
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t bg-gray-50">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleSend()
                        }}
                        className="flex gap-2"
                    >
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question about your documents..."
                            className="flex-1"
                            disabled={loading}
                        />
                        <Button type="submit" disabled={loading || !input.trim()}>
                            <Send size={18} />
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    )
}
