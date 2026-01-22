import { getEncoding } from 'js-tiktoken';
const pdf = require('pdf-parse-fork');

const CHUNK_SIZE = 3000; // Smaller chunks for better density
const OVERLAP = 200;     // Overlap between chunks
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
        pagerender: async (pageData: any) => {
            const textContent = await pageData.getTextContent();
            let lastY;
            let text = `\n[[PAGE_${pageData.pageIndex}]]\n`;
            for (let item of textContent.items) {
                if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 2) {
                    text += '\n';
                }
                text += item.str + (item.hasAlternativeText ? ' ' : '');
                lastY = item.transform[5];
            }
            return text;
        }
    };
    const data = await pdf(buffer, options);

    // Clean up the text: remove literal '\n' strings and fix encoding artifacts
    let cleanedText = data.text
        .replace(/\\n/g, '\n') // Fix escaped newlines
        .replace(/\\t/g, ' ')  // Fix escaped tabs
        .replace(/\r/g, '\n')  // Normalize carriage returns
        .replace(/\n\s*\n/g, '\n\n') // Consolidate multiple newlines
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "") // Remove non-printable control chars
        .trim();

    // Aggressive Mojibake / Garbled text removal
    // This regex looks for sequences that are typical in extraction errors (high-ASCII/symbol heavy clusters)
    // We target sequences of 3+ high-ASCII characters that usually compose the junk the user showed.
    cleanedText = cleanedText
        .replace(/[£ÉÉ®iéBÉEÉºÉÆÉÊvÉÉxÉ]{3,}/g, '') // Target specific junk sequences shown by user
        .replace(/[\u0080-\uFFFF]{2,}/g, (match: string) => {
            // If it's a long string of non-standard chars, it's likely junk
            return match.length > 4 ? '' : match;
        });

    // If the text looks like it has multiple encoding issues, try a basic cleanup
    // This is a gamble but can help with common Mojibake

    console.log(`[PDF Extraction] Extracted ${cleanedText.length} characters.`);
    return cleanedText;
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

        // Chunk with overlap within the page
        for (let j = 0; j < tokens.length; j += (CHUNK_SIZE - OVERLAP)) {
            const chunkTokens = tokens.slice(j, j + CHUNK_SIZE);
            const chunkText = encoding.decode(chunkTokens);

            chunks.push({
                id: `${filename}-p${pageNum}-${Math.floor(j / (CHUNK_SIZE - OVERLAP))}`,
                text: chunkText,
                metadata: {
                    source: filename,
                    pageRange: pageNum.toString(),
                    timestamp: new Date().toISOString(),
                },
            });

            // If we reached the end of the tokens, break
            if (j + CHUNK_SIZE >= tokens.length) break;
        }
    }

    // Fallback if no page markers were found
    if (chunks.length === 0) {
        const tokens = encoding.encode(text);
        for (let i = 0; i < tokens.length; i += (CHUNK_SIZE - OVERLAP)) {
            const chunkTokens = tokens.slice(i, i + CHUNK_SIZE);
            chunks.push({
                id: `${filename}-${Math.floor(i / (CHUNK_SIZE - OVERLAP))}`,
                text: encoding.decode(chunkTokens),
                metadata: {
                    source: filename,
                    pageRange: "1",
                    timestamp: new Date().toISOString(),
                },
            });
            if (i + CHUNK_SIZE >= tokens.length) break;
        }
    }

    return chunks;
}
