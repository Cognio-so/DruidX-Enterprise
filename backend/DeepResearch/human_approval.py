from graph_type import GraphState
import json
import asyncio

async def human_approval_node(state: GraphState) -> GraphState:
    """
    Human approval node for Deep Research planning phase
    Generates plan, sends to frontend for approval, waits for response
    If approved → execute_research, if rejected → plan_research
    """
    session_id = state.get("session_id")
    chunk_callback = state.get("_chunk_callback")
    research_state_dict = state.get("deep_research_state", {})
    research_plan = research_state_dict.get("research_plan", [])
    
    print(f"🔥 HUMAN_APPROVAL: Research plan length: {len(research_plan)}")

    # Store approval state in session
    if session_id:
        from main import SessionManager
        session = await SessionManager.get_session(session_id)
        session["pending_approval"] = {
            "plan": research_plan,
            "session_id": session_id,
            "status": "waiting"
        }
        await SessionManager.update_session(session_id, session)

    # Send approval event to frontend
    approval_event = {
        "type": "approval_required",
        "data": {
            "plan": research_plan,
            "total_questions": len(research_plan)
        }
    }
    print(f"🔥 HUMAN_APPROVAL: Sending approval event to frontend")
    
    if chunk_callback:
        await chunk_callback(json.dumps(approval_event))
        # Extract reasoning from research plan if available
        reasoning = f"Generated {len(research_plan)} research questions based on query analysis. Review and approve to proceed with research execution."
        await chunk_callback(json.dumps({
            "type": "status",
            "data": {
                "phase": "waiting_approval",
                "message": "Review the research plan and approve to continue",
                "reasoning": reasoning
            }
        }))
    
    # Wait for approval (poll session)
    print("⏳ Waiting for user approval...")
    max_wait_time = 300  # 5 minutes timeout
    wait_interval = 0.5  # Check every 0.5 seconds
    waited_time = 0
    
    while waited_time < max_wait_time:
        await asyncio.sleep(wait_interval)
        waited_time += wait_interval
        
        # Check session for approval
        session = await SessionManager.get_session(session_id)
        pending_approval = session.get("pending_approval")
        
        if pending_approval and pending_approval.get("status") != "waiting":
            approval_status = pending_approval.get("status")
            feedback = pending_approval.get("feedback", "").strip()
            
            print(f"✅ Approval received: {approval_status}")
            if not approval_status == "approved" and feedback:
                print(f"📝 Feedback received: {feedback[:100]}...")  # Log first 100 chars
            
            # Mark waiting_approval as completed
            if chunk_callback:
                await chunk_callback(json.dumps({
                    "type": "status",
                    "data": {
                        "phase": "waiting_approval",
                        "message": "Approval received",
                        "status": "completed"
                    }
                }))
            
            if approval_status == "approved":
                # Approved → proceed to execution
                state["route"] = "execute_research"
            else:
                # Rejected → regenerate plan with feedback
                # Feedback should always be provided (enforced by frontend and backend validation)
                if feedback:
                    planning_attempts = research_state_dict.get("planning_attempts", 0) + 1
                    research_state_dict.setdefault("plan_history", []).append({
                        "attempt": planning_attempts,
                        "plan": pending_approval.get("plan", []),
                        "feedback": feedback,
                        "timestamp": "now"
                    })
                    research_state_dict.setdefault("user_feedback", []).append(feedback)
                    research_state_dict["planning_attempts"] = planning_attempts
                    
                    print(f"🔄 Regenerating plan with feedback (Attempt {planning_attempts})")
                    
                    # Don't show rejection messages to user - silently regenerate
                else:
                    # This should not happen due to validation, but handle gracefully
                    print("⚠️ Warning: Plan rejected without feedback (should not happen)")
                    research_state_dict["planning_attempts"] = research_state_dict.get("planning_attempts", 0) + 1
                    # Don't show rejection messages to user - silently regenerate
                
                state["route"] = "plan_research"
            
            # Update state
            state["deep_research_state"] = research_state_dict
            
            # Clear pending approval
            session["pending_approval"] = None
            await SessionManager.update_session(session_id, session)
            
            print(f"✅ Route set to: {state['route']}")
            return state
    
    # Timeout - cancel research
    print("⏰ Approval timeout, canceling research")
    if chunk_callback:
        await chunk_callback("⏰ **Approval timeout. Canceling research...**\n\n")
    state["route"] = "END"
    return state
