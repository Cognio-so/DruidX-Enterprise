"""
Utility module for managing API keys.
Prioritizes API keys from session, falls back to environment variables.
"""
import os
from typing import Dict, Any, Optional


async def get_api_keys_from_session(session_id: Optional[str]) -> Dict[str, str]:
    """Get API keys from session if session_id is available"""
    if not session_id:
        return {}
    try:
        from main import SessionManager
        session = await SessionManager.get_session(session_id)
        api_keys = session.get("api_keys", {}) or {}
        if isinstance(api_keys, list):
            return {}
        return api_keys
    except Exception as e:
        print(f"[API Keys] Failed to get session {session_id}: {e}")
        return {}


def get_api_key(key_type: str, api_keys: Optional[Dict[str, str]] = None, env_key: Optional[str] = None) -> Optional[str]:
    """
    Get API key with priority: session API keys > environment variables.
    
    Args:
        key_type: The type of API key (e.g., "openai", "openrouter", "groq", "tavily", "composio", "replicate")
        api_keys: Dictionary of API keys from session (optional)
        env_key: Environment variable name to fall back to (optional, defaults to {key_type.upper()}_API_KEY)
    
    Returns:
        API key string or None if not found
    """
    # First, try to get from session API keys
    if api_keys:
        # Try exact match first (case-sensitive)
        if key_type in api_keys and api_keys[key_type]:
            return api_keys[key_type]
        
        # Try case-insensitive match
        key_type_lower = key_type.lower()
        for k, v in api_keys.items():
            if k.lower() == key_type_lower and v:
                return v
    
    # Fall back to environment variable
    if env_key is None:
        # Default env key format: {KEY_TYPE}_API_KEY
        env_key = f"{key_type.upper()}_API_KEY"
    
    return os.getenv(env_key)


# Convenience functions for common API keys
def get_openrouter_api_key(api_keys: Optional[Dict[str, str]] = None) -> Optional[str]:
    """Get OpenRouter API key"""
    return get_api_key("openrouter", api_keys, "OPENROUTER_API_KEY")


def get_openai_api_key(api_keys: Optional[Dict[str, str]] = None) -> Optional[str]:
    """Get OpenAI API key"""
    return get_api_key("openai", api_keys, "OPENAI_API_KEY")


def get_groq_api_key(api_keys: Optional[Dict[str, str]] = None) -> Optional[str]:
    """Get Groq API key"""
    return get_api_key("groq", api_keys, "GROQ_API_KEY")


def get_tavily_api_key(api_keys: Optional[Dict[str, str]] = None) -> Optional[str]:
    """Get Tavily API key"""
    return get_api_key("tavily", api_keys, "TAVILY_API_KEY")


def get_composio_api_key(api_keys: Optional[Dict[str, str]] = None) -> Optional[str]:
    """Get Composio API key"""
    return get_api_key("composio", api_keys, "COMPOSIO_API_KEY")


def get_firecrawl_api_key(api_keys: Optional[Dict[str, str]] = None) -> Optional[str]:
    """Get Firecrawl API key"""
    return get_api_key("firecrawl", api_keys, "FIRECRAWL_API_KEY")


def get_replicate_api_key(api_keys: Optional[Dict[str, str]] = None) -> Optional[str]:
    """Get Replicate API key"""
    return get_api_key("replicate", api_keys, "REPLICATE_API_KEY")

