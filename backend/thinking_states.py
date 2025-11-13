"""
Utility for sending dynamic thinking states to frontend.
Provides context-aware thinking messages for different node types.
"""
import asyncio
from typing import List, Optional, Callable
from graph_type import GraphState


async def send_thinking_state(
    state: GraphState,
    node_name: str,
    thinking_states: List[str],
    interval: float = 2.0,
    stop_event: Optional[asyncio.Event] = None,
    tool_name: Optional[str] = None
):
    """
    Send dynamic thinking states that cycle through a list of messages.
    
    Args:
        state: GraphState containing _status_callback
        node_name: Name of the node (e.g., "SimpleLLM", "RAG", "MCP")
        thinking_states: List of thinking state messages to cycle through
        interval: Time in seconds between state changes (default: 2.0)
        stop_event: Optional asyncio.Event to stop the thinking loop
        tool_name: Optional tool name to display in the UI
    
    Returns:
        asyncio.Task that can be cancelled when response starts
    """
    status_callback = state.get("_status_callback")
    if not status_callback:
        return None
    
    current_index = 0
    stop_flag = asyncio.Event() if stop_event is None else stop_event
    
    async def thinking_loop():
        nonlocal current_index
        while not stop_flag.is_set():
            try:
                thinking_message = thinking_states[current_index % len(thinking_states)]
                status_data = {
                    "type": "status",
                    "data": {
                        "status": "thinking",
                        "message": thinking_message,
                        "current_node": node_name,
                        "progress": None,
                        "thinking_state": True,  # Flag to indicate this is a thinking state
                        "tool_name": tool_name  # Tool name for UI display
                    }
                }
                await status_callback(status_data)
                current_index += 1
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[ThinkingStates] Error sending thinking state: {e}")
                break
    
    task = asyncio.create_task(thinking_loop())
    return task, stop_flag


# Predefined thinking states for different node types
BASIC_LLM_THINKING_STATES = [
    "thinking...",
    "analyzing...",
    "processing...",
    "reasoning...",
    "understanding...",
]

RAG_THINKING_STATES = [
    "thinking...",
    "analyzing...",
    "searching knowledge base...",
    "gathering information...",
    "summarizing...",
]

MCP_THINKING_STATES = [
    "thinking...",
    "analyzing...",
    "preparing tools...",
    "executing tool...",
]


async def send_mcp_tool_thinking(
    state: GraphState,
    tool_name: str,
    interval: float = 2.0,
    stop_event: Optional[asyncio.Event] = None
):
    """
    Send thinking states for MCP tool execution.
    
    Args:
        state: GraphState containing _status_callback
        tool_name: Name of the MCP tool being used
        interval: Time in seconds between state changes
        stop_event: Optional asyncio.Event to stop the thinking loop
    """
    thinking_states = [
        "thinking...",
        "analyzing...",
        f"using {tool_name}...",
        "processing results...",
    ]
    return await send_thinking_state(state, "MCP", thinking_states, interval, stop_event, tool_name)

