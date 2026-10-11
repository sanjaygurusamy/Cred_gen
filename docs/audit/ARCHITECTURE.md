# CampusCarbon AI — Audit Deliverable: Architecture & Data Flow

**Organization:** Amrita Vishwa Vidyapeetham  
**Campus:** Coimbatore Campus (`AVV-CBE`)  
**Scope:** Phases 1–6 Architectural Blueprint & Data Flow  
**Date:** October 2026  

---

## 1. High-Level System Architecture

CampusCarbon AI is designed as a modular, decoupled full-stack greenhouse gas accounting platform. The frontend single-page application communicates with a high-performance Python FastAPI backend over REST, with PostgreSQL serving as the single source of truth for relational inventory, operational activity data, emission factors, and immutable calculation logs.

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer (Browser)"]
        UI["React 18 + TypeScript + Vite SPA"]
        Tailwind["Tailwind CSS + Lucide Icons"]
        ApiClient["Centralized API Client (api.ts)"]
    end

    subgraph APILayer ["FastAPI Application (Port 8000)"]
        Router["FastAPI APIRouter (/api/v1)"]
        
        subgraph Endpoints ["Domain Endpoints"]
            EP_Inv["Inventory: Campuses, Blocks"]
            EP_Act["Activities: Categories, Daily Records"]
            EP_Base["Baselines: Facility Profiles, Versions"]
            EP_Calc["Calculation Engine: Run & Audit Logs"]
            EP_Rep["Reporting Engine: Dashboard, CSV, PDF"]
        end
        
        subgraph Services ["Domain Services"]
            S_Calc["CarbonCalculationService"]
            S_Base["BaselineEstimationEngine"]
            S_Rep["ReportingEngine"]
            S_Exp["ExportService (ReportLab & CSV)"]
        end
    end

    subgraph DataLayer ["Data & Storage Layer (Docker / Port 5432)"]
        Alembic["Alembic Migration Engine (Head: 06082b0a547b)"]
        Postgres[("PostgreSQL 16 Database (campuscarbon)")]
        
        subgraph Tables ["Relational Tables"]
            T_Org["organizations / campuses / blocks"]
            T_Act["activity_categories / activity_definitions / block_assignments"]
            T_Rec["daily_activity_records"]
            T_Base["electricity_baselines / baseline_facilities"]
            T_Fact["emission_factors"]
            T_Calc["carbon_calculations (MRV Audit Log)"]
        end
    end

    UI --> ApiClient
    ApiClient -->|HTTP REST JSON| Router
    Router --> EP_Inv
    Router --> EP_Act
    Router --> EP_Base
    Router --> EP_Calc
    Router --> EP_Rep
    
    EP_Calc --> S_Calc
    EP_Base --> S_Base
    EP_Rep --> S_Rep
    EP_Rep --> S_Exp
    
    Services -->|SQLAlchemy ORM 2.0| Postgres
    Alembic -->|DDL Schema Evolution| Postgres
```

---

## 2. Major Components & Responsibilities

### 2.1 Frontend Components (`frontend/src/`)
1. **`App.tsx` & Router:** Root layout coordinating global navigation, header institutional identity, and view switching.
2. **`InventoryView.tsx`:** Displays the campus structure for Amrita Vishwa Vidyapeetham and Coimbatore Campus (`AVV-CBE`), rendering the 27 blocks across their 7 canonical categories.
3. **`DataEntryView.tsx`:** Manages daily activity data entry, with date selectors, block selection, category-filtered activity forms, positive metric validation, and duplicate entry safeguards.
4. **`BaselineView.tsx`:** Manages facility profiles (lighting, AC, lab equipment, computing) per block, enabling revision management and historical estimate protection.
5. **`DashboardView.tsx`:** Executive dashboard presenting calculated Scope 1, 2, and 3 emissions, category breakdowns, block rankings, and measured vs. estimated coverage. Renders honest empty states (`—` dashes) for unrecorded periods.
6. **`ReportsView.tsx`:** Download manager for reporting period selection, live streaming of RFC 4180 CSV logs, and ReportLab PDF executive summaries.
7. **`src/services/api.ts`:** Typed HTTP client parsing responses, transforming date formats, handling backend errors, and providing typed async methods for all backend resources.

### 2.2 Backend Modules (`backend/app/`)
1. **`main.py`:** Application entry point configuring CORS, lifespan database initialization, and mounting API routers.
2. **`core/database.py`:** Engine configuration (`postgresql+psycopg2`), sessionmaker factory, and `get_db()` dependency injection with deterministic session lifecycle.
3. **`models/`:** Declarative SQLAlchemy 2.0 ORM models defining entities, constraints, foreign keys, and indexes.
4. **`schemas/`:** Pydantic v2 schemas validating request inputs and defining serialization envelopes for all responses.
5. **`services/calculation_engine.py`:** Pure, deterministic GHG calculation engine multiplying activity metrics by verified emission factors. Applies the 10 GHG accounting safeguards.
6. **`services/baseline_engine.py`:** Computes daily estimated electricity for blocks based on facility power ratings (kW) and operating hours. Isolates baseline revisions to protect historical records.
7. **`services/reporting_engine.py`:** High-performance SQL aggregation service synthesizing emissions by category, block, and scope, with strict mathematical parity guarantees.
8. **`services/export_service.py`:** Generates streaming RFC 4180 CSV files and compiled ReportLab PDF executive reports with Amrita branding.

---

## 3. Entity-Relationship Data Model

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ CAMPUSES : contains
    CAMPUSES ||--o{ BLOCKS : contains
    BLOCKS ||--o{ BLOCK_ASSIGNMENTS : assigned_to
    ACTIVITY_CATEGORIES ||--o{ ACTIVITY_DEFINITIONS : groups
    ACTIVITY_DEFINITIONS ||--o{ BLOCK_ASSIGNMENTS : assigns
    
    BLOCKS ||--o{ DAILY_ACTIVITY_RECORDS : logs
    ACTIVITY_DEFINITIONS ||--o{ DAILY_ACTIVITY_RECORDS : specifies
    
    BLOCKS ||--o{ ELECTRICITY_BASELINES : configures
    ELECTRICITY_BASELINES ||--o{ BASELINE_FACILITIES : details
    
    EMISSION_FACTORS ||--o{ CARBON_CALCULATIONS : applies_to
    DAILY_ACTIVITY_RECORDS ||--o{ CARBON_CALCULATIONS : generates

    ORGANIZATIONS {
        uuid id PK
        string name
        string code
    }

    CAMPUSES {
        uuid id PK
        uuid organization_id FK
        string name
        string code
    }

    BLOCKS {
        uuid id PK
        uuid campus_id FK
        string name
        string code
        string category
        float gross_area_sqm
    }

    DAILY_ACTIVITY_RECORDS {
        uuid id PK
        uuid block_id FK
        uuid activity_id FK
        date record_date
        float value
        string unit
        string data_type
        jsonb metadata
    }

    ELECTRICITY_BASELINES {
        uuid id PK
        uuid block_id FK
        integer version
        date effective_start_date
        date effective_end_date
        boolean is_active
    }

    EMISSION_FACTORS {
        uuid id PK
        string code
        string category
        float factor_value
        string factor_unit
        string source
        integer version
        string status
    }

    CARBON_CALCULATIONS {
        uuid id PK
        uuid record_id FK
        uuid factor_id FK
        float emissions_kg_co2e
        float emissions_t_co2e
        string formula_applied
        timestamp calculated_at
    }
```

---

## 4. Critical Data Flows

### 4.1 Daily Activity Entry & Deterministic Calculation Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as Campus Operator
    participant UI as DataEntryView
    participant API as FastAPI Router
    participant Service as CalculationEngine
    participant DB as PostgreSQL

    User->>UI: Select Block, Activity, Date & Value
    UI->>API: POST /api/v1/records/daily
    API->>DB: Check Unique Constraint (block_id, activity_id, date)
    alt Duplicate Record Exists
        DB-->>API: IntegrityError (Unique Violation)
        API-->>UI: HTTP 409 Conflict ("Record already exists")
    else Valid New Record
        API->>DB: INSERT into daily_activity_records
        API->>Service: Trigger calculate_for_record(record_id)
        Service->>DB: Fetch active EmissionFactor for activity
        Service->>Service: Apply formula: Value * Factor (Safeguards enforced)
        Service->>DB: INSERT into carbon_calculations (Audit Log)
        DB-->>API: Commit Transaction
        API-->>UI: HTTP 201 Created (Record & Calculation details)
        UI-->>User: Display Success Toast
    end
```

### 4.2 Dashboard Aggregation & Export Flow
```mermaid
sequenceDiagram
    autonumber
    actor Executive as Campus Sustainability Officer
    participant UI as DashboardView / ReportsView
    participant API as FastAPI Router
    participant Engine as ReportingEngine
    participant DB as PostgreSQL

    Executive->>UI: Select Reporting Month (e.g., 2026-03)
    UI->>API: GET /api/v1/reports/dashboard?reporting_period=2026-03
    API->>Engine: get_dashboard_summary(period)
    Engine->>DB: Execute Aggregation Query on carbon_calculations
    DB-->>Engine: Category totals, Block totals, Scope breakdown
    Engine-->>API: Return DashboardSummary (Exact Kg / Tonnes)
    API-->>UI: HTTP 200 OK
    UI-->>Executive: Render Metrics & Graphs
    
    opt Download Official Report
        Executive->>UI: Click "Download PDF"
        UI->>API: GET /api/v1/reports/emissions/pdf?reporting_period=2026-03
        API->>Engine: Compile ReportLab PDF
        API-->>UI: Stream application/pdf (%PDF-1.4 binary)
        UI-->>Executive: Browser Save Prompt
    end
```
