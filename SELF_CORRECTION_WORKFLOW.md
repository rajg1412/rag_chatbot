# Self-Correction AI Workflow

This document explains how the "Self-Correction Loop" works in the RAG Chat Assistant. This feature ensures high accuracy by forcing the AI to double-check its own search results.

## Overview

The chatbot doesn't just give the first answer it thinks of. It follows a **3-Attempt Lifecycle** to ensure that data extracted from your PDFs is 100% correct.

## The 3-Attempt Lifecycle

### 1. Initial Generation
- The user asks a question.
- The AI calls the `search_documents` tool to find relevant context.
- The AI generates a draft answer formatted with `[ANSWER]` and `[CITED_SOURCES]`.

### 2. Mandatory Verification
Before showing the answer to you, the system sends a hidden "Verification Prompt" to the AI:
> *"Verify your answer. If it matches the documents perfectly, reply with [COMPLETED]. If not, fix it."*

### 3. Self-Correction Logic
- **Success (`[COMPLETED]`)**: If the AI confirms the answer is perfect, the loop breaks immediately and the answer is shown.
- **Correction Needed**: If the AI detects a mistake or missing information:
    - It uses the search tool again (Attempt #2).
    - It generates a corrected version.
    - It repeats the verification.
- **Final Safety**: If the AI fails to validate itself after **3 attempts**, the system stops the loop and returns the best available answer to prevent an infinite recursive loop.

## Technical Implementation

Located in: `src/lib/chat-service.ts`

```typescript
let attempts = 3;
while (attempts > 0) {
    // 1. Generate/Search
    // 2. Ask AI to Verify
    // 3. If AI says '[COMPLETED]' -> return
    // 4. Else -> attempts-- and repeat
}
```

## Benefits
- **Reduces Hallucinations**: The AI is forced to "re-read" the document snippets before finalizing.
- **Handles Complex Queries**: If the first search was too narrow, the AI can use its second attempt to search for different keywords.
- **Precise Citations**: Since the AI verifies its work, the source snippets shown in the UI are much more accurate.
