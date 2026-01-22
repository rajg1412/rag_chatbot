import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GOOGLE_API_KEY) {
    throw new Error('Missing GOOGLE_API_KEY in environment variables');
}

export const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);


// Helper to get a working model by trying multiple names
export const getGeminiModel = async () => {
    const models = [
        { name: 'gemini-2.5-flash' },
        { name: 'gemini-2.0-flash-exp' },
        { name: 'gemini-2.5-flash-pro' }
    ];

    // 1. Try to find a working model
    for (const { name } of models) {
        try {
            const model = genAI.getGenerativeModel({ model: name });
            // Probe with a minimal request
            await model.generateContent({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 1 } });
            return model;
        } catch (e: any) {
            // Keep going if it fails
            console.warn(`Model ${name} failed, trying next...`);
        }
    }

    // 2. If all failed, return the high-priority one
    return genAI.getGenerativeModel({ model: 'gemini-2.5-flash-pro' });
};

export const getGeminiEmbeddingModel = (modelName: string = 'text-embedding-004') => {
    return genAI.getGenerativeModel({ model: modelName });
};
