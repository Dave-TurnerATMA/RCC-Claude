#!/usr/bin/env python3
"""
get_village_assessment.py — Query the EVCA database and return a single village's
assessment as a structured JSON object, shaped for use as LLM prompt input.

Usage:
    python3 get_village_assessment.py --db PATH --assessment-id N
    python3 get_village_assessment.py --db PATH --list          # list available assessments

All foreign-key IDs are expanded to human-readable values.
Null/empty fields are omitted.
Rating values include their label (e.g. "HIGH (1.0)") not just numbers.
"""

import argparse
import json
import os
import sqlite3
import sys

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)

# Dimension name maps (consistent with evca_dimensions and evca_ref_consolidated_dimensions)
DIMENSIONS_11 = {
    1: "Risk/Disaster Management",
    2: "Health",
    3: "Water and Sanitation",
    4: "Shelter/Housing",
    5: "Food and Nutrition",
    6: "Social Cohesion",
    7: "Inclusion",
    8: "Economic Opportunity",
    9: "Infrastructure and Services",
    10: "Natural Resource Management",
    11: "Connectedness",
}

DIMENSIONS_7 = {
    1: "Risk Knowledge Management",
    2: "Basic Needs (food, water, sanitation, shelter)",
    3: "Social Cohesion and Inclusion",
    4: "Economic Opportunity",
    5: "Infrastructure and Services",
    6: "Natural Resource Management",
    7: "Connectedness",
}

PRIORITY_CRITERIA = {
    "score_funding":                  "Funding availability",
    "score_timeframe":                "Timeframe feasibility",
    "score_local_resources":          "Local resources (materials/facilities)",
    "score_community_participation":  "Community participation",
    "score_govt_support":             "Technical support from local government",
    "score_sustainability":           "Sustainability (maintenance/management)",
    "score_pmi_mandate":              "PMI mandate alignment",
    "score_effectiveness":            "Effectiveness/appropriateness",
}


def _v(row: dict, key: str):
    """Return row[key] if non-null and non-empty, else None."""
    val = row.get(key)
    if val is None:
        return None
    if isinstance(val, str) and not val.strip():
        return None
    return val


def _compact(d: dict) -> dict:
    """Recursively remove None and empty-string values from a dict."""
    out = {}
    for k, v in d.items():
        if v is None:
            continue
        if isinstance(v, str) and not v.strip():
            continue
        if isinstance(v, dict):
            v = _compact(v)
            if not v:
                continue
        if isinstance(v, list):
            v = [_compact(i) if isinstance(i, dict) else i for i in v if i is not None]
            if not v:
                continue
        out[k] = v
    return out


def _rating_label(label: str | None, value: float | None) -> str | None:
    """Format a rating as 'HIGH (1.0)' etc."""
    if label is None and value is None:
        return None
    if label and value is not None:
        return f"{label} ({value:.2f})"
    return label or (f"{value:.2f}" if value is not None else None)


def _row_to_dict(cursor) -> list[dict]:
    cols = [d[0] for d in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]


def get_village_assessment(conn: sqlite3.Connection, assessment_id: int) -> dict:
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # ── 1. Core assessment record ─────────────────────────────────────────────
    cur.execute("SELECT * FROM evca_assessments WHERE id = ?", (assessment_id,))
    row = cur.fetchone()
    if row is None:
        raise ValueError(f"No assessment found with id={assessment_id}")
    a = dict(row)

    profile = _compact({
        "village_name":       _v(a, "village_name"),
        "district":           _v(a, "district"),
        "province":           _v(a, "province"),
        "country":            _v(a, "country"),
        "national_society":   _v(a, "national_society"),
        "branch":             _v(a, "branch"),
        "gps_coordinates":    _v(a, "gps_coordinates"),
        "assessment_start":   _v(a, "start_date"),
        "assessment_end":     _v(a, "end_date"),
        "responsible_person": _v(a, "responsible_person"),
        "responsible_position": _v(a, "responsible_position"),
        "email":              _v(a, "email"),
    })

    # ── 2. Community context ──────────────────────────────────────────────────
    cur.execute("SELECT * FROM evca_community_context WHERE assessment_id = ?", (assessment_id,))
    ctx_row = cur.fetchone()
    community: dict = {}
    if ctx_row:
        ctx = dict(ctx_row)
        community = _compact({
            "description":          _v(ctx, "community_description"),
            "community_type":       _v(ctx, "community_type"),
            "community_type_notes": _v(ctx, "community_type_comments"),
            "location_type":        _v(ctx, "geophysical_env_1"),
            "terrain_type":         _v(ctx, "geophysical_env_2"),
            "geophysical_notes":    _v(ctx, "geophysical_comments"),
            "primary_livelihood":   _v(ctx, "livelihood_primary"),
            "secondary_livelihood": _v(ctx, "livelihood_secondary"),
            "other_livelihood":     _v(ctx, "livelihood_other"),
            "assessment_participants": _compact({
                "male":   _v(ctx, "evca_participants_male"),
                "female": _v(ctx, "evca_participants_female"),
            }),
            "assessment_process":   _v(ctx, "assessment_process"),
        })

    # ── 3. Population ─────────────────────────────────────────────────────────
    cur.execute("""
        SELECT age_group, male_count, female_count, disability_male, disability_female
        FROM evca_population WHERE assessment_id = ?
        ORDER BY CASE age_group WHEN '0_5' THEN 1 WHEN '6_17' THEN 2
                                WHEN '18_65' THEN 3 WHEN '66_plus' THEN 4 END
    """, (assessment_id,))
    pop_rows = _row_to_dict(cur)

    age_label = {"0_5": "0–5 years", "6_17": "6–17 years",
                 "18_65": "18–65 years", "66_plus": "66+ years"}
    population = []
    total_male = total_female = total_disability = 0
    for p in pop_rows:
        male = p.get("male_count") or 0
        female = p.get("female_count") or 0
        dis_m = p.get("disability_male") or 0
        dis_f = p.get("disability_female") or 0
        total_male += male
        total_female += female
        total_disability += dis_m + dis_f
        group: dict = {
            "age_group": age_label.get(p["age_group"], p["age_group"]),
            "male": male,
            "female": female,
            "total": male + female,
        }
        if dis_m or dis_f:
            group["disability_male"] = dis_m
            group["disability_female"] = dis_f
        population.append(group)

    pop_summary: dict = {}
    if population:
        pop_summary = {
            "by_age_group": population,
            "totals": _compact({
                "male":       total_male,
                "female":     total_female,
                "total":      total_male + total_female,
                "disability": total_disability if total_disability else None,
            }),
        }

    # ── 4. Hazards (with ratings nested inside) ───────────────────────────────
    cur.execute("""
        SELECT id, hazard_number, hazard_name, cause_origin, warning_signs,
               action_time, frequency, occurrence_period, duration
        FROM evca_hazards WHERE assessment_id = ?
        ORDER BY hazard_number
    """, (assessment_id,))
    hazard_rows = _row_to_dict(cur)

    hazards = []
    for h in hazard_rows:
        hid = h["id"]

        # Vulnerability ratings for this hazard
        cur.execute("""
            SELECT dimension_number, impact_description, vulnerability_aspects,
                   rating_label, rating_value
            FROM evca_vulnerability_ratings WHERE hazard_id = ?
            ORDER BY dimension_number
        """, (hid,))
        vuln_rows = _row_to_dict(cur)
        vulnerability_by_dimension = []
        for vr in vuln_rows:
            entry = _compact({
                "dimension": DIMENSIONS_11.get(vr["dimension_number"],
                                               f"Dimension {vr['dimension_number']}"),
                "impact_description":     _v(vr, "impact_description"),
                "vulnerability_aspects":  _v(vr, "vulnerability_aspects"),
                "rating": _rating_label(_v(vr, "rating_label"), vr.get("rating_value")),
            })
            if entry:
                vulnerability_by_dimension.append(entry)

        # Capacity ratings for this hazard
        cur.execute("""
            SELECT dimension_number, capacity_description, rating_label, rating_value
            FROM evca_capacity_ratings WHERE hazard_id = ?
            ORDER BY dimension_number
        """, (hid,))
        cap_rows = _row_to_dict(cur)
        capacity_by_dimension = []
        for cr in cap_rows:
            entry = _compact({
                "dimension": DIMENSIONS_11.get(cr["dimension_number"],
                                               f"Dimension {cr['dimension_number']}"),
                "capacity_description": _v(cr, "capacity_description"),
                "rating": _rating_label(_v(cr, "rating_label"), cr.get("rating_value")),
            })
            if entry:
                capacity_by_dimension.append(entry)

        # Risk ratings for this hazard (11 dimensions)
        cur.execute("""
            SELECT dimension_number, risk_label
            FROM evca_risk_ratings WHERE hazard_id = ?
            ORDER BY dimension_number
        """, (hid,))
        risk_rows = _row_to_dict(cur)
        risk_by_dimension = []
        for rr in risk_rows:
            label = _v(rr, "risk_label")
            if label:
                risk_by_dimension.append({
                    "dimension": DIMENSIONS_11.get(rr["dimension_number"],
                                                   f"Dimension {rr['dimension_number']}"),
                    "risk_level": label,
                })

        # Risk analysis (7 consolidated dimensions)
        cur.execute("""
            SELECT consolidated_dimension, vulnerability_aspects, capacity_aspects, key_risk_summary
            FROM evca_risk_analysis WHERE hazard_id = ?
            ORDER BY consolidated_dimension
        """, (hid,))
        analysis_rows = _row_to_dict(cur)
        risk_analysis = []
        for ar in analysis_rows:
            entry = _compact({
                "dimension": DIMENSIONS_7.get(ar["consolidated_dimension"],
                                              f"Dimension {ar['consolidated_dimension']}"),
                "vulnerability_aspects": _v(ar, "vulnerability_aspects"),
                "capacity_aspects":      _v(ar, "capacity_aspects"),
                "key_risk_summary":      _v(ar, "key_risk_summary"),
            })
            if entry:
                risk_analysis.append(entry)

        hazard_entry = _compact({
            "hazard_name":       _v(h, "hazard_name"),
            "cause_origin":      _v(h, "cause_origin"),
            "warning_signs":     _v(h, "warning_signs"),
            "action_time":       _v(h, "action_time"),
            "frequency":         _v(h, "frequency"),
            "occurrence_period": _v(h, "occurrence_period"),
            "duration":          _v(h, "duration"),
            "vulnerability_by_dimension": vulnerability_by_dimension or None,
            "capacity_by_dimension":      capacity_by_dimension or None,
            "risk_by_dimension":          risk_by_dimension or None,
            "risk_analysis_consolidated": risk_analysis or None,
        })
        hazards.append(hazard_entry)

    # ── 5. Vulnerable groups ──────────────────────────────────────────────────
    cur.execute("""
        SELECT group_number, group_name, vulnerability_reasons
        FROM evca_vulnerable_groups WHERE assessment_id = ?
        ORDER BY group_number
    """, (assessment_id,))
    vg_rows = _row_to_dict(cur)
    vulnerable_groups = [
        _compact({"group": _v(r, "group_name"), "reasons": _v(r, "vulnerability_reasons")})
        for r in vg_rows
    ]

    # ── 6. Social dimensions ──────────────────────────────────────────────────
    cur.execute("""
        SELECT dimension, description, rating_label, rating_value
        FROM evca_social_dimensions WHERE assessment_id = ?
    """, (assessment_id,))
    social_rows = _row_to_dict(cur)
    dim_label = {
        "social_cohesion":  "Social Cohesion",
        "inclusion":        "Inclusion",
        "connectedness":    "Connectedness",
    }
    social_dimensions = {
        dim_label.get(r["dimension"], r["dimension"]): _compact({
            "description": _v(r, "description"),
            "rating": _rating_label(_v(r, "rating_label"), r.get("rating_value")),
        })
        for r in social_rows
    }

    # ── 7. Overall analysis ───────────────────────────────────────────────────
    cur.execute("""
        SELECT overall_narrative FROM evca_overall_analysis WHERE assessment_id = ?
    """, (assessment_id,))
    oa_row = cur.fetchone()
    overall_narrative = _v(dict(oa_row), "overall_narrative") if oa_row else None

    # ── 8. Action plan ────────────────────────────────────────────────────────
    cur.execute("""
        SELECT item_order, priority_risk_description, desired_outcome, priority_activities,
               required_resources, technical_support_needs, schedule, responsible_party
        FROM evca_action_items WHERE assessment_id = ?
        ORDER BY item_order
    """, (assessment_id,))
    action_rows = _row_to_dict(cur)
    action_items = [
        _compact({
            "priority_risk":          _v(r, "priority_risk_description"),
            "desired_outcome":        _v(r, "desired_outcome"),
            "priority_activities":    _v(r, "priority_activities"),
            "required_resources":     _v(r, "required_resources"),
            "technical_support":      _v(r, "technical_support_needs"),
            "schedule":               _v(r, "schedule"),
            "responsible_party":      _v(r, "responsible_party"),
        })
        for r in action_rows
    ]

    # Validation sign-offs
    cur.execute("SELECT * FROM evca_action_validation WHERE assessment_id = ?", (assessment_id,))
    val_row = cur.fetchone()
    signatories: dict = {}
    if val_row:
        v = dict(val_row)
        for key, label in [
            ("community_rep_name", "Community Representative"),
            ("bpbd_rep_name",      "BPBD Representative"),
            ("village_rep_name",   "Village Representative"),
            ("pmi_rep_name",       "PMI Representative"),
        ]:
            name = _v(v, key)
            if name:
                signatories[label] = name
        if _v(v, "validation_date"):
            signatories["validation_date"] = v["validation_date"]

    # ── 9. Priority scoring matrix ────────────────────────────────────────────
    score_cols = list(PRIORITY_CRITERIA.keys())
    cur.execute(f"""
        SELECT activity_name, {', '.join(score_cols)}
        FROM evca_priority_scores_flat WHERE assessment_id = ?
        ORDER BY id
    """, (assessment_id,))
    score_rows = _row_to_dict(cur)

    priority_scores = []
    for sr in score_rows:
        scores = {}
        total = 0
        for col, label in PRIORITY_CRITERIA.items():
            val = sr.get(col)
            if val is not None:
                scores[label] = val
                total += val
        if scores:
            priority_scores.append(_compact({
                "activity": _v(sr, "activity_name"),
                "scores":   scores,
                "total":    total,
            }))

    # ── 10. Assemble final JSON ───────────────────────────────────────────────
    result = _compact({
        "assessment_id":   assessment_id,
        "village_profile": profile,
        "community": community,
        "population": pop_summary,
        "priority_hazards_count": _v(a, "priority_hazard_count"),
        "hazard_selection_rationale": _v(a, "hazard_selection_rationale"),
        "hazards": hazards,
        "vulnerable_groups": vulnerable_groups or None,
        "narratives": _compact({
            "assessment_selection":  _v(a, "assessment_selection_narrative"),
            "vulnerability_overview": _v(a, "vulnerability_overview"),
            "capacity_overview":     _v(a, "capacity_overview"),
            "social_dimensions_overview": _v(a, "social_dimensions_overview"),
            "overall_analysis":      overall_narrative,
        }),
        "social_dimensions": social_dimensions or None,
        "action_plan": {
            "items":       action_items,
            "signatories": signatories,
        } if action_items else None,
        "activity_priority_scores": priority_scores or None,
    })

    return result


def list_assessments(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.execute("""
        SELECT a.id, a.village_name, a.district, a.province,
               l.status, a.created_at
        FROM evca_assessments a
        LEFT JOIN evca_spreadsheet_loads l ON a.load_id = l.id
        ORDER BY a.id
    """)
    rows = cur.fetchall()
    if not rows:
        print("No assessments found.")
        return
    print(f"{'ID':>4}  {'Village':<30}  {'District':<20}  {'Province':<15}  {'Status':<10}  Loaded")
    print("-" * 95)
    for r in rows:
        print(f"{r[0]:>4}  {(r[1] or ''):<30}  {(r[2] or ''):<20}  {(r[3] or ''):<15}  {(r[4] or ''):<10}  {r[5] or ''}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Export a village EVCA assessment as JSON")
    parser.add_argument("--db", required=True, help="Path to community_prep.db SQLite database")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--assessment-id", type=int, help="Assessment ID to export")
    group.add_argument("--list", action="store_true", help="List all available assessments")
    args = parser.parse_args()

    if not os.path.exists(args.db):
        print(f"Error: database not found at {args.db}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row

    try:
        if args.list:
            list_assessments(conn)
        else:
            result = get_village_assessment(conn, args.assessment_id)
            print(json.dumps(result, indent=2, ensure_ascii=False))
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
