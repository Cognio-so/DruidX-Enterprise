from composio import Composio
import os
from openai import OpenAI
import uuid
from typing import List, Dict, Any, Optional
from graph_type import GraphState
import asyncio
import json
from llm import get_llm
# from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
import os
from llm import get_llm
SLACK_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_SLACK", "20251201_01")  
CALENDAR_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_GOOGLECALENDAR", "20251024_00")
GITHUB_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_GITHUB", "20251024_00")
GOOGLE_SHEETS_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_GOOGLESHEET", "20251027_00")
TWITTER_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_TWITTER", "20251025_00")
GOOGLE_DRIVE_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_GOOGLEDRIVE", "20251026_00")
GOOGLE_DOCS_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_GOOGLEDOCS", "20251029_00")
GMAIL_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_GMAIL", "20251024_00")
YOUTUBE_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_YOUTUBE", "20251025_00")
FIGMA_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_FIGMA", "20251024_00")
MICROSOFT_TEAMS_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_MICROSOFTTEAMS", "20251027_00")
SHOPIFY_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_SHOPIFY", "20251028_00")
LINKEDIN_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_LINKEDIN", "20251026_00")
GOOGLE_MAPS_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_GOOGLEMAPS", "20251024_00")
GOOGLE_MEET_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_GOOGLEMEET", "20251025_00")
STRIPE_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_STRIPE", "20251027_00")            
WHATSAPP_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_WHATSAPP", "20251028_00")
ZOOM_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_ZOOM", "20251026_00")
GOOGLE_ADS_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_GOOGLEADS", "20251024_00")
FACEBOOK_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_FACEBOOK", "20251025_00")
CANVA_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_CANVA", "20251027_00")
GOOGLE_ANALYTICS_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_GOOGLEANALYTICS", "20251028_00")
SALESFORCE_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_SALESFORCE", "20251026_00")
ZOHO_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_ZOHO", "20251024_00")
NOTION_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_NOTION", "20251025_00")
composio = Composio(api_key=os.getenv("COMPOSIO_API_KEY"),
                    config={
        "toolkitVersions": {
            "GMAIL": GMAIL_VERSION,
            "SLACK": SLACK_VERSION,
            "GITHUB": GITHUB_VERSION,
            "GOOGLECALENDAR": CALENDAR_VERSION,
            "GOOGLESHEETS": GOOGLE_SHEETS_VERSION,
            "TWITTER": TWITTER_VERSION,
            "GOOGLEDRIVE": GOOGLE_DRIVE_VERSION,
            "GOOGLEDOCS": GOOGLE_DOCS_VERSION,
            "YOUTUBE": YOUTUBE_VERSION,
            "FIGMA": FIGMA_VERSION,
            "MICROSOFT_TEAMS": MICROSOFT_TEAMS_VERSION,
            "SHOPIFY": SHOPIFY_VERSION,
            "LINKEDIN": LINKEDIN_VERSION,
            "GOOGLE_MAPS": GOOGLE_MAPS_VERSION,
            "GOOGLEMEET": GOOGLE_MEET_VERSION,
            "STRIPE": STRIPE_VERSION,
            "WHATSAPP": WHATSAPP_VERSION,
            "ZOOM": ZOOM_VERSION,
            "GOOGLE_ADS": GOOGLE_ADS_VERSION,
            "FACEBOOK": FACEBOOK_VERSION,
            "CANVA": CANVA_VERSION,
            "GOOGLE_ANALYTICS": GOOGLE_ANALYTICS_VERSION,
            "SALESFORCE": SALESFORCE_VERSION,
            "ZOHO": ZOHO_VERSION,
            "NOTION": NOTION_VERSION,
            
        }
        })
# Python version - use snake_case
# tool = composio.tools.get_raw_composio_tool_by_slug("SLACK")
# print({
#     "slug": tool.slug,
#     "version": tool.version,
#     "available_versions": tool.available_versions
# })



slack_auth_config_id = os.getenv("SLACK_AUTH_CONFIG_ID", "")
gmail_auth_config_id = os.getenv("GMAIL_AUTH_CONFIG_ID", "")
github_auth_config_id = os.getenv("GITHUB_AUTH_CONFIG_ID", "")
# Add these new environment variable imports
google_calendar_auth_config_id = os.getenv("GOOGLE_CALENDER_AUTH_CONFIG_ID", "")
google_sheets_auth_config_id = os.getenv("GOOGLE_SHEETS_AUTH_CONFIG_ID", "")
twitter_auth_config_id = os.getenv("TWITTER_AUTH_CONFIG_ID", "")
google_drive_auth_config_id = os.getenv("GOOGLE_DRIVE_AUTH_CONFIG_ID", "")
youtube_auth_config_id = os.getenv("YOUTUBE_AUTH_CONFIG_ID", "")
figma_auth_config_id = os.getenv("FIGMA_AUTH_CONFIG_ID", "")
microsoft_teams_auth_config_id = os.getenv("MICROSOFT_TEAMS_AUTH_CONFIG_ID", "")
shopify_auth_config_id = os.getenv("SHOPIFY_AUTH_CONFIG_ID", "")
linkedin_auth_config_id = os.getenv("LINKEDIN_AUTH_CONFIG_ID", "")
google_maps_auth_config_id = os.getenv("GOOGLE_MAPS_AUTH_CONFIG_ID", "")
google_meet_auth_config_id = os.getenv("GOOGLE_MEET_AUTH_CONFIG_ID", "")
stripe_auth_config_id = os.getenv("STRIPE_AUTH_CONFIG_ID", "")
whatsapp_auth_config_id = os.getenv("WHATSAPP_AUTH_CONFIG_ID", "")
zoom_auth_config_id = os.getenv("ZOOM_AUTH_CONFIG_ID", "")
google_ads_auth_config_id = os.getenv("GOOGLE_ADS_AUTH_CONFIG_ID", "")
facebook_auth_config_id = os.getenv("FACEBOOK_AUTH_CONFIG_ID", "")
canva_auth_config_id = os.getenv("CANVA_AUTH_CONFIG_ID", "")
google_analytics_auth_config_id = os.getenv("GOOGLE_ANALYTICS_AUTH_CONFIG_ID", "")
salesforce_auth_config_id = os.getenv("SALESFORCE_AUTH_CONFIG_ID", "")
zoho_auth_config_id = os.getenv("ZOHO_AUTH_CONFIG_ID", "")
notion_auth_config_id = os.getenv("NOTION_AUTH_CONFIG_ID", "")
google_docs_auth_config_id = os.getenv("GOOGLE_DOCS_AUTH_CONFIG_ID", "")
TOOL_CONFIGS = {
    "gmail": {
        "auth_config_id": gmail_auth_config_id,
        "tools": ["GMAIL"]
    },
    "github": {
        "auth_config_id": github_auth_config_id, 
        "tools": ["GITHUB"]
    },
    "slack": {
        "auth_config_id": slack_auth_config_id,
        "tools": ["SLACK"]
    },
    "google_calendar": {
        "auth_config_id": google_calendar_auth_config_id,
        "tools": ["GOOGLECALENDAR"]
    },
    "google_sheets": {
        "auth_config_id": google_sheets_auth_config_id,
        "tools": ["GOOGLESHEETS"]
    },
    "twitter": {
        "auth_config_id": twitter_auth_config_id,
        "tools": ["TWITTER"]
    },
    "google_drive": {
        "auth_config_id": google_drive_auth_config_id,
        "tools": ["GOOGLEDRIVE"]
    },
    "google_docs": {
        "auth_config_id": google_docs_auth_config_id,
        "tools": ["GOOGLEDOCS"]
    },
    "youtube": {
        "auth_config_id": youtube_auth_config_id,
        "tools": ["YOUTUBE"]
    },
    "figma": {
        "auth_config_id": figma_auth_config_id,
        "tools": ["FIGMA"]
    },
    "microsoft_teams": {
        "auth_config_id": microsoft_teams_auth_config_id,
        "tools": ["MICROSOFT_TEAMS"]
    },
    "shopify": {
        "auth_config_id": shopify_auth_config_id,
        "tools": ["SHOPIFY"]
    },
    "linkedin": {
        "auth_config_id": linkedin_auth_config_id,
        "tools": ["LINKEDIN"]
    },
    "google_maps": {
        "auth_config_id": google_maps_auth_config_id,
        "tools": ["GOOGLE_MAPS"]
    },
    "google_meet": {
        "auth_config_id": google_meet_auth_config_id,
        "tools": ["GOOGLEMEET"]
    },
    "stripe": {
        "auth_config_id": stripe_auth_config_id,
        "tools": ["STRIPE"]
    },
    "whatsapp": {
        "auth_config_id": whatsapp_auth_config_id,
        "tools": ["WHATSAPP"]
    },
    "zoom": {
        "auth_config_id": zoom_auth_config_id,
        "tools": ["ZOOM"]
    },
    "google_ads": {
        "auth_config_id": google_ads_auth_config_id,
        "tools": ["GOOGLEADS"]
    },
    "facebook": {
        "auth_config_id": facebook_auth_config_id,
        "tools": ["FACEBOOK"]
    },
    "canva": {
        "auth_config_id": canva_auth_config_id,
        "tools": ["CANVA"]
    },
    "google_analytics": {
        "auth_config_id": google_analytics_auth_config_id,
        "tools": ["GOOGLE_ANALYTICS"]
    },
    "salesforce": {
        "auth_config_id": salesforce_auth_config_id,
        "tools": ["SALESFORCE"]
    },
    "zoho": {
        "auth_config_id": zoho_auth_config_id,
        "tools": ["ZOHO"]
    },
    "notion": {
        "auth_config_id": notion_auth_config_id,
        "tools": ["NOTION"]
    }
}

class MCPNode:
    """MCP Node for handling Composio tool integrations"""
    
    @staticmethod
    def get_available_tools() -> List[Dict[str, Any]]:
        """Get list of available Composio tools/apps"""
        available_tools = []
        for app_name, config in TOOL_CONFIGS.items():
            available_tools.append({
                "name": app_name.upper(),
                "slug": app_name,
                "auth_config_id": config["auth_config_id"],
                "logo": f"https://logos.composio.dev/api/{app_name.lower()}",
                "description": f"Connect your {app_name.upper()} account",
                "tools": config["tools"]
            })
        return available_tools
    
    @staticmethod
    async def initiate_connection(gpt_id: str, app_name: str, redirect_url: str = None) -> Dict[str, Any]:
        """Initiate OAuth connection for a GPT to a specific app"""
        try:
            app_config = TOOL_CONFIGS.get(app_name.lower())
            if not app_config:
                raise ValueError(f"App {app_name} not configured")
            
            user_id = f"gpt_{gpt_id}"
            auth_config_id = app_config["auth_config_id"]
        
            connection_request = await asyncio.to_thread(
            composio.connected_accounts.link,
            user_id=user_id,
            auth_config_id=auth_config_id,
            callback_url=redirect_url or "http://localhost:3000/api/mcp/callback"
        )
            
            return {
                "user_id": user_id,
                "connection_request_id": getattr(connection_request, 'connection_request_id', None),
                "redirect_url": connection_request.redirect_url,
                "status": "initiated"
            }
            
        except Exception as e:
            raise Exception(f"Failed to initiate connection: {str(e)}")
    
    @staticmethod
    async def get_user_connections(gpt_id: str) -> List[Dict[str, Any]]:
        """Get all active connections for a GPT - ASYNC for concurrent requests"""
        try:
            user_id = f"gpt_{gpt_id}"
            connections_response = await asyncio.to_thread(
                composio.connected_accounts.list,
                user_ids=[user_id]
            )
            # print(f"Connections response: {connections_response}")
            if hasattr(connections_response, 'items'):
                connections = connections_response.items
            elif hasattr(connections_response, 'get'):
                connections = connections_response.get("items", [])
            else:
                connections = []

            active_connections = []
            for conn in connections:
                status = getattr(conn, 'status', None)
                if status is None and hasattr(conn, 'get'):
                    status = conn.get("status")
                if status == "ACTIVE":
                    active_connections.append(conn)
            return active_connections
        except Exception as e:
            # Handle/log error as needed
            return []

    
    @staticmethod
    async def disconnect_tool(gpt_id: str, connection_id: str) -> Dict[str, Any]:
        """Disconnect a specific tool for a GPT"""
        try:
            try:
                await asyncio.to_thread(
                        composio.connected_accounts.delete,
                        id=connection_id
                    )
            except TypeError as e1:
                try:
                    composio.connected_accounts.delete(connection_id=connection_id)
                except TypeError as e2:
                    composio.connected_accounts.delete(connection_id)
            
            return {
                "success": True,
                "message": "Tool disconnected successfully"
            }
            
        except Exception as e:
            error_str = str(e).lower()
            if "not found" in error_str or "does not exist" in error_str or "404" in error_str:
                print(f"Connection {connection_id} not found in Composio - treating as already disconnected")
                return {
                    "success": True,
                    "message": "Tool was already disconnected"
                }
            else:
                raise Exception(f"Failed to disconnect tool: {str(e)}")
    
    @staticmethod
    async def execute_mcp_action(gpt_id: str, connected_tools: List[str], query: str, chunk_callback=None, state: Optional[GraphState] = None) -> str:
        """Execute MCP action using connected tools - ASYNC for concurrent requests"""
        try:
            user_id = f"gpt_{gpt_id}"
            
            # Get current date and time information
            from datetime import datetime, timezone, timedelta
            import calendar
            
            now = datetime.now(timezone.utc)
            current_date = now.strftime("%Y-%m-%d")
            current_time = now.strftime("%H:%M:%S UTC")
            current_day = now.strftime("%A")
            current_week = now.isocalendar()[1]  # ISO week number
            current_year = now.year
            current_month = now.strftime("%B")
            
            # Get this week's dates
            start_of_week = now - timedelta(days=now.weekday())
            end_of_week = start_of_week + timedelta(days=6)
            week_dates = []
            for i in range(7):
                day = start_of_week + timedelta(days=i)
                week_dates.append(f"{day.strftime('%A')} {day.strftime('%Y-%m-%d')}")
            
            # Get next few days for context
            next_days = []
            for i in range(1, 8):
                future_day = now + timedelta(days=i)
                next_days.append(f"{future_day.strftime('%A')} {future_day.strftime('%Y-%m-%d')}")
            
            composio_tools = await asyncio.to_thread(
                composio.tools.get, 
                user_id=user_id, 
                toolkits=connected_tools
            )
            
            system_message = (
    "You are an expert tool-calling assistant. Your only job is to "
    "analyze the user's request and select the most appropriate tool "
    "from the available options to fulfill the request accurately and efficiently. "
    "If the user wants to send content from previous node output, include that content in your tool parameters. "
    "If the user just wants to perform an action without previous content, focus on the user query alone. "
    f"\n\nCURRENT DATE/TIME CONTEXT:\n"
    f"Today is {current_day}, {current_date} at {current_time}\n"
    f"Current year: {current_year}, Current month: {current_month}, Week {current_week}\n"
    f"This week's dates: {', '.join(week_dates)}\n"
    f"Next 7 days: {', '.join(next_days)}\n"
    f"When scheduling meetings or performing any task which requires date or time , use these actual dates, time etc. and information unless user has explicitly has mentioned date or time or anything."
)
            # print(f"🔧 Loaded {len(composio_tools)} MCP tools for GPT {gpt_id}")
            # print(f"composio_tools: {composio_tools}")
            api_key=state.get("api_keys").get("openrouter")
            openai = OpenAI(
    api_key=api_key,
    base_url="https://openrouter.ai/api/v1"
)
            llm_model=state.get("llm_model")
            completion = await asyncio.to_thread(
                openai.chat.completions.create,
                model="openai/gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": query}
                ],
                tools=composio_tools
            )
            
            # Track token usage from OpenAI SDK response
            if state is not None and hasattr(completion, 'usage') and completion.usage:
                if "token_usage" not in state or state["token_usage"] is None:
                    state["token_usage"] = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
                
                usage = completion.usage
                state["token_usage"]["input_tokens"] += getattr(usage, 'prompt_tokens', 0)
                state["token_usage"]["output_tokens"] += getattr(usage, 'completion_tokens', 0)
                state["token_usage"]["total_tokens"] += getattr(usage, 'total_tokens', 0)
                
                print(f"[TokenTracking] MCP tool selection tokens: input={getattr(usage, 'prompt_tokens', 0)}, output={getattr(usage, 'completion_tokens', 0)}, total={getattr(usage, 'total_tokens', 0)}")
            
            # print(f"completion: {completion}")
            result = await asyncio.to_thread(
                composio.provider.handle_tool_calls,
                user_id=user_id,
                response=completion,
                
            )
            
            return result
            
        except Exception as e:
            print(f"❌ Error executing MCP action: {e}")
            import traceback
            traceback.print_exc()
            return f"❌ Error executing MCP action: {e}"
        
TOOL_MAPPING = {
    "slack": "SLACK",
    "gmail": "GMAIL", 
    "github": "GITHUB",
    "google_calendar": "GOOGLECALENDAR",
    "google_sheets": "GOOGLESHEETS",
    "twitter": "TWITTER",
    "google_drive": "GOOGLEDRIVE",
    "youtube": "YOUTUBE",
    "figma": "FIGMA",
    "microsoft_teams": "MICROSOFT_TEAMS",
    "shopify": "SHOPIFY",
    "linkedin": "LINKEDIN",
    "google_maps": "GOOGLE_MAPS",
    "google_meet": "GOOGLEMEET",
    "stripe": "STRIPE",
    "whatsapp": "WHATSAPP",
    "zoom": "ZOOM",
    "google_ads": "GOOGLEADS",
    "facebook": "FACEBOOK",
    "canva": "CANVA",
    "google_analytics": "GOOGLE_ANALYTICS",
    "salesforce": "SALESFORCE",
    "zoho": "ZOHO",
    "notion": "NOTION",
    "google_docs": "GOOGLEDOCS"
}

async def mcp_node(state: GraphState) -> GraphState:
    """MCP Node for the graph workflow"""
    try:
        print("=== MCP NODE EXECUTION ===")
        
        # GET INTERMEDIATE RESULTS
        intermediate_results = state.get("intermediate_results", [])
        previous_output = ""
        previous_node = "Unknown"
        print(f"Intermediate Results:", intermediate_results)
        if intermediate_results:
            last_result = intermediate_results[-1]
            previous_output = last_result.get("output", "")
            previous_node = last_result.get("node", "Unknown")
            print(f"🔧 DEBUG: Previous {previous_node} output: {len(previous_output)} chars")
        
        mcp_tool_needed = state.get("mcp_tools_needed")
        if not mcp_tool_needed:
            route = state.get("route", "")
            if route.startswith("mcp:"):
                mcp_tool_needed = route.replace("mcp:", "")
                print(f"Extracted tool from route: {mcp_tool_needed}")
        
        enabled_composio_tools = state.get("enabled_composio_tools", [])
        gpt_config = state.get("gpt_config", {})
        gpt_id = gpt_config.get("gpt_id")
        user_query = state.get("user_query", "")
        chunk_callback = state.get("_chunk_callback")
        
        # CREATE INTELLIGENT USER MESSAGE - Handle all scenarios
        past_messages = state.get("messages", [])
        formatted_history = []
        for i, m in enumerate(past_messages[-2:], 1):  # Get last 4 messages for context
                role = (m.get("type") or m.get("role") or "").lower()
                content = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
                
                if content:
                    if len(content.split()) > 1000:
                        content = " ".join(content.split()[:1000]) + "..."
                    
                    timestamp = m.get("timestamp", f"Message {i}")
                    
                    if role in ("human", "user"):
                        formatted_history.append(f"User: {content}")
                    else:
                        formatted_history.append(f"Assistant: {content}")
        
        if intermediate_results and previous_output:
            intelligent_user_message = f"""
User Request: {user_query}

Available Context:
1. Previous Node Output ({previous_node}):
{previous_output}

2. Recent Conversation History:
{chr(10).join(formatted_history[-2:])}

Instructions: 
- Analyze the user's request intelligently to determine what content to use
- If user says "send this", "share this", "save this" → Use Previous Node Output (the answer/data from the last operation)
- If user says "send hello", "send hi", "create task: XYZ" → Use only what user explicitly mentioned, ignore previous output
- If user references past conversation ("send what we discussed", "send the earlier response") → Use conversation history
- DO NOT include the user's original question when sending content
- DO NOT add headers like "User Message:" or "Assistant Response:"
- Send ONLY the actual content/data that should be shared

Examples:
✅ "send this to slack" + previous output exists → Send the previous output content
✅ "send hello to slack" → Send only "hello"  
✅ "save this document" + previous output exists → Save the previous output
✅ "send the conversation to email" → Include relevant conversation history
✅ "create meeting for tomorrow at 3pm" → Create meeting with those details only

CRITICAL: Be smart about context. Use previous output when user refers to it implicitly ("this", "it", "the data"), but use explicit content when user provides it directly.
"""
        else:
            intelligent_user_message = f"""
User Request: {user_query}

Recent Conversation History (if needed):
{chr(10).join(formatted_history[-2:])}

Instructions:
- Execute the user's request as stated
- If the request needs conversation context, use the history provided
- If it's a standalone request, just execute it directly
- DO NOT add headers or conversation metadata to the actual content being sent/created
"""
        
        print(f"Enabled Composio Tools: {enabled_composio_tools}")
        print(f"MCP Tool Needed: {mcp_tool_needed}")
        print(f"GPT ID: {gpt_id}")
        print(f"User Query: {user_query}")
        # print(f"Intelligent User Message: {intelligent_user_message[:500]}...")

        if not enabled_composio_tools:
            print("No Composio tools enabled for this message")
            state["response"] = "No Composio tools are enabled for this message."
            return state
        mcp_connections = await MCPNode.get_user_connections(gpt_id)
        # print(f"Active MCP Connections: {mcp_connections}")
        
        if not mcp_connections:
            print("No active MCP connections found")
            state["response"] = "No active connections found. Please authenticate your tools first."
            return state

        connected_tools = []
        if mcp_tool_needed and mcp_tool_needed in TOOL_MAPPING:
            toolkit_name = TOOL_MAPPING[mcp_tool_needed]
            connected_tools.append(toolkit_name)
            print(f"Added toolkit: {toolkit_name} for tool: {mcp_tool_needed}")
        else:
            for enabled_tool in enabled_composio_tools:
                if enabled_tool in TOOL_MAPPING:
                    toolkit_name = TOOL_MAPPING[enabled_tool]
                    connected_tools.append(toolkit_name)
                    print(f"Added toolkit: {toolkit_name} for enabled tool: {enabled_tool}")
        
        if not connected_tools:
            print("No valid tools found for enabled composio tools")
            state["response"] = "No valid tools found for the enabled Composio tools."
            return state
        
        print(f"Executing MCP action with tools: {connected_tools}")
    
        result = await MCPNode.execute_mcp_action(
            gpt_id=gpt_id,
            connected_tools=connected_tools,
            query=intelligent_user_message,
            chunk_callback=None,
            state=state
        )
    
        raw_result_str = str(result)
        print(f"Raw MCP Node result: {raw_result_str[:4000]}...")
        
        # IMPROVED FORMATTING PROMPT - LET LLM INTELLIGENTLY UNDERSTAND THE ACTION
        tool_names = ", ".join([t.upper() for t in connected_tools]) if connected_tools else "integrated tools"
        
        system_prompt = f"""You are a professional assistant that confirms completed actions to users.

CRITICAL INSTRUCTIONS:
1. The action has ALREADY been completed successfully
2. Your job is to confirm what was done, not to say what will be done
3. ALWAYS use past tense language: "sent", "created", "retrieved", "updated", "deleted" (NEVER use future tense like "will send", "I'll create", "here's what will be...")
4. Analyze the user's request and the tool output to understand what action was performed
5. Be specific about what was accomplished
6. Format the output professionally and clearly

Context:
- User's original request: "{user_query}"
- Tools used: {tool_names}

Your Task:
1. Understand what action was performed by analyzing the user request and tool output
2. Confirm the completed action in past tense
3. Provide relevant details from the output
4. Format data cleanly (use bullet points, structured text, or tables when appropriate)
5. **IMPORTANT: If the output contains IDs, URLs, or links (like document IDs, file URLs, Slack message links, GitHub PR links, etc.), ALWAYS create clickable links so users can directly access the resource**

Link Creation Guidelines:
- Google Docs: Use document ID to create link like: https://docs.google.com/document/d/DOCUMENT_ID/edit
- Google Sheets: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
- Google Drive: https://drive.google.com/file/d/FILE_ID/view
- GitHub: Use the provided URL or create from repo/issue/PR numbers
- Slack: Include channel name and message timestamp if available
- Gmail: Provide subject and sender, but note that direct links require authentication
- Always format links as: [Link Text](URL) for markdown, or simply provide the full URL

Response Guidelines:
- Start with "✅" to indicate success
- Clearly state what was accomplished using past tense verbs
- **Include direct links to created/modified resources when available**
- For data retrieval: Present the data in a clean, readable format
- For message sending: Confirm where it was sent, provide link if available, and show a brief preview of the actual content that was sent (NOT the user's question)
- For creation/updates: Confirm what was created/updated with access link
- Be concise, professional, and informative
- DO NOT include headers like "Message 1 - User:" or "Assistant Response:" - just show the actual content
- DO NOT show the user's original question in the confirmation - only show what was actually sent/created/updated
- NEVER use phrases like "will be sent", "I'll prepare", "here's what will happen" - the action is DONE"""
        
        user_prompt = f"""The tool has successfully completed an action. Here is the raw output:

{raw_result_str[:8000]}

Analyze this output and create a clear, professional confirmation message that tells the user exactly what was accomplished (in past tense). 

IMPORTANT: Look for any IDs, URLs, or identifiers in the output and create direct clickable links for the user to access the resource immediately."""

        try:
            api_key = state.get("api_keys").get("openrouter")
            openai = OpenAI(
                api_key=api_key,
                base_url="https://openrouter.ai/api/v1"
            )
            llm_model = state.get("llm_model")
            formatting_completion = await asyncio.to_thread(
                openai.chat.completions.create,
                model=llm_model, 
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            # Track token usage from formatting LLM call
            if hasattr(formatting_completion, 'usage') and formatting_completion.usage:
                if "token_usage" not in state or state["token_usage"] is None:
                    state["token_usage"] = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
                
                usage = formatting_completion.usage
                state["token_usage"]["input_tokens"] += getattr(usage, 'prompt_tokens', 0)
                state["token_usage"]["output_tokens"] += getattr(usage, 'completion_tokens', 0)
                state["token_usage"]["total_tokens"] += getattr(usage, 'total_tokens', 0)
                
                print(f"[TokenTracking] MCP formatting tokens: input={getattr(usage, 'prompt_tokens', 0)}, output={getattr(usage, 'completion_tokens', 0)}, total={getattr(usage, 'total_tokens', 0)}")
            
            formatted_result = formatting_completion.choices[0].message.content
            final_response = formatted_result
            
        except Exception as format_e:
            print(f"❌ Error during MCP result formatting: {format_e}")
            # Fallback: create a basic confirmation message
            # final_response = f"✅ Successfully {action_type} using {tool_name.upper()}.\n\nRaw result: {raw_result_str[:1000]}"
                
        if chunk_callback and hasattr(chunk_callback, '__call__'):
            await chunk_callback(str(final_response))
        
        state["response"] = str(final_response)
        
    except Exception as e:
        print(f"❌ Error in MCP node: {e}")
        import traceback
        traceback.print_exc()
        state["response"] = f"Error executing MCP action: {str(e)}"
    
    return state