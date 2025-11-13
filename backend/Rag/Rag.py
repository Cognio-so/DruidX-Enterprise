from graph_type import GraphState
from langchain_core.prompts import ChatPromptTemplate
from typing import Optional, Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_groq import ChatGroq
import uuid  
from typing import List, Optional, Dict, Any
import os
from qdrant_client import QdrantClient, models
from WebSearch.websearch import web_search
from rank_bm25 import BM25Okapi
import re
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
from prompt_cache import normalize_prefix
from redis_client import ensure_redis_client, ensure_redis_client_binary
import dill

QDRANT_URL = os.getenv("QDRANT_URL", ":memory:")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
from llm import get_llm, stream_with_token_tracking, _extract_usage
from embeddings import embed_chunks_parallel, embed_query

try:
    if QDRANT_URL == ":memory:":
        QDRANT_CLIENT = QdrantClient(":memory:")
    else:
        QDRANT_CLIENT = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        # Test the connection
        QDRANT_CLIENT.get_collections()
        print(f"[RAG] Connected to remote Qdrant at {QDRANT_URL}")
except Exception as e:
    print(f"[RAG] Remote Qdrant failed, falling back to in-memory: {e}")
    QDRANT_CLIENT = QdrantClient(":memory:")

VECTOR_SIZE = 1536
import aiofiles
prompt_path = os.path.join(os.path.dirname(__file__), "Rag.md")
def load_base_prompt() -> str:
    path = os.path.join(os.path.dirname(__file__), "Rag.md")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return "You are a Retrieval-Augmented Generation (RAG) assistant. Answer using only the provided context."

base_rag_prompt = load_base_prompt()
CORE_PREFIX_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "core_prefix.md")
RAG_RULES_PATH = os.path.join(os.path.dirname(__file__), "Rag.md")

CORE_PREFIX = ""
RAG_RULES = ""

try:
    with open(CORE_PREFIX_PATH, "r", encoding="utf-8") as f:
        CORE_PREFIX = f.read()
except FileNotFoundError:
    CORE_PREFIX = "You are a helpful AI assistant using retrieval."

try:
    with open(RAG_RULES_PATH, "r", encoding="utf-8") as f:
        RAG_RULES = f.read()
except FileNotFoundError:
    RAG_RULES = "You are a retrieval-augmented generation assistant."

STATIC_SYS_RAG = normalize_prefix([CORE_PREFIX, RAG_RULES])

import hashlib
import time



async def clear_kb_cache(collection_name: str = None):
    """Clear KB embedding cache for a specific collection or all collections"""
    redis_client = await ensure_redis_client()
    if not redis_client:
        return
    if collection_name:
        keys_to_delete = await redis_client.keys(f"kb_cache:{collection_name}:*")
        if keys_to_delete:
            await redis_client.delete(*keys_to_delete)
        print(f"[RAG] Cleared KB cache for {collection_name}")
    else:
        keys_to_delete = await redis_client.keys("kb_cache:*")
        if keys_to_delete:
            await redis_client.delete(*keys_to_delete)
        print("[RAG] Cleared all KB embedding cache")

async def clear_user_doc_cache(session_id: str = None):
    """Clear user document embedding cache for a specific session or all sessions"""
    redis_client = await ensure_redis_client()
    redis_client_binary = await ensure_redis_client_binary()
    if not redis_client:
        return
    if session_id:
        keys_to_delete = await redis_client.keys(f"user_doc_cache:{session_id}:*")
        if redis_client_binary:
            binary_keys = await redis_client_binary.keys(f"bm25_index:user_docs_{session_id}")
            keys_to_delete.extend(binary_keys)
        if keys_to_delete:
            await redis_client.delete(*keys_to_delete)
        print(f"[RAG] Cleared user doc cache for session {session_id}")
    else:
        keys_to_delete = await redis_client.keys("user_doc_cache:*")
        if redis_client_binary:
            binary_keys = await redis_client_binary.keys("bm25_index:*")
            keys_to_delete.extend(binary_keys)
        if keys_to_delete:
            await redis_client.delete(*keys_to_delete)
        print("[RAG] Cleared all user document caches (embeddings, BM25)")


async def clear_image_cache(session_id: str = None):
    """Clear image analysis cache for a specific session or all sessions"""
    redis_client = await ensure_redis_client()
    if not redis_client:
        return
    if session_id:
        await redis_client.delete(f"image_cache:{session_id}")
        print(f"[RAG] Cleared image analysis cache for session {session_id}")
    else:
        keys_to_delete = await redis_client.keys("image_cache:*")
        if keys_to_delete:
            await redis_client.delete(*keys_to_delete)
        print("[RAG] Cleared all image analysis cache")

async def preprocess_kb_documents(kb_docs: List[dict], session_id: str, is_hybrid: bool = False):
    """
    Pre-process KB documents when custom GPT is loaded.
    Generate embeddings once and cache for the session.
    """
    if not kb_docs:
        return
    
    collection_name = f"kb_{session_id}"
    cache_key = f"kb_cache:{collection_name}"

    redis_client = await ensure_redis_client()
    if redis_client and await redis_client.exists(cache_key):
        print(f"[RAG] KB already processed for session {session_id}")
        return
    
    # print(f"[RAG] Pre-processing {len(kb_docs)} KB documents for session {session_id}")

    kb_texts = []
    for doc in kb_docs:
        if isinstance(doc, dict) and "content" in doc:
            kb_texts.append(doc["content"])
        else:
            kb_texts.append(str(doc))

    await retreive_docs(kb_texts, collection_name, is_hybrid=is_hybrid, clear_existing=False, is_kb=True, session_id=session_id)
    
    if redis_client:
        await redis_client.hset(cache_key, mapping={
            "collection_name": collection_name,
            "is_hybrid": str(is_hybrid),
            "processed_at": str(asyncio.get_event_loop().time()),
            "document_count": len(kb_texts)
        })
        await redis_client.expire(cache_key, 86400) # Expire after 24 hours
    
    print(f"[RAG] Pre-processed and cached {len(kb_texts)} KB documents for session {session_id}")

async def preprocess_user_documents(docs: List[dict], session_id: str, is_hybrid: bool = False, is_new_upload: bool = False):
    """
    Pre-process user documents by generating embeddings and storing them in cache.
    This is called immediately after document upload to prepare for fast RAG retrieval.
    
    Args:
        docs: List of document dictionaries with content (ONLY the new documents)
        session_id: Session identifier for cache management
        is_hybrid: Whether to use hybrid RAG (BM25 + vector)
        is_new_upload: Whether this is a new document upload (clears old cache and processes only new docs)
    """
    if not docs:
        return
    
    collection_name = f"user_docs_{session_id}"
    cache_key = f"user_doc_cache:{session_id}"

    redis_client = await ensure_redis_client()
    redis_client_binary = await ensure_redis_client_binary()
    if is_new_upload:
        if redis_client:
            await redis_client.delete(cache_key)
            print(f"🔥 [CACHE-DEBUG] Cleared existing user doc cache for session {session_id}")
            if redis_client_binary:
                await redis_client_binary.delete(f"bm25_index:{collection_name}")
                print(f"🔥 [CACHE-DEBUG] Cleared old BM25 index for {collection_name}")
    
        try:
            collections_response = await asyncio.to_thread(QDRANT_CLIENT.get_collections)
            collections = [c.name for c in collections_response.collections]
            print(f"🔥 [CACHE-DEBUG] Current Qdrant collections: {collections}")
            if collection_name in collections:
                await asyncio.to_thread(QDRANT_CLIENT.delete_collection, collection_name=collection_name)
                print(f"🔥 [CACHE-DEBUG] Deleted existing collection: {collection_name}")
            else:
                print(f"🔥 [CACHE-DEBUG] Collection {collection_name} not found in Qdrant")
        except Exception as e:
            print(f"🔥 [CACHE-DEBUG] Warning: Failed to clear existing collection {collection_name}: {e}")
    
    print(f"[RAG] Pre-processing {len(docs)} NEW user documents for session {session_id}")

    doc_texts = []
    doc_metas = []
    for doc in docs:
        if isinstance(doc, dict) and "content" in doc:
            doc_texts.append(doc["content"])
        else:
            doc_texts.append(str(doc))
        # Attach provenance metadata for each document
        if isinstance(doc, dict):
            doc_metas.append({
                "doc_id": doc.get("id"),
                "filename": doc.get("filename"),
                "file_type": doc.get("file_type"),
            })
        else:
            doc_metas.append({})

    await retreive_docs(
        doc_texts,
        collection_name,
        is_hybrid=is_hybrid,
        clear_existing=is_new_upload,
        is_user_doc=True,
        session_id=session_id,
        metadatas=doc_metas,
    )

    if redis_client:
        await redis_client.hset(cache_key, mapping={
            "collection_name": collection_name,
            "is_hybrid": str(is_hybrid),
            "processed_at": str(asyncio.get_event_loop().time()),
            "document_count": len(doc_texts)
        })
        await redis_client.expire(cache_key, 86400) # Expire after 24 hours
    
    print(f"[RAG] Pre-processed and cached {len(doc_texts)} NEW user documents for session {session_id}")

async def preprocess_images(uploaded_images: List[Dict[str, Any]], state: GraphState):
    """
    Pre-process uploaded images to generate and cache their descriptions.
    This is called immediately after image upload to prepare for fast RAG retrieval.
    """
    redis_client = await ensure_redis_client()
    if not uploaded_images or not redis_client:
        return
    session_id = state.get("session_id")
    session_cache_key = f"image_cache:{session_id}"
    order_key = f"image_order:{session_id}"

    for image_data in uploaded_images:
        filename = image_data.get("filename", "")
        if not filename:
            continue

        if await redis_client.hexists(session_cache_key, filename):
            print(f"[ImagePreprocessor] Image '{filename}' already processed for session {session_id}.")
            continue

        file_content = image_data.get("file_content")
        file_url = image_data.get("file_url")

        if not file_content and file_url:
            print(f"[ImagePreprocessor] No file_content for {filename}, fetching from {file_url}")
            try:
                import httpx
                async with httpx.AsyncClient() as client:
                    response = await client.get(file_url, timeout=30.0)
                    response.raise_for_status()
                    file_content = response.content
            except Exception as e:
                print(f"[ImagePreprocessor] Failed to fetch image '{filename}': {e}")
                continue
        
        if not file_content:
            print(f"[ImagePreprocessor] Skipping '{filename}' as it has no content.")
            continue
        
        print(f"[ImagePreprocessor] Pre-processing image: {filename}")
        await send_status_update(state, f"🖼️ Analyzing image: {filename}...", progress=None)
        
        analysis = await extract_text_from_image(file_content, filename, state)
        await redis_client.hset(session_cache_key, filename, analysis)
        await redis_client.rpush(order_key, filename)
        image_index = await redis_client.llen(order_key)

        print(f"[ImagePreprocessor] Cached analysis for '{filename}' in session {session_id}")
        try:
            collection_name = f"user_images_{session_id}"
            collections_response = await asyncio.to_thread(QDRANT_CLIENT.get_collections)
            collections = [c.name for c in collections_response.collections]
            collection_is_new = collection_name not in collections
            
            if collection_is_new:
                await asyncio.to_thread(
                    QDRANT_CLIENT.recreate_collection,
                    collection_name=collection_name,
                    vectors_config=models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
                )
            
            # Always ensure indexes exist (for both new and existing collections)
            # This handles cases where collection was created before index support was added
            try:
                await asyncio.to_thread(
                    QDRANT_CLIENT.create_payload_index,
                    collection_name=collection_name,
                    field_name="id",
                    field_schema=models.PayloadSchemaType.KEYWORD
                )
            except Exception as e:
                if "already exists" not in str(e).lower():
                    print(f"[ImagePreprocessor] Note: Could not create index for 'id': {e}")
            
            try:
                await asyncio.to_thread(
                    QDRANT_CLIENT.create_payload_index,
                    collection_name=collection_name,
                    field_name="image_index",
                    field_schema=models.PayloadSchemaType.INTEGER
                )
            except Exception as e:
                if "already exists" not in str(e).lower():
                    print(f"[ImagePreprocessor] Note: Could not create index for 'image_index': {e}")
            
            try:
                await asyncio.to_thread(
                    QDRANT_CLIENT.create_payload_index,
                    collection_name=collection_name,
                    field_name="filename",
                    field_schema=models.PayloadSchemaType.KEYWORD
                )
            except Exception as e:
                if "already exists" not in str(e).lower():
                    print(f"[ImagePreprocessor] Note: Could not create index for 'filename': {e}")
            
            if collection_is_new:
                print(f"[ImagePreprocessor] Created new collection with payload indexes for id, image_index, and filename")
            
            embs = await embed_chunks_parallel([analysis], batch_size=1)
            payload = {
                "text": analysis,
                "filename": filename,
                "file_url": file_url or "",
                "file_type": image_data.get("file_type", "image"),
                "id": image_data.get("id"),
                "size": image_data.get("size", 0),
                "image_index": image_index,  
                "source": "image",
            }
            await asyncio.to_thread(
                QDRANT_CLIENT.upsert,
                collection_name=collection_name,
                points=[
                    models.PointStruct(
                        id=str(uuid.uuid4()),
                        vector=embs[0],
                        payload=payload,
                    )
                ],
            )
            print(f"[ImagePreprocessor] Upserted image analysis embedding for {filename} (index {image_index})")
        except Exception as e:
            print(f"[ImagePreprocessor] Failed to embed/upsert image analysis for {filename}: {e}")

    if redis_client and uploaded_images:
        await redis_client.expire(session_cache_key, 86400) 
        await redis_client.expire(order_key, 86400) 
    if "uploaded_images" in state:
        state["uploaded_images"] = []


async def send_status_update(state: GraphState, message: str, progress: int = None):
    """Send status update if callback is available"""
    if hasattr(state, '_status_callback') and state._status_callback:
        await state._status_callback({
            "type": "status",
            "data": {
                "status": "processing",
                "message": message,
                "current_node": "RAG",
                "progress": progress
            }
        })
async def retreive_docs(doc: List[str], name: str, is_hybrid: bool = False, clear_existing: bool = False, is_kb: bool = False, is_user_doc: bool = False, session_id: str = "default", metadatas: Optional[List[Dict[str, Any]]] = None):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    if metadatas and len(metadatas) == len(doc):
        chunked_docs = text_splitter.create_documents(doc, metadatas=metadatas)
    else:
        chunked_docs = text_splitter.create_documents(doc)
    chunk_texts = [doc.page_content for doc in chunked_docs]
    embeddings = await embed_chunks_parallel(chunk_texts, batch_size=200)
    
    collections_response = await asyncio.to_thread(QDRANT_CLIENT.get_collections)
    collections = [c.name for c in collections_response.collections]
    
    if clear_existing and name in collections:
        print(f"[RAG] Clearing existing collection: {name}")
        await asyncio.to_thread(QDRANT_CLIENT.delete_collection, collection_name=name)
        collections.remove(name)  
    
    if name not in collections:
        await asyncio.to_thread(
            QDRANT_CLIENT.recreate_collection,
            collection_name=name,
            vectors_config=models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
        )
        # Create indexes for payload fields that will be filtered on
        await asyncio.to_thread(
            QDRANT_CLIENT.create_payload_index,
            collection_name=name,
            field_name="doc_id",
            field_schema=models.PayloadSchemaType.KEYWORD
        )
        await asyncio.to_thread(
            QDRANT_CLIENT.create_payload_index,
            collection_name=name,
            field_name="filename",
            field_schema=models.PayloadSchemaType.KEYWORD
        )
        await asyncio.to_thread(
            QDRANT_CLIENT.create_payload_index,
            collection_name=name,
            field_name="file_type",
            field_schema=models.PayloadSchemaType.KEYWORD
        )
        print(f"[RAG] Created payload indexes for doc_id, filename, and file_type in collection {name}")
    
    async def extract_heading(txt):
        lines = txt.split("\n")
        for l in lines:
            l = l.strip()
            if re.match(r"^(UNIT[\s–-]*[IVXLC0-9]+|CHAPTER[\s–-]*\d+|^\d+(\.\d+)+|[A-Z][A-Za-z\s]{4,})", l):
                return re.sub(r"^[\d.:\s–-]+", "", l).strip(":–- ")
        return None

    await asyncio.to_thread(
        QDRANT_CLIENT.upsert,
        collection_name=name,
        points=[
            models.PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding,
                payload={
                    "text": d.page_content,
                    "page": d.metadata.get("page", 0),
                    "chunk_index": i,
                    "heading": await extract_heading(d.page_content),
                    "doc_id": d.metadata.get("doc_id"),
                    "filename": d.metadata.get("filename"),
                    "file_type": d.metadata.get("file_type"),
                },
            )
            for i, (d, embedding) in enumerate(zip(chunked_docs, embeddings))
        ]
    )
    if is_hybrid:
        tokenized_docs = [tokenize(doc.page_content) for doc in chunked_docs]
        bm25 = await asyncio.to_thread(BM25Okapi, tokenized_docs)
        redis_client_binary = await ensure_redis_client_binary()
        if redis_client_binary:
            try:
                serialized_bm25 = dill.dumps({
                    "bm25": bm25,
                    "docs": {str(i): doc.page_content for i, doc in enumerate(chunked_docs)},
                    "tokens": tokenized_docs
                })
                redis_key = f"bm25_index:{name}"
                await redis_client_binary.set(redis_key, serialized_bm25)
                await redis_client_binary.expire(redis_key, 86400)
                print(f"[RAG] Stored BM25 index in Redis for {name}")
            except Exception as e:
                print(f"[RAG] ERROR: Failed to serialize and store BM25 index in Redis: {e}")
    
        print(f"[RAG] Stored {len(chunked_docs)} chunks in {name} (Vector + BM25)")
    else:
        print(f"[RAG] Stored {len(chunked_docs)} chunks in {name} (Vector only)")
def tokenize(text: str):
    tokens = re.findall(r"\w+", text.lower())
    return [t for t in tokens if t not in ENGLISH_STOP_WORDS]
async def _search_collection(collection_name: str, query: str, limit: int) -> List[str]:
    """
    Helper function to perform a semantic search on a Qdrant collection and return the text of the top results.
    """
    # Check if collection exists before searching
    try:
        collections_response = await asyncio.to_thread(QDRANT_CLIENT.get_collections)
        collections = [c.name for c in collections_response.collections]
        if collection_name not in collections:
            print(f"[SEARCH] Collection '{collection_name}' doesn't exist")
            return []
    except Exception as e:
        print(f"[SEARCH] Error checking collection existence: {e}")
        return []
    
    try:
        query_embedding = await embed_query(query)
        
        search_results = await asyncio.to_thread(
            QDRANT_CLIENT.search,
            collection_name=collection_name,
            query_vector=query_embedding,
            limit=limit
        )
        result = [result.payload["text"] for result in search_results]
        
        return result
    except Exception as e:
        print(f"[SEARCH] Error searching collection '{collection_name}': {e}")
        return []
async def _reciprocal_rank_fusion(rankings: List[List[str]], k: int = 60) -> List[str]:
    """
    Reciprocal Rank Fusion (RRF) algorithm to combine multiple ranked lists.
    RRF is superior to weighted score fusion because:
    - No score normalization needed
    - More robust across different scoring scales
    - Better handles heterogeneous retrieval methods
    - Proven effective in academic research
    Formula: RRF(d) = Σ(1 / (k + rank(d)))
    where rank(d) is the rank of document d in a ranking (1-indexed)
    
    Args:
        rankings: List of ranked document lists from different retrieval methods
        k: Constant to prevent high ranks from dominating (default 60 from research)
    
    Returns:
        Fused ranking of documents
    """
    rrf_scores = {}
    
    for ranking in rankings:
        for rank, doc in enumerate(ranking, start=1):
            if doc not in rrf_scores:
                rrf_scores[doc] = 0
            rrf_scores[doc] += 1 / (k + rank)
    sorted_docs = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return [doc for doc, score in sorted_docs]
import asyncio

async def _bm25_scores(bm25, tokenized_query):
    """Run BM25 scoring in a thread to avoid blocking the async loop."""
    return await asyncio.to_thread(bm25.get_scores, tokenized_query)

async def _search_image_collection(
    session_id: str, 
    query: str, 
    limit: int = 8,
    filter_image_ids: Optional[List[str]] = None,
    filter_image_indices: Optional[List[int]] = None
) -> List[str]:
    """
    Semantic search over embedded image analyses for this session.
    
    Args:
        session_id: Session identifier
        query: Search query
        limit: Maximum results to return
        filter_image_ids: Optional list of image IDs to filter by
        filter_image_indices: Optional list of image indices (1-based) to filter by
    """
    collection_name = f"user_images_{session_id}"
    
    # Check if collection exists before searching
    try:
        collections_response = await asyncio.to_thread(QDRANT_CLIENT.get_collections)
        collections = [c.name for c in collections_response.collections]
        if collection_name not in collections:
            print(f"[IMAGE-SEARCH] Collection '{collection_name}' doesn't exist yet (no images uploaded)")
            return []
    except Exception as e:
        print(f"[IMAGE-SEARCH] Error checking collection existence: {e}")
        return []
    
    try:
        query_embedding = await embed_query(query)
        query_filter = None
        if filter_image_ids:
            query_filter = models.Filter(
                must=[
                    models.FieldCondition(
                        key="id",
                        match=models.MatchAny(any=filter_image_ids)
                    )
                ]
            )
        elif filter_image_indices:
            query_filter = models.Filter(
                must=[
                    models.FieldCondition(
                        key="image_index",
                        match=models.MatchAny(any=filter_image_indices)
                    )
                ]
            )
        
        results = await asyncio.to_thread(
            QDRANT_CLIENT.search,
            collection_name=collection_name,
            query_vector=query_embedding,
            limit=limit,
            query_filter=query_filter
        )
    except Exception as e:
        print(f"[IMAGE-SEARCH] Error searching image collection: {e}")
        return []
    
    blocks: List[str] = []
    for r in results:
        p = r.payload or {}
        fname = p.get("filename", "unknown")
        idx = p.get("image_index")
        txt = p.get("text", "")
        img_id = p.get("id", "")
        
        # Mark if this is a newly uploaded image
        is_new = " (NEWLY UPLOADED)" if filter_image_ids and img_id in filter_image_ids else ""
        header = f"=== Image {idx if idx else ''}: {fname}{is_new} ===".strip()
        if txt:
            blocks.append(f"{header}\n{txt}")
    
    return blocks

async def _hybrid_search_rrf(collection_name: str, query: str, limit: int, k: int = 60) -> List[str]:
    """
    Hybrid RAG with RRF: Combines vector search (semantic) and BM25 (keyword) using RRF.
    
    Best for:
    - Queries with both semantic and keyword requirements
    - Technical terms, acronyms, proper nouns
    - Mixed natural language + specific terms
    - When you need robust retrieval across different query types
    
    Process:
    1. Vector Search: Get semantically similar documents
    2. BM25 Search: Get keyword-matched documents
    3. RRF Fusion: Combine rankings using reciprocal rank formula
    
    Args:
        collection_name: Name of the collection
        query: Search query
        limit: Number of final results to return
        k: RRF constant (default 60, recommended in literature)
    
    Returns:
        List of top documents based on RRF fusion
    """
    # Check if collection exists before searching
    try:
        collections_response = await asyncio.to_thread(QDRANT_CLIENT.get_collections)
        collections = [c.name for c in collections_response.collections]
        if collection_name not in collections:
            print(f"[HYBRID-RRF] Collection '{collection_name}' doesn't exist")
            return []
    except Exception as e:
        print(f"[HYBRID-RRF] Error checking collection existence: {e}")
        return []
    
    try:
        query_embedding = await embed_query(query)
        vector_results = await asyncio.to_thread(
            QDRANT_CLIENT.search,
            collection_name=collection_name,
            query_vector=query_embedding,
            limit=limit * 3
        )
        vector_ranking = [result.payload["text"] for result in vector_results]

        bm25_data = None
        redis_client_binary = await ensure_redis_client_binary()
        if redis_client_binary:
            try:
                serialized_data = await redis_client_binary.get(f"bm25_index:{collection_name}")
                if serialized_data:
                    bm25_data = dill.loads(serialized_data)
                    print(f"[HYBRID-RRF] Loaded BM25 index from Redis for {collection_name}")
            except Exception as e:
                print(f"[HYBRID-RRF] ERROR: Failed to load BM25 index from Redis: {e}")

        if not bm25_data:
            print(f"[HYBRID-RRF] No BM25 index for {collection_name}, falling back to vector only")
            return vector_ranking[:limit]
        
        bm25 = bm25_data["bm25"]
        docs = bm25_data["docs"]
        
        tokenized_query = tokenize(query)
        bm25_scores = await _bm25_scores(bm25, tokenized_query)
        scored_docs = [(score, docs[str(idx)]) for idx, score in enumerate(bm25_scores)]

       
        if len(bm25_scores) > 0:
            max_score = max(bm25_scores)
            mean_score = sum(bm25_scores) / len(bm25_scores)
            bm25_threshold = max(max_score * 0.2, mean_score * 0.5, 0.1)
        else:
            bm25_threshold = 0.1
        bm25_ranking = [doc for score, doc in scored_docs if score > bm25_threshold]

        bm25_ranking = bm25_ranking[:limit * 3]
        
        fused_ranking = await _reciprocal_rank_fusion([vector_ranking[:limit*3], bm25_ranking[:limit*3]], k=k)
        top_results = fused_ranking[:limit]
        
        print(f"[HYBRID-RRF] Fused {len(vector_ranking)} vector + {len(bm25_ranking)} BM25 → {len(top_results)} results (k={k})")
        return top_results
    except Exception as e:
        print(f"[HYBRID-RRF] Error during hybrid search: {e}")
        return []
async def _hybrid_search_intersection(collection_name: str, query: str, limit: int = 5) -> List[str]:
    """
    Hybrid RAG with Intersection: returns only documents present in BOTH
    vector search and BM25 results.
    
    Best for:
    - High precision tasks
    - Queries where you want strict agreement between semantic and keyword retrieval
    """
    # Check if collection exists before searching
    try:
        collections_response = await asyncio.to_thread(QDRANT_CLIENT.get_collections)
        collections = [c.name for c in collections_response.collections]
        if collection_name not in collections:
            print(f"[HYBRID-INTERSECTION] Collection '{collection_name}' doesn't exist")
            return []
    except Exception as e:
        print(f"[HYBRID-INTERSECTION] Error checking collection existence: {e}")
        return []
    
    try:
        query_embedding = await embed_query(query)
        vector_results = await asyncio.to_thread(
            QDRANT_CLIENT.search,
            collection_name=collection_name,
            query_vector=query_embedding,
            limit=limit * 5
        )
        vector_docs = {result.payload["text"] for result in vector_results}

        bm25_data = None
        redis_client_binary = await ensure_redis_client_binary()
        if redis_client_binary:
            try:
                serialized_data = await redis_client_binary.get(f"bm25_index:{collection_name}")
                if serialized_data:
                    bm25_data = dill.loads(serialized_data)
                    print(f"[HYBRID-INTERSECTION] Loaded BM25 index from Redis for {collection_name}")
            except Exception as e:
                print(f"[HYBRID-INTERSECTION] ERROR: Failed to load BM25 index from Redis: {e}")


        if not bm25_data:
            print(f"[HYBRID-INTERSECTION] No BM25 index for {collection_name}, falling back to vector only")
            return list(vector_docs)[:limit]

        bm25 = bm25_data["bm25"]
        docs = bm25_data["docs"]

        tokenized_query = tokenize(query)
        bm25_scores = await _bm25_scores(bm25, tokenized_query)
        bm25_ranked = [docs[str(idx)] for idx in sorted(
            range(len(bm25_scores)), key=lambda x: bm25_scores[x], reverse=True
        )[:limit * 5]]
        bm25_docs = set(bm25_ranked)
        common_docs = list(vector_docs.intersection(bm25_docs))
        if len(common_docs) < limit:
            print(f"[HYBRID-INTERSECTION] Too few common docs, falling back to union")
            common_docs = list(vector_docs.union(bm25_docs))

        top_results = common_docs[:limit]
        print(f"[HYBRID-INTERSECTION] Found {len(top_results)} common results")
        return top_results
    except Exception as e:
        print(f"[HYBRID-INTERSECTION] Error during hybrid search: {e}")
        return []

def create_combined_system_prompt(custom_prompt: str, base_prompt: str) -> str:
    """
    Combine the custom GPT prompt with the base RAG prompt
    """
    if not custom_prompt.strip():
        return base_prompt
    
    combined_prompt = f"""
# RAG SYSTEM INSTRUCTIONS
{base_prompt}
----
# CUSTOM GPT CONFIGURATION
{custom_prompt}

"""
    
    return combined_prompt
async def intelligent_source_selection(
    user_query: str,
    has_user_docs: bool,
    has_kb: bool,
    custom_prompt: str = "",
    llm_model: str = "gpt-4o-mini"
) -> Dict[str, Any]:
    """
    Use LLM to intelligently decide which knowledge sources to use.
    
    Returns:
        {
            "use_user_docs": bool,
            "use_kb": bool,
            "search_strategy": str,  # "user_only", "kb_only", "both", "none"
        }
    """
    
    classification_prompt = f"""
You are a precise and logical routing agent for an AI system. Your only job is to analyze the user's query and the system's state to decide which knowledge source to use for the answer.

---
## System State & Context

* **User Query:** "{user_query}"
* **User Document Status:** A new document was just uploaded for this query: **{has_user_docs}**
* **Knowledge Base (KB) Status:** {"Available" if has_kb else "Not Available"}
* **Custom GPT Instructions:** "{custom_prompt or 'General assistant'}"

---
## Decision Logic (Follow in this exact order)

**1. PRIORITY #1: The "Just Uploaded" Rule**
* **IF** a new document was just uploaded (`true`) AND the query is generic (like "summarize this", "explain", "what are the key points?"),
* **THEN** your decision **MUST BE** `"user_docs_only"`. This rule overrides all others to ensure immediate relevance.

**2. PRIORITY #2: The "Comparison & Evaluation" Rule**
* **IF** the query asks for a **comparison, review, or validation** (e.g., "compare this to","check this", "review this against", "does this meet standards?") AND the **Custom GPT Instructions** imply a standard of comparison (e.g., "You are a resume reviewer," "You are a code auditor"),
* **THEN** your decision **MUST BE** `"both"` (if the KB is available).

**3. PRIORITY #3: The "Contextual Explanation" Rule**
* **IF** the query asks for an **explanation** that requires external domain knowledge AND the **Custom GPT Instructions** indicate the KB contains that knowledge (e.g., "You are a legal contract assistant" and the query is "explain this clause"),
* **THEN** your decision is `"both"` (if the KB is available).

**4. PRIORITY #4: The Default Rule**
* **For all other specific queries** that are not simple greetings, your default decision is `"user_docs_only"` (if user documents are available).

**5. PRIORITY #5: The "No Docs / General Query" Rule**
* **IF** no user documents are available OR the query is a general question about a topic, use `"kb_only"` if the query is relevant to the KB. Otherwise, select `"none"`.

---
## Output Format

You **MUST** respond with a single, valid JSON object and nothing else.

```json
{{
    "use_user_docs": true/false,
    "use_kb": true/false,
    "search_strategy": "user_docs_only" | "kb_only" | "both" | "none",
    "reasoning": "Brief explanation of decision"
}}
""" 
    llm = ChatGroq(
        model="openai/gpt-oss-120b",  
        temperature=0.2,
        groq_api_key=os.getenv("GROQ_API_KEY")
    )
    response = await llm.ainvoke([HumanMessage(content=classification_prompt)])

    
    try:
        import json
        import re
        content = response.content.strip()
        if content.startswith('```json'):
            content = re.sub(r'^```json\s*', '', content)
        if content.endswith('```'):
            content = re.sub(r'\s*```$', '', content)
        
        result = json.loads(content)
        if not has_user_docs:
            result["use_user_docs"] = False
        if not has_kb:
            result["use_kb"] = False
            
        print(f"[SMART-ROUTING] Strategy: {result['search_strategy']} | Reasoning: {result['reasoning']}")
        return result
        
    except Exception as e:
        print(f"[SMART-ROUTING] Parse error: {e}, defaulting to all available sources")
        return {
            "use_user_docs": has_user_docs,
            "use_kb": has_kb,
            "search_strategy": "both" if (has_user_docs and has_kb) else "user_only" if has_user_docs else "kb_only",
            "reasoning": "Fallback due to parsing error"
        }
async def intelligent_image_selection(
    user_query: str,
    newly_uploaded_docs_metadata: List[Dict[str, Any]],
    session_id: str,
    uploaded_images: Optional[List[Dict[str, Any]]] = None,  
    conversation_history: Optional[List[Dict[str, Any]]] = None,  
    llm_model: str = "gpt-4o-mini"
) -> Dict[str, Any]:
    """
    Use LLM to intelligently decide which images to use based on:
    - All available images in the session (from Qdrant)
    - Newly uploaded images in metadata
    - Previously uploaded images from state (for follow-up queries)
    - Conversation history (last turn)
    - User query (semantic understanding of image references)
    
    Returns:
        {
            "use_new_images_only": bool,
            "selected_image_ids": List[str],
            "selected_image_indices": List[int],
            "reasoning": str
        }
    """
    new_images = [doc for doc in newly_uploaded_docs_metadata if doc.get("file_type") == "image"]
    new_image_ids = [img.get("id") for img in new_images if img.get("id")]
    previously_uploaded_images = []
    if uploaded_images:
        previously_uploaded_images = [
            img for img in uploaded_images 
            if isinstance(img, dict) and img.get("file_type") == "image"
        ]
    all_images_info = []
    try:
        collection_name = f"user_images_{session_id}"
        scroll_out, _ = await asyncio.to_thread(
            QDRANT_CLIENT.scroll,
            collection_name=collection_name,
            limit=1000
        )
        for point in scroll_out:
            payload = point.payload or {}
            all_images_info.append({
                "id": payload.get("id", ""),
                "filename": payload.get("filename", "unknown"),
                "image_index": payload.get("image_index", 0),
                "is_newly_uploaded": payload.get("id") in new_image_ids if new_image_ids else False
            })
        all_images_info.sort(key=lambda x: x.get("image_index", 0))
    except Exception as e:
        print(f"[IMAGE-ORCHESTRATOR] Error getting all images from Qdrant: {e}")
        all_images_info = []
    if not all_images_info:
        if new_images:
            all_images_info = [
                {
                    "id": img.get("id", ""),
                    "filename": img.get("filename", "unknown"),
                    "image_index": i + 1,
                    "is_newly_uploaded": True
                }
                for i, img in enumerate(new_images)
            ]
        elif previously_uploaded_images:
            all_images_info = [
                {
                    "id": img.get("id", ""),
                    "filename": img.get("filename", "unknown"),
                    "image_index": i + 1,
                    "is_newly_uploaded": False
                }
                for i, img in enumerate(previously_uploaded_images)
            ]
    
    if not all_images_info and not new_images and not previously_uploaded_images:
        return {
            "use_new_images_only": False,
            "selected_image_ids": [],
            "selected_image_indices": [],
            "reasoning": "No images found in session"
        }
    is_followup = not new_images and (bool(all_images_info) or bool(previously_uploaded_images))
    conversation_context = ""
    if conversation_history:
        last_turn = []
        for msg in conversation_history[-2:]:  
            role = (msg.get("type") or msg.get("role") or "").lower()
            content = msg.get("content", "")
            if content:
                speaker = "User" if role in ("human", "user") else "Assistant"
                if len(content) > 500:
                    content = content[:500] + "..."
                last_turn.append(f"{speaker}: {content}")
        if last_turn:
            conversation_context = "\n".join(last_turn)
    all_images_context = ""
    if all_images_info:
        all_images_context = "\n".join([
            f"- Image {img['image_index']}: {img['filename']} (ID: {img['id']})"
            + (" [NEWLY UPLOADED]" if img.get("is_newly_uploaded") else "")
            for img in all_images_info
        ])
    
    new_images_context = ""
    if new_images:
        new_images_context = "\n".join([
            f"- Image {i+1}: {img.get('filename', 'unknown')} (ID: {img.get('id', 'unknown')})"
            for i, img in enumerate(new_images)
        ])
    
    previously_uploaded_context = ""
    if previously_uploaded_images and not all_images_info:
        previously_uploaded_context = "\n".join([
            f"- Image {i+1}: {img.get('filename', 'unknown')} (ID: {img.get('id', 'unknown')})"
            for i, img in enumerate(previously_uploaded_images)
        ])
    
    classification_prompt = f"""You are an intelligent image selection orchestrator. Your task is to analyze the user's query and determine which images from the session should be used to answer it.

**User Query:** "{user_query}"

**Is Follow-up Query:** {is_followup} (No new images uploaded in this turn, but images exist in session)

**Previous Conversation (Last Turn):**
{conversation_context if conversation_context else "No previous conversation in this context."}

**All Available Images in Session (ordered by upload time):**
{all_images_context if all_images_context else "No images in Qdrant collection."}

**Newly Uploaded Images (just uploaded in this turn):**
{new_images_context if new_images_context else "No new images uploaded in this turn."}

**Previously Uploaded Images (from session metadata):**
{previously_uploaded_context if previously_uploaded_context else "No previously uploaded images metadata available."}

**Your Task:**
Analyze the user query semantically, considering the conversation context, to understand which images they are referring to. Consider:

1. **Temporal References:**
   - "previous image", "last image", "earlier image", "before" → refers to the image uploaded before the current/newest one
   - "first image", "initial image" → refers to the earliest uploaded image (image_index: 1)
   - "latest image", "newest image", "current image", "this image" (when context suggests current upload) → refers to the most recently uploaded image

2. **Ordinal References:**
   - "first image", "image 1" → image_index: 1
   - "second image", "image 2" → image_index: 2
   - "third image", "image 3" → image_index: 3
   - And so on...

3. **Demonstrative References:**
   - "this image" (when no context) → typically refers to newly uploaded images, or the last discussed image in follow-up
   - "that image" → may refer to a previously mentioned or uploaded image
   - "these images" → typically refers to multiple newly uploaded images, or all images in follow-up

4. **Comparison Queries:**
   - "compare this image with the previous image" → use the newest image AND the one before it
   - "compare image 1 and image 2" → use images with indices 1 and 2
   - "compare the first and last images" → use image_index: 1 and the highest image_index

5. **Generic Queries:**
   - "analyze this image", "what's in this image", "describe this image" (when images were just uploaded) → use ALL newly uploaded images
   - "analyze the images", "what's in these images" → use ALL newly uploaded images if available, otherwise all images
   - For follow-up queries without explicit image reference → use images from conversation context or all available images

6. **Follow-up Queries:**
   - If the query is a follow-up (like "tell me more", "elaborate", "what else") AND images were just uploaded → use the newly uploaded images
   - If the query is a follow-up AND no new images were uploaded → use images from the previous conversation context
   - If the query explicitly references a specific image → use only that image
   - If the query references "previous image" in a follow-up context → look at the conversation history to understand which image was discussed

7. **Context-Aware Selection:**
   - Use the previous conversation to understand what images were discussed
   - If the previous turn mentioned specific images, use those for follow-up queries
   - If the query says "compare this image with the previous image" and there's conversation context, use the images from the conversation context
   - For follow-up queries, prioritize images that were mentioned in the previous conversation

**Decision Logic:**
- If the query explicitly references specific images (by number, temporal reference, or comparison), select ONLY those images.
- If the query is generic and images were just uploaded, use ALL newly uploaded images.
- If the query is a follow-up and no new images were uploaded, use images from conversation context or all available images.
- If the query doesn't mention images explicitly but images were just uploaded, use ALL newly uploaded images.
- Always prioritize newly uploaded images for generic queries unless the query explicitly references older images.
- For follow-up queries, consider the conversation context to determine which images were previously discussed.

**Output Format:**
Respond with a JSON object:
{{
    "use_new_images_only": true/false,
    "selected_image_ids": ["id1", "id2"] or [],
    "selected_image_indices": [1, 2] or [],
    "reasoning": "Clear explanation of your decision based on the query semantics and conversation context"
}}

**Important:**
- selected_image_ids should contain the actual IDs from the "All Available Images" list above, or from "Previously Uploaded Images" if Qdrant is empty
- selected_image_indices should be 1-based indices (image_index values)
- If you want to use all newly uploaded images, set selected_image_ids to all new image IDs
- If you want specific images, set selected_image_ids to those specific IDs only
- Be precise: if the query says "previous image", find the image that was uploaded just before the newest one
- Use conversation context to understand what "this image" or "that image" refers to in follow-up queries
- For follow-up queries, if no specific image is mentioned, use images from the conversation context
"""

    try:
        llm = ChatGroq(
            model="openai/gpt-oss-120b",
            temperature=0.2,
            groq_api_key=os.getenv("GROQ_API_KEY")
        )
        response = await llm.ainvoke([HumanMessage(content=classification_prompt)])
        
        import json
        import re
        content = response.content.strip()
        if content.startswith('on'):
            content = re.sub(r'^\s*', '', content)
        if content.endswith('```'):
            content = re.sub(r'\s*```$', '', content)
        
        result = json.loads(content)
        available_ids = {img["id"] for img in all_images_info if img.get("id")}

        if not available_ids and previously_uploaded_images:
            available_ids = {img.get("id") for img in previously_uploaded_images if img.get("id")}
        
        if result.get("selected_image_ids"):
            result["selected_image_ids"] = [
                img_id for img_id in result["selected_image_ids"] 
                if img_id in available_ids
            ]
        if not result.get("selected_image_ids") and result.get("selected_image_indices"):
            index_to_id = {img["image_index"]: img["id"] for img in all_images_info if img.get("id") and img.get("image_index")}
            if not index_to_id and previously_uploaded_images:
                index_to_id = {i + 1: img.get("id") for i, img in enumerate(previously_uploaded_images) if img.get("id")}
            result["selected_image_ids"] = [
                index_to_id[idx] for idx in result["selected_image_indices"] 
                if idx in index_to_id
            ]
        
        print(f"[IMAGE-ORCHESTRATOR] Decision: {result.get('reasoning', 'No reasoning provided')}")
        return result
    except Exception as e:
        print(f"[IMAGE-ORCHESTRATOR] Parse error: {e}, defaulting to all new images or all available images")
        if new_image_ids:
            return {
                "use_new_images_only": True,
                "selected_image_ids": new_image_ids,
                "selected_image_indices": list(range(1, len(new_images) + 1)) if new_images else [],
                "reasoning": f"Fallback: using all newly uploaded images (error: {str(e)})"
            }
        elif all_images_info:
            return {
                "use_new_images_only": False,
                "selected_image_ids": [img["id"] for img in all_images_info if img.get("id")],
                "selected_image_indices": [img["image_index"] for img in all_images_info if img.get("image_index")],
                "reasoning": f"Fallback: using all available images (error: {str(e)})"
            }
        else:
            return {
                "use_new_images_only": False,
                "selected_image_ids": [],
                "selected_image_indices": [],
                "reasoning": f"Fallback: no images available (error: {str(e)})"
            }
async def is_summarization_query(user_query: str) -> bool:
    """
    Detect if the query asks for summarization of the entire document.
    """
    summary_keywords = [
        "summarize", "summary", "overview", "explain this document",
        "explain the whole", "key points", "main points", "tldr",
        "analyze this file", "analyze the document", "review this document",
        "give complete summary", "give me a summary", "full document summary"
    ]
    q = user_query.lower()
    return any(kw in q for kw in summary_keywords)
    
import asyncio, random
from langchain.messages import HumanMessage
import base64
async def extract_text_from_image(file_content: bytes, filename: str = "", state: GraphState = None) -> str:
    """Extract text and description from image using GPT-4 Vision or Gemini Vision"""
    if state is None:
        state = GraphState()
    
    llm_model = state.get("llm_model")
    print(f"[ImageProcessor] GraphState llm_model: {llm_model}")
    if llm_model is None and state.get("gpt_config"):
        llm_model = state["gpt_config"].get("model")
    
    if llm_model is None:
        print(f"[ImageProcessor] Error: llm_model not found in GraphState. Cannot process image {filename}")
        return f"[Image Analysis Error: llm_model not configured in GraphState]"
    
    print(f"[ImageProcessor] Processing image {filename} with model from GraphState: {llm_model}")
    
    try:
        image_base64 = base64.b64encode(file_content).decode('utf-8')
        image_format = "jpeg"  # default
        if filename.lower().endswith('.png'):
            image_format = "png"
        elif filename.lower().endswith('.gif'):
            image_format = "gif"
        elif filename.lower().endswith('.webp'):
            image_format = "webp"
        elif filename.lower().endswith('.bmp'):
            image_format = "bmp"
        message = HumanMessage(
            content=[
                {
                    "type": "text",
                    "text": "Analyze this image in detail. Extract all visible text, describe all objects, people, scenes, colors, and any important details. If this is a document, extract the text content."
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/{image_format};base64,{image_base64}"
                    }
                }
            ]
        )
        llm = get_llm(llm_model, temperature=0.5)
        response = await llm.ainvoke([message])
        if state is not None:
            token_usage = _extract_usage(response)
            
            if token_usage["total_tokens"] > 0:
               
                if "token_usage" not in state or state["token_usage"] is None:
                    state["token_usage"] = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
                state["token_usage"]["input_tokens"] += token_usage["input_tokens"]
                state["token_usage"]["output_tokens"] += token_usage["output_tokens"]
                state["token_usage"]["total_tokens"] += token_usage["total_tokens"]
                
                print(f"[TokenTracking] Image processing tokens: input={token_usage['input_tokens']}, output={token_usage['output_tokens']}, total={token_usage['total_tokens']}")
                print(f"[TokenTracking] Accumulated token usage in state: {state['token_usage']}")
        analysis = response.content
        print(f"[ImageProcessor] Analysis: {analysis}")
        print(f"[ImageProcessor] ✅ Successfully analyzed image {filename}: {len(analysis)} chars")
        return analysis
        
    except Exception as e:
        print(f"[ImageProcessor] ❌ Error processing image {filename}: {e}")
        import traceback
        traceback.print_exc()
        return f"[Image Analysis Error: {str(e)}]"
    


async def hierarchical_summarize(state, batch_size: int = 10):
    """
    🧠 Hierarchical Summarizer for Custom GPTs
    ------------------------------------------
    - Auto-adapts between Brief / Normal / Hierarchical modes.
    - Fully async (map–reduce summarization with recursion).
    - Honors Custom GPT instructions (from gpt_config["instruction"]).
    - Streams output progressively through callbacks.
    """

    session_id = state.get("session_id")
    redis_client = await ensure_redis_client()
    cache = await redis_client.hgetall(f"user_doc_cache:{session_id}")
    if not cache:
        raise Exception("No cached document found. Please upload a document first.")

    collection_name = cache["collection_name"]
    scroll_out, _ = await asyncio.to_thread(
        QDRANT_CLIENT.scroll,
        collection_name=collection_name,
        limit=10000
    )

    chunks = [p.payload for p in scroll_out if "text" in p.payload]
    if not chunks:
        raise Exception("No chunks found in Qdrant collection.")
    chunks.sort(key=lambda x: (x.get("page", 0), x.get("chunk_index", 0)))

    chunk_callback = state.get("_chunk_callback")
    llm_model = state.get("llm_model", "gpt-4o-mini")
    gpt_config = state.get("gpt_config", {})
    custom_prompt = gpt_config.get("instruction", "").strip()

    map_llm = get_llm("google/gemini-2.5-flash-lite", 0.2)
    reduce_llm = get_llm(llm_model, 0.3)
    total_tokens = sum(len(c["text"].split()) for c in chunks)
    if total_tokens < 1200:
        mode = "brief"
    elif total_tokens < 12000:
        mode = "normal"
    else:
        mode = "hierarchical"
    custom_prefix = f"\n---\n# CUSTOM GPT INSTRUCTION\n{custom_prompt}\n---\n" if custom_prompt else ""
    def extract_heading(txt: str):
        lines = txt.split("\n")
        for l in lines:
            l = l.strip()
            if re.match(r"^(UNIT[\s–-]*[IVXLC0-9]+|CHAPTER[\s–-]*\d+|^\d+(\.\d+)+|[A-Z][A-Za-z\s]{4,})", l):
                return re.sub(r"^[\d.:\s–-]+", "", l).strip(":–- ")
        return None
    docs_by_id: Dict[str, Dict[str, Any]] = {}
    for payload in chunks:
        did = payload.get("doc_id") or payload.get("filename") or "unknown"
        grp = docs_by_id.setdefault(did, {
            "filename": payload.get("filename") or "unknown",
            "file_type": payload.get("file_type") or "unknown",
            "chunks": []
        })
        grp["chunks"].append(payload)
    if len(docs_by_id) > 1:
        await send_status_update(state, "🧠 Summarizing each document separately...", 40)
        combined_outputs: list[str] = []
        for idx, (did, info) in enumerate(docs_by_id.items(), start=1):
            doc_chunks = info.get("chunks", [])
            if not doc_chunks:
                continue
            doc_total_tokens = sum(len(c.get("text", "").split()) for c in doc_chunks)
            if doc_total_tokens < 1200:
                doc_mode = "brief"
            elif doc_total_tokens < 12000:
                doc_mode = "normal"
            else:
                doc_mode = "hierarchical"

            header = f"\n**Document {idx}: {info.get('filename', 'unknown')} ({info.get('file_type', 'unknown')})**\n"
            if chunk_callback:
                await chunk_callback(header)

            if doc_mode == "brief":
                text = "\n".join(c.get("text", "") for c in doc_chunks)
                prompt = f"""
You are a professional summarizer.
Summarize the document in detail while preserving the flow and factual integrity.

### Guidelines:
- Maintain original heading flow and key examples.
- Include definitions and technical details.
- Avoid repetition or generic statements.
{text[:16000]}
"""
                resp, _ = await stream_with_token_tracking(
                    reduce_llm,
                    [HumanMessage(content=prompt)],
                    chunk_callback=chunk_callback,
                    state=state
                )
                combined_outputs.append(f"{header}{resp.strip()}")
                continue

            if doc_mode == "normal":
                text = "\n".join(c.get("text", "") for c in doc_chunks)
                prompt = f"""

You are a professional summarizer.
Summarize the document in detail while preserving the flow and factual integrity.

### Guidelines:
- Maintain original heading flow and key examples.
- Include definitions and technical details.
- Avoid repetition or generic statements.
- Whole summary must be between 500 and 1000 words.
---
{text[:32000]}
"""
                resp, _ = await stream_with_token_tracking(
                    reduce_llm,
                    [HumanMessage(content=prompt)],
                    chunk_callback=chunk_callback,
                    state=state
                )
                combined_outputs.append(f"{header}{resp.strip()}")
                continue

            # hierarchical per-document
            avg_len = max(1, sum(len(c.get("text", "")) for c in doc_chunks) // len(doc_chunks))
            doc_batch_size = min(10, max(3, 8000 // avg_len))
            doc_batches = [doc_chunks[i:i + doc_batch_size] for i in range(0, len(doc_chunks), doc_batch_size)]

            async def summarize_batch(batch):
                combined_text = "\n".join([f"{(b.get('heading') or '')}\n{b.get('text', '')}" for b in batch])
                sub_prompt = f"""

You are summarizing a structured academic document.

### Task:
- Automatically detect and preserve natural headings (UNIT, CHAPTER, etc.).
- Summarize each section clearly and concisely (~200-300 words total).
- **Even within the word limit, do not merge or remove distinct sections.**
---
{combined_text}
"""
                resp = await map_llm.ainvoke([HumanMessage(content=sub_prompt)])
                if state:
                    token_usage = _extract_usage(resp)
                    if "token_usage" not in state or state["token_usage"] is None:
                        state["token_usage"] = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
                    state["token_usage"]["input_tokens"] += token_usage["input_tokens"]
                    state["token_usage"]["output_tokens"] += token_usage["output_tokens"]
                    state["token_usage"]["total_tokens"] += token_usage["total_tokens"]
                return resp.content.strip()

            map_results = await asyncio.gather(*[summarize_batch(b) for b in doc_batches])

            async def recursive_reduce(summaries: list[str]) -> str:
                if len(summaries) <= 5:
                    block = "\n\n".join(summaries)
                    reduce_prompt = f"""
You are merging partial summaries of a structured textbook/document.

### Task:
- Combine them while preserving all detected headings, subheadings, and their order.
- If similar headings appear across summaries, merge their content intelligently under one heading.
- Ensure the final text reads like a clean, organized outline with clear section boundaries.
- Keep the merged summary between **350 and 600 words**.

---
{block}
"""
                    resp = await map_llm.ainvoke([HumanMessage(content=reduce_prompt)])
                    if state:
                        token_usage = _extract_usage(resp)
                        if "token_usage" not in state or state["token_usage"] is None:
                            state["token_usage"] = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
                        state["token_usage"]["input_tokens"] += token_usage["input_tokens"]
                        state["token_usage"]["output_tokens"] += token_usage["output_tokens"]
                        state["token_usage"]["total_tokens"] += token_usage["total_tokens"]
                    return resp.content.strip()
                merged = []
                for i in range(0, len(summaries), 5):
                    partial = await recursive_reduce(summaries[i:i + 5])
                    merged.append(partial)
                return await recursive_reduce(merged)

            reduced_summary = await recursive_reduce(map_results)
            final_prompt = f"""
{custom_prefix} 
- **Only use the  custom gpt instructions when relevant to summarization.**
You are writing the final comprehensive summary of a structured document.

### Rules:
- Retain headings/subheadings automatically detected.
- Format them clearly (bold or sectioned).
- The total length should be about **1000-2000 words**.
- Focus on clarity and coverage rather than repetition.


---
{reduced_summary}
"""
            await send_status_update(state, "✍️ Writing per-document detailed summary...", 75)
            final_output, _ = await stream_with_token_tracking(
                reduce_llm,
                [HumanMessage(content=final_prompt)],
                chunk_callback=chunk_callback,
                state=state
            )
            if chunk_callback:
                await chunk_callback("\n\n")
            combined_outputs.append(f"{header}{final_output.strip()}")
        if chunk_callback:
            await chunk_callback("\n\n")
        return "\n\n".join(combined_outputs)
    avg_len = max(1, sum(len(c["text"]) for c in chunks) // len(chunks))
    batch_size = min(10, max(3, 8000 // avg_len))
    batches = [chunks[i:i + batch_size] for i in range(0, len(chunks), batch_size)]
    print(f"mode:", mode)
    if mode == "brief":
        text = "\n".join(c["text"] for c in chunks)
        prompt = f"""
You are a professional summarizer.
Summarize the document in detail while preserving the flow and factual integrity.

### Guidelines:
- Maintain original heading flow and key examples.
- Include definitions and technical details.
- Avoid repetition or generic statements.
{text[:16000]}
"""
        resp, _ = await stream_with_token_tracking(
            reduce_llm,
            [HumanMessage(content=prompt)],
            chunk_callback=chunk_callback,
            state=state
        )
        if chunk_callback:
            await chunk_callback("\n\n")
        return resp.strip()
    print(f"mode: {mode}, total_tokens: {total_tokens}, batches: {len(batches)}, batch_size: {batch_size}")
    if mode == "normal":
        text = "\n".join(c["text"] for c in chunks)
        prompt = f"""

You are a professional summarizer.
Summarize the document in detail while preserving the flow and factual integrity.

### Guidelines:
- Maintain original heading flow and key examples.
- Include definitions and technical details.
- Avoid repetition or generic statements.
- Whole summary must be between 500 and 1000 words.
---
{text[:32000]}
"""
        resp, _ = await stream_with_token_tracking(
            reduce_llm,
            [HumanMessage(content=prompt)],
            chunk_callback=chunk_callback,
            state=state
        )
        if chunk_callback:
            await chunk_callback("\n\n")
        return resp.strip()
    async def summarize_batch(batch):
        combined_text = "\n".join([f"{b['heading'] or ''}\n{b['text']}" for b in batch])
        prompt = f"""

You are summarizing a structured academic document.

### Task:
- Automatically detect and preserve natural headings (UNIT, CHAPTER, etc.).
- Summarize each section clearly and concisely (~200-300 words total).
- **Even within the word limit, do not merge or remove distinct sections.**
---
{combined_text}
"""


        resp = await map_llm.ainvoke([HumanMessage(content=prompt)])
        if state:
            token_usage = _extract_usage(resp)
            if "token_usage" not in state or state["token_usage"] is None:
                state["token_usage"] = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
            state["token_usage"]["input_tokens"] += token_usage["input_tokens"]
            state["token_usage"]["output_tokens"] += token_usage["output_tokens"]
            state["token_usage"]["total_tokens"] += token_usage["total_tokens"]
        return resp.content.strip()

    map_results = await asyncio.gather(*[summarize_batch(b) for b in batches])
    async def recursive_reduce(summaries: list[str]) -> str:
        if len(summaries) <= 5:
            block = "\n\n".join(summaries)
            prompt = f"""
You are merging partial summaries of a structured textbook/document.

### Task:
- Combine them while preserving all detected headings, subheadings, and their order.
- If similar headings appear across summaries, merge their content intelligently under one heading.
- Ensure the final text reads like a clean, organized outline with clear section boundaries.
- Keep the merged summary between **350 and 600 words**.

---
{block}
"""

            resp = await map_llm.ainvoke([HumanMessage(content=prompt)])
            if state:
                token_usage = _extract_usage(resp)
                if "token_usage" not in state or state["token_usage"] is None:
                    state["token_usage"] = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
                state["token_usage"]["input_tokens"] += token_usage["input_tokens"]
                state["token_usage"]["output_tokens"] += token_usage["output_tokens"]
                state["token_usage"]["total_tokens"] += token_usage["total_tokens"]
            return resp.content.strip()
        merged = []
        for i in range(0, len(summaries), 5):
            partial = await recursive_reduce(summaries[i:i + 5])
            merged.append(partial)
        return await recursive_reduce(merged)

    reduced_summary = await recursive_reduce(map_results)
    final_prompt = f"""
{custom_prefix} 
- **Only use the  custom gpt instructions when relevant to summarization.**
You are writing the final comprehensive summary of a structured document.

### Rules:
- Retain headings/subheadings automatically detected.
- Format them clearly (bold or sectioned).
- The total length should be about **1000-2000 words**.
- Focus on clarity and coverage rather than repetition.


---
{reduced_summary}
"""


    await send_status_update(state, "✍️ Writing final detailed summary...", 90)
    final_output, _ = await stream_with_token_tracking(
        reduce_llm,
        [HumanMessage(content=final_prompt)],
        chunk_callback=chunk_callback,
        state=state
    )
    if chunk_callback:
        await chunk_callback("\n\n")

    print("[Summarizer] ✅ Hierarchical summarization complete.")
    return final_output.strip()




async def _process_user_docs(state, docs, user_query, rag):
    """
    Process user documents - ONLY vector search (embeddings pre-processed on upload)
    """
    session_id = state.get("session_id", "default")
    
    await send_status_update(state, "🔍 Searching user documents...", 50)
    
    redis_client = await ensure_redis_client()
    cache_data = {}
    if redis_client:
        cache_data = await redis_client.hgetall(f"user_doc_cache:{session_id}")

    if not cache_data:
        raise Exception(f"User documents not pre-processed for session {session_id}. Please upload documents first.")
    
    collection_name = cache_data["collection_name"]
    is_hybrid = cache_data.get("is_hybrid", "False").lower() == "true"
    
    # Diversified per-document retrieval to ensure coverage from each uploaded doc
    async def _search_per_doc(collection_name: str, query: str, per_doc: int = 3, max_candidates: int = 200, max_docs: int = 10) -> List[Dict[str, Any]]:
        # Check if collection exists before searching
        try:
            collections_response = await asyncio.to_thread(QDRANT_CLIENT.get_collections)
            collections = [c.name for c in collections_response.collections]
            if collection_name not in collections:
                print(f"[PER-DOC-SEARCH] Collection '{collection_name}' doesn't exist")
                return []
        except Exception as e:
            print(f"[PER-DOC-SEARCH] Error checking collection existence: {e}")
            return []
        
        try:
            query_embedding = await embed_query(query)
            candidates = await asyncio.to_thread(
                QDRANT_CLIENT.search,
                collection_name=collection_name,
                query_vector=query_embedding,
                limit=max_candidates
            )
        except Exception as e:
            print(f"[PER-DOC-SEARCH] Error searching collection: {e}")
            return []
        # Pick distinct docs in candidate order
        doc_keys = []  # list of (doc_id, filename, file_type)
        seen = set()
        for r in candidates:
            pl = r.payload or {}
            did = pl.get("doc_id") or pl.get("filename") or "unknown"
            if did in seen:
                continue
            seen.add(did)
            doc_keys.append((did, pl.get("filename") or "unknown", pl.get("file_type") or "unknown"))
            if len(doc_keys) >= max_docs:
                break
        # Fetch top per_doc for each doc using a filter
        async def fetch_for_doc(did: str, fname: str, ftype: str):
            flt = models.Filter(
                must=[models.FieldCondition(key="doc_id", match=models.MatchValue(value=did))]
            )
            res = await asyncio.to_thread(
                QDRANT_CLIENT.search,
                collection_name=collection_name,
                query_vector=query_embedding,
                limit=per_doc,
                query_filter=flt
            )
            return {
                "doc_id": did,
                "filename": fname,
                "file_type": ftype,
                "chunks": [p.payload.get("text", "") for p in res if p.payload and p.payload.get("text")]
            }
        per_doc_results = await asyncio.gather(*[fetch_for_doc(*t) for t in doc_keys])
        return [r for r in per_doc_results if r.get("chunks")]

    per_doc_sets = await _search_per_doc(collection_name, user_query, per_doc=3, max_candidates=200, max_docs=10)
    if not per_doc_sets:
        # Fallback to previous behavior
        if is_hybrid:
            res = await _hybrid_search_rrf(collection_name, user_query, limit=20, k=60)
        else:
            res = await _search_collection(collection_name, user_query, limit=20)
        return ("user", res)

    # Build grouped blocks with filename/type headers
    grouped_blocks: List[str] = []
    for entry in per_doc_sets:
        header = f"=== Document: {entry['filename']} ({entry['file_type']}) ==="
        body = "\n".join(entry["chunks"]) if entry.get("chunks") else ""
        grouped_blocks.append(f"{header}\n{body}")
    return ("user", grouped_blocks)

async def _process_kb_docs(state, kb_docs, user_query, rag):
    """
    Process KB documents - ONLY vector search (embeddings pre-processed on GPT load)
    """
    session_id = state.get("session_id", "default")
    
    await send_status_update(state, "🔍 Searching knowledge base...", 70)
    collection_name = f"kb_{session_id}"
    cache_key = f"kb_cache:{collection_name}"
    
    redis_client = await ensure_redis_client()
    cache_data = {}
    if redis_client:
        cache_data = await redis_client.hgetall(cache_key)

    if not cache_data:
        print(f"[RAG] ERROR: KB not pre-processed for session {session_id}")
        raise Exception(f"KB not pre-processed for session {session_id}. Please load custom GPT first.")
    
    is_hybrid = cache_data.get("is_hybrid", "False").lower() == "true"
    
    print(f"[RAG] Using pre-processed KB embeddings from collection: {collection_name}")
    
    if is_hybrid:
        res = await _hybrid_search_intersection(collection_name, user_query, limit=5)
    else:
        res = await _hybrid_search_rrf(collection_name, user_query, limit=5, k=60)
    
    print(f"[RAG] Retrieved {len(res)} chunks from KB")
    return ("kb", res)

async def Rag(state: GraphState) -> GraphState:
    llm_model = state.get("llm_model", "gpt-4o-mini")
    user_query = state.get("resolved_query") or state.get("user_query", "")
    uploaded_images = state.get("uploaded_images", []) or []
    chunk_callback = state.get("_chunk_callback")
    
    messages = state.get("messages", [])
    kb_docs = state.get("kb", {})
    docs = state.get("active_docs", [])
    gpt_config = state.get("gpt_config", {})
    custom_system_prompt = gpt_config.get("instruction", "")
    has_user_docs = bool(docs)
    has_kb = bool(kb_docs)
    
    session_id = state.get("session_id", "default")

    if uploaded_images:
        await preprocess_images(uploaded_images, state)

    redis_client = await ensure_redis_client()
    image_analysis_cache = await redis_client.hgetall(f"image_cache:{session_id}")
    
    if await is_summarization_query(user_query):
        print("[RAG] Detected summarization intent — switching to Hierarchical Summarizer.")
        await send_status_update(state, "🧠 Summarizing entire document...", 20)

        try:
            summary = await hierarchical_summarize(state)
        except Exception as e:
            print(f"[Summarizer] Error during summarization: {e}")
            summary = f"⚠️ Unable to summarize document: {e}"

        state["response"] = summary
        state.setdefault("intermediate_results", []).append({
            "node": "RAG",
            "query": user_query,
            "strategy": "hierarchical_summarizer",
            "sources_used": {"user_docs": 1, "kb": 0},
            "output": summary
        })

        await send_status_update(state, "✅ Hierarchical summarization completed", 100)
        return state
    

    messages = state.get("messages", [])
    websearch = state.get("web_search", False)    
    kb_docs = state.get("kb", {})
    docs = state.get("active_docs", [])
    rag = state.get("rag", False)
    gpt_config = state.get("gpt_config", {})
    custom_system_prompt = gpt_config.get("instruction", "")
    temperature = gpt_config.get("temperature", 0.0)

    redis_client = await ensure_redis_client()
    has_user_docs = False
    if redis_client:
        user_doc_cache_exists = await redis_client.exists(f"user_doc_cache:{session_id}")
        has_user_docs = bool(user_doc_cache_exists)
        if has_user_docs:
            print(f"[RAG] Found user document cache in Redis for session {session_id}")

    if not has_user_docs:
        has_user_docs = bool(docs)
    has_kb = False
    if redis_client:
        kb_collection_name = f"kb_{session_id}"
        kb_cache_exists = await redis_client.exists(f"kb_cache:{kb_collection_name}")
        has_kb = bool(kb_cache_exists)
        if has_kb:
            print(f"[RAG] Found KB cache in Redis for session {session_id}")
    if not has_kb:
        has_kb = bool(kb_docs)
    
    print(f"[RAG] Document availability - User docs: {has_user_docs}, KB: {has_kb}")
    parallel_tasks = []

    # Get newly uploaded docs metadata
    newly_uploaded_docs_metadata = state.get("new_uploaded_docs", [])
    
    # Get conversation history (last 1 turn = last 2 messages)
    conversation_history = state.get("messages", [])
    uploaded_images = state.get("uploaded_images", []) or []

    intelligence_task = asyncio.create_task(
        intelligent_source_selection(
            user_query=user_query,
            has_user_docs=has_user_docs,
            has_kb=has_kb,
            custom_prompt=custom_system_prompt,
            llm_model=llm_model
        )
    )
    parallel_tasks.append(("intelligence", intelligence_task))
    image_selection_task = asyncio.create_task(
        intelligent_image_selection(
            user_query=user_query,
            newly_uploaded_docs_metadata=newly_uploaded_docs_metadata,
            session_id=session_id,
            uploaded_images=uploaded_images,  # Pass previously uploaded images
            conversation_history=conversation_history,  # Pass conversation history
            llm_model=llm_model
        )
    )
    parallel_tasks.append(("image_selection", image_selection_task))

    if has_user_docs:
        user_search_task = asyncio.create_task(
            _process_user_docs(state, docs, user_query, rag)
        )
        parallel_tasks.append(("user_search", user_search_task))

    if has_kb:
        kb_search_task = asyncio.create_task(
            _process_kb_docs(state, kb_docs, user_query, rag)
        )
        parallel_tasks.append(("kb_search", kb_search_task))

    print(f"[RAG] Running {len(parallel_tasks)} tasks in parallel...")
    results = await asyncio.gather(*[task for _, task in parallel_tasks], return_exceptions=True)

    source_decision = None
    image_selection_result = None
    user_result = []
    kb_result = []
    images_result = []
    
    for i, (task_name, _) in enumerate(parallel_tasks):
        result = results[i]
        if isinstance(result, Exception):
            print(f"[RAG] Task {task_name} failed: {result}")
            continue
            
        if task_name == "intelligence":
            source_decision = result
        elif task_name == "image_selection":
            image_selection_result = result
        elif task_name == "user_search" and isinstance(result, tuple) and len(result) == 2:
            user_result = result[1]
        elif task_name == "kb_search" and isinstance(result, tuple) and len(result) == 2:
            kb_result = result[1]

    if image_selection_result:
        filter_ids = image_selection_result.get("selected_image_ids", [])
        filter_indices = image_selection_result.get("selected_image_indices", [])
        print(f"[RAG] Image orchestrator decision: {image_selection_result.get('reasoning')}")
        print(f"[RAG] Filtering images by IDs: {filter_ids}, Indices: {filter_indices}")
        
        if not filter_ids and filter_indices:
            try:
                collection_name = f"user_images_{session_id}"
                scroll_out, _ = await asyncio.to_thread(
                    QDRANT_CLIENT.scroll,
                    collection_name=collection_name,
                    limit=1000
                )
                index_to_id_map = {}
                for point in scroll_out:
                    payload = point.payload or {}
                    img_id = payload.get("id")
                    img_index = payload.get("image_index")
                    if img_id and img_index:
                        index_to_id_map[img_index] = img_id
                
                for idx in filter_indices:
                    if idx in index_to_id_map:
                        filter_ids.append(index_to_id_map[idx])
                
                print(f"[RAG] Mapped indices {filter_indices} to IDs from Qdrant: {filter_ids}")
            except Exception as e:
                print(f"[RAG] Error mapping indices to IDs from Qdrant: {e}")
        
        actual_indices = []
        if filter_ids:
            try:
                collection_name = f"user_images_{session_id}"
                scroll_out, _ = await asyncio.to_thread(
                    QDRANT_CLIENT.scroll,
                    collection_name=collection_name,
                    limit=1000
                )
                for point in scroll_out:
                    payload = point.payload or {}
                    img_id = payload.get("id")
                    if img_id in filter_ids:
                        idx = payload.get("image_index")
                        if idx:
                            actual_indices.append(idx)
                print(f"[RAG] Mapped IDs to actual indices from Qdrant: {actual_indices}")
            except Exception as e:
                print(f"[RAG] Error getting actual indices from Qdrant: {e}")
                actual_indices = filter_indices if filter_indices else []
        
        images_result = await _search_image_collection(
            session_id, 
            user_query, 
            limit=8,
            filter_image_ids=filter_ids if filter_ids else None,
            filter_image_indices=actual_indices if actual_indices else (filter_indices if filter_indices else None)
        )
    else:
        # Fallback: search all images
        images_result = await _search_image_collection(session_id, user_query, limit=8)

    if not source_decision:
        print(f"[RAG] Intelligence failed, defaulting to all sources")
        source_decision = {
            "use_user_docs": has_user_docs,
            "use_kb": has_kb,
            "search_strategy": "both" if has_user_docs and has_kb else ("user_docs_only" if has_user_docs else "kb_only"),
            "reasoning": "Fallback due to intelligence failure"
        }
    
    use_user_docs = source_decision["use_user_docs"]
    use_kb = source_decision["use_kb"]
    strategy = source_decision["search_strategy"]

    if not use_user_docs:
        user_result = []
        print(f"[RAG] Discarded user docs search (not needed)")
    
    if not use_kb:
        kb_result = []
        print(f"[RAG] Discarded KB search (not needed)")
    
    print(f"[RAG] Parallel execution completed - using {len(user_result)} user chunks, {len(kb_result)} KB chunks")

    await send_status_update(state, "🔗 Combining information from sources...", 80)
    ctx = state.get("context") or {}
    sess = ctx.get("session") or {}
    summary = sess.get("summary", "")
    
    last_turns = []
    for m in (state.get("messages") or []):
        role = (m.get("type") or m.get("role") or "").lower()
        content = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
        if content:
            # Truncate long messages to avoid prompt bloat
            if len(content.split()) > 1000:
                content = " ".join(content.split()[:1000]) + "..."
            
            speaker = "User" if role in ("human", "user") else "Assistant"
            last_turns.append(f"{speaker}: {content}")
    last_3_text = "\n".join(last_turns[-4:]) or "None"
    context_parts=[f""]
    
    context_parts.append(f"\nUSER QUERY:\n{user_query}")
    context_parts.append(f"\nSOURCE ROUTING DECISION:\nStrategy: {strategy}\nReasoning: {source_decision['reasoning']}")
    
    
    if user_result and use_user_docs:
        context_parts.append(f"\nUSER DOCUMENT CONTEXT:\n{chr(10).join(user_result)}")
    
    if kb_result and use_kb:
        print(f"kb gwdsjqfifsdgilghsdfiushleroge.................")
        context_parts.append(f"\nKNOWLEDGE BASE CONTEXT:\n{chr(10).join(kb_result)}")
    # Add image embedding results
    if images_result:
        context_parts.append(f"\nIMAGE DOCUMENT CONTEXT:\n{chr(10).join(images_result)}")
    # If we have cached image intent context and no embedding hits yet
    img_intent_ctx = state.get("image_intent_context")
    if img_intent_ctx and not images_result:
        context_parts.append(f"\nIMAGE ANALYSIS CONTEXT (cached):\n{img_intent_ctx}")
    
    if not user_result and not kb_result:
        context_parts.append("\nNO RETRIEVAL CONTEXT: No relevant documents were found. Provide a helpful response based on general knowledge and conversation history.")
    elif not user_result and kb_result:
        context_parts.append("\nPARTIAL CONTEXT: Only knowledge base information is available. The user may need to upload documents for analysis.")

    context_parts.append(f"CONVERSATION CONTEXT:\nSummary: {summary if summary else 'None'}\nLast Turns:\n{last_3_text}")
    final_context_message = HumanMessage(content="\n".join(context_parts))
    # print(f"system promtp................", STATIC_SYS_RAG)
    system_msg = SystemMessage(content=STATIC_SYS_RAG)

    dynamic_prompt = f"""
    # CUSTOM GPT CONFIGURATION
    {custom_system_prompt if custom_system_prompt else 'No custom instructions provided.'}

    ---
    # ROUTING DECISION: {strategy.upper()}
    **CRITICAL: The system has decided to use: {strategy}**
    - use_user_docs: {use_user_docs}
    - use_kb: {use_kb}
    
    **STRICT INSTRUCTIONS:**
    - ONLY use the context sections that match the routing decision above.
    - DO NOT reference or use knowledge from sources that were NOT selected.
    - If use_user_docs=True: Use ONLY user document context (ignore any KB knowledge).
    - If use_kb=True: Use ONLY knowledge base context (ignore any user documents).
    - If both=True: Integrate both sources appropriately.
    - If neither=True: Use general knowledge and conversation history only.

    **INTELLIGENT CONTEXT USAGE:**
    Analyze the user query to determine how to use the conversation context:

    **For NEW DOCUMENT ANALYSIS:**
    - If the user is asking to "summarize", "analyze", "review", "check", or "examine" a document
    - AND this appears to be a new document upload (not a follow-up)
    - THEN: Focus ONLY on the current document content
    - IGNORE conversation summary and previous context to avoid cross-checking with KB
    - Provide a pure, clean analysis of just the current document

    **For FOLLOW-UP QUERIES:**
    - If the user is asking for "more details", "tell me more", "what else", "explain further"
    - OR using pronouns like "it", "this", "that", "him", "her", "they"
    - OR asking continuation questions like "and", "also", "additionally"
    - THEN: Use conversation summary and recent messages to provide context
    - Build upon previous information appropriately

    **For STANDARD QUERIES:**
    - If the query is self-contained and doesn't reference previous context
    - THEN: Use minimal conversation context, focus on the current query
    - Only reference previous conversation if directly relevant

    **Context Usage Guidelines:**
    - NEW DOCUMENT: "This is a new document analysis - focus only on the current document content"
    - FOLLOW-UP: "This is a follow-up question - use conversation context to provide continuity"
    - STANDARD: "This is a standard query - use conversation context only if directly relevant"

    **Output Formatting:**
    - For summaries: Use clear paragraphs with key points highlighted. Give very detailed summary only.
    - For searches: Present findings with specific references.
    - For comparisons: Use structured comparison format (tables if useful).
    - For analysis: Provide detailed breakdown with clear sections.
    - Always avoid meta-commentary about sources unless asked.

    ---
    # CONTEXT SECTIONS
    {final_context_message.content}
    """

    final_messages = [
        system_msg,
        HumanMessage(content=dynamic_prompt)
    ]

    llm=get_llm(llm_model,0.8)
    await send_status_update(state, "🤖 Generating response from retrieved information...", 90)
   
    print(f"model named used in rag.....", llm_model)
    chunk_callback = state.get("_chunk_callback")
    ai_response_dict = {"role": "assistant", "content": ""}
    full_response, _ = await stream_with_token_tracking(
        llm,
        final_messages,
        chunk_callback=chunk_callback,
        state=state
    )
    if chunk_callback:
        await chunk_callback("\n\n")
        full_response += "\n\n"
    ai_response_dict["content"] = full_response
    # state["messages"] = state.get("messages", []) + [ai_response_dict]
    state["response"] = full_response
    state.setdefault("intermediate_results", []).append({
        "node": "RAG",
        "query": user_query,
        "strategy": strategy,
        "sources_used": {
            "user_docs": len(user_result),
            "kb": len(kb_result)
        },
        "output": state["response"]
    })
    
    print(f"[RAG] Response generated using {len(user_result)} user docs, {len(kb_result)} KB chunks")
        
    await send_status_update(state, "✅ RAG processing completed", 100)
    return state