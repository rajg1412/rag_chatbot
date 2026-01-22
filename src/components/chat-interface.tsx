'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Send, Bot, User, Loader2, Info, Eye, X, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
    role: 'user' | 'assistant'
    content: string
    sources?: { name: string, snippet: string }[]
    attempts?: number
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
    const [selectedDoc, setSelectedDoc] = useState<{ name: string, text: string } | null>(null)
    const [isViewerOpen, setIsViewerOpen] = useState(false)
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
                attempts: data.attempts,
            }
            setMessages((prev) => [...prev, assistantMessage])
        } catch (error: any) {
            toast.error(`Chat Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleViewSource = (source: { name: string, snippet: string }) => {
        setSelectedDoc({ name: source.name, text: source.snippet })
        setIsViewerOpen(true)
    }

    return (
        <div className="flex flex-col h-[700px] md:h-[800px] w-full max-w-5xl mx-auto mt-2 px-4 overflow-hidden relative">
            {/* Decorative Background Elements */}
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-40"></div>

            <Card className="flex-1 flex flex-col overflow-hidden bg-white/70 backdrop-blur-xl shadow-2xl border-white/50 rounded-2xl relative overflow-hidden">
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-50/30">
                    <div className="p-8 space-y-8">
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}
                            >
                                <div
                                    className={`flex max-w-[85%] md:max-w-[80%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    <div
                                        className={`flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-xl shadow-md border ${msg.role === 'user'
                                            ? 'bg-primary text-white border-primary/20'
                                            : 'bg-white text-primary border-gray-100'}`}
                                    >
                                        {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                                    </div>
                                    <div className={`space-y-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div
                                            className={`rounded-2xl px-5 py-3 text-sm shadow-sm whitespace-pre-wrap break-words leading-relaxed ${msg.role === 'user'
                                                ? 'bg-primary text-white rounded-tr-none'
                                                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'}`}
                                        >
                                            {msg.content}
                                        </div>

                                        {msg.role === 'assistant' && msg.attempts && (
                                            <div className="flex items-center gap-2">
                                                {msg.attempts <= 3 ? (
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 uppercase tracking-tighter">
                                                        <CheckCircle2 size={10} /> Verified {msg.attempts}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 uppercase tracking-tighter">
                                                        <XCircle size={10} /> Unverified ({msg.attempts})
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100/50 rounded-md text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                    <Info size={11} /> Sources
                                                </div>
                                                {msg.sources.map((source, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleViewSource(source)}
                                                        className="group bg-white hover:bg-primary/5 text-gray-600 border border-gray-100 text-[11px] px-3 py-1 rounded-full transition-all flex items-center gap-2 shadow-sm hover:shadow hover:border-primary/20"
                                                    >
                                                        <Eye size={12} className="text-gray-400 group-hover:text-primary transition-colors" />
                                                        <span className="font-medium">{source.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start animate-pulse">
                                <div className="flex max-w-[80%] gap-4 flex-row">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white shadow-sm">
                                        <Bot size={20} className="text-primary/50" />
                                    </div>
                                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-6 py-3 text-sm text-gray-500 flex items-center shadow-sm">
                                        <Loader2 className="w-4 h-4 animate-spin mr-3 text-primary" />
                                        Thinking...
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                <div className="p-6 border-t bg-white/50 backdrop-blur-md">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleSend()
                        }}
                        className="flex gap-3 relative max-w-4xl mx-auto"
                    >
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your question here..."
                            className="flex-1 h-12 bg-white border-gray-200 focus-visible:ring-primary/20 rounded-xl pr-14 shadow-inner transition-all hover:border-gray-300"
                            disabled={loading}
                        />
                        <Button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="absolute right-1 top-1 h-10 w-10 rounded-lg p-0 shadow-lg hover:shadow-primary/25 transition-all active:scale-95"
                        >
                            <Send size={18} />
                        </Button>
                    </form>
                </div>
            </Card>

            <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex justify-between items-center">
                            <span>Source: {selectedDoc?.name}</span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 mt-4 p-6 border rounded-md bg-white overflow-y-auto">
                        <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {selectedDoc?.text || ''}
                            </ReactMarkdown>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
