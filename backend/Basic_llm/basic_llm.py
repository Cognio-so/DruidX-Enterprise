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
from thinking_states import send_thinking_state, BASIC_LLM_THINKING_STATES

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

async def _quick_kb_search(gpt_id: str, userId: str, query: str, is_hybrid: bool = False, limit: int = 4) -> list:
    """
    Quick KB search using pre-cached embeddings for SimpleLLM.
    Returns top 3-5 most relevant KB chunks for fast context injection.
    Uses gpt_id and userId to identify the collection.
    Checks Qdrant directly - no Redis cache needed.
    """
    try:
        from Rag.Rag import _search_collection, _hybrid_search_rrf, check_kb_collection_exists
        
        if not gpt_id or not userId:
            print(f"[SimpleLLM-KB] Missing gpt_id or userId")
            return []
        
        collection_name = f"kb_{gpt_id}_{userId}"
        
        # Check if collection exists in Qdrant directly
        collection_exists, has_data = await check_kb_collection_exists(gpt_id, userId)
        if not collection_exists or not has_data:
            print(f"[SimpleLLM-KB] KB collection not found or empty for gpt_id={gpt_id}, userId={userId}")
            return []
        
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
    gpt_id = gpt_config.get("gpt_id")
    userId = gpt_config.get("userId")
    
    try:
       
        kb_chunks = []
        kb_json_content = []
        # Check Qdrant directly instead of checking kb_docs in state
        if gpt_id and userId:
            print(f"[SimpleLLM-KB] Checking for KB availability...")
            is_hybrid = gpt_config.get("hybridRag", False)
            kb_chunks = await _quick_kb_search(gpt_id, userId, user_query, is_hybrid=is_hybrid, limit=2)
            print(f"[SimpleLLM-KB] Retrieved {len(kb_chunks)} KB chunks")
            
            # Retrieve JSON KB documents (even if no embedded chunks found)
            from Rag.Rag import get_json_documents
            kb_json_content = await get_json_documents(is_kb=True, gpt_id=gpt_id, userId=userId)
            if kb_json_content:
                print(f"[SimpleLLM-KB] Retrieved {len(kb_json_content)} JSON KB documents")
            elif not kb_chunks:
                # No embedded chunks and no JSON - KB is empty
                print(f"[SimpleLLM-KB] No KB documents found (neither embedded nor JSON)")
        elif not gpt_id or not userId:
            print(f"[SimpleLLM-KB] Missing gpt_id or userId, skipping KB search")
        from langchain_groq import ChatGroq
        from llm import get_llm, stream_with_token_tracking
        from api_keys_util import get_api_keys_from_session
        api_keys = await get_api_keys_from_session(state.get("session_id")) if state else {}
        chat=get_llm(llm_model, temperature=0.9, api_keys=api_keys)
        # chat = get_llm("openai/gpt-oss-120b", 0.8)
    #     chat= ChatGroq(
    #     model="openai/gpt-oss-20b",  
    #     temperature=0.9,
    #     streaming=True,
    #     reasoning_effort="medium",
    #     groq_api_key=os.getenv("GROQ_API_KEY")
    # )
        
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
            
            for i, m in enumerate(past_messages[-4:], 1):  
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
        
        # Add JSON KB documents to context
        json_context = ""
        if kb_json_content:
            json_context = "\n\n# KNOWLEDGE BASE JSON DOCUMENTS (Full Content):\n"
            for i, json_content in enumerate(kb_json_content, 1):
                json_context += f"\n## JSON Document {i}:\n{json_content}\n"
            kb_context += json_context
        
        custom_instructions = ""
        if custom_system_prompt:
            custom_instructions = f"\n\n# AVAILABLE CUSTOM INSTRUCTIONS:\n{custom_system_prompt}"
        
        # Build context sources description
        kb_sources = []
        if kb_chunks:
            kb_sources.append(f"{len(kb_chunks)} embedded chunks")
        if kb_json_content:
            kb_sources.append(f"{len(kb_json_content)} JSON document(s)")
        kb_status = ", ".join(kb_sources) if kb_sources else "Not available"
        
        enhanced_prompt = f"""{STATIC_SYS}

{custom_instructions}

{kb_context}

# INTELLIGENT RESPONSE GUIDELINES

You are an intelligent assistant that can access multiple context sources. Analyze the user's query and respond appropriately using only the most relevant context sources.

CONTEXT SOURCES AVAILABLE:
1. **Custom Instructions**: {f"Available ({len(custom_system_prompt.split())} words)" if custom_system_prompt else "Not available"}
2. **Knowledge Base**: {kb_status}
3. **Conversation History**: {f"Available ({len(past_messages)} messages)" if past_messages else "Not available"}
4. **General Knowledge**: Always available

CRITICAL INSTRUCTIONS:
{"**IMPORTANT: JSON Schema Available in Knowledge Base**" if kb_json_content else ""}
{"- A JSON schema/document is available in the Knowledge Base above. You MUST use this JSON schema when the user asks about design, components, or related tasks." if kb_json_content else ""}
{"- DO NOT ask the user to provide the JSON schema - it's already available in the Knowledge Base context above." if kb_json_content else ""}
{"- When the user says 'design', 'create component', or similar, immediately use the JSON schema from the Knowledge Base to generate the requested design/component." if kb_json_content else ""}
{"- Follow the Custom Instructions above which specify how to use the JSON schema for design tasks." if (kb_json_content and custom_system_prompt) else ""}

INTELLIGENT DECISION RULES:
- **For design/component creation tasks**: {"USE the JSON schema from Knowledge Base immediately. Do not ask for it." if kb_json_content else "Use Custom Instructions if available"}
- **For general knowledge questions** (stories, explanations, creative content): Use your general knowledge, ignore specialized context unless directly relevant
- **For domain-specific questions**: Use Knowledge Base context if it's relevant to the query
- **For content processing tasks**: Use Custom Instructions if they help format/process the content appropriately
- **For follow-up questions**: Use Conversation History to maintain context and continuity
- **For mixed queries**: Combine relevant sources intelligently

RESPONSE STRATEGY:
1. Analyze what the user is actually asking for
2. {"If JSON schema is in Knowledge Base and user asks about design/component, USE IT IMMEDIATELY" if kb_json_content else "Determine which context sources (if any) are relevant and helpful"}
3. Respond naturally using only the relevant context
4. If context sources are not relevant, ignore them and use general knowledge
5. Be conversational and helpful while being accurate

Remember: {"When JSON schema is available in KB, USE IT for design tasks. Don't ask the user to provide it again." if kb_json_content else "Only use context sources when they genuinely help answer the user's question. Don't force irrelevant context into your response."}"""

        system_msg = SystemMessage(content=enhanced_prompt)
        messages = [system_msg] + formatted_history + [HumanMessage(content=f"CURRENT USER INPUT: {user_query}")]

        # Start thinking states loop
        thinking_result = await send_thinking_state(
            state, "SimpleLLM", BASIC_LLM_THINKING_STATES, interval=2.0
        )
        thinking_task, stop_flag = thinking_result if thinking_result else (None, None)

        try:
            full_response, _ = await stream_with_token_tracking(
                chat,
                messages,
                chunk_callback=chunk_callback,
                state=state
            )
        finally:
            # Stop thinking states when response starts
            if stop_flag:
                stop_flag.set()
            if thinking_task:
                thinking_task.cancel()
                try:
                    await thinking_task
                except asyncio.CancelledError:
                    pass
        
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
