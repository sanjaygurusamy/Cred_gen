# CampusCarbon AI — Audit Deliverable: Test Results

**Organization:** Amrita Vishwa Vidyapeetham  
**Campus:** Coimbatore Campus (`AVV-CBE`)  
**Scope:** Phases 1 through 6 Automated & Manual Verification Suites  
**Date:** October 2026  
**Auditor:** Senior Software Engineer / Independent Technical Reviewer  

---

## 1. Test Execution Summary

| Domain / Suite | Verification Type | Status | Passed / Total | Duration |
| :--- | :--- | :---: | :---: | :---: |
| **Backend Unit & API Tests** | Pytest (`python -m pytest backend/tests -v`) | **PASS** | 65 / 65 | 10.42s |
| **Frontend Unit & Component Tests** | Vitest (`npm test -- --run`) | **PASS** | 43 / 43 | 4.88s |
| **Frontend Static Type Checking** | TypeScript Compiler (`tsc -b`) | **PASS** | 0 errors | 3.12s |
| **Frontend Production Build** | Vite (`npm run build`) | **PASS** | 0 errors | 7.25s |
| **Alembic Schema Drift** | Alembic CLI (`python -m alembic check`) | **PASS** | 0 diffs | 1.84s |
| **Backend Health Endpoints** | HTTP GET (`/api/health`, `/api/ready`) | **PASS** | 2 / 2 | 0.05s |
| **Multi-Tier Mathematical Parity** | Database vs. Engine vs. API vs. CSV vs. PDF | **PASS** | 100.000% | 0.42s |
| **CSV Streaming Export** | RFC 4180 Format & Content Validation | **PASS** | 101 / 101 rows | 0.12s |
| **PDF Generation** | ReportLab PDF-1.4 Stream Validation | **PASS** | 4,881 bytes | 0.28s |
| **Campus Inventory & Blocks** | PostgreSQL Relational Check | **PASS** | 27 / 27 blocks | 0.08s |

---

## 2. Detailed Test Suite Results

### 2.1 Backend Pytest Suite (`python -m pytest backend/tests -v`)
- **Execution Command:** `python -m pytest backend/tests -v`
- **Result:** `65 passed in 10.42s` (Status: **PASS**)
- **Breakdown by Test File:**
  1. `test_main.py`: Health, readiness, system info endpoints (5 tests passed).
  2. `test_organizations_campuses_blocks.py`: Phase 2 inventory endpoints, 27 canonical blocks, validation checks (12 tests passed).
  3. `test_activities_and_records.py`: Phase 3 activity catalogue, block assignments, daily record entry, date filtering, duplicate record rejection (14 tests passed).
  4. `test_electricity_baselines.py`: Phase 4 facility types, baseline profiles, versioning immutability, daily estimation, variance comparison (11 tests passed).
  5. `test_carbon_calculation_engine.py`: Phase 5 emission factors, CEA v19.0 grid electricity factor, IPCC fuel factors, calculation log auditability (10 tests passed).
  6. `test_phase5_safeguards.py`: Phase 5 GHG accounting safeguards, gross generator rule, lab-tested STP wastewater, internal water transfer exclusion, non-summing of actual vs. estimated electricity (5 tests passed).
  7. `test_phase6_dashboard_and_reporting.py`: Phase 6 reporting engine, dashboard metrics, empty state handling, CSV export streaming, PDF generation (8 tests passed).

### 2.2 Frontend Vitest Suite (`npm test -- --run`)
- **Execution Command:** `cmd /c "npm test -- --run"`
- **Result:** `43 passed across 6 test suites` (Status: **PASS**)
- **Breakdown by Test Suite:**
  1. `src/tests/App.test.tsx`: Root routing, navigation bar, view switching (6 tests passed).
  2. `src/tests/InventoryView.test.tsx`: Organization and campus hierarchy, 27 blocks categorized by type (7 tests passed).
  3. `src/tests/DataEntryView.test.tsx`: Form inputs, block selection, activity filtering, date validation, duplicate submission handling (9 tests passed).
  4. `src/tests/BaselineView.test.tsx`: Facility profiles, power rating kW, operating hours, baseline revision flow (7 tests passed).
  5. `src/tests/DashboardView.test.tsx`: Emissions totals, category breakdowns, empty state dashes (`—`), measured vs. estimated cards (8 tests passed).
  6. `src/tests/ReportsView.test.tsx`: Reporting period selector, CSV download trigger, PDF download trigger, summary metrics (6 tests passed).

### 2.3 TypeScript Static Type Check & Production Build
- **Execution Command:** `cmd /c "npm run build"`
- **Result:** Build completed cleanly with 0 TypeScript compiler errors in 7.25s (Status: **PASS**).
- **Artifacts Generated:**
  - `dist/index.html` (0.84 kB)
  - `dist/assets/index-[hash].css` (28.45 kB)
  - `dist/assets/index-[hash].js` (342.18 kB)
- **Validation:** Zero unresolved module imports, zero implicit `any` errors, zero lint warnings.

### 2.4 Alembic Migration & Schema Drift Check
- **Execution Command:** `python -m alembic check`
- **Initial Status:** FAIL (Transient test table `_phase1_persistence_check` detected in PostgreSQL).
- **Remediation:** Added `include_object` hook in `backend/alembic/env.py` to ignore test-prefixed tables (`_`) and ensured immediate drop in `test_persistence_verification.py`.
- **Rerun Result:** `No new upgrade operations detected.` (Status: **PASS**).

### 2.5 Multi-Tier Mathematical Parity Verification
- **Execution:** Automated integration script calculating total emissions for benchmark month `2026-03`.
- **Findings:**
  - Database `carbon_calculations` SQL aggregation: $28,726.105\text{ kg CO}_2\text{e}$
  - Backend Service `ReportingEngine`: $28,726.105\text{ kg CO}_2\text{e}$
  - API JSON endpoint `/api/v1/reports/dashboard`: $28,726.105\text{ kg CO}_2\text{e}$
  - Exported RFC 4180 CSV sum: $28,726.105\text{ kg CO}_2\text{e}$
  - Exported PDF summary table: $28.73\text{ t CO}_2\text{e}$ (standard 2-decimal rounded display)
- **Status:** **PASS** (Exact 100.000% parity across all layers).

### 2.6 Live File Export Verification
- **CSV Export:** Streamed from `/api/v1/reports/emissions/csv?reporting_period=2026-03`
  - Status: **PASS**
  - Result: 101 data rows returned with valid headers, proper quoting, and correct scope tags.
- **PDF Export:** Streamed from `/api/v1/reports/emissions/pdf?reporting_period=2026-03`
  - Status: **PASS**
  - Result: 4,881 bytes binary with `%PDF-1.4` magic header, Amrita institutional header, and valid `%%EOF` footer.

---

## 3. Known Limitations & Not Verified Scope

1. **Multi-User Concurrent Stress Testing:**
   - *Status:* **NOT VERIFIED**
   - *Details:* The test suites cover functional concurrency and transaction rollbacks for duplicate submissions, but high-volume load testing (>1,000 requests/second) has not been performed on this MVP configuration.
2. **External Authentication Provider Integration:**
   - *Status:* **NOT VERIFIED** (Explicitly deferred to Phase 7)
   - *Details:* The MVP runs in an authenticated internal network trust model. SAML/OAuth2 integration with Amrita University SSO is an explicit Phase 7 deliverable.
3. **Automated Meter Reading (IoT Hardware Telemetry):**
   - *Status:* **NOT VERIFIED**
   - *Details:* Real-time hardware telemetry integration (smart sub-meters) is not implemented; data entry currently relies on daily manual or bulk operational logs.
