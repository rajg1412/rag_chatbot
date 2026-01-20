import { getGeminiEmbeddingModel } from './gemini';
import { getPineconeIndex } from './pinecone';
import { Chunk } from './pdf-processor';

export async function generateEmbedding(text: string): Promise<number[]> {
    const model = getGeminiEmbeddingModel();
    const result = await model.embedContent(text.replace(/\n/g, ' '));
    return result.embedding.values;
}

export async function upsertVectors(chunks: Chunk[]) {
    const index = getPineconeIndex();

    if (chunks.length === 0) return;

    const model = getGeminiEmbeddingModel();

    // Gemini handles batching by sending the array directly
    const texts = chunks.map(chunk => chunk.text.replace(/\n/g, ' '));
    const result = await model.batchEmbedContents({
        requests: texts.map(t => ({ content: { role: 'user', parts: [{ text: t }] } }))
    });

    // 2. Map embeddings back to Pinecone format
    const upserts = result.embeddings.map((item, idx) => ({
        id: chunks[idx].id,
        values: item.values,
        metadata: {
            ...chunks[idx].metadata,
            text: chunks[idx].text,
        },
    }));

    // 3. Upsert to Pinecone
    await index.upsert(upserts);
}

export async function queryVectors(query: string, topK: number = 5) {
    const index = getPineconeIndex();
    const queryEmbedding = await generateEmbedding(query);

    const queryResponse = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
    });

    return queryResponse.matches.map((match) => ({
        text: match.metadata?.text as string,
        score: match.score,
        source: match.metadata?.source as string,
    }));
}
