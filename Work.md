# Implementation Plan: Groq Integration & SQL Agent Fallback

## Objective
1. **Primary LLM Upgrade:** Switch the main `InventoryAgent` to use the `ChatGroq` API for much faster and smarter reasoning, while retaining the local `ChatOllama` (`gemma4`) as an automatic fallback in case of API failure or rate limiting.
2. **SQL Agent as a Tool:** Integrate the existing `sql_agent.py` as a callable `@tool` within the main agent. This acts as a powerful fallback when the standard REST API tools (`get_all_products`, etc.) do not expose the specific data a user is asking for.

## Phase 1: LLM Fallback Architecture
We will update `InventoryPro/Agent/Agent.py` to utilize LangChain's native `.with_fallbacks()` mechanism.
- We will attempt to initialize `ChatGroq` using the `GROQ_API_KEY` from the `.env` file.
- We will configure `ChatOllama(model="gemma4:e4b")` as the fallback. 
- If Groq fails at runtime (e.g., network error or token limit), LangChain will seamlessly route the prompt to the local Ollama instance without crashing the application.

## Phase 2: SQL Agent Integration
We will integrate the logic from `InventoryPro/Agent/sql_agent.py` into `Agent.py`.
- **Initialization:** Inside the `InventoryAgent.__init__` method, we will initialize the PostgreSQL `SQLDatabase` wrapper and compile the SQL agent (`build_agent`). We will pass our new Groq-with-Ollama-fallback LLM into the SQL agent so both agents share the same brain.
- **Tool Creation:** We will create a `query_database_fallback` tool using `StructuredTool.from_function`.
- **System Prompting:** We will explicitly instruct the main agent in its `SYSTEM_PROMPT` to prioritize the fast REST API tools (like `get_inventory_summary`) and *only* use the `query_database_fallback` tool if the API tools cannot satisfy the user's request (e.g., "What is the average price of products added last year?").

## Implementation Details
### Target File: `InventoryPro/Agent/Agent.py`
1. Import `ChatGroq` from `langchain_groq`.
2. Import `get_db`, `build_agent`, and `ask` from `.sql_agent`.
3. Refactor `__init__` to build the LLM with fallbacks.
4. Refactor `__init__` to instantiate the SQL Agent and append it to `self.tools` as a `StructuredTool`.
5. Update the `SYSTEM_PROMPT` to instruct the agent on when to use the SQL fallback.

## Testing
1. Run `python3 app.py` and test a standard API query (e.g., "what is our total stock value?").
2. Test an analytical query that requires SQL (e.g., "Group our products by category and tell me the total quantity of each").
3. Verify the AI cleanly routes to the `sql_agent` tool.
