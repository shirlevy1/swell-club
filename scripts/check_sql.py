#!/usr/bin/env python3
"""
מאמת תחביר של קבצי המיגרציה, כולל גופי plpgsql.

אין כאן Postgres מקומי, ולכן זו רשת הביטחון היחידה לפני שמדביקים
SQL ל-Supabase. לא בודק סמנטיקה (קיום טבלאות, auth.uid וכו') — רק תחביר.

    pip3 install --user pglast
    python3 scripts/check_sql.py
"""

import re
import sys
from pathlib import Path

try:
    from pglast import parse_plpgsql, parse_sql
except ImportError:
    sys.exit("חסר pglast.  התקנה:  pip3 install --user pglast")

ROOT = Path(__file__).resolve().parent.parent
MIGRATIONS = sorted((ROOT / "supabase" / "migrations").glob("*.sql"))

if not MIGRATIONS:
    sys.exit("לא נמצאו קבצי מיגרציה")

failed = False

for path in MIGRATIONS:
    sql = path.read_text(encoding="utf-8")
    print(f"\n{path.relative_to(ROOT)}")

    try:
        statements = parse_sql(sql)
        print(f"  ok   {len(statements)} statements")
    except Exception as exc:
        failed = True
        print(f"  FAIL {exc}")
        continue

    # גופי הפונקציות הם מחרוזות עבור הפרסר הראשי — צריך מעבר נפרד
    for block in re.findall(r"create or replace function.*?\$\$;", sql, re.S | re.I):
        name = re.search(r"function\s+([\w.]+)", block, re.I).group(1)
        is_plpgsql = "language plpgsql" in block.lower()
        try:
            parse_plpgsql(block) if is_plpgsql else parse_sql(block)
            print(f"  ok   {'plpgsql' if is_plpgsql else 'sql':7} {name}")
        except Exception as exc:
            failed = True
            print(f"  FAIL {'plpgsql' if is_plpgsql else 'sql':7} {name}: {exc}")

print()
sys.exit(1 if failed else 0)
