import { getEncoding } from 'js-tiktoken';
const pdf = require('pdf-parse-fork');

const CHUNK_SIZE = 3000; // Max tokens per chunk
const encoding = getEncoding('cl100k_base');

export interface Chunk {
    id: string;
    text: string;
    metadata: {
        source: string;
        pageRange: string;
        timestamp: string;
    };
}

export async function extractText(buffer: Buffer): Promise<string> {
    const data = await pdf(buffer);
    console.log(`[PDF Extraction] Extracted ${data.text.length} characters.`);
    return data.text;
}

export async function processPdf(text: string, filename: string): Promise<Chunk[]> {
    const tokens = encoding.encode(text);
    const chunks: Chunk[] = [];

    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
        const chunkTokens = tokens.slice(i, i + CHUNK_SIZE);
        const chunkText = encoding.decode(chunkTokens);

        chunks.push({
            id: `${filename}-${Math.floor(i / CHUNK_SIZE)}`,
            text: chunkText,
            metadata: {
                source: filename,
                pageRange: `approx tokens ${i}-${i + CHUNK_SIZE}`,
                timestamp: new Date().toISOString(),
            },
        });
    }

    return chunks;
}
