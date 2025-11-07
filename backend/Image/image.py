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
    previous_images: List[str],
    conversation: List[Dict[str, Any]],
    state: GraphState,
) -> bool:
    """
    Uses an LLM to decide if the user query is an edit
    request or a new image generation request.
    """
    print("🕵️ Checking for image edit intent...")
    history_str = ""
    for m in (conversation or [])[-2:]:
        role = (m.get("type") or m.get("role") or "").lower()
        content = m.get("content", "")
        speaker = "User" if role in ("human", "user") else "Assistant"
        history_str += f"{speaker}: {content}\n"

    system_prompt = """You are a simple AI router. Your only job is to decide if the user wants to EDIT a PREVIOUSLY generated image or create a NEW one.

Rules:
1. If "Previous images exist" is false, it's always a NEW image ("is_edit": false).
2. If the user query is an edit request (e.g., "make it...", "change...", "add...", "more realistic", "different color", "remove..."), it's an EDIT ("is_edit": true).
3. If the user query is a clear NEW request (e.g., "now create a...", "I also want a picture of...", "show me something else"), it's NEW ("is_edit": false).

Return ONLY valid JSON:
{"is_edit": true/false}"""

    human_prompt = f"""Previous images exist: {bool(previous_images)}
Last image URL: {previous_images[-1] if previous_images else 'None'}

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
        if bool(previous_images) and len(query.split()) < 10:
            print("🕵️ Edit Intent Fallback: Assuming EDIT")
            return True

    print("🕵️ Edit Intent Fallback: Assuming NEW")
    return False


async def generate_image(state: GraphState) -> GraphState:
    print("🖼️ Image Node Executing...")

    query = state.get("user_query", "")
    model = state.get("img_model", "google/imagen-4-fast")
    previous_images = state.get("img_urls", [])
    print(f"🖼️ User Query: {query}")
    print(f"🖼️ Using Image Model: {model}")
    print(f"🖼️ Previous Images: {previous_images}")
    conversation = state.get("messages", [])
    is_edit_intent = await _check_edit_intent(
        query, previous_images, conversation, state
    )
    
    try:
        if is_edit_intent:
            print(f"📸 Detected EDIT intent. Modifying image...")
            image_to_edit = previous_images[-1] 
            
            output = await replicate.async_run(
                model,
                input={
                    "image_input": [image_to_edit],
                    "prompt": query,
                }
            )
        else:
            print(f"✨ Detected NEW image generation intent.")
            print(f"   Using Model: {model}")
            print(f"   With Prompt: {query}")
            output = await replicate.async_run(
                model,
                input={"prompt": query}
            )

       
        if isinstance(output, list):
            first = output[0]
            if hasattr(first, "url"):
                image_url = first.url
            else:
                image_url = str(first)
        elif hasattr(output, "url"):
            image_url = output.url
        else:
            image_url = str(output)

        print("✅ Generated image URL:", image_url)
        
        # Store image URL in separate state
        img_urls = []
        img_urls.append(image_url)
        state["img_urls"] = img_urls
        
        # Also store in response for backward compatibility
        state["response"] = f"Image generated successfully! URL: {image_url}"
        
        # Add message to conversation history
        state.setdefault("messages", []).append({
            "role": "assistant", 
            "content": f"Generated image: {image_url}"
        })

    except Exception as e:
        print(f"❌ Error in image node: {e}")
        import traceback
        traceback.print_exc()
        state["response"] = f"Sorry, I couldn't process the image. Error: {e}"

    return state