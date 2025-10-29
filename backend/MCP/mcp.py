from composio import Composio
import os
from openai import OpenAI
import uuid
from typing import List, Dict, Any, Optional
from graph_type import GraphState
import asyncio
import json
from llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage
import os

SLACK_VERSION = os.getenv("COMPOSIO_TOOLKIT_VERSION_SLACK", "20251201_01")  
composio = Composio(api_key=os.getenv("COMPOSIO_API_KEY"),
                    config={
        "toolkitVersions": {
            "SLACK": SLACK_VERSION,
            "GOOGLECALENDAR":"20251024_00"

        } 
        })
# Python version - use snake_case
# tool = composio.tools.get_raw_composio_tool_by_slug("SLACK")
# print({
#     "slug": tool.slug,
#     "version": tool.version,
#     "available_versions": tool.available_versions
# })


openai = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)
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
    async def execute_mcp_action(gpt_id: str, connected_tools: List[str], query: str, chunk_callback=None) -> str:
        """Execute MCP action using connected tools - ASYNC for concurrent requests"""
        try:
            user_id = f"gpt_{gpt_id}"
            # toolkit_versions = {}
            # for toolkit in connected_tools:
            #     try:
            #         if toolkit == "SLACK":
            #             tool = composio.tools.get_raw_composio_tool_by_slug("SLACK_SEND_MESSAGE")
            #             toolkit_versions['SLACK'] = tool.version
            #     except Exception as e:
            #         print(f"Warning: Could not get version for {toolkit}: {e}")
            # composio.toolkit_versions = toolkit_versions        
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
    "If the user just wants to perform an action without previous content, focus on the user query alone."
)
            # print(f"🔧 Loaded {len(composio_tools)} MCP tools for GPT {gpt_id}")
            # print(f"composio_tools: {composio_tools}")
            completion = await asyncio.to_thread(
                openai.chat.completions.create,
                model="openai/gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": query}
                ],
                tools=composio_tools
            )
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
        
        # CREATE INTELLIGENT USER MESSAGE
        if intermediate_results and previous_output:
            intelligent_user_message = f"""
User Request: {user_query}

Previous Node Output ({previous_node}):
{previous_output}

Instructions: 
- Analyze the user request carefully
- If the user wants to SEND, SHARE, or USE content from the previous node output, include that content in your tool parameters
- If the user just wants to perform a simple action (like "send hello"), focus only on the user request
- Be intelligent about when to use previous context vs. when to ignore it
- Examples:
  * "send the book list to slack" → Use the previous output (book list)
  * "send hello to slack" → Don't use previous output, just send "hello"
  * "send the email content to slack" → Use the previous output (email content)
"""
        else:
            intelligent_user_message = user_query
        
        print(f"Enabled Composio Tools: {enabled_composio_tools}")
        print(f"MCP Tool Needed: {mcp_tool_needed}")
        print(f"GPT ID: {gpt_id}")
        print(f"User Query: {user_query}")
        print(f"Intelligent User Message: {intelligent_user_message[:300]}...")
        
        if not enabled_composio_tools:
            print("No Composio tools enabled for this message")
            state["response"] = "No Composio tools are enabled for this message."
            return state
        mcp_connections = await MCPNode.get_user_connections(gpt_id)
        print(f"Active MCP Connections: {mcp_connections}")
        
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
            chunk_callback=None
        )
    
        raw_result_str = str(result)
        print(f"Raw MCP Node result: {raw_result_str[:4000]}...")
        system_prompt = (
            "You are an assistant that formats raw tool output into a clean, "
            "user-friendly response. The user's original request was: "
            f"'{user_query}'.\n"
            "Do not include headers, HTML, or raw JSON structures. "
            " For emails, list the sender, "
            "subject, and a brief preview."
        )
        
        user_prompt = (
            f"Here is the raw data from the tool:\n\n"
            f"{raw_result_str[:8000]}\n\n" 
            "Please format this into a concise, readable answer for the user."
        )

        try:
            
            formatting_completion = await asyncio.to_thread(
                openai.chat.completions.create,
                model="openai/gpt-4o-mini", 
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            
            formatted_result = formatting_completion.choices[0].message.content
            # print(f"MCP Node formatted result: {formatted_result}")
            final_response = formatted_result
            
        except Exception as format_e:
            print(f"❌ Error during MCP result formatting: {format_e}")
           
            final_response = "Error formatting result. Raw data: " + raw_result_str[:1000] + "..."
                
       
        if chunk_callback and hasattr(chunk_callback, '__call__'):
            await chunk_callback(str(final_response))
        
        state["response"] = str(final_response)
        
    except Exception as e:
        print(f"❌ Error in MCP node: {e}")
        import traceback
        traceback.print_exc()
        state["response"] = f"Error executing MCP action: {str(e)}"
    
    return state