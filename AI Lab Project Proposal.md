![[Pasted image 20260325194847.png|100]]
#  InventoryPro: Autonomous Supply Chain Optimisation & Enterprise Retrieval System

### Group Members: 
Shaheer Uddin Ahmed (23K-0649)
Muhammad Ibtesam Khan (23K-0738)
Yahya Shaikhn (23K-0718)

---
## 1. Introduction:
We are proposing the development of "*InventoryPro*," a modern, responsive inventory management system. Unlike traditional passive dashboards, this system integrates **Agentic Artificial Intelligence** and **Information Retrieval** (IR) architectures to act as an autonomous supply chain assistant. The system will allow users to manually track inventory levels , generate low-stock alerts , and maintain sales records. Furthermore, it will feature an autonomous LLM agent capable of understanding natural language commands, querying the database via vector search, and independently executing backend operations like restocking recommendations.

## 2. System Architecture & Example Tech Stack:
The system is designed with a modular architecture, anchoring on a fixed frontend and database, while allowing flexibility in the AI and retrieval middleware. 
 **Frontend :** Next.js for web interfaces and user authentication. 
 **Database :** PostgreSQL, utilizing vector extensions for semantic search capabilities.
**IR & Data Middleware:** Python or Node.js to handle data chunking, embedding generation, and query execution. 
**AI Orchestration Layer :** A RESTful API (e.g., Python Flask or Express.js) managing the agentic loop, powered by a local or cloud-based Large Language Model (e.g., Ollama/Llama 3).
## 3. Core Features & Functionalities

#### Phase A: Base Inventory Infrastructure:
- *User Management:* Secure signup/login suitable for shopkeepers, warehouse managers, and small businesses. 
	
- *CRUD Operations:* Interfaces to add, edit, delete, and view products.  
	
- *Stock Tracking:* Set quantity thresholds, view current stock levels, and log sales/purchase transactions.
#### Phase B: Information Retrieval (IR) System
- *Enterprise Search:* Implementation of a retrieval system mapping product rows and transaction histories into a vector space.
    
- *Rigorous Evaluation:* System accuracy will be validated using standard IR metrics, measuring retrieval precision and recall against a curated dataset of inventory queries.
#### Phase C: Agentic AI Orchestration
- *Tool-Calling Agent:* An LLM acting as a central reasoning engine. It will dynamically choose between conversing with the user, calling the IR search tool to fetch data, or executing backend API endpoints (e.g., `/api/transactions`, `/api/low-stock`) to manipulate data securely.
	
- *Strategic Planner:* The agent will analyze retrieved historical sales data and current stock levels to generate predictive restocking recommendations based on past trends.
## 4. Expected Deliverables:
- A fully functional Next.js dashboard featuring real-time data access and a built-in agentic chat interface. 
- A robust backend exposing endpoints for both standard operations and LLM tool-calling execution.
- An evaluation report detailing the search accuracy and task-completion success rate of the autonomous agent.