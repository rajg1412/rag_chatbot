import { getGeminiModel } from './gemini';
import { queryVectors } from './vector-service';

export async function generateChatResponse(message: string) {
    const model = await getGeminiModel();

    const tools = [
        {
            functionDeclarations: [
                {
                    name: 'search_documents',
                    description: 'Search for information within uploaded PDF documents.',
                    parameters: {
                        type: 'OBJECT' as any,
                        properties: {
                            query: {
                                type: 'STRING' as any,
                                description: 'The search query.'
                            }
                        },
                        required: ['query']
                    }
                }
            ]
        }
    ];

    const chat = model.startChat({
        tools: tools,
        systemInstruction: {
            role: 'system',
            parts: [{
                text: `You are an expert Document Analysis AI. 
                
                STRICT PROTOCOL:
                1. Call 'search_documents' for EVERY user question.
                2. Use ONLY the extracted text provided by the tool to answer.
                3. NEVER use your internal knowledge. If the info is missing, reply: "Not found in the provided documents."
                4. CITE your sources: (File: Name, Page: Range).
                
                RESPONSE FORMAT:
                [ANSWER]
                (Your grounded answer)
                [/ANSWER]

                [CITED_SOURCES]
                - Source: "FileName", Page: "PageRange", Snippet: "Directly used text"
                [/CITED_SOURCES]`
            }]
        },
        history: [],
    });

    let currentResponse: any = null;
    let iterations = 0;
    const MAX_TOTAL_CALLS = 3; // Safety cap for all round trips

    // Initial Send
    let result = await chat.sendMessage(message);
    currentResponse = result.response;

    let lastValidFullText = "";
    let lastDitchAnswer = "";

    console.log(`[ChatService] Query: "${message}"`);

    // Main Loop: Handles Tool Calls and Self-Correction re-checks
    while (iterations < MAX_TOTAL_CALLS) {
        iterations++;
        const parts = currentResponse.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find((p: any) => p.text)?.text || "";

        if (textPart) {
            console.log(`[ChatService] AI Part (Iter ${iterations}): ${textPart.substring(0, 50)}...`);
            lastDitchAnswer = textPart;
            if (textPart.includes("[ANSWER]")) {
                lastValidFullText = textPart;
            }
        }

        const calls = parts.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);

        if (calls.length > 0) {
            console.log(`[ChatService] Processing tool calls...`);
            const functionResponses = [];
            for (const call of calls) {
                if (call.name === 'search_documents') {
                    const args = call.args as { query: string };
                    const contextMatches = await queryVectors(args.query, 10);
                    const contextText = contextMatches
                        .map((match) => `SOURCE: ${match.source}\nPAGE: ${match.pageRange}\nCONTENT: ${match.text}`)
                        .join('\n\n---\n\n');

                    functionResponses.push({
                        functionResponse: {
                            name: 'search_documents',
                            response: { content: contextText }
                        }
                    });
                }
            }
            const toolResult = await chat.sendMessage(functionResponses);
            currentResponse = toolResult.response;
            continue;
        }

        // Verification logic
        if (textPart && !textPart.toLowerCase().includes("[completed]") && iterations < MAX_TOTAL_CALLS - 1) {
            console.log(`[ChatService] Verification Prompting...`);
            const verificationPrompt = "Verify your answer against the documents. If it is 100% accurate and strictly grounded, reply '[COMPLETED]'. If you used outside knowledge or missed details, use 'search_documents' again or fix the text. Wrap the final answer in [ANSWER] and [CITED_SOURCES].";
            const verResult = await chat.sendMessage(verificationPrompt);
            currentResponse = verResult.response;
            continue;
        }

        break;
    }

    // Use either the final text (if it has the answer) or the last valid one we tracked
    let finalFullText = currentResponse.text() || "";
    console.log(`[ChatService] Final AI Text length: ${finalFullText.length}`);

    if (finalFullText.length < 50 && !finalFullText.includes("[ANSWER]") && lastValidFullText) {
        console.log(`[ChatService] Recovered from lastValidFullText`);
        finalFullText = lastValidFullText;
    } else if (!finalFullText.includes("[ANSWER]") && lastDitchAnswer.length > 50) {
        console.log(`[ChatService] Recovered from lastDitchAnswer`);
        finalFullText = lastDitchAnswer;
    }

    // Improved Regex parsing
    const answerMatch = finalFullText.match(/\[ANSWER\]([\s\S]*?)\[\/ANSWER\]/i);
    const sourcesMatch = finalFullText.match(/\[CITED_SOURCES\]([\s\S]*?)\[\/CITED_SOURCES\]/i);

    let answer = "";
    if (answerMatch) {
        answer = answerMatch[1].trim();
    } else {
        answer = finalFullText.split(/\[CITED_SOURCES\]/i)[0].replace(/\[ANSWER\]/i, "").trim();
    }

    // Clean up markers
    answer = answer.replace(/\[COMPLETED\]/gi, "").trim();
    answer = answer.replace(/\\n/g, '\n');

    if (!answer || answer.length < 5) {
        console.log(`[ChatService] Answer still empty, checking fallback...`);
        if (finalFullText.toLowerCase().includes("not found")) {
            answer = "Not found in the provided documents.";
        } else {
            answer = finalFullText.replace(/\[\/?(ANSWER|CITED_SOURCES|COMPLETED)\]/gi, "").trim() || "I'm sorry, I couldn't process an answer from the documents.";
        }
    }

    const sourcesContent = (sourcesMatch?.[1] || "").trim();
    const finalSources = sourcesContent.split('\n')
        .filter((line: string) => line.trim().startsWith('-'))
        .map((line: string) => {
            const content = line.trim().substring(1);

            const sourceName = content.match(/Source:\s*"([^"]+)"/)?.[1];
            const pageRange = content.match(/Page:\s*"([^"]+)"/)?.[1];
            const snippet = content.match(/Snippet:\s*"([^"]+)"/)?.[1];

            const displayName = sourceName + (pageRange ? ` (Page: ${pageRange})` : '');
            return sourceName ? { name: displayName, snippet: snippet || "" } : null;
        })
        .filter((s: { name: string, snippet: string } | null): s is { name: string, snippet: string } => s !== null && s.name !== "");

    return {
        answer: answer,
        sources: finalSources,
    };
}

