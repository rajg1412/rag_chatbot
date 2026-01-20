import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
    try {
        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json({ error: 'Missing GOOGLE_API_KEY' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

        const modelsToProbe = [
            'gemini-2.0-flash-exp',
            'gemini-1.5-flash',
            'gemini-pro',
        ];

        const chatResults = await Promise.all(
            modelsToProbe.flatMap(modelName => [
                { name: modelName, version: 'v1' as const },
                { name: modelName, version: 'v1beta' as const }
            ]).map(async ({ name, version }) => {
                try {
                    const model = genAI.getGenerativeModel({ model: name }, { apiVersion: version });
                    await model.generateContent({ contents: [{ role: 'user', parts: [{ text: 'a' }] }], generationConfig: { maxOutputTokens: 1 } });
                    return { type: 'chat', model: name, version, status: 'available' };
                } catch (err: any) {
                    const msg = err.message || '';
                    let status = 'error';
                    if (msg.includes('429') || msg.includes('Quota')) status = 'quota_limit';
                    if (msg.includes('404')) status = 'not_found';
                    return { type: 'chat', model: name, version, status, message: msg };
                }
            })
        );

        return NextResponse.json({ chatResults });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
