# graph_type.py
from typing import TypedDict, List, Dict, Any, Optional, Callable

class GraphState(TypedDict, total=False):
    user_query: str
    tasks: List[str]      
    current_task: Optional[str]    
    llm_model: Optional[str]
    kb: Optional[Dict[str, Any]]
    doc: Optional[List[str]]
    new_uploaded_docs: Optional[List[str]]  # New field for recently uploaded documents
    uploaded_images: Optional[List[Dict[str, Any]]]  # Image files with content bytes: [{"filename": "...", "file_content": bytes, "file_url": "...", "file_type": "image"}]
    deep_search: Optional[bool]
    mcp: Optional[bool]
    mcp_schema: Optional[List[Dict[str, Any]]]
    mcp_tools:Optional[List[Any]]
    enabled_composio_tools: Optional[List[str]]  # Add composio tools selection
    mcp_tools_needed: Optional[str]
    web_search: Optional[bool]
    rag: Optional[bool]  # hybrid rag only
    uploaded_doc: Optional[bool]  # uploaded document indicator
    messages: List[Dict[str, Any]]
    route: Optional[str]
    last_route: Optional[str]
    response: Optional[str]
    context: Dict[str, Any]
    session_id: Optional[str]        
    timestamp: Optional[str]
    gpt_config: Optional[Dict[str, Any]] 
    intermediate_results: List[Dict[str, Any]]
    final_answer: Optional[str]
    task_index: Optional[int]
    resolved_query: Optional[str]
    active_docs: Optional[Dict[str, Any]]
    resolved_queries: Optional[List[Dict[str, Any]]]
    _chunk_callback: Optional[Callable] 
    deep_research_state: Optional[Dict[str, Any]]  
    deep_research_query: Optional[str]
    deep_research_llm_model: Optional[str]  
    img_urls: Optional[List[str]]  # Add this line for image URLs
    gpt_id: Optional[str]
    token_usage: Optional[Dict[str, int]]  # Token usage: input_tokens, output_tokens, total_tokens
    image_analysis_cache: Optional[Dict[str, str]]
    image_intent: Optional[Dict[str, Any]]