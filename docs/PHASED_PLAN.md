# CampusCarbon AI — Phased Implementation Roadmap

This document outlines the sequential phases for the ground-up reimplementation of CampusCarbon AI. Each phase produces working, tested, and validated software before proceeding to subsequent phases.

---

## Phase 0: Clean Project Start & Architecture (CURRENT)
- **Goal**: Cleanly reset the project baseline, isolate legacy code without data loss, configure version control, establish target directory skeletons, and align technical architecture.
- **Key Deliverables**:
  - Environment inspection report and legacy code isolation into `legacy/`.
  - Git version control checkpointing.
  - Project directory structure for frontend, backend, database, and documentation.
  - Development environment definition (`docker-compose.yml`, `.env.example`).
  - Architecture and Phased Plan specifications.
- **Verification**: Clean directory hierarchy, intact legacy backup, zero legacy dependencies in root build configs.

---

## Phase 1: Application Foundation
- **Goal**: Establish the runnable core application scaffold across frontend, backend, and PostgreSQL database.
- **Key Deliverables**:
  - **Backend**: FastAPI app initialization, Pydantic settings management, database engine session lifecycle, Alembic migration environment, centralized error handlers, health check endpoint (`/health`).
  - **Database**: PostgreSQL 16 connection verification via Docker Compose and SQLAlchemy 2.0 async/sync engine. Initial Alembic schema initialization.
  - **Frontend**: Vite + React + TypeScript + Tailwind CSS configured and compiling with zero TypeScript errors. Base layout shell (Header/Navbar, Footer, notification toast system).
  - **Testing**: pytest suite setup with test database fixture; Vitest configuration for frontend component testing.
- **Verification**: `docker compose up` spins up Postgres; backend passes healthcheck test; frontend compiles and renders cleanly.

---

## Phase 2: Campus, Campus Hierarchy & Block Inventory
- **Goal**: Model institutions, physical campus bodies (academic blocks, hostels, dining halls, utility plants, workshops), and emission elements.
- **Key Deliverables**:
  - SQLAlchemy models and Alembic migrations: `institutions`, `campuses`, `campus_blocks` / `campus_bodies`, `inventory_elements`.
  - Pydantic DTOs for creation, updates, and hierarchical querying.
  - CRUD services and REST endpoints (`/api/v1/campuses`, `/api/v1/blocks`, `/api/v1/elements`).
  - Frontend Campus Inventory view displaying hierarchical tree and block cards.
  - Seeding service to populate GreenTech University reference campus hierarchy.
- **Verification**: Complete API tests for campus hierarchy CRUD; seed script loads hierarchy correctly.

---

## Phase 3: Activity Definitions & Daily Activity Records
- **Goal**: Define measurable activity parameters (fuel volume, electrical energy, water volume, waste mass) and operational logging.
- **Key Deliverables**:
  - Models for `activity_definitions`, `activity_records`, and measurement units (`kWh`, `liter`, `kg`, `m³`).
  - Data validation rules (non-negative, physical feasibility bounds, timestamps).
  - Daily telemetry ingestion endpoints and bulk logging services.
  - Frontend data logging forms with unit validation and date range selectors.
- **Verification**: Unit tests on activity validation; integration tests for record creation and retrieval.

---

## Phase 4: Electricity Estimation, Actual Consumption & Comparison
- **Goal**: Energy telemetry analysis, baseline estimation models, sub-metering breakdown, and variance detection.
- **Key Deliverables**:
  - Dedicated electricity modeling service (connected loads, operational schedules, seasonal variations).
  - Variance calculation: Estimated vs. Actual sub-metered electricity readings.
  - Anomaly and peak-load threshold flags.
  - Frontend interactive electricity comparison charts and load breakdown visualizations.
- **Verification**: Accurate variance calculation validated against synthetic and legacy test profiles.

---

## Phase 5: Carbon Calculations & Emission-Factor Management
- **Goal**: Build the authoritative, deterministic GHG Protocol calculation engine and emission factor registry.
- **Key Deliverables**:
  - Models for `emission_factors` (with versioning, source citations: DEFRA 2024, EPA eGRID, IPCC, regional grid factors) and `carbon_calculations`.
  - Deterministic calculation service: $E = A \times EF$, unit compatibility verification, precision rounding ($kgCO_2e$, $tCO_2e$).
  - Calculation audit log linking records directly to exact emission factor IDs and calculation timestamps.
  - Restful endpoints for calculations and factor lookup.
  - Frontend Calculation workbench (General Calculator and Element-specific views).
- **Verification**: Exact numerical match against audited DEFRA and EPA reference examples (e.g., LPG $80\text{ kg/day} \times 2.983 = 238.64\text{ kgCO}_2\text{e}$).

---

## Phase 6: Dashboard & Reporting
- **Goal**: Executive and operational sustainability dashboards, UN SDG indicators, and institutional reporting.
- **Key Deliverables**:
  - Aggregation engine: Scopes 1, 2, and 3 rollups by day, month, campus block, and activity type.
  - Curated rule engine implementation (7 sustainability categories) and deterministic prioritization scoring ($0 - 100$).
  - UN Sustainable Development Goals (SDG 6, 7, 9, 11, 12, 13) mapping service.
  - Comprehensive frontend dashboard: KPI summary cards, categorical breakdown charts, recommendations view with filterable priority badges.
- **Verification**: Snapshot tests for rollups; UI integration tests across desktop and mobile viewports.

---

## Phase 7: Evidence Management & Digital MRV (Measurement, Reporting, Verification)
- **Goal**: Audit-grade evidence attachment, baseline verification workflows, and tamper-evident logging.
- **Key Deliverables**:
  - Models for `evidence_records`, file attachment metadata (meter logs, utility bills, maintenance tickets).
  - Multi-stage approval lifecycle (`pending_review`, `approved`, `rejected`, `implemented`, `verified`).
  - Post-implementation measurement comparison ($E_{baseline} - E_{measured}$) and outcome verification.
  - Digital MRV audit trails with immutable hashing of calculation batches.
- **Verification**: Role-based access enforcement (facility manager vs. auditor vs. viewer); outcome verification tests.

---

## Phase 8: AI/ML Features
- **Goal**: Configurable natural language analysis and predictive anomaly detection while upholding the Source of Truth Principle.
- **Key Deliverables**:
  - LLM service integration (provider-agnostic OpenAI-compatible interface) with Pydantic JSON schema guards.
  - Contextual natural language explanations of recommendations and operational bottlenecks.
  - Resilient offline fallback: System automatically defaults to the curated rule-based library if AI service is absent or times out.
  - What-If Reduction Scenario Simulator with deterministic re-calculation of user-modified assumptions.
- **Verification**: Mocked LLM latency and failure tests proving uninterrupted fallback behavior.

---

## Phase 9: Hyperledger Fabric Integration
- **Goal**: Immutable enterprise distributed ledger recording for verified carbon credits and institutional dMRV milestones.
- **Key Deliverables**:
  - Integration with `Cred_gen` assets / identity generator.
  - Fabric SDK client wrapper for recording verified emission reductions and audit hashes onto ledger.
  - Chaincode invocation endpoints for minting verifiable sustainability milestones.
- **Verification**: Mocked ledger transaction submission and event confirmation tests.

---

## Phase 10: Testing, Security & Production Deployment
- **Goal**: Full automated test coverage, security hardening, containerized production build, and CI/CD pipelines.
- **Key Deliverables**:
  - End-to-end integration and API test suite (>85% coverage).
  - Security audit: RBAC enforcement, strict CSP, CORS headers, environment variable isolation, rate limiting.
  - Production multi-stage Dockerfiles for backend and frontend.
  - GitHub Actions / GitLab CI pipeline definitions for linting, testing, and Docker builds.
- **Verification**: Successful clean containerized spin-up, zero critical security findings, all automated tests passing.
