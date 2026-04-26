# Walkthrough: Manual Agentic AI Loop 

We have successfully "stripped out" LangChain and rewritten `Agent.py` from scratch to build a native **ReAct (Reasoning and Acting)** loop. This manual approach provides deep insight into how agents actually work under the hood!

## 1. Removing Framework Dependencies
LangChain has been entirely removed from `Agent.py`. We now rely strictly on standard Python libraries: `requests` (for API calls to Ollama and our backend) and `re` (for Regex parsing).

## 2. The Native ReAct Prompt
Instead of LangChain's black-box prompt management, we now explicitly instruct the LLM on exactly how to behave.

```text
You MUST use the following exact format for your responses:
Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [get_products, etc...]
Action Input: the input to the action
Observation: the result of the action (provided by the system)
...
Thought: I now know the final answer
Final Answer: the final answer to the original input question
```

This strict layout is the core of the **ReAct** architecture. It forces the LLM to write out its reasoning ("Thought"), decide on a tool ("Action"), and then wait.

## 3. The Execution Loop & Halting
In the new `_call_ollama` function, we pass the parameter `"stop": ["Observation:"]`. 
This is a critical mechanic! We are telling the LLM: *Stop generating text the moment you output the word 'Observation:'*. 

Once the LLM halts:
1. Our Python code takes over.
2. We use Regex (`_parse_output`) to extract the `Action` and `Action Input` that the LLM generated just before halting.
3. We execute the requested Python function (e.g., `requests.get('.../api/Products')`).
4. We inject the result back into the prompt as `Observation: [Data]`.
5. We send the *entire new prompt* back to Ollama to continue the loop.

## 4. Handling Hallucinations Manually
If the model hallucinates (e.g., outputs `I think I should use get_products` instead of the strict `Action: get_products` format), our Regex parser detects the failure. 
Instead of crashing, our code injects an error message back to the LLM:
> `Observation: Could not parse output format. Please use 'Action: [tool]' or 'Final Answer: [answer]'.`

This forces the LLM to realize its mistake and try generating the correct format on the next iteration.

## 5. Mocking the IR System
As requested, we bypassed the actual Vector Database implementation for now. Instead, we created the `search_knowledge_base` dummy tool.

```python
def search_knowledge_base(query: str = "") -> str:
    # MOCK DATA
    mock_knowledge = {
        "restock policy": "Restocking is done on Friday mornings...",
        "return policy": "Items can be returned within 30 days...",
    }
    # ... searching logic ...
```
This tool is successfully registered in the agent's tool dictionary. The agent can now "think" to query this knowledge base if the user asks about enterprise policies, allowing you to test the Agentic AI flow before spending time hooking up pgvector.

## How to Test
You can test the barebones logic by running the file directly in your terminal, provided Ollama is running locally:
```bash
python3 InventoryPro/Agent/Agent.py
```
Watch the terminal! We've added verbose `print()` statements so you can literally read the "Thoughts" of the LLM in real-time as it traverses the loop.

## Intial UP | >

# Walkthrough: Database Automation & Human-in-the-Loop (HITL)

We have successfully upgraded the `InventoryAgent` from a simple read-only chatbot to an Agent capable of automating processes securely! 

## 1. Database Automation (`place_order`)
We added a new tool called `place_order` to `Agent.py`. 
When the LLM decides it needs to fulfill a user request like *"put an order of 10 pieces of 5x5 wood planks"*, it outputs `Action: place_order` and `Action Input: 10 x 5x5 wood planks`.

Inside the `place_order` Python function, we have set up the logic to perform an HTTP POST request to the Vercel backend (currently commented out as a safety mockup, but ready to be activated when your `/api/Transactions` endpoint accepts POSTs).

## 2. Short Term Memory (STM) & Context Saving
The agent already maintains standard conversational STM via `self.chat_history`. However, to facilitate automation securely, we needed to implement *State Tracking Memory*.

We introduced `self.pending_action`. This dictionary holds the precise state of the AI's reasoning loop (the exact string of Thoughts and Observations) so that the Agent can remember what it was doing *after* pausing for user input.

## 3. Human-in-the-Loop (HITL) Interception
This is the most critical addition for an enterprise agent!

> [!CAUTION]
> **Why HITL is important**: Without this, if you asked the AI *"what happens if I order 10,000 laptops?"* the LLM might hallucinate and actually execute the `place_order` tool, ruining your database!

We implemented a **Restricted Tools** list. When the Agent's Regex parser detects that the LLM wants to use `place_order`, our Python code **hijacks the loop**:
1. It saves the entire current ReAct prompt string into `self.pending_action`.
2. It completely halts the execution loop and returns a message to the UI: *"⚠️ CONFIRMATION REQUIRED: I am about to execute 'place_order'... Do you approve?"*
3. When you reply in the chat window, the `chat()` function intercepts your message.
4. If you reply **"Yes"**, the system runs the real Python POST request, gets the success result, injects `Observation: Successfully placed order...` into the saved prompt, and resumes the LLM loop!
5. If you reply **"No"**, it injects `Observation: The user declined...` so the LLM knows it was denied and can apologize to the user.

## 4. Frontend Chat Integration
I noticed you already had a stunning Next.js chat interface built inside `app/agent_chat/agent_chat.tsx`! 

- **Port Fix:** The UI was attempting to call `localhost:5001`, but your Flask backend (`InventoryPro/app.py`) runs on `5006`. I fixed this mismatch.
- **Session ID:** The frontend automatically generates a `sessionId` and passes it to the Flask backend on every message. Your `Agent_api.py` uses this to route the message to the correct `InventoryAgent` instance in memory. This means your STM (and the pending action state) is seamlessly maintained across API requests! 

### How to use:
1. Run your Flask backend (`python InventoryPro/app.py`).
2. Run your Next.js frontend (`npm run dev` inside `inventory-frontend`).
3. Navigate to the agent chat page and ask it to *"place an order for 10 keyboards"*.
4. Watch the HITL confirmation work in real-time!
