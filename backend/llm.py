# llm.py
import os
from langchain_openai import ChatOpenAI

def get_reasoning_llm(model_name: str):
    """
    Returns a ChatOpenAI instance configured to use DeepSeek via OpenRouter.
    """
    return ChatOpenAI(
        model=model_name,   
        openai_api_base="https://openrouter.ai/api/v1",
        openai_api_key=os.getenv("OPENROUTER_API_KEY"),
        temperature=0.9,
        default_headers={
            "HTTP-Referer": os.getenv("APP_URL", "http://localhost"),
            "X-Title": os.getenv("APP_NAME", "My LangGraph App")
        }
    )

# llm.py
import os
import httpx

_persistent_http_client = httpx.Client(
    http2=True,
    timeout=httpx.Timeout(30.0),
    headers={
        "Connection": "keep-alive",
        "User-Agent": "DruidX-LLM-Agent/1.0"
    },
)
_cached_llms = {}

def get_llm(model_name: str, temperature: float = 0.3):
    """
    Optimized ChatOpenAI constructor for OpenRouter.
    ⚙️ Features:
    - Persistent HTTP/2 keep-alive connection
    - Cached model clients (no re-authentication each call)
    - Reduced TLS handshake latency
    - Works seamlessly with LangGraph & async streaming
    """
    global _cached_llms
    if model_name in _cached_llms:
        return _cached_llms[model_name]
    llm = ChatOpenAI(
        model=model_name,
        openai_api_base="https://openrouter.ai/api/v1",
        openai_api_key=os.getenv("OPENROUTER_API_KEY"),
        temperature=temperature,
        http_client=_persistent_http_client,
        default_headers={
            "HTTP-Referer": os.getenv("APP_URL", "http://localhost"),
            "X-Title": os.getenv("APP_NAME", "My LangGraph App"),
            "Connection": "keep-alive"
        },
    )

    _cached_llms[model_name] = llm
    return llm


