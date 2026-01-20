import { getGeminiModel } from './gemini';
import { queryVectors } from './vector-service';

export async function generateChatResponse(message: string) {
    // 1. Retrieve relevant context from Pinecone
    const contextMatches = await queryVectors(message, 5);
    const contextText = contextMatches
        .map((match) => `SOURCE: ${match.source}\nCONTENT: ${match.text}`)
        .join('\n\n---\n\n');

    // 2. Build the prompt
    const systemPrompt = `
You are a helpful AI assistant. Use the provided context to answer the user's question accurately.
If you don't know the answer or it's not in the context, say that you don't know based on the provided documents.
Do not make up information.

CONTEXT:
${contextText}
`;

    // 3. Generate response via Gemini
    const model = await getGeminiModel();
    const result = await model.generateContent([
        { text: systemPrompt },
        { text: `User Question: ${message}` }
    ]);
    const response = await result.response;

    return {
        answer: response.text(),
        sources: contextMatches.map((m) => m.source),
    };
}
