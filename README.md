# 🏭 InventoryPro — Autonomous Supply Chain Optimisation & Enterprise Retrieval System

> **AI Lab 2026 Project** — Group Members: Shaheer Uddin Ahmed (23K-0649) · Muhammad Ibtesam Khan (23K-0738) · Yahya Shaikh (23K-0718)

InventoryPro is a full-stack, AI-augmented inventory management system built for distributors and retailers. It goes beyond a passive dashboard — it integrates an **agentic LLM chatbot**, an **ML-powered demand forecasting engine**, and a **real-time inventory management** system into a single cohesive platform.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Core Features](#core-features)
- [🤖 AI Chatbot Agent (Deep Dive)](#-ai-chatbot-agent-deep-dive)
- [📈 Demand Forecasting Engine (Deep Dive)](#-demand-forecasting-engine-deep-dive)
- [Backend API Reference](#backend-api-reference)
- [Frontend Pages](#frontend-pages)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)

---

## Overview

InventoryPro is designed in three progressive phases:

| Phase | Description |
|-------|-------------|
| **Phase A** | Base inventory infrastructure — CRUD, stock tracking, user authentication |
| **Phase B** | Information Retrieval system — vector search & semantic querying of inventory data |
| **Phase C** | Agentic AI orchestration — autonomous LLM agent with tool-calling, SQL querying, and restocking recommendations |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  inventory-frontend (Next.js 15)             │
│  Dashboard │ Forecasting │ Products │ Inventory │ Chat UI    │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP REST
┌────────────────────────▼────────────────────────────────────┐
│               InventoryPro Backend (Flask / Python)          │
│  /api/Dashboard  /api/Products  /api/Transactions            │
│  /api/DemandForecasting  /api/agent/chat  /api/LowStock      │
└───────────┬─────────────────────────┬───────────────────────┘
            │                         │
┌───────────▼──────────┐  ┌───────────▼──────────────────────┐
│  Supabase (PostgreSQL)│  │  AI Layer                        │
│  Products             │  │  InventoryAgent (LangChain)      │
│  Transactions         │  │    └─ ChatGroq (Llama 4 Scout)   │
│  General_Ledger       │  │    └─ ChatOllama (Gemma4 fallback│
│  Users                │  │  SQLAgent (LangGraph ReAct)      │
└───────────────────────┘  │  DemandForecasting (statsmodels) │
                           └──────────────────────────────────┘
```

---

## Project Structure

```
AI-Lab-2026/
├── InventoryPro/                  # Python Flask Backend
│   ├── app.py                     # App factory & blueprint registration
│   ├── wsgi.py                    # WSGI entry point (Gunicorn)
│   ├── supabase_client.py         # Supabase client singleton
│   ├── populate_simulated_sales.py # Script: seed realistic sales history
│   ├── requirements.txt           # All Python dependencies
│   ├── vercel.json                # Deployment config
│   ├── Agent/
│   │   ├── Agent.py               # InventoryAgent (LangChain tool-calling agent)
│   │   └── sql_agent.py           # SQLAgent (LangGraph ReAct + safe SQL execution)
│   └── api/
│       ├── Agent_api.py           # /api/agent/* endpoints (chat, reset, health)
│       ├── Dashboard.py           # /api/Dashboard
│       ├── DemandForecasting.py   # /api/DemandForecasting (ML forecasting engine)
│       ├── Inventory.py           # /api/Inventory
│       ├── LowStock.py            # /api/LowStock
│       ├── Products.py            # /api/Products (full CRUD)
│       ├── Transactions.py        # /api/Transactions
│       ├── Ledger.py              # /api/GeneralLedger
│       └── accounts.py            # /api/accounts (auth)
│
├── inventory-frontend/            # Next.js 15 Frontend (TypeScript)
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── page.tsx           # Main dashboard (KPI cards, charts)
│   │   │   ├── forecasting/       # AI Demand Forecasting page
│   │   │   ├── admin/             # Admin-only views
│   │   │   └── staff/             # Staff views
│   │   ├── agent_chat/            # AI Chatbot UI
│   │   ├── products/              # Products management
│   │   ├── inventory/             # Inventory overview
│   │   ├── transactions/          # Transaction history
│   │   ├── general-ledger/        # Accounting ledger
│   │   ├── login/ signup/         # Auth pages
│   │   └── forgot-password/ reset-password/
│   ├── components/
│   │   ├── layout/sidebar.tsx     # Role-aware sidebar navigation
│   │   ├── charts/                # Recharts-based chart components
│   │   └── ui/                    # shadcn/ui component library
│   ├── contexts/auth-context.tsx  # Global auth state
│   ├── hooks/use-role-access.ts   # RBAC permission hooks
│   └── lib/api.ts                 # Typed API client
│
└── agent/                         # Standalone agent skills directory
    └── skills/
```

---

## Core Features

### 📦 Inventory Management
- View all products with name, SKU, category, cost/selling price, quantity, and status
- Add, edit, and soft-delete (deactivate) products
- Quantity thresholds trigger automatic low-stock alerts
- Changes in quantity auto-generate transaction records

### 🔄 Transactions
- Log sales (`Sell`) and purchases (`Buy`) with full audit trail
- Quantity updates on the Products table are synchronized automatically
- Agent-created transactions are tagged as `AI System`

### 📊 Dashboard
- Live KPI tiles: total stock, active users, today's sales total, in/low/out-of-stock counts
- Weekly sales vs. purchases bar chart (via Supabase RPC)

### 🔐 Role-Based Access Control (RBAC)
- Admin vs. Staff roles enforced via `useRoleAccess` hook
- Sidebar navigation items are filtered per user role
- Low-stock badge on the Inventory nav item refreshes every 30 seconds

### 📒 General Ledger
- Double-entry bookkeeping: purchases/sales auto-post Debit/Credit entries

---

## 🤖 AI Chatbot Agent (Deep Dive)

The AI agent is the centrepiece of Phase C. It is a **multi-tool, session-aware LangChain agent** that understands natural language, reasons over live inventory data, and can autonomously execute backend operations — with a built-in human-in-the-loop safety gate.

### LLM Architecture

```
Primary:  ChatGroq → meta-llama/llama-4-scout-17b-16e-instruct  (cloud, fast)
Fallback: ChatOllama → gemma4:e4b                                (local, offline-safe)
```

LangChain's `.with_fallbacks()` is used so that if Groq is unavailable, the agent automatically reroutes to the local Ollama model — **zero manual intervention required**.

### Tools Available to the Agent

| Tool | Purpose | Source |
|------|---------|--------|
| `get_inventory_summary` | Total stock value, active items, low/out-of-stock counts | REST → `/api/Inventory` |
| `get_all_products` | Full product list (name, SKU, qty, price, status) — top 10 shown | REST → `/api/Products` |
| `get_low_stock_items` | Items below their restock threshold | REST → `/api/LowStock` |
| `get_dashboard_stats` | Dashboard KPIs: total products, active users, today's sales | REST → `/api/Dashboard` |
| `get_recent_transactions` | Last 5 transactions | REST → `/api/Transactions` |
| `search_knowledge_base` | Enterprise policies (restock schedule, return policy, supplier contacts) | In-memory KB |
| `record_transaction` | Record a sale or purchase order in the database | REST POST → `/api/Transactions` |
| `query_database` | Natural-language → SQL analytical queries (aggregations, GROUP BY, date filters) | SQL Agent |

### Tool Priority Logic

The agent's system prompt enforces a strict priority:
1. **Always try REST tools first** — they are fast, lightweight, and reliable.
2. **Use `query_database` only** for complex analytical queries that REST cannot answer (e.g., "average price per category", "top 5 products by quantity").
3. **Never use `query_database`** for simple lookups.

### Human-in-the-Loop (HITL) for Transactions

The agent is explicitly instructed **never to call `record_transaction` immediately**. Instead:
1. It summarises the requested transaction for the user.
2. It asks: _"Do you confirm you want me to record this transaction? (Yes/No)"_
3. Only after explicit **"Yes"** in the next message does it execute the write.

This prevents accidental data mutations from ambiguous queries.

### Session Management

Each browser session gets its own `InventoryAgent` instance stored in `agent_sessions{}` on the Flask server, keyed by `session_id`. Chat history is maintained per session (capped at last 20 messages to control token usage).

**API Endpoints:**
```
POST /api/agent/chat    → { message, session_id } → { response, session_id }
POST /api/agent/reset   → { session_id }           → clears chat history
GET  /api/agent/health  → { status, active_sessions }
```

### SQL Sub-Agent (LangGraph ReAct)

The `query_database` tool delegates to a dedicated **SQL agent** built with LangGraph's `create_react_agent`. This sub-agent:

- Connects to PostgreSQL via `SQLDatabase.from_uri()` (using `psycopg2`)
- Has access to: `sql_db_list_tables`, `sql_db_schema`, `sql_db_query_checker`, `sql_db_safe_query`, and `vector_search`
- **Safety Guard (`is_safe_query`)**: Any SQL generated is validated before execution:
  - `DELETE`/`UPDATE` without `WHERE` → blocked
  - `DROP`, `TRUNCATE`, `ALTER`, `CREATE` → blocked (require human approval)
  - Only `SELECT` statements auto-execute
- The default LangChain query tool is **replaced** with a custom `sql_db_safe_query` wrapper
- `vector_search` is a stub ready for pgvector embeddings (not yet active)
- Uses **Groq-only** (no Ollama fallback) since direct DB access requires the most capable model

---

## 📈 Demand Forecasting Engine (Deep Dive)

The demand forecasting system is an **ML pipeline** that analyses historical sales transactions and predicts future demand for the next 6 months per product.

### How It Works

```
Supabase Transactions Table
        │
        ▼  (filter: Status=Completed, type IN ['Sell','Sell '])
   Pandas DataFrame
        │
        ▼  resample('ME') → monthly aggregated sales
   Monthly Time Series
        │
        ├─ < 3 months of data? ──▶ Simple Average Fallback (confidence: 35%)
        │
        └─ ≥ 3 months of data? ──▶ Holt-Winters Exponential Smoothing
                                    trend='add', seasonal=None
                                    fit → forecast(6 periods)
                                    confidence: 85%
```

### Machine Learning Model: Holt-Winters Exponential Smoothing

`statsmodels.tsa.holtwinters.ExponentialSmoothing` is used with:
- **Additive trend** (`trend='add'`): captures consistent upward/downward momentum in sales
- **No seasonal component**: keeps the model robust when data is sparse
- **Automatic initialization** (`initialization_method="estimated"`)
- Negative forecasts are clamped to `0` (no negative sales)

### Restock Recommendation Logic

```python
needs_restock = month_1_forecast > current_stock
if needs_restock:
    recommended_order = (month_1_forecast - current_stock) + threshold
else:
    recommended_order = 0
```

This ensures the recommended order covers both the forecasted gap **and** the safety buffer (threshold).

### API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/DemandForecasting?product_id=<id>` | GET | Single product forecast |
| `/api/DemandForecasting/All` | GET | Batch forecast for all active products |

The batch endpoint solves the **N+1 query problem** by fetching all transactions in a single Supabase call, then grouping by `product_id` in Python — preventing O(n) database roundtrips.

### Response Format

```json
{
  "product_id": "uuid",
  "product_name": "MacBook Pro",
  "confidence_score": 0.85,
  "history": [45, 62, 78],
  "forecast": {
    "month_1": 91, "month_2": 105, "month_3": 118,
    "month_4": 132, "month_5": 145, "month_6": 159
  },
  "insights": {
    "current_stock": 30,
    "threshold": 20,
    "needs_restock": true,
    "recommended_order": 81
  }
}
```

### Forecasting Dashboard (Frontend)

The `/dashboard/forecasting` page renders:
- **Product selector panel** (left): scrollable list of all products with live restock alert indicators (pulsing `AlertCircle` icon)
- **Confidence badge**: shows ML confidence score (85% for full model, 35% for fallback)
- **Metric cards**: Current Stock, Stock Threshold, Recommended Restock quantity
- **Recharts `LineChart`**: combines last 3 months of real historical data with 6-month AI forecast, with a dashed red `ReferenceLine` at the minimum stock threshold

### Sales Data Seeder (`populate_simulated_sales.py`)

A utility script that populates realistic historical sales data for testing the forecasting engine:

| Product Type | Trend |
|---|---|
| "Laptop" / "Pro" products | **Upward trend** (growing demand) |
| "Chair" / "Neo" products | **Stable trend** (consistent demand) |
| All others | **Downward trend** (declining demand) |

Products that already have ≥ 3 transactions are skipped. Inserts are chunked at 50 records to avoid Supabase rate limits.

---

## Backend API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/Dashboard` | GET | KPI stats (stock counts, today's sales, weekly chart data) |
| `/api/Inventory` | GET | Total stock value, item counts by status |
| `/api/Products` | GET, POST | List all products / Create new product |
| `/api/Products/<id>` | GET, PUT, DELETE | Fetch / Update / Deactivate a product |
| `/api/LowStock` | GET | Items below restock threshold |
| `/api/Transactions` | GET, POST | List transactions / Record new transaction |
| `/api/Transactions/<id>` | DELETE | Soft-delete (deactivate) a transaction |
| `/api/DemandForecasting` | GET | Single product AI forecast (`?product_id=`) |
| `/api/DemandForecasting/All` | GET | Batch AI forecast for all active products |
| `/api/agent/chat` | POST | Send message to AI agent |
| `/api/agent/reset` | POST | Reset session chat history |
| `/api/agent/health` | GET | Agent API health check |

---

## Frontend Pages

| Route | Description |
|-------|-------------|
| `/login` | Supabase auth login |
| `/signup` | New account registration |
| `/forgot-password` `/reset-password` | Password recovery flow |
| `/dashboard` | Main KPI dashboard with charts |
| `/dashboard/forecasting` | AI Demand Forecasting dashboard |
| `/dashboard/admin` | Admin-only analytics view |
| `/dashboard/staff` | Staff-specific view |
| `/products` | Full product CRUD interface |
| `/inventory` | Inventory overview with low-stock alerts |
| `/transactions` | Transaction history and management |
| `/general-ledger` | Double-entry accounting ledger |
| `/agent_chat` | AI Chatbot interface |

---

## Tech Stack

### Backend
| Technology | Role |
|------------|------|
| **Python 3.x** | Primary backend language |
| **Flask 3.1** | REST API web framework |
| **Gunicorn** | WSGI production server |
| **Supabase (PostgreSQL)** | Cloud database + auth + RPC functions |
| **LangChain** | AI agent framework (tool-calling, prompt templates) |
| **LangGraph** | ReAct agent for SQL sub-agent |
| **ChatGroq** | Primary LLM (Llama 4 Scout 17B via Groq cloud) |
| **ChatOllama** | Fallback LLM (Gemma4 local) |
| **statsmodels** | Holt-Winters Exponential Smoothing for demand forecasting |
| **Pandas** | Time-series data processing |
| **sqlparse** | SQL safety validation |
| **psycopg2** | PostgreSQL driver for SQL agent |

### Frontend
| Technology | Role |
|------------|------|
| **Next.js 15** | React framework with App Router |
| **TypeScript** | Type-safe frontend code |
| **Tailwind CSS v4** | Utility-first styling |
| **shadcn/ui + Radix UI** | Accessible UI component library |
| **Recharts** | Data visualisation (line charts, bar charts) |
| **Lucide React** | Icon system |
| **Supabase JS** | Client-side auth & real-time |
| **React Hook Form + Zod** | Form validation |

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Supabase project
- A Groq API key (free tier available)
- Ollama installed locally (optional fallback)

### 1. Backend Setup

```bash
cd InventoryPro
pip install -r requirements.txt
```

Create a `.env` file (see [Environment Variables](#environment-variables)), then:

```bash
python app.py
# Server runs on http://127.0.0.1:5006
```

### 2. Seed Forecasting Data (Optional)

```bash
cd InventoryPro
python populate_simulated_sales.py
```

### 3. Frontend Setup

```bash
cd inventory-frontend
npm install
npm run dev
# App runs on http://localhost:3000
```

---

## Environment Variables

### Backend (`InventoryPro/.env`)

```env
# Supabase
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_KEY=<your-service-role-key>
SUPABASE_JWT_SECRET=<your-jwt-secret>

# Groq (Primary LLM)
GROQ_API_KEY_2=<your-groq-api-key>

# PostgreSQL (for SQL Agent direct connection)
DB_USER=postgres
DB_PASSWORD=<your-db-password>
DB_HOST=<your-db-host>
DB_PORT=5432
DB_NAME=postgres

# LangSmith (optional — for agent tracing)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=<your-langsmith-key>
LANGCHAIN_PROJECT=inventorypro-sql-agent
```

### Frontend (`inventory-frontend/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

---

## Key Design Decisions

- **Groq → Ollama fallback**: Uses LangChain's `.with_fallbacks()` for zero-downtime LLM switching without any code changes.
- **HITL for mutations**: The agent never auto-executes write operations — it always asks for confirmation first, preventing accidental data changes.
- **SQL Safety Guard**: A custom `is_safe_query()` wrapper replaces LangChain's default SQL tool, ensuring only `SELECT` statements auto-execute against the production database.
- **N+1 Fix in Forecasting**: The batch forecasting endpoint fetches all transactions in one query and groups them in memory, not per-product — critical for performance at scale.
- **Soft Deletes**: Products and transactions are deactivated via Supabase RPC (`deactivate_product`, `deactivate_transaction`) rather than hard-deleted, preserving audit history.

---

## License

MIT License — see [LICENSE](./LICENSE) for details.
