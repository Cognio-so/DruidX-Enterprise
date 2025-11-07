import asyncio
import json
import re
from typing import List, Dict, Any
import replicate  # Assuming you use replicate, as seen in logs

from graph_type import GraphState
from langchain_core.messages import SystemMessage, HumanMessage
from llm import get_llm, _extract_usage  # Assumes you have this in 'llm.py'
from langchain_groq import ChatGroq

async def _check_edit_intent(
    query: str,
    previous_videos: List[str],
    conversation: List[Dict[str, Any]],
    state: GraphState,
) -> bool:
    """
    Uses an LLM to decide if the user query is an edit
    request or a new video generation request.
    """
    print("🕵️ Checking for video edit intent...")
    history_str = ""
    for m in (conversation or [])[-2:]:
        role = (m.get("type") or m.get("role") or "").lower()
        content = m.get("content", "")
        speaker = "User" if role in ("human", "user") else "Assistant"
        history_str += f"{speaker}: {content}\n"

    system_prompt = """You are a simple AI router. Your only job is to decide if the user wants to EDIT a PREVIOUSLY generated video or create a NEW one.

Rules:
1. If "Previous videos exist" is false, it's always a NEW video ("is_edit": false).
2. If the user query is an edit request (e.g., "make it...", "change...", "add...", "more realistic", "different style", "remove..."), it's an EDIT ("is_edit": true).
3. If the user query is a clear NEW request (e.g., "now create a...", "I also want a video of...", "show me something else"), it's NEW ("is_edit": false).

Return ONLY valid JSON:
{"is_edit": true/false}"""

    human_prompt = f"""Previous videos exist: {bool(previous_videos)}
Last video URL: {previous_videos[-1] if previous_videos else 'None'}

Conversation History:
{history_str.strip()}

NEW User Query: "{query}"

Return ONLY the JSON.
"""

    try:
        import os
        llm = ChatGroq(
            model="openai/gpt-oss-120b",  
            temperature=0.4,
            groq_api_key=os.getenv("GROQ_API_KEY")
        )   
        response = await llm.ainvoke(
            [SystemMessage(content=system_prompt), HumanMessage(content=human_prompt)]
        )
        content = (response.content or "").strip()
        json_match = re.search(r"\{[\s\S]*\}", content)
        if json_match:
            result = json.loads(json_match.group(0))
            is_edit = bool(result.get("is_edit", False))
            print(f"🕵️ Edit Intent Result: {is_edit}")
            return is_edit
    except Exception as e:
        print(f"❌ Error in _check_edit_intent: {e}")
        if bool(previous_videos) and len(query.split()) < 10:
            print("🕵️ Edit Intent Fallback: Assuming EDIT")
            return True

    print("🕵️ Edit Intent Fallback: Assuming NEW")
    return False


async def generate_video(state: GraphState) -> GraphState:
    print("🎬 Video Node Executing...")
    
    query = state.get("user_query", "")
    model = state.get("video_model", "google/veo-3.1") 
    previous_videos = state.get("video_urls", [])
    print(f"🎬 User Query: {query}")
    print(f"🎬 Using Video Model: {model}")
    print(f"🎬 Previous Videos: {previous_videos}")
    conversation = state.get("messages", [])
    is_edit_intent = await _check_edit_intent(
        query, previous_videos, conversation, state
    )
    
    try:
        if is_edit_intent:
            print(f"📹 Detected EDIT intent. Modifying video...")
            video_to_edit = previous_videos[-1] 
            output = await replicate.async_run(
                "luma/modify-video",
                input={
                    "prompt": query,
                    "video": video_to_edit,  
                    

                }
            )
        else:
            print(f"✨ Detected NEW video generation intent.")
            print(f"   Using Model: {model}")
            print(f"   With Prompt: {query}")
            output = await replicate.async_run(
                model,
                input={"prompt": query,
                       "duration": 3}
            )

        # Extract video URL from output (handles both edit and new generation)
        if isinstance(output, list):
            first = output[0]
            if hasattr(first, "url"):
                video_url = first.url
            else:
                video_url = str(first)
        elif hasattr(output, "url"):
            video_url = output.url
        else:
            video_url = str(output)

        print("✅ Generated video URL:", video_url)
        
        # Store video URL in separate state
        video_urls = []
        video_urls.append(video_url)
        state["video_urls"] = video_urls
        
        # Also store in response for backward compatibility
        state["response"] = f"Video generated successfully! URL: {video_url}"
        
        # Add message to conversation history
        state.setdefault("messages", []).append({
            "role": "assistant", 
            "content": f"Generated video: {video_url}"
        })

    except Exception as e:
        print(f"❌ Error in video node: {e}")
        import traceback
        traceback.print_exc()
        state["response"] = f"Sorry, I couldn't process the video. Error: {e}"

    return state

