import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GOOGLE_API_KEY) {
    throw new Error('Missing GOOGLE_API_KEY in environment variables');
}

export const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);


// Helper to get a working model by trying multiple names
export const getGeminiModel = async () => {
    const models = [
        // { name: 'gemini-2.0-flash-exp', version: 'v1beta' },
        // { name: 'gemini-1.5-flash', version: 'v1' },
        // { name: 'gemini-1.5-flash-latest', version: 'v1' },
        // { name: 'gemini-1.0-pro', version: 'v1beta' },
        // { name: 'gemini-pro', version: 'v1' }, version : 'v1beta'
        {name : 'gemini-2.5-flash-lite' }
    ];

    // 1. Try to find a working model
    for (const { name } of models) {
        try {
            const model = genAI.getGenerativeModel({ model: name });
            // Probe with a minimal request
            await model.generateContent({ contents: [{ role: 'user', parts: [{ text: 'h' }] }], generationConfig: { maxOutputTokens: 1 } });
            return model;
        } catch (e: any) {
            // Keep going if it fails
            console.warn(`Model ${name} failed (${e.message}), trying next...`);
        }
    }

    // 2. If all failed, return the high-priority one but let it error naturally so the user sees why
    return genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
};

export const getGeminiEmbeddingModel = (modelName: string = 'text-embedding-004') => {
    return genAI.getGenerativeModel({ model: modelName });
};
