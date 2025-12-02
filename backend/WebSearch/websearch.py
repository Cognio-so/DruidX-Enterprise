import os
from typing import List, Optional, Dict
from tavily import AsyncTavilyClient
from langchain_core.documents import Document
from langchain_openai import ChatOpenAI
from graph_type import GraphState
from pathlib import Path
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
import re
load_dotenv()
# google_api_key=os.getenv("GOOGLE_API_KEY", "")
from llm import get_llm, stream_with_token_tracking
_tavily: Optional[AsyncTavilyClient] = None
_firecrawl = None
from prompt_cache import normalize_prefix

# Initialize Tavily
if os.getenv("TAVILY_API_KEY"):
    try:
        _tavily = AsyncTavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
        print(f"[WebSearch] Tavily client initialized successfully")
    except Exception as e:
        print(f"[WebSearch] Failed to init Tavily: {e}")
        _tavily = None
else:
    print(f"[WebSearch] TAVILY_API_KEY not found in environment")

# Initialize Firecrawl
print(f"[WebSearch] Checking for FIRECRAWL_API_KEY...")
firecrawl_key = os.getenv("FIRECRAWL_API_KEY")
if firecrawl_key:
    try:
        from firecrawl import Firecrawl
        _firecrawl = Firecrawl(api_key=firecrawl_key)
        print(f"[WebSearch] ✅ Firecrawl client initialized successfully")
    except Exception as e:
        print(f"[WebSearch] ❌ Failed to init Firecrawl: {e}")
        import traceback
        traceback.print_exc()
        _firecrawl = None
else:
    print(f"[WebSearch] ⚠️ FIRECRAWL_API_KEY not found in environment")
    _firecrawl = None

# At top of websearch.py
PROMPT_PATH = os.path.join(os.path.dirname(__file__), "websearch.md")
BASIC_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "websearch_basic.md")
async def send_status_update(state: GraphState, message: str, progress: int = None, status: str = "processing"):
    """Send status update if callback is available"""
    print(f"[WebSearch] send_status_update called: message={message}, status={status}")
    
    # GraphState is a TypedDict, so access it like a dictionary
    status_callback = state.get("_status_callback")
    
    if status_callback:
        print(f"[WebSearch] ✅ Status callback found, sending update")
        status_data = {
            "type": "status",
            "data": {
                "status": status,
                "message": message,
                "current_node": "WebSearch",
                "progress": progress
            }
        }
        print(f"[WebSearch] Status data: {status_data}")
        try:
            await status_callback(status_data)
            print(f"[WebSearch] ✅ Status callback executed successfully")
        except Exception as e:
            print(f"[WebSearch] ❌ Error calling status callback: {e}")
            import traceback
            traceback.print_exc()
    else:
        print(f"[WebSearch] ⚠️ WARNING: No status callback available in state!")
        print(f"[WebSearch] State keys: {list(state.keys()) if isinstance(state, dict) else 'N/A'}")
def load_prompt(path: str, fallback: str) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return fallback

WEBSEARCH_PROMPT = load_prompt(
    PROMPT_PATH,
    "You are a helpful assistant. Format results clearly with headings, bullets, numbered lists. Cite as [Source X]."
)

WEBSEARCH_BASIC_PROMPT = load_prompt(
    BASIC_PROMPT_PATH,
    "Provide a concise answer (3-10 sentences) based only on the user query and the search results. Cite as [Source X]."
)
# === Prompt caching setup for WebSearch ===
CORE_PREFIX_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "core_prefix.md")
WEBSEARCH_PATH = os.path.join(os.path.dirname(__file__), "websearch.md")
WEBSEARCH_BASIC_PATH = os.path.join(os.path.dirname(__file__), "websearch_basic.md")

CORE_PREFIX = ""
WEB_RULES = ""
WEB_RULES_BASIC = ""

try:
    with open(CORE_PREFIX_PATH, "r", encoding="utf-8") as f:
        CORE_PREFIX = f.read()
except FileNotFoundError:
    CORE_PREFIX = "You are a reliable research assistant with live search capability."

try:
    with open(WEBSEARCH_PATH, "r", encoding="utf-8") as f:
        WEB_RULES = f.read()
except FileNotFoundError:
    WEB_RULES = "Format answers clearly with structure and source list."

try:
    with open(WEBSEARCH_BASIC_PATH, "r", encoding="utf-8") as f:
        WEB_RULES_BASIC = f.read()
except FileNotFoundError:
    WEB_RULES_BASIC = "Provide concise structured answers based on web search."

# Create normalized, cacheable static prefixes
STATIC_SYS_WEBSEARCH = normalize_prefix([CORE_PREFIX, WEB_RULES])
STATIC_SYS_WEBSEARCH_BASIC = normalize_prefix([CORE_PREFIX, WEB_RULES_BASIC])

async def web_search(query: str, max_results: int = 5, search_depth: str="basic", api_keys: Optional[Dict[str, str]] = None) -> List[Document]:
    """Perform Tavily web search and return results as LangChain Documents."""
    print(f"[WebSearch] Starting web search for: {query}")
    
    # Use session API key if available
    from api_keys_util import get_tavily_api_key
    tavily_key = get_tavily_api_key(api_keys)
    if tavily_key:
        try:
            from tavily import AsyncTavilyClient
            tavily_client = AsyncTavilyClient(api_key=tavily_key)
            results = await tavily_client.search(query=query, max_results=max_results, search_depth=search_depth)
            docs = []
            for r in results.get("results", []):
                docs.append(
                    Document(
                        page_content=r.get("content", ""),
                        metadata={"title": r.get("title", ""), "url": r.get("url", "")}
                    )
                )
            print(f"[WebSearch] Created {len(docs)} documents from search results")
            return docs
        except Exception as e:
            print(f"[Tavily] Error with session API key: {e}, falling back to module client")
    
    if not _tavily:
        print(f"[WebSearch] No Tavily client available")
        return []

    try:
        print(f"[WebSearch] Calling Tavily search API...")
        results = await _tavily.search(query=query, max_results=max_results, search_depth=search_depth)
        # print(f"[WebSearch] Raw Tavily response: {results}")
        
        docs = []
        for r in results.get("results", []):
            docs.append(
                Document(
                    page_content=r.get("content", ""),
                    metadata={"title": r.get("title", ""), "url": r.get("url", "")}
                )
            )
        print(f"[WebSearch] Created {len(docs)} documents from search results")
        return docs
    except Exception as e:
        print(f"[WebSearch] Error performing search: {e}")
        import traceback
        traceback.print_exc()
        return []


def extract_urls_from_query(query: str) -> List[str]:
    """Extract URLs from user query - supports both full URLs and bare domains."""
    extracted_urls: List[str] = []

    # Pattern 1: Full URLs with http/https protocol
    url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
    full_urls = re.findall(url_pattern, query)
    extracted_urls.extend(full_urls)

    # Pattern 2: Domain-like patterns without protocol (example.com, cognio.so, etc.)
    domain_pattern = r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b'
    potential_domains = re.findall(domain_pattern, query)

    valid_tlds = {
        ".com", ".org", ".net", ".io", ".ai", ".so", ".co", ".us", ".uk",
        ".dev", ".app", ".tech", ".info", ".me", ".xyz", ".online", ".in",
    }

    for domain in potential_domains:
        domain_lower = domain.lower()

        # Skip if already captured as a full URL
        if any(domain in url for url in full_urls):
            continue

        # Skip obvious false positives
        if domain_lower in {"etc.", "e.g.", "i.e.", "vs."}:
            continue

        if any(domain_lower.endswith(tld) for tld in valid_tlds):
            extracted_urls.append(f"https://{domain}")

    # Deduplicate while preserving order
    seen = set()
    unique_urls: List[str] = []
    for url in extracted_urls:
        lowered = url.lower()
        if lowered not in seen:
            seen.add(lowered)
            unique_urls.append(url)

    return unique_urls


def has_url(query: str) -> bool:
    """Check if query contains a URL."""
    return bool(extract_urls_from_query(query))


async def scrape_url_with_firecrawl(url: str, api_keys: Optional[Dict[str, str]] = None) -> Optional[Document]:
    """Scrape a single URL using Firecrawl and return as Document."""
    print(f"[Firecrawl] Scraping URL: {url}")
    
    from api_keys_util import get_firecrawl_api_key
    firecrawl_key = get_firecrawl_api_key(api_keys)
    
    firecrawl_client = None
    if firecrawl_key:
        try:
            from firecrawl import Firecrawl
            firecrawl_client = Firecrawl(api_key=firecrawl_key)
        except Exception as e:
            print(f"[Firecrawl] Failed to create client: {e}")
    
    if not firecrawl_client and not _firecrawl:
        print(f"[Firecrawl] No Firecrawl client available")
        return None

    try:
        client = firecrawl_client if firecrawl_client else _firecrawl
        result = client.scrape(
            url=url,
            formats=["markdown"],
            only_main_content=True,
        )

        # Firecrawl returns a Document object, not a dict
        # Access attributes directly
        content = getattr(result, "markdown", None) or getattr(result, "content", None) or ""
        metadata = getattr(result, "metadata", None) or {}

        if not content:
            return None

        print(f"[Firecrawl] Successfully scraped {url}: {len(content)} characters")

        # Handle metadata - it might be a dict or an object with attributes
        if hasattr(metadata, "title"):
            title = metadata.title
        elif isinstance(metadata, dict):
            title = metadata.get("title", url)
        else:
            title = url

        if hasattr(metadata, "description"):
            description = metadata.description
        elif isinstance(metadata, dict):
            description = metadata.get("description", "")
        else:
            description = ""

        return Document(
            page_content=content,
            metadata={
                "title": title,
                "url": url,
                "source": "firecrawl",
                "description": description,
            }
        )
    except Exception as e:
        print(f"[Firecrawl] Error scraping {url}: {e}")
        import traceback
        traceback.print_exc()
        return None


async def crawl_website_with_firecrawl(url: str, max_pages: int = 5) -> List[Document]:
    """
    Crawl entire website or specific sections.
    Good for: "Tell me everything about this website"
    """
    print(f"[Firecrawl] Crawling website: {url}")
    
    if not _firecrawl:
        return []

    try:
        crawl_result = _firecrawl.crawl(
            url=url,
            limit=max_pages,
            scrape_options={
                "formats": ["markdown"],
                "only_main_content": True,
            },
        )

        results: List[Document] = []
        # Firecrawl returns an object with a 'data' attribute containing Document objects
        data = getattr(crawl_result, "data", []) or []
        
        for page in data:
            # Each page is a Document object, access attributes directly
            content = getattr(page, "markdown", None) or getattr(page, "content", None) or ""
            metadata = getattr(page, "metadata", {}) or {}

            if not content:
                continue

            # Handle metadata - it might be a dict or an object
            if hasattr(metadata, "title"):
                title = metadata.title
            elif isinstance(metadata, dict):
                title = metadata.get("title", "")
            else:
                title = ""

            # Get URL from page or metadata
            page_url = getattr(page, "url", None) or getattr(page, "sourceURL", None)
            if not page_url:
                if hasattr(metadata, "url"):
                    page_url = metadata.url
                elif isinstance(metadata, dict):
                    page_url = metadata.get("url") or metadata.get("sourceURL", url)
                else:
                    page_url = url

            if not title:
                title = page_url

            results.append(
                Document(
                    page_content=content,
                    metadata={
                        "title": title,
                        "url": page_url,
                        "source": "firecrawl_crawl",
                    },
                )
            )

        print(f"[Firecrawl] Crawled {len(results)} pages")
        return results

    except Exception as e:
        print(f"[Firecrawl] Crawl error: {e}")
        import traceback
        traceback.print_exc()
        return []


def is_web_search_available() -> bool:
    """Check if Tavily client is available."""
    return _tavily is not None



async def run_web_search(state: GraphState) -> GraphState:
    """
    Graph node for Tavily web search:
    - Fetch results
    - Format them into sources text
    - Send to LLM with websearch.md prompt
    - Store structured answer in state["response"]
    """
    query = state.get("resolved_query") or state.get("user_query", "")
    original_user_query = state.get("user_query", "")  # Get original query for URL detection
    is_web_search=state.get("web_search", False)
    state["active_docs"]=None
    system_prompt = WEBSEARCH_PROMPT if is_web_search else WEBSEARCH_BASIC_PROMPT

    llm_model = state.get("llm_model", "gpt-4o")
    print(f"[WebSearch] Starting run_web_search for query: {query}")
    print(f"[WebSearch] Original user query: {original_user_query}")
    
    # Get API keys from session
    from api_keys_util import get_api_keys_from_session
    api_keys = await get_api_keys_from_session(state.get("session_id")) if state else {}
    
    if not query:
        state["response"] = "No query provided for web search."
        print(f"[WebSearch] No query provided")
        return state
    
    # ========== NEW: Check ORIGINAL user query for URLs and use Firecrawl ==========
    # Important: Check original query because resolved_query may have URL removed
    urls_in_query = extract_urls_from_query(original_user_query)
    use_firecrawl = is_web_search and len(urls_in_query) > 0
    print(f"[WebSearch] URLs found in original query: {urls_in_query}")
    print(f"[WebSearch] Will use Firecrawl: {use_firecrawl}")
    
    if use_firecrawl:
        print(f"[WebSearch] Detected URL(s) in advanced search mode: {urls_in_query}")
        await send_status_update(state, f"🔥 Scraping {len(urls_in_query)} URL(s) with Firecrawl...", 20)
        
        # Scrape the full page content for each URL
        results = []
        for url in urls_in_query[:3]: 
            print(f"[WebSearch] Scraping full page: {url}")
            doc = await scrape_url_with_firecrawl(url, api_keys=api_keys)
            if doc:
                results.append(doc)
                print(f"[WebSearch] Successfully scraped {url}: {len(doc.page_content)} chars")
        
        if not results:
            # Fallback to Tavily if Firecrawl fails
            print(f"[WebSearch] Firecrawl failed, falling back to Tavily")
            await send_status_update(state, "⚠️ Firecrawl failed, using Tavily fallback...", 30)
            results = await web_search(state.get("user_query"), max_results=5, search_depth="advanced", api_keys=api_keys)
        else:
            print(f"[WebSearch] Firecrawl successfully retrieved {len(results)} result(s)")
    else:
        # Normal Tavily web search
        print(f"[WebSearch] Using Tavily web search (no URL or basic mode)")
        await send_status_update(state, "🌐 Gathering information from websites...", 20)
        
        if is_web_search:
            results = await web_search(query, max_results=5, search_depth="advanced", api_keys=api_keys)
        else:
            results = await web_search(query, max_results=2, search_depth="basic", api_keys=api_keys)
    # ========================================================================
        
    print(f"[WebSearch] Got {len(results)} results")
    
    if not results:
        state["response"] = "No web results found or services unavailable."
        print(f"[WebSearch] No results found, returning early")
        return state
    
    await send_status_update(state, f"📄 Processing {len(results)} search results...", 40)

    # Extract recent conversation context for better synthesis
    past_messages = state.get("messages", [])
    conversation_context = ""

    if past_messages:
        recent_turns = []
        for m in past_messages[-4:]:  # Last 3 messages
            role = (m.get("type") or m.get("role") or "").lower()
            content = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
            if content:
                # Truncate to 200 words
                if len(content.split()) > 200:
                    content = " ".join(content.split()[:200]) + "..."
                speaker = "User" if role in ("human", "user") else "Assistant"
                recent_turns.append(f"{speaker}: {content}")
        
        if recent_turns:
            conversation_context = "\n\n## Recent Conversation:\n" + "\n".join(recent_turns) + "\n"

    # Firecrawl returns full page content, so we can show more
    content_preview_length = 2000 if use_firecrawl else 400
    
    sources_text = "\n".join(
        [f"[Source {i+1}] ({doc.metadata.get('url')})\n"
         f"Title: {doc.metadata.get('title', 'N/A')}\n"
         f"{doc.page_content[:content_preview_length]}"
         for i, doc in enumerate(results)]
    )

    user_prompt = f"""User Query: {query}
{conversation_context}
{'## Scraped Web Content:' if use_firecrawl else '## Web Search Results:'}
{sources_text}

Now synthesize them into a clear, structured answer with:
- Headings and subheadings
- Numbered or bulleted lists
- A final 'Sources Used' section with URLs(no titles or anything).

Note: If the conversation context suggests this is a follow-up question, ensure your answer builds upon the previous discussion.
"""
    await send_status_update(state, "🤖 Generating response from search results...", 70)
    chunk_callback = state.get("_chunk_callback")
    print(f"[WebSearch] Chunk callback retrieved: {chunk_callback is not None}")
    print(f"[WebSearch] Chunk callback type: {type(chunk_callback)}")
    full_response = ""
    if not is_web_search:
        # llm=ChatGoogleGenerativeAI(
        #         model="gemini-2.5-flash-lite",
        #         temperature=0.3,
        #         google_api_key=google_api_key,
        #     )
        from api_keys_util import get_api_keys_from_session
        api_keys = await get_api_keys_from_session(state.get("session_id")) if state else {}
        llm=get_llm(llm_model, temperature=0.7, api_keys=api_keys)
        system_msg = SystemMessage(content=STATIC_SYS_WEBSEARCH_BASIC)
        human_msg = HumanMessage(content=user_prompt)

        full_response, _ = await stream_with_token_tracking(
            llm,
            [system_msg, human_msg],
            chunk_callback=chunk_callback,
            state=state
        )
        print(f"[WebSearch] Basic search completed")
        
    else:    
        # llm=ChatGoogleGenerativeAI(
        #         model="gemini-2.5-flash-lite",
        #         temperature=0.3,
        #         google_api_key=google_api_key,
        #     )
        from api_keys_util import get_api_keys_from_session
        api_keys = await get_api_keys_from_session(state.get("session_id")) if state else {}
        llm=get_llm(llm_model, temperature=0.5, api_keys=api_keys)
        system_msg = SystemMessage(content=STATIC_SYS_WEBSEARCH)
        human_msg = HumanMessage(content=user_prompt)

        full_response, _ = await stream_with_token_tracking(
            llm,
            [system_msg, human_msg],
            chunk_callback=chunk_callback,
            state=state
        )
        print(f"[WebSearch] Web search completed")
    if chunk_callback:
        await chunk_callback("\n\n")
        full_response += "\n\n"                
    try:
        
        # print(f"[WebSearch] LLM response received: {full_response[:100]}...")
        state["response"] = full_response
        state.setdefault("intermediate_results", []).append({
        "node": "WebSearch",
        "query": query,
        "method": "firecrawl" if use_firecrawl else "tavily",
        "output": state["response"]
    })
        await send_status_update(state, "✅ Web search completed", 100, status="completed")

    except Exception as e:
        state["response"] = f"Web search formatting failed: {e}"
        print(f"[WebSearch] LLM error: {e}")
        import traceback
        traceback.print_exc()
    state.setdefault("messages", []).append({
        "role": "assistant",
        "content": state["response"]
    })
    # print(f"[WebSearch] Web search completed, response length: {len(state['response'])}")
    return state
