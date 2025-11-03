from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Callable
import asyncio
import os
import sys
import platform
import uuid
from datetime import datetime, timedelta
import json
import httpx
import subprocess

try:
    from livekit.api import AccessToken, VideoGrants
    from livekit import api as livekit_api
    LIVEKIT_AVAILABLE = True
except ImportError:
    try:
        from livekit_api import AccessToken, VideoGrants
        import livekit_api
        LIVEKIT_AVAILABLE = True
    except ImportError:
        LIVEKIT_AVAILABLE = False
        print("Warning: livekit package not available. Voice features will be disabled.")
from document_processor import extract_text_from_pdf, extract_text_from_docx, extract_text_from_txt, extract_text_from_json
from graph import graph
from graph_type import GraphState
from DeepResearch.deepresearch_graph import deep_research_graph

from models import (
    ChatMessage, ChatRequest, ChatResponse, 
    GPTConfig, GPTResponse, DocumentResponse,
    SessionInfo, DocumentInfo
)
from MCP.mcp import MCPNode

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = FastAPI(
    title="DruidX AI Assistant API",
    description="API for building and using custom GPTs with knowledge base",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","https://emsa-gpt.vercel.app" ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions: Dict[str, Dict[str, Any]] = {}

# Agent worker process management
_agent_worker_process: Optional[subprocess.Popen] = None
_agent_worker_lock = asyncio.Lock()
_active_voice_rooms: Dict[str, Dict[str, Any]] = {}  # Track active voice rooms


class SessionManager:
    @staticmethod
    def create_session() -> str:
        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            "session_id": session_id,
            "messages": [],
            "uploaded_docs": [],
            "new_uploaded_docs": [],  # Add this line
            "kb": [],
            "gpt_config": None,
            "created_at": datetime.now().isoformat()
        }
        return session_id
    
    @staticmethod
    def get_session(session_id: str) -> Dict[str, Any]:
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        return sessions[session_id]
    
    @staticmethod
    def update_session(session_id: str, updates: Dict[str, Any]):
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        sessions[session_id].update(updates)

async def fetch_document_content(url: str) -> str:
    """Fetch document content from URL"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            return response.text
    except Exception as e:
        print(f"Error fetching document from {url}: {e}")
        return ""

async def process_documents_from_urls(documents: List[DocumentInfo]) -> List[Dict[str, Any]]:
    """Process documents by fetching content from URLs"""
    processed_docs = []
    
    for doc in documents:
        try:
            print(f"Fetching document: {doc.filename} from {doc.file_url}")
            content = await fetch_document_content(doc.file_url)
            
            if content:
                processed_doc = {
                    "id": doc.id,
                    "filename": doc.filename,
                    "content": content,
                    "file_type": doc.file_type,
                    "file_url": doc.file_url,
                    "size": doc.size,
                    "doc_type": doc.doc_type
                }
                processed_docs.append(processed_doc)
                print(f"Successfully processed {doc.filename} ({len(content)} chars)")
            else:
                print(f"Failed to fetch content for {doc.filename}")
                
        except Exception as e:
            print(f"Error processing document {doc.filename}: {e}")
    
    return processed_docs

@app.get("/")
async def root():
    return {"message": "DruidX AI Assistant API", "version": "1.0.0"}

@app.post("/api/sessions", response_model=SessionInfo)
async def create_session():
    """Create a new chat session"""
    session_id = SessionManager.create_session()
    return SessionInfo(session_id=session_id, created_at=sessions[session_id]["created_at"])

@app.get("/api/sessions/{session_id}", response_model=Dict[str, Any])
async def get_session(session_id: str):
    """Get session information"""
    return SessionManager.get_session(session_id)

@app.post("/api/sessions/{session_id}/gpt-config")
async def set_gpt_config(session_id: str, gpt_config: dict):
    """Set GPT configuration for a session"""
    session = SessionManager.get_session(session_id)
    session["gpt_config"] = gpt_config
    
    # Store MCP connections in session
    mcp_connections = gpt_config.get("mcpConnections", [])
    session["mcp_connections"] = mcp_connections
    
   
    
    # Pre-process KB if available
    if session.get("kb"):
        try:
            from Rag.Rag import preprocess_kb_documents
            hybrid_rag = gpt_config.get("hybridRag", False)
            print(f"[MAIN] Pre-processing KB with {len(session['kb'])} documents for session {session_id}")
            await preprocess_kb_documents(
                session["kb"], 
                session_id, 
                is_hybrid=hybrid_rag
            )
            print(f"✅ [MAIN] Pre-processed KB documents with embeddings")
        except Exception as e:
            print(f"⚠️ [MAIN] Warning: Failed to pre-process KB documents: {e}")
            import traceback
            traceback.print_exc()
    
    SessionManager.update_session(session_id, session)
    return {"message": "GPT configuration updated", "gpt_config": gpt_config}

@app.post("/api/sessions/{session_id}/add-documents")
async def add_documents_by_url(session_id: str, request: dict):
    """Add documents by URL"""
    print(f"=== ADD DOCUMENTS ENDPOINT CALLED ===")
    print(f"Session ID: {session_id}")
    print(f"Request: {request}")
    
    session = SessionManager.get_session(session_id)
    
    documents = request.get("documents", [])
    doc_type = request.get("doc_type", "user")
    
    print(f"Documents to process: {len(documents)}")
    print(f"Document type: {doc_type}")
    
    # Process documents in parallel
    processed_docs = []
    uploaded_images = []  # Store image file_content separately
    
    async def process_single_document(doc: dict, index: int) -> Optional[dict]:
        """Process a single document (extract content from URL)"""
        try:
            file_url = doc["file_url"]
            file_type = doc.get("file_type", "")
            filename = doc["filename"]
            
            print(f"[Parallel] Processing document {index + 1}/{len(documents)}: {filename}")
            print(f"[Parallel] File type from request: {file_type}")
            
            # Fetch content from URL
            async with httpx.AsyncClient() as client:
                response = await client.get(file_url, timeout=30.0)
                response.raise_for_status()
                file_content = response.content
                print(f"[Parallel] Downloaded {len(file_content)} bytes from {filename}")
            
            # Better file type detection - check extension first (more reliable)
            file_extension = filename.split('.')[-1].lower() if '.' in filename else ''
            is_image = (
                file_type.startswith('image/') or 
                file_extension in ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']
            )
            
            print(f"[Parallel] Detected file extension: {file_extension}, is_image: {is_image}")
            
            # Extract text based on file type
            content = ""
            if is_image:
                # For images, store file_content bytes for later use in RAG
                # Don't call vision model during upload - will be done in RAG based on user query
                content = f"[Image file: {filename}]"  # Placeholder content for document structure
                
                # Store image bytes for RAG processing (as base64-ready)
                image_data = {
                    "filename": filename,
                    "file_content": file_content,  # Raw bytes
                    "file_url": file_url,
                    "file_type": "image",
                    "id": doc.get("id"),
                    "size": len(file_content)
                }
                uploaded_images.append(image_data)
                print(f"[Parallel] Image detected: {filename} - stored {len(file_content)} bytes for RAG processing")
            elif file_type == "application/pdf" or file_extension == 'pdf':
                content = extract_text_from_pdf(file_content)
                if not content.strip():
                    print(f"⚠️ Warning: PDF {filename} appears to be empty or unreadable")
            elif file_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" or file_extension == 'docx':
                content = extract_text_from_docx(file_content)
                if not content.strip():
                    print(f"⚠️ Warning: DOCX {filename} appears to be empty or unreadable")
            elif file_type == "application/json" or file_extension == 'json':
                content = extract_text_from_json(file_content)
                if not content.strip():
                    print(f"⚠️ Warning: JSON {filename} appears to be empty or unreadable")
            else:
                content = extract_text_from_txt(file_content)
                if not content.strip():
                    print(f"⚠️ Warning: Text file {filename} appears to be empty or unreadable")
            
            # For images, still create the doc structure but skip content processing
            if is_image or content.strip():
                processed_doc = {
                    "id": doc["id"],
                    "filename": doc["filename"],
                    "content": content,  # For images, this is just placeholder
                    "file_type": "image" if is_image else doc.get("file_type", "unknown"),
                    "file_url": doc["file_url"],
                    "size": doc["size"]
                }
                print(f"✅ [Parallel] Successfully processed: {filename} ({'image metadata stored' if is_image else f'{len(content)} chars'})")
                return processed_doc
            else:
                print(f"❌ [Parallel] Skipping {filename}: No readable content extracted")
                return None
        except Exception as e:
            print(f"❌ [Parallel] Error processing {doc.get('filename', 'unknown')}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    # Process all documents in parallel
    print(f"[Parallel] Starting parallel processing of {len(documents)} documents...")
    doc_tasks = [process_single_document(doc, i) for i, doc in enumerate(documents)]
    results = await asyncio.gather(*doc_tasks, return_exceptions=True)
    
    # Collect successful results (filter out None and exceptions)
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            print(f"❌ [Parallel] Document {i + 1} raised exception: {result}")
        elif result is not None:
            processed_docs.append(result)
    
    print(f"✅ [Parallel] Total processed documents: {len(processed_docs)}/{len(documents)}")
    if uploaded_images:
        print(f"✅ [Parallel] Total images with content stored: {len(uploaded_images)}")
    
    # Add to session
    if doc_type == "user":
        # REPLACE old documents instead of extending
        session["uploaded_docs"] = processed_docs
        session["new_uploaded_docs"] = processed_docs
        
        # DON'T store uploaded_images with bytes in session (memory issue)
        # Images are already stored in R2/S3, just use file_url when needed
       
        session["uploaded_images"] = uploaded_images
        print(f"[MAIN] {len(uploaded_images)} image(s) metadata stored (file_url), bytes not stored in session")

        # Pre-process embeddings immediately after upload (skip images)
        try:
            from Rag.Rag import preprocess_user_documents, clear_user_doc_cache
            
            # Clear old embeddings first
            clear_user_doc_cache(session_id)
            print(f"[MAIN] Cleared old user document cache for session {session_id}")
            
            # Filter out images - don't process embeddings for images
            non_image_docs = [doc for doc in processed_docs if isinstance(doc, dict) and doc.get("file_type") != "image"]
            image_count = len(processed_docs) - len(non_image_docs)
            
            if image_count > 0:
                print(f"[MAIN] Skipping {image_count} image(s) from embedding preprocessing")
            
            # Process only non-image documents for embeddings
            if non_image_docs:
                hybrid_rag = session.get("gpt_config", {}).get("hybridRag", False)
                await preprocess_user_documents(
                    non_image_docs,  # Only pass non-image documents
                    session_id, 
                    is_hybrid=hybrid_rag,
                    is_new_upload=True  # Clear and replace
                )
                print(f"✅ [MAIN] Pre-processed {len(non_image_docs)} non-image documents with embeddings")
            else:
                print(f"[MAIN] No non-image documents to preprocess")
        except Exception as e:
            print(f"⚠️ [MAIN] Warning: Failed to pre-process user documents: {e}")
            import traceback
            traceback.print_exc()
            
    elif doc_type == "kb":
        session["kb"].extend(processed_docs)
        print(f"Added {len(processed_docs)} documents to kb")
        
        # Pre-process KB embeddings immediately after upload
        try:
            from Rag.Rag import preprocess_kb_documents
            hybrid_rag = session.get("gpt_config", {}).get("hybridRag", False)
            print(f"[MAIN] Pre-processing KB with {len(session['kb'])} documents for session {session_id}")
            await preprocess_kb_documents(
                session["kb"], 
                session_id, 
                is_hybrid=hybrid_rag
            )
            print(f"✅ [MAIN] Pre-processed KB documents with embeddings")
        except Exception as e:
            print(f"⚠️ [MAIN] Warning: Failed to pre-process KB documents: {e}")
            import traceback
            traceback.print_exc()
    
    SessionManager.update_session(session_id, session)
    
    print(f"Session KB docs count after update: {len(session.get('kb', []))}")
    
    return {"message": f"Added {len(processed_docs)} documents", "documents": processed_docs}

@app.get("/api/sessions/{session_id}/documents")
async def get_documents(session_id: str):
    """Get all documents for a session"""
    session = SessionManager.get_session(session_id)
    return {
        "uploaded_docs": session["uploaded_docs"],
        "kb": session["kb"]
    }

@app.post("/api/sessions/{session_id}/chat/stream")
async def stream_chat(session_id: str, request: ChatRequest):
    """Stream chat response"""
    print("=== STREAMING CHAT ENDPOINT CALLED ===")
    print(f"Session ID: {session_id}")
    print(f"Request message: {request.message}")
    print(f"Web search enabled: {request.web_search}")
    print(f"RAG enabled: {request.rag}")
    print(f"Deep search enabled: {request.deep_search}")
    print(f"Uploaded doc: {request.uploaded_doc}")
    print(f"Composio tools: {request.composio_tools}")
    
    session = SessionManager.get_session(session_id)
    print(f"Previous last_route in session: {session.get('last_route')}")  
    session["messages"].append({"role": "user", "content": request.message})
    print(f"Added user message to session. Total messages: {len(session['messages'])}")
    
    # Get GPT configuration - with better error handling
    gpt_config = session.get("gpt_config")
    if not gpt_config:
        # If no GPT config, create a default one
        gpt_config = {
            "model": "gpt-4o-mini",
            "webBrowser": False,
            "hybridRag": False,
            "mcp": False,
            "instruction": "You are a helpful AI assistant."
        }
        session["gpt_config"] = gpt_config
        SessionManager.update_session(session_id, session)
    
    llm_model = gpt_config.get("model", "gpt-4o-mini")
    print(f"=== GPT CONFIG ===")
    print(f"Model: {llm_model}")
    print(f"Web Browser: {gpt_config.get('webBrowser', False)}")
    print(f"Hybrid RAG: {gpt_config.get('hybridRag', False)}")
    print(f"MCP: {gpt_config.get('mcp', False)}")
    print(f"MCP Schema: {gpt_config.get('mcpSchema', 'None')}")
    print(f"Instruction: {gpt_config.get('instruction', '')[:100]}...")
    
    try:
        # Prepare document content from stored documents
        uploaded_docs_content = []
        if session.get("uploaded_docs"):
            for doc in session["uploaded_docs"]:
                if isinstance(doc, dict) and doc.get("content"):
                    uploaded_docs_content.append(doc["content"])
        
        kb_docs_structured = []
        if session.get("kb"):
            for doc in session["kb"]:
                if isinstance(doc, dict) and doc.get("content"):
                    kb_docs_structured.append({
                        "id": doc.get("id"),
                        "filename": doc.get("filename"),
                        "content": doc["content"],
                        "file_type": doc.get("file_type"),
                        "size": doc.get("size")
                    })
        
        print(f"=== DOCUMENT CONTENT ===")
        print(f"Uploaded docs count: {len(uploaded_docs_content)}")
        print(f"KB docs count: {len(kb_docs_structured)}")
        print(f"Uploaded docs content length: {sum(len(doc) for doc in uploaded_docs_content)}")
        print(f"KB docs content length: {sum(len(doc) for doc in kb_docs_structured)}")
        new_uploaded_docs_content = []
        if session.get("new_uploaded_docs"):
            for doc in session["new_uploaded_docs"]:
                if isinstance(doc, dict) and doc.get("content"):
                    new_uploaded_docs_content.append(doc["content"])
        
        # Create the chunk callback first
        queue = asyncio.Queue()
        full_response = ""
        
        async def chunk_callback(chunk_content: str):
            nonlocal full_response
            full_response += chunk_content
            # print(f"🔥 DIRECT CHUNK CALLBACK: {chunk_content[:50]}...")
            
            # Add a small delay to make streaming smoother
            await asyncio.sleep(0.001)  # 50ms delay between chunks
            
            await queue.put({
                "type": "content",
                "data": {
                    "content": chunk_content,
                    "full_response": full_response,
                    "is_complete": False
                }
            })
        
        # Get uploaded images metadata (with file_url) from session - no bytes stored
        uploaded_images_metadata = []
        if session.get("uploaded_docs"):
            for doc in session["uploaded_docs"]:
                if isinstance(doc, dict) and doc.get("file_type") == "image":
                    # Store only metadata, not bytes - fetch from file_url when needed
                    uploaded_images_metadata.append({
                        "filename": doc.get("filename", ""),
                        "file_url": doc.get("file_url", ""),
                        "file_type": "image",
                        "id": doc.get("id"),
                        "size": doc.get("size", 0)
                    })
        
        state = GraphState(
            user_query=request.message,
            llm_model=llm_model,
            messages=session["messages"],
            doc=uploaded_docs_content,
            new_uploaded_docs=new_uploaded_docs_content,
            uploaded_images=uploaded_images_metadata,  # Only metadata with file_url, no bytes
            gpt_config=gpt_config,
            kb=kb_docs_structured,
            web_search=request.web_search,  
            rag=request.rag, 
            deep_search=request.deep_search,  
            uploaded_doc=request.uploaded_doc,
            mcp=gpt_config.get("mcp", False),
            mcp_schema=gpt_config.get("mcpSchema"),
            mcp_connections=session.get("mcp_connections", []),
            enabled_composio_tools=request.composio_tools or [],
            last_route=session.get("last_route"), 
            session_id=session_id,  
            context={  
                "session": {
                    "summary": session.get("summary", ""),
                    "last_route": session.get("last_route")
                }
            },
            _chunk_callback=chunk_callback,
            token_usage={"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
        )
        
        async def generate_stream():
            try:
                print("=== STARTING DIRECT GRAPH STREAMING ===")
                
                # Create a variable to store the final state
                final_state = None
                
                async def run_graph():
                    nonlocal final_state
                    try:
                        print("🔥 STARTING DIRECT GRAPH EXECUTION")
                        async for node_result in graph.astream(state):
                            print(f"🔥 NODE RESULT: {list(node_result.keys())}")
                            # Capture the final state from the last node result
                            final_state = node_result
                    except Exception as e:
                        print(f"--- ERROR in direct graph execution: {e}")
                        await queue.put({
                            "type": "error",
                            "data": {"error": str(e)}
                        })
                    finally:
                        print("🔥 DIRECT GRAPH EXECUTION COMPLETED")
                        await queue.put(None)  # Signal completion
                
                async def consume_and_yield():
                    while True:
                        item = await queue.get()
                        if item is None:
                            break
                        if item.get("type") == "error":
                            raise Exception(item["data"]["error"])
                        
                        # print(f"🔥 YIELDING DIRECT CHUNK: {item.get('data', {}).get('content', '')[:50]}...")
                        yield item
                
                graph_task = asyncio.create_task(run_graph())
                async for chunk in consume_and_yield():
                    chunk_data = json.dumps(chunk)
                    yield f"data: {chunk_data}\n\n"
                
                await graph_task
                if final_state:
                    for node_name, node_state in final_state.items():
                        if isinstance(node_state, dict) and 'img_urls' in node_state:
                            state.update(node_state)
                            break
                # Aggregate token usage from state
                token_usage = state.get("token_usage")
                if not token_usage:
                    token_usage = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
                
                final_chunk = {
                    "type": "content",
                    "data": {
                        "content": "",
                        "is_complete": True,
                        "full_response": full_response,
                        "img_urls": state.get("img_urls", []),
                        "token_usage": token_usage
                    }
                }
                
                print(f"🔥 Final chunk img_urls: {final_chunk['data']['img_urls']}")
                print(f"🔥 Token usage: {token_usage}")
                yield f"data: {json.dumps(final_chunk)}\n\n"
                
                if full_response:
                    session["messages"].append({"role": "assistant", "content": full_response})
                    
                    # Store image URLs in session for persistence
                    if state.get("img_urls"):
                        session["img_urls"] = state.get("img_urls", [])
                    
                    SessionManager.update_session(session_id, session)
                if state.get("context", {}).get("session", {}).get("summary"):
                    session["summary"] = state["context"]["session"]["summary"]

                if state.get("context", {}).get("session", {}).get("last_route"):
                    session["last_route"] = state["context"]["session"]["last_route"]

                # Update session with context data
                if state.get("context", {}).get("session"):
                    SessionManager.update_session(session_id, session)
                # Always update last_route, even if response is empty
                if state.get("route"):
                    session["last_route"] = state["route"]
                    SessionManager.update_session(session_id, session)
                
                yield f"data: {json.dumps({'type': 'done', 'data': {'session_id': session_id}})}\n\n"
                
            except Exception as e:
                print(f"=== ERROR IN DIRECT STREAM GENERATION ===")
                print(f"Error: {str(e)}")
                import traceback
                traceback.print_exc()
                error_chunk = json.dumps({
                    "type": "error",
                    "data": {"error": str(e)}
                })
                yield f"data: {error_chunk}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            
            
            media_type="text/event-stream", 
            
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        print(f"=== ERROR IN STREAM_CHAT ===")
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sessions/{session_id}/deepresearch/stream")
async def stream_deep_research(session_id: str, request: ChatRequest):
    """Stream deep research response - bypasses orchestrator and goes directly to deep research nodes"""
    print("=== DEEP RESEARCH STREAMING ENDPOINT CALLED ===")
    print(f"Session ID: {session_id}")
    print(f"Request message: {request.message}")
    
    session = SessionManager.get_session(session_id)
    print(f"Previous last_route in session: {session.get('last_route')}")  
    session["messages"].append({"role": "user", "content": request.message})
    print(f"Added user message to session. Total messages: {len(session['messages'])}")

    gpt_config = session.get("gpt_config")
    if not gpt_config:
        gpt_config = {
            "model": "gpt-4o-mini",
            "deepResearchModel": "alibaba/tongyi-deepresearch-30b-a3b:free",  
            "webBrowser": False,
            "hybridRag": False,
            "mcp": False,
            "instruction": "You are a helpful AI assistant."
        }
        session["gpt_config"] = gpt_config
        SessionManager.update_session(session_id, session)
    
    llm_model = gpt_config.get("model", "gpt-4o-mini")
    deep_research_model = gpt_config.get("deepResearchModel", "alibaba/tongyi-deepresearch-30b-a3b:free")  # Use separate model for deep research
    print(f"=== GPT CONFIG ===")
    print(f"Model: {llm_model}")
    print(f"Deep Research Model: {deep_research_model}")
    print(f"Web Browser: {gpt_config.get('webBrowser', False)}")
    print(f"Hybrid RAG: {gpt_config.get('hybridRag', False)}")
    print(f"MCP: {gpt_config.get('mcp', False)}")
    print(f"MCP Schema: {gpt_config.get('mcpSchema', 'None')}")
    print(f"Instruction: {gpt_config.get('instruction', '')[:100]}...")
    
    try:
        uploaded_docs_content = []
        if session.get("uploaded_docs"):
            for doc in session["uploaded_docs"]:
                if isinstance(doc, dict) and doc.get("content"):
                    uploaded_docs_content.append(doc["content"])
        
        kb_docs_structured = []
        if session.get("kb"):
            for doc in session["kb"]:
                if isinstance(doc, dict) and doc.get("content"):
                    kb_docs_structured.append({
                        "id": doc.get("id"),
                        "filename": doc.get("filename"),
                        "content": doc["content"],
                        "file_type": doc.get("file_type"),
                        "size": doc.get("size")
                    })
        new_uploaded_docs_content = []
        if session.get("new_uploaded_docs"):
            for doc in session.get("new_uploaded_docs"):
                if isinstance(doc, dict) and doc.get("content"):
                    new_uploaded_docs_content.append(doc["content"])
    
        queue = asyncio.Queue()
        full_response = ""
        
        async def chunk_callback(chunk_content: str):
            nonlocal full_response
            full_response += chunk_content
            
          
            await asyncio.sleep(0.05) 
            
            await queue.put({
                "type": "content",
                "data": {
                    "content": chunk_content,
                    "full_response": full_response,
                    "is_complete": False
                }
            })
        state = GraphState(
            user_query=request.message,
            deep_research_query=request.message,  
            llm_model=llm_model,
            deep_research_llm_model=deep_research_model,  
            messages=session["messages"],
            doc=uploaded_docs_content,
            new_uploaded_docs=new_uploaded_docs_content,
            gpt_config=gpt_config,
            kb=kb_docs_structured,
            web_search=request.web_search,  
            rag=request.rag, 
            deep_search=True,  
            uploaded_doc=request.uploaded_doc,
            mcp=gpt_config.get("mcp", False),
            mcp_schema=gpt_config.get("mcpSchema"),
            mcp_connections=session.get("mcp_connections", []),
            last_route=session.get("last_route"), 
            session_id=session_id,
            context={  
                "session": {
                    "summary": session.get("summary", ""),
                    "last_route": session.get("last_route")
                }
            },
            _chunk_callback=chunk_callback,
            token_usage={"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
        )
        
        async def generate_stream():
            try:
                print("=== STARTING DEEP RESEARCH GRAPH STREAMING ===")
                final_state = None
                
                async def run_deep_research_graph():
                    nonlocal final_state
                    try:
                        print("🔥 STARTING DEEP RESEARCH GRAPH EXECUTION")
                        async for node_result in deep_research_graph.astream(state):
                            print(f"🔥 DEEP RESEARCH NODE RESULT: {list(node_result.keys())}")
                            final_state = node_result
                    except Exception as e:
                        print(f"--- ERROR in deep research graph execution: {e}")
                        await queue.put({
                            "type": "error",
                            "data": {"error": str(e)}
                        })
                    finally:
                        print("🔥 DEEP RESEARCH GRAPH EXECUTION COMPLETED")
                        await queue.put(None)  
                
                async def consume_and_yield():
                    while True:
                        item = await queue.get()
                        if item is None:
                            break
                        if item.get("type") == "error":
                            raise Exception(item["data"]["error"])
                        
                        yield item
                
                graph_task = asyncio.create_task(run_deep_research_graph())
                async for chunk in consume_and_yield():
                    chunk_data = json.dumps(chunk)
                    yield f"data: {chunk_data}\n\n"
                
                await graph_task
                
                if final_state:
                    for node_name, node_state in final_state.items():
                        if isinstance(node_state, dict) and 'img_urls' in node_state:
                            state.update(node_state)
                            break
    
                # Aggregate token usage from state
                token_usage = state.get("token_usage")
                if not token_usage:
                    token_usage = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
                
                final_chunk = {
                    "type": "content",
                    "data": {
                        "content": "",
                        "is_complete": True,
                        "full_response": full_response,
                        "img_urls": state.get("img_urls", []),
                        "token_usage": token_usage
                    }
                }
                
                print(f"🔥 Final deep research chunk img_urls: {final_chunk['data']['img_urls']}")
                print(f"🔥 Token usage: {token_usage}")
                yield f"data: {json.dumps(final_chunk)}\n\n"
                
                if full_response:
                    session["messages"].append({"role": "assistant", "content": full_response})
                    if state.get("img_urls"):
                        session["img_urls"] = state.get("img_urls", [])
                    
                    SessionManager.update_session(session_id, session)
                if state.get("context", {}).get("session", {}).get("summary"):
                    session["summary"] = state["context"]["session"]["summary"]

                if state.get("context", {}).get("session", {}).get("last_route"):
                    session["last_route"] = state["context"]["session"]["last_route"]
                if state.get("context", {}).get("session"):
                    SessionManager.update_session(session_id, session)
                if state.get("route"):
                    session["last_route"] = state["route"]
                    SessionManager.update_session(session_id, session)
                
                yield f"data: {json.dumps({'type': 'done', 'data': {'session_id': session_id}})}\n\n"
                
            except Exception as e:
                print(f"=== ERROR IN DEEP RESEARCH STREAM GENERATION ===")
                print(f"Error: {str(e)}")
                import traceback
                traceback.print_exc()
                error_chunk = json.dumps({
                    "type": "error",
                    "data": {"error": str(e)}
                })
                yield f"data: {error_chunk}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream", 
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        print(f"=== ERROR IN STREAM_DEEP_RESEARCH ===")
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    del sessions[session_id]
    return {"message": "Session deleted successfully"}

# MCP Endpoints
@app.get("/api/mcp/available-tools")
async def get_available_mcp_tools():
    """Get list of available Composio tools/apps"""
    try:
        tools = MCPNode.get_available_tools()
        return {"tools": tools}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch available tools: {str(e)}")

@app.post("/api/mcp/connect")
async def initiate_mcp_connection(request: dict):
    """Initiate OAuth connection for a GPT to a specific app"""
    try:
        gpt_id = request.get("gpt_id")
        app_name = request.get("app_name")
        redirect_url = request.get("redirect_url")
        
        if not gpt_id or not app_name:
            raise HTTPException(status_code=400, detail="gpt_id and app_name are required")
        
        result =await MCPNode.initiate_connection(gpt_id, app_name, redirect_url)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate connection: {str(e)}")

@app.get("/api/mcp/connections/{gpt_id}")
async def get_mcp_connections(gpt_id: str):
    """Get all active connections for a GPT"""
    try:
        connections = await MCPNode.get_user_connections(gpt_id)
        return {"gpt_id": gpt_id, "connections": connections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch connections: {str(e)}")

@app.post("/api/mcp/disconnect")
async def disconnect_tool(request: Request):
    try:
        data = await request.json()
        gpt_id = data.get("gpt_id")
        connection_id = data.get("connection_id")
        
        if not gpt_id or not connection_id:
            return JSONResponse(
                status_code=400,
                content={"error": "Missing gpt_id or connection_id"}
            )
        
        result =await MCPNode.disconnect_tool(gpt_id, connection_id)
        
        if result["success"]:
            return JSONResponse(content=result)
        else:
            return JSONResponse(
                status_code=400,
                content=result
            )
            
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error: {str(e)}"}
        )
@app.get("/api/mcp/callback")
async def mcp_callback(request: Request):
    """Handle OAuth callback after authentication"""
    connection_request_id = request.query_params.get("connection_request_id")
    if not connection_request_id:
        return {"status": "error", "message": "Missing connection_request_id"}
    
    return {"status": "success", "connection_request_id": connection_request_id}

async def _ensure_agent_worker_running():
    """Ensure the agent worker process is running"""
    global _agent_worker_process
    
    async with _agent_worker_lock:
        if _agent_worker_process is not None:
            # Check if process is still alive
            if _agent_worker_process.poll() is None:
                return  # Already running
            else:
                print("Agent worker process died, restarting...")
                _agent_worker_process = None
        
        if _agent_worker_process is None:
            try:
                # Get the voice agent script path
                backend_dir = os.path.dirname(os.path.abspath(__file__))
                voice_agent_path = os.path.join(backend_dir, "voice_agent", "voice_agent.py")
                
                if not os.path.exists(voice_agent_path):
                    print(f"Warning: Voice agent script not found at {voice_agent_path}")
                    return
                
                # Start the agent worker in background
                print("Starting LiveKit agent worker...")
                
                # Determine Python executable
                python_exec = sys.executable
                
                # Start agent worker process (non-blocking)
                startupinfo = None
                if platform.system() == "Windows":
                    startupinfo = subprocess.STARTUPINFO()
                    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                    startupinfo.wShowWindow = subprocess.SW_HIDE
                
                # Create log file for agent worker (backup)
                log_dir = os.path.join(backend_dir, "logs")
                os.makedirs(log_dir, exist_ok=True)
                log_file = os.path.join(log_dir, "agent_worker.log")
                
                # IMPORTANT: Don't redirect stdout/stderr to file - let it go to Railway logs
                # Railway captures stdout/stderr automatically
                # Only redirect if you want file backup too
                args = [python_exec, voice_agent_path]
                # Only add console for local testing
                # ...
                # The command is always the same, no "console"
                args = [python_exec, voice_agent_path]

                _agent_worker_process = subprocess.Popen(
                    args,
                    cwd=backend_dir,
                    stdin=subprocess.DEVNULL,  # <-- ADD THIS to prevent TTY errors
                    env=os.environ.copy(),
                    startupinfo=startupinfo if platform.system() == "Windows" else None
                )
                # ...

                
                print(f"Agent worker started with PID: {_agent_worker_process.pid}")
                print(f"Agent worker logs visible in Railway console output")
                
                # Wait a bit to check if it started successfully
                await asyncio.sleep(3)
                if _agent_worker_process.poll() is not None:
                    print(f"❌ Agent worker process exited immediately with code: {_agent_worker_process.returncode}")
                    _agent_worker_process = None
                else:
                    print(f"✅ Agent worker process is running (PID: {_agent_worker_process.pid})")
                    
            except Exception as e:
                print(f"❌ Error starting agent worker: {e}")
                import traceback
                traceback.print_exc()
                _agent_worker_process = None

async def _stop_agent_worker():
    """Stop the agent worker process"""
    global _agent_worker_process
    
    async with _agent_worker_lock:
        if _agent_worker_process is not None:
            try:
                print("Stopping agent worker process...")
                # Terminate the process gracefully
                _agent_worker_process.terminate()
                
                # Wait up to 5 seconds for graceful shutdown
                try:
                    _agent_worker_process.wait(timeout=5)
                    print("Agent worker process terminated gracefully")
                except subprocess.TimeoutExpired:
                    # Force kill if it doesn't terminate
                    print("Agent worker didn't terminate, forcing kill...")
                    _agent_worker_process.kill()
                    _agent_worker_process.wait()
                    print("Agent worker process killed")
                
                _agent_worker_process = None
            except Exception as e:
                print(f"Error stopping agent worker: {e}")
                # Try to kill if terminate failed
                try:
                    if _agent_worker_process and _agent_worker_process.poll() is None:
                        _agent_worker_process.kill()
                        _agent_worker_process.wait()
                except:
                    pass
                _agent_worker_process = None

@app.post("/api/voice/connect")
async def voice_connect(request: dict):
    """Create LiveKit room and generate access token for voice connection"""
    if not LIVEKIT_AVAILABLE:
        raise HTTPException(status_code=503, detail="LiveKit package not installed. Please install livekit-api.")
    
    session_id = request.get("sessionId")
    gpt_id = request.get("gptId")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")
    
    try:
        # Ensure agent worker is running
        await _ensure_agent_worker_running()
        
        livekit_url = os.getenv("LIVEKIT_URL")
        livekit_api_key = os.getenv("LIVEKIT_API_KEY")
        livekit_api_secret = os.getenv("LIVEKIT_API_SECRET")
        
        if not livekit_url:
            raise HTTPException(
                status_code=500,
                detail="LIVEKIT_URL environment variable is not set"
            )
        if not livekit_api_key:
            raise HTTPException(
                status_code=500,
                detail="LIVEKIT_API_KEY environment variable is not set"
            )
        if not livekit_api_secret:
            raise HTTPException(
                status_code=500,
                detail="LIVEKIT_API_SECRET environment variable is not set"
            )
        
        room_name = f"voice-{session_id}"
        participant_identity = f"user-{session_id}"
        
        # Track this voice room as active
        _active_voice_rooms[room_name] = {
            "session_id": session_id,
            "gpt_id": gpt_id,
            "room_name": room_name,
            "created_at": datetime.now().isoformat()
        }
        
        token = AccessToken(livekit_api_key, livekit_api_secret) \
            .with_identity(participant_identity) \
            .with_name(participant_identity) \
            .with_grants(VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True
            )) \
            .with_ttl(timedelta(hours=2)) \
            .to_jwt()
        
        return {
            "token": token,
            "url": livekit_url,
            "roomName": room_name
        }
    except Exception as e:
        print(f"Error creating voice connection: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create voice connection: {str(e)}")

@app.post("/api/voice/disconnect")
async def voice_disconnect(request: dict):
    """Disconnect from LiveKit room and stop agent worker if no active rooms"""
    if not LIVEKIT_AVAILABLE:
        return {"message": "Voice disconnected"}
    
    session_id = request.get("sessionId")
    room_name = request.get("roomName")
    
    try:
        # Remove room from active tracking
        if room_name and room_name in _active_voice_rooms:
            del _active_voice_rooms[room_name]
            print(f"Removed room {room_name} from active rooms. Remaining: {len(_active_voice_rooms)}")
        
        # Delete the LiveKit room
        if room_name:
            livekit_api_key = os.getenv("LIVEKIT_API_KEY")
            livekit_api_secret = os.getenv("LIVEKIT_API_SECRET")
            
            if livekit_api_key and livekit_api_secret:
                try:
                    lk_api = livekit_api.LiveKitAPI(livekit_api_key, livekit_api_secret)
                    # Get room info before deleting to check participants
                    try:
                        room_info = await lk_api.get_room(room_name)
                        if room_info:
                            # Delete the room which will disconnect all participants
                            await lk_api.delete_room(room_name)
                            print(f"Deleted LiveKit room: {room_name}")
                    except Exception as room_err:
                        # Room might not exist or already deleted
                        print(f"Room {room_name} may not exist or already deleted: {room_err}")
                        pass
                except AttributeError:
                    # Fallback for older API versions
                    try:
                        await lk_api.delete_room(room_name)
                    except:
                        pass
                except Exception as api_err:
                    print(f"Error deleting room via API: {api_err}")
        
        # Check if there are any remaining active voice rooms
        # If no active rooms, stop the agent worker
        if len(_active_voice_rooms) == 0:
            print("No active voice rooms remaining. Stopping agent worker...")
            await _stop_agent_worker()
        else:
            print(f"Agent worker kept running. {len(_active_voice_rooms)} active voice room(s) remaining.")
        
        return {"message": "Voice disconnected successfully"}
    except Exception as e:
        print(f"Error disconnecting voice: {e}")
        import traceback
        traceback.print_exc()
        
        # Even on error, try to remove from tracking and stop worker if needed
        if room_name and room_name in _active_voice_rooms:
            del _active_voice_rooms[room_name]
        
        if len(_active_voice_rooms) == 0:
            await _stop_agent_worker()
        
        return {"message": "Voice disconnected"}

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown"""
    print("Application shutting down. Cleaning up agent worker...")
    await _stop_agent_worker()
    print("Cleanup complete.")

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "livekit_configured": bool(os.getenv("LIVEKIT_API_KEY")),
        "timestamp": datetime.now().isoformat(),
        "active_voice_rooms": len(_active_voice_rooms),
        "agent_worker_running": _agent_worker_process is not None and _agent_worker_process.poll() is None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)