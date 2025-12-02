from graph_type import GraphState
from langchain_core.prompts import ChatPromptTemplate
from typing import Optional, Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
import os
import json
import asyncio
from typing import List
from langchain_google_genai import ChatGoogleGenerativeAI
import os
from prompt_cache import normalize_prefix
from llm import get_llm
from langchain_groq import ChatGroq

def load_base_prompt() -> str:
    path = os.path.join(os.path.dirname(__file__), "orchestrator.md")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return "You are a Retrieval-Augmented Generation (RAG) assistant. Answer using only the provided context."
from llm import get_llm
prompt_template = load_base_prompt()
# === Prompt caching setup for Orchestrator ===
CORE_PREFIX_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "core_prefix.md")

ORCH_RULES_PATH = os.path.join(os.path.dirname(__file__), "orchestrator.md")

CORE_PREFIX = ""
ORCH_RULES = ""
try:
    with open(CORE_PREFIX_PATH, "r", encoding="utf-8") as f:
        CORE_PREFIX = f.read()
except FileNotFoundError:
    CORE_PREFIX = "You are a core AI routing system."

try:
    with open(ORCH_RULES_PATH, "r", encoding="utf-8") as f:
        ORCH_RULES = f.read()
except FileNotFoundError:
    ORCH_RULES = "You are a router deciding the next node."

STATIC_SYS = normalize_prefix([CORE_PREFIX, ORCH_RULES])


from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
import json

def _format_last_turns(messages, k=3):
    tail = []
    for m in (messages or [])[-k:]:
        role = (m.get("type") or m.get("role") or "").lower()
        content = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
        if not content:
            continue
        speaker = "User" if role in ("human", "user") else "Assistant"
        tail.append(f"{speaker}: {content}")
    return "\n".join(tail)

async def summarizer(state, keep_last=2):
    """
    Summarizes older parts of the conversation and keeps only
    the last `keep_last` user–assistant turns (each max 300 words).
    """
    msgs = state.get("messages") or []
    if len(msgs) <= keep_last:
        return

    older = msgs[:-keep_last]
    recent = msgs[-keep_last:]

    print(f"session summary caleed-----------------------------------//////")
    def truncate_text(text: str, word_limit: int = 300):
        words = text.split()
        return " ".join(words[:word_limit]) + ("..." if len(words) > word_limit else "")

    for m in recent:
        if "content" in m and isinstance(m["content"], str):
            m["content"] = truncate_text(m["content"])

    
    old_text = []
    for m in older:
        role = (m.get("type") or m.get("role") or "").lower()
        content = m.get("content") or ""
        if not content:
            continue
        speaker = "User" if role in ("human", "user") else "Assistant"
        old_text.append(f"{speaker}: {content}")
    full_old_text = "\n".join(old_text)[:8000]  
    
    system_prompt = (
        "You are a summarization agent. Summarize the following chat history into <300 words, "
        "preserving key intents, facts, and unresolved items. Output only plain text."
    )
    user_prompt = f"Summarize this conversation:\n\n{full_old_text}"

    try:
        # from langchain_google_genai import ChatGoogleGenerativeAI
        # google_api_key = os.getenv("GOOGLE_API_KEY", "")
        # llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite", temperature=0.3, api_key=google_api_key)
        from api_keys_util import get_groq_api_key, get_api_keys_from_session
        api_keys = await get_api_keys_from_session(state.get("session_id")) if state else {}
        groq_key = get_groq_api_key(api_keys)
        # Only pass groq_api_key if we have a value, otherwise let it use env var
        llm_kwargs = {
            "model": "openai/gpt-oss-120b",
            "temperature": 0.4
        }
        if groq_key:
            llm_kwargs["groq_api_key"] = groq_key
        llm = ChatGroq(**llm_kwargs)
        result = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ])
        summary = (result.content or "").strip()
    except Exception as e:
        summary = "Summary of earlier conversation: user and assistant discussed multiple related topics."

    
    ctx = state.get("context") or {}
    sess = ctx.get("session") or {}
    sess["summary"] = summary
    ctx["session"] = sess
    state["context"] = ctx
    state["messages"] = recent


async def is_folloup(user_query: str,
    history: List[dict],
    docs_present: bool,
    kb_present: bool,
    llm_model: str = "gpt-4o-mini",) ->dict:
    """
    Ask the LLM to judge if the user message is a conversational follow-up that
    should continue using the same sources (docs/KB). Returns a JSON dict:
      {
        "is_followup": bool,
        "should_use_rag": bool,
        "confidence": float (0..1),
        "rationale": str
      }
    """
    turns = []
    for m in (history or [])[-12:]:
        role = (m.get("type") or m.get("role") or "").lower()
        content = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
        if not content:
            continue
        prefix = "User" if role in ("human", "user") else "Assistant"
        turns.append(f"{prefix}: {content}")
    sys = (
        "You are a routing judge. Decide if the NEW user message is a FOLLOW-UP in the same thread "
        "that should keep using the same sources (uploaded documents and/or knowledge base). "
        "Consider the conversation and the presence of docs/KB in the session.\n"
        "Output STRICT JSON with keys: is_followup (bool), should_use_rag (bool), "
        "confidence (0..1), rationale (short string)."
    )
    usr = (
        f"Docs present: {bool(docs_present)} | KB present: {bool(kb_present)}\n"
        f"Conversation (most recent first):\n" + "\n".join(turns) + "\n\n"
        f"NEW user message: {user_query}\n"
        "Return JSON only."
    ) 
    google_api_key = os.getenv("GOOGLE_API_KEY", "")
    llm= ChatGoogleGenerativeAI(
                model="gemini-2.5-flash-lite",
                temperature=0.3,
                api_key=google_api_key,
            )
    result=await llm.ainvoke([SystemMessage(sys), HumanMessage(usr)])  
    text=result.content.strip()
    try:
        obj = json.loads(text)
    except Exception:
        
        obj = {
            "is_followup": True if len(user_query.split()) < 8 else False,
            "should_use_rag": bool(docs_present or kb_present),
            "confidence": 0.4,
            "rationale": "Fallback heuristic because LLM did not return valid JSON."
        }
    return obj


# async def analyze_query(
#     user_message: str,
#     prompt_template: str,
#     llm: str,
#     *,
#     recent_messages_text: str,
#     session_summary: str,
#     last_route: str | None,
#     available_composio_tools: List[str] = None,  # Add this parameter
#     is_image: bool = False,
#     is_video: bool = False,
#     uploaded_images: List[str] = None,  # List of image URLs from new_uploaded_docs
#     new_uploaded_docs: List[dict] = None,  # Full list of newly uploaded documents
#     custom_instruction: str = "",  # Custom GPT instruction from gpt_config
#     is_websearch: bool = False,  # WebSearch enabled flag from gpt_config.webBrowser
# ) -> Optional[Dict[str, Any]]:
#     """
#     Analyze the user's message in context (conversation, summary, last route, custom instruction)
#     to decide the next node (RAG, WebSearch, SimpleLLM, Image, MCP).

#     Rules enforced:
#     - Routing based on query content, conversation context, last route, and custom instruction
#     - Custom instruction takes priority when query is ambiguous
#     - If no docs uploaded and query relates to custom instruction → follow custom instruction strictly
#     - If custom instruction mentions websearch AND is_websearch is true → route to WebSearch
#     - If custom instruction mentions writing prompts or LLM tasks → route to SimpleLLM
#     - No active_docs dependency - analyze based on query patterns and follow-up detection
#     - WebSearch routing requires is_websearch flag to be true
#     """

#     try:
#         # Add available composio tools to the prompt
#         composio_tools_text = ""
#         if available_composio_tools and len(available_composio_tools) > 0:
#             composio_tools_text = f"\nAvailable Composio Tools: {', '.join(available_composio_tools)}"
#         else:
#             composio_tools_text = "\nAvailable Composio Tools: None"
        
#         prompt = (
#             prompt_template
#             .replace("{user_message}", user_message)
#             .replace("{recent_messages}", recent_messages_text or "(none)")
#             .replace("{session_summary}", session_summary or "(none)")
#             .replace("{last_route}", str(last_route or "None"))
#         )
#         system_msg = SystemMessage(content=STATIC_SYS)
        
#         # Create dynamic text separately (NOT part of system prompt)
#         uploaded_images_text = ""
#         if uploaded_images and len(uploaded_images) > 0:
#             uploaded_images_text = f"\nUploaded Images: {len(uploaded_images)} image URL(s) available in session"
        
#         # Build document context from new_uploaded_docs
#         doc_context_text = ""
#         if new_uploaded_docs and len(new_uploaded_docs) > 0:
#             doc_types = {}
#             for doc in new_uploaded_docs:
#                 if isinstance(doc, dict):
#                     file_type = doc.get("file_type", "unknown")
#                     doc_types[file_type] = doc_types.get(file_type, 0) + 1
            
#             doc_summary = []
#             for doc_type, count in doc_types.items():
#                 doc_summary.append(f"{count} {doc_type}(s)")
            
#             doc_context_text = f"\nNewly Uploaded Documents: {', '.join(doc_summary)}"
        
#         # Add custom instruction context with routing guidance
#         custom_instruction_text = ""
#         routing_guidance = ""
#         if custom_instruction and custom_instruction.strip():
#             # Truncate to first 2000 chars to avoid token limits
#             instruction_preview = custom_instruction[:2000] + ("..." if len(custom_instruction) > 2000 else "")
#             custom_instruction_text = f"\nCustom GPT Instruction: {instruction_preview}"
            
#             # Add routing guidance based on custom instruction
#             routing_guidance = """
        
#         ROUTING GUIDANCE FOR CUSTOM INSTRUCTION:
#         - If user query is CLEAR and NOT related to custom instruction → Follow user query COMPLETELY, ignore custom instruction
#         - CRITICAL: If custom instruction describes a workflow like "first write prompts, then generate" or "write prompts, wait for approval, then generate" → Route to SimpleLLM first to write prompts. Only route to Image node if user EXPLICITLY requests image generation (explicit verbs like "generate image", "create image", "make image", "generate now", "create it") OR if it's a follow-up after prompts were written (last_route=SimpleLLM and user approves/selects a prompt). Simple queries like "girl in traditional dress" without explicit generation request should route to SimpleLLM to write prompts first.
#         - If user query is AMBIGUOUS AND custom instruction is related to image editing AND images are uploaded AND is_image is true → Route to Image node (only if user explicitly requests generation)
#         - If user query is AMBIGUOUS AND custom instruction is related to video editing AND videos are uploaded AND is_video is true → Route to Video node (only if user explicitly requests generation)
#         - If user query is AMBIGUOUS AND custom instruction involves websearch AND is_websearch is true → Route to WebSearch
#         - If user query relates to custom instruction AND custom instruction requires multi-node execution (workflow patterns like "first...then...", "after...do...", sequential actions) → Create perfect execution_order array
#         - Analyze custom instruction for workflow patterns and create appropriate execution_order when multi-step is needed
#         - If custom instruction is related to image/video editing and relevant content is uploaded, route to Image/Video node only if user explicitly requests generation
#         """
        
#         dynamic_context = f"""
#         User Message:
#         {user_message}

#         Recent Messages:
#         {recent_messages_text[:300] or '(none)'}

#         Last Route: {last_route or 'None'}{composio_tools_text}
#         Image Intent Flag: {is_image}
#         Video Intent Flag: {is_video}
#         WebSearch Enabled: {is_websearch}{uploaded_images_text}{doc_context_text}{custom_instruction_text}{routing_guidance}
#         """

#         messages = [system_msg, HumanMessage(content=dynamic_context)]

#         # google_api_key = os.getenv("GOOGLE_API_KEY", "")
#         # chat = ChatGoogleGenerativeAI(
#         #     model="gemini-2.5-flash-lite",
#         #     temperature=0.3,
#         #     api_key=google_api_key,
#         # )

#         chat = ChatGroq(
#         model="openai/gpt-oss-120b",  
#         temperature=0.4,
#         groq_api_key=os.getenv("GROQ_API_KEY")
#     )
#         # chat= get_llm("google/gemini-2.5-flash-lite", 0.3)
#         response = await chat.ainvoke(messages)
#         content = (response.content or "").strip()
#         print(f"[Analyzer Raw Output] {content}")

#         import re, json
#         json_match = re.search(r"\{[\s\S]*\}", content)
#         if json_match:
#             json_str = json_match.group(0).replace("{{", "{").replace("}}", "}")
#             print(f"[Analyzer Extracted JSON] {json_str}")
#             return json.loads(json_str)
#         return json.loads(content)

#     except Exception as e:
#         print(f"[Analyzer Error] {e}")
#         import traceback
#         traceback.print_exc()
#         return None

async def analyze_query(
    user_message: str,
    prompt_template: str,
    llm: str,
    *,
    recent_messages_text: str,
    session_summary: str,
    last_route: str | None,
    available_composio_tools: List[str] = None,  # Add this parameter
    is_image: bool = False,
    is_video: bool = False,
    uploaded_images: List[str] = None,  # List of image URLs from new_uploaded_docs
    new_uploaded_docs: List[dict] = None,
    custom_instruction: str = "",  # Custom GPT instruction from gpt_config
    is_websearch: bool = False,  # Full list of newly uploaded documents
    session_id: Optional[str] = None,  # Session ID to get API keys
) -> Optional[Dict[str, Any]]:
    """
    Analyze the user's message in context (conversation, summary, last route)
    to decide the next node (RAG, WebSearch, SimpleLLM, Image, MCP).

    Rules enforced:
    - Routing based purely on query content, conversation context, and last route
    - No active_docs dependency - analyze based on query patterns and follow-up detection
    - WebSearch and Image detection are purely query-driven
    - MCP routing requires analyzing query for action patterns and matching available tools
    """

    try:
        
        composio_tools_text = ""
        if available_composio_tools and len(available_composio_tools) > 0:
            composio_tools_text = f"\nAvailable Composio Tools: {', '.join(available_composio_tools)}"
        else:
            composio_tools_text = "\nAvailable Composio Tools: None"
        
        prompt = (
            prompt_template
            .replace("{user_message}", user_message)
            .replace("{recent_messages}", recent_messages_text or "(none)")
            .replace("{session_summary}", session_summary or "(none)")
            .replace("{last_route}", str(last_route or "None"))
        )
        system_msg = SystemMessage(content=STATIC_SYS)
        
        # Create dynamic text separately (NOT part of system prompt)
        uploaded_images_text = ""
        if uploaded_images and len(uploaded_images) > 0:
            uploaded_images_text = f"\nUploaded Images: {len(uploaded_images)} image URL(s) available in session"
        
        # Build document context from new_uploaded_docs
        doc_context_text = ""
        if new_uploaded_docs and len(new_uploaded_docs) > 0:
            doc_types = {}
            for doc in new_uploaded_docs:
                if isinstance(doc, dict):
                    file_type = doc.get("file_type", "unknown")
                    doc_types[file_type] = doc_types.get(file_type, 0) + 1
            
            doc_summary = []
            for doc_type, count in doc_types.items():
                doc_summary.append(f"{count} {doc_type}(s)")
            
            doc_context_text = f"\nNewly Uploaded Documents: {', '.join(doc_summary)}"
        custom_instruction = ""
        routing_guidance = ""
        if custom_instruction and custom_instruction.strip():
            # Truncate to first 2000 chars to avoid token limits
            instruction_preview = custom_instruction[:2000] + ("..." if len(custom_instruction) > 2000 else "")
            custom_instruction = f"\nCustom GPT Instruction: {instruction_preview}"
        dynamic_context = f"""
        User Message:
        {user_message}

        Recent Messages:
        {recent_messages_text[:1000] or '(none)'}

        Last Route: {last_route or 'None'}{composio_tools_text}
        Image Intent Flag: {is_image}
        Video Intent Flag: {is_video}{uploaded_images_text}{doc_context_text}
        WebSearch Enabled: {is_websearch}{doc_context_text}{custom_instruction}
        """

        messages = [system_msg, HumanMessage(content=dynamic_context)]

        # google_api_key = os.getenv("GOOGLE_API_KEY", "")
        # chat = ChatGoogleGenerativeAI(
        #     model="gemini-2.5-flash-lite",
        #     temperature=0.3,
        #     api_key=google_api_key,
        # )

        from api_keys_util import get_groq_api_key, get_api_keys_from_session
        api_keys = await get_api_keys_from_session(session_id) if session_id else {}
        groq_key = get_groq_api_key(api_keys)
        chat_kwargs = {
            "model": "openai/gpt-oss-120b",
            "temperature": 0.4
        }
        if groq_key:
            chat_kwargs["groq_api_key"] = groq_key
        chat = ChatGroq(**chat_kwargs)
        # chat= get_llm("google/gemini-2.5-flash-lite", 0.3)
        response = await chat.ainvoke(messages)
        content = (response.content or "").strip()
        print(f"[Analyzer Raw Output] {content}")

        import re, json
        json_match = re.search(r"\{[\s\S]*\}", content)
        if json_match:
            json_str = json_match.group(0).replace("{{", "{").replace("}}", "}")
            print(f"[Analyzer Extracted JSON] {json_str}")
            return json.loads(json_str)
        return json.loads(content)

    except Exception as e:
        print(f"[Analyzer Error] {e}")
        import traceback
        traceback.print_exc()
        return None

def _get_last_output(state: GraphState) -> dict | None:
    """Helper to safely get the last intermediate result."""
    return state.get("intermediate_results", [])[-1] if state.get("intermediate_results") else None


async def rewrite_query(state: GraphState) -> str:
    REWRITE_CORE_PREFIX = """
You are a query rewriting expert inside an AI Orchestrator.
Your job is to take the user goal, current plan step, and limited context,
and produce a concise, self-contained rewritten query for the next node.

Follow these permanent rules:
- Never include explanations.
- Keep response ≤ 150 words.
- Maintain factual and logical continuity.
"""

    STATIC_SYS_REWRITE = normalize_prefix([CORE_PREFIX, REWRITE_CORE_PREFIX])

    user_query = state.get("user_query", "")
    current_task = state.get("current_task", "")
    plan = state.get("tasks", [])
    idx = state.get("task_index", 0)
    intermediate_results = state.get("intermediate_results", [])


   
    is_first_node = (idx == 0 or not intermediate_results)
    print(f"🌟 Is First Node in Plan? {is_first_node}")
    if is_first_node:
        summary = state.get("context", {}).get("session", {}).get("summary", "")
        messages = state.get("messages", [])
        last_msgs = []
        for m in messages[-2:]:
            role = (m.get("type") or m.get("role") or "").lower()
            content = m.get("content") or ""
            speaker = "User" if role in ("human", "user") else "Assistant"
            last_msgs.append(f"{speaker}: {content}")
        recent_text = "\n".join(last_msgs)

        # ADD THE USER QUERY TO CONTEXT
        context_text = (
            f"Current User Goal: {user_query}\n\n"
            f"Summary:\n{summary[:300]}\n\nRecent Conversation:\n{recent_text[:300]}"
            if summary or recent_text else f"Current User Query: {user_query}\n\nNo previous conversation available."
        )
    
    else:
        
        last_result = intermediate_results[-1]
        context_text = (
            f"Context from previous node ({last_result['node']}):\n"
            f"{last_result['output'][:300]}"
        )
        print(f"📚 Using Previous Node Context: {last_result['node']}")
    prompt = f"""
You are a query rewriter for an AI workflow agent.
Create a concise, self-contained rewritten query for the *next* step.

User Goal: "{user_query}"
Plan: {plan}
Next Step: '{current_task}'

{context_text}

Guidelines:
- Ensure the rewritten query is **under 150 words**.
- If this is a follow-up, merge relevant context naturally.
- If it's a continuation of a multi-node flow, refine using only the previous node’s output.
- Output ONLY the rewritten query. No explanation or formatting.
"""

    try:
        # google_api_key = os.getenv("GOOGLE_API_KEY", "")
        # llm = ChatGoogleGenerativeAI(
        #     model="gemini-2.5-flash-lite",
        #     temperature=0.3,
        #     api_key=google_api_key,
        # )
        # llm= get_llm("google/gemini-2.5-flash-lite", 0.3)
        from api_keys_util import get_groq_api_key, get_api_keys_from_session
        api_keys = await get_api_keys_from_session(state.get("session_id")) if state else {}
        groq_key = get_groq_api_key(api_keys)
        # Only pass groq_api_key if we have a value, otherwise let it use env var
        llm_kwargs = {
            "model": "openai/gpt-oss-120b",
            "temperature": 0.4
        }
        if groq_key:
            llm_kwargs["groq_api_key"] = groq_key
        llm = ChatGroq(**llm_kwargs)
        system_msg = SystemMessage(content=STATIC_SYS_REWRITE)
        human_msg = HumanMessage(content=prompt)
        print("🚀 Sending rewrite prompt to LLM with cached prefix...")
        result = await llm.ainvoke([system_msg, human_msg])

        rewritten = (result.content or "").strip()
        words = rewritten.split()
        if len(words) > 150:
            rewritten = " ".join(words[:150]) + " ..."
            print(f"⚠️ Query exceeded 150 words, truncated to {len(rewritten.split())} words.")

        print(f"✅ REWRITTEN QUERY RESULT ({len(rewritten.split())} words): {rewritten}")
        print("=============================================\n")
        return rewritten

    except Exception as e:
        print(f"🚨 Rewrite error: {e}")
        import traceback
        traceback.print_exc()
        print("⚠️ Falling back to original user query.\n")
        return user_query

    
def normalize_route(name: str) -> str:
    if not name:
        return "SimpleLLM"
    key = name.lower().strip()
    mapping = {
        "web_search": "WebSearch",
        "websearch": "WebSearch",
        "search": "WebSearch",
        "rag": "RAG",
        "simple_llm": "SimpleLLM",
        "llm": "SimpleLLM",
        "image": "image",  # Must match graph node name (lowercase)
        "video": "video",  # Must match graph node name (lowercase)
        "mcp": "MCP",  # Add MCP mapping
        "composio": "MCP",  # Add composio mapping
        "end": "END",
    }
    return mapping.get(key, name)
async def orchestrator(state: GraphState) -> GraphState:
    # await summarizer(state, keep_last=2)
    user_query = state.get("user_query", "")
    docs = state.get("doc", [])
    llm_model = state.get("llm_model", "gpt-4o")
    rag = state.get("rag", False)
    uploaded_doc=state.get("uploaded_doc", False)
    print(f" Uploaded doc in sthis ..------------------", uploaded_doc)
    deep_search = state.get("deep_search", False)
    mcp = state.get("mcp", False)
    mcp_schema = state.get("mcp_schema", {})
    kb = state.get("kb", {})
    websearch = state.get("web_search", False)
    print(f"wbeserac.............", {websearch})
    ctx = state.get("context") or {}
    session_meta = ctx.get("session") or {}
    last_route = session_meta.get("last_route")
    new_Doc=state.get("new_uploaded_docs", [])
    is_image=state.get("is_image", False)
    is_video=state.get("is_video", False)
    if not state.get("active_docs"):
        state["active_docs"] = None
        print("[Orchestrator] Initialized active_docs as None.")
    available_composio_tools = state.get("enabled_composio_tools", [])
    print(f"Enlabled composio tools", state.get("enabled_composio_tools", []))
    if new_Doc:
        state["active_docs"]=new_Doc
    if not state.get("tasks"):
        messages = state.get("messages", [])
        def _format_last_turns_for_prompt(msgs, k=2, max_words_assistant=500):
            """
            Builds a condensed conversation history string for the analyzer.

            - Includes the last k messages (both user + assistant)
            - For Assistant messages, truncates content to ~max_words_assistant words
            - Keeps user messages fully intact (since they're usually short)
            """
            tail = []
            for m in (msgs or [])[-k:]:
                role = (m.get("type") or m.get("role") or "").lower()
                content = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
                if not content:
                    continue

                speaker = "User" if role in ("human", "user") else "Assistant"

                if speaker == "Assistant":
                    words = content.split()
                    if len(words) > max_words_assistant:
                        content = " ".join(words[:max_words_assistant]) + " ..."
                tail.append(f"{speaker}: {content.strip()}")

            return "\n".join(tail)


        ctx = state.get("context", {})
        sess = ctx.get("session", {})
        last_route = sess.get("last_route")
        session_summary = sess.get("summary", "")
        recent_messages_text = _format_last_turns_for_prompt(messages, k=4)
        if session_summary:
            if recent_messages_text:
                recent_messages_text = (
                    f"{recent_messages_text}\n\nEarlier Summary:\n{session_summary}"
                )
            else:
                recent_messages_text = f"Earlier Summary:\n{session_summary}"
        
        # Extract custom instruction and websearch flag from gpt_config
        gpt_config = state.get("gpt_config", {})
        custom_instruction = gpt_config.get("instruction", "").strip() if gpt_config else ""
        is_websearch_enabled = bool(websearch)
        # print(f"recent_messages_text: {recent_messages_text}")
        # print(f"[Orchestrator] Custom instruction present: {bool(custom_instruction)}")
        # print(f"[Orchestrator] WebSearch enabled: {bool(websearch)}")
        # print(f"last`route in orchestrator------------------", last_route)
        # Extract image URLs from new_uploaded_docs and populate edit_img_urls
        edit_img_urls = []
        if new_Doc:
            for doc in new_Doc:
                if isinstance(doc, dict):
                    file_type = doc.get("file_type", "")
                    file_url = doc.get("file_url") or doc.get("url")
                    if file_type == "image" and file_url:
                        edit_img_urls.append(file_url)
        
        if edit_img_urls:
            state["edit_img_urls"] = edit_img_urls
            print(f"[Orchestrator] Extracted {len(edit_img_urls)} image URL(s) from new_uploaded_docs: {edit_img_urls}")
        
        analyze_task = analyze_query(
            user_message=state.get("user_query", ""),
            prompt_template=prompt_template,
            llm=llm_model,
            recent_messages_text=recent_messages_text,
            session_summary=session_summary,
            last_route=last_route,
            available_composio_tools=available_composio_tools,
            is_image=is_image,
            is_video=is_video,
            uploaded_images=edit_img_urls,
            new_uploaded_docs=new_Doc,
            custom_instruction=custom_instruction,
            is_websearch=is_websearch_enabled,
            session_id=state.get("session_id"),
        )
        
        tentative_rewrite_task = rewrite_query(state)
        
        result, tentative_rewrite = await asyncio.gather(analyze_task, tentative_rewrite_task)



    
     
    if not state.get("tasks"):
        # Deep search is now handled by separate endpoint, not through orchestrator
        plan = result.get("execution_order", []) if result else ["SimpleLLM"]
        if not plan:
            plan = ["SimpleLLM"]
        has_image_in_plan = any(
            task.lower() in ["image", "img"] 
            for task in plan
        )
        if has_image_in_plan==False:
            print(f"[Orchestrator] Image node found in execution_order: {plan}")
            state["img_urls"]=[]
        if len(edit_img_urls)==len(new_Doc) and is_image and plan[0].lower() == "image":
            state["img_urls"]=edit_img_urls
            print(f"hi.....................image editing.")
        elif uploaded_doc:
            state["img_urls"]=[]
            print(f"hi......................")
            if len(plan) == 1 and plan[0].lower() == "rag":
                pass  
            elif len(plan) == 1 and plan[0].lower() != "rag":
                plan = ["rag"]
            elif len(plan) == 0:
                plan = ["rag"]
            else:
                pass

            print(f"[Orchestrator] New doc uploaded → updated plan = {plan}")
        
        if not plan:
            plan = ["SimpleLLM"]
        state["tasks"] = plan
        state["task_index"] = 0 
        state["current_task"] = plan[0]
        route =normalize_route(plan[0]) 
        
                
        if len(plan)==1 and plan[0]=="rag":
                state["resolved_query"] = user_query
        else:
               # Use the tentative rewrite from parallel execution
               state["resolved_query"] = tentative_rewrite
       
        state["route"] = route
        ctx = state.get("context") or {}
        sess = ctx.get("session") or {}
        sess["last_route"] = route
        print(f"----last_rut--------", sess["last_route"])
        ctx["session"] = sess
        state["context"] = ctx

    else:
        completed = state.get("current_task")
        if completed and state.get("response"):
            state.setdefault("intermediate_results", []).append({
                "node": completed,
                "query": state.get("resolved_query") or state.get("user_query"),
                "output": state["response"]
            })
            state["response"] = None

        idx = state.get("task_index", 0)
        if idx + 1 < len(state["tasks"]):
            state["task_index"] = idx + 1
            next_task = state["tasks"][state["task_index"]]
            state["current_task"] = next_task
            route = normalize_route(next_task)
            clean_query = await rewrite_query(state)
            state["resolved_query"] = clean_query

        else: 
            if len(state["tasks"]) > 1:
                print(f"--- Multi-step plan ({len(state['tasks'])} steps) finished, combining results directly ---")
                # Combine all intermediate results into final_answer
                if state.get("intermediate_results"):
                    combined_results = []
                    for result in state["intermediate_results"]:
                        combined_results.append(f"**{result.get('node', 'Unknown')} Result:**\n{result.get('output', '')}")
                    
                    state["final_answer"] = "\n\n".join(combined_results)
                else:
                    state["final_answer"] = state.get("response", "Task completed.")
                route = "END"
            else:
                print(f"--- Single-step plan finished, ending directly ---")
                if state.get("intermediate_results"):
                    state["final_answer"] = state["intermediate_results"][-1]["output"]
                else: 
                    state["final_answer"] = state.get("response", "Task completed.")
                route = "END"
        state["route"] = route
         

    
   
    
    if state.get('response'):
        ctx["session"] = sess
        state["context"] = ctx
    if state.get("route") == "END":
        await summarizer(state, keep_last=2)
    print(f"Orchestrator routing to: {route}")
    return state

def route_decision(state: GraphState) -> str:
    route = state.get("route", "SimpleLLM")
    
    # Handle MCP routes with tool names
    if route.startswith("mcp:"):
        tool_name = route.replace("mcp:", "")
        state["mcp_tools_needed"] = tool_name  # Set the specific tool needed
        print(f"Extracted MCP tool: {tool_name}")
        return "MCP"
    
    # Add MCP routing
    if route.lower() in ["mcp", "composio"]:
        return "MCP"
    
    route = normalize_route(route)
    print(f"Routing decision based on state: {route}")
    return route