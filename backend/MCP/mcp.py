from composio import Composio
import os
from openai import OpenAI
import uuid
from typing import List, Dict, Any, Optional
from graph_type import GraphState
import asyncio
import json
composio = Composio(api_key=os.getenv("COMPOSIO_API_KEY"))
openai = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)
slack_auth_config_id = os.getenv("SLACK_AUTH_CONFIG_ID", "")
gmail_auth_config_id = os.getenv("GMAIL_AUTH_CONFIG_ID", "")
github_auth_config_id = os.getenv("GITHUB_AUTH_CONFIG_ID", "")
TOOL_CONFIGS = {
    "gmail": {
        "auth_config_id": gmail_auth_config_id,
        "tools": ["GMAIL"]
    },
    "github": {
        "auth_config_id":github_auth_config_id, 
        "tools": ["GITHUB"]
    },
    "slack": {
        "auth_config_id": slack_auth_config_id,
        "tools": ["SLACK"]
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
    def initiate_connection(gpt_id: str, app_name: str, redirect_url: str = None) -> Dict[str, Any]:
        """Initiate OAuth connection for a GPT to a specific app"""
        try:
            app_config = TOOL_CONFIGS.get(app_name.lower())
            if not app_config:
                raise ValueError(f"App {app_name} not configured")
            
            user_id = f"gpt_{gpt_id}"
            auth_config_id = app_config["auth_config_id"]
        
            connection_request = composio.connected_accounts.link(
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
        
            if hasattr(connections_response, 'items'):
                connections = connections_response.items
            elif hasattr(connections_response, 'get'):
                connections = connections_response.get("items", [])
            else:
                connections = []
            
            active_connections = []
            for conn in connections:
                if hasattr(conn, 'status'):
                    status = conn.status
                elif hasattr(conn, 'get'):
                    status = conn.get("status")
                else:
                    status = None
                
                if status == "ACTIVE":
                    app_name = ""
                    if hasattr(conn, 'toolkit'):
                        if hasattr(conn.toolkit, 'slug'):
                            app_name = conn.toolkit.slug
                        elif hasattr(conn.toolkit, 'get'):
                            app_name = conn.toolkit.get("slug", "")
                    elif hasattr(conn, 'get'):
                        toolkit_data = conn.get("toolkit", {})
                        app_name = toolkit_data.get("slug", "") if isinstance(toolkit_data, dict) else ""
                    
                    if hasattr(conn, '__dict__'):
                        conn_dict = {
                            "app_name": app_name, 
                            "status": getattr(conn, 'status', ''),
                            "id": getattr(conn, 'id', ''),
                        }
                    else:
                        conn_dict = {
                            "app_name": app_name,  
                            "status": conn.get("status", ""),
                            "id": conn.get("id", ""),
                        }
                    
                    active_connections.append(conn_dict)
            
            return active_connections
            
        except Exception as e:
            print(f"Error fetching connections for GPT {gpt_id}: {e}")
            return []
    
    @staticmethod
    async def execute_mcp_action(gpt_id: str, connected_tools: List[str], query: str, chunk_callback=None) -> str:
        """Execute MCP action using connected tools - ASYNC for concurrent requests"""
        try:
            user_id = f"gpt_{gpt_id}"
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
                response=completion
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
    "github": "GITHUB"
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