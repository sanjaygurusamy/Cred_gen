# Legacy Implementation Reference Archive

## Notice
This folder contains the pre-restart implementation of CampusCarbon AI (v1), preserved for **reference and domain knowledge extraction only**.

### Why This Code Was Isolated
- The prior code suffered from architectural inconsistencies, monolithic files (e.g. 1,000+ line JSX components and untyped JavaScript), tightly coupled business logic, and lack of database migrations.
- In accordance with the Phase 0 architecture reset, no code from this directory will be copied or extended directly into the new production codebase.

### Key Knowledge & Assets Preserved Here
1. **Curated Sustainability Rules**: `legacy/backend/app/recommendation_engine/rules_library.py` (comprehensive rules, prerequisites, and constraint definitions across 7 sustainability categories).
2. **Deterministic Carbon Calculation Formulations**: `legacy/backend/app/carbon_engine/calculator.py` and `units.py` (GHG Protocol formulations, emission factor math, and unit validation).
3. **Campus Hierarchy & Seed Data**: `legacy/backend/app/seed_data.py` (GreenTech University campus metadata, 7 campus bodies/blocks, element inventory, baseline figures, and DEFRA/EPA factor citations).
4. **Historical SQLite Database**: `legacy/backend/campus_carbon.db` (preserved intact without destructive resets).
5. **UI Interaction Patterns & Component Concepts**: `legacy/frontend/src/components/` (modals, simulators, calculator workflows).
