'use client'

import { useState, useEffect } from 'react'
import { FileText, Trash2, Loader2, Download, Eye } from 'lucide-react'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { ScrollArea } from "@/components/ui/scroll-area"

interface Document {
    id: string
    name: string
    storage_path: string
    created_at: string
    status?: string
    type?: string
    extracted_text?: string
}

export function DocumentList() {
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)

    const fetchDocuments = async () => {
        try {
            const response = await fetch('/api/documents')
            const data = await response.json()
            if (response.ok) {
                setDocuments(data)
            } else {
                toast.error(data.error || 'Failed to load documents')
            }
        } catch (error) {
            console.error('Error fetching docs:', error)
            toast.error('Failed to load documents')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDocuments()
        // Listen for custom event when a new file is uploaded
        window.addEventListener('document-uploaded', fetchDocuments)
        return () => window.removeEventListener('document-uploaded', fetchDocuments)
    }, [])

    const handleProcess = async (docId: string, docName: string) => {
        try {
            toast.info(`Starting processing for ${docName}...`)
            const res = await fetch('/api/process-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: docId })
            })

            const data = await res.json()
            if (res.ok) {
                toast.success('Processing complete! Document is now searchable.')
                fetchDocuments() // Refresh list
            } else {
                console.error('Processing failed:', data);
                toast.error(data.error || 'Processing failed');
                if (data.tip) {
                    toast.info(`Tip: ${data.tip}`);
                }
            }
        } catch (error) {
            console.error('Processing error:', error)
            toast.error('Failed to trigger processing')
        }
    }

    const handleDelete = async (docId: string, docName: string) => {
        if (!confirm(`Are you sure you want to delete "${docName}"? This will remove it from storage and search index.`)) {
            return
        }

        try {
            const res = await fetch(`/api/documents?id=${docId}`, {
                method: 'DELETE',
            })

            const data = await res.json()
            if (res.ok) {
                toast.success('Document deleted successfully')
                setDocuments(prev => prev.filter(d => d.id !== docId))
            } else {
                toast.error(data.error || 'Failed to delete document')
            }
        } catch (error) {
            console.error('Delete error:', error)
            toast.error('Failed to delete document')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (documents.length === 0) {
        return (
            <div className="text-center p-8 border-2 border-dashed rounded-lg bg-muted/20">
                <p className="text-muted-foreground">No documents uploaded yet.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Uploaded Documents
                </h2>
                <Button variant="outline" size="sm" onClick={fetchDocuments} disabled={loading}>
                    <Loader2 className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh List
                </Button>
            </div>

            <div className="grid gap-3">
                {documents.map((doc) => (
                    <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 bg-card border rounded-lg hover:shadow-md transition-all"
                    >
                        <div className="flex items-center gap-4 overflow-hidden">
                            <div className="p-2.5 bg-primary/10 rounded-md">
                                <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div className="overflow-hidden space-y-1">
                                <p className="font-medium truncate" title={doc.name}>{doc.name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className={`capitalize px-1.5 py-0.5 rounded-sm ${doc.status === 'completed' ? 'bg-green-100 text-green-700' :
                                        doc.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                            doc.status === 'error' ? 'bg-red-100 text-red-700' :
                                                'bg-secondary'
                                        }`}>
                                        {doc.status || 'uploaded'}
                                    </span>
                                    <span>•</span>
                                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                    {doc.type && (
                                        <>
                                            <span>•</span>
                                            <span className="uppercase">{doc.type.split('/')[1] || 'FILE'}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Process Button for Pending items */}
                            {doc.status !== 'completed' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 border-primary/20 text-primary hover:bg-primary/5"
                                    onClick={() => handleProcess(doc.id, doc.name)}
                                >
                                    <Loader2 className="w-3 h-3" />
                                    Sync to Pinecone
                                </Button>
                            )}

                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" title="View Extracted Text">
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                                    <DialogHeader>
                                        <DialogTitle className="flex justify-between items-center">
                                            <span>{doc.name}</span>
                                            <span className="text-xs text-muted-foreground font-normal">
                                                {doc.extracted_text?.length || 0} characters
                                            </span>
                                        </DialogTitle>
                                    </DialogHeader>
                                    <div className="flex-1 mt-4 p-4 border rounded-md bg-muted/50 overflow-y-auto">
                                        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                                            {doc.extracted_text || 'No text extracted or text is waiting to be processed...'}
                                        </pre>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <button
                                onClick={() => handleDelete(doc.id, doc.name)}
                                title="Delete Document"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    border: '1px solid #fee2e2',
                                    backgroundColor: 'transparent',
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#fef2f2';
                                    e.currentTarget.style.borderColor = '#fecaca';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.borderColor = '#fee2e2';
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
