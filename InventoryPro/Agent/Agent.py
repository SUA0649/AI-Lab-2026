"""
InventoryPro AI Agent - LangChain Integration
Uses the modern LangChain v0.3+ stack with native Ollama tool calling.
"""

import os
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv
import requests

# Modern LangChain Imports
from langchain_ollama import ChatOllama
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool

# Load environment variables
load_dotenv()

# ============================================================================
# TOOL DEFINITIONS (Claude's original logic)
# ============================================================================

@tool
def get_inventory_summary() -> str:
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

@tool
def get_all_products() -> str:
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

@tool
def get_low_stock_items() -> str:
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

@tool
def get_dashboard_stats() -> str:
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

@tool
def get_recent_transactions() -> str:
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

# ============================================================================
# AGENT INITIALIZATION
# ============================================================================

class InventoryAgent:
    def __init__(self):
        # 1. Initialize the modern Ollama client
        # Note: We do NOT need format="json" anymore. 
        # Modern Ollama handles tool calling natively!
        self.llm = ChatOllama(
            model="gemma4:e4b", # or "llama3"
            temperature=0,
        )
        
        self.tools = [
            get_inventory_summary,
            get_all_products,
            get_low_stock_items,
            get_dashboard_stats,
            get_recent_transactions
        ]
        
        # 2. Claude's exact prompt structure
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an intelligent inventory management assistant for InventoryPro.
            
Your role is to help users understand and manage their inventory by:
1. Answering questions about current stock levels
2. Identifying low stock items that need restocking
3. Providing sales and transaction insights

Always be helpful, professional, and provide actionable insights. When you use a tool, explain what information you're retrieving.
"""),
            MessagesPlaceholder(variable_name="chat_history", optional=True),
            ("human", "{input}"),
            # The agent_scratchpad is where LangChain stores the tool outputs during the loop
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        # 3. Create the agent using the modern method
        agent = create_tool_calling_agent(self.llm, self.tools, self.prompt)
        
        self.agent_executor = AgentExecutor(
            agent=agent,
            tools=self.tools,
            verbose=True, # Leave this True so you can watch its "thoughts" in the terminal!
            handle_parsing_errors=True,
            max_iterations=5
        )
        
        self.chat_history = []
    
    def chat(self, user_input: str) -> str:
        try:
            # Invoke LangChain's built-in executor
            response = self.agent_executor.invoke({
                "input": user_input,
                "chat_history": self.chat_history
            })
            
            output = response.get("output", "I apologize, but I couldn't process that request.")
            
            # Update memory
            self.chat_history.append(("human", user_input))
            self.chat_history.append(("assistant", output))
            
            if len(self.chat_history) > 20:
                self.chat_history = self.chat_history[-20:]
            
            return output
            
        except Exception as e:
            return f"I encountered an error while processing your request: {str(e)}"
    
    def reset_conversation(self):
        self.chat_history = []

# ============================================================================
# CLI TESTING
# ============================================================================

if __name__ == "__main__":
    print("🤖 InventoryPro AI Agent - LangChain Modern Interface")
    agent = InventoryAgent()
    
    while True:
        user_input = input("\n👤 You: ").strip()
        if user_input.lower() in ['quit', 'exit', 'bye']: break
        if user_input.lower() == 'reset':
            agent.reset_conversation()
            continue
            
        print("\n🤖 Agent processing...")
        response = agent.chat(user_input)
        print(f"\n✅ Final Response: {response}")