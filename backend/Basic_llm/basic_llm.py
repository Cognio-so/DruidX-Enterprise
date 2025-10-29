from graph_type import GraphState
from langchain_core.prompts import ChatPromptTemplate
from typing import Optional, Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
import os
from langchain_google_genai import ChatGoogleGenerativeAI
import os
from prompt_cache import normalize_prefix
import asyncio

# Remove this line - don't set it at module level
# google_api_key=os.getenv("GOOGLE_API_KEY", "")

# === Prompt caching setup ===
CORE_PREFIX_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "core_prefix.md")

BASIC_RULES_PATH = os.path.join(os.path.dirname(__file__), "basic_llm.md")

# Load static system parts once
CORE_PREFIX = ""
BASIC_RULES = ""
try:
    with open(CORE_PREFIX_PATH, "r", encoding="utf-8") as f:
        CORE_PREFIX = f.read()
except FileNotFoundError:
    CORE_PREFIX = "You are a helpful AI assistant."

try:
    with open(BASIC_RULES_PATH, "r", encoding="utf-8") as f:
        BASIC_RULES = f.read()
except FileNotFoundError:
    BASIC_RULES = "Follow standard instructions."

# Combine into one normalized static system prefix (identical every call)
STATIC_SYS = normalize_prefix([CORE_PREFIX, BASIC_RULES])

async def _quick_kb_search(session_id: str, query: str, limit: int = 4) -> list:
    """
    Quick KB search using pre-cached embeddings for SimpleLLM.
    Returns top 3-5 most relevant KB chunks for fast context injection.
    """
    try:
        from Rag.Rag import KB_EMBEDDING_CACHE, _search_collection, _hybrid_search_rrf
        
        if session_id not in KB_EMBEDDING_CACHE:
            print(f"[SimpleLLM-KB] No KB cache found for session {session_id}")
            return []
        
        cache_data = KB_EMBEDDING_CACHE[session_id]
        collection_name = cache_data["collection_name"]
        is_hybrid = cache_data["is_hybrid"]
        
        print(f"[SimpleLLM-KB] Searching KB collection: {collection_name} (hybrid: {is_hybrid})")
        
        if is_hybrid:
            kb_chunks = await _hybrid_search_rrf(collection_name, query, limit=limit, k=60)
        else:
            kb_chunks = await _search_collection(collection_name, query, limit=limit)
        
        print(f"[SimpleLLM-KB] Retrieved {len(kb_chunks)} KB chunks for query: {query[:50]}...")
        return kb_chunks
        
    except Exception as e:
        print(f"[SimpleLLM-KB] Error retrieving KB context: {e}")
        return []


async def SimpleLLm(state: GraphState) -> GraphState:
    llm_model = state.get("llm_model", "gpt-4o-mini")
    user_query = state.get("user_query", "")
    past_messages = state.get("messages", [])
    summary = state.get("context", {}).get("session", {}).get("summary", "")
    chunk_callback = state.get("_chunk_callback")
    gpt_config = state.get("gpt_config", {})
    custom_system_prompt = gpt_config.get("instruction", "")
    kb_docs = state.get("kb", {})
    session_id = state.get("session_id", "default")
    
    try:
        print(f"SimpleLLM processing query: {user_query}")
        print(f"Using model: {llm_model}")
        print(f"Past messages count: {len(past_messages)}")
        
        kb_chunks = []
        if kb_docs and session_id:
            print(f"[SimpleLLM-KB] Checking for KB availability...")
            kb_chunks = await _quick_kb_search(session_id, user_query, limit=4)
            print(f"[SimpleLLM-KB] Retrieved {len(kb_chunks)} KB chunks")
        from langchain_groq import ChatGroq
        from llm import get_llm
        # chat = get_llm("openai/gpt-oss-120b", 0.8)
        chat= ChatGroq(
        model="openai/gpt-oss-20b",  
        temperature=0.9,
        streaming=True,
        reasoning_effort="medium",
        groq_api_key=os.getenv("GROQ_API_KEY")
    )
        
        # Build conversation history
        formatted_history = []
        if summary or past_messages:
            if summary:
                formatted_history.append(SystemMessage(content=f"""
# CONVERSATION CONTEXT

## Summary
{summary}

## Recent Messages
"""))
            
            for i, m in enumerate(past_messages[-2:], 1):  
                role = (m.get("type") or m.get("role") or "").lower()
                content = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
                
                if content:
                    if len(content.split()) > 500:
                        content = " ".join(content.split()[:500]) + "..."
                    
                    timestamp = m.get("timestamp", f"Message {i}")
                    
                    if role in ("human", "user"):
                        formatted_history.append(HumanMessage(content=f"""
**{timestamp} - User:**
{content}
"""))
                    else:
                        formatted_history.append(AIMessage(content=f"""
**{timestamp} - Assistant:**
{content}
"""))
        kb_context = ""
        if kb_chunks:
            kb_context = f"\n\n# AVAILABLE KNOWLEDGE BASE CONTEXT:\n{chr(10).join(kb_chunks)}"
        
        custom_instructions = ""
        if custom_system_prompt:
            custom_instructions = f"\n\n# AVAILABLE CUSTOM INSTRUCTIONS:\n{custom_system_prompt}"
        enhanced_prompt = f"""{STATIC_SYS}

{custom_instructions}

{kb_context}

# INTELLIGENT RESPONSE GUIDELINES

You are an intelligent assistant that can access multiple context sources. Analyze the user's query and respond appropriately using only the most relevant context sources.

CONTEXT SOURCES AVAILABLE:
1. **Custom Instructions**: {f"Available ({len(custom_system_prompt.split())} words)" if custom_system_prompt else "Not available"}
2. **Knowledge Base**: {f"Available ({len(kb_chunks)} chunks)" if kb_chunks else "Not available"}  
3. **Conversation History**: {f"Available ({len(past_messages)} messages)" if past_messages else "Not available"}
4. **General Knowledge**: Always available

INTELLIGENT DECISION RULES:
- **For general knowledge questions** (stories, explanations, creative content): Use your general knowledge, ignore specialized context unless directly relevant
- **For domain-specific questions**: Use Knowledge Base context if it's relevant to the query
- **For content processing tasks**: Use Custom Instructions if they help format/process the content appropriately
- **For follow-up questions**: Use Conversation History to maintain context and continuity
- **For mixed queries**: Combine relevant sources intelligently

RESPONSE STRATEGY:
1. Analyze what the user is actually asking for
2. Determine which context sources (if any) are relevant and helpful
3. Respond naturally using only the relevant context
4. If context sources are not relevant, ignore them and use general knowledge
5. Be conversational and helpful while being accurate

Remember: Only use context sources when they genuinely help answer the user's question. Don't force irrelevant context into your response."""

        system_msg = SystemMessage(content=enhanced_prompt)
        messages = [system_msg] + formatted_history + [HumanMessage(content=f"CURRENT USER INPUT: {user_query}")]

        print(f"Sending messages to LLM: {len(messages)} messages")
        print(f"Current query: {user_query}")
        print(f"Available context: KB={len(kb_chunks)} chunks, Custom={bool(custom_system_prompt)}, History={len(past_messages)} messages")
    
        full_response = ""
        async for chunk in chat.astream(messages):
            if hasattr(chunk, 'content') and chunk.content:
                full_response += chunk.content
                
                if chunk_callback:
                    await chunk_callback(chunk.content)
        
        if chunk_callback:
            await chunk_callback("\n\n")
            full_response += "\n\n"
        
        print(f"SimpleLLM response received: {full_response[:100]}...")
        state["response"] = full_response
        print(f"State updated with response: {bool(state.get('response'))}")
        return state

    except Exception as e:
        print(f"Error in SimpleLLM: {e}")
        import traceback
        traceback.print_exc()
        state["response"] = f"Error in SimpleLLM: {e}"
        return state
