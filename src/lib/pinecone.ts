import { Pinecone } from '@pinecone-database/pinecone';

if (!process.env.PINECONE_API_KEY) {
    throw new Error('Missing PINECONE_API_KEY');
}

export const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

export const getPineconeIndex = () => {
    const indexName = process.env.PINECONE_INDEX_NAME;
    const indexHost = process.env.PINECONE_HOST;

    if (!indexName) {
        throw new Error('Missing PINECONE_INDEX_NAME');
    }

    // If host is provided, it's faster and more reliable for connection
    if (indexHost) {
        return pinecone.index(indexName, indexHost);
    }

    return pinecone.index(indexName);
};
