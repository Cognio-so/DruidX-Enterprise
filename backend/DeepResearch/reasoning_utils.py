# DeepResearch/reasoning_utils.py
"""
Utility functions for extracting reasoning traces from LLM responses
"""

def extract_reasoning(response_text: str) -> str:
    """
    Extract reasoning trace from LLM response.
    For reasoning models, reasoning is typically:
    1. Marked with "REASONING:" section
    2. Or the thinking/analysis part before the final answer
    """
    if not response_text:
        return ""
    
    # Check for explicit REASONING: marker
    if "REASONING:" in response_text:
        try:
            reasoning_section = response_text.split("REASONING:")[1].strip()
            # Take first 500 chars to keep it concise for UI
            reasoning = reasoning_section.split("\n\n")[0][:500]
            if len(reasoning_section) > 500:
                reasoning += "..."
            return reasoning
        except:
            pass
    
    # For reasoning models, sometimes reasoning is in thinking tags or before final answer
    # Check for common patterns
    if "<think>" in response_text and "</think>" in response_text:
        try:
            thinking = response_text.split("<think>")[1].split("</think>")[0].strip()
            return thinking[:500] + ("..." if len(thinking) > 500 else "")
        except:
            pass
    
    # If no explicit marker, try to extract first paragraph or thinking-like content
    # This is a fallback for models that don't use explicit markers
    lines = response_text.split("\n")
    reasoning_lines = []
    for line in lines[:10]:  # Check first 10 lines
        line = line.strip()
        if line and not line.startswith(("#", "1.", "2.", "3.", "-", "•")):
            reasoning_lines.append(line)
            if len(" ".join(reasoning_lines)) > 300:
                break
    
    if reasoning_lines:
        reasoning = " ".join(reasoning_lines)
        return reasoning[:500] + ("..." if len(reasoning) > 500 else "")
    
    return ""

