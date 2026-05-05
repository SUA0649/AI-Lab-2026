"""
Key design decisions
--------------------
* SQLDatabase.from_uri()  →  constructs the LangChain DB wrapper
* SQLDatabaseToolkit      →  provides the four standard LangChain SQL tools (list_tables, schema, query, query_checker) that the agent can call.
* vector_search tool      →  empty stub; fill in once embeddings are ready.
* Safety guard            →  is_safe_query() is wired into the custom sql_query_with_safety tool so DML/DDL statements are blocked or sent for HITL approval before they reach the database.
"""

import os
import sqlparse
from dotenv import load_dotenv
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import SQLDatabaseToolkit
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import StructuredTool
from langchain_groq import ChatGroq



load_dotenv()


# DATABASE CONNECTION: Return a LangChain SQLDatabase wrapper for the InventoryPro PostgreSQL DB.
def get_db() -> SQLDatabase:
    try:
        user     = os.getenv("DB_USER",     "postgres")
        password = os.getenv("DB_PASSWORD", "")
        host     = os.getenv("DB_HOST",     "localhost")
        port     = os.getenv("DB_PORT",     "5432")
        dbname   = os.getenv("DB_NAME",     "postgres")
    
        uri = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"
        db = SQLDatabase.from_uri(uri, sample_rows_in_table_info = 5)
        print(f"Connected to PostgreSQL — dialect: {db.dialect}")
        return db

    except Exception as e:
        print(f"Error connecting to PostgreSQL: {e}")
        return None


def get_llm() -> ChatGroq:
    
    try:    
        api_key = os.getenv("GROQ_API_KEY_2")
        if not api_key: raise ValueError("GROQ_API_KEY_2 is not set. Add it to your .env file.")

        llm = ChatGroq(
            api_key=api_key,
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0.0,
            max_tokens=1024
        )
        print("LLM Initialized")
        return llm
    
    except Exception as e:
        print(f"Error initializing Groq LLM: {e}")
        return None


def is_safe_query(sql_query: str) -> tuple[bool, str]:

    try:
        if not sqlparse.parse(sql_query): return False, "Error! Invalid SQL syntax"

        query_upper = sql_query.upper().strip()
        
        for keyword in ["DELETE", "UPDATE"]:
            if keyword in query_upper and "WHERE" not in query_upper: return False, f"{keyword} requires WHERE clause for safety"
        for keyword in ["DROP", "TRUNCATE", "ALTER", "CREATE"]:
            if keyword in query_upper: return False, f"{keyword} operations require manual approval (HITL)"

        print(f"query_upper.startswith('SELECT'): {query_upper.startswith('SELECT')}, query_upper: {query_upper}")
        if query_upper.startswith("SELECT"): return True, "Safe query"

        return False, "Generated query is invalid or potentially unsafe. Only SELECT statements are allowed for auto-execution. Please revise the query."
    
    except Exception as e:
        return False, f"Error during SQL query safety check: {e}"


def vector_search(query: str) -> str:
    try:
        """
        Perform a semantic/vector similarity search against the PostgreSQL database.
        TODO: implement once pgvector embeddings are added to the database.
            Expected behaviour:
                1. Embed `query` with the same embedding model used during ingestion.
                2. Run a cosine-similarity query against the vector column.
                3. Return the top-k matching rows as a formatted string.
        Parameters -->   query : str ==>  The natural-language search query from the user.
        Returns -->  str ==>  Matching results, or a fallback message.
        """
        # --- Code ---
        return (
            "⚠️ Vector search is not yet available. "
            "The database has no vector embeddings yet. "
            "Please use the standard SQL query tools for now."
        )
    except Exception as e:
        return f"Error during vector search: {e}"


# CUSTOM SAFE-QUERY TOOL

def build_safe_query_tool(db: SQLDatabase) -> StructuredTool:

    try:
        def safe_execute(sql: str) -> str:
            sql = sql.strip().strip(";")
            is_safe, message = is_safe_query(sql)

            if not is_safe: return (
                    f"Query blocked by safety guard: {message}\n"
                    "Only SELECT statements are auto-executed."
                    "For write operations please request human approval."
            )

            try:
                result = db.run(sql)
                return result if result else "Query returned no results."
            
            except Exception as exc:
                return f"SQL execution error: {exc}"

        return StructuredTool.from_function(
            name="sql_db_safe_query", func=safe_execute,
            description=(
                "Execute only syntactically correct SELECT SQL query for the PostgreSQL database and return the results."
                "Input must be a valid SQL query string."
                "DML/DDL statements (INSERT, UPDATE, DELETE, DROP, ALTER, CREATE) are blocked for safety."
                "Use this tool to retrieve data from the database of Inventory Management System, named as InventoryPro."
            ),
        )
        
    except Exception as e:
        print(f"Error building safe query tool: {e}")
        return None


# AGENT SYSTEM PROMPT 
SYSTEM_PROMPT = """\
You are an agent designed to interact with a PostgreSQL SQL database for InventoryPro, \
an inventory management system developed for managing inventory for distributors and retailers. \
Given an input question, create a syntactically correct {dialect} query to run, \
then ALWAYS execute it using the available tools and return the actual results to the user.

QUERY PERMISSIONS — read carefully:
- All SELECT statements are allowed.
- Statements of INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, MERGE, \
UPSERT, or any DDL/DML are not allowed. Refuse them and explain you are read-only.

QUERY GUIDELINES:
- Add LIMIT {top_k} to your query if the user did not specify any limit.
- Prefer those columns in query that are relevant to the question.
- Always double-check your query before executing. If execution fails, rewrite and retry.

MANDATORY STEPS — never skip:
1. First, retrieve all available tables in the database.
2. Query the schema of the most relevant tables.
3. Construct and EXECUTE the SELECT query.
4. Return the actual query results to the user.
"""

# BUILD AGENT

def build_agent(db: SQLDatabase, llm):
    """
    Assemble the LangChain SQL agent using LangGraph's create_react_agent.
    Tool set
    --------
    - Standard SQLDatabaseToolkit tools (list_tables, schema, query_checker)
      minus the default query tool which is replaced by our safety-guarded one.
    - sql_db_safe_query  — safe SELECT-only execution wrapper (see above)
    - vector_search      — semantic search stub (empty until embeddings ready)

    Returns
    -------
    A compiled LangGraph agent. Invoke with:
        agent.invoke({"messages": [{"role": "user", "content": question}]})
    """
    try: 
        # Standard LangChain SQL tools (schema inspection, query validation)
        standard_tools = SQLDatabaseToolkit(db=db, llm=llm).get_tools()

        # Drop the default unchecked query tool; replace with our safe version
        filtered_tools = [t for t in standard_tools if t.name != "sql_db_query"]

        # Our safety-checked execution tool
        safe_query_tool = build_safe_query_tool(db)

        # Vector search stub
        vector_tool = StructuredTool.from_function(
            name="vector_search",
            func=vector_search,
            description=(
                "Search the database using semantic / vector similarity. "
                "Use this when the user asks for 'similar', 'related', or 'semantically matching' items. "
                "Input: a natural-language description of what to search for."
            ),
        )

        all_tools = filtered_tools + [safe_query_tool, vector_tool]
        
        print(f"Tools registered: {[t.name for t in all_tools]}")

        # create_react_agent (LangGraph) — builds a compiled agent graph
        # system_prompt is injected as a plain string; dialect/top_k are our substitutions

        return create_react_agent(llm, all_tools, prompt=SYSTEM_PROMPT.format(dialect=db.dialect, top_k=10))
    
    except Exception as e:
        print(f"Error building agent: {e}")
        return None


# HELPER: ask()

def ask(agent, question: str) -> str:
    """
    Ask the agent a natural-language question about the InventoryPro database.
    Parameters
    agent : The compiled agent returned by create_agent.
    question (str):A natural-language question.
    Returns (str): The agent's final answer.
    """
    try:
        result = agent.invoke({"messages": [{"role": "user", "content": question}]})
        return result["messages"][-1].content

    except Exception as e:
        return f"Sorry, I encountered an error while processing your request."

# LANGSMITH TRACING HELPER (Optional): For troubleshooting and verifying that LangSmith tracing is set up correctly.
'''
def check_langsmith_config() -> None:
    """Print LangSmith tracing configuration status."""
    print("\nLangSmith Configuration:")
    print(f"  Tracing Enabled : {os.getenv('LANGCHAIN_TRACING_V2', 'false')}")
    print(f"  API Key         : {'[Set]' if os.getenv('LANGCHAIN_API_KEY') else '[Not Set]'}")
    print(f"  Project         : {os.getenv('LANGCHAIN_PROJECT', 'default')}")
    print(f"  Endpoint        : {os.getenv('LANGSMITH_ENDPOINT', 'https://api.smith.langchain.com')}")

    if os.getenv("LANGCHAIN_TRACING_V2") == "true" and os.getenv("LANGCHAIN_API_KEY"):
        print("\n[OK] LangSmith is configured! Traces → https://smith.langchain.com/")
    else:
        print("\n[INFO] LangSmith not configured. Add to .env to enable tracing:")
        print("   LANGCHAIN_TRACING_V2=true")
        print("   LANGCHAIN_API_KEY=your_key_here")
        print("   LANGCHAIN_PROJECT=inventorypro-sql-agent")
'''

if __name__ == "__main__":
    print("\n🚀 InventoryPro SQL Agent — LangChain + Groq + PostgreSQL\n")
    db = get_db()
    llm = get_llm()
    agent = build_agent(db, llm)
    for i in range(3):
        question = input("\nEnter your question about the inventory database:\n> ")
        response = ask(agent, question)
        print(f"\nAgent response:\n{response}")