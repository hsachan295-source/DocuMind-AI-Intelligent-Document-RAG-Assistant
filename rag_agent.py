"""
rag_agent.py — LangChain agent that answers questions about an ingested PDF.

The agent has one tool — get_context — which performs a similarity search
against the Pinecone index and returns the top-k most relevant text chunks.
The Gemini LLM then uses those chunks (and only those chunks) to answer.

Usage:
    Interactive chat loop:
        python rag_agent.py

    Single question (non-interactive):
        python rag_agent.py --question "What is the story about?"

Note: AgentExecutor and create_tool_calling_agent are in langchain_classic
      (not langchain.agents) as of LangChain v1.3+.
"""

import argparse

import os
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from config import vectorstore

# ── 1. Retrieval tool ───────────────────────────────────────────────────────

# ── 1. Retrieval tool & Source tracking ──────────────────────────────────────

last_retrieved_sources = []

@tool
def get_context(query: str) -> str:
    """
    Search the document knowledge base and return the most relevant text passages
    for the given query. Always call this tool before answering any question.
    """
    global last_retrieved_sources
    TOP_K = 5
    docs = vectorstore.similarity_search(query, k=TOP_K)
    print(f"[RAG RETRIEVAL] Query: '{query}' -> top_k={len(docs)} chunks retrieved from Pinecone.")
    
    if not docs:
        last_retrieved_sources = []
        return "No relevant information found in the document."

    last_retrieved_sources = []
    passages = []
    for i, doc in enumerate(docs, 1):
        page = doc.metadata.get("page", None)
        section = doc.metadata.get("section", None)
        seq = doc.metadata.get("chunk_index", doc.metadata.get("seq_num", doc.metadata.get("chunk", i)))
        
        header_parts = [f"Passage {i}"]
        if page is not None:
            header_parts.append(f"Page {int(page) if isinstance(page, (int, float)) else page}")
        if section:
            header_parts.append(f"Section: {section}")
            
        header_str = f"[{' | '.join(header_parts)}]"
        passages.append(f"{header_str}\n{doc.page_content.strip()}")
        
        last_retrieved_sources.append({
            "page": page,
            "section": section,
            "chunk": seq
        })

    return "\n\n---\n\n".join(passages)


# ── 2. LLM (Groq — llama-3.3-70b-versatile) ───────────────────────────────────

groq_api_key = os.environ.get("GROQ_API_KEY", "").strip()

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    groq_api_key=groq_api_key,
    temperature=0.2,
)

# ── 3. System prompt ────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a professional AI Document Assistant. Your job is to answer questions
strictly based on the document passages provided.

Follow these strict output formatting and structure rules for EVERY answer:

1. HEADINGS & SECTIONS:
   - Always start with a clear main heading (e.g. "## Answer" or "## [Topic Title]").
   - Group long explanations into logical sections using numbered subheadings (e.g. "### 1. Section Name", "### 2. Section Name").

2. LISTS & TYPOGRAPHY:
   - Use numbered lists (1., 2.) for step-by-step instructions or sequential information.
   - Use bullet points (-) for listing multiple details or fields.
   - Use sub-bullets for related sub-details.
   - Use **bold text** for key terms, field names, metrics, and status labels.

3. STRUCTURED DATA & TABLES:
   - When presenting comparisons, multi-field properties, parameters, or structured data, render them as a clean Markdown table (| Field | Details |).

4. TRUTHFULNESS & STICK TO CONTEXT:
   - Base your answer ONLY on the retrieved passages — do not use outside knowledge.
   - If the retrieved passages do not contain enough information, state clearly:
     "The document does not contain enough information to answer this question."
   - Do NOT invent fake page numbers, fake citations, fake confidence scores, or fake metadata."""

# ── 4. Prompt template ──────────────────────────────────────────────────────

prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    MessagesPlaceholder(variable_name="chat_history", optional=True),
    ("human",  "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

# ── 5. Agent ────────────────────────────────────────────────────────────────

tools = [get_context]
agent = create_tool_calling_agent(llm=llm, tools=tools, prompt=prompt)

agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,          # set False to suppress tool call logs
    max_iterations=5,
    handle_parsing_errors=True,
)

# ── 6. Helpers ──────────────────────────────────────────────────────────────

def ask(question: str) -> str:
    """Run a single question through the agent and return the answer string."""
    try:
        result = agent_executor.invoke({"input": question})
        return result["output"]
    except Exception as err:
        print(f"[rag_agent] Agent tool calling encountered issue ({err}). Falling back to direct RAG retrieval...")
        context = get_context.invoke(question)
        fallback_messages = [
            ("system", SYSTEM_PROMPT),
            ("human", f"Document Passages:\n{context}\n\nQuestion: {question}")
        ]
        res = llm.invoke(fallback_messages)
        return res.content


def ask_with_sources(question: str) -> dict:
    """Run question through the pipeline and return answer string with retrieved source metadata."""
    global last_retrieved_sources
    last_retrieved_sources = []
    answer_text = ask(question)
    return {
        "answer": answer_text,
        "sources": last_retrieved_sources
    }


def chat_loop() -> None:
    """Interactive REPL — type 'exit' or 'quit' to stop."""
    print("\n" + "=" * 60)
    print("  PDF RAG Assistant  |  type 'exit' to quit")
    print("=" * 60 + "\n")

    while True:
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n[Assistant] Goodbye!")
            break

        if not user_input:
            continue
        if user_input.lower() in {"exit", "quit", "q"}:
            print("[Assistant] Goodbye!")
            break

        answer = ask(user_input)
        print(f"\nAssistant: {answer}\n")


# ── 7. Entry point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ask questions about your ingested PDF.")
    parser.add_argument(
        "--question", "-q",
        type=str,
        default=None,
        help="Single question to answer (omit for interactive chat loop).",
    )
    args = parser.parse_args()

    if args.question:
        print(f"\nQuestion: {args.question}")
        print(f"Answer:   {ask(args.question)}")
    else:
        chat_loop()
