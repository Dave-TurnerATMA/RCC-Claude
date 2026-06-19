#!/usr/bin/env python3
"""
generate_village_context_doc.py — Call the Anthropic API to generate a
structured village context document from an EVCA assessment.

Usage:
    python3 generate_village_context_doc.py --db PATH --assessment-id N
    python3 generate_village_context_doc.py --db PATH --assessment-id N --output FILE
"""

import argparse
import json
import os
import sqlite3
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

import anthropic
from evca_context import EVCA_FRAMEWORK_CONTEXT
from get_village_assessment import get_village_assessment

SEPARATOR = "=" * 71

SYSTEM_PROMPT = """You are an expert in community disaster risk reduction and resilience, \
specialising in the EVCA (Enhanced Vulnerability and Capacity Assessment) methodology used \
by Red Cross/Red Crescent National Societies. Your task is to generate a structured village \
context document that will be used as background information for an AI assistant helping \
community facilitators and team leaders prepare for and respond to disasters. The document \
must be accurate, concise, and directly useful for practical decision-making. Base your \
analysis strictly on the data provided — do not invent or assume information not present \
in the assessment data."""

GENERATION_INSTRUCTIONS = """
GENERATION INSTRUCTIONS
=======================

Using the EVCA framework reference and the village assessment data above, generate a \
structured village context document with the following 10 sections. Use markdown formatting \
with ## headings for each section.

## 1. Village Identity
One short paragraph covering: village name, sub-district (kecamatan), district (kabupaten), \
province, assessment year, and total population (with household count if available). \
Include any notable demographic notes (e.g. gender breakdown, seasonal population changes).

## 2. Geographic and Environmental Context
Describe the village's physical setting: terrain, proximity to rivers/coast/forest, \
elevation if known, land use. Note any geographic factors that amplify disaster risk.

## 3. Priority Hazards
List the hazards identified in the assessment, ordered from highest to lowest risk. \
For each hazard state: name, risk level (HIGH / MODERATE / LOW), and the key reason \
for that rating (e.g. high exposure + high vulnerability). Limit to the top 5 hazards \
if many are present.

## 4. Vulnerability Summary
Summarise the main vulnerability factors across the 11 resilience dimensions \
(risk management, health, water and sanitation, shelter/housing, food and nutrition, \
social cohesion, inclusion, economic opportunity, infrastructure/services, natural \
resource management, connectedness). Highlight the 3–4 dimensions where vulnerability \
is highest and explain why.

## 5. Existing Capacities
Describe what the community already has: organisations, infrastructure, skills, \
early warning systems, social networks. Be specific — name the actual assets mentioned \
in the data rather than speaking in generalities.

## 6. Vulnerable Groups
Identify the specific groups identified in the assessment as most at risk \
(e.g. elderly, disabled, pregnant women, young children, renters, seasonal workers). \
Note any inclusion or access barriers mentioned.

## 7. Social Fabric and Governance
Summarise: community cohesion, leadership structures, disaster management committee \
(if present), women's participation, youth engagement, and any social tensions or \
strengths noted.

## 8. Action Plan Summary
This is the most important section. Summarise the community's agreed action plan:

- List each proposed action with its priority score (if scored), responsible party, \
  timeline, and estimated cost/resources where available.
- Group actions by theme (e.g. early warning, evacuation, livelihood, health) if \
  there are more than 6.
- If a Disaster Management Committee (DMC/FPRB) establishment is among the actions, \
  call it out explicitly as a foundational step.
- Add a short sub-section "Unmatched Priority Scores" listing any hazard-dimension \
  priority scores from the scoring matrix that do not yet have a corresponding action \
  in the action plan. This helps facilitators identify gaps.

## 9. Key Data Gaps
List 3–5 specific pieces of information that are missing from the assessment data \
but would materially improve disaster preparedness planning for this village. \
Be concrete (e.g. "No evacuation route mapped for the eastern hamlets").

## 10. How to Use This Document
Two or three sentences explaining how a team leader or AI assistant should use this \
context document: what decisions it informs, what it should not be used for, \
and when it should be refreshed.
"""


def build_user_prompt(assessment: dict) -> str:
    village = assessment.get("village_profile", {}).get("village_name", f"Assessment {assessment['assessment_id']}")
    data_json = json.dumps(assessment, indent=2, ensure_ascii=False)

    return f"""{EVCA_FRAMEWORK_CONTEXT}


{SEPARATOR}
VILLAGE-SPECIFIC ASSESSMENT DATA — {village.upper()}
{SEPARATOR}

The JSON object below contains the complete EVCA assessment for {village}.
All risk levels have been normalised to English (HIGH / MODERATE / LOW).
Null and unfilled fields have been omitted.

{data_json}

{SEPARATOR}
END OF VILLAGE DATA
{SEPARATOR}

{GENERATION_INSTRUCTIONS}"""


def extract_data_notes(assessment: dict) -> list[str]:
    notes = []
    profile = assessment.get("village_profile", {})
    if not profile.get("total_population"):
        notes.append("Total population not recorded in assessment.")
    if not assessment.get("hazards"):
        notes.append("No hazards recorded in assessment.")
    action_plans = assessment.get("action_plan", [])
    if not action_plans:
        notes.append("No action plan items recorded in assessment.")
    return notes


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate a structured village context document via the Anthropic API"
    )
    parser.add_argument("--db", required=True, help="Path to community_prep.db SQLite database")
    parser.add_argument("--assessment-id", type=int, required=True, help="Assessment ID to process")
    parser.add_argument("--output", help="Write markdown document to this file instead of stdout")
    args = parser.parse_args()

    if not os.path.exists(args.db):
        print(f"Error: database not found at {args.db}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row

    try:
        assessment = get_village_assessment(conn, args.assessment_id)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()

    village_name = assessment.get("village_profile", {}).get("village_name", f"Assessment {args.assessment_id}")
    user_prompt = build_user_prompt(assessment)

    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=6000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}]
    )

    document_text = response.content[0].text

    data_notes = extract_data_notes(assessment)
    if data_notes:
        notes_block = "\n".join(f"<!-- DATA NOTE: {n} -->" for n in data_notes)
        document_text = document_text + "\n\n" + notes_block

    output_path = args.output
    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(document_text)
    else:
        print(document_text)

    input_tokens = response.usage.input_tokens
    output_tokens = response.usage.output_tokens
    truncated = response.stop_reason == "max_tokens"

    print(f"\n--- Village Context Document Summary ---", file=sys.stderr)
    print(f"Village:       {village_name}", file=sys.stderr)
    print(f"Assessment ID: {args.assessment_id}", file=sys.stderr)
    print(f"Output:        {output_path or '(stdout)'}", file=sys.stderr)
    print(f"Tokens in:     {input_tokens:,}", file=sys.stderr)
    print(f"Tokens out:    {output_tokens:,}", file=sys.stderr)
    if truncated:
        print("WARNING: Output was truncated (stop_reason=max_tokens). Consider increasing max_tokens.", file=sys.stderr)


if __name__ == "__main__":
    main()
