import asyncio
import json
import re
from typing import List, Dict, Any
import replicate  # Assuming you use replicate, as seen in logs

from graph_type import GraphState
from langchain_core.messages import SystemMessage, HumanMessage
from llm import get_llm, _extract_usage  # Assumes you have this in 'llm.py'
from langchain_groq import ChatGroq

async def _enhance_prompt_with_context(
    query: str,
    conversation: List[Dict[str, Any]],
    state: GraphState = None,
) -> str:
    """
    Uses an LLM to generate an enhanced, detailed prompt for video generation
    based on the conversation history and current user query.
    """
    print("✨ Enhancing video prompt with conversation context...")
    history_str = ""
    for m in (conversation or [])[-5:]:  
        role = (m.get("type") or m.get("role") or "").lower()
        content = m.get("content", "")
        speaker = "User" if role in ("human", "user") else "Assistant"
        history_str += f"{speaker}: {content}\n"

    system_prompt = """You are an expert prompt engineer for video generation models. Your job is to create detailed, optimized prompts that will generate high-quality videos.

Rules:
1. FIRST, check if the user's current query is SELF-CONTAINED and COMPLETE:
   - If the query is specific and detailed (e.g., "a dog running in park", "sunset timelapse", "city traffic at night"), then use it directly or enhance it slightly
   - DO NOT mix in unrelated past conversation when the query is already clear and complete
   
2. If user EXPLICITLY REFERENCES a previous prompt:
   - Keywords: "above prompt", "previous prompt", "that prompt", "based on what I said", "the one before", "generate video based on", "create video from"
   - Action: Find the exact prompt in the conversation history and return it EXACTLY AS WRITTEN
   - DO NOT add any extra details, durations, camera movements, or enhancements
   - DO NOT modify or improve it - just extract and return it verbatim
   
3. ONLY enhance/create when:
   - User query is vague/incomplete: "generate that", "create a video", "make it", "the same thing" (with no clear prompt in history)
   - User gives a complete new query (add minor quality modifiers only)
   
4. When enhancing NEW prompts (not extracted ones):
   - For complete queries: Keep the core intent, just add quality/style modifiers if needed (e.g., "cinematic", "smooth motion")
   - Include relevant details: subject, action, camera movement, lighting, mood, setting
   - DO NOT add duration hints unless user specifically mentioned duration
   
5. Keep the prompt concise but descriptive (1-3 sentences)
6. Do not include explanations, just return the final prompt text

Return ONLY the prompt text, nothing else."""

    human_prompt = f"""Conversation History:
{history_str.strip()}

Current User Query: "{query}"

Generate the optimal video generation prompt:"""

    try:
        from api_keys_util import get_groq_api_key, get_api_keys_from_session
        session_id = state.get("session_id") if state else None
        api_keys = await get_api_keys_from_session(session_id) if session_id else {}
        groq_key = get_groq_api_key(api_keys)
        llm_kwargs = {
            "model": "openai/gpt-oss-120b",
            "temperature": 0.7
        }
        if groq_key:
            llm_kwargs["groq_api_key"] = groq_key
        llm = ChatGroq(**llm_kwargs)
        response = await llm.ainvoke(
            [SystemMessage(content=system_prompt), HumanMessage(content=human_prompt)]
        )
        enhanced_prompt = (response.content or "").strip()
        enhanced_prompt = enhanced_prompt.strip('"\'')
        
        print(f"✨ Enhanced Video Prompt: {enhanced_prompt}")
        return enhanced_prompt
        
    except Exception as e:
        print(f"❌ Error in _enhance_prompt_with_context: {e}")
        print(f"✨ Fallback: Using original query as prompt")
        return query


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
        from api_keys_util import get_groq_api_key, get_api_keys_from_session
        session_id = state.get("session_id") if state else None
        api_keys = await get_api_keys_from_session(session_id) if session_id else {}
        groq_key = get_groq_api_key(api_keys)
        llm_kwargs = {
            "model": "openai/gpt-oss-120b",
            "temperature": 0.4
        }
        if groq_key:
            llm_kwargs["groq_api_key"] = groq_key
        llm = ChatGroq(**llm_kwargs)
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
   
    
    # Extract video URLs from user query if present (common video formats)
    url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+\.(?:mp4|webm|mov|avi|mkv|flv|wmv|m4v)'
    found_urls = re.findall(url_pattern, query, re.IGNORECASE)
    
    if found_urls and not previous_videos:
        print(f"🎬 Found video URL(s) in user query: {found_urls}")
        previous_videos = found_urls
        # Also store in state for future reference
        state["video_urls"] = found_urls
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
            
            # Remove video URL from query if present, keep only the edit instruction
            clean_query = query
            if found_urls:
                for url in found_urls:
                    clean_query = clean_query.replace(url, "").strip()
                # Clean up extra spaces and common phrases
                clean_query = re.sub(r'\s+', ' ', clean_query).strip()
                clean_query = re.sub(r'^(edit this video|edit|modify|change)[\s:,.-]*', '', clean_query, flags=re.IGNORECASE).strip()
                if not clean_query:
                    clean_query = "enhance and improve this video"
            
            print(f"   Cleaned Edit Prompt: {clean_query}")
            
            output = await replicate.async_run(
                "luma/modify-video",
                input={
                    "prompt": clean_query,
                    "video": video_to_edit,  
                    

                }
            )
        else:
            print(f"✨ Detected NEW video generation intent.")
            enhanced_prompt = await _enhance_prompt_with_context(query, conversation, state)
            
            print(f"   Using Model: {model}")
            print(f"   Original Query: {query}")
            print(f"   Enhanced Prompt: {enhanced_prompt}")
            
            output = await replicate.async_run(
                model,
                input={"prompt": enhanced_prompt,
                       "duration": 5}
            )
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
        video_urls = []
        video_urls.append(video_url)
        state["video_urls"] = video_urls
        state["response"] = f"Video generated successfully! URL: {video_url}"
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

