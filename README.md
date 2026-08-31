# 🔍 LossLens — AI-Powered Merchant Loss Intelligence & Response Engine

[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python-blue.svg)](backend/)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Vite-61dafb.svg)](frontend/)
[![Graph Engine](https://img.shields.io/badge/Graph-NetworkX%20%7C%20ReactFlow-orange.svg)](backend/app/services/graph_service.py)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**LossLens** is an explainable, AI-powered merchant risk intelligence platform that helps e-commerce and payment merchants discover hidden financial loss patterns across transactions, customers, orders, refunds, devices, addresses, and related entities.

Instead of evaluating transactions in isolation, LossLens analyzes relationships and behavior across the merchant ecosystem to identify emerging patterns such as coordinated refund abuse, multi-account promo exploitation, device fingerprint sharing, abnormal transaction clusters, and previously unknown sources of financial exposure.

---

## 💡 Why LossLens?

Unlike traditional rule-based fraud and transaction-monitoring systems that primarily ask:
> **"Is this transaction suspicious?"**

LossLens asks a broader, ecosystem-wide question:
> **"Is a harmful pattern emerging across the merchant ecosystem, what evidence connects it, how much financial loss could it cause, and what is the safest automated response?"**

### Core Intelligence Lifecycle
```
Discover ➔ Connect ➔ Detect ➔ Investigate ➔ Quantify ➔ Simulate ➔ Govern ➔ Act ➔ Verify
```

- **Graph-Driven Connection**: Links customers, transactions, orders, refunds, devices, IP addresses, and delivery destinations into multi-hop entity graphs.
- **Unsupervised Pattern Discovery**: Leverages graph network analysis and ML clustering algorithms to detect unknown non-obvious abuse patterns without relying on static rules.
- **Evidence-Grounded Investigation**: Generates automated evidence chains showing exact relationship paths, common attributes, and temporal timelines.
- **Exposure & Risk Quantification**: Estimates total potential financial exposure and expected merchant loss.
- **Automated Interventions & Webhook Integration**: Supports live webhook event ingestion (e.g. Razorpay webhook support with HMAC SHA-256 verification) with policy-driven escalation and audit logging.

---

## ✨ Key Features

- 📊 **Executive Overview Dashboard**: High-level telemetry on total transactions, captured volume, refund ratios, active risk indicators, and system health.
- 🎯 **ML Pattern Discovery Engine**: Uncovers suspicious clusters (e.g. refund abuse networks, compromised address farms, device-sharing rings) with dynamic risk scoring.
- 🕸️ **Interactive Graph Explorer**: Built with **ReactFlow**, allowing risk analysts to visually inspect multi-hop connections, component clusters, and shared entity attributes.
- ⚡ **Real-Time Event Monitor**: Audit trail of incoming webhooks and normalized system events with payload inspection.
- 💳 **Ecosystem & Transaction Explorer**: Filterable tables for deep-dive investigation of orders, payments, refunds, customers, and devices.
- 🔒 **Razorpay Webhook Integration**: Built-in webhook endpoint with HMAC SHA-256 signature verification for real-time transaction event ingestion.
- 🎲 **Synthetic Dataset Pipeline**: Automated dataset generator capable of synthesizing 30,000+ realistic e-commerce transactions, refund patterns, and abuse topologies.

---

## 🏗️ Architecture & Tech Stack

```
                                 ┌───────────────────────────────┐
                                 │   Payment Systems & Webhooks  │
                                 │      (e.g., Razorpay)         │
                                 └──────────────┬────────────────┘
                                                │
                                                ▼
┌─────────────────────────┐      ┌───────────────────────────────┐
│ Synthetic Dataset Tools │─────►│   FastAPI Webhook & API Gateway│
│  (Faker / Pandas / CLI) │      └──────────────┬────────────────┘
└─────────────────────────┘                     │
                                                ▼
                                 ┌───────────────────────────────┐
                                 │   LossLens Engine Core        │
                                 │ ┌───────────────────────────┐ │
                                 │ │  NetworkX Graph Analytics │ │
                                 │ ├───────────────────────────┤ │
                                 │ │  ML Pattern Discovery     │ │
                                 │ └───────────────────────────┘ │
                                 └──────────────┬────────────────┘
                                                │
                                                ▼
                                 ┌───────────────────────────────┐
                                 │  React 18 + Vite Dashboard    │
                                 │ (ReactFlow, Recharts, Tailwind│
                                 └───────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | Python 3.10+, FastAPI, Uvicorn | High-performance RESTful API & webhook handler |
| **Graph Intelligence** | NetworkX, Pandas, Scikit-learn | Heterogeneous graph construction, anomaly detection & community analysis |
| **Frontend** | React 18, TypeScript, Vite | Modern responsive SPA for loss intelligence |
| **Styling & UI** | Tailwind CSS, Lucide Icons | Premium aesthetic and component styling |
| **Data Visualization** | ReactFlow, Recharts | Interactive graph nodes/edges & risk telemetry charts |
| **Database & Storage** | PostgreSQL / Supabase, JSON | Persistent storage for dataset entities and events |
| **Testing** | Pytest, HTTPX | Automated suite for API and graph engine tests |

---

## 📁 Repository Structure

```
LossLens-AI-Powered-Merchant-Loss-Intelligence-and-Response-Engine/
├── backend/                  # FastAPI Python Backend
│   ├── app/
│   │   ├── api/              # API endpoints & Razorpay webhooks
│   │   ├── models/           # SQLAlchemy models & schema definitions
│   │   ├── services/         # Graph Service & ML Discovery Service
│   │   ├── config.py         # App configurations & environment variables
│   │   ├── database.py       # Database connection & session setup
│   │   └── main.py           # FastAPI entrypoint & middleware
│   ├── tests/                # Automated pytest suite
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React + Vite Frontend
│   ├── src/
│   │   ├── components/       # Reusable layout and navigation components
│   │   ├── pages/            # Overview, Discovery, Graph, Transactions, Events
│   │   ├── services/         # API client & data fetchers
│   │   ├── types/            # TypeScript interfaces & types
│   │   └── App.tsx           # React app router & setup
│   ├── package.json          # Node dependencies & npm scripts
│   └── tailwind.config.js    # Tailwind styling config
├── scripts/                  # Data generation & seeding scripts
│   ├── generate_dataset.py   # Synthetic e-commerce loss dataset generator
│   ├── seed_supabase.py      # Database seeding utility
│   ├── setup_db.py           # DB tables initialization
│   └── validate_dataset.py   # Dataset structure validator
└── data/                     # Output directory for dataset JSON files
```

---

## 🚀 Quick Start Guide

### Prerequisites

Ensure you have the following installed on your machine:
- **Python 3.10+**
- **Node.js 18+** & **npm**

---

### 1. Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - **macOS/Linux**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Generate sample dataset**:
   From the project root:
   ```bash
   python scripts/generate_dataset.py --transactions 30000 --seed 42
   ```

5. **Start the FastAPI backend server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   The backend API will be running at `http://localhost:8000`. Access interactive API documentation at `http://localhost:8000/docs`.

---

### 2. Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node packages**:
   ```bash
   npm install
   ```

3. **Launch the Vite development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser to view the LossLens Dashboard.

---

## 🧪 Running Tests

Execute backend automated tests using `pytest`:

```bash
cd backend
pytest
```

---

## 🔌 API Endpoints Summary

### Telemetry & Stats
- `GET /api/stats` — Overall ecosystem counts and financial metrics.

### Graph Intelligence
- `GET /api/graph/summary` — Graph statistics (node/edge totals, components, density).
- `GET /api/graph` — ReactFlow compatible nodes and edges graph payload.
- `GET /api/graph/entities/{type}/{id}` — Complete centrality and connectivity profile of an entity.
- `GET /api/graph/entities/{type}/{id}/neighbors` — N-hop neighborhood subgraph for visual inspection.
- `POST /api/graph/refresh` — Rebuild and refresh graph index cache.

### Pattern Discovery
- `POST /api/discovery/discover` — Triggers ML pattern discovery algorithm.
- `GET /api/discovery/patterns` — Returns all detected suspicious pattern clusters.
- `GET /api/discovery/patterns/{pattern_id}` — Detailed report and entity list for a specific pattern.

### Entities & Webhooks
- `GET /api/payments` — Filterable payment transactions.
- `GET /api/customers` — Customer entities list.
- `GET /api/orders` — Order entities list.
- `GET /api/refunds` — Refund entities list.
- `GET /api/events` — Audit trail of ingested telemetry events.
- `POST /api/webhooks/razorpay` — Razorpay webhook ingestion endpoint.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more details.


