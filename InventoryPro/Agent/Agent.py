"""
InventoryPro AI Agent - LangChain Integration
Uses ChatGroq (primary) with ChatOllama fallback via .with_fallbacks().
Includes Prompt-Based Human-in-the-Loop for database automation.
Includes SQL Agent as a tool for complex analytical queries.
"""

import os
import requests
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv
from .Semantic_Retrieval import retrieve_relevant_docs
# Modern LangChain Imports
#from langchain_ollama import ChatOllama
from langchain_groq import ChatGroq
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool
from .SQL_Retrieval import get_database_connection, build_sub_agent, ask
import traceback as tb

# Load environment variables
load_dotenv()

# TOOL DEFINITIONS

@tool
def get_inventory_summary() -> str:
    """Get a summary of current inventory status including Total Stock Value, Active Items, low stock items, and out of stock items."""
    try:
        response = requests.get("http://127.0.0.1:5006/api/Inventory")
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
        tb.print_exc()
        return f"Error fetching inventory: {str(e)}"

@tool
def get_all_products() -> str:
    """Get list of all products in the inventory with their details."""
    try:
        response = requests.get("http://127.0.0.1:5006/api/Products")
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
                    f"Status: {p.get('Status', p.get('status', 'unknown'))}"
                )
            
            result = "Current Products:\n" + "\n".join(product_list)
            if len(products) > 10:
                result += f"\n... and {len(products) - 10} more products"
            return result
        return "Failed to fetch products"
    except Exception as e:
        tb.print_exc()
        return f"Error fetching products: {str(e)}"

@tool
def get_low_stock_items() -> str:
    """Get list of items that are running low on stock and need restocking."""
    try:
        response = requests.get("http://127.0.0.1:5006/api/LowStock")
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
        tb.print_exc()
        return f"Error fetching low stock items: {str(e)}"

@tool
def get_dashboard_stats() -> str:
    """Get dashboard statistics including total products, Today's Sales Total, Low Stock Items, Out of Stock Items, and active users."""
    try:
        response = requests.get("http://127.0.0.1:5006/api/Dashboard")
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
        tb.print_exc()
        return f"Error fetching dashboard: {str(e)}"

@tool
def get_recent_transactions() -> str:
    """Get recent transaction history including sales and purchases."""
    try:
        response = requests.get("http://127.0.0.1:5006/api/Transactions")
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
        tb.print_exc()
        return f"Error fetching transactions: {str(e)}"

@tool
def search_knowledge_base(query: str) -> str:
    """
    Search the enterprise knowledge base. Requires a query string.
    """
    mock_knowledge = {
        "return policy": "Items can be returned within 30 days if unopened with original receipt."
    }
    
    query_lower = query.lower()
    for key, info in mock_knowledge.items():
        if key in query_lower:
            return f"Knowledge Base Result for '{query}': {info}"
    
    return f"Knowledge Base Result for '{query}': No specific knowledge found."

@tool
def record_transaction(transaction_type: str, input_text: str) -> str:
    """
    Records an inventory transaction (e.g., placing a purchase order or recording a sale).
    - transaction_type MUST be either 'purchase' or 'sale'.
    - input_text MUST be a comma-separated list of 'Quantity x ItemName'.
    Example: transaction_type="sale", input_text="10 x Wood Planks, 5 x Nails"
    """
    print(f"\n[SYSTEM: Attempting POST request to record {transaction_type} for {input_text}...]")
    try:
        if transaction_type.lower() not in ['purchase', 'sale']:
            return "Failed: transaction_type must be 'purchase' or 'sale'."
            
        items = [i.strip() for i in input_text.split(',')]
        names = []
        qtys = []
        
        for item_str in items:
            parts = item_str.split(' x ', 1)
            if len(parts) != 2:
                return f"Failed on '{item_str}': Input MUST be in format 'Quantity x ItemName'."
                
            qtys.append(int(parts[0].strip()))
            names.append(parts[1].strip())
        
        db_type = 'Buy' if transaction_type.lower() == 'purchase' else 'Sell'
        
        payload = {
            "item_name": names,
            "type": db_type,
            "quantity": qtys,
            "remarks": f"Automated {transaction_type} recorded via AI Agent",
            "name": "AI System",
            "Status": "Pending" if db_type == 'Buy' else "Completed"
        }
        
        response = requests.post("http://127.0.0.1:5006/api/Transactions", json=payload)
        
        if response.status_code == 200:
            return f"Successfully recorded {transaction_type} for {len(names)} items: {', '.join(names)}."
        else:
            return f"API Error {response.status_code} while recording transaction: {response.text}"
            
    except Exception as e:
        tb.print_exc()
        return f"Failed to record transaction due to system error: {str(e)}"

@tool
def query_vector_database(query: str) -> str:
    """
    Vector database contains embeddings of all product descriptions and transaction records.
    For user queries that require semantic understanding (e.g., "Which products are similar to 'Wood Planks'?" or "Find transactions related to 'Nails'"), 
    this tool performs a semantic search against the vector database.
    """
    try:
        IR_results = retrieve_relevant_docs(query)
        if not IR_results:
            return f"Vector database result for '{query}': No specific knowledge found."
        formatted_results = "\n".join([f"- {doc} (Score: {score:.2f})" for doc, score in IR_results])
        return f"Vector database results for '{query}':\n{formatted_results}"
    except Exception as e:
        tb.print_exc()
        return f"Error querying vector database: {str(e)}"


_global_llm, DATABASE_CONNECTION = None, None


def _init_database():
    global DATABASE_CONNECTION
    if DATABASE_CONNECTION is None:
        try:
            DATABASE_CONNECTION = get_database_connection()
            if DATABASE_CONNECTION: print("✅ Database connection initialized")
            else: print("⚠️ Database connection failed")
        except Exception as e:
            tb.print_exc()
            print(f"⚠️ Database initialization error: {e}")

_sql_agent = None
_sql_agent_init_attempted = False

def _get_sql_agent():
    global _sql_agent, _sql_agent_init_attempted, DATABASE_CONNECTION, _global_llm
    if _sql_agent_init_attempted: return _sql_agent
    _sql_agent_init_attempted = True
    try:
        _init_database()
        if not DATABASE_CONNECTION:
            print("⚠️ SQL Agent: Database connection unavailable")
            return None
        
        if not _global_llm:
            print("⚠️ SQL Agent: LLM not initialized")
            return None
            
        _sql_agent = build_sub_agent(_global_llm, DATABASE_CONNECTION)
        
        if _sql_agent: print("✅ SQL Agent initialized successfully")
        else: print("⚠️ SQL Agent initialization returned None")
            
    except Exception as e:
        tb.print_exc()
        print(f"⚠️ SQL Agent initialization error: {e}")
    
    return _sql_agent


@tool
def query_database(question: str) -> str:
    """Query the SQL database directly using natural language.
    Use this tool ONLY for complex analytical queries that the other REST API tools cannot answer.
    Examples: aggregations, averages, date-range filtering, GROUP BY, JOINs, or comparisons.
    Do NOT use this for simple inventory lookups — use get_all_products or get_inventory_summary instead.
    """
    sql_agent = _get_sql_agent()
    
    if not sql_agent: return "⚠️ Database query tool is currently unavailable (initialization failed)."
    
    try:
        return ask(sql_agent, question)
    except Exception as e:
        tb.print_exc()
        return f"⚠️ Could not process analytical query — the cloud LLM is currently unavailable. Please try again later or use the standard inventory tools. (Error: {type(e).__name__})"


# ============================================================================
# AGENT INITIALIZATION
# ============================================================================

class InventoryAgent:
    def __init__(self):
        try:
            global _global_llm
            # Phase 1: Groq (primary) with Ollama (fallback)
            groq_api_key = os.getenv("GROQ_API_KEY")
            
            if not groq_api_key: raise Exception("GROQ_API_KEY not found")

            self.llm = ChatGroq(
                api_key=groq_api_key,
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                temperature=0,
            )
            
            _global_llm = self.llm  # Store in global for SQL agent access
            
            '''ollama_llm = ChatOllama(
                model="gemma4:e4b",
                temperature=0,
            )
            # Groq is primary; Ollama is the automatic fallback
            #.with_fallbacks([ollama_llm])
            #print("🧠 LLM: Groq (primary) → Ollama/gemma4 (fallback)")
            # No Groq key — use Ollama directly
            self.llm = ChatOllama(
                model="gemma4:e4b",
                temperature=0,
            )
            print("🧠 LLM: Ollama/gemma4 only (no GROQ_API_KEY found)")'''
        
        # Phase 2: Register all tools including the SQL agent fallback
            self.tools = [
                get_inventory_summary,
                get_all_products,
                get_low_stock_items,
                get_dashboard_stats,
                get_recent_transactions,
                search_knowledge_base,
                query_database,
                query_vector_database,
            ]
        
        # Phase 3: System prompt with explicit tool priority
            self.prompt = ChatPromptTemplate.from_messages([
                ("system", """
                 
*** ABOUT INVENTORYPRO AI-ASSISTANT ***
You are an AI-Assistant integrated in Inventory Management System, named as InventoryPro.
Your role is just to help users understand and manage their inventory.
You have tools to view stock, check low stock, read the knowledge base, place orders, and run analytical database queries.

*** HIGHLY CRITICAL INSTRUCTIONS ***
1. ALWAYS prefer these REST API tools FIRST — they are fast and reliable:
   - get_inventory_summary: stock value, active items, low/out-of-stock counts
   - get_all_products: list of products with details (name, SKU, qty, price, status)
   - get_low_stock_items: items below their restock threshold
   - get_dashboard_stats: dashboard overview (total products, sales, users)
   - get_recent_transactions: last 5 transactions
   - search_knowledge_base: enterprise policies

2. ONLY use `query_database` when the user needs something the above tools CANNOT provide:
   - Aggregations: "What is the average price per category?"
   - Grouping: "Group products by category with total quantity"
   - Date filtering: "Which products were added in the last 7 days?"
   - Complex comparisons: "Top 5 most expensive products" or "products with quantity above 100"
   - Any question requiring SQL-level analysis

3. For semantic queries (e.g., "Find products similar to 'Wood Planks'"), use `query_vector_database` instead of `query_database`.
   - This tool is optimized for semantic search and will provide more relevant results for these types of questions.

4. NEVER use `query_database` for questions the REST tools can answer.
"""),
                MessagesPlaceholder(variable_name="chat_history", optional=True),
                ("human", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad")
            ])
        
            agent = create_tool_calling_agent(self.llm, self.tools, self.prompt)
        
            self.agent_executor = AgentExecutor(
                agent=agent,
                tools=self.tools,
                verbose=True,
                handle_parsing_errors=True,
                max_iterations=5
            )
        
            self.chat_history = []

        except Exception as e:
            print(f"❌ Failed to initialize InventoryAgent: {str(e)}")
            self.agent_executor = None
            self.chat_history = []

    
    def chat(self, user_input: str) -> str:
        
        if self.agent_executor is None:
            return "❌ System Error: Agent is not initialized. Please check your configuration and try again."
        
        try:
            response = self.agent_executor.invoke({
                "input": user_input,
                "chat_history": self.chat_history
            })
            
            output = response.get("output", "I apologize, but I couldn't process that request.")
            
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
    print("🤖 InventoryPro AI Agent - LangChain Framework")
    agent = InventoryAgent()
    
    while True:
        user_input = input("\n👤 You: ").strip()
        if user_input.lower() in ['quit', 'exit', 'bye']: break
        if user_input.lower() == 'reset':
            agent.reset_conversation()
            print("Conversation reset.")
            continue
            
        print("\n🤖 Agent processing...")
        response = agent.chat(user_input)
        print(f"\n✅ Final Response: {response}")
        