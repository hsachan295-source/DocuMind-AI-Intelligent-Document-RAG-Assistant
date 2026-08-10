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

@tool
def get_context(query: str) -> str:
    """
    Search the PDF knowledge base and return the most relevant text passages
    for the given query. Always call this tool before answering any question
    about the document.
    """
    docs = vectorstore.similarity_search(query, k=4)
    if not docs:
        return "No relevant information found in the document."

    passages = []
    for i, doc in enumerate(docs, 1):
        page = doc.metadata.get("page", "?")
        passages.append(f"[Passage {i} | Page {page}]\n{doc.page_content.strip()}")

    return "\n\n---\n\n".join(passages)


# ── 2. LLM (Groq — llama-3.3-70b-versatile) ───────────────────────────────────

groq_api_key = os.environ.get("GROQ_API_KEY", "").strip()

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    groq_api_key=groq_api_key,
    temperature=0.2,
)

# ── 3. System prompt ────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a helpful PDF assistant. Your job is to answer questions
strictly based on the document that has been indexed. Follow these rules:

1. ALWAYS use the get_context tool first before answering any question.
2. Base your answer ONLY on the retrieved passages — do not use outside knowledge.
3. If the retrieved passages do not contain enough information, say:
   "The document does not contain enough information to answer this question."
4. Quote or paraphrase from the passages to support your answer.
5. Keep answers clear, concise, and well-structured.
6. If asked to summarise, cover the key points from all retrieved passages."""

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
