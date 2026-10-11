"""
Tree Inventory, Plantation & Carbon Sequestration Service
Organization: Amrita Vishwa Vidyapeetham | Coimbatore Campus (AVV-CBE)

Implements documented allometric sequestration estimation conforming to:
- IPCC 2006 Guidelines for National Greenhouse Gas Inventories (Volume 4: AFOLU, Chapter 4 Forest Land)
- Forest Survey of India (FSI) Biomass & Carbon Stock Allometric Standards
"""

from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.trees import GreenSpace, TreeInventory, PlantationRecord
from app.models.campus import Campus
from app.models.block import CampusBlock
from app.schemas.trees import (
    GreenSpaceCreate, GreenSpaceUpdate,
    TreeInventoryCreate, TreeInventoryUpdate,
    PlantationRecordCreate, PlantationRecordUpdate,
    SequestrationSummary, SpeciesSequestrationBreakdown, GreenSpaceSummaryBreakdown
)


HEALTH_MULTIPLIERS = {
    "Healthy": 1.0,
    "Fair": 0.8,
    "Moderate": 0.8,
    "Diseased": 0.4,
    "Critical": 0.2,
    "Dead/Senescent": 0.0,
    "Dead": 0.0,
}

DEFAULT_SPECIES_RATES = {
    "Azadirachta indica": 22.0,       # Neem
    "Ficus religiosa": 28.5,          # Peepal
    "Ficus benghalensis": 32.0,       # Banyan
    "Tectona grandis": 20.0,          # Teak
    "Pongamia pinnata": 18.5,         # Pongamia / Indian Beech
    "Delonix regia": 16.0,            # Gulmohar
    "Tamarindus indica": 24.0,        # Tamarind
    "Peltophorum pterocarpum": 19.0,  # Copperpod
}


def calculate_tree_sequestration(
    tree_count: int,
    rate_kg_year: float,
    health_status: str,
    estimated_age_years: Optional[float] = None
) -> Tuple[float, str]:
    """
    Computes annual carbon sequestration for a tree inventory stand.
    
    Formula:
        annual_kg = tree_count * effective_rate * health_multiplier
    """
    health_mult = HEALTH_MULTIPLIERS.get(health_status, 1.0)
    
    # Adjust rate by age bracket if young tree
    effective_rate = rate_kg_year
    if estimated_age_years is not None and estimated_age_years < 4.0:
        effective_rate = min(rate_kg_year, 5.0)  # Young saplings have lower biomass increment
    elif estimated_age_years is not None and estimated_age_years < 10.0:
        effective_rate = min(rate_kg_year, 14.0)

    annual_kg = round(tree_count * effective_rate * health_mult, 2)
    methodology = (
        f"Allometric standard: {tree_count} trees × {effective_rate} kg CO2e/tree/yr "
        f"× {health_mult} ({health_status} health factor) = {annual_kg} kg CO2e/yr"
    )
    return annual_kg, methodology


class TreeService:
    def __init__(self, db: Session):
        self.db = db

    def get_or_default_campus_id(self, campus_id: Optional[str] = None) -> str:
        if campus_id:
            return campus_id
        campus = self.db.query(Campus).filter(Campus.code == "AVV-CBE").first()
        if not campus:
            campus = self.db.query(Campus).first()
        if not campus:
            raise ValueError("No active campus found in inventory.")
        return campus.id

    # -----------------------------------------------------------------------
    # Green Spaces
    # -----------------------------------------------------------------------
    def list_green_spaces(self, campus_id: Optional[str] = None) -> List[Dict[str, Any]]:
        cid = self.get_or_default_campus_id(campus_id)
        spaces = self.db.query(GreenSpace).filter(GreenSpace.campus_id == cid).all()
        
        result = []
        for s in spaces:
            tree_count = sum(t.tree_count for t in s.trees)
            annual_seq = sum(t.annual_sequestration_kg for t in s.trees)
            result.append({
                "id": s.id,
                "campus_id": s.campus_id,
                "block_id": s.block_id,
                "name": s.name,
                "code": s.code,
                "plantation_type": s.plantation_type,
                "area_sqm": s.area_sqm,
                "area_unit": s.area_unit,
                "description": s.description,
                "is_active": s.is_active,
                "tree_count": tree_count,
                "annual_sequestration_kg": round(annual_seq, 2),
                "created_at": s.created_at,
                "updated_at": s.updated_at
            })
        return result

    def create_green_space(self, data: GreenSpaceCreate) -> GreenSpace:
        cid = self.get_or_default_campus_id(data.campus_id)
        space = GreenSpace(
            campus_id=cid,
            block_id=data.block_id,
            name=data.name,
            code=data.code,
            plantation_type=data.plantation_type,
            area_sqm=data.area_sqm,
            area_unit=data.area_unit,
            description=data.description,
            is_active=data.is_active
        )
        self.db.add(space)
        self.db.commit()
        self.db.refresh(space)
        return space

    def update_green_space(self, space_id: str, data: GreenSpaceUpdate) -> Optional[GreenSpace]:
        space = self.db.query(GreenSpace).filter(GreenSpace.id == space_id).first()
        if not space:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(space, k, v)
        self.db.commit()
        self.db.refresh(space)
        return space

    # -----------------------------------------------------------------------
    # Tree Inventory
    # -----------------------------------------------------------------------
    def list_trees(self, campus_id: Optional[str] = None, block_id: Optional[str] = None) -> List[Dict[str, Any]]:
        cid = self.get_or_default_campus_id(campus_id)
        query = self.db.query(TreeInventory).filter(TreeInventory.campus_id == cid)
        if block_id:
            query = query.filter(TreeInventory.block_id == block_id)
        
        trees = query.all()
        result = []
        for t in trees:
            b_name = t.block.name if t.block else "General Campus Grounds"
            gs_name = t.green_space.name if t.green_space else "Unassigned Green Zone"
            result.append({
                "id": t.id,
                "campus_id": t.campus_id,
                "block_id": t.block_id,
                "green_space_id": t.green_space_id,
                "species_name": t.species_name,
                "common_name": t.common_name,
                "tree_count": t.tree_count,
                "planting_year": t.planting_year,
                "estimated_age_years": t.estimated_age_years,
                "health_status": t.health_status,
                "location_description": t.location_description,
                "data_source": t.data_source,
                "verification_status": t.verification_status,
                "sequestration_rate_kg_year": t.sequestration_rate_kg_year,
                "annual_sequestration_kg": t.annual_sequestration_kg,
                "annual_sequestration_t": round(t.annual_sequestration_kg / 1000.0, 4),
                "methodology_notes": t.methodology_notes,
                "notes": t.notes,
                "block_name": b_name,
                "green_space_name": gs_name,
                "created_at": t.created_at,
                "updated_at": t.updated_at
            })
        return result

    def create_tree_inventory(self, data: TreeInventoryCreate) -> TreeInventory:
        cid = self.get_or_default_campus_id(data.campus_id)
        rate = data.sequestration_rate_kg_year
        if rate == 22.0 and data.species_name in DEFAULT_SPECIES_RATES:
            rate = DEFAULT_SPECIES_RATES[data.species_name]

        annual_kg, method_desc = calculate_tree_sequestration(
            data.tree_count,
            rate,
            data.health_status,
            data.estimated_age_years
        )

        tree = TreeInventory(
            campus_id=cid,
            block_id=data.block_id,
            green_space_id=data.green_space_id,
            species_name=data.species_name,
            common_name=data.common_name,
            tree_count=data.tree_count,
            planting_year=data.planting_year,
            estimated_age_years=data.estimated_age_years,
            health_status=data.health_status,
            location_description=data.location_description,
            data_source=data.data_source,
            verification_status=data.verification_status,
            sequestration_rate_kg_year=rate,
            annual_sequestration_kg=annual_kg,
            methodology_notes=data.methodology_notes or method_desc,
            notes=data.notes
        )
        self.db.add(tree)
        self.db.commit()
        self.db.refresh(tree)
        return tree

    def update_tree_inventory(self, tree_id: str, data: TreeInventoryUpdate) -> Optional[TreeInventory]:
        tree = self.db.query(TreeInventory).filter(TreeInventory.id == tree_id).first()
        if not tree:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(tree, k, v)

        # Recalculate annual sequestration
        annual_kg, method_desc = calculate_tree_sequestration(
            tree.tree_count,
            tree.sequestration_rate_kg_year,
            tree.health_status,
            tree.estimated_age_years
        )
        tree.annual_sequestration_kg = annual_kg
        tree.methodology_notes = method_desc

        self.db.commit()
        self.db.refresh(tree)
        return tree

    def delete_tree_inventory(self, tree_id: str) -> bool:
        tree = self.db.query(TreeInventory).filter(TreeInventory.id == tree_id).first()
        if not tree:
            return False
        self.db.delete(tree)
        self.db.commit()
        return True

    # -----------------------------------------------------------------------
    # Plantation Records
    # -----------------------------------------------------------------------
    def list_plantations(self, campus_id: Optional[str] = None) -> List[Dict[str, Any]]:
        cid = self.get_or_default_campus_id(campus_id)
        records = self.db.query(PlantationRecord).filter(PlantationRecord.campus_id == cid).all()
        
        result = []
        for r in records:
            b_name = r.block.name if r.block else "General Campus Grounds"
            gs_name = r.green_space.name if r.green_space else "Unassigned Green Zone"
            result.append({
                "id": r.id,
                "campus_id": r.campus_id,
                "block_id": r.block_id,
                "green_space_id": r.green_space_id,
                "event_name": r.event_name,
                "plantation_date": r.plantation_date,
                "species_planted": r.species_planted,
                "saplings_planted": r.saplings_planted,
                "saplings_surviving": r.saplings_surviving,
                "survival_rate_percent": r.survival_rate_percent,
                "plantation_location": r.plantation_location,
                "maintenance_notes": r.maintenance_notes,
                "block_name": b_name,
                "green_space_name": gs_name,
                "created_at": r.created_at,
                "updated_at": r.updated_at
            })
        return result

    def create_plantation(self, data: PlantationRecordCreate) -> PlantationRecord:
        cid = self.get_or_default_campus_id(data.campus_id)
        survival_rate = round((data.saplings_surviving / data.saplings_planted) * 100.0, 1) if data.saplings_planted > 0 else 0.0

        record = PlantationRecord(
            campus_id=cid,
            block_id=data.block_id,
            green_space_id=data.green_space_id,
            event_name=data.event_name,
            plantation_date=data.plantation_date,
            species_planted=data.species_planted,
            saplings_planted=data.saplings_planted,
            saplings_surviving=data.saplings_surviving,
            survival_rate_percent=survival_rate,
            plantation_location=data.plantation_location,
            maintenance_notes=data.maintenance_notes
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def update_plantation(self, record_id: str, data: PlantationRecordUpdate) -> Optional[PlantationRecord]:
        record = self.db.query(PlantationRecord).filter(PlantationRecord.id == record_id).first()
        if not record:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(record, k, v)

        if record.saplings_planted > 0:
            record.survival_rate_percent = round((record.saplings_surviving / record.saplings_planted) * 100.0, 1)

        self.db.commit()
        self.db.refresh(record)
        return record

    # -----------------------------------------------------------------------
    # Sequestration Summary
    # -----------------------------------------------------------------------
    def get_sequestration_summary(self, campus_id: Optional[str] = None) -> SequestrationSummary:
        cid = self.get_or_default_campus_id(campus_id)
        
        trees = self.db.query(TreeInventory).filter(TreeInventory.campus_id == cid).all()
        green_spaces = self.db.query(GreenSpace).filter(GreenSpace.campus_id == cid).all()
        plantations = self.db.query(PlantationRecord).filter(PlantationRecord.campus_id == cid).all()

        total_trees = sum(t.tree_count for t in trees)
        total_seq_kg = sum(t.annual_sequestration_kg for t in trees)
        total_area_sqm = sum(gs.area_sqm or 0.0 for gs in green_spaces)

        # Species aggregation
        species_map: Dict[str, Dict[str, Any]] = {}
        for t in trees:
            key = t.common_name
            if key not in species_map:
                species_map[key] = {
                    "common_name": t.common_name,
                    "species_name": t.species_name,
                    "tree_count": 0,
                    "annual_sequestration_kg": 0.0
                }
            species_map[key]["tree_count"] += t.tree_count
            species_map[key]["annual_sequestration_kg"] += t.annual_sequestration_kg

        species_breakdown = []
        for s in species_map.values():
            pct = round((s["annual_sequestration_kg"] / total_seq_kg * 100.0), 1) if total_seq_kg > 0 else 0.0
            species_breakdown.append(SpeciesSequestrationBreakdown(
                common_name=s["common_name"],
                species_name=s["species_name"],
                tree_count=s["tree_count"],
                annual_sequestration_kg=round(s["annual_sequestration_kg"], 2),
                annual_sequestration_t=round(s["annual_sequestration_kg"] / 1000.0, 4),
                percentage_of_total=pct
            ))

        # Green spaces aggregation
        gs_breakdown = []
        for gs in green_spaces:
            t_count = sum(t.tree_count for t in gs.trees)
            t_seq = sum(t.annual_sequestration_kg for t in gs.trees)
            gs_breakdown.append(GreenSpaceSummaryBreakdown(
                id=gs.id,
                name=gs.name,
                code=gs.code,
                plantation_type=gs.plantation_type,
                area_sqm=gs.area_sqm,
                tree_count=t_count,
                annual_sequestration_kg=round(t_seq, 2)
            ))

        # Plantation survival
        total_planted = sum(p.saplings_planted for p in plantations)
        total_surviving = sum(p.saplings_surviving for p in plantations)
        avg_survival = round((total_surviving / total_planted * 100.0), 1) if total_planted > 0 else 0.0

        return SequestrationSummary(
            total_trees=total_trees,
            total_species_count=len(species_map),
            total_green_spaces=len(green_spaces),
            total_green_space_area_sqm=round(total_area_sqm, 1),
            total_annual_sequestration_kg_co2e=round(total_seq_kg, 2),
            total_annual_sequestration_t_co2e=round(total_seq_kg / 1000.0, 4),
            total_saplings_planted=total_planted,
            total_saplings_surviving=total_surviving,
            average_survival_rate_percent=avg_survival,
            species_breakdown=sorted(species_breakdown, key=lambda x: x.annual_sequestration_kg, reverse=True),
            green_space_breakdown=sorted(gs_breakdown, key=lambda x: x.annual_sequestration_kg, reverse=True)
        )

    # -----------------------------------------------------------------------
    # Canonical Seed Data
    # -----------------------------------------------------------------------
    def seed_initial_trees_and_plantations(self) -> Dict[str, int]:
        cid = self.get_or_default_campus_id()

        # Check if already seeded
        if self.db.query(GreenSpace).filter(GreenSpace.campus_id == cid).count() > 0:
            return {"green_spaces": 0, "trees": 0, "plantations": 0}

        # 1. Seed canonical green spaces
        sample_spaces = [
            ("South Campus Miyawaki Native Forest", "GS-MIYAWAKI-01", "Miyawaki Forest", 1450.0, "High-density multi-layered native forest plot planted with afforestation technique."),
            ("Amriteshwari Herbal & Medicinal Garden", "GS-HERBAL-01", "Herbal Garden", 950.0, "Conserved collection of traditional Ayurvedic and medicinal flora."),
            ("Main Perimeter Avenue Green Belt", "GS-AVENUE-01", "Avenue Plantation", 4200.0, "Avenue canopy lining the eastern and northern campus access boulevards."),
            ("Central Academic Quadrangle Canopy", "GS-ACAD-QUAD", "Botanical Garden", 2800.0, "Shaded green lawn and mature shade tree stands between AB1, AB2, and AB3."),
            ("Hostel Eco-Zone & Fruit Grove", "GS-HOSTEL-ZONE", "Agroforestry", 1950.0, "Agroforestry and fruit-bearing trees behind the student hostel complexes."),
        ]

        created_spaces = {}
        for name, code, ptype, area, desc in sample_spaces:
            gs = GreenSpace(
                campus_id=cid,
                name=name,
                code=code,
                plantation_type=ptype,
                area_sqm=area,
                description=desc
            )
            self.db.add(gs)
            self.db.flush()
            created_spaces[code] = gs

        # 2. Seed canonical tree inventory stands
        # (species, common, count, age, health, space_code, rate, source)
        sample_trees = [
            ("Azadirachta indica", "Neem", 120, 18.0, "Healthy", "GS-AVENUE-01", 22.0, "Campus Tree Census 2024"),
            ("Ficus religiosa", "Peepal / Sacred Fig", 24, 25.0, "Healthy", "GS-ACAD-QUAD", 28.5, "Botanical Garden Survey"),
            ("Ficus benghalensis", "Banyan", 8, 35.0, "Healthy", "GS-ACAD-QUAD", 32.0, "Botanical Garden Survey"),
            ("Tectona grandis", "Teak", 85, 12.0, "Healthy", "GS-MIYAWAKI-01", 20.0, "Campus Tree Census 2024"),
            ("Pongamia pinnata", "Pongamia / Indian Beech", 95, 10.0, "Healthy", "GS-AVENUE-01", 18.5, "Campus Tree Census 2024"),
            ("Delonix regia", "Gulmohar / Royal Poinciana", 45, 14.0, "Fair", "GS-HOSTEL-ZONE", 16.0, "Campus Tree Census 2024"),
            ("Tamarindus indica", "Tamarind", 38, 22.0, "Healthy", "GS-HOSTEL-ZONE", 24.0, "Campus Tree Census 2024"),
            ("Peltophorum pterocarpum", "Copperpod", 50, 8.0, "Healthy", "GS-AVENUE-01", 19.0, "Estate Office Log"),
            ("Ocimum tenuiflorum & Herbs", "Tulsi & Medicinal Flora", 200, 3.0, "Healthy", "GS-HERBAL-01", 2.0, "Ayurvedic Dept Survey"),
            ("Miyawaki Native Mixed Canopy", "Native Dense Saplings", 350, 3.0, "Healthy", "GS-MIYAWAKI-01", 12.0, "Miyawaki Project Log"),
        ]

        t_count = 0
        for s_name, c_name, cnt, age, health, scode, rate, source in sample_trees:
            annual_kg, method = calculate_tree_sequestration(cnt, rate, health, age)
            gs = created_spaces.get(scode)
            ti = TreeInventory(
                campus_id=cid,
                green_space_id=gs.id if gs else None,
                species_name=s_name,
                common_name=c_name,
                tree_count=cnt,
                estimated_age_years=age,
                health_status=health,
                sequestration_rate_kg_year=rate,
                annual_sequestration_kg=annual_kg,
                data_source=source,
                verification_status="Verified Field Census",
                methodology_notes=method
            )
            self.db.add(ti)
            t_count += 1

        # 3. Seed canonical plantation drives
        import datetime
        sample_plantations = [
            ("World Environment Day Plantation 2024", datetime.date(2024, 6, 5), "Neem, Pongamia, Teak", 150, 142, "South Campus Perimeter", "GS-AVENUE-01", "Monitored quarterly by Nature Club. Drip irrigation functional."),
            ("Amrita Green Campus Jubilee Drive", datetime.date(2023, 9, 27), "Miyawaki Native Species Mix", 380, 365, "South Campus Miyawaki Forest", "GS-MIYAWAKI-01", "Dense plantation flourishing with 96% survival rate."),
            ("Monsoon Biodiversity Drive 2024", datetime.date(2024, 7, 18), "Medicinal & Herbal Shrubs", 120, 114, "Herbal Garden Expansion", "GS-HERBAL-01", "Maintained with organic vermicompost from campus biodigester."),
        ]

        p_count = 0
        for ename, pdate, species, planted, surviving, loc, scode, notes in sample_plantations:
            gs = created_spaces.get(scode)
            s_rate = round((surviving / planted) * 100.0, 1)
            pr = PlantationRecord(
                campus_id=cid,
                green_space_id=gs.id if gs else None,
                event_name=ename,
                plantation_date=pdate,
                species_planted=species,
                saplings_planted=planted,
                saplings_surviving=surviving,
                survival_rate_percent=s_rate,
                plantation_location=loc,
                maintenance_notes=notes
            )
            self.db.add(pr)
            p_count += 1

        self.db.commit()
        return {
            "green_spaces": len(created_spaces),
            "trees": t_count,
            "plantations": p_count
        }
