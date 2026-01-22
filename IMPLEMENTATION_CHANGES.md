# AI Function Calling Implementation Details

I have upgraded the chatbot from a simple RAG (Retrieval-Augmented Generation) flow to a more intelligent **Function Calling (Tools)** architecture.

## What has changed?

### 1. Architectural Shift
*   **Old Logic:** The code would *always* search Pinecone for every user message, even if the user just said "Hello" or asked a general question. This wasted Pinecone quota and forced irrelevant context into the AI's prompt.
*   **New Logic (Function Calling):** The AI is now given a tool called `search_documents`. It **decides** if it needs to use that tool based on the user's question. If the user asks a general question, the AI replies directly. If the user asks about their PDFs, the AI triggers the search tool.

### 2. Code Changes in `src/lib/chat-service.ts`
*   **Tool Definition:** Added a `search_documents` function declaration that describes what the tool does and what parameters (`query`) it expects.
*   **Chat Session:** Replaced `model.generateContent` with `model.startChat`. Function calling in Gemini works best within a chat session.
*   **Tool Call Loop:** Implemented a recursive `while` loop that:
    1.  Checks if the AI wants to call a function.
    2.  If yes, it executes the actual search code (`queryVectors`) in the background.
    3.  Sends the results back to the AI.
    4.  Repeats if the AI needs more information (multi-step reasoning).
    5.  Returns the final conversational answer.

### 3. Benefits of this Change
*   **Intelligence:** The AI is now aware that it is searching. It can refine its own search queries to get better results.
*   **Efficiency:** We only call Pinecone when actually necessary.
*   **Cleaner Prompts:** We no longer "cram" PDF text into every single message. The prompt stays small and relevant.
*   **Expandability:** In the future, we can easily add more tools (like `delete_document`, `send_email`, etc.) just by adding them to the tool list.

---
*Implementation completed on January 21, 2026.*
