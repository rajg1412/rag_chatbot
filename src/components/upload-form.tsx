'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Upload, FileText, CheckCircle2, Loader2 } from 'lucide-react'

export function UploadForm() {
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 5 * 1024 * 1024) {
                toast.error('File size exceeds 5MB limit');
                return;
            }
            setFile(selectedFile);
        }
    }

    const handleUpload = async () => {
        if (!file) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Upload failed');
            }

            toast.success('File uploaded and processed successfully!')
            setFile(null)
            // Trigger refresh of document list
            window.dispatchEvent(new CustomEvent('document-uploaded'))
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setUploading(false)
        }
    }

    return (
        <Card className="w-full max-w-xl mx-auto mt-10">
            <CardHeader>
                <CardTitle>Upload Document</CardTitle>
                <CardDescription>
                    Upload a PDF file to add it to the RAG knowledge base.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <label
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300 transition-all"
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {file ? (
                            <>
                                <FileText className="w-12 h-12 mb-3 text-primary" />
                                <p className="mb-2 text-sm text-gray-500 font-semibold">{file.name}</p>
                                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(2)} KB</p>
                            </>
                        ) : (
                            <>
                                <Upload className="w-12 h-12 mb-3 text-gray-400" />
                                <p className="mb-2 text-sm text-gray-500 font-semibold">Click to upload or drag and drop</p>
                                <p className="text-xs text-gray-400">PDF documents (max 10MB)</p>
                            </>
                        )}
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        accept=".pdf"
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                </label>

                <Button
                    className="w-full h-12"
                    onClick={handleUpload}
                    disabled={!file || uploading}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Extracting Text...
                        </>
                    ) : (
                        'Upload & Extract Text'
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}
