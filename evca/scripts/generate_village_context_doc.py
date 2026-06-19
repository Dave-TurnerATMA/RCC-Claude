#!/usr/bin/env python3
"""
generate_village_context_doc.py — Build a complete LLM prompt for a single
village's EVCA assessment, combining framework reference material with
village-specific data.

Usage:
    python3 generate_village_context_doc.py --db PATH --assessment-id N
    python3 generate_village_context_doc.py --db PATH --assessment-id N --output FILE

Output is a plain-text prompt ready to pass to an LLM. The framework
reference section (EVCA_FRAMEWORK_CONTEXT) precedes the village data so
the model has methodological context before reading the numbers.
"""

import argparse
import json
import os
import sqlite3
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from evca_context import EVCA_FRAMEWORK_CONTEXT
from get_village_assessment import get_village_assessment

SEPARATOR = "=" * 71


def build_prompt(assessment: dict) -> str:
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
"""


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate a complete LLM prompt for a village EVCA assessment"
    )
    parser.add_argument("--db", required=True, help="Path to community_prep.db SQLite database")
    parser.add_argument("--assessment-id", type=int, required=True, help="Assessment ID to export")
    parser.add_argument("--output", help="Write prompt to this file instead of stdout")
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

    prompt = build_prompt(assessment)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(prompt)
        print(f"Prompt written to {args.output} ({len(prompt):,} characters)")
    else:
        print(prompt)


if __name__ == "__main__":
    main()
