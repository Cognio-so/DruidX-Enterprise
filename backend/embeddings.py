
import os
from langchain_openai import OpenAIEmbeddings
from typing import List
import httpx
import asyncio

_persistent_http_client = httpx.Client(
    http2=True,
    timeout=httpx.Timeout(60.0),  
    headers={
        "Connection": "keep-alive",
        "User-Agent": "DruidX-Embedding-Service/1.0"
    },
)

_cached_embedding_models: dict = {}


def get_embedding_model(model: str = "text-embedding-3-small", api_keys: dict = None) -> OpenAIEmbeddings:
    """
    Get or create cached OpenAIEmbeddings instance with shared HTTP client.
    
    ⚙️ Features:
    - Single cached instance (no re-instantiation)
    - Persistent HTTP/2 keep-alive connection pool
    - Reduced TLS handshake latency
    - Shared across all sessions for maximum efficiency
    
    Args:
        model: Embedding model name (default: "text-embedding-3-small")
    
    Returns:
        Cached OpenAIEmbeddings instance
    """
    global _cached_embedding_models
    
    from api_keys_util import get_openai_api_key
    
    # Create cache key based on model and API key (to support different sessions)
    api_key = get_openai_api_key(api_keys) if api_keys else None
    cache_key = f"{model}_{api_key if api_key else 'env'}"
    
    if cache_key not in _cached_embedding_models:
        embedding_kwargs = {
            "model": model,
            "http_client": _persistent_http_client,
            "show_progress_bar": False
        }
        if api_key:
            embedding_kwargs["openai_api_key"] = api_key
        _cached_embedding_models[cache_key] = OpenAIEmbeddings(**embedding_kwargs)
        print(f"[Embeddings] ✅ Initialized cached embedding model: {model} (cache_key: {cache_key[:20]}...)")
    
    return _cached_embedding_models[cache_key]


async def embed_chunks_parallel(
    texts: List[str], 
    batch_size: int = 200,
    model: str = "text-embedding-3-small",
    api_keys: dict = None
) -> List[List[float]]:
    """
    Process embeddings in parallel batches for maximum efficiency.
    
    Splits large text lists into batches and processes them concurrently using asyncio.gather().
    This enables:
    - Parallel processing of multiple batches
    - No blocking between different sessions
    - Optimal batch sizes for API efficiency
    - Preserved order of results
    
    Args:
        texts: List of text strings to embed
        batch_size: Number of texts per batch (default: 200, optimal for OpenAI API)
        model: Embedding model name
    
    Returns:
        List of embedding vectors in the same order as input texts
    
    Example:
        >>> texts = ["text1", "text2", ..., "text1000"]
        >>> embeddings = await embed_chunks_parallel(texts, batch_size=200)
        >>> # Will create 5 batches of 200, process them in parallel
    """
    if not texts:
        return []

    embedding_model = get_embedding_model(model, api_keys=api_keys)
    batches = [texts[i:i + batch_size] for i in range(0, len(texts), batch_size)]
    
    if len(batches) == 1:
        print(f"[Embeddings] Processing single batch of {len(texts)} texts")
        embeddings = await embedding_model.aembed_documents(batches[0])
        return embeddings
    
    async def embed_batch(batch: List[str], batch_idx: int) -> List[List[float]]:
        """Embed a single batch"""
        try:
            result = await embedding_model.aembed_documents(batch)
            print(f"[Embeddings] ✅ Batch {batch_idx + 1}/{len(batches)} completed ({len(batch)} texts)")
            return result
        except Exception as e:
            print(f"[Embeddings] ❌ Batch {batch_idx + 1}/{len(batches)} failed: {e}")
            return [[0.0] * 1536] * len(batch)  
        
    batch_results = await asyncio.gather(
        *[embed_batch(batch, idx) for idx, batch in enumerate(batches)],
        return_exceptions=True
    )
    
    all_embeddings = []
    for batch_result in batch_results:
        if isinstance(batch_result, Exception):
            print(f"[Embeddings] ⚠️ Batch raised exception: {batch_result}")
            continue
        all_embeddings.extend(batch_result)
    
    print(f"[Embeddings] ✅ Completed parallel embedding: {len(all_embeddings)}/{len(texts)} embeddings")
    return all_embeddings


async def embed_query(
    query: str,
    model: str = "text-embedding-3-small",
    api_keys: dict = None
) -> List[float]:
    """
    Embed a single query string (optimized wrapper).
    
    Args:
        query: Query text to embed
        model: Embedding model name
    
    Returns:
        Embedding vector as list of floats
    """
    embedding_model = get_embedding_model(model, api_keys=api_keys)
    return await embedding_model.aembed_query(query)

