"""
InventoryPro AI Agent - Manual ReAct Implementation (HITL Version)
Includes Human-in-the-Loop constraints for executing destructive/mutating database tools.
"""

import os
import json
import re
import requests
from typing import Dict, List, Any, Optional

# ============================================================================
# TOOL DEFINITIONS
# ============================================================================

def get_inventory_summary(input_text: str = "") -> str:
    """Get a summary of current inventory status including total products, low stock items, and out of stock items."""
    try:
        response = requests.get("https://inventory-pro-self.vercel.app/api/Inventory")
        if response.status_code == 200:
            data = response.json()
            return f"""
Inventory Summary:
- Total Stock Value: ${data.get('total_stock_value', 0)}
- Active Items: {data.get('n_active_items', 0)}
- Low Stock Items: {data.get('n_low_stock_items', 0)}
- Out of Stock Items: {data.get('get_n_out_of_stock_items', 0)}
"""
        return "Failed to fetch inventory data"
    except Exception as e:
        return f"Error fetching inventory: {str(e)}"

def get_all_products(input_text: str = "") -> str:
    """Get list of all products in the inventory with their details."""
    try:
        response = requests.get("https://inventory-pro-self.vercel.app/api/Products")
        if response.status_code == 200:
            data = response.json()
            products = data.get('Products_table', [])
            
            if not products:
                return "No products found in inventory"
            
            product_list = []
            for p in products[:10]:
                product_list.append(
                    f"- {p.get('name', 'Unknown')} (SKU: {p.get('sku', 'N/A')}): "
                    f"Qty: {p.get('quantity', 0)}, Price: ${p.get('selling_price', 0)}, "
                    f"Status: {p.get('Status', 'unknown')}"
                )
            
            result = "Current Products:\n" + "\n".join(product_list)
            if len(products) > 10:
                result += f"\n... and {len(products) - 10} more products"
            return result
        return "Failed to fetch products"
    except Exception as e:
        return f"Error fetching products: {str(e)}"

def get_low_stock_items(input_text: str = "") -> str:
    """Get list of items that are running low on stock and need restocking."""
    try:
        response = requests.get("https://inventory-pro-self.vercel.app/api/LowStock")
        if response.status_code == 200:
            data = response.json()
            low_stock = data.get('Low_Stock_items', [])
            
            if not low_stock:
                return "No low stock items - all products are well stocked!"
            
            items = []
            for item in low_stock:
                items.append(
                    f"- {item.get('name', 'Unknown')}: "
                    f"Current: {item.get('quantity', 0)} units, "
                    f"Threshold: {item.get('threshold', 0)} units"
                )
            return "⚠️ Low Stock Alert:\n" + "\n".join(items)
        return "Failed to fetch low stock items"
    except Exception as e:
        return f"Error fetching low stock items: {str(e)}"

def get_dashboard_stats(input_text: str = "") -> str:
    """Get dashboard statistics including total products, sales, and active users."""
    try:
        response = requests.get("https://inventory-pro-self.vercel.app/api/Dashboard")
        if response.status_code == 200:
            data = response.json()
            return f"""
Dashboard Statistics:
- Total Products: {data.get('total_products', 0)}
- Active Users: {data.get('n_active_users', 0)}
- Today's Sales Total: ${data.get('today_sell_total', 0)}
- In Stock Items: {data.get('n_in_stock_items', 0)}
- Low Stock Items: {data.get('n_low_stock_items', 0)}
- Out of Stock Items: {data.get('get_n_out_of_stock_items', 0)}
"""
        return "Failed to fetch dashboard data"
    except Exception as e:
        return f"Error fetching dashboard: {str(e)}"

def get_recent_transactions(input_text: str = "") -> str:
    """Get recent transaction history including sales and purchases."""
    try:
        response = requests.get("https://inventory-pro-self.vercel.app/api/Transactions")
        if response.status_code == 200:
            data = response.json()
            transactions = data.get('Transactions_table', [])
            
            if not transactions:
                return "No recent transactions found"
            
            recent = transactions[-5:] if len(transactions) > 5 else transactions
            trans_list = []
            for t in recent:
                trans_list.append(
                    f"- {t.get('type', 'unknown').upper()}: {t.get('item_name', 'Unknown')} "
                    f"× {t.get('quantity', 0)} units @ ${t.get('unit_price', 0)} "
                    f"(Total: ${t.get('total_price', 0)})"
                )
            return "Recent Transactions:\n" + "\n".join(trans_list)
        return "Failed to fetch transactions"
    except Exception as e:
        return f"Error fetching transactions: {str(e)}"

def search_knowledge_base(query: str = "") -> str:
    """
    Search the enterprise knowledge base (Dummy implementation for Phase B).
    """
    mock_knowledge = {
        "restock policy": "Restocking is done on Friday mornings. Priority goes to electronics.",
        "return policy": "Items can be returned within 30 days if unopened with original receipt.",
        "supplier contact": "Our main supplier for electronics is TechDist (contact@techdist.com)."
    }
    
    query_lower = query.lower()
    for key, info in mock_knowledge.items():
        if key in query_lower:
            return f"Knowledge Base Result for '{query}': {info}"
    
    return f"Knowledge Base Result for '{query}': No specific knowledge found in the manual base."

def place_order(input_text: str = "") -> str:
    """
    Places an order for one or multiple items. Requires input in the format: 'Quantity x ItemName, Quantity x ItemName'.
    """
    print(f"\n[SYSTEM: Attempting real POST request to place order for {input_text}...]")
    try:
        items = [i.strip() for i in input_text.split(',')]
        names = []
        qtys = []
        
        for item_str in items:
            parts = item_str.split(' x ', 1)
            if len(parts) != 2:
                # If they used something like "5 keyboards", try to catch it gracefully
                return f"Failed on '{item_str}': Input MUST be in format 'Quantity x ItemName' (e.g., '5 x Keyboard')."
                
            qtys.append(int(parts[0].strip()))
            names.append(parts[1].strip())
        
        payload = {
            "item_name": names,
            "type": "purchase",
            "quantity": qtys,
            "remarks": "Automated order placed via AI Agent",
            "name": "AI System",
            "Status": "Pending"
        }
        
        response = requests.post("https://inventory-pro-self.vercel.app/api/Transactions", json=payload)
        
        if response.status_code == 200:
            return f"Successfully placed order for {len(names)} items: {', '.join(names)}. Database transaction completed."
        else:
            return f"API Error {response.status_code} while placing order: {response.text}"
            
    except Exception as e:
        return f"Failed to place order due to system error: {str(e)}"

# Tools that require explicit human confirmation before executing
RESTRICTED_TOOLS = ["place_order"]

# Dictionary to map tool names to actual python functions
TOOLS_REGISTRY = {
    "get_inventory_summary": get_inventory_summary,
    "get_all_products": get_all_products,
    "get_low_stock_items": get_low_stock_items,
    "get_dashboard_stats": get_dashboard_stats,
    "get_recent_transactions": get_recent_transactions,
    "search_knowledge_base": search_knowledge_base,
    "place_order": place_order
}

TOOLS_DESCRIPTION = """
- get_inventory_summary: Get a summary of current inventory status including total products, low stock items. No input needed.
- get_all_products: Get list of all products in the inventory with their details. No input needed.
- get_low_stock_items: Get list of items that are running low on stock and need restocking. No input needed.
- get_dashboard_stats: Get dashboard statistics including total products, sales, and active users. No input needed.
- get_recent_transactions: Get recent transaction history including sales and purchases. No input needed.
- search_knowledge_base: Search enterprise policies and supplier info. Requires an input query (e.g. "return policy").
- place_order: Place a purchase order. Input MUST be 'Quantity x ItemName' separated by commas for multiple items (e.g., '10 x Wood Planks, 5 x Nails').
"""

# ============================================================================
# AGENT INITIALIZATION & MANUAL REACT LOOP WITH HITL
# ============================================================================

SYSTEM_PROMPT = """You are an intelligent inventory management assistant for InventoryPro.

You must answer the user's request by deciding which tools to use.
You have access to the following tools:
{tools_description}

You MUST use the following exact format for your responses:
Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action (leave blank if none needed)
Observation: the result of the action (provided by the system)
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!
"""

class InventoryAgent:
    def __init__(self):
        self.ollama_url = "http://localhost:11434/api/generate"
        self.model = "gemma4:e4b" 
        self.chat_history = []
        self.max_iterations = 7
        
        # State tracking for STM (Short Term Memory) & Human-in-the-Loop
        self.pending_action: Optional[Dict[str, str]] = None
        
        self.tool_names = ", ".join(TOOLS_REGISTRY.keys())
        self.base_prompt = SYSTEM_PROMPT.replace("{tools_description}", TOOLS_DESCRIPTION).replace("{tool_names}", self.tool_names)
        
    def _call_ollama(self, prompt: str) -> str:
        """Raw HTTP call to Ollama generate API"""
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "temperature": 0.0,
            "stop": ["Observation:"]
        }
        try:
            response = requests.post(self.ollama_url, json=payload)
            if response.status_code == 200:
                return response.json().get("response", "")
            return f"Error: Ollama API returned status {response.status_code}"
        except Exception as e:
            return f"Error: Could not connect to Ollama at {self.ollama_url}. Exception: {str(e)}"
            
    def _parse_output(self, text: str):
        """Regex parser to extract Action, Action Input, and Final Answer."""
        action_idx = text.find("Action:")
        final_idx = text.find("Final Answer:")
        
        # Prioritize Action if both exist and Action comes first
        if action_idx != -1 and (final_idx == -1 or action_idx < final_idx):
            action_match = re.search(r"Action:\s*(.*?)\n", text[action_idx:], re.DOTALL)
            action_input_match = re.search(r"Action Input:\s*(.*?)(?:\n|$)", text[action_idx:], re.DOTALL)
            
            if action_match:
                action = action_match.group(1).strip()
                action_input = action_input_match.group(1).strip() if action_input_match else ""
                
                # Chop hallucinated observations
                if "Observation:" in action_input:
                    action_input = action_input.split("Observation:")[0].strip()
                    
                return {"type": "action", "action": action, "action_input": action_input}
                
        if final_idx != -1:
            final_answer_match = re.search(r"Final Answer:(.*)", text[final_idx:], re.DOTALL)
            if final_answer_match:
                return {"type": "finish", "output": final_answer_match.group(1).strip()}
            
        return {"type": "error", "message": "Could not parse output format. Please use 'Action: [tool]' or 'Final Answer: [answer]'."}

    def _execute_loop(self, current_prompt: str, user_input: str) -> str:
        """The main ReAct reasoning loop"""
        for i in range(self.max_iterations):
            print(f"Iteration {i+1}...")
            
            # 1. Ask LLM to reason and act
            llm_response = self._call_ollama(current_prompt)
            
            # Chop hallucinated observations if the Ollama stop token fails
            if "Observation:" in llm_response:
                llm_response = llm_response.split("Observation:")[0]
                
            current_prompt += llm_response 
            print(f"LLM OUTPUT:\n{llm_response}")
            
            # 2. Parse what the LLM wants to do
            parsed = self._parse_output(llm_response)
            
            if parsed["type"] == "finish":
                final_text = parsed["output"]
                self.chat_history.append((user_input, final_text))
                return final_text
                
            elif parsed["type"] == "action":
                tool_name = parsed["action"]
                tool_input = parsed["action_input"]
                
                # HITL Check: If it's a restricted tool, pause execution!
                if tool_name in RESTRICTED_TOOLS:
                    print(f"-> PAUSING FOR USER CONFIRMATION: {tool_name}")
                    # Save state
                    self.pending_action = {
                        "tool": tool_name,
                        "input": tool_input,
                        "prompt_state": current_prompt,
                        "original_question": user_input
                    }
                    confirmation_message = f"⚠️ CONFIRMATION REQUIRED: I am about to execute '{tool_name}' with the following details: '{tool_input}'.\n\nDo you approve this action? (Please reply 'Yes' to approve, or 'No' to cancel)."
                    self.chat_history.append((user_input, confirmation_message))
                    return confirmation_message
                
                # Normal Tool Execution
                if tool_name in TOOLS_REGISTRY:
                    print(f"-> Executing Tool: {tool_name} with input: '{tool_input}'")
                    try:
                        observation = TOOLS_REGISTRY[tool_name](tool_input)
                    except Exception as e:
                        observation = f"Error executing tool {tool_name}: {str(e)}"
                else:
                    observation = f"{tool_name} is not a valid tool, try one of [{self.tool_names}]."
                    
                print(f"-> Observation: {observation[:100]}...\n")
                current_prompt += f"\nObservation: {observation}\nThought: "
                
            elif parsed["type"] == "error":
                print("-> Hallucination/Format Error encountered.")
                current_prompt += f"\nObservation: {parsed['message']}\nThought: "

        return "I'm sorry, I couldn't find the answer within the allowed steps."

    def chat(self, user_input: str) -> str:
        try:
            # INTERCEPT STATE: Check if we are waiting for human confirmation
            if self.pending_action:
                pending_tool = self.pending_action["tool"]
                pending_input = self.pending_action["input"]
                saved_prompt = self.pending_action["prompt_state"]
                original_question = self.pending_action["original_question"]
                
                user_intent = user_input.lower().strip()
                if user_intent in ["yes", "y", "approve", "confirm"]:
                    print(f"-> User Approved Execution of {pending_tool}")
                    try:
                        observation = TOOLS_REGISTRY[pending_tool](pending_input)
                    except Exception as e:
                        observation = f"Error executing {pending_tool}: {str(e)}"
                else:
                    print(f"-> User Cancelled Execution of {pending_tool}")
                    observation = f"The user declined to confirm the execution of {pending_tool}."
                
                # Inject the result back into the saved state and clear pending action
                self.pending_action = None
                saved_prompt += f"\nObservation: {observation}\nThought: "
                
                print("--- RESUMING REACT LOOP AFTER CONFIRMATION ---")
                return self._execute_loop(saved_prompt, original_question)
            
            # Normal Flow
            history_str = "\n".join([f"User: {u}\nAgent: {a}" for u, a in self.chat_history[-5:]])
            current_prompt = self.base_prompt + f"\nChat History:\n{history_str}\n\nQuestion: {user_input}\n"
            
            print(f"--- STARTING REACT LOOP FOR: '{user_input}' ---")
            return self._execute_loop(current_prompt, user_input)

        except Exception as e:
            return f"I encountered a critical error: {str(e)}"
            
    def reset_conversation(self):
        self.chat_history = []
        self.pending_action = None

# ============================================================================
# CLI TESTING
# ============================================================================

if __name__ == "__main__":
    print("🤖 InventoryPro AI Agent - Manual ReAct Loop with HITL")
    agent = InventoryAgent()
    
    while True:
        try:
            user_input = input("\n👤 You: ").strip()
            if user_input.lower() in ['quit', 'exit', 'bye']: break
            if user_input.lower() == 'reset':
                agent.reset_conversation()
                print("Conversation reset.")
                continue
                
            print("\n🤖 Agent processing...")
            response = agent.chat(user_input)
            print(f"\n✅ Final Response: {response}")
        except KeyboardInterrupt:
            break