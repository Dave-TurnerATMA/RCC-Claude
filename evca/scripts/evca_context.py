"""
evca_context.py — EVCA framework reference material for LLM prompt construction.

EVCA_FRAMEWORK_CONTEXT is a constant string to prepend to any AI prompt that
reasons over village assessment data. It explains the methodology so the model
can interpret scores, dimensions, and action plan fields correctly.
"""

EVCA_FRAMEWORK_CONTEXT = """
=======================================================================
EVCA FRAMEWORK REFERENCE — applies to all villages
=======================================================================

SECTION 1 — HOW RISK LEVELS ARE CALCULATED
-------------------------------------------
Risk in the EVCA framework is derived from three inputs: Exposure,
Vulnerability, and Capacity. The formula is:

    Risk = Exposure × Vulnerability ÷ Capacity

The calculation is done in two steps using lookup tables.

Step 1 — Combine Exposure and Vulnerability to get a combined score:
  If Exposure is HIGH:
    + Vulnerability HIGH   → combined score = HIGH
    + Vulnerability MODERATE → combined score = HIGH
    + Vulnerability LOW    → combined score = MODERATE
    + Vulnerability NONE   → combined score = LOW
  If Exposure is MODERATE:
    + Vulnerability HIGH   → combined score = HIGH
    + Vulnerability MODERATE → combined score = MODERATE
    + Vulnerability LOW    → combined score = LOW
    + Vulnerability NONE   → combined score = LOW
  If Exposure is LOW:
    + Vulnerability HIGH   → combined score = MODERATE
    + Vulnerability MODERATE → combined score = LOW
    + Vulnerability LOW    → combined score = LOW
    + Vulnerability NONE   → combined score = LOW

Step 2 — Combine that score with Capacity to get the final Risk level:
  If combined score is HIGH:
    + Capacity HIGH        → Risk = MODERATE
    + Capacity MODERATE    → Risk = HIGH
    + Capacity LOW         → Risk = HIGH
    + Capacity NONE        → Risk = HIGH
  If combined score is MODERATE:
    + Capacity HIGH        → Risk = LOW
    + Capacity MODERATE    → Risk = MODERATE
    + Capacity LOW         → Risk = HIGH
    + Capacity NONE        → Risk = HIGH
  If combined score is LOW:
    + Capacity HIGH        → Risk = LOW
    + Capacity MODERATE    → Risk = LOW
    + Capacity LOW         → Risk = MODERATE
    + Capacity NONE        → Risk = HIGH

Interpretation: HIGH risk means the community is highly exposed and
vulnerable and has little capacity to cope. MODERATE risk means there
is significant concern but some protective factors exist. LOW risk
means the community is relatively well-protected for this hazard and
dimension.

Note: Vulnerability and Capacity ratings in this assessment are each
rated on a four-point scale: HIGH (1.0), MODERATE (0.67), LOW (0.33),
NONE (0.0). The risk level shown in the data is the final output of
the above two-step lookup, not a direct arithmetic result.


SECTION 2 — WHAT EACH OF THE 11 RESILIENCE DIMENSIONS COVERS
--------------------------------------------------------------
The EVCA assesses community resilience across 11 dimensions. For each
hazard, vulnerability and capacity are rated separately in each
dimension. The same dimensions are used for all hazards in the same
assessment.

1. Risk/Disaster Management
   Covers whether the community understands local hazard risks, has
   early warning systems, conducts drills, maintains a contingency
   plan, and has designated people responsible for disaster response.
   Captures gaps in preparedness knowledge and institutional readiness.

2. Health
   Assesses access to health services, community health knowledge
   (including first aid and hygiene), and the health system's capacity
   to surge during a disaster. Vulnerable groups include people with
   chronic illness, pregnant women, and young children.

3. Water and Sanitation
   Examines access to safe drinking water and adequate sanitation,
   both normally and during disaster conditions. Captures risks such
   as contaminated water sources and the lack of backup supply, and
   capacities such as water storage and community-managed systems.

4. Shelter/Housing
   Looks at the structural resilience of homes and public buildings
   to the assessed hazard (e.g. flood-resistant construction, slope
   stability). Also captures displacement risk and the community's
   ability to repair or rebuild after damage.

5. Food and Nutrition
   Assesses food security — whether livelihoods are likely to be
   disrupted by the hazard, whether there are food reserves or
   alternative sources, and whether vulnerable groups (children,
   elderly, pregnant women) are at risk of malnutrition after a
   disaster event.

6. Social Cohesion
   Examines the quality of relationships within the community: trust
   between neighbours, collective action capacity, willingness to
   help each other during crises, and the absence of significant
   internal conflict. Strong social cohesion is a protective factor
   across all hazards.

7. Inclusion
   Assesses whether marginalised groups — women, people with
   disabilities, ethnic or religious minorities, the elderly, and
   migrants — are included in community decision-making and disaster
   response planning. Exclusion from planning creates hidden
   vulnerability.

8. Economic Opportunity
   Covers the diversity and resilience of household livelihoods.
   Communities dependent on a single fragile livelihood (e.g. coastal
   fishing in a flood-prone area) have high economic vulnerability.
   Savings, access to credit, and economic diversification are
   key capacity indicators.

9. Infrastructure and Services
   Looks at the condition and hazard-exposure of critical
   infrastructure: roads, bridges, electricity, schools, and health
   posts. Damaged or inaccessible infrastructure after a disaster
   significantly amplifies harm.

10. Natural Resource Management
    Assesses whether the local environment (forests, watersheds,
    mangroves, slopes) provides natural protection against the hazard
    or has been degraded in ways that increase risk. Also captures
    whether the community actively manages natural resources to
    maintain these protective functions.

11. Connectedness
    Examines the community's relationships with external actors:
    local government, district authorities, NGOs, and the National
    Society. Good connectedness means the community can access
    resources, information, and support beyond its own boundaries
    when a disaster occurs.


SECTION 3 — HOW ACTIVITIES ARE PRIORITISED IN THE ACTION PLAN
--------------------------------------------------------------
After identifying priority risks, the community scores proposed
activities against eight criteria to decide which to implement first.
Each criterion is scored on a scale (higher is better), and the total
score indicates how feasible and impactful the community judged the
activity to be.

The eight criteria are:
  1. Funding availability — Is funding accessible for this activity,
     either from within the community or from external sources?
  2. Timeframe feasibility — Can this activity realistically be
     completed within the planned timeframe?
  3. Local resources (materials/facilities) — Are the required
     materials, tools, and facilities available locally?
  4. Community participation — Is the community willing and able to
     actively participate in implementing this activity?
  5. Technical support from local government — Is the relevant
     government agency able and likely to provide technical guidance?
  6. Sustainability — Once implemented, will this activity be
     maintained and continue to provide benefit over time?
  7. PMI mandate alignment — Does this activity fall within the
     National Society's mandate and areas of expertise?
  8. Effectiveness/appropriateness — Is this activity likely to
     meaningfully reduce the identified risk?

Important: these scores are community-generated. They reflect the
community's own assessment of local feasibility and priority — not
an external technical evaluation. Activities with higher total scores
were judged by the community to be more actionable and impactful given
their specific context.


SECTION 4 — WHAT HAPPENS AFTER THE EVCA
-----------------------------------------
The EVCA produces a baseline snapshot of the community's resilience
at a point in time. It is intended to be repeated annually so that
changes in risk, vulnerability, and capacity can be tracked over time.

After the assessment, the community is expected to form or strengthen
a Resilience Committee — a locally-owned group responsible for
holding the action plan and driving its implementation. The committee
owns the plan; they are not simply recipients of outside help.

The National Society's role after the EVCA shifts from facilitator
to accompanier. This means:
  - Helping the community present their action plan to the Village
    Council and government bodies to secure local budget support.
  - Supporting the community to write funding proposals for activities
    that require external resources.
  - Connecting the community with relevant technical agencies,
    government programmes, and other organisations.
  - Providing capacity-building support to the Resilience Committee
    so they can manage the plan independently over time.
  - Returning to conduct a follow-up EVCA in approximately 12 months
    to assess what has changed and update the action plan accordingly.

The EVCA is not a project delivery mechanism — it is a community
planning and accountability tool. The National Society enables;
the community leads.

=======================================================================
END OF EVCA FRAMEWORK REFERENCE
=======================================================================
""".strip()
