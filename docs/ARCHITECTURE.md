# CampusCarbon AI — System Architecture Document

## 1. Architectural Philosophy & Principles

CampusCarbon AI is designed as a **Modular Monolith** engineered for high auditability, determinism, maintainability, and clean separation of concerns.

### Core Principles
1. **Source of Truth Principle**:
   - The **Deterministic Calculation Engine** is the sole numerical authority for greenhouse gas (GHG) calculations, reductions, cost savings, and metrics.
   - LLM / AI capabilities (when active) generate contextual analysis, qualitative guidance, and natural-language summaries. The LLM is **never** permitted to calculate or fabricate numbers.
2. **Explicit Layered Separation**:
   - **Presentation Layer (Frontend)**: Typed React (TypeScript), modular atomic components, isolated pages, typed API client contracts.
   - **API Transport Layer (FastAPI Routers)**: Thin request validation, status code handling, dependency injection. No direct database or business calculations in routes.
   - **Business Service Layer**: Encapsulates pure domain logic (carbon math, recommendation rules, aggregation, simulation). Decoupled from transport and database specifics.
   - **Data Access Layer (SQLAlchemy 2.0 & Alembic)**: Strongly typed declarative models, explicit migrations, PostgreSQL transactional integrity, index optimization.
3. **Auditability & Traceability**:
   - Every calculation references an approved emission factor with source citation (DEFRA, EPA eGRID, IPCC), version, timestamp, and methodology.
   - Multi-tenant campus boundary isolation enforced at service and query levels.
4. **Resilience & Graceful Degradation**:
   - Full operational capability exists offline with rule-based catalogs if external AI APIs are disabled or unavailable.

---

## 2. Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 / 19 + TypeScript | Strict typing, robust ecosystem, component modularity |
| **Build Tool & Bundler** | Vite 6 | Rapid HMR, optimized production tree-shaking |
| **Styling** | Tailwind CSS 3.4+ | Utility-first, zero runtime overhead, responsive design |
| **Frontend Testing** | Vitest + React Testing Library | Fast unit/component testing mirroring Vite configuration |
| **Backend Framework** | FastAPI (Python 3.11+) | Asynchronous performance, automatic OpenAPI documentation |
| **Data Validation** | Pydantic v2 | High-performance schema validation and serialization |
| **ORM & Database Toolkit** | SQLAlchemy 2.0 (2.0-style queries) | Mature data modeling, strict type-hints, query composition |
| **Database Migrations** | Alembic | Version-controlled, reproducible schema migrations |
| **Relational Database** | PostgreSQL 16 | ACID compliance, JSONB support, robust transactional scaling |
| **Backend Testing** | pytest + httpx | Fast, standardized fixture-driven test execution |
| **Containerization** | Docker Compose | Reproducible local PostgreSQL and application environments |

---

## 3. Modular Monolith Directory Structure

```
Genisis/
├── .gitignore
├── docker-compose.yml
├── .env.example
├── README.md
├── docs/
│   ├── ARCHITECTURE.md            # This document
│   ├── PHASED_PLAN.md             # Detailed roadmap for Phases 0 to 10
│   ├── DATABASE_SCHEMA.md         # PostgreSQL entity design & conventions
│   └── DOMAIN_SPECIFICATION.md    # Product rules, GHG formulas, SDG mapping
├── legacy/                        # Preserved pre-restart code & DB (read-only reference)
│   ├── README.md
│   ├── backend/                   # Old backend, SQLite DB, models, rules library
│   └── frontend/                  # Old frontend JSX components
├── backend/
│   ├── pyproject.toml             # Project dependencies and tool configs
│   ├── requirements.txt           # Pinned production requirements
│   ├── alembic.ini                # Alembic migration configuration
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/              # Migration scripts (v1, v2, etc.)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                # FastAPI app initialization, middleware, routes
│   │   ├── core/                  # Configuration, database engine, security
│   │   │   ├── __init__.py
│   │   │   ├── config.py          # Pydantic BaseSettings
│   │   │   ├── database.py        # SQLAlchemy session & Base
│   │   │   └── security.py        # RBAC and authentication helpers
│   │   ├── api/                   # Transport layer (REST endpoints)
│   │   │   ├── __init__.py
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── router.py      # Aggregated v1 router
│   │   │       └── endpoints/     # Granular endpoint routers
│   │   ├── services/              # Pure business logic services
│   │   │   ├── __init__.py
│   │   │   ├── carbon/            # Deterministic GHG calculation service
│   │   │   ├── campus/            # Campus hierarchy & inventory service
│   │   │   ├── recommendations/   # Rule & prioritization engine
│   │   │   └── simulation/        # What-if scenario modeling
│   │   ├── models/                # SQLAlchemy 2.0 ORM models
│   │   │   ├── __init__.py
│   │   │   ├── campus.py
│   │   │   ├── emission_factor.py
│   │   │   ├── activity.py
│   │   │   ├── recommendation.py
│   │   │   └── scenario.py
│   │   └── schemas/               # Pydantic v2 schemas (DTOs)
│   │       ├── __init__.py
│   │       ├── common.py
│   │       ├── campus.py
│   │       ├── carbon.py
│   │       ├── recommendation.py
│   │       └── scenario.py
│   └── tests/                     # Backend test suite
│       ├── __init__.py
│       ├── conftest.py            # Test DB fixtures and TestClient
│       ├── unit/                  # Unit tests for services & calculations
│       └── integration/           # API integration tests
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx               # React root entrypoint
        ├── App.tsx                # App root layout and router container
        ├── index.css              # Tailwind and theme styles
        ├── api/                   # Typed API client and endpoints
        │   ├── client.ts          # Axios / Fetch client with error interceptors
        │   └── endpoints/         # Modular API service modules
        ├── types/                 # Domain and API TypeScript definitions
        │   ├── campus.ts
        │   ├── carbon.ts
        │   ├── recommendations.ts
        │   └── common.ts
        ├── components/            # Reusable UI component library
        │   ├── common/            # Buttons, Cards, Modals, Badges, Inputs
        │   └── layout/            # Navbar, Sidebar, Footer, PageContainer
        ├── pages/                 # Full view / route screens
        │   ├── Dashboard/
        │   ├── CampusInventory/
        │   ├── Calculator/
        │   ├── Recommendations/
        │   └── Scenarios/
        ├── hooks/                 # Custom reusable hooks
        └── utils/                 # Formatting, unit converters, helpers
```
