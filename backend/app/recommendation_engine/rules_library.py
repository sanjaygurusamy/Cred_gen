"""
Curated Rule-Based Sustainability Recommendation Library for CampusCarbon AI.
Implements category-specific rules, prerequisites, and constraint checks for:
- Electricity
- Transportation
- Kitchen and LPG
- Food Waste
- Water and Wastewater
- Air Conditioning
- Fabrication and Construction
"""

from typing import List, Dict, Any

RULE_LIBRARY: Dict[str, List[Dict[str, Any]]] = {
    "electricity": [
        {
            "id": "ELEC-001",
            "title": "Campus-Wide LED Lighting Retrofit and Smart Occupancy Controls",
            "category": "energy_efficiency",
            "problem": "Legacy fluorescent or metal-halide lighting operating continuously in low-occupancy corridors and classrooms.",
            "proposed_action": "Execute a phase-wise transition to high-efficiency LED luminaires combined with passive infrared (PIR) occupancy sensors.",
            "reasoning": "LED fixtures consume 50-65% less energy than legacy T8/T12 fluorescent systems and exhibit higher lumen maintenance.",
            "environmental_benefits": "Direct reduction in Scope 2 grid electricity consumption and avoided marginal grid carbon intensity.",
            "operational_benefits": "Extended operational lamp lifespan (50,000+ hours), lowering campus facilities maintenance workload and lamp replacement overhead.",
            "required_data": [
                "Total fixture count and wattage",
                "Operating hours per day",
                "Existing luminaire type (Fluorescent vs LED)",
                "Sub-metered baseline electricity consumption (kWh)"
            ],
            "implementation_prerequisites": [
                "Comprehensive campus architectural lighting audit",
                "Electrical circuit compatibility review"
            ],
            "implementation_constraints": [
                "Initial capital expenditure for bulk luminaire procurement",
                "Classroom scheduling downtime during installation"
            ],
            "sdgs": [7, 9, 12, 13],
            "typical_reduction_percent": 18.0,
            "confidence": 0.90,
            "cost_level": "medium",
            "difficulty": "low"
        },
        {
            "id": "ELEC-002",
            "title": "Rooftop Solar PV Feasibility and Grid Peak Shaving",
            "category": "renewable_energy",
            "problem": "Complete dependency on carbon-intensive grid electricity during daytime peak tariffs and maximum campus load.",
            "proposed_action": "Conduct engineering feasibility and structural load analysis for rooftop solar photovoltaic (PV) arrays on suitable academic buildings.",
            "reasoning": "Solar generation profile coincides with campus daytime operational hours (9 AM - 4 PM), offsetting expensive daytime grid power.",
            "environmental_benefits": "Substantial displacement of grid Scope 2 emissions with zero-emission on-site generation.",
            "operational_benefits": "Hedges campus operating budget against future utility tariff escalations.",
            "required_data": [
                "Roof structural load-bearing capacity (kg/m²)",
                "Usable shadow-free rooftop area (m²)",
                "Local solar irradiance (GHI / DNI data)",
                "Hourly electrical interval consumption data"
            ],
            "implementation_prerequisites": [
                "Structural engineering safety certification",
                "Utility net-metering interconnection policy approval"
            ],
            "implementation_constraints": [
                "Roof structural constraints on older heritage structures",
                "Interconnection transformer capacity limits"
            ],
            "sdgs": [7, 9, 11, 13],
            "typical_reduction_percent": 25.0,
            "confidence": 0.85,
            "cost_level": "high",
            "difficulty": "medium"
        }
    ],

    "transportation": [
        {
            "id": "TRANS-001",
            "title": "Campus Fleet Route Optimization and Shuttle Dispatch Consolidation",
            "category": "operational_optimization",
            "problem": "Fixed-schedule campus transit shuttles frequently operating with low passenger load factors, leading to excessive diesel consumption.",
            "proposed_action": "Implement dynamic demand-responsive routing and frequency consolidation during off-peak campus hours.",
            "reasoning": "Vehicle fuel consumption scales non-linearly with total distance driven; reducing empty transit loops delivers immediate direct fuel savings.",
            "environmental_benefits": "Immediate reduction in Scope 1 tailpipe diesel emissions and localized particulate matter (PM2.5).",
            "operational_benefits": "Reduced vehicle engine wear-and-tear, extending maintenance intervals and saving fuel costs.",
            "required_data": [
                "Fleet fuel consumption logs (liters)",
                "Daily odometer readings (km)",
                "Ridership count per trip",
                "Current shuttle route schedules"
            ],
            "implementation_prerequisites": [
                "Ridership survey or automated passenger counting logs",
                "Driver scheduling agreement"
            ],
            "implementation_constraints": [
                "Minimum service headway requirements for student convenience",
                "Shift timing compliance for campus staff"
            ],
            "sdgs": [11, 12, 13],
            "typical_reduction_percent": 15.0,
            "confidence": 0.88,
            "cost_level": "low",
            "difficulty": "low"
        },
        {
            "id": "TRANS-002",
            "title": "Electric Vehicle (EV) Transition Feasibility for Internal Campus Maintenance Fleet",
            "category": "fleet_electrification",
            "problem": "Light-duty petrol and diesel utility vehicles and golf carts operating on short, stop-and-go internal routes with poor combustion efficiency.",
            "proposed_action": "Evaluate replacement of internal combustion utility carts with purpose-built electric utility vehicles paired with smart charging depots.",
            "reasoning": "Stop-and-go driving profiles have poor internal combustion thermal efficiency (~20%) compared to electric drive systems (~85%+).",
            "environmental_benefits": "Eliminates local direct Scope 1 tailpipe exhaust on campus walking paths and reduces total net lifecycle carbon.",
            "operational_benefits": "Drastically lower per-kilometer fuel and maintenance costs due to fewer moving parts.",
            "required_data": [
                "Vehicle daily travel distances",
                "Current maintenance and fuel expenditure records",
                "Available electrical breaker capacity at maintenance sheds"
            ],
            "implementation_prerequisites": [
                "Dedicated charging station electrical infrastructure",
                "Driver safety training for EV operation"
            ],
            "implementation_constraints": [
                "Upfront capital cost of EV utility vehicles",
                "Battery replacement lifecycle planning"
            ],
            "sdgs": [9, 11, 13],
            "typical_reduction_percent": 30.0,
            "confidence": 0.82,
            "cost_level": "medium",
            "difficulty": "medium"
        }
    ],

    "kitchen_lpg": [
        {
            "id": "LPG-001",
            "title": "Dining Hall Cooking Equipment Efficiency and Burner Maintenance Program",
            "category": "equipment_efficiency",
            "problem": "Worn or miscalibrated high-pressure commercial LPG burners with inefficient air-fuel ratios and incomplete combustion.",
            "proposed_action": "Install high-efficiency pre-mix commercial burners, clean orifice jets, and train culinary staff in vessel lid coverage and flame regulation.",
            "reasoning": "Optimized air-to-fuel ratios increase thermal efficiency from ~30% in unmaintained commercial burners to >55% in optimized pre-mix systems.",
            "environmental_benefits": "Direct reduction in Scope 1 LPG consumption and associated fossil combustion emissions.",
            "operational_benefits": "Lower fuel procurement costs and reduced kitchen ambient heat load, improving working conditions for kitchen staff.",
            "required_data": [
                "Daily LPG consumption (kg/day)",
                "Number and power rating of commercial burners",
                "Meals served per meal service period",
                "Maintenance history of gas piping and regulators"
            ],
            "implementation_prerequisites": [
                "Gas safety inspection by certified gas technician",
                "Culinary operating procedure review"
            ],
            "implementation_constraints": [
                "Peak meal preparation rush hours requiring maximum firing rate",
                "Vessel size limitations"
            ],
            "sdgs": [7, 12, 13],
            "typical_reduction_percent": 12.0,
            "confidence": 0.92,
            "cost_level": "low",
            "difficulty": "low"
        },
        {
            "id": "LPG-002",
            "title": "Biogas Pre-Feasibility Assessment with Feedstock and Safety Evaluation",
            "category": "alternative_fuel",
            "problem": "Sole reliance on commercial fossil LPG for water boiling and prep cooking while organic waste is hauled off-site.",
            "proposed_action": "Execute a formal engineering feasibility study for an on-campus anaerobic biomethanation plant utilizing segregated cafeteria organic waste.",
            "reasoning": "Biogas can substitute fossil LPG for continuous thermal loads if consistent organic feedstock and regulatory safety buffers exist.",
            "environmental_benefits": "Substitutes fossil fuel with biogenic fuel and diverts organic waste from landfill decomposition.",
            "operational_benefits": "Hedges against commercial LPG price fluctuations and provides organic digestate fertilizer for campus horticulture.",
            "required_data": [
                "Segregated kitchen food waste quantity (kg/day)",
                "Moisture content and C:N ratio of food waste",
                "Daily steady thermal gas demand profile",
                "Physical distance between dining hall and available open land"
            ],
            "implementation_prerequisites": [
                "Detailed feedstock availability and consistency audit",
                "Hazardous gas safety compliance and setback distance assessment",
                "Odor control and scrubber design study"
            ],
            "implementation_constraints": [
                "SAFETY CONSTRAINT: Minimum buffer zone required from student occupied buildings",
                "FEEDSTOCK CONSTRAINT: Biogas digestor failure occurs if feedstock contains cleaning chemicals or non-biodegradables",
                "OPERATIONAL CONSTRAINT: Requires trained daily plant operator"
            ],
            "sdgs": [7, 9, 12, 13],
            "typical_reduction_percent": 20.0,
            "confidence": 0.75,
            "cost_level": "high",
            "difficulty": "high"
        }
    ],

    "food_waste": [
        {
            "id": "WASTE-001",
            "title": "Cafeteria Food Waste Prevention and Preparation Portion Optimization",
            "category": "waste_prevention",
            "problem": "High plate-waste and batch over-preparation in student dining halls resulting in avoidable organic waste.",
            "proposed_action": "Implement kitchen production tracking, smaller batch replenishment cycles, and food-waste awareness nudges.",
            "reasoning": "Preventing food waste at the source delivers 8x higher carbon abatement than down-stream composting by avoiding embodied agricultural lifecycle carbon.",
            "environmental_benefits": "Reduces Scope 3 upstream agricultural supply chain emissions and downstream landfill organic decomposition.",
            "operational_benefits": "Substantial dining budget savings on bulk food raw material procurement.",
            "required_data": [
                "Pre-consumer prep waste mass (kg/day)",
                "Post-consumer plate waste mass (kg/day)",
                "Daily meal headcount"
            ],
            "implementation_prerequisites": [
                "Kitchen waste bin weighing station setup",
                "Kitchen head-chef collaboration"
            ],
            "implementation_constraints": [
                "Dining operational flexibility during unpredictable student turnout",
                "Dietary variety requirements"
            ],
            "sdgs": [2, 12, 13],
            "typical_reduction_percent": 15.0,
            "confidence": 0.85,
            "cost_level": "low",
            "difficulty": "medium"
        },
        {
            "id": "WASTE-002",
            "title": "On-Campus Aerobic In-Vessel Composting System",
            "category": "organic_waste_diversion",
            "problem": "Segregated organic kitchen waste currently hauled to municipal landfills where anaerobic conditions produce fugitive methane.",
            "proposed_action": "Deploy an enclosed forced-aeration in-vessel composter to process unavoidable dining hall organic waste on campus.",
            "reasoning": "Controlled aerobic composting converts carbon into stable CO2 and humus rather than fugitive methane (CH4, GWP=28-30).",
            "environmental_benefits": "Avoids anaerobic landfill methane generation under proper GHG protocol composting emission accounting.",
            "operational_benefits": "Produces high-quality organic compost for campus landscaping, eliminating commercial synthetic fertilizer purchases.",
            "required_data": [
                "Daily organic waste generation rate (kg/day)",
                "Carbon-to-Nitrogen bulking agent availability (dry leaves/sawdust)",
                "Moisture content"
            ],
            "implementation_prerequisites": [
                "Clean source-segregation in cafeteria prep and dishwashing zones",
                "Dedicated covered composting pad with leachate collection"
            ],
            "implementation_constraints": [
                "METHODOLOGY CAVEAT: Avoided methane must not be claimed unless validated against baseline municipal landfill disposal practices",
                "Requires bulking agent (dry carbon source) to maintain aerobic ratio and prevent odor"
            ],
            "sdgs": [11, 12, 13, 15],
            "typical_reduction_percent": 40.0,
            "confidence": 0.80,
            "cost_level": "medium",
            "difficulty": "medium"
        }
    ],

    "water_wastewater": [
        {
            "id": "WATER-001",
            "title": "Campus Pumping Network Variable Frequency Drive (VFD) Retrofit and Leak Abatement",
            "category": "water_energy_nexus",
            "problem": "Main raw water and overhead tank distribution pumps operating across throttling valves at fixed speed, wasting electricity and exacerbating pipe leaks.",
            "proposed_action": "Install VFDs on raw water booster pumps, automate level-switch controls, and run acoustic leak detection across the main distribution grid.",
            "reasoning": "Water pumping accounts for up to 15% of university electricity consumption; pump power scales with the cube of motor speed (Affinity Laws).",
            "environmental_benefits": "Reduces Scope 2 electricity consumption associated with water supply pumping.",
            "operational_benefits": "Minimizes hydraulic water hammer, reduces pipe bursts, and stabilizes supply pressure.",
            "required_data": [
                "Pump motor horsepower (HP / kW)",
                "Daily pumping hours and flow rate (m³/hr)",
                "Total daily municipal and borewell water consumption (m³/day)",
                "Water supply vs wastewater treatment metering separation"
            ],
            "implementation_prerequisites": [
                "Hydraulic pressure profile audit across campus distribution lines",
                "Motor control center electrical inspection"
            ],
            "implementation_constraints": [
                "Supply disruption during pressure sensor and valve installation",
                "Deep well submersible pumps requiring specialized servicing"
            ],
            "sdgs": [6, 7, 9, 13],
            "typical_reduction_percent": 18.0,
            "confidence": 0.88,
            "cost_level": "medium",
            "difficulty": "low"
        },
        {
            "id": "WATER-002",
            "title": "Decentralized Greywater Recycling for Campus Irrigation and Toilet Flushing",
            "category": "water_conservation",
            "problem": "High-volume freshwater consumed for campus landscape irrigation and toilet flushing while treated sewage effluent is discharged unutilized.",
            "proposed_action": "Upgrade sewage treatment plant (STP) tertiary filtration to dual-plumbing standards for non-potable reuse.",
            "reasoning": "Reusing treated greywater displaces upstream freshwater extraction, purification, and conveyance pumping energy.",
            "environmental_benefits": "Conserves local groundwater aquifers and lowers net water conveyance Scope 2 emissions.",
            "operational_benefits": "Drastically reduces municipal water utility bills and improves campus drought resilience.",
            "required_data": [
                "Daily STP effluent volume (m³/day)",
                "Effluent BOD, COD, and TSS water quality metrics",
                "Landscape irrigation water demand"
            ],
            "implementation_prerequisites": [
                "Tertiary filtration (sand + carbon + UV/Chlorination) upgrade",
                "Dedicated non-potable distribution piping"
            ],
            "implementation_constraints": [
                "Strict public health standards forbidding cross-connection with potable drinking network",
                "Capital cost for dual-distribution plumbing"
            ],
            "sdgs": [6, 11, 12, 13],
            "typical_reduction_percent": 25.0,
            "confidence": 0.84,
            "cost_level": "high",
            "difficulty": "medium"
        }
    ],

    "air_conditioning": [
        {
            "id": "HVAC-001",
            "title": "Chilled Water Setpoint Optimization and Unoccupied Schedule Curtailment",
            "category": "operational_optimization",
            "problem": "Central chillers and split AC units running at over-cooled setpoints (19°C - 21°C) and operating in unoccupied classrooms past class hours.",
            "proposed_action": "Standardize cooling setpoints to 24°C–25°C according to ASHRAE 55 thermal comfort standards and implement automated schedule curtailment.",
            "reasoning": "Every 1°C increase in AC setpoint yields approximately a 6% reduction in compressor electricity consumption.",
            "environmental_benefits": "Immediate, zero-capital reduction in Scope 2 grid electricity consumption.",
            "operational_benefits": "Reduced chiller compressor runtime hours, extending equipment lifetime and lowering preventive maintenance costs.",
            "required_data": [
                "AC power ratings (kW or Tons of Refrigeration)",
                "Operating hours per day",
                "Current thermostat setpoints",
                "Room occupancy timetables"
            ],
            "implementation_prerequisites": [
                "Thermostat management protocol approval by academic administration",
                "Programmable timer or BMS schedule configuration"
            ],
            "implementation_constraints": [
                "Specific temperature-sensitive laboratory requirements (e.g. server rooms and bio-incubators must remain exempted)",
                "Occupant thermal preference pushback"
            ],
            "sdgs": [7, 12, 13],
            "typical_reduction_percent": 14.0,
            "confidence": 0.94,
            "cost_level": "low",
            "difficulty": "low"
        },
        {
            "id": "HVAC-002",
            "title": "Chiller Plant Condenser Coil Deep-Cleaning and Refrigerant Charge Verification",
            "category": "maintenance_efficiency",
            "problem": "Fouled air-cooled condenser coils and minor refrigerant undercharge degrading chiller Coefficient of Performance (COP).",
            "proposed_action": "Execute bi-annual high-pressure coil descaling and verify refrigerant superheat/subcooling charges to restore design COP.",
            "reasoning": "A 0.5 mm scale or dirt layer on condenser coils can reduce heat transfer efficiency by over 20%, forcing compressors to work under elevated head pressures.",
            "environmental_benefits": "Restores chiller electrical efficiency to rated nameplate specs, reducing wasted Scope 2 electricity.",
            "operational_benefits": "Prevents catastrophic compressor burnouts and avoids high-pressure trips during peak summer heat waves.",
            "required_data": [
                "Chiller nameplate capacity and COP",
                "Compressor operating current (Amps) vs design load",
                "Condenser entering and leaving water/air temperature"
            ],
            "implementation_prerequisites": [
                "Scheduled HVAC preventive maintenance window",
                "Refrigerant leak detection inspection"
            ],
            "implementation_constraints": [
                "Water availability for high-pressure washing",
                "Maintenance downtime required during non-peak hours"
            ],
            "sdgs": [7, 9, 12, 13],
            "typical_reduction_percent": 10.0,
            "confidence": 0.90,
            "cost_level": "low",
            "difficulty": "low"
        }
    ],

    "fabrication_construction": [
        {
            "id": "FAB-001",
            "title": "Machine Workshop Idling Power Curtailment and Smart Sub-Meter Monitoring",
            "category": "equipment_efficiency",
            "problem": "Heavy workshop machinery (CNC mills, lathe motors, air compressors, arc welders) left running in idle standby mode between student lab batches.",
            "proposed_action": "Install automated idling power shut-offs and real-time sub-metering on major 3-phase machinery distribution boards.",
            "reasoning": "Industrial electric motors consume 25-40% of rated full-load power merely maintaining rotor idle speed without performing useful mechanical work.",
            "environmental_benefits": "Eliminates parasitic Scope 2 electricity waste in engineering machine shops.",
            "operational_benefits": "Improves lab safety by de-energizing unattended machinery and reduces motor thermal stress.",
            "required_data": [
                "Machine motor power ratings (kW)",
                "Lab session timetable and machine utilization hours",
                "Idling power draw measurements"
            ],
            "implementation_prerequisites": [
                "Lab technician workflow alignment",
                "Emergency stop circuit review"
            ],
            "implementation_constraints": [
                "Certain CNC machinery require spindle pre-warmup cycles",
                "Student lab schedule variability"
            ],
            "sdgs": [9, 12, 13],
            "typical_reduction_percent": 16.0,
            "confidence": 0.86,
            "cost_level": "low",
            "difficulty": "low"
        },
        {
            "id": "FAB-002",
            "title": "Civil Construction Material Lifecycle Optimization and Low-Carbon Cement Substitution",
            "category": "material_efficiency",
            "problem": "Campus expansion works using standard Ordinary Portland Cement (OPC) with high embodied clinker carbon footprint.",
            "proposed_action": "Mandate Pozzolanic / Slag blended cements (PPC/PSC) with 30-50% fly-ash or blast furnace slag replacement for all non-structural campus paving and masonry.",
            "reasoning": "Portland cement manufacturing releases ~0.9 kg CO2 per kg of cement; slag and fly-ash substitution directly displaces virgin clinker calcination emissions.",
            "environmental_benefits": "Massive reduction in Scope 3 Category 1/2 embodied carbon in campus capital infrastructure projects.",
            "operational_benefits": "Enhanced concrete sulfate resistance and reduced thermal cracking in thick masonry elements.",
            "required_data": [
                "Projected concrete volume (m³) and cement grade",
                "Supplier Environmental Product Declarations (EPDs)",
                "Structural engineering mix design criteria"
            ],
            "implementation_prerequisites": [
                "Campus civil engineering structural specification update",
                "Supplier concrete batch testing and 28-day compressive strength verification"
            ],
            "implementation_constraints": [
                "Slower early-age curing strength gain requiring longer formwork striking time",
                "Local availability of certified blended cements"
            ],
            "sdgs": [9, 11, 12, 13],
            "typical_reduction_percent": 22.0,
            "confidence": 0.88,
            "cost_level": "low",
            "difficulty": "medium"
        }
    ]
}
