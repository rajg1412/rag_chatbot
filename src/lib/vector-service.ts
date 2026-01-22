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
    const BATCH_SIZE = 100;

    console.log(`[VectorService] Upserting ${chunks.length} chunks in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const texts = batch.map(chunk => chunk.text.replace(/\n/g, ' '));

        console.log(`[VectorService] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`);

        // 1. Get Embeddings for the batch
        const result = await model.batchEmbedContents({
            requests: texts.map(t => ({ content: { role: 'user', parts: [{ text: t }] } }))
        });

        // 2. Map to Pinecone format
        const upserts = result.embeddings.map((item, idx) => ({
            id: batch[idx].id,
            values: item.values,
            metadata: {
                ...batch[idx].metadata,
                text: batch[idx].text,
            },
        }));

        // 3. Upsert batch to Pinecone
        await index.upsert(upserts);
    }

    console.log(`[VectorService] Successfully upserted all chunks.`);
}

export async function queryVectors(query: string, topK: number = 5) {
    const index = getPineconeIndex();
    console.log(`[Pinecone] Searching for: "${query}" (topK: ${topK})`);
    const queryEmbedding = await generateEmbedding(query);

    const queryResponse = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
    });

    console.log(`[Pinecone] Found ${queryResponse.matches.length} matches.`);

    return queryResponse.matches.map((match) => ({
        text: match.metadata?.text as string,
        score: match.score,
        source: match.metadata?.source as string,
        pageRange: match.metadata?.pageRange as string,
    }));
}

export async function deleteVectorsBySource(source: string) {
    const index = getPineconeIndex();
    // In Pinecone, we can delete by metadata filtering if using serverless index
    // Or we can delete by ID prefix if we follow a convention.
    // Given the current implementation uses `${filename}-${index}` as ID, we can't easily delete by prefix if filename changes.
    // However, Pinecone supports deleting by filter.
    try {
        await index.deleteMany({
            source: { "$eq": source }
        });
        console.log(`[Pinecone] Deleted vectors for source: ${source}`);
    } catch (error) {
        console.error(`[Pinecone] Error deleting vectors:`, error);
        // We don't want to fail the whole deletion if Pinecone deletion fails
    }
}
