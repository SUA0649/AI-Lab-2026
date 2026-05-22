"""
Key design decisions
--------------------
* SQLDatabase.from_uri()  →  constructs the LangChain DB wrapper
* SQLDatabaseToolkit      →  provides the four standard LangChain SQL tools (list_tables, schema, query, query_checker) that the agent can call.
* vector_search tool      →  empty stub; fill in once embeddings are ready.
* Safety guard            →  is_safe_query() is wired into the custom sql_query_with_safety tool so DML/DDL statements are blocked or sent for HITL approval before they reach the database.
"""

import os
import threading
import sqlparse
import traceback as tb
from dotenv import load_dotenv
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import SQLDatabaseToolkit
#from langgraph.prebuilt import create_react_agent
from langchain.agents import create_agent
from langchain_core.tools import StructuredTool
from langchain_groq import ChatGroq
    

load_dotenv()


# DATABASE CONNECTION: Return a LangChain SQLDatabase wrapper for the InventoryPro PostgreSQL DB.
def get_database_connection():
    try:
        user     = os.getenv("DB_USER",     "postgres")
        password = os.getenv("DB_PASSWORD", "")
        host     = os.getenv("DB_HOST",     "localhost")
        port     = os.getenv("DB_PORT",     "5432")
        dbname   = os.getenv("DB_NAME",     "postgres")

        uri = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"
        db = SQLDatabase.from_uri(uri, sample_rows_in_table_info = 5)
        
        if not db: raise Exception("Failed to create database connection.")
        
        return db

    except Exception as e:
        tb.print_exc()
        print(f"Error connecting to database: {e}")
        return None 


# CUSTOM SAFE-QUERY TOOL
def build_safe_query_tool(db: SQLDatabase) -> StructuredTool:

    try:
        
        def safe_execute(sql: str) -> str:
            
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

    
            sql = sql.strip().strip(";")
            is_safe, message = is_safe_query(sql)

            if not is_safe: return (
                f"Query blocked by safety guard: {message}\n"
                "Only SELECT queries can be executed."
                "DML/DDL queries (INSERT,UPDATE, DELETE, DROP, ALTER, and CREATE) are blocked for safety."
            )

            try:
                if not db: 
                    return "Database connection is not available. Cannot execute query."
                result = db.run(sql)
                return result if result else "Query returned no results."
            
            except Exception as exc:
                return f"SQL execution error: {exc}"


        return StructuredTool.from_function(
            name="sql_db_safe_query", func=safe_execute,
            description=(
                "Execute only syntactically correct SELECT SQL query for the PostgreSQL database and return the results."
                "Input must be a valid SQL query string."
                "DML/DDL queries (INSERT, UPDATE, DELETE, DROP, ALTER, CREATE) are blocked for safety."
                "Use this tool to retrieve data from the database of Inventory Management System, named as InventoryPro."
            ),
        )
        
    except Exception as e:
        tb.print_exc()
        print(f"Error building safe query tool: {e}")
        return None


# SUB-AGENT SYSTEM PROMPT 
SYSTEM_PROMPT = """\
You are an sub-agent designed to interact with a SQL database for InventoryPro, \
an inventory management system developed for managing inventory for distributors and retailers. \
Given an input question, create a syntactically correct {dialect} query to run, \
then ALWAYS execute it using the available tools and return the actual results to the user.

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

# BUILD SUB-AGENT

def build_sub_agent(llm: ChatGroq, db: SQLDatabase) -> create_agent:
    try: 
        # Standard LangChain SQL tools (schema inspection, query validation)
        standard_tools = SQLDatabaseToolkit(db= db,llm= llm).get_tools()

        # Drop the default unchecked query tool; replace with our safe version
        filtered_tools = [t for t in standard_tools if t.name != "sql_db_query"]

        # Our safety-checked execution tool
        safe_query_tool = build_safe_query_tool(db)


        all_tools = filtered_tools + [safe_query_tool]
        
        # create_react_agent (LangGraph) — builds a compiled agent graph
        # system_prompt is injected as a plain string; dialect/top_k are our substitutions

        return create_agent(
                            model= llm, 
                            tools= all_tools, 
                            system_prompt= SYSTEM_PROMPT.format(dialect=db.dialect, top_k=10),
                            debug= True
                            )
    
    except Exception as e:
        print(f"Error building agent: {e}")
        return None


def ask(agent, query: str) -> str:
    try:
        result = agent.invoke({"messages": [{"role": "user", "content": query}]})
        return result["messages"][-1].content

    except Exception as e:
        return f"Sorry, I encountered an error while processing your request.\n{e}"
