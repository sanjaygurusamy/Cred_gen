# CampusCarbon AI — Audit Deliverable: Technical Findings

**Organization:** Amrita Vishwa Vidyapeetham  
**Campus:** Coimbatore Campus (`AVV-CBE`)  
**Scope:** Phases 1–6 Comprehensive Codebase Review  
**Date:** October 2026  

---

## 1. Frontend Code Audit (React 18 + TypeScript + Vite)

### 1.1 Type Safety & Static Analysis
- **Status:** PASS
- **Severity:** Low
- **Evidence:** `tsc -b && vite build` executed with 0 TypeScript compiler errors.
- **Details:** 
  - Comprehensive TypeScript interfaces are defined across all domain entities: `Block`, `ActivityCategory`, `ActivityDefinition`, `DailyRecord`, `BaselineProfile`, `EmissionFactor`, `CarbonCalculation`, `DashboardSummary`.
  - Zero arbitrary `any` casting in critical calculation or display logic.
  - Strict null checks and optional chaining are consistently applied across all component properties.

### 1.2 Centralized API Client Architecture
- **Status:** PASS
- **Severity:** Low
- **Evidence:** `src/services/api.ts` provides a unified, axios/fetch-free typed client using standard Web Fetch API.
- **Details:**
  - Base URL is configured dynamically via `import.meta.env.VITE_API_BASE_URL` with a standard fallback to `http://127.0.0.1:8000/api`.
  - Standard error envelope parsing handles HTTP 400, 404, 409 (duplicate records), and 500 cleanly, extracting backend `detail` messages into user-friendly toast notifications.
  - No direct SQL queries, bypasses, or insecure direct backend calls exist.

### 1.3 State Management, Loading States & Empty States
- **Status:** PASS
- **Severity:** Low
- **Evidence:** Verified across all views (`DashboardView`, `DataEntryView`, `BaselineView`, `ReportsView`, `InventoryView`).
- **Details:**
  - All asynchronous fetch hooks implement explicit `loading`, `error`, and `data` lifecycle states.
  - When no records exist for a selected reporting period (e.g., future or unrecorded months), the dashboard renders honest empty states (`—` dashes, clear call-to-action to enter daily records). It never fabricates zero-emission curves or synthetic trendlines.
  - Buttons disable appropriately during in-flight network requests to prevent double-submissions.

### 1.4 Accessibility, Responsive UI & Styling
- **Status:** PASS
- **Severity:** Low
- **Evidence:** Vitest UI component test suite (43 tests passing).
- **Details:**
  - Semantic HTML tags (`<main>`, `<header>`, `<nav>`, `<section>`, `<table>`) utilized throughout.
  - Form inputs include corresponding `<label>` associations and ARIA attributes for screen readers.
  - Responsive layouts built with Tailwind CSS adapt gracefully across mobile, tablet, and desktop breakpoints.

---

## 2. Backend Code Audit (FastAPI + Python 3.12 + SQLAlchemy 2.0)

### 2.1 API Design & Routing Structure
- **Status:** PASS
- **Severity:** Low
- **Evidence:** Modular router pattern implemented under `app/api/v1/`.
- **Details:**
  - Standardized RESTful endpoints across all domains:
    - `/api/health`, `/api/ready`, `/api/v1/info`
    - `/api/v1/organizations`, `/api/v1/campuses`, `/api/v1/blocks`
    - `/api/v1/activities/categories`, `/api/v1/activities/definitions`, `/api/v1/activities/assignments`
    - `/api/v1/records/daily` (CRUD, batching, date filtering)
    - `/api/v1/baselines` (profiles, facilities, version revision)
    - `/api/v1/calculations` (run calculation, MRV audit logs)
    - `/api/v1/emission-factors` (catalog, versioning, status)
    - `/api/v1/reports/dashboard`, `/api/v1/reports/emissions/csv`, `/api/v1/reports/emissions/pdf`
  - Consistent HTTP status codes used: 200 OK, 201 Created, 400 Bad Request, 404 Not Found, 409 Conflict (uniqueness violation), 422 Unprocessable Entity.

### 2.2 Dependency Injection & Session Lifecycle
- **Status:** PASS
- **Severity:** Low
- **Evidence:** All endpoint functions utilize `db: Session = Depends(get_db)`.
- **Details:**
  - `get_db()` yields a session within a `try...finally` block, guaranteeing that sessions are reliably closed after request completion and connections are returned to the pool.
  - Explicit transaction commits (`db.commit()`) with immediate rollback (`db.rollback()`) on any caught exceptions prevent dangling open transactions.

### 2.3 Input Validation & Defensive Error Handling
- **Status:** PASS
- **Severity:** Low
- **Evidence:** Pydantic v2 schemas applied across all request bodies.
- **Details:**
  - Date inputs validated with strict ISO format checks (`YYYY-MM-DD` and `YYYY-MM`).
  - Numeric metrics (power kW, hours/day, fuel liters, grid kWh) validated with positive float constraints (`gt=0` or `ge=0`).
  - Duplicate submissions on identical `(block_id, activity_id, record_date)` tuples cleanly catch SQLAlchemy `IntegrityError` and raise HTTP 409 Conflict with informative details.
  - Internal database stack traces and connection strings are masked from public client responses.

---

## 3. Database & Migration Audit (PostgreSQL 16 + Alembic)

### 3.1 Relational Schema & Constraints
- **Status:** PASS
- **Severity:** Low
- **Evidence:** Inspected Alembic migration tree (revisions 1 through 6, ending at `06082b0a547b (head)`).
- **Details:**
  - Robust relational schema with primary keys on all tables.
  - Foreign keys strictly enforced between:
    - `campuses.organization_id -> organizations.id`
    - `blocks.campus_id -> campuses.id`
    - `activity_definitions.category_id -> activity_categories.id`
    - `daily_activity_records.block_id -> blocks.id`
    - `daily_activity_records.activity_id -> activity_definitions.id`
    - `electricity_baselines.block_id -> blocks.id`
    - `carbon_calculations.record_id -> daily_activity_records.id`
    - `carbon_calculations.factor_id -> emission_factors.id`
  - Uniqueness constraints prevent duplicate entries:
    - `uq_daily_record_block_activity_date`: `(block_id, activity_id, record_date)`
    - `uq_baseline_block_version`: `(block_id, version)`
    - `uq_emission_factor_code_version`: `(code, version)`
  - Composite indexes on `(record_date, block_id)` and `(category, record_date)` accelerate dashboard aggregation queries.

### 3.2 Migration Consistency & Schema Drift Check
- **Status:** PASS (After Fix)
- **Severity:** Low (Resolved)
- **Evidence:** `python -m alembic check` output: `"No new upgrade operations detected."`
- **Finding:** A transient test table `_phase1_persistence_check` was leaking into the database during test suite runs, triggering a false positive drift warning in Alembic.
- **Remediation Applied:**
  1. Configured `backend/alembic/env.py` to filter out any objects starting with `_` using the `include_object` hook.
  2. Wrapped `_phase1_persistence_check` in `test_persistence_verification.py` inside a `try...finally: drop table` block.
- **Result:** Zero drift between SQLAlchemy declarative models and live PostgreSQL schema.

### 3.3 Data Persistence & Idempotency
- **Status:** PASS
- **Severity:** Low
- **Evidence:** Seed and persistence verification tests.
- **Details:**
  - All 27 Coimbatore campus blocks, 28 activity definitions, 215 block assignments, and 20 official emission factors are persisted in PostgreSQL.
  - Data survives container and application restarts without data loss or duplicate seeding.

---

## 4. Carbon Calculations & GHG Accounting Audit

### 4.1 Calculation Determinism & Auditability
- **Status:** PASS
- **Severity:** Low
- **Evidence:** Verified in `backend/app/services/calculation_engine.py` and `test_carbon_calculation_engine.py`.
- **Details:**
  - Formula strictly follows GHG Protocol Corporate Standard:
    $$\text{Emissions } (\text{kg CO}_2\text{e}) = \text{Activity Value} \times \text{Emission Factor Value} \times \text{Unit Conversion Factor}$$
  - No speculative proxies or ungrounded machine learning estimates are applied to missing fields.
  - Every calculation is permanently logged in `carbon_calculations` with:
    - Activity record reference
    - Exact emission factor ID and version used
    - Calculation formula string
    - Input quantity and unit
    - Computed emissions in kg $\text{CO}_2\text{e}$
    - Timestamp of computation (UTC)

### 4.2 Emission Factor Traceability
- **Status:** PASS
- **Severity:** Low
- **Evidence:** 20 seeded emission factors in `emission_factors` table.
- **Details:**
  - **Grid Electricity:** Central Electricity Authority (CEA) of India CO2 Baseline Database Version 19.0 (published December 2023 for FY 2022-23), Grid factor $= 0.716\text{ kg CO}_2\text{e}/\text{kWh}$.
  - **Stationary Combustion (Diesel Generators):** 2006 IPCC Guidelines for National Greenhouse Gas Inventories, Volume 2 (Energy), Chapter 3 $= 2.68\text{ kg CO}_2\text{e}/\text{litre}$.
  - **Mobile Combustion (Campus Fleet):** 2006 IPCC Guidelines Volume 2, Mobile Combustion $= 2.68\text{ kg CO}_2\text{e}/\text{litre}$ (Diesel) and $2.31\text{ kg CO}_2\text{e}/\text{litre}$ (Petrol).
  - **Kitchen LPG:** 2006 IPCC Guidelines Volume 2, Liquefied Petroleum Gases $= 2.98\text{ kg CO}_2\text{e}/\text{kg}$.
  - **Organic Waste Composting:** 2006 IPCC Guidelines Volume 5 (Waste), Chapter 4 $= 0.100\text{ kg CO}_2\text{e}/\text{kg}$.

### 4.3 GHG Accounting Safeguards
- **Status:** PASS
- **Severity:** Low
- **Evidence:** Code review and dedicated unit tests in `test_phase5_safeguards.py`.
- **10 Core Safeguards Verified:**
  1. *Gross Generator Accounting:* Fuel is accounted at input; generator kWh is not subtracted from grid electricity.
  2. *Lab Testing Requirement for STP:* Sewage treatment calculation aborts safely if $\Delta\text{COD}$ / $\Delta\text{BOD}$ lab measurements are missing, rather than substituting default proxies.
  3. *Internal Water Transfer Isolation:* Treated water transfers between blocks are isolated from Scope 1 emissions.
  4. *Solar PV Net Generation Separation:* Onsite solar generation is tracked as an avoided emission indicator, never subtracted from gross grid consumption without clear audit delineation.
  5. *Zero vs. Missing Data Distinctions:* Distinguishes zero fuel consumption ($0.0\text{ L} \implies 0.0\text{ kg CO}_2\text{e}$) from unrecorded activity (`NULL` $\implies$ Missing record flag).
  6. *Electricity Isolation:* Actual metered electricity and baseline estimated electricity are strictly non-additive.
  7. *Biogenic vs. Fossil Fuel Segregation:* Biodiesel and fossil diesel factors are segregated.
  8. *Refrigerant Fugitive Loss Tracking:* Leakage accounting requires verified charge loss weight.
  9. *Solid Waste Segregation:* Composted waste uses IPCC biogenic factor; non-composted landfill waste uses default anaerobic decay factors.
  10. *Version Immutability:* Changes to emission factors create a new factor version, leaving historical calculations untouched.

---

## 5. Security & Environment Audit

### 5.1 Secrets Management & Git Tracking
- **Status:** PASS
- **Severity:** Low
- **Evidence:** Inspected repository root and Git history.
- **Details:**
  - `.env` files are included in `.gitignore` and are not committed to Git.
  - Only clean templates (`.env.example`) are tracked in source control.
  - No production passwords, private keys, or API tokens were found in the codebase.

### 5.2 SQL Injection Prevention
- **Status:** PASS
- **Severity:** Low
- **Evidence:** Inspected all SQLAlchemy queries in `backend/app/`.
- **Details:**
  - 100% of queries use SQLAlchemy ORM or parameterized SQLAlchemy Core statements (`select()`, `filter()`).
  - Zero raw string interpolation (`f"SELECT ... {input}"`) or unparameterized queries.

### 5.3 Cross-Origin Resource Sharing (CORS)
- **Status:** PASS (For Local MVP)
- **Severity:** Medium (Action recommended before public launch)
- **Evidence:** `backend/app/main.py`
- **Details:**
  - CORS middleware is configured to allow local frontend origins (`http://localhost:5173`, `http://127.0.0.1:5173`).
  - *Recommendation:* Prior to multi-tenant or public deployment, restrict origins to production domain names and require HTTPS.

### 5.4 Authentication & Authorization
- **Status:** PASS (For Single-Campus Internal MVP)
- **Severity:** Medium (Action required in Phase 7)
- **Details:**
  - Currently, API routes are accessible within the local network without user authentication tokens.
  - *Recommendation:* Phase 7 should incorporate JWT-based authentication and Role-Based Access Control (RBAC: Admin, Campus Data Operator, Auditor, Read-Only Viewer).

---

## 6. Dashboard & Reporting Engine Audit

### 6.1 Multi-Tier Mathematical Parity
- **Status:** PASS
- **Severity:** Low
- **Evidence:** Verified via integration script across Database, Service, JSON, CSV, and PDF.
- **Details:**
  - For the benchmark test reporting period (`2026-03`):
    - Raw PostgreSQL `carbon_calculations` sum: $28,726.105\text{ kg CO}_2\text{e}$ ($28.7261\text{ t CO}_2\text{e}$)
    - Backend `ReportingEngine.get_dashboard_summary()`: $28,726.105\text{ kg CO}_2\text{e}$
    - REST API `/api/v1/reports/dashboard` response: $28,726.105\text{ kg CO}_2\text{e}$
    - Exported CSV total: $28,726.105\text{ kg CO}_2\text{e}$
    - Exported PDF summary table total: $28.73\text{ tonnes CO}_2\text{e}$ (correct 2-decimal rounded display)
  - Mathematical parity: **100.000%**. Zero discrepancy.

### 6.2 CSV Export Verification
- **Status:** PASS
- **Severity:** Low
- **Evidence:** Downloaded and parsed live CSV stream via `/api/v1/reports/emissions/csv?reporting_period=2026-03`.
- **Details:**
  - Strict RFC 4180 compliance with proper quoting, UTF-8 encoding, and CRLF line endings.
  - Streamed response includes 101 records with columns: `Record Date`, `Block Code`, `Block Name`, `Category`, `Activity Name`, `Input Quantity`, `Unit`, `Factor Code`, `Factor Value`, `Factor Unit`, `Scope`, `Emissions (kg CO2e)`, `Emissions (t CO2e)`, `Data Type`.

### 6.3 PDF Export Verification
- **Status:** PASS
- **Severity:** Low
- **Evidence:** Downloaded and validated live PDF binary via `/api/v1/reports/emissions/pdf?reporting_period=2026-03`.
- **Details:**
  - Binary response size: 4,881 bytes.
  - File header confirms valid `%PDF-1.4` magic bytes and terminates with `%%EOF`.
  - Built dynamically using ReportLab with Amrita Vishwa Vidyapeetham institutional headers, reporting metadata, Scope breakdown, block ranking, and official audit notice.
