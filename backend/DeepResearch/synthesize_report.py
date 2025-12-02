# DeepResearch/synthesize_report.py
from graph_type import GraphState
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from llm import get_reasoning_llm, get_llm, stream_with_token_tracking
from DeepResearch.prompt_loader import PROMPTS
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
load_dotenv()
import os
google_api_key=os.getenv("GOOGLE_API_KEY", "")


async def synthesize_report_node(state: GraphState) -> GraphState:
    """
    Synthesize all gathered information into comprehensive report
    Streams final output but doesn't store in state to save tokens
    """
    research_state_dict = state["deep_research_state"]
    llm_model = state.get("deep_research_llm_model")
    
    chunk_callback = state.get("_chunk_callback")
    
    # Send status event instead of content for synthesis phase
    import json
    if chunk_callback:
        await chunk_callback(json.dumps({
            "type": "status",
            "data": {
                "phase": "synthesis",
                "message": "Synthesizing all research findings into comprehensive report..."
            }
        }))
    
    # Don't send intermediate summary - only final report
    
    all_info = []
    for item in research_state_dict["gathered_information"]:
        source_label = item['source'].upper()
        iteration = item['iteration']
        all_info.append(
            f"[{source_label} - Iteration {iteration}]\n"
            f"Query: {item['query']}\n"
            f"Findings: {item['content'][:600]}...\n"
        )
    
    all_info_text = "\n\n".join(all_info)
    sources_text = "None"
    if research_state_dict["sources"]:
        sources_text = "\n".join([f"- {url}" for url in research_state_dict["sources"][:10]])
    
    synthesis_prompt = PROMPTS['synthesis_prompt_template'].format(
        system_prompt=PROMPTS['system_prompt'],
        query=state.get('user_query', ''),
        total_iterations=research_state_dict["current_iteration"],
        confidence=research_state_dict["confidence_score"],
        sources_count=len(set(research_state_dict["sources"])),
        findings_count=len(research_state_dict["gathered_information"]),
        all_info=all_info_text,
        sources=sources_text
    )

    # Stream the LLM response
    # llm2 = ChatGoogleGenerativeAI(
    #     model="gemini-2.5-flash-lite",
    #     temperature=0.3,
    #     google_api_key=google_api_key,
    # )
    from api_keys_util import get_api_keys_from_session
    api_keys = await get_api_keys_from_session(state.get("session_id")) if state else {}
    llm2=get_reasoning_llm(llm_model, api_keys=api_keys)
    _, _ = await stream_with_token_tracking(
        llm2,
        [HumanMessage(content=synthesis_prompt)],
        chunk_callback=chunk_callback,
        state=state
    )
    
    # Add sources if not already included
    if research_state_dict["sources"]:
        sources_section = "\n\n## Sources & References\n"
        unique_sources = list(set(research_state_dict["sources"]))[:15]
        for i, url in enumerate(unique_sources, 1):
            sources_section += f"{i}. {url}\n"
        
        # Stream the sources section
        if chunk_callback:
            await chunk_callback(sources_section)
    
    # Mark synthesis as completed
    if chunk_callback:
        await chunk_callback(json.dumps({
            "type": "status",
            "data": {
                "phase": "synthesis",
                "message": "Research complete",
                "status": "completed"
            }
        }))
    
    print(f"\n[DeepResearch] Synthesizing final report...")
    print(f"[DeepResearch] Completed in {research_state_dict['current_iteration']} iterations")
    print(f"[DeepResearch] Final confidence: {research_state_dict['confidence_score']:.2f}")
    print(f"[DeepResearch] Total findings: {len(research_state_dict['gathered_information'])}")
    
    # REMOVE ALL STORAGE - Don't store anything to save tokens
    state["response"] = ""
    # Don't add to messages
    # Don't add to intermediate_results
    
    state["route"] = "END"
    
    return state