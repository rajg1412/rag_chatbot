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
    const options = {
        pagerender: (pageData: any) => {
            // Add a page marker that we can split/detect later
            return `\n[[PAGE_${pageData.pageIndex}]]\n` + pageData.getTextContent().then((textContent: any) => {
                return textContent.items.map((item: any) => item.str).join(' ');
            });
        }
    };
    const data = await pdf(buffer, options);
    console.log(`[PDF Extraction] Extracted ${data.text.length} characters.`);
    return data.text;
}

export async function processPdf(text: string, filename: string): Promise<Chunk[]> {
    // Split by our injected page markers
    const pageParts = text.split(/\[\[PAGE_(\d+)\]\]/);
    const chunks: Chunk[] = [];

    // The split result will look like: ["", "0", "page 1 text", "1", "page 2 text", ...]
    for (let i = 1; i < pageParts.length; i += 2) {
        const pageNum = parseInt(pageParts[i]) + 1;
        const pageText = pageParts[i + 1].trim();

        if (!pageText) continue;

        const tokens = encoding.encode(pageText);

        // If a page is huge, we chunk it within the page
        for (let j = 0; j < tokens.length; j += CHUNK_SIZE) {
            const chunkTokens = tokens.slice(j, j + CHUNK_SIZE);
            const chunkText = encoding.decode(chunkTokens);

            chunks.push({
                id: `${filename}-p${pageNum}-${Math.floor(j / CHUNK_SIZE)}`,
                text: chunkText,
                metadata: {
                    source: filename,
                    pageRange: pageNum.toString(),
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }

    // Fallback if no page markers were found
    if (chunks.length === 0) {
        const tokens = encoding.encode(text);
        for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
            chunks.push({
                id: `${filename}-${Math.floor(i / CHUNK_SIZE)}`,
                text: encoding.decode(tokens.slice(i, i + CHUNK_SIZE)),
                metadata: {
                    source: filename,
                    pageRange: "1",
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }

    return chunks;
}
